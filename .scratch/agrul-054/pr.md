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

**Pendiente de aceptación:** no se ejecutó la suite global completa. El criterio de la issue «100% de tests unitarios y de integración pasando en verde» todavía no está acreditado. Este PR permanece en borrador hasta completar esa validación con aislamiento seguro de PostgreSQL. No se repitieron suites sin cambios posteriores.

## Merge Danger

**Door:** one-way para el esquema una vez que se acumulen datos nuevos; el código puede revertirse, pero eso no revierte las migraciones ni los hechos registrados.

**Blast Radius:** agrícola.

Incluye migraciones 0014–0017. La 0015 amplía la tabla existente y conserva cancelaciones históricas sin motivo mediante CHECK NOT VALID, exigiendo motivo en escrituras nuevas. No validar esa restricción sobre históricos sin una auditoría previa. Las migraciones solo se probaron en bases descartables; no se aplicaron a producción durante este trabajo.

No habilitar merge automático ni cerrar la issue #48 desde este PR. La suite global, revisión humana y autorización de merge quedan pendientes.
