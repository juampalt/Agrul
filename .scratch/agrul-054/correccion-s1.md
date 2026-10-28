# AGRUL-054 — Corrección S1: autorización por finca

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`. Base auditada: `fb832fd`.

## Alcance

Solo S1: autorización de actividades programadas, labores realizadas y monitoreos. No se corrigen P1, P2, S2 ni P3; no se modifica ninguna migración ni la lógica de concurrencia de las actualizaciones.

## Corrección

- Puerto y adaptador de lectura para resolver la finca persistida del ciclo o recurso, sin reconstruir entidades históricas ni confiar en identificadores de finca enviados por el cliente.
- Caso de uso de autorización: recursos ajenos o sin finca se deniegan a usuarios restringidos; solo ADMINISTRADOR conserva alcance global, conforme al control de fincas existente. Falta de identidad no habilita acceso.
- Las tres familias de rutas comprueban la finca antes de altas, detalles, reprogramaciones, cancelaciones y ejecuciones. La identidad proviene de la sesión revalidada por el backend, incluidas sus asignaciones vigentes.
- Los listados aplican el alcance en SQL mediante subconsultas de lotes/ciclos antes de ordenar, paginar y reconstruir entidades. Sin asignaciones el resultado es vacío. Los filtros HTTP no admiten `fincaIds` del cliente.
- Las rutas no se habilitan sin el adaptador de autorización. El bootstrap inyecta el adaptador PostgreSQL real.
- Los filtros de repositorio sin alcance se reservan para uso interno o administrativo; las rutas siempre derivan explícitamente el alcance de la identidad.
- Los fixtures existentes reciben su asignación de finca de forma explícita, sin conceder permisos implícitos desde el helper de autenticación.
- Se registra la regla preventiva en `.cursor/skills/api-contracts.md` según la regla de auto-mejora de AGENTS.md.

## Archivos

- Nuevos: `src/core/ports/acceso-recursos-agricolas.port.ts`, `src/application/use-cases/autorizar-recurso-agricola.use-case.ts`, `src/infrastructure/database/repositories/drizzle-acceso-recursos-agricolas.repository.ts`, `src/infrastructure/database/alcance-fincas-agricolas.ts`.
- Ampliados: puertos de filtros y repositorios Drizzle de programaciones, labores y monitoreos; sus tres archivos de rutas; `src/infrastructure/http/app.ts` y `src/bootstrap.ts`.
- Pruebas nuevas: `tests/unit/application/autorizar-recurso-agricola.test.ts`, `tests/integration/agrul054-autorizacion-fincas-postgres.test.ts`.
- Fixtures ajustados en las tres suites PostgreSQL existentes del módulo; skill de contratos y este informe.

## Verificación

- `npm.cmd run lint`: aprobado tras corregir el tipo del payload del helper de prueba.
- `npm.cmd run build`: aprobado.
- Suite final relacionada: **200 pruebas aprobadas, 17 archivos, 0 fallos, 0 omisiones**.
- S1 específico: **17 pruebas** (9 unitarias y 8 PostgreSQL). Se comprueban dos fincas y cuatro actores, acceso propio/cruzado, altas y modificaciones permitidas/denegadas, conservación de datos tras intentos ajenos, listados filtrados antes de paginar, ausencia de asignaciones, revocación con el mismo token, acceso administrativo y rechazo de alcance inyectado por el cliente.
- PostgreSQL total: **52 pruebas** (8 S1, 11 programación, 20 labores y 13 monitoreos). Todas verifican base, versión y rol antes de escribir; solo `agrul_test_agrul_054` en PostgreSQL 18, como `agrul_test_user` sin privilegios administrativos. No hay nuevas migraciones.
- También pasan regresiones de autenticación/RBAC, sesión/auditoría, consulta de usuarios, dominio, RN-09, RN-13 y monitoreo legado. No se ejecutó la suite integral ni la antigua RN-09 ligada a otra base.
- La suite S1 crea fincas y recursos con UUID aleatorios y elimina únicamente esos recursos al finalizar. Conserva los registros de seguridad de sus usuarios sintéticos. No modifica bases ajenas ni PostgreSQL 17.
- Se conservan la caché local de Vitest y el informe previo de Etapa 1 fuera del commit. Sin merge ni cierre de la issue.

## Pendiente

P1: reconstrucción histórica; P2: actualizaciones perdidas; S2: precisión y rango de superficie prevista; P3: fixture RN-09 antiguo. Requieren autorización posterior. El trabajo se detiene tras publicar este bloque para revisión del cupo; no hay acceso al porcentaje real disponible.
