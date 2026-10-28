# AGRUL-054 — Corrección P1: recuperación de programaciones históricas

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`. Base: `ffcfd01`.

## Alcance y comportamiento

- Solo P1. Se mantienen sin corregir P2 (actualizaciones perdidas), S2 (precisión/rango de superficie prevista) y P3 (fixture antiguo RN-09).
- `ActividadProgramadaProps` representa los campos nullable de la migración 0015 como `string | null`, sin afirmaciones de no nulidad en el repositorio.
- `programar` conserva las validaciones de tipo, responsable, fecha y superficie ya existentes para altas. `reconstituir` exige identidad, ciclo y estado válido; no aplica requisitos posteriores a los datos históricos ni normaliza sus textos.
- Los GET de detalle y listado devuelven los valores desconocidos como null. Una cancelada histórica sin motivo sigue siendo consultable, sin inventar una justificación.
- Cada operación valida los datos que cambia: reprogramar exige fecha válida y responsable no vacío cuando se indica; cancelar exige un motivo nuevo y estado PENDIENTE. Un pendiente antiguo puede cancelarse conservando tipo/fecha/responsable desconocidos y liberando RN-09.
- El adaptador de ejecución deja de sustituir nulos por cadenas vacías. Una programación sin tipo continúa sin poder ejecutarse: error de negocio 422 sin inserción ni transición.
- No hay migraciones nuevas, cambios de CHECK ni rellenos de datos existentes. Se añade la regla de reconstrucción histórica a `.cursor/skills/database-events.md` por la regla de auto-mejora.

## Archivos

- `src/core/domain/entities/actividad-programada.entity.ts`.
- `src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.ts`.
- `src/infrastructure/database/repositories/drizzle-actividades-realizadas.repository.ts`.
- Nuevas pruebas `tests/unit/domain/actividad-programada-historica.test.ts` y `tests/integration/actividades-historicas-postgres.test.ts`.
- Skill de base de datos y este informe.

## Validación ejecutada

- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: aprobado.
- P1 específico: **20 pruebas aprobadas** (11 unitarias y 9 PostgreSQL).
- Ejecución final con regresiones: **220 pruebas aprobadas en 19 archivos, 0 fallos, 0 omisiones**. Incluye **61 PostgreSQL**, regresiones S1, CU26–CU33, RN-09, RBAC, sesiones y consulta de usuarios.
- La nueva suite crea un esquema aleatorio dentro de `agrul_test_agrul_054`, ejecuta el SQL real de 0007, agrega FK/trigger de ciclo y carga filas anteriores a 0015. Aplica el SQL real de 0015 y arranca el bootstrap con ese search_path en la misma base.
- Se comprueban históricos PENDIENTE/EJECUTADA/CANCELADA, sus nulos, conservación exacta de filas durante lecturas, listado mixto con datos nuevos, paginación y filtros; cancelación justificada y RN-09; reprogramación explícita; rechazo de ejecución sin tipo, altas incompletas y nuevas cancelaciones sin motivo; aislamiento S1.
- El bootstrap usa sesiones persistidas. Se verifica que el search_path es el esquema generado y que la base sigue siendo la autorizada antes de probar endpoints.
- El esquema aislado y los ciclos de prueba se eliminan al finalizar; no se quitan restricciones públicas. Se comprueba que las programaciones públicas existentes conservan su cantidad. Usuarios y sesiones sintéticos quedan como evidencia de seguridad, conforme a los demás fixtures.
- Solo PostgreSQL 18 en `agrul_test_agrul_054`, rol `agrul_test_user` sin privilegios administrativos. No se accede a otras bases ni PostgreSQL 17, ni se leen o imprimen archivos de contraseñas.
- No se ejecutó la suite integral ni la antigua RN-09 ligada a otra base; no se declaran aprobadas.

## Cierre del bloque

Se preservan fuera del commit la caché local de Vitest y el informe preexistente de Etapa 1. Sin merge ni cierre de #48. El trabajo se detiene después de publicar P1 para revisión del cupo, cuyo porcentaje real no está disponible.
