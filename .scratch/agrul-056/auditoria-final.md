# AGRUL-056 / #50 — Auditoría final

Fecha: 2026-10-30. Rama: `feat/agrul-056-cosechas-camaras`.
Base contrastada: `origin/main`, c0cc430580b7373ab7637529cc422cca3f31371c.
GitHub mantiene #50 abierta; las dependencias #48/#49 están integradas en la
base mediante los PR #57/#58. Se preservan main y los archivos locales previos.

## Fuentes y alcance

Issue #50, SPEC.md (RN-18–RN-24), TICKETS.md, solicitud original y skills de
dominio, arquitectura, base de datos, API y testing. Revisión independiente
de estándares y especificación con la skill code-review.

La issue define CU41–CU46, CU47/CU48, CU50–CU52 y CU53/CU54 por grupos.
La matriz conserva una fila por número, pero CUMPLE significa cumplimiento
del criterio grupal publicado; no acredita un desglose individual inexistente.
CU49 sí tiene un criterio individual explícito.

## Matriz CU41–CU54

Las rutas siguientes se encuentran bajo /api/v1. Las referencias de pruebas
son archivos de tests/integration; contienen asserts HTTP y PostgreSQL real.

| CU | Criterio de aceptación publicado | Implementación | Prueba | Resultado |
| --- | --- | --- | --- | --- |
| CU41 | Grupo CU41–CU46: programación, reprogramación, cancelación y registro con pasadas sin sobrescribir antecedentes | cosechas-programadas y cosechas; historial, versiones, kg estimados separados de reales | cosechas-programadas-postgres.test.ts; cosechas-registro-postgres.test.ts | CUMPLE |
| CU42 | Mismo criterio grupal CU41–CU46, sin desglose individual publicado | Mismo circuito e historial | Mismas suites; cosechas-programadas-concurrencia-postgres.test.ts | CUMPLE |
| CU43 | Mismo criterio grupal CU41–CU46, sin desglose individual publicado | Mismo circuito y transiciones controladas | Mismas suites; cosechas-programadas-autorizacion-postgres.test.ts | CUMPLE |
| CU44 | Mismo criterio grupal CU41–CU46, sin desglose individual publicado | Registro directo/programado, ejecución atómica de jornada | cosechas-registro-postgres.test.ts; cosechas-registro-concurrencia-postgres.test.ts | CUMPLE |
| CU45 | Mismo criterio grupal CU41–CU46, sin desglose individual publicado | Pasadas sucesivas, conservación del origen persistido | cosechas-registro-postgres.test.ts; cosechas-registro-historicos-postgres.test.ts | CUMPLE |
| CU46 | Mismo criterio grupal CU41–CU46, sin desglose individual publicado | Consulta paginada con alcance SQL y eventos inmutables | cosechas-registro-autorizacion-postgres.test.ts; cosechas-registro-servidor-real.test.ts | CUMPLE |
| CU47 | Grupo CU47/CU48: clasificación tripartita exacta y descarte con motivos | clasificaciones y partidas FRESCO/INDUSTRIA; descarte sin partida comercializable | clasificaciones-postgres.test.ts; poscosecha-concurrencia-postgres.test.ts | CUMPLE |
| CU48 | Mismo criterio grupal CU47/CU48, sin desglose individual publicado | Balance NUMERIC, causas inmutables y límite acumulado por cosecha | clasificaciones-postgres.test.ts; poscosecha-autorizacion-postgres.test.ts | CUMPLE |
| CU49 | Acondicionamiento: empaque de fruta aprovechable sin superar disponibilidad | acondicionamientos por partida; kg/envases; procesamiento separado del stock físico | acondicionamientos-postgres.test.ts; poscosecha-concurrencia-postgres.test.ts; poscosecha-servidor-real.test.ts | CUMPLE |
| CU50 | Grupo CU50–CU52: ingresos, salidas y saldos por cámara/sector | almacenamiento/camaras, movimientos y saldos | almacenamiento-produccion-postgres.test.ts | CUMPLE |
| CU51 | Mismo criterio grupal CU50–CU52, sin desglose individual publicado | Bitácora por cámara/partida, límites y saldos históricos diarios | almacenamiento-produccion-postgres.test.ts; almacenamiento-destinos-concurrencia-postgres.test.ts | CUMPLE |
| CU52 | Mismo criterio grupal CU50–CU52, sin desglose individual publicado | Proyección exacta y consulta autorizada por finca | almacenamiento-destinos-autorizacion-postgres.test.ts; almacenamiento-destinos-servidor-real.test.ts | CUMPLE |
| CU53 | Grupo CU53/CU54: asignación de producción aprovechable descontando disponibilidad exterior | destinos-produccion; mercado fresco, industria y otro | destinos-produccion-postgres.test.ts | CUMPLE |
| CU54 | Mismo criterio grupal CU53/CU54, sin desglose individual publicado | Destino parcial atómico, idempotencia y origen completo | almacenamiento-destinos-concurrencia-postgres.test.ts; almacenamiento-destinos-servidor-real.test.ts | CUMPLE |

## Reglas e integridad

| Regla | Garantía | Evidencia |
| --- | --- | --- |
| RN-18 | Alta programada o directa; sin inventar programación | Registro de cosechas y servidor compilado |
| RN-19 | Pasadas por ciclo sin sobrescritura ni duplicación | Unicidad SQL y carreras HTTP/SQL |
| RN-20 | Recibido = fresco + industria + descarte, exacto | Clasificaciones, extremos decimales y triggers |
| RN-21 | Inicial = exterior + cámaras + destinado | SQL NUMERIC, bloqueos de partida y rollback del evento |
| RN-22 | Descarte con causas, sin partida aprovechable | Clasificación y rechazo de referencias no aprovechables |
| RN-23 | Ingreso/salida conserva partida, clasificación, cosecha, lote y finca | Eventos, consultas SQL independientes y HTTP real |
| RN-24 | Destinos solo desde el saldo exterior | Destinos y carreras con ingresos a cámaras |

## Standards

Dos hallazgos documentados, corregidos:

- Los eventos nuevos carecían de marcado offline. La migración 0030 marca
  PENDIENTE_AUDITORIA_OFFLINE si la captura precede a la transacción de ingesta.
  Es una política conservadora compatible con el ingreso offline existente;
  no inventa una ventana de negocio de siete días. Preserva timestamps,
  cantidades y todos los eventos anteriores. La prueba
  produccion-capturas-offline-postgres.test.ts cubre los cinco tipos productivos
  y el caso capturado por el servidor, que conserva SINCRONIZADO.
- Las cuatro rutas nuevas ahora registran schemas con ZodTypeProvider y usan
  entradas inferidas. El errorHandler conserva el envelope y los detalles de
  campo. La validación diferida mantiene prioridad de sesión/rol/password.

## Spec

Dos hallazgos de idempotencia, corregidos:

- UUID válidos en mayúsculas provocaban conflicto en un replay idéntico.
  Normalización HTTP, dominio y adaptador, con prueba PostgreSQL de replay.
- INSERT previo al lookup disparaba reglas de alta en reintentos tras cerrar
  el ciclo. Ahora se bloquea la clave y se recupera el original antes de
  insertar, conservando la autorización vigente. Prueba tras cierre de ciclo.

Además se traduce 23505 a 409 si una escritura SQL externa gana la carrera
por la misma clave. La prueba de concurrencia observa bloqueo real y confirma
un solo historial, con commit y rollback externos, seguido de replay válido.

La revisión estática no identificó errores bloqueantes adicionales de stock,
atomicidad, aislamiento de fincas ni conservación de historial.

## Migraciones y compatibilidad

Cadena completa de 31 migraciones, con 0024–0030 incrementales para #50.
Pruebas desde esquema vacío y actualización de datos anteriores: conservan
campos nullable desconocidos, kilos históricos, clasificación, empaques y
eventos; no fabrican cámaras, movimientos ni destinos.

Las cámaras documentadas tienen nombre, descripción y temperatura objetivo.
SPEC no define capacidad máxima ni unidad: se verifica disponibilidad física
por partida y cámara, sin introducir un límite arbitrario de capacidad.

## Ejecuciones y regresión

Lint y build aprobados. Ejecución integral final: **1709 aprobadas, 0 fallidas,
0 omitidas**, en **156 archivos**, duración **381.67 segundos**. Incluye todos
los módulos previos, las pruebas PostgreSQL, autorización, concurrencia,
trazabilidad y cinco circuitos con servidor compilado/HTTP real (incluido
insumos). Las 456 pruebas omitidas en las etapas anteriores se ejecutaron.

Además, las cuatro suites focales de contratos aprobaron 89 casos y la suite
focal de concurrencia aprobó 10. No se suman estos reintentos al total global.
La evidencia final es .scratch/agrul-056-auditoria-final-vitest.json; la focal
de concurrencia es .scratch/agrul-056-auditoria-concurrencia-vitest.json.

Comprobación posterior: PostgreSQL 18.4, rol sin superusuario, createdb,
createrole, replicación ni bypassrls; 31 migraciones; cero esquemas de pruebas
remanentes y cero filas en public para usuarios, fincas, lotes, cosechas,
clasificaciones, partidas, cámaras, movimientos, destinos y eventos.
Los servidores hijos se cerraron mediante los teardowns aprobados.

El primer intento integral registró 1700 pruebas aprobadas, una fallida y
una suite rechazada al cargar por su allowlist. El test de servidor de insumos
usaba una contraseña literal anterior al cambio de fixture; ahora recibe la
credencial generada en ejecución. La suite SQL ubicada bajo unit/ agrega la
URL exacta AGRUL-056 a su allowlist. La evidencia del intento fallido se
conserva localmente como agrul-056-auditoria-primer-vitest.json; esos fallos
solo se consideran resueltos por la ejecución integral posterior.

La regresión habilita explícitamente las suites de territorio, cultivos,
variedades, plantaciones, ciclos, usuarios/sesiones, actividades, monitoreos,
insumos, inventario, aplicaciones y correcciones, además de cosecha/poscosecha.
Las allowlists agregan únicamente la URL exacta autorizada de AGRUL-056.

Todas las integraciones de este cierre usan PostgreSQL 18 en 127.0.0.1:5432,
agrul_test_agrul_056 y agrul_test_user sin privilegios administrativos.
Cada suite usa su esquema propio sin fallback a public. No se crean bases
ni roles y se preservan las demás bases y los archivos locales anteriores.

Comando de la regresión integral (PowerShell; autenticación por pgpass):

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$u='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
$env:COSECHAS_TEST_DATABASE_URL=$u
$env:ACTIVIDADES_TEST_DATABASE_URL=$u
$env:INSUMOS_TEST_DATABASE_URL=$u
$env:RN09_TEST_DATABASE_URL=$u
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-056-auditoria-final-vitest.json
```

Los reportes JSON son evidencia local excluida de Git. El PR referencia
Closes #50 para cierre al integrar; la rama main no se modifica directamente.

Revisión estática: Standards 2/2 hallazgos corregidos; Spec 2/2 hallazgos
corregidos, más endurecimiento de conflicto SQL. El resultado de ejecución
documentado arriba determina el cierre de la validación.
