# AGRUL-055 / #49 — Preparación de CU40 y definición pendiente

Fecha: 2026-10-29. Base: b2cfa85 en la rama
feat/agrul-055-insumos-inventario-fifo, verificada contra origin.
Se consultaron nuevamente la issue #49 y las cinco skills del router JIT.

## Trabajo independiente de la reconciliación

- Se extrae registrarAplicacionEnTransaccion del adaptador de aplicaciones.
  El registro normal conserva su transacción; la futura corrección podrá usar
  la misma implementación de consumo dentro de una transacción más amplia.
- cargarAplicacionParaCorreccion resuelve la finca desde la aplicación, la labor
  y el lote persistidos, filtra el alcance y bloquea la cabecera para serializar
  operaciones futuras sobre esa versión.
- Se verifican los items contra los movimientos reales de egreso: cantidad,
  insumo, partida, finca y responsable deben coincidir. Debe existir un único
  evento original de la aplicación. No se inventan compensaciones a partir de
  históricos sin solicitud, fecha de registro o procedencia verificable.
- Tres pruebas PostgreSQL verifican procedencia real, denegación fuera del
  alcance y rechazo de históricos incompletos. No modifican stock ni hechos.

Este avance preparatorio aún no habilitaba CU40 ni incorporaba endpoints o
migraciones de corrección. Su implementación posterior se documenta en etapa4.md.

## Decisión de negocio requerida

La issue exige corrección auditada y REGULARIZACION_CORRECCION, pero no define
cómo reconciliar las partidas consumidas. Se solicitó al usuario elegir entre:

1. Devolver el consumo original a sus partidas y registrar una aplicación
   reemplazante con el FIFO confirmado, todo en una transacción, conservando
   ambas versiones y permitiendo sustituir cada versión una sola vez.
2. Ajustar las cantidades sobre las partidas originales.

La definición quedó resuelta después de este avance: el usuario autorizó
compensar y reaplicar FIFO/FEFO con nueve condiciones explícitas. La implementación
y sus verificaciones están en [etapa4.md](etapa4.md).

## Validación

Lint y build aprobados. Las 12 pruebas existentes de aplicaciones aprobaron
después de la extracción, y las tres pruebas nuevas de procedencia aprobaron.
Regresión global: **1033 aprobadas, 342 omitidas, 0 fallidas**, en 127 archivos
(109 aprobados, 18 omitidos), durante 155,31 segundos. El total incluye las
tres nuevas pruebas. Las omitidas son suites PostgreSQL anteriores ligadas a
otras bases; no se habilitaron ni se consideran aprobadas.

Se verificó al terminar: cero usuarios, aplicaciones o movimientos de fixtures
en public y cero esquemas temporales agrul055_*. No hubo nuevas migraciones.

```powershell
npm.cmd run lint
npm.cmd run build
# Quitar del proceso las conexiones anteriores sin leer sus valores.
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-cu40-preparacion-vitest.json
```

Solo se usa agrul_test_agrul_055 en PostgreSQL 18.4, con agrul_test_user sin
privilegios administrativos. No se realizan nuevas operaciones administrativas.
Se preservan los archivos locales previos de AGRUL-054 y los reportes JSON se
mantienen fuera del commit. No se modifica main, no se crea PR final ni se cierra
#49.
