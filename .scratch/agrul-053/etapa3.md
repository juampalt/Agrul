# AGRUL-053 / Issue #47 — Etapa 3: CU61

Fecha: 2026-10-28. Base de etapa: `a09ac40`.
Rama: `feat/agrul-053-usuarios-seguridad`.

La etapa de consulta y modificación se dividió para conservar el trabajo en unidades pequeñas y permitir la revisión manual del consumo. Esta etapa completa CU61; CU62 y la auditoría persistente quedan para la siguiente autorización.

## Implementado

- `ConsultarUsuariosUseCase` reutiliza los casos de consulta existentes y verifica al consultante persistido antes de devolver información.
- `GET /api/v1/usuarios` combina `perfil`, `estado` y `busqueda`. Los filtros aceptan perfiles canónicos e históricos; las consultas rechazan campos desconocidos y entradas inválidas. La búsqueda está limitada a 255 caracteres.
- La búsqueda por texto comprende nombre, apellido, nombre de usuario y correo, sin distinguir mayúsculas, con parámetros SQL y coincidencia literal. El resultado se ordena por apellido, nombre e identificador.
- La consulta general queda habilitada para `ADMIN_SISTEMA` y conserva los perfiles previamente autorizados `ADMINISTRADOR` y `ENCARGADO`. No se añade consulta general a otros perfiles por equivalencia o herencia implícita.
- `GET /api/v1/usuarios/:id` aplica el mismo control para fichas ajenas. Cualquier cuenta activa puede consultar su ficha propia, incluso durante el cambio inicial de contraseña, igual que `/auth/me`.
- Las cuentas inexistentes, inactivas o bloqueadas son rechazadas aunque presenten un JWT emitido antes del cambio. Los cambios de rol y de contraseña inicial pendiente se verifican en el caso de uso para la consulta general.
- Una ficha ajena inexistente tampoco revela su existencia a quien carece del permiso de consulta general.
- Se conservan los DTO públicos sin hashes, salt ni contraseñas. Las respuestas de consulta incluyen `Cache-Control: no-store`.
- La interfaz permite combinar y limpiar filtros y muestra el nombre de usuario junto al correo. Después del alta vuelve a cargar la lista.
- La tabla, el selector de usuarios, los mensajes de consulta y las notificaciones compartidas usan nodos de texto para los valores dinámicos. La regla correspondiente quedó registrada en `.cursor/skills/api-contracts.md` por el patrón repetido de interpolación en HTML detectado en esta pantalla.

## Validación

- `npm.cmd run lint`, `npm.cmd run build`, `node --check public/app.js` y `git diff --check`: aprobados.
- Pruebas focalizadas: **58 aprobadas** (12 del caso de uso, 26 CU61 con HTTP/PostgreSQL y 20 de autenticación/login anteriores).
- PostgreSQL 17 temporal aislado: cadena `0000`–`0011` aplicada sobre una base vacía descartable; consulta de usuarios persistidos después de reconstruir el servidor.
- Verificados filtros combinados, los cuatro campos de búsqueda, texto SQL y comodines tratados literalmente, perfiles canónicos e históricos, orden de resultados, ausencia de credenciales, acceso anónimo, ficha propia, acceso a fichas ajenas y tokens previos a cambios del consultante.
- Regresión completa con las diez variables PostgreSQL habilitadas y `npm.cmd test -- --maxWorkers=2`: **912 aprobadas / 4 fallidas / 916 totales**, sin omisiones.
- Los cuatro fallos son los mismos de SQLSTATE documentados en las etapas anteriores y reproducidos en `origin/main`: `23001` esperado frente a `23503` recibido en PostgreSQL 17 al rechazar borrados referenciados. No se modificaron sus aserciones. La regresión completa sigue sin aprobarse.
- La interfaz fue revisada y comprobada sintácticamente; no se ejecutaron pruebas en un navegador. No se certifica con esta etapa la ausencia de XSS en el resto del dashboard.

Para repetir CU61: definir `CONSULTA_TEST_DATABASE_URL` apuntando exclusivamente a una base descartable llamada `agrul_test_agrul_053_etapa3` y ejecutar `npm.cmd test -- tests/integration/consulta-cu61-postgres.test.ts`. La suite verifica el nombre antes de modificar datos.

## Pendientes

- CU62: modificación autorizada de datos y roles, deltas de valores previos/nuevos con responsable real y fecha, auditoría inmutable persistente y rollback transaccional comprobado.
- Persistir asignaciones de fincas y auditoría en el bootstrap, que todavía usa adaptadores en memoria para esos datos. CU61 consulta los usuarios y roles en PostgreSQL, pero no certifica persistencia de las asignaciones.
- La administración y el bloqueo/desbloqueo conservan sus contratos anteriores hasta la etapa de CU62. Esta etapa no certifica la autorización global de todas las rutas del sistema.
- Resolver o validar los cuatro fallos de regresión antes del merge y completar la validación final de seguridad de la issue.
- Mantener los límites de sesión, transporte HTTPS y provisión inicial del Administrador del Sistema documentados en las etapas anteriores.
- Issue abierta; sin PR ni merge. El porcentaje real del cupo de Codex no está disponible en esta sesión. Detenerse después de commit y push y esperar autorización para CU62.
