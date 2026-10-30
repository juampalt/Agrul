# AGRUL-055 / #49 — Etapa 3: aplicaciones y consumo FEFO/FIFO

Fecha: 2026-10-29. Base: 480e297, verificada contra la rama remota.
Rama: feat/agrul-055-insumos-inventario-fifo. origin/main permanece en bb6af6d.
El usuario autorizó este bloque y confirmó expresamente el orden para los
casos no definidos en la issue: vencimiento ascendente, sin vencimiento al final,
fecha de ingreso más antigua y luego UUID ascendente para desempatar.

## Implementación y contrato

- POST /api/v1/aplicaciones-insumos registra una aplicación vinculada a una
  actividad realizada persistida. No acepta programaciones como sustituto de
  esa labor ni recibe finca, partida o responsable determinados por el cliente.
- GET /api/v1/aplicaciones-insumos y /:id consultan cabeceras e items. El listado
  filtra por labor, finca o insumo y pagina después de aplicar el alcance en SQL.
- DrizzleAplicacionesInsumosRepository se inyecta en crearServidorProduccion.
  Los datos persisten entre instancias y se comprueban desde el entrypoint
  compilado de npm start, usando login y solicitudes HTTP reales.

El registro exige operacionId UUID, actividadRealizadaId, superficieTratada,
metodoAplicacion, motivoAplicacion y uno o más items con insumoId, cantidad,
unidadMedida y dosis. Observaciones es opcional. Los schemas son estrictos;
rechazan insumos repetidos, UUID inválidos, propiedades no documentadas y
cantidades que desbordan o requieren redondeo. Cada insumo se declara una vez;
el sistema divide automáticamente su consumo entre las partidas necesarias.

Superficie y dosis se validan como NUMERIC(8,2), y cantidad como NUMERIC(10,2).
La dosis técnica suministrada se conserva en cada item de partida del insumo;
no se inventa una conversión o relación matemática que la issue no define.
Las cantidades persistidas de salida se devuelven como cadenas decimales.

## Atomicidad, trazabilidad y orden de consumo

1. Se resuelve la finca desde la labor y el lote persistidos, con bloqueo de
   lectura durante la transacción. Se verifica el alcance del actor revalidado.
2. La clave de operación serializa reintentos. Mismos datos y responsable
   devuelven la aplicación original; cambios de contenido o responsable dan 409.
   Antes de devolver un reintento también se comprueban los permisos actuales.
3. Se bloquean todos los insumos en orden de UUID. Se selecciona stock de la
   finca de la labor, con unidad compatible, saldo positivo y no vencido.
   La fecha de vencimiento se evalúa al registrar, según la fecha civil de
   Tucumán; el propio día del vencimiento sigue siendo utilizable. No se usa
   SKIP LOCKED, que permitiría saltar partidas anteriores durante la concurrencia.
4. El plan de consumo aplica el orden confirmado por el usuario y calcula con
   centésimas enteras, sin sumas de punto flotante. Si cualquier insumo carece de
   stock, falla la aplicación completa, sin conservar consumos parciales.
5. Cada item dispara un único EGRESO_APLICACION en movimientos_inventario,
   referenciado mediante aplicacion_item_id. El trigger de inventario descuenta
   el stock bajo bloqueo. El repositorio no vuelve a descontarlo.
6. En la misma transacción se agrega un evento APLICACION_INSUMOS inmutable con
   aplicación, labor e items. El lote, finca y actor tienen referencias reales.
   Las marcas de captura y servidor representan el registro online actual;
   la fecha del movimiento conserva la fecha de ejecución de la labor.

Si falla un item, el movimiento o el evento, se revierten cabecera, items,
descuentos y bitácoras. Se probaron dos aplicaciones sobre el mismo stock,
competencia con egresos manuales, reintentos y solicitudes con varios insumos
declarados en orden inverso. Se mantienen RN-14, RN-15, RN-16 y RN-17.

## Seguridad y protección SQL

Administrador y encargado tienen acceso operativo con las restricciones
existentes: administración mantiene alcance global; el encargado solo accede
a las fincas asignadas en su sesión persistida y revalidada. La autorización no
se toma del body ni de claims de finca antiguos. Un usuario sin asignaciones
no registra aplicaciones ni recibe detalles o listados ajenos. Revocar una
asignación se aplica también al mismo token y a reintentos previos.

Los triggers impiden consumir partidas vencidas, de otro insumo o de otra finca,
y la escritura del movimiento exige el item correspondiente. Cada item tiene
un solo egreso referenciado. Se mantienen las protecciones append-only de
aplicaciones, items, movimientos y eventos, y el bloqueo de unidad RN-15.

## Migración incremental 0021

Agrega solicitud y registrado_en nullable a aplicaciones, y la referencia
nullable aplicacion_item_id a movimientos, con FK restrictiva y unicidad.
Los nuevos egresos por aplicación requieren su item. Se agregan triggers de
consumo, correspondencia del egreso y protección de truncado de aplicaciones.

Las columnas nuevas permanecen nulas para hechos anteriores. No se reconstruyen
movimientos inexistentes, no se vuelve a consumir stock y no se inventan fechas
históricas. La prueba de actualización inserta una aplicación e item antes de
0021 y después verifica desde el bootstrap el histórico, su saldo original y la
ausencia de movimientos inventados. La cadena SQL completa se ejecuta desde cero
en un esquema aislado de la base exclusiva, conservando FK y triggers reales.

El test anterior de RN-15 con cambio concurrente de unidad ahora comprueba que
la aplicación rechaza una partida cuya unidad quedó obsoleta. Una inserción
rechazada no deja un item ficticio que bloquee posteriores cambios de unidad.
Después se registra un item válido y se comprueba nuevamente RN-15.

## Verificación

- Lint (`tsc --noEmit`) y build aprobados después del último cambio de código.
- **1030 pruebas aprobadas, 342 omitidas, 0 fallidas**, en 126 archivos
  (108 aprobados, 18 omitidos). Duración global de Vitest: 105,75 segundos.
- **42 pruebas nuevas**: 16 de dominio, 12 PostgreSQL de aplicaciones/consumo,
  13 PostgreSQL de autorización/protección y 1 de actualización de aplicación
  histórica en la suite de migraciones existente.
- **140 pruebas de AGRUL-055 aprobadas en total**: 53 de dominio y 87 PostgreSQL/
  HTTP. También se ampliaron las pruebas existentes de concurrencia RN-15 y del
  entrypoint compilado, sin contarlas como casos nuevos.
- Se verificaron el orden confirmado completo, cantidades decimales, partidas
  vencidas y de otra finca, stock insuficiente, atomicidad de varios insumos,
  concurrencia aplicación/aplicación y aplicación/egreso, idempotencia, permisos
  vigentes, SQL directo e inmutabilidad del evento y sus referencias.
- La cadena de 22 migraciones se aplicó desde un esquema vacío, con hechos de
  prueba insertados antes de las ampliaciones para verificar conservación real.

Las 342 omitidas corresponden a suites PostgreSQL anteriores ligadas a otras
bases. No se habilitaron y no se consideran aprobadas. El criterio global de
100% de pruebas de la issue permanece pendiente.

La única base usada fue agrul_test_agrul_055 en PostgreSQL 18.4,
127.0.0.1:5432, mediante agrul_test_user sin privilegios administrativos. No se
realizaron nuevas operaciones administrativas ni se consultaron bases ajenas.
Al finalizar: cero usuarios, insumos, partidas, aplicaciones o movimientos de
fixtures en public; cero esquemas temporales agrul055_*. Se preservaron los
archivos locales anteriores de AGRUL-054. El JSON queda local, fuera del commit.

```powershell
npm.cmd run lint
npm.cmd run build
# Se quitaron del proceso las conexiones anteriores sin leer sus valores.
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-etapa3-vitest.json
```

## Estado de la issue

CU34–CU37 conservan la etapa 1; inventario y alertas conservan la etapa 2.
Este bloque cubre el registro y consulta de aplicaciones publicados como grupo
CU38/CU39, con consumo y trazabilidad integrados. CU40 sigue pendiente: corrección
auditada y movimientos REGULARIZACION_CORRECCION sin editar hechos originales.

La desagregación oficial de CU63–CU66 y la regresión PostgreSQL completa de los
módulos anteriores siguen pendientes para la auditoría final. Las rutas antiguas
/aplicaciones y /stock conservan sus adaptadores previos; no se presentan como
parte del nuevo contrato persistente. No se declara la issue terminada ni se
crea PR final o merge durante este bloque.

Después de commit y push se detiene el trabajo para revisión del cupo. No se
dispone de su porcentaje real. Continuar con correcciones requiere autorización.
