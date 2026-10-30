# AGRUL-055 / #49 — Etapa 2: inventario y alertas

Fecha: 2026-10-29. Rama: feat/agrul-055-insumos-inventario-fifo.
Base del bloque: efe78a3. Se verificaron origin/main y la rama remota antes
de iniciar. El usuario autorizó continuar y definió DEVOLUCION como devolución
de insumos sin usar al stock, no como devolución al proveedor.

## Alcance implementado

Inventario canónico persistente por finca y partida, conectado al bootstrap
real mediante DrizzleInventarioInsumosRepository:

| Método | Endpoint | Función |
| --- | --- | --- |
| POST | /api/v1/inventario/ingresos | Ingreso por compra o existencia inicial y creación de partida |
| POST | /api/v1/inventario/movimientos | Ajuste positivo/negativo, pérdida o devolución de sobrantes sin usar |
| GET | /api/v1/inventario/partidas | Listado por finca/insumo/partida, paginado |
| GET | /api/v1/inventario/partidas/:id | Detalle autorizado |
| GET | /api/v1/inventario/movimientos | Historial por finca/insumo/partida, paginado |
| GET | /api/v1/inventario/movimientos/:id | Detalle autorizado |
| GET | /api/v1/inventario/existencias | Existencias físicas, utilizables y vencidas |
| GET | /api/v1/inventario/alertas | Alertas actuales por mínimo y partidas vencidas con saldo |

Cada mutación exige operacionId UUID, cantidad positiva con hasta dos decimales,
unidad, fecha y motivo. El ingreso también identifica finca, insumo, proveedor
y vencimiento opcional. El responsable se obtiene de la sesión revalidada; el
cliente no puede sustituirlo ni cambiar la finca de una partida en un movimiento.
El parámetro fincaId selecciona el recurso y nunca concede acceso por sí mismo.

Los saldos y cantidades de salida son cadenas decimales exactas. No se calculan
sumas de existencias con aritmética de punto flotante en JavaScript. Las consultas
agrupan por finca, insumo y unidad para no sumar unidades diferentes. Un cambio
de unidad del catálogo permitido por RN-15 no convierte existencias anteriores:
el stock con otra unidad conserva su valor físico y no se ofrece como utilizable.

## Integridad, idempotencia y seguridad

- RN-16: todo movimiento identifica partida, insumo, finca, cantidad, unidad y
  responsable; PostgreSQL rechaza UPDATE, DELETE y TRUNCATE de la bitácora.
- RN-17: un trigger serializa escritores sobre insumo y partida, rechaza egresos
  superiores al saldo y actualiza la proyección dentro de la misma transacción.
  Una justificación no habilita saldos negativos. Se rechaza también desbordar
  NUMERIC(10,2), sin redondear los inputs.
- Los datos de origen de la partida son inmutables. Cambiar su saldo directamente
  mediante SQL se rechaza; debe existir el movimiento correspondiente. Los
  egresos simultáneos y reintentos del mismo egreso no duplican descuentos.
- La clave de operación se serializa mediante bloqueo transaccional. Repetir
  los mismos datos y responsable devuelve el movimiento original. Reutilizar
  la clave con otros datos o responsable devuelve 409. Los reintentos también
  vuelven a comprobar el acceso vigente a la finca.
- Administrador y encargado de campo pueden operar según sus atribuciones. El
  administrador conserva el alcance global previsto por la seguridad existente;
  el encargado solo ve y opera sus fincas asignadas. Listados, agregaciones y
  alertas filtran en SQL antes de paginar. Los detalles fuera del alcance no se
  entregan y las mutaciones sobre partidas ajenas se rechazan.
- Se comprueban sesiones persistidas, usuario activo y asignaciones actuales.
  Una revocación se aplica al mismo token, sin esperar su vencimiento.

Las alertas se calculan sobre el saldo actual. Se conserva el criterio existente
de reposición al llegar al mínimo (utilizable <= mínimo). Las partidas son
utilizables durante su fecha de vencimiento y vencidas desde el día posterior,
según la fecha civil de Tucumán. No se inventa una ventana de aviso de próximos
vencimientos que la issue no define. Las partidas sin vencimiento son utilizables.

## Migraciones e históricos

0019_inventario_movimientos agrega finca y unidad nullable a partidas existentes,
checks NOT VALID que exigen esos campos en nuevas escrituras, FK compuestas,
índices y movimientos_inventario con sus triggers. No asigna ni convierte datos
históricos. Los históricos sin finca se consultan por administración y quedan
excluidos de agregados por finca; requieren atribución explícita antes de operar.

0020_devolucion_insumos_sin_usar habilita el significado de DEVOLUCION confirmado
por el usuario y protege contra borrado de partidas. Se mantiene incremental la
migración 0019 que ya se había aplicado en la base descartable al recibir esa
definición. No se reescriben migraciones ejecutadas ni se relajan protecciones.

Las pruebas aplican los 21 archivos SQL desde un esquema vacío, insertan una
partida entre 0018 y 0019, y verifican después su preservación y su lectura desde
el bootstrap. Se redirigen todas las referencias explícitas a public al esquema
propio. Los fixtures conservan triggers y claves foráneas reales.

## Verificación

- Lint (`tsc --noEmit`) y build aprobados después del último cambio de código.
- Regresión global: **988 aprobadas, 342 omitidas, 0 fallidas**, en 123 archivos
  (105 aprobados, 18 omitidos). Duración informada por Vitest: 93,30 segundos.
- **44 pruebas nuevas del bloque**: 15 de dominio, 21 de inventario PostgreSQL,
  6 de autorización PostgreSQL y 2 de actualización de históricos PostgreSQL.
- **98 pruebas de AGRUL-055 aprobadas en total**, incluidas las 54 de la etapa
  anterior: 37 de dominio y 61 PostgreSQL/HTTP. El test del ejecutable compilado
  ahora comprueba también el alta y consulta de inventario por HTTP real.
- Concurrencia de ingresos y egresos, idempotencia, rechazo de unidades inválidas,
  stock insuficiente, desbordamiento, precisión, devolución positiva, fecha de
  vencimiento, alertas, SQL directo, rollback, históricos y autorización incluidos.
- Las 342 omitidas son suites PostgreSQL anteriores ligadas a otras bases. No se
  habilitaron esas bases. No se declaran aprobadas ni se afirma cumplimiento
  global del 100% de tests exigido para cerrar la issue.

La única base usada fue agrul_test_agrul_055 en PostgreSQL 18.4,
127.0.0.1:5432, con agrul_test_user sin privilegios administrativos. No hubo
nuevas operaciones administrativas. Al finalizar se verificó que no quedan
esquemas agrul055_aislado_* o agrul055_upgrade_*, ni datos públicos de fixtures.
Se conservaron los archivos locales previos de AGRUL-054. El reporte JSON queda
local, fuera del commit.

```powershell
npm.cmd run lint
npm.cmd run build
# Se quitaron del proceso las variables de conexión anteriores, sin leer valores.
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-etapa2-vitest.json
```

## Cumplimiento de la issue y siguiente etapa

CU34–CU37 mantienen su implementación de la etapa 1. Este bloque implementa el
alcance de ingresos, movimientos, existencias y alertas publicado conjuntamente
para CU63–CU66. La issue no documenta la correspondencia individual entre esos
cuatro números y las funciones; no se inventa esa asignación. La auditoría por
CU individual de inventario queda CUMPLE PARCIALMENTE hasta contrastar esa
desagregación y completar la integración con aplicaciones/correcciones.

CU38/CU39 y CU40 siguen pendientes: aplicaciones canónicas, consumo por vencimiento
más próximo, regularizaciones por corrección e historial asociado a la aplicación.
Las tablas reservan EGRESO_APLICACION y REGULARIZACION_CORRECCION; los endpoints
manuales no permiten eludir esos futuros casos de uso invocando esos tipos.
Las rutas antiguas /stock conservan su comportamiento previo y no escriben en
el nuevo inventario canónico. No se presenta ese código anterior como integración
terminada de #49.

Tras validar, hacer commit y push de este bloque, se detiene el trabajo para
revisar el cupo. Su porcentaje real no está disponible. No se crea PR final,
no se modifica main ni se cierra #49.
