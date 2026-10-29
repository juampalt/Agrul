## Summary

Implementa CU22–CU33 de AGRUL-054 (refs #48): catálogo de tipos de actividad, programación y gestión de labores, ejecución desde una programación o registro directo y monitoreos técnicos.

```text
Sesión vigente + permisos por finca
  → programación → reprogramación / cancelación con motivo
                → ejecución transaccional → labor realizada
  → labor directa NO_PROGRAMADA
  → monitoreo con hallazgos y recomendaciones desacopladas
```

Reutiliza actividades_programadas e integra los repositorios Drizzle y rutas Fastify en el bootstrap real. Conserva RN-09 a RN-13. Corrige los hallazgos S1/P1/P2/S2/P3: autorización por finca, lectura histórica con nulos, concurrencia mediante versión leída, superficie sin redondeos silenciosos y compatibilidad de fixtures RN-09.

Las regresiones PostgreSQL antiguas se adaptan a una sola base autorizada. Las suites que necesitan tablas vacías usan esquemas temporales con el DDL real, sus FK y triggers, sin fallback a public. Los fixtures de seguridad recrean su esquema por caso; se elimina el helper que deshabilitaba los triggers de auditoría.

## Evidence

- **Before:** la corrida global inicial tenía 982 pruebas aprobadas y 244 omitidas por bases antiguas; la auditoría identificó cinco hallazgos bloqueantes.
  **After:** los cinco hallazgos están corregidos y la suite global completa da **1232 pruebas aprobadas en 115 archivos, 0 fallos, 0 omisiones y 0 pendientes**. Los seis casos adicionales cubren límites de aislamiento y conservación de datos.
- **342 pruebas PostgreSQL reales** y 890 unitarias/estáticas o integraciones en memoria. Incluye todas las suites de actividades, RN-09, territorio, cultivos, variedades, plantaciones, ciclos, usuarios, sesiones y auditoría. RN-10 a RN-13 tienen cobertura específica desde el bootstrap.
- Últimas tres suites adaptadas: **88 pruebas aprobadas** antes de la corrida global.
- `npm.cmd run lint` y `npm.cmd run build`: aprobados tras el último cambio de código.
- Solo PostgreSQL 18 en 127.0.0.1:5432, base agrul_test_agrul_054 y rol agrul_test_user sin privilegios administrativos. Verificación final: **0 esquemas temporales remanentes**. Los datos compartidos se comprueban antes y después de los casos aislados.
- Resultado y comando reproducible en `.scratch/agrul-054/validacion-final.md`; contraste de criterios en `cierre-validacion.md`. Los informes anteriores conservan los resultados históricos de cada bloque y sus omisiones ya resueltas.

## Merge Danger

**Door:** one-way para el esquema una vez acumulados datos nuevos; revertir código no revierte migraciones ni hechos registrados.

**Blast Radius:** agrícola.

Incluye migraciones 0014–0017. La 0015 amplía la tabla existente y conserva cancelaciones históricas sin motivo mediante CHECK NOT VALID, exigiendo motivo en escrituras nuevas. No validar esa restricción sobre históricos sin auditoría previa.

La validación se realizó en Windows con PostgreSQL 18 y su pg_dump instalado. No se aplicaron cambios a producción ni se eliminaron bases antiguas. El informe JSON de Vitest queda local, fuera de Git. No se incluyen credenciales ni archivos privados.

Listo para revisión humana. Sin merge automático ni cierre de la issue #48; el merge requiere la autorización pendiente del usuario.
