# AGRUL-055 / #49 — Etapa 4: CU40, correcciones auditadas

Fecha: 2026-10-29. Base: 5b3efcd.
Rama: feat/agrul-055-insumos-inventario-fifo.

El usuario autorizó compensar exactamente las partidas originales y reaplicar
FIFO/FEFO dentro de una transacción atómica, preservando versiones, usuario,
fecha, motivo y consumos posteriores. Esta definición resuelve la consulta
documentada en cu40-preparacion.md.

## Contrato implementado

- POST /api/v1/aplicaciones-insumos/:id/correcciones recibe operacionId,
  motivoCorreccion y nuevaAplicacion con los campos de aplicación de la etapa 3,
  excepto su identificador de operación: la nueva versión recibe un UUID del
  servidor. La actividad nueva debe existir y estar autorizada para el actor.
- GET /api/v1/aplicaciones-insumos/:id/correcciones devuelve las correcciones
  adyacentes a esa versión, con enlaces a anterior/nueva y movimientos exactos.
  Se pueden seguir esos enlaces para recorrer las correcciones sucesivas.
- GET de una aplicación conserva su contenido y agrega versionAnteriorId y
  versionSiguienteId. Los listados devuelven versiones vigentes por defecto;
  incluirHistoricas=true permite consultar también las sustituidas.
- DrizzleCorreccionesAplicacionesRepository se inyecta en el bootstrap real.
  La prueba del ejecutable compilado autentica y registra una corrección por
  HTTP, consulta la nueva versión y comprueba en PostgreSQL saldo e historial.

La respuesta de corrección identifica operación, versión anterior, versión
nueva, evento original, motivo, responsable revalidado, fecha de registro y
movimientos REGULARIZACION_CORRECCION con su movimientoCompensadoId.
El cliente no asigna el responsable ni el UUID de la versión reemplazante.

## Condiciones obligatorias y evidencia

| Condición del usuario | Implementación y prueba |
| --- | --- |
| Conservar original y crear versión nueva | Tablas append-only; correcciones-aplicaciones-postgres.test.ts compara filas originales, items, egresos y evento antes/después |
| Registrar usuario, fecha, motivo, anterior/nueva | correcciones_aplicaciones_insumo y evento CORRECCION referenciado al evento original |
| Revertir exactamente a las partidas originales | Un movimiento por egreso original, misma cantidad/unidad/partida/finca, FK y unicidad de movimiento_compensado_id; prueba de consumo repartido |
| Recalcular FIFO/FEFO | Reutiliza registrarAplicacionEnTransaccion con el orden aprobado; prueba de nueva partida prioritaria después de la aplicación original |
| Evitar negativos, duplicados y concurrencia inconsistente | Bloqueos de cabecera e insumos ordenados, clave de operación, saldo protegido; correcciones-concurrencia-postgres.test.ts |
| Conservar consumos posteriores y rechazar disponibilidad dudosa | Conciliación exacta saldo/bitácora bajo bloqueo antes y después; rechazo de regularizaciones legadas sin origen; prueba de egreso posterior preservado y de mayor consumo imposible |
| Sustituir cada versión una sola vez | UNIQUE aplicacion_anterior_id; dos correcciones distintas compiten y una recibe 409; correcciones sucesivas se hacen sobre la nueva versión |
| Compensación y nueva aplicación atómicas | Una sola transacción; FK diferida y trigger de completitud al commit; rollback ante insuficiencia o fallo del evento; rechazo SQL de corrección incompleta |
| Pruebas PostgreSQL requeridas | Concurrencia, reintentos, sucesivas, stock insuficiente, historia, origen/destino, SQL directo y actualización desde cero |

## Garantía de conciliación y consumos posteriores

Antes de devolver stock se comprueban solicitud y fecha de registro originales,
los egresos de cada item y su correspondencia exacta, y un único evento original.
Se bloquean en orden común todos los insumos anteriores y nuevos y sus partidas
involucradas, comprobando que cada saldo coincida con la suma firmada de su
bitácora. Se rechazan regularizaciones históricas sin origen identificable.

La devolución siempre referencia un egreso confirmado y cada egreso puede
compensarse una sola vez. Los nuevos movimientos se insertan con fecha actual,
tanto la restitución como el egreso de la versión reemplazante. Los movimientos
posteriores existentes conservan sus cantidades y fechas: no se retrofecha una
corrección ni se reescribe su disponibilidad pasada. La nueva aplicación usa
solamente existencias utilizables actuales y se vuelve a comprobar la conciliación.

Ejemplo verificado: ingreso 10, aplicación original 6 y egreso posterior 3 dejan
saldo 1. Corregir a 4 deja saldo 3 y conserva el egreso posterior idéntico.
Corregir a 8 se rechaza y conserva saldo 1 e historial original. Una regularización
legada sin vínculo también se rechaza, aun cuando el saldo numérico coincida,
porque podría haber devuelto ya el consumo y volver a compensarlo sería ficticio.

Cuando la procedencia o conciliación no puede demostrarse se devuelve 422 con
CONCILIACION_INVENTARIO_REQUERIDA. No se reconstruyen movimientos de históricos,
no se descartan restricciones ni se corrigen balances automáticamente.

## Seguridad y migración

Se autorizan origen y destino antes de compensar, usando fincas persistidas y
sesión revalidada. Un encargado no puede consultar ni corregir aplicaciones
ajenas ni reasignarlas a una finca no autorizada. Administración puede corregir
también la vinculación a una labor válida bajo su alcance global. El historial
que enlaza fincas diferentes requiere acceso a ambas para devolverse. La
revocación se aplica al mismo token y a los reintentos.

0022_correcciones_aplicaciones agrega la bitácora de versiones, referencias
de restitución y protecciones SQL. Los campos nuevos de movimientos previos
permanecen nulos, sin backfill inventado. Una FK diferida permite crear la
referencia a la versión nueva dentro de la transacción; un trigger diferido
exige al commit restituciones, nueva versión e historial de auditoría completos.
La cadena completa se verifica desde un esquema vacío con datos insertados
antes de las ampliaciones para comprobar conservación real.

## Diagnóstico y auto-mejora

El primer caso válido detectó un rechazo por conciliación falsa. Se reprodujo
con una partida y una corrección, se instrumentó únicamente fase/clasificación y
se verificó el dialecto Drizzle instalado: en selecciones de una sola tabla quita
prefijos de columnas interpoladas directamente en campos SQL. La subconsulta
comparaba contra el id interno en lugar de la partida externa. Se preservó la
referencia correlacionada dentro de un fragmento SQL propio y el mismo caso pasó.
La instrumentación temporal se retiró y el patrón se registró en la skill local
database-events.md aplicando writing-for-agents. La prueba original queda como
regresión; no se relajan los controles de saldo para hacerla pasar.

## Resultados de validación

- Lint (`tsc --noEmit`) y build aprobados después del último cambio de código.
- **1060 pruebas aprobadas, 342 omitidas, 0 fallidas**, en 131 archivos
  (113 aprobados y 18 omitidos). Duración global de Vitest: 126,78 segundos.
- **27 pruebas nuevas**: 8 PostgreSQL de corrección/historia, 7 PostgreSQL de
  concurrencia/protección, 6 PostgreSQL de permisos/validación, 5 de dominio
  y 1 adicional de históricos sin procedencia en la suite de migraciones.
- **170 pruebas de AGRUL-055 aprobadas en total**: 58 de dominio y 112 PostgreSQL/
  HTTP. El test existente del servidor compilado se amplió para CU40 sin contarlo
  como caso nuevo. Las 23 migraciones se verificaron desde un esquema vacío.
- Las 342 omitidas corresponden a suites PostgreSQL anteriores vinculadas a
  otras bases. No se habilitaron ni se consideran aprobadas. La exigencia global
  de 100% de tests para cerrar #49 sigue pendiente.

Se usó exclusivamente agrul_test_agrul_055 en PostgreSQL 18.4, 127.0.0.1:5432,
con agrul_test_user sin privilegios administrativos. No hubo nuevas operaciones
administrativas. Verificación final: cero usuarios, aplicaciones, correcciones
o movimientos de fixtures en public; cero esquemas temporales agrul055_*.
No quedó instrumentación DEBUG-cu40 en src/tests. Se preservaron los archivos
locales previos de AGRUL-054; los reportes JSON y la caché quedan fuera del commit.

```powershell
npm.cmd run lint
npm.cmd run build
# Se quitaron del proceso las conexiones anteriores sin leer sus valores.
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-etapa4-vitest.json
```

## Pendientes para el cierre de #49

Este bloque implementa CU40 bajo las condiciones aprobadas. La issue sigue
abierta: faltan la auditoría final de los once CU, desagregar oficialmente los
requisitos agrupados de CU63–CU66 y resolver la regresión PostgreSQL de módulos
anteriores que aún usa fixtures ligados a otras bases. Las rutas antiguas
/stock y /aplicaciones conservan sus contratos previos; no se confunden con los
endpoints canónicos persistentes aquí implementados.

No se crea PR final ni se realiza merge a main en este bloque. Tras commit y
push se detiene el trabajo para revisión del cupo, cuyo porcentaje real no está
disponible. Continuar con auditoría/cierre requiere nueva autorización.
