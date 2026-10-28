# AGRUL-054 / Issue #48 — Etapa 2: CU26–CU29

Fecha: 2026-10-28. Rama: `feat/agrul-054-actividades-monitoreos`.
Base conservada: `403045f` (Etapa 1 de Gemini).

## Alcance cerrado

- Programación, consulta con filtros, reprogramación de fecha/responsable y cancelación con motivo.
- Dominio y contratos HTTP con validación de fechas existentes y superficies positivas finitas; superficie opcional normalizada a null.
- Reutilización de `actividades_programadas` mediante migración 0015; se preserva el guard RN-09.
- Repositorio Drizzle y rutas conectados al bootstrap real, con roles y sesiones persistidas.
- UPDATE condicionado al estado persistido PENDIENTE: no permite sobrescribir una cancelación o ejecución confirmada después de la lectura.
- CHECK de motivo con NOT VALID: conserva históricos sin inventar motivos y exige cumplimiento en nuevas escrituras. La validación completa del histórico requiere una auditoría posterior; NOT VALID no exime actualizaciones de filas históricas.

## Validación ejecutada y conservada

No se repitieron pruebas para el cierre documental y Git.

- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: aprobado.
- Ejecución final específica: **56 pruebas aprobadas, 6 archivos, sin omisiones**.
  - `tests/integration/actividades-programadas-postgres.test.ts`: 11 aprobadas.
  - `tests/unit/application/actividades-programadas.use-cases.test.ts`: 13 aprobadas.
  - `tests/unit/application/verificar-cierre-ciclo.test.ts`: 3 aprobadas.
  - `tests/unit/domain/actividad-programada.test.ts`: 24 aprobadas.
  - `tests/unit/infrastructure/actividades-programadas-repository.test.ts`: 4 aprobadas.
  - `tests/unit/infrastructure/actividades-programadas-migration.test.ts`: 1 aprobada.
- Una ejecución unitaria anterior: 546 aprobadas, 73 archivos; no equivale a una regresión integral de integración.
- PostgreSQL 18.4 en `127.0.0.1:5432`, exclusivamente `agrul_test_agrul_054`, rol `agrul_test_user` sin SUPERUSER, CREATEDB, CREATEROLE, REPLICATION ni BYPASSRLS.
- Migraciones ejecutadas sobre la base descartable inicialmente vacía. Pruebas con bootstrap real y autenticación persistida; RN-09 y escritura obsoleta tras cancelación desde otra conexión verificados.
- Compatibilidad histórica probada aplicando el SQL real de 0015 sobre un esquema aislado dentro de una transacción revertida en la misma base descartable.
- La primera ejecución PostgreSQL falló en la preparación por un perfil inválido del fixture; se corrigió a OPERARIO y las ejecuciones posteriores pasaron.
- No se ejecutó la suite integral ni la suite RN-09 antigua, que está fijada a otra base no autorizada. RN-09 se cubrió en la nueva suite y sus pruebas unitarias.

## Seguridad y límites

No se incluyen archivos de entorno, pgpass, contraseñas PostgreSQL, tokens ni artefactos privados. La autenticación PostgreSQL usa el mecanismo local ya configurado. No se modificaron otras bases ni PostgreSQL 17.
Se excluyen del commit la caché local versionada de Vitest y el informe preexistente de Etapa 1; ambos se conservan localmente.
No se implementan CU30–CU33, no se realiza merge y no se cierra la issue #48.

## Próximos bloques propuestos, sin implementación

Fuente verificada: [Issue #48](https://github.com/juampalt/Agrul/issues/48), complementada por `SPEC.md` (RN-10, RN-11, RN-13 y RN-14).
La issue agrupa CU30/CU31 y CU32/CU33; no desglosa criterios individuales para cada número.

1. **CU30/CU31, ejecución desde programada:** revisar estructuras existentes antes de ampliarlas; registrar la labor y pasar PENDIENTE a EJECUTADA en una sola transacción, validando ciclo activo, lote, responsable, fecha no futura y comprendida en el ciclo. Probar rechazo de canceladas/ejecutadas, concurrencia y rollback.
2. **CU30/CU31, registro directo y consulta:** admitir origen NO_PROGRAMADA con referencia programada nula, reutilizar las validaciones del bloque anterior y verificar persistencia/consulta mediante `/api/v1/actividades-realizadas`. Respetar la vinculación futura de insumos a labores realizadas sin ampliar AGRUL-055.
3. **CU32/CU33, monitoreos y consulta:** persistir y exponer inspecciones con etapa fenológica, estado del cultivo, hallazgos, responsable y recomendación mediante `/api/v1/monitoreos`. Probar que una recomendación no crea aplicaciones ni actividades automáticamente.
4. **Validación y cierre de esas etapas:** integrar repositorios en bootstrap real, verificar permisos vigentes, RN-09/RN-10/RN-11/RN-13, fechas y regresiones relacionadas; ejecutar PostgreSQL descartable, lint y build. La aceptación global de tests de la issue queda pendiente hasta completar todos sus casos.

Cada bloque requiere autorización de continuación para controlar el cupo. No hay acceso al porcentaje real disponible.
