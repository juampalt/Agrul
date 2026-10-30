# AGRUL-056 / #50 — Etapa 2: cosechas reales y pasadas

Fecha: 2026-10-29. Rama: `feat/agrul-056-cosechas-camaras`.
Base del bloque: 09970e4, primera etapa publicada y validada.
El usuario autorizó continuar con la segunda etapa del plan aprobado.

## Alcance y contratos vigentes

Se aplicaron las skills de dominio, arquitectura, base de datos, API y testing.
La issue #50 agrupa CU41–CU46: programación, reprogramación, cancelación y
registro con pasadas sucesivas. Esta etapa agrega el registro y consulta de
cosechas programadas y directas y completa el grupo funcional publicado, sin
inventar una correspondencia individual entre números y operaciones.

El contrato heredado exigía cantidad comercializable y descarte al registrar,
y validaba ciclos ABIERTOS. SPEC.md vigente exige ciclo ACTIVO y separa cosecha
de clasificación. Se mantiene ese código heredado para sus consumidores
internos existentes y se incorpora CosechasRegistroRepositoryPort para el
contrato vigente, con dominio puro, casos de uso, Drizzle y rutas del bootstrap.
buildApp rechaza habilitar simultáneamente los dos contratos en la misma ruta.

## Registro y trazabilidad

- POST /api/v1/cosechas recibe operacionId, origen, fechaEfectiva, numeroPasada,
  cantidadCosechadaKg, responsableId y sector; timestampCapturaLocal es opcional.
  NO_PROGRAMADA requiere cicloId. PROGRAMADA requiere cosechaProgramadaId y
  versionProgramacion, sin aceptar ciclo/lote/finca proporcionados por el cliente.
- Los UUID HTTP se normalizan a minúsculas. Los kilos reales son positivos,
  con hasta dos decimales y máximo 99999999.99; se validan sin redondear.
  El número de pasada es un entero positivo, único dentro del ciclo. No se
  inventan pasadas para registros anteriores ni se obliga a una secuencia sin
  huecos. Una misma jornada solo admite una cosecha realizada.
- La fecha real no es futura en el día local de Tucumán y respeta el inicio
  efectivo del ciclo ACTIVO. No se aplica un límite artificial basado en su
  fecha de fin prevista. Se conserva la captura informada; si se omite, se usa
  el reloj del servidor. El evento conserva captura e ingesta por separado.
- El ciclo resuelve plantación, lote y finca persistidos bajo bloqueo. Los
  permisos de finca se comprueban antes de devolver un reintento idempotente.
  Los listados aplican el alcance SQL antes de paginar o reconstruir historia.
- Cada cosecha tiene UUID y código inequívoco COS-<UUID>, únicos, sin contar
  cosechas previas para generar un identificador susceptible de colisiones.
  Los códigos anteriores se conservan intactos.
- La escritura atómica conserva cosecha, evento COSECHA y, si corresponde,
  transición de jornada a EJECUTADA más snapshot EJECUCION en su historial.
  Los triggers PostgreSQL generan los hechos: también cubren INSERT SQL directo.
- No se materializa producción comercial ni se descuenta inventario de insumos.
  Los kilos reales quedan disponibles para la clasificación de la siguiente
  etapa; no se convierten en partidas aprovechables anticipadamente. La
  estimación de la jornada sigue intacta aunque difiera del pesaje real.
- La cosecha y sus eventos no admiten UPDATE, DELETE ni TRUNCATE. No se habilitan
  modificaciones de pesajes que sobrescriban antecedentes.

## Integridad y concurrencia

La transacción toma un advisory lock por operacionId, bloquea la jornada con
FOR UPDATE cuando corresponde y el ciclo/plantación/lote con FOR SHARE.
Los triggers usan el mismo orden de jornada antes de ciclo. Los reintentos con
la misma solicitud y actor devuelven el registro original sin otro evento;
otra solicitud bajo la misma clave produce 409.

La unicidad ciclo/pasada y jornada/cosecha impide duplicar kilos en solicitudes
simultáneas. La ejecución verifica versión y estado PENDIENTE bajo bloqueo.
Disputas con cancelación/reprogramación o ejecuciones duplicadas devuelven un
conflicto sin reintentar decisiones obsoletas. Una jornada no puede marcarse
EJECUTADA por SQL si no existe su cosecha real en la misma transacción.

Las pruebas cubren dos ejecuciones de la misma jornada, dos operaciones para
la misma pasada, reintentos simultáneos, cancelación concurrente y cierre del
ciclo observado mediante bloqueos reales entre conexiones. También fuerzan
fallos del evento y de la auditoría de ejecución y verifican rollback completo.

## Migración incremental e históricos

0025 crea cosechas si la instalación no tenía la tabla declarada anteriormente.
Si ya existe con el esquema heredado, conserva columnas y valores. Agrega los
campos de origen, pasada, programación, actor, solicitud y captura como nullable
para no inventar datos anteriores. Relaja NOT NULL de kilos comerciales y
descarte para permitir que una cosecha nueva aún no esté clasificada.

El tipo numeric(14,4) anterior se conserva: no se redondean históricos con
cuatro decimales. Las escrituras nuevas se restringen a los dos decimales del
contrato vigente. Se agrega la FK del responsable NOT VALID para preservar
datos anteriores y exigir integridad en escrituras nuevas. Los nuevos CHECK
separan filas históricas de altas; un trigger exige el contrato nuevo en INSERT.

La prueba de upgrade crea el esquema anterior antes de 0025, carga una cosecha
de 12.3456 kg (8.1111 comercializables y 4.2345 de descarte) y compara todos sus
campos después. Verifica detalle y listado desde el bootstrap con origen,
pasada, captura y responsable desconocidos nulos, sin crear eventos ficticios.

## Seguridad e integración real

Roles ADMINISTRADOR y ENCARGADO_CAMPO, sesiones y usuarios persistidos,
asignaciones de finca revalidadas y bloqueo por contraseña inicial pendiente.
Se prueban accesos propios y cruzados, usuarios sin fincas, operario y
administrador del sistema, token falso, sesión revocada y revocación de finca
con el mismo token, incluido un reintento idempotente previamente permitido.

GET /api/v1/cosechas y GET /api/v1/cosechas/:id consultan registros actuales e
históricos. Los filtros incluyen ciclo, lote, origen, pasada, fechas y página.
Un ciclo o responsable que luego deja de estar activo no invalida la lectura
de hechos históricos. El proceso compilado dist/src/index.js se inicia en un
puerto local efímero para probar login y registro directo/programado por HTTP,
con consultas SQL independientes del evento, cantidades y transición.

## Validación

Resultado definitivo de la ejecución final:

- Lint y build aprobados después del último cambio productivo.
- **1084 pruebas aprobadas, 0 fallidas, 456 omitidas**, en 113 archivos
  aprobados y 30 omitidos; duración de 307,14 segundos.
- **65 pruebas nuevas aprobadas, sin omisiones:** 20 de dominio, 25 de registro
  y contratos, 9 de autorización, 7 de concurrencia/rollback, 3 de históricos
  y 1 del proceso compilado por HTTP real.
- **136 pruebas de AGRUL-056 aprobadas en total**, incluidas las 71 de la
  primera etapa. Se volvió a probar la cadena completa de 26 migraciones.
- Las 456 omisiones son integraciones anteriores de otras bases/variables
  de 054/055. No se ejecutaron ni se declaran aprobadas en este bloque; queda
  pendiente su regresión PostgreSQL integral antes del cierre final de #50.
- Sin datos de fixtures en public.usuarios, ciclos_productivos, cosechas,
  cosechas_programadas y eventos_trazabilidad, y sin esquemas agrul056_*
  remanentes. Los procesos de servidor de las suites finalizaron.
- `git diff --check` aprobado. Reporte local excluido de Git:
  `.scratch/agrul-056-etapa2-final-vitest.json`.

Reproducción sin habilitar conexiones a otras bases:

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$env:COSECHAS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-056-etapa2-final-vitest.json
```

Toda integración de este bloque usa exclusivamente agrul_test_agrul_056 en
127.0.0.1:5432, PostgreSQL 18.4, con agrul_test_user sin privilegios
administrativos. Cada suite usa esquemas propios, conserva triggers activos
y elimina solamente su esquema después de cerrar conexiones/servidores.
No se crean bases, roles ni privilegios adicionales en esta etapa.

## Matriz acumulada y pausa

| CU | Requisito publicado | Estado tras etapas 1 y 2 |
| --- | --- | --- |
| CU41–CU46 | Grupo de programación, reprogramación, cancelación y registro con pasadas | CUMPLE el grupo funcional publicado; falta la regresión PostgreSQL integral anterior antes del cierre final |
| CU47/CU48 | Clasificación y descarte | NO CUMPLE: próxima etapa |
| CU49 | Acondicionamiento | NO CUMPLE: pendiente |
| CU50–CU52 | Cámaras y saldos físicos | NO CUMPLE: pendiente |
| CU53/CU54 | Destinos y disponibilidad | NO CUMPLE: pendiente |

RN-18 y RN-19 quedan implementadas y probadas. RN-20–RN-24 siguen pendientes
de sus etapas; no se declara completada la issue #50 ni se crea el PR final.
Commit y push se realizan solo en la rama de trabajo, con refs #50.
Se excluyen reportes JSON, caché de Vitest y archivos locales anteriores.

No hay acceso al porcentaje real de cupo. Se detiene después de publicar esta
etapa y se requiere autorización antes de continuar con clasificación.
