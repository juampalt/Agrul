# AGRUL-053 / Issue #47 — Etapa 4: CU62 y auditoría persistente

Fecha: 2026-10-28. Base de etapa: `d97ad53`.
Rama: `feat/agrul-053-usuarios-seguridad`.

## Implementado

- `ModificarUsuarioUseCase` implementa `confirmarModificacionUsuario`: nombre, apellido, nombre de usuario, correo, perfil canónico, estado y asignaciones. Conserva el perfil histórico si no se cambia explícitamente.
- `PUT /api/v1/usuarios/:id`, bloqueo y desbloqueo exigen `ADMIN_SISTEMA`. El responsable se consulta nuevamente dentro de la transacción: cuenta activa, rol vigente y cambio inicial de contraseña cumplido. Las restricciones se aplican en el backend y en el caso de uso, además de la interfaz.
- Se valida el contrato estricto, se normalizan nombres de usuario/correos/UUID, se rechazan duplicados y campos de credenciales inyectados. El cambio se prepara sobre una entidad separada para no alterar el objeto original antes de validar.
- `UsuariosTransaccionPort` y su implementación Drizzle bloquean las filas del responsable y del usuario afectado en orden estable. Todos los repositorios de la operación usan la transacción recibida.
- CU60 también utiliza esta unidad de trabajo en producción: alta, asignaciones y auditoría se confirman o revierten juntas.
- El bootstrap usa repositorios PostgreSQL para usuarios, asignaciones y auditoría; se eliminaron los fallbacks en memoria de los dos últimos puertos en producción. Las asignaciones se desactivan conservando el vínculo y pueden reactivarse sin duplicarse.
- Migración `0012_auditoria_usuarios_persistente`: materializa `usuario_finca_asignacion` y `auditoria_seguridad_log`, crea `registro_modificaciones` y agrega protección nativa contra `UPDATE`, `DELETE` y `TRUNCATE` de ambas tablas de historial.
- Cada delta guarda campo, valor anterior, valor nuevo, fecha/hora y responsable. `usuario_afectado_id` identifica por separado la cuenta modificada. La FK del responsable usa `RESTRICT` para conservar su identidad sin alterar el historial.
- La bitácora y sus deltas se escriben juntos. Los snapshots excluyen contraseñas, hashes y salt; no se generan deltas ni eventos de modificación ficticios para operaciones sin diferencias de contenido.
- La consulta de auditoría incorpora `ADMIN_SISTEMA`, conserva el acceso anterior de `ADMINISTRADOR` y revalida cuenta/perfil/contraseña inicial contra el repositorio. Se validan UUID y filtros antes de acceder a PostgreSQL; las respuestas de consulta incluyen `Cache-Control: no-store`.
- La interfaz incluye edición de datos, rol y estado, y habilita modificación/bloqueo/desbloqueo para el Administrador del Sistema. Si cambia su propio rol o desactiva su cuenta, descarta la sesión local y solicita volver a ingresar.
- Se actualizaron las skills de Arquitectura y API para prevenir la repetición de fallbacks de seguridad en memoria y parámetros UUID sin validar.

## Verificación

- `npm.cmd run lint`, `npm.cmd run build`, `node --check public/app.js` y `git diff --check`: aprobados.
- **54 pruebas nuevas de CU62 aprobadas:** 45 con HTTP/PostgreSQL reales y 9 unitarias.
- Migraciones `0000`–`0012` aplicadas desde una base PostgreSQL 17 vacía y descartable.
- Comprobados valores previos/nuevos, identidad del responsable, fecha, persistencia entre instancias, asignaciones sin duplicación, ausencia de credenciales en las respuestas y el historial.
- Una falla deliberada al insertar un delta revierte usuario, asignaciones, bitácora y deltas. Una finca inexistente revierte el alta CU60 y su auditoría.
- Verificados seis intentos directos de mutación SQL del historial, con triggers activos: UPDATE, DELETE y TRUNCATE sobre cada tabla.
- Modificaciones concurrentes al mismo usuario conservan la secuencia real de valores y el estado final, sin perder cambios.
- Verificados rechazos por rol, estado del responsable, cambio inicial pendiente, JWT previo a una revocación, campos desconocidos, UUID inválidos y duplicados.
- Regresión completa con las once variables PostgreSQL habilitadas y `npm.cmd test -- --maxWorkers=2`: **966 aprobadas / 4 fallidas / 970 totales**, sin omisiones.
- Los cuatro fallos son los ya reproducidos en `origin/main`: pruebas anteriores esperan SQLSTATE `23001` y PostgreSQL 17 devuelve `23503` al impedir borrados con referencias. Sus aserciones siguen intactas. No se declara aprobada la regresión completa.
- La interfaz fue comprobada sintácticamente y revisada; no se ejecutaron pruebas en navegador.

Para repetir CU62: definir `MODIFICACION_TEST_DATABASE_URL` apuntando exclusivamente a una base descartable llamada `agrul_test_agrul_053_etapa4` y ejecutar `npm.cmd test -- tests/integration/modificacion-cu62-postgres.test.ts`.

La limpieza de fixtures verifica nombres explícitos de bases descartables de AGRUL-053. Desactiva y restablece los triggers de historial dentro de una transacción exclusivamente para vaciar fixtures; la aplicación no utiliza ese helper ni incorpora una excepción a los triggers. Las pruebas de inmutabilidad se ejecutan con las protecciones activas. Las pruebas en memoria verifican reglas, no certifican atomicidad; esta se comprueba con el bootstrap PostgreSQL real.

## Pendientes para cerrar #47

- Revisión final de RN-29 sobre las rutas restantes y los mecanismos de sesión: los guards heredados de otras rutas todavía leen permisos del JWT y no todos revalidan estado/perfil persistidos. CU60, CU61 y CU62 sí lo hacen.
- La utilidad heredada `POST /api/v1/auditoria/simular-inactividad` conserva acceso público y permite ajustar el timeout de sesión. Debe retirarse o protegerse antes de integrar la issue; esta etapa no certifica ese endpoint.
- Revisar el flujo completo de credenciales, cierre/revocación de sesión y compatibilidad con rutas operativas, y validar transporte HTTPS en el despliegue.
- Resolver o validar los cuatro fallos de regresión y obtener todos los controles críticos en verde antes del merge.
- La provisión inicial del Administrador del Sistema sigue siendo una operación administrativa controlada: no se crearon cuentas productivas ni contraseñas predeterminadas.
- Issue abierta; sin PR ni merge. Detenerse después del commit y push y esperar autorización para la revisión final. El porcentaje real del cupo de Codex no está disponible en esta sesión.
