# AGRUL-055 / #49 — Auditoría y regresión PostgreSQL

Fecha: 2026-10-29. Base del bloque: cb72488.
Rama: feat/agrul-055-insumos-inventario-fifo.

## Alcance y fuentes

Se contrastaron SPEC.md, la issue #49 vigente y los informes de las etapas 1–4
con los adaptadores canónicos, sus rutas, migraciones y pruebas. La issue seguía
abierta y origin/main continuaba en bb6af6d al verificar el remoto.

La issue define individualmente CU34–CU37 y CU40, pero agrupa CU38/CU39 y
CU63–CU66. La matriz conserva esos grupos: no asigna arbitrariamente un flujo
particular a cada número. Cumplir el grupo significa cubrir los requisitos
publicados para el conjunto, no certificar una especificación individual ausente.

## Matriz de los once casos de uso

| CU | Requisito publicado | Implementación | Evidencia | Evaluación |
| --- | --- | --- | --- | --- |
| CU34 | Alta y código único | insumos.use-cases.ts; drizzle-insumos.repository.ts | insumos-postgres.test.ts; insumos-servidor-real.test.ts | Cumple |
| CU35 | Consulta de catálogo | insumos.routes.ts; drizzle-insumos.repository.ts | insumos-postgres.test.ts | Cumple |
| CU36 | Modificación y bloqueo de unidad | insumos.use-cases.ts; migración 0018 | insumos-postgres.test.ts; insumos-concurrencia-postgres.test.ts | Cumple |
| CU37 | Desactivación lógica | drizzle-insumos.repository.ts | insumos-postgres.test.ts | Cumple |
| CU38 | Grupo CU38/CU39: labor realizada, consumo FEFO/FIFO y bloqueo de vencidos | registrar-aplicacion-transaccion.ts; migración 0021 | aplicaciones-insumos-postgres.test.ts; aplicaciones-insumos-autorizacion-postgres.test.ts | Cumple el grupo documentado |
| CU39 | Mismo grupo CU38/CU39; consulta y persistencia de las aplicaciones registradas | aplicaciones-insumos-consultas.ts; aplicaciones-insumos.routes.ts | aplicaciones-insumos-postgres.test.ts; insumos-servidor-real.test.ts | Cumple el grupo documentado |
| CU40 | Corrección auditada sin eliminar historia | drizzle-correcciones-aplicaciones.repository.ts; migración 0022 | correcciones-aplicaciones-postgres.test.ts; correcciones-concurrencia-postgres.test.ts; correcciones-autorizacion-postgres.test.ts | Cumple las nueve condiciones aprobadas; detalle en etapa4.md |
| CU63 | Grupo CU63–CU66: ingresos, movimientos, existencias físicas/utilizables y alertas | inventario-insumos.use-cases.ts; drizzle-inventario-insumos.repository.ts; inventario-consultas.ts | inventario-insumos-postgres.test.ts; inventario-autorizacion-postgres.test.ts | Cumple el grupo documentado |
| CU64 | Mismo grupo CU63–CU66 | Mismos componentes de inventario y rutas persistentes | Mismas suites; inventario-migracion-postgres.test.ts | Cumple el grupo documentado |
| CU65 | Mismo grupo CU63–CU66 | Mismos componentes de inventario y rutas persistentes | Mismas suites; pruebas de concurrencia y decimales exactos | Cumple el grupo documentado |
| CU66 | Mismo grupo CU63–CU66 | Mismos componentes de inventario y rutas persistentes | Mismas suites; mínimo, vencimiento, ausencia de partidas y alcance por finca | Cumple el grupo documentado |

## Reglas e integración

- RN-14: FK a actividad realizada; finca resuelta desde labor y lote persistidos.
  La prueba rechaza identificadores de programaciones y labores inexistentes.
- RN-15: trigger y bloqueo de insumo serializan cambio de unidad y aplicaciones.
  Una corrección conserva los items originales y, por tanto, su protección.
- RN-16: movimiento con insumo, partida, cantidad, unidad, finca y responsable;
  bitácoras append-only, FK y referencias de consumo/compensación verificadas.
- RN-17: descuento protegido en PostgreSQL, bloqueo ordenado y rollback íntegro.
  Se prueban consumos simultáneos, egreso manual concurrente y multiinsumo.
- RN-26, también citada en #49: desactivación lógica y preservación de relaciones,
  aplicaciones, movimientos y balances históricos. Sin backfills inventados.
- Orden aprobado: vencimiento ascendente, nulos al final, ingreso ascendente y
  UUID para desempatar; se excluyen vencidos y stock de otra finca/unidad.
- Reintentos de escritura con clave de operación, contenido y actor comprobados;
  sesión y asignaciones revalidadas antes de devolver un resultado anterior.
- El bootstrap productivo inyecta repositorios Drizzle canónicos. El servidor
  compilado se prueba por HTTP con sesión persistida, ingreso, aplicación,
  corrección, nueva consulta e inspección real del saldo y original conservado.
- Migraciones 0018–0022 incrementales; pruebas de la cadena completa desde cero
  y de datos anteriores sin transformar ausencias históricas en hechos nuevos.

## Regresión de módulos anteriores

Dieciocho suites de integración que estaban omitidas por falta de sus variables
se ejecutaron con ACTIVIDADES_TEST_DATABASE_URL y RN09_TEST_DATABASE_URL apuntando
exclusivamente a agrul_test_agrul_055. Los diez archivos con fixtures ya aislados
aprobaron 237 casos. Los ocho restantes aprobaron 104 casos tras adaptar su
aislamiento: catálogos, RN-09, programaciones, ejecución, monitoreos, autorización,
concurrencia y conservación de datos anteriores a 0015.

Se reutiliza crearEsquemaPostgresAislado: migra la base autorizada, copia solo el
DDL real a un esquema UUID propio y redirige FK y funciones sin fallback a public.
Cada suite conecta sus pools, repositorios y servidores al mismo esquema propio;
lo elimina después de cerrar sus conexiones. No se desactivan triggers ni se
elimina auditoría para reiniciar fixtures. La prueba histórica usa un segundo
esquema con las migraciones antiguas y referencia únicamente su esquema base
temporal, conservando el escenario histórico y las restricciones reales.

El caso restante de las 342 omisiones estaba en tests/unit/infrastructure/
migrations-inmutabilidad.test.ts: es una prueba PostgreSQL real pese a su ruta.
Ahora también admite 055, usa el esquema aislado y conserva su transacción y
savepoints para demostrar rechazo de UPDATE/DELETE y rollback de fixtures.

Las allowlists anteriores de 054 se conservan por compatibilidad de los tests;
este bloque no se conecta a esa base. El helper verifica PG18 y rol sin privilegios
administrativos antes de migrar o crear el esquema. No hay nuevas operaciones
administrativas ni credenciales en las URLs.

## Validación conjunta

- **1402 pruebas aprobadas, 0 omitidas, 0 fallidas; 131 archivos aprobados.**
  Duración: 368,48 segundos. Las 342 omisiones anteriores quedaron ejecutadas
  y aprobadas, incluido el trigger PostgreSQL real ubicado en tests unitarios.
- Lint (`tsc --noEmit`) y build (`tsc`) aprobados después del último cambio.
- `git diff --check` aprobado. No se cambió código productivo ni migraciones.
- PostgreSQL 18.4, rol agrul_test_user sin superusuario, creación de bases,
  creación de roles, replicación ni bypass RLS. Las 24 tablas de public siguen
  vacías. El cierre comprueba ausencia de esquemas temporales de ambas series.
- Reporte JSON local: .scratch/agrul-055-auditoria-vitest.json. No se agrega al
  commit, al igual que los reportes anteriores y la caché de Vitest.

Comando de reproducción (sin habilitar conexiones a otras bases):

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
$env:ACTIVIDADES_TEST_DATABASE_URL=$env:INSUMOS_TEST_DATABASE_URL
$env:RN09_TEST_DATABASE_URL=$env:INSUMOS_TEST_DATABASE_URL
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-auditoria-vitest.json
```

## Límites y cierre del bloque

Los contratos heredados /stock y /aplicaciones siguen su implementación previa;
los flujos persistentes de esta issue son /inventario y /aplicaciones-insumos.
No se afirma que las pantallas o rutas heredadas usen el nuevo inventario.
No se agregó una ventana de aviso anticipado de vencimiento no especificada.
Las correcciones sin procedencia demostrable exigen conciliación explícita.

El informe reúne evidencia de requisitos y regresión; no sustituye una revisión
independiente del diff completo antes de integrar. Este bloque se publica en la
rama de trabajo y se detiene para revisión del cupo. No cierra #49 ni hace merge.

La revisión posterior identificó y corrigió dos fallos adicionales de integridad
y alertas. Sus arreglos, migración 0023 y regresión de 1404 casos están documentados
en [revision-integracion.md](revision-integracion.md), que amplía este informe.
