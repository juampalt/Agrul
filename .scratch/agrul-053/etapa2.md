# AGRUL-053 / Issue #47 — Etapa 2: CU60

Fecha: 2026-10-28. Base de etapa: `4ed2855`.
Rama: `feat/agrul-053-usuarios-seguridad`.

## Implementado

- `RegistrarUsuarioUseCase` implementa CU60 / `confirmarRegistroUsuario`, reutilizando la creación y criptografía existentes.
- `POST /api/v1/usuarios` exige un JWT de `ADMIN_SISTEMA` y cambio inicial de contraseña cumplido. El caso de uso consulta al responsable persistido y rechaza cuentas ausentes, inactivas, bloqueadas, con otro rol o con cambio de contraseña pendiente, incluso con un token previo válido.
- El alta exige nombre de usuario, nombre, apellido, correo, contraseña y perfil canónico: `ADMINISTRADOR`, `ENCARGADO_CAMPO` (incluye Ingeniero Agrónomo), `ADMIN_SISTEMA` (Administrador del Sistema).
- Los perfiles históricos siguen siendo válidos para cuentas y JWT existentes. El alta nueva no admite esos perfiles ni asigna permisos por herencia implícita a los nuevos roles.
- Se normalizan nombre de usuario y correo; se valida fortaleza de contraseña con el servicio PBKDF2 existente; la cuenta nueva queda activa y con cambio inicial obligatorio.
- Los conflictos de nombre de usuario o correo, incluso concurrentes, devuelven `409 USUARIO_DUPLICADO`, sin exponer SQL, hashes o contraseñas.
- La auditoría de creación existente identifica al administrador responsable, conserva al usuario creado como entidad y excluye credenciales.
- El formulario existente envía el nombre de usuario y ofrece los tres roles canónicos; sus controles se habilitan solo para la sesión correspondiente. El backend aplica las restricciones independientemente de la interfaz.
- Migración `0011_registro_usuarios_canonicos`: índice único por correo sin distinguir mayúsculas y restricción de perfiles admitidos, incluyendo históricos. No modifica ni promueve cuentas anteriores. Si encuentra correos equivalentes o perfiles inválidos, falla sin corregir datos arbitrariamente.

## Validación

- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: aprobado.
- `node --check public/app.js` y `git diff --check`: aprobados. La interfaz no fue validada en un navegador.
- Pruebas focalizadas: **60 aprobadas** (13 del caso de uso, 27 CU60 con HTTP/PostgreSQL y 20 de autenticación/auditoría anteriores).
- Cadena completa `0000`–`0011`: aplicada sobre una base PostgreSQL 17 vacía y descartable, independiente de las bases del usuario.
- Persistencia validada después de reconstruir el servidor; autenticación de los tres roles; rechazo de tokens previos a cambios del responsable; duplicados concurrentes por ambos identificadores; perfiles inválidos; contraseñas protegidas y restricciones SQL reales.
- Regresión completa con las nueve variables de integración PostgreSQL habilitadas y `npm.cmd test -- --maxWorkers=2`: **874 aprobadas / 4 fallidas / 878 totales**, sin omisiones.
- Se adaptó la preparación del test de integración de ciclos que registraba usuarios mediante `ADMINISTRADOR`: ahora autentica un Administrador del Sistema y verifica el mismo flujo de asignación del responsable entre instancias. No cambió la lógica productiva de ciclos.
- Permanecen únicamente los cuatro fallos de SQLSTATE documentados y reproducidos en `origin/main` durante la etapa 1 (`23001` esperado frente a `23503` recibido en PostgreSQL 17). No se alteraron esas aserciones. La regresión completa no está aprobada.

Para repetir CU60: definir `REGISTRO_TEST_DATABASE_URL` apuntando exclusivamente a una base descartable llamada `agrul_test_agrul_053_etapa2` y ejecutar `npm.cmd test -- tests/integration/registro-cu60-postgres.test.ts`. La suite verifica el nombre antes de modificar datos.

## Pendientes y límites

- CU61 y CU62: completar consulta y administración con roles canónicos, filtros y auditoría persistente de modificaciones. No se ampliaron en esta etapa los permisos de otras rutas para los nuevos roles.
- Auditoría y asignaciones de fincas del bootstrap continúan en memoria; su persistencia y atomicidad no quedan certificadas en esta etapa. La identidad del responsable sí se verifica en PostgreSQL.
- El primer `ADMIN_SISTEMA` debe provisionarse mediante una operación administrativa controlada: no se creó una cuenta productiva, contraseña predeterminada, alta pública ni promoción automática de administradores existentes.
- Resolver o validar los cuatro fallos de regresión antes del merge; conservar la verificación de HTTPS y los límites de sesión indicados en la etapa 1.
- Issue abierta. No crear PR ni realizar merge todavía.
- No es posible consultar el porcentaje real del cupo de Codex desde esta sesión. Detenerse tras commit y push y esperar autorización antes de la etapa siguiente.
