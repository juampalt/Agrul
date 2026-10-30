## Summary

Implementa el catálogo persistente de insumos, inventario por finca/partida,
aplicaciones vinculadas a labores realizadas y correcciones que conservan versiones.

```text
ingreso → partida + movimiento + saldo
aplicación → validar labor/finca → FEFO/FIFO → items + egresos + evento
corrección → restituir partidas originales → nueva aplicación FEFO/FIFO → auditoría
             └──────────── una transacción con rollback íntegro ────────────┘
```

| CU | Requisito publicado | Resultado y evidencia |
| --- | --- | --- |
| CU34 | Alta de insumos y código único | CUMPLE; insumos-postgres.test.ts |
| CU35 | Consulta del catálogo | CUMPLE; insumos-postgres.test.ts |
| CU36 | Modificación y unidad protegida | CUMPLE; insumos-concurrencia-postgres.test.ts |
| CU37 | Desactivación lógica | CUMPLE; insumos-postgres.test.ts |
| CU38 | Grupo CU38/CU39: labor previa y consumo FEFO/FIFO | CUMPLE; aplicaciones-insumos-postgres.test.ts |
| CU39 | Mismo grupo CU38/CU39 | CUMPLE; aplicaciones-insumos-autorizacion-postgres.test.ts |
| CU40 | Corrección compensatoria y nueva versión | CUMPLE; correcciones-aplicaciones, concurrencia y autorización PostgreSQL |
| CU63 | Grupo CU63–CU66: ingresos, movimientos, existencias y alertas | CUMPLE; inventario-insumos-postgres.test.ts |
| CU64 | Mismo grupo CU63–CU66 | CUMPLE; inventario-autorizacion-postgres.test.ts |
| CU65 | Mismo grupo CU63–CU66 | CUMPLE; inventario-insumos-postgres.test.ts |
| CU66 | Mismo grupo CU63–CU66 | CUMPLE; inventario-migracion-postgres.test.ts |

La issue agrupa CU38/CU39 y CU63–CU66 sin especificaciones individuales; la tabla
certifica los requisitos publicados del grupo sin inventar una correspondencia.
La [auditoría](.scratch/agrul-055/auditoria.md) enlaza implementación y pruebas.

RN-14 exige labor realizada; RN-15 bloquea cambiar unidades después de aplicaciones;
RN-16 conserva movimientos inmutables y su origen; RN-17 impide stock negativo;
RN-26 conserva relaciones e historia. El consumo usa vencimiento ascendente,
sin vencimiento al final, ingreso ascendente y UUID para desempatar. Se excluyen
partidas vencidas o incompatibles. DEVOLUCION reintegra sobrantes sin usar.

CU40 devuelve exactamente cada egreso a su partida, concilia saldo/bitácora,
reaplica el orden aprobado y registra actor, fecha, motivo y versiones. Cada
versión se sustituye una sola vez. Procedencia dudosa exige conciliación explícita.
Se revalidan sesión y fincas en consultas, escrituras y reintentos idempotentes.

## Evidence

- **Before:** el bootstrap no tenía estos repositorios canónicos persistentes.
  **After:** el servidor compilado autentica por HTTP y verifica ingreso,
  aplicación, corrección, saldo e historia en PostgreSQL real.
- **Before:** dos regresiones nuevas fallaron: INSERT tardío de items confirmados
  y ausencia de alerta al quedar solo partidas con otra unidad.
  **After:** 34 casos dirigidos aprobados; los dos arreglos fueron revisados
  independientemente por estándares y especificación.
- Regresión completa: **1404 aprobadas, 0 omitidas, 0 fallidas**, 131 archivos,
  375,79 segundos; lint y build aprobados después del último cambio productivo.
  [Revisión y evidencia](.scratch/agrul-055/revision-integracion.md).
- PostgreSQL 18.4 en agrul_test_agrul_055 con rol sin privilegios administrativos;
  fixtures aislados, triggers reales y cadena completa desde cero.

## Merge Danger

**Door:** one-way para datos de negocio ya registrados.

Migraciones incrementales 0018–0023: catálogo/partidas/aplicaciones, bitácora de
inventario, devoluciones positivas, consumo trazable, correcciones y congelamiento
de items confirmados. No eliminan tablas previas ni inventan datos históricos.
El código se puede revertir; deshacer eventos o compensaciones exige otra operación
auditada. No se propone una migración destructiva de rollback.

**Blast Radius:** inventario.

Depende de labores realizadas, usuarios/sesiones y asignaciones por finca existentes
de #48. Los endpoints persistentes son /insumos, /inventario y /aplicaciones-insumos;
las rutas heredadas /stock y /aplicaciones conservan su implementación anterior.
Las alertas cubren mínimo y vencimiento actual; no se agrega una ventana anticipada
sin definición. Los históricos sin procedencia requieren conciliación explícita.

Closes #49
