# AGRUL-054 — Etapa 3, bloque 3: monitoreos CU32/CU33

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`. Base: `617f81e`.

## Implementado

- POST `/api/v1/monitoreos`: ciclo, fecha de inspección, responsable, sector, etapa fenológica, estado general, tipo de observación, problema detectado, hallazgos y acción recomendada.
- GET de listado con filtros por ciclo, lote, responsable, etapa, estado, tipo y rango de fechas; paginación limitada a 100 y orden estable descendente por fecha e ID. GET de detalle por UUID.
- Dominio con campos obligatorios normalizados, longitudes SQL, fecha real/no futura en la zona local y comprendida en el ciclo. Alta con ciclo ACTIVO y responsable activo. Lote derivado de la plantación vinculada al ciclo.
- Repositorio Drizzle transaccional con bloqueos compartidos de ciclo/plantación y responsable mientras valida y registra. Las consultas históricas no exigen que el ciclo permanezca activo.
- Migración 0017: tabla canónica `monitoreos`, FKs restrictivas, índices por ciclo/lote y fecha y CHECK de campos obligatorios. Integrada al journal y bootstrap productivo.
- Se conserva el monitoreo legado en memoria (`observaciones_monitoreo`), que no tiene migración canónica ni contiene el contrato completo de etapa fenológica y recomendaciones solicitado por #48.
- Autenticación persistida y roles ADMINISTRADOR/ENCARGADO_CAMPO; se exige cambio de contraseña inicial. Contratos HTTP estrictos, UUID y fechas validados, rangos invertidos rechazados.
- RN-13: la recomendación es texto opcional; no existen dependencias de escritura hacia actividades, aplicaciones o inventario en este flujo.

## Validación

- `npm.cmd run lint`: aprobado después de corregir el tipado del matcher de una prueba de errores de dominio.
- `npm.cmd run build`: aprobado.
- Validación final: **151 pruebas aprobadas en 12 archivos, sin omisiones**.
- PostgreSQL: 13 pruebas de monitoreos, 20 de labores realizadas y 11 de programación: **44 aprobadas**.
- Dominio: 15 pruebas nuevas de monitoreo y regresiones de actividades, RN-09 y monitoreo legado.
- RN-13 comprobada desde el bootstrap real: al guardar una recomendación no cambian las cantidades de programaciones, labores realizadas ni eventos de trazabilidad; los adaptadores vigentes de aplicaciones y actividades legadas no reciben escrituras. Un monitoreo no crea pendientes que bloqueen RN-09.
- También se verifican campos completos/opcionales, persistencia y detalle, filtros y paginación, referencias inexistentes, responsable inactivo, ciclo finalizado, consulta histórica, fechas inválidas/futuras, texto vacío, parámetros inesperados y permisos. El CHECK PostgreSQL rechaza hallazgos vacíos preservando el registro.
- Migraciones y pruebas solo en PostgreSQL 18, `agrul_test_agrul_054`, como `agrul_test_user` sin privilegios administrativos. Las suites verifican conexión, identidad, versión y permisos antes de migrar o escribir.
- No se accedió a otras bases ni PostgreSQL 17; no se leyeron ni imprimieron archivos de credenciales.

## Pendiente

Queda el bloque de revisión y validación final del conjunto de #48. No se ejecutó la suite integral, ni las suites PostgreSQL antiguas fijadas a otras bases; las omisiones no se declaran aprobadas. CU22–CU25 conserva los resultados de Etapa 1 y requiere consideración explícita en el cierre global.
No se realiza merge ni cierre de la issue. Caché local de Vitest e informe preexistente de Etapa 1 conservados fuera del commit. Sin acceso al porcentaje real del cupo, el trabajo se detiene al completar este bloque.
