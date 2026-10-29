# AGRUL-054 — Etapa 3, bloque 2: registro directo y consulta

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`. Base: `674a3d5`.

## Implementado

- El POST existente `/api/v1/actividades-realizadas` admite registro directo con `origen: NO_PROGRAMADA`, ciclo, tipo, responsable, fecha y superficie. La ejecución desde programación mantiene su contrato anterior.
- El registro directo guarda `actividad_programada_id = NULL`; el origen de la respuesta se deriva del vínculo, sin duplicar datos ni crear otra tabla. No crea ni modifica programaciones.
- Dominio compartido para fecha de calendario/no futura en la zona local, límites temporales del ciclo, ciclo ACTIVO, responsable activo y precisión/rango de superficie y duración. El registro directo exige además tipo de actividad activo.
- Repositorio transaccional Drizzle con bloqueos compartidos de ciclo/plantación, responsable y tipo mientras valida y registra la labor. Un cierre concurrente que se confirma antes de la lectura provoca rechazo de la labor.
- GET de listado y detalle por UUID. Filtros por ciclo, lote, tipo, responsable, origen y rango de fechas; paginación limitada a 100, orden descendente por fecha e ID. Validación estricta de consultas, fechas y orden del rango.
- Lectura histórica sin revalidar el estado vigente del ciclo, tipo o responsable; resultados numéricos consistentes entre alta y consulta.
- Rutas integradas al bootstrap existente y protegidas con roles ADMINISTRADOR/ENCARGADO_CAMPO, sesión persistida y cambio de contraseña inicial.
- No hubo nueva migración: se reutiliza el vínculo nullable de la tabla canónica creada en el bloque anterior.

## Validación ejecutada

- `npm.cmd run lint`: aprobado después del último cambio.
- `npm.cmd run build`: aprobado con el código final de producción; luego solo se añadió una prueba de concurrencia, también validada por lint.
- Ejecución de regresión: **105 pruebas aprobadas, 8 archivos**, sin omisiones. Incluye 19 PostgreSQL de labores realizadas, 11 PostgreSQL de CU26–CU29 y regresiones de dominio/RN-09.
- Ejecución final específica tras añadir la carrera con el cierre de ciclo: **50 pruebas aprobadas, 2 archivos**, sin omisiones: 20 PostgreSQL de labores realizadas y 30 de dominio.
- Comprobados: registro directo sin efectos sobre programaciones; ambos orígenes; detalle; filtros y paginación; referencias inexistentes; tipo inactivo; ciclo no activo; lectura histórica; parámetros inválidos; permisos; doble ejecución programada; rollback; espera y rechazo ante cierre concurrente.
- Solo PostgreSQL 18 en `agrul_test_agrul_054`, rol `agrul_test_user` sin privilegios administrativos. Las suites verifican URL, base, versión y permisos antes de migrar o escribir.
- No se ejecutó la suite integral ni se accedió a otras bases o PostgreSQL 17. No se leyeron ni imprimieron archivos de credenciales.

## Pendiente

Monitoreos y recomendaciones CU32/CU33, más la validación final del conjunto de #48. No se implementan en este bloque ni se generan aplicaciones de insumos. No hay merge ni cierre de la issue.
La caché versionada local de Vitest y el informe preexistente de Etapa 1 se conservan fuera del commit. Sin acceso al porcentaje real del cupo, se detiene el trabajo al completar este bloque.
