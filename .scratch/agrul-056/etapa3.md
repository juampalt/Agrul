# AGRUL-056 / #50 — Etapa 3: clasificación, descarte y acondicionamiento

Fecha: 2026-10-30. Rama: `feat/agrul-056-cosechas-camaras`.
Base del bloque: 0394191, segunda etapa publicada y validada.
El usuario autorizó continuar con la siguiente etapa del plan aprobado.

## Alcance y reglas

Se consultaron SPEC.md, el alcance publicado de #50 y las skills de dominio,
arquitectura, base de datos, API y testing. Se implementan CU47/CU48 como el
grupo de clasificación y descarte publicado por la issue, y CU49 como
acondicionamiento. No se asignan a CU48 requisitos individuales ausentes.

- RN-20: cada recepción positiva debe coincidir exactamente con fresco +
  industria + descarte. El dominio suma centésimas enteras con BigInt después
  de validar precisión y rango; PostgreSQL usa igualdad NUMERIC, sin tolerancias.
- RN-21: se admiten clasificaciones parciales. La suma de kg recibidos de todas
  las clasificaciones de una cosecha jamás supera su pesaje original. Se
  comprueba bajo bloqueo de la cosecha y también con SQL directo.
- RN-22: todo descarte positivo requiere causas no vacías, registradas como
  lista JSONB de textos. Solo fresco e industria con cantidad positiva generan
  partidas. Un descarte total conserva su clasificación y no crea partidas.
- El acondicionamiento registra fecha, preparación, tipo/cantidad de envases,
  kilos y responsable. Admite fresco e industria. Sus kilos acumulados no
  superan la cantidad inicial de la partida; cada operación también requiere
  suficientes kilos físicamente disponibles.
- El acondicionamiento no crea otro stock ni consume masa física: una partida
  de 10 kg con 3 kg acondicionados conserva 10 kg físicos, de los cuales 3 están
  acondicionados y 7 pendientes. Los saldos de acondicionamiento se derivan del
  historial; no se suman a cantidadDisponibleKg. No se infiere peso por envase.
- Fechas de clasificación desde la cosecha y de empaque desde la clasificación,
  no futuras en el día local de Tucumán. No se exige que el ciclo siga activo
  para procesar una cosecha ya realizada.

## Persistencia, linaje y atomicidad

Migraciones incrementales 0026 y 0027: clasificaciones, partidas_produccion y
acondicionamientos, con FK restrictivas, índices y restricciones de balance.
No alteran los kilos ni los campos anteriores de cosechas. La cadena completa
queda compuesta por 28 migraciones versionadas.

Los triggers generan las partidas y el evento CLASIFICACION dentro de la
misma transacción de la recepción. Cada categoría genera como máximo una
partida por clasificación. Las partidas solo se insertan desde esa operación:
se rechazan INSERT tardíos que ampliarían una clasificación confirmada.
En esta etapa se protegen también sus cantidades contra mutaciones externas.

El acondicionamiento inserta su evento ACONDICIONAMIENTO con partida,
clasificación, cosecha, lote y finca reconstruidos desde relaciones persistidas.
Se conserva responsable y actor registrante; captura local e ingesta usan
timestamptz. Si se omite captura local se usa el reloj del servidor.

Las clasificaciones y acondicionamientos son append-only: no admiten UPDATE,
DELETE ni TRUNCATE. Si falla el evento se revierte la operación completa,
incluidas las partidas recién generadas o el saldo de acondicionamiento.
No se insertan relaciones ficticias sobre lotes territoriales: el linaje es
acondicionamiento → partida → clasificación → cosecha → ciclo/plantación/lote.

Operaciones con clave UUID y snapshot de solicitud/actor. Los reintentos
equivalentes devuelven los mismos IDs, partidas y hechos sin duplicarlos;
contenido o actor diferentes bajo la misma clave reciben 409.

Los advisory locks por operación y los bloqueos de cosecha/partida serializan
escrituras simultáneas. Las pruebas incluyen solicitudes HTTP concurrentes y
transacciones SQL externas, observando el bloqueo con pg_blocking_pids tanto
con commit como con rollback. Una segunda operación que excede el saldo se
rechaza con 422; no se vuelve a ejecutar una decisión inválida.

## Arquitectura, contratos y seguridad

Dominio puro; casos de uso RegistrarClasificacionUseCase,
RegistrarAcondicionamientoUseCase y ConsultarPoscosechaUseCase; puertos
ClasificacionesRepositoryPort y PoscosechaAlmacenamientoRepositoryPort.
DrizzlePoscosechaRepository implementa esos puertos y se inyecta en el bootstrap
real. Las consultas comparten el mismo modelo persistido que las escrituras.

| Método | Recurso | Entrada principal |
| --- | --- | --- |
| POST | /api/v1/clasificaciones | operacionId, cosechaId, fechaClasificacion, cantidadRecibidaKg, kgFresco, kgIndustria, kgDescarte, motivosDescarte, responsableId |
| GET | /api/v1/clasificaciones[/:id] | cosechaId, fechas, página; detalle por UUID |
| GET | /api/v1/partidas-produccion[/:id] | cosechaId, clasificacionId, categoría, página; detalle por UUID |
| POST | /api/v1/acondicionamientos | operacionId, partidaProduccionId, fechaAcondicionamiento, tipoAcondicionamiento, tipoEnvase, cantidadKg, cantidadEnvases, responsableId |
| GET | /api/v1/acondicionamientos[/:id] | partidaProduccionId, cosechaId, fechas, página; detalle por UUID |

Los POST admiten timestampCapturaLocal opcional. Las respuestas mantienen el
envelope habitual y los schemas son estrictos, con UUID normalizados. No se
acepta finca ni actor registrante desde el cliente.

Roles ADMINISTRADOR y ENCARGADO_CAMPO; sesión, usuario y asignaciones vigentes
revalidados. Las escrituras verifican finca desde el origen persistido antes
de devolver un reintento. Las lecturas filtran por finca en SQL antes de paginar;
un detalle no visible devuelve 404. Se prueban dos fincas, usuarios sin
asignaciones, perfiles no autorizados, anónimos, tokens falsos y revocaciones,
incluidos reintentos con la misma clave y token.

## Datos históricos

No se crean clasificaciones ni partidas automáticamente para cosechas anteriores.
Un registro heredado con cantidades comerciales/descarte o sin el contrato
vigente se conserva para consulta, pero no se reclasifica sin conciliación
explícita: hacerlo podría contabilizar otra vez fruta ya registrada.

La prueba histórica conserva todos los campos de la cosecha de 12.3456 kg de
la etapa anterior. Las migraciones no inventan clasificaciones, partidas,
acondicionamientos ni eventos. Un intento de reclasificarla recibe 422 y
conserva 8.1111 comerciales y 4.2345 de descarte intactos.

## Validación

Resultado definitivo de la ejecución final:

- Lint y build aprobados después del último cambio.
- **1168 pruebas aprobadas, 0 fallidas, 456 omitidas**, en 119 archivos
  aprobados y 30 omitidos. Duración: 404,84 segundos.
- **84 pruebas nuevas aprobadas, sin omisiones:** 25 de dominio, 18 de
  clasificación, 19 de acondicionamiento, 11 de autorización, 8 de concurrencia,
  1 del proceso compilado por HTTP y 2 agregadas a la suite histórica anterior.
- **220 pruebas acumuladas de AGRUL-056 aprobadas**, incluidas las etapas 1 y 2.
  Se volvió a ejecutar la cadena completa de 28 migraciones desde cero.
- La primera regresión general tuvo una falla en una expectativa de TRUNCATE
  anterior: la nueva FK devolvía 0A000 antes de llegar al trigger. Se adaptó
  el caso a TRUNCATE CASCADE en el esquema propio, conservando la exigencia
  de rechazo 23514 y agregando comprobación de kilos intactos. La ejecución
  final completa aprobó después; no se relajó ninguna protección productiva.
- Las 456 omisiones son integraciones anteriores que requieren sus variables
  y bases autorizadas de 054/055. No se ejecutaron ni se certifican como
  aprobadas; su regresión PostgreSQL integral sigue pendiente antes del cierre.
- Verificados al terminar: public.usuarios, cosechas, clasificaciones,
  partidas_produccion, acondicionamientos y eventos_trazabilidad vacíos; sin
  esquemas agrul056_* remanentes. Los procesos de servidor finalizaron.
- `git diff --check` aprobado. Reporte local excluido de Git:
  `.scratch/agrul-056-etapa3-final-vitest.json`; se conserva también el primer
  reporte local para distinguir la falla de expectativa de la validación final.

Reproducción sin habilitar conexiones a otras bases:

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$env:COSECHAS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-056-etapa3-final-vitest.json
```

Las pruebas nuevas cubren balance decimal exacto, clases parciales, descarte
total, causas, reintentos, límites y acumulados de empaque, permisos por finca,
inmutabilidad, INSERT tardíos, rollback de eventos, concurrencia con SQL externo
y HTTP real desde dist/src/index.js. La consulta de saldo se comprueba con un
valor conocido distinto de cero para detectar errores de correlación SQL.

Todas las integraciones del bloque usan exclusivamente agrul_test_agrul_056
en PostgreSQL 18.4, 127.0.0.1:5432, con agrul_test_user sin privilegios
administrativos y esquemas temporales propios, sin fallback a public. No se
crearon bases, roles ni privilegios adicionales.

## Matriz acumulada y pausa

| CU | Requisito publicado | Estado tras etapas 1–3 |
| --- | --- | --- |
| CU41–CU46 | Grupo de planificación y registro con pasadas | CUMPLE el grupo funcional publicado; sujeto a auditoría final |
| CU47/CU48 | Clasificación tripartita exacta y descarte con causas | CUMPLE el grupo funcional publicado; validación PostgreSQL/HTTP y concurrencia aprobada |
| CU49 | Acondicionamiento de fruta aprovechable | CUMPLE; saldos, linaje, permisos y HTTP real aprobados |
| CU50–CU52 | Ingresos, salidas y saldos en cámaras | NO CUMPLE: pendiente |
| CU53/CU54 | Destinos y disponibilidad fuera de almacenamiento | NO CUMPLE: pendiente |

RN-20, RN-22 y la conservación de masa de RN-21 se implementan para clasificación
y acondicionamiento. RN-21 completa, RN-23 y RN-24 requieren cámaras/destinos.
La issue #50 sigue abierta. No se crea el PR final ni se modifica main.

El bloque se publica en la rama de trabajo con refs #50. Se excluyen reportes
JSON, caché de Vitest y archivos locales previos. Sin acceso al porcentaje real
de cupo, se detiene después de commit/push y espera autorización para continuar.
