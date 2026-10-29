# AGRUL-054 — Corrección P2: actualizaciones concurrentes

Fecha: 2026-10-28. Issue #48. Rama `feat/agrul-054-actividades-monitoreos`. Base: `0897786`.

## Alcance y mecanismo

- Solo P2. S2 (precisión/rango de superficie prevista) y P3 (fixture antiguo RN-09) siguen pendientes.
- Las lecturas Drizzle de programaciones capturan `xmin::text` como versión opaca de la fila. La entidad conserva ese token al producir una reprogramación o cancelación; no lo incluye en `toJSON` ni acepta una versión del cliente.
- El UPDATE exige ID, estado PENDIENTE y coincidencia con la versión leída. Una escritura confirmada desde otra transacción invalida la lectura, incluso si fue SQL externo y no cambió `actualizado_en`.
- Si falta la versión de persistencia o el UPDATE no encuentra coincidencia, se lanza `ConflictoActividadProgramadaError`; el manejador central responde **409**, código `ACTIVIDAD_PROGRAMADA_DESACTUALIZADA`. No se reintenta automáticamente; corresponde releer antes de tomar otra decisión.
- Cancelar escribe únicamente estado, motivo y timestamp; reprogramar escribe fecha, responsable y timestamp. No se restauran tipo, superficie, descripción ni campos ajenos desde un snapshot anterior.
- Las transiciones que requieren una labor realizada conservan su repositorio transaccional. La actualización genérica no habilita pasar directamente a EJECUTADA.
- No se agregan migraciones, columnas o triggers. El token solo vive durante el ciclo interno de lectura/escritura de una solicitud; no se utiliza como identificador duradero ni como versión de edición enviada al cliente.
- Base técnica: PostgreSQL documenta [xmin como identidad de la transacción de cada versión de fila](https://www.postgresql.org/docs/18/ddl-system-columns.html). Los identificadores de transacción no deben asumirse únicos a largo plazo; por eso el token no se persiste ni se expone como contrato histórico.
- Se añade la regla preventiva de comparación de versiones y actualización por operación a `.cursor/skills/database-events.md`.

## Archivos

- `src/core/domain/entities/actividad-programada.entity.ts`: metadato de lectura y error de conflicto.
- `src/core/ports/actividades-programadas-repository.port.ts`: contrato de actualización con versión.
- `src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.ts`: captura de versión, comparación atómica y campos específicos por operación.
- `src/infrastructure/http/middlewares/error-handler.ts`: respuesta central 409.
- Pruebas nuevas: `tests/integration/actividades-concurrencia-postgres.test.ts`, `tests/unit/domain/actividad-programada-concurrencia.test.ts`.
- Ajustes en pruebas del repositorio y de programación existentes; skill e informe.

## Validación ejecutada

- `npm.cmd run lint`: aprobado después del último cambio de código/pruebas.
- `npm.cmd run build`: aprobado.
- Pruebas específicas: **15 aprobadas en 3 archivos**, incluidas **6 PostgreSQL**.
- Regresión final: **231 pruebas aprobadas en 21 archivos, 0 fallos, 0 omisiones**, incluidas **67 PostgreSQL**.
- Carreras reales con conexiones independientes: dos reprogramaciones sobre la misma lectura solo permiten una confirmación; cancelación obsoleta no restaura fecha/responsable; releer permite cancelar el estado vigente.
- Carreras HTTP deterministas desde el bootstrap real: una conexión mantiene bloqueada la fila hasta comprobar que ambas solicitudes llegaron al UPDATE. Al liberar, una responde 200 y otra 409. Se prueban reprogramación/reprogramación y cancelación/reprogramación, comparando el estado persistido con la respuesta ganadora.
- Se verifica que SQL externo cambia la versión aun sin cambiar timestamp; un UPDATE revertido por rollback conserva válida la versión del último estado confirmado.
- Se conserva P1: lectura histórica y cancelación de pendientes incompletos; y S1: autorización y alcance por finca. Pasan también regresiones de CU26–CU33, RN-09, roles, sesiones y usuarios.
- La primera ejecución específica tuvo dos fallas de aserción porque PostgreSQL y HTTP representaban el mismo instante con zona/formato diferentes. Se normalizan los instantes únicamente para compararlos en la prueba; no se modificó el comportamiento de timestamps de producción. Las ejecuciones posteriores pasaron.
- Solo se usa PostgreSQL 18 en `agrul_test_agrul_054`, como `agrul_test_user` sin privilegios administrativos. La suite verifica identidad, versión y permisos antes de escribir; sus ciclos son UUID aleatorios y elimina únicamente sus propias filas al finalizar. No se modifican otras bases ni PostgreSQL 17.
- No se ejecutó la suite integral ni la antigua RN-09 ligada a otra base; no se declaran aprobadas.

## Cierre

Se conservan fuera del commit la caché de Vitest y el informe preexistente de Etapa 1. Sin merge ni cierre de #48. Se detiene el trabajo después de publicar este bloque para revisar el cupo; no hay acceso al porcentaje real disponible.
