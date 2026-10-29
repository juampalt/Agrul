## Summary

Implementa el catálogo de tipos de actividad, la programación y ejecución de labores y los monitoreos agrícolas de CU22–CU33 (AGRUL-054, refs #48).

```text
Sesión vigente + permisos por finca
  → catálogo de tipos de actividad
  → programación → reprogramación / cancelación con motivo
                → ejecución transaccional → labor realizada
  → labor directa NO_PROGRAMADA
  → monitoreo con hallazgos y recomendaciones desacopladas
```

Reutiliza actividades_programadas, integra los repositorios Drizzle en el bootstrap real y conserva RN-09. Corrige los cinco hallazgos de auditoría: autorización por finca (S1), históricos incompletos (P1), actualizaciones concurrentes (P2), precisión y rango de superficie (S2) y fixtures RN-09 (P3).

## Evidence

- **Before:** la auditoría sobre fb832fd identificó acceso cruzado entre fincas, reconstrucción incompatible con nulos históricos, actualizaciones perdidas, superficie susceptible de redondeo/desbordamiento y fixtures RN-09 incompatibles.
  **After:** cada hallazgo tiene corrección y pruebas específicas; la revisión estática posterior no encontró bloqueantes nuevos dentro de ese alcance.
- RN-10 y RN-11: 20 pruebas PostgreSQL de ejecución y labores directas desde el bootstrap; cubren ciclo activo, lote, responsable, fechas, concurrencia y rollback.
- RN-12 y RN-09: pruebas de programación/cancelación, consulta histórica sin inventar motivos y rechazo de cancelaciones nuevas sin motivo.
- RN-13: 13 pruebas PostgreSQL de monitoreos, incluido desacoplamiento de recomendaciones.
- Bloque S2: 275 pruebas aprobadas en 22 archivos, incluidas 81 PostgreSQL; lint y build aprobados.
- Bloque P3 posterior: 99 pruebas aprobadas en ocho archivos, incluidas 96 PostgreSQL; lint y build aprobados después del último cambio de código. Estos totales se superponen y no deben sumarse.
- PostgreSQL se ejecutó exclusivamente sobre agrul_test_agrul_054, en PostgreSQL 18, con agrul_test_user sin privilegios administrativos.
- Detalle y límites: informes .scratch/agrul-054/correccion-{s1,p1,p2,s2,p3}.md y cierre-validacion.md.

Ejecución global posterior sobre ec552d8: **982 pruebas aprobadas, 244 omitidas, 0 fallos**, en 114 archivos (103 aprobados y 11 omitidos completamente). Se habilitó PostgreSQL solo para siete suites autorizadas; las suites que exigen bases antiguas quedaron omitidas. El detalle exacto figura en `.scratch/agrul-054/validacion-global.md`.

Consolidación posterior del catálogo: CU22–CU25 usa la misma base autorizada mediante ACTIVIDADES_TEST_DATABASE_URL; la limpieza solo elimina fixtures propios. Pasaron **109 pruebas en nueve archivos, sin omisiones**, incluidas ocho PostgreSQL de catálogo (las siete anteriores y una nueva de conservación de datos), las demás suites PostgreSQL del módulo y cinco unitarias del catálogo. Lint y build aprobados. Detalle: `.scratch/agrul-054/consolidacion-base-pruebas.md`. No se borraron bases antiguas.

**Pendiente de aceptación:** el criterio de la issue «100% de tests unitarios y de integración pasando en verde» todavía no está acreditado. Las siete omisiones de catálogo ya tienen validación específica, pero siguen pendientes las otras 237 pruebas omitidas de otros módulos/inmutabilidad de la corrida global anterior. Este PR permanece en borrador. No se repitió toda la suite global ni se utilizaron bases ajenas a la autorizada.

## Merge Danger

**Door:** one-way para el esquema una vez que se acumulen datos nuevos; el código puede revertirse, pero eso no revierte las migraciones ni los hechos registrados.

**Blast Radius:** agrícola.

Incluye migraciones 0014–0017. La 0015 amplía la tabla existente y conserva cancelaciones históricas sin motivo mediante CHECK NOT VALID, exigiendo motivo en escrituras nuevas. No validar esa restricción sobre históricos sin una auditoría previa. Las migraciones solo se probaron en bases descartables; no se aplicaron a producción durante este trabajo.

No habilitar merge automático ni cerrar la issue #48 desde este PR. La suite global, revisión humana y autorización de merge quedan pendientes.
