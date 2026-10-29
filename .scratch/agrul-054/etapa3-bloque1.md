# AGRUL-054 — Etapa 3, bloque 1: ejecución desde programación

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`.
Base: cierre de Etapa 2 `d6845b4`.

## Implementado

- `POST /api/v1/actividades-realizadas`: ejecución de una programación PENDIENTE, con permisos ADMINISTRADOR/ENCARGADO_CAMPO, sesión vigente y contraseña inicial cambiada.
- Entidad y caso de uso para validar ciclo ACTIVO, responsable activo, fecha existente/no futura en la zona local del proyecto y comprendida entre inicio efectivo y fin efectivo o previsto del ciclo.
- Lote, ciclo y tipo derivados de la programación y plantación persistidas; no se admiten identificadores de lote/ciclo/tipo independientes en el cuerpo.
- Superficie y duración positivas, finitas, con dos decimales y dentro del rango SQL; no se redondean silenciosamente.
- Repositorio Drizzle con una sola transacción: bloqueo de tabla compatible con RN-09 antes de filas, lectura bloqueada de programación/ciclo/responsable, INSERT de labor y transición a EJECUTADA.
- Migración 0016 y esquema canónico `actividades_realizadas`, con FKs restrictivas e índice único para impedir dos ejecuciones de una misma programación.
- Integración en bootstrap real. La tabla antigua `actividades_agricolas` está declarada en el esquema legado y usa otro catálogo; no tiene migración versionada ni adaptador persistente del flujo previo. Se preserva ese flujo y se incorpora la tabla canónica solicitada por #48, sin crear otra tabla de programaciones.

## Validación

- `npm.cmd run lint`: aprobado al finalizar los cambios.
- `npm.cmd run build`: aprobado al finalizar los cambios.
- Ejecución conjunta inicial: **91 pruebas aprobadas en 8 archivos**, incluyendo 13 PostgreSQL de CU30, 22 de dominio de ejecución y las 56 regresiones específicas de Etapa 2/RN-09.
- Tras reforzar el rechazo de superficies inferiores a la precisión SQL, validación final específica: **36 pruebas aprobadas en 2 archivos**, 13 PostgreSQL y 23 de dominio, sin omisiones.
- Verificados: persistencia y transición conjunta, RN-09, doble ejecución simultánea, rechazo de canceladas, ciclos no activos, responsables inválidos, fechas fuera del ciclo/futuras, controles HTTP y roles.
- Rollback comprobado con una restricción temporal de prueba que falla después del INSERT, al intentar la transición; no queda labor persistida y la programación sigue PENDIENTE. La restricción se elimina al finalizar el caso.
- Hubo tres fallas iniciales de fixtures: dos por inferencia SQL del parámetro de estado, corregidas con cast explícito, y una por usar una sesión revocada al desactivar su usuario. Se reautentica al usuario para comprobar el rechazo por rol con una sesión vigente. Las ejecuciones posteriores pasaron.
- Migraciones y pruebas únicamente sobre PostgreSQL 18, `agrul_test_agrul_054`, con `agrul_test_user` sin privilegios administrativos. Se verifican identidad, versión y permisos antes de migrar.
- No se ejecutó la suite integral ni otras bases. Se conservan caché local de Vitest e informe previo de Etapa 1 fuera del commit.

## Pendiente y límite del bloque

No se implementan todavía registro directo NO_PROGRAMADA, consultas de labores realizadas, monitoreos ni recomendaciones (siguientes bloques de CU30–CU33). El vínculo nullable de la tabla permite el registro directo futuro, pero el endpoint actual exige programación.
No se realiza merge ni se cierra #48. Sin acceso al porcentaje real del cupo, se detiene el trabajo al finalizar este bloque.
