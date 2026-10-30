# AGRUL-056 / #50 — Etapa 1: jornadas de cosecha

Fecha: 2026-10-29. Rama: `feat/agrul-056-cosechas-camaras`.
Base verificada en GitHub: `origin/main` c0cc430580b7373ab7637529cc422cca3f31371c.

## Dependencias y alcance aprobado

Se consultaron la issue [#50](https://github.com/juampalt/Agrul/issues/50),
SPEC.md, TICKETS.md y las cinco skills de dominio, arquitectura, base de datos,
API y testing. AGRUL-054 (#48) y AGRUL-055 (#49) están cerradas e integradas por
los PR #57 y #58. La última validación previa documentada registra 1404 pruebas
aprobadas. GitHub no tenía PR abiertos al iniciar este bloque.

La issue define CU41–CU46 como un grupo: programación, reprogramación,
cancelación y registro de cosechas con pasadas. No publica una correspondencia
individual entre cada número y operación. Este bloque implementa únicamente
la planificación y consulta del grupo; no declara completos esos seis CU.

El usuario validó el plan y autorizó crear `agrul_test_agrul_056`. La base se
creó en PostgreSQL 18.4, 127.0.0.1:5432, con propietario administrador y acceso
local del rol existente agrul_test_user para conexiones, migraciones y esquemas
temporales. El rol no tiene superusuario, CREATEDB, CREATEROLE, replicación ni
BYPASSRLS. No se modificaron privilegios globales ni otras bases.

## Implementación

- Dominio puro y casos de uso explícitos; puerto CosechasProgramadasRepositoryPort,
  adaptador Drizzle e inyección en el bootstrap real.
- Migración incremental 0024: cosechas_programadas y su historial. FK restrictivas
  a ciclo y usuarios, índices y estados válidos. No modifica tablas anteriores.
- La finca se resuelve desde ciclo → plantación → lote persistidos. Sesiones y
  asignaciones vigentes, roles ADMINISTRADOR y ENCARGADO_CAMPO, bloqueo por cambio
  inicial de contraseña. Listados filtrados en SQL antes de paginar.
- Identificador operacionId UUID obligatorio para reintentos de programación.
  La misma solicitud y actor no duplican jornada ni auditoría. Datos distintos
  bajo la misma clave reciben 409. Se compara el snapshot original aunque la
  jornada haya sido reprogramada.
- Cantidad estimada numeric(10,2), validada antes de serializar, sin redondeo.
  Se admite una estimación cero; sigue siendo una estimación, no un pesaje real.
  No hay creación ni descuento de stock ni eventos ficticios de cosecha.
- Reprogramación de fecha/responsable y cancelación con motivo obligatorio,
  exclusivamente desde PENDIENTE. Los cambios requieren la versión consultada;
  compare-and-swap devuelve 409 ante intenciones obsoletas.
- Triggers de PostgreSQL conservan identidad, sector y estimación, incrementan
  la versión y auditan cada cambio dentro de la misma sentencia/transacción.
  Protegen el historial contra INSERT externo, UPDATE, DELETE y TRUNCATE.
  También bloquean eliminación de jornadas y ejecución ficticia sin cosecha real.
- Los ciclos se bloquean FOR SHARE para serializar programación y cierre.
  No se programa/reprograma sobre FINALIZADO; se permite cancelar pendientes.
  No se amplía RN-09 para prohibir cierres por jornadas de cosecha: esa regla de
  SPEC.md refiere a actividades agrícolas, no a cosechas programadas.
- Se conservan timestamps timestamptz y actores. El historial se consulta por
  versión: now() registra el inicio de la transacción y no garantiza orden causal.
  Una regresión reprodujo el orden [2,1] antes de corregir la consulta.

## Contrato HTTP

Todas las rutas usan el envelope habitual y schemas estrictos.

| Método | Ruta | Entrada relevante |
| --- | --- | --- |
| POST | /api/v1/cosechas-programadas | operacionId, cicloId, fechaPrevista, responsableId, sector, cantidadEstimadaKg |
| GET | /api/v1/cosechas-programadas | cicloId, responsableId, estado, desde, hasta, limit, offset |
| GET | /api/v1/cosechas-programadas/:id | UUID |
| GET | /api/v1/cosechas-programadas/:id/historial | limit, offset |
| PATCH | /api/v1/cosechas-programadas/:id/reprogramar | version, fechaPrevista, responsableId opcional |
| PATCH | /api/v1/cosechas-programadas/:id/cancelar | version, motivoCancelacion |

No se acepta fincaId ni cantidades cosechadas en el alta de una programación.
Las fechas previstas son fechas de calendario; no se inventa una restricción
adicional de que deban quedar dentro del intervalo previsto del ciclo.

## Validación

Las nuevas suites cubren dominio, persistencia, permisos permitidos/denegados,
dos fincas, revocación con el mismo token, reintentos, precisión decimal, FK,
inmutabilidad, rollback al fallar auditoría y solicitudes concurrentes.
Las pruebas observan bloqueos reales entre conexiones y cubren commit/rollback
de un cierre concurrente. El proceso dist/src/index.js se inicia en un puerto
local efímero y se prueba por HTTP con login y sesión persistidos.

Una suite ejecuta las 25 migraciones desde un esquema vacío, carga datos antes
de 0024 y verifica que ciclos, eventos e insumos anteriores sigan intactos y
que los triggers anteriores de inmutabilidad sigan activos.

Resultado definitivo de la ejecución final:

- Lint y build aprobados después del último cambio productivo.
- **1019 pruebas aprobadas, 0 fallidas, 456 omitidas**; 107 archivos aprobados,
  30 omitidos. Duración: 160,79 segundos. Las omisiones corresponden a las
  integraciones anteriores que requieren sus variables/bases autorizadas de
  054/055; no se ejecutaron ni se certifican como aprobadas en este bloque.
- **71 pruebas nuevas aprobadas, ninguna omitida:** 20 de dominio, 29 de
  persistencia/contratos, 10 de autorización, 8 de concurrencia/rollback, 3 de
  migraciones/históricos y 1 del proceso compilado por HTTP real.
- La regresión disponible incluye las suites existentes sin requerimiento de
  otras bases. Esto no reemplaza la regresión PostgreSQL integral de los módulos
  anteriores, pendiente antes del cierre final de la issue.
- La regresión del orden del historial falló primero con [2,1]; después del
  arreglo quedó aprobada dentro de la ejecución final completa.
- Verificados al finalizar: public.usuarios, ciclos_productivos,
  cosechas_programadas, su historial y eventos_trazabilidad vacíos; no quedan
  esquemas temporales agrul056_* ni procesos de servidor de las suites.
- `git diff --check` aprobado. Reporte local excluido de Git:
  `.scratch/agrul-056-etapa1-final-vitest.json`.

Reproducción (conectar únicamente a la base autorizada):

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$env:COSECHAS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-056-etapa1-final-vitest.json
```

## Matriz parcial del ticket

| CU | Requisito publicado | Estado en este bloque |
| --- | --- | --- |
| CU41–CU46 | Grupo de planificación y registro de cosechas | CUMPLE PARCIALMENTE: planificación cubierta; falta registro real y pasadas |
| CU47/CU48 | Clasificación exacta y descarte | NO CUMPLE: pendiente de implementación de AGRUL-056 |
| CU49 | Acondicionamiento | NO CUMPLE: pendiente |
| CU50–CU52 | Ingresos, salidas y saldos de cámaras | NO CUMPLE: pendiente |
| CU53/CU54 | Destinos y disponibilidad | NO CUMPLE: pendiente |

Las reglas RN-18/RN-19 aún requieren el registro real de la próxima etapa.
RN-20–RN-24 no se certifican en este bloque. La issue #50 permanece abierta.

## Publicación y pausa

El bloque se publica en su rama con referencia a #50, sin cierre automático.
No se modifica main, no se crea PR final ni se realiza merge. Se excluyen los
reportes JSON, la caché de Vitest y los archivos locales anteriores de 054/055.
No se añadieron credenciales: las contraseñas del fixture nuevo se generan en
memoria y las conexiones PostgreSQL usan el mecanismo local habitual.

No hay acceso al porcentaje real de cupo. Se detiene al terminar esta etapa,
incluidos commit y push, y se requiere autorización antes de continuar.
