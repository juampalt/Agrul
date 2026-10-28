# AGRUL-053 / Issue #47 — Etapa 1: CU59

Fecha: 2026-10-28. Base: `origin/main` / `33f9d3f`.
Rama: `feat/agrul-053-usuarios-seguridad`.

## Implementado

- `POST /api/v1/auth/login` acepta exactamente uno de `email` o `nombreUsuario`, junto con `password`.
- Se conserva el contrato por correo de las cuentas anteriores. El nombre de usuario se normaliza sin distinguir mayúsculas.
- Migración `0010_login_nombre_usuario`: columna opcional, unicidad por `lower(nombre_usuario)` y restricción de formato. No se inventan nombres para usuarios anteriores.
- Se reutilizan PBKDF2, bloqueo tras cinco intentos, verificación de cuenta activa y emisión JWT existentes.
- JWT valida algoritmo, tipo, identidad, perfil, fincas y fechas obligatorias; rechaza la expiración exacta y emisiones futuras.
- Se elimina el secreto fijo. Producción requiere `JWT_SECRET` externo de al menos 32 bytes. Desarrollo usa una clave aleatoria por proceso cuando se omite la variable; reiniciar invalida esas sesiones.
- El login devuelve `Cache-Control: no-store` y registra IP y agente en la auditoría existente.
- Un timestamp enviado por el cliente no puede extender una sesión inactiva respecto del reloj del servidor.

## Verificación

- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: aprobado.
- Pruebas focalizadas de login, JWT, usuarios y RBAC: 45 aprobadas.
- `tests/integration/login-cu59-postgres.test.ts`: 4 aprobadas con bootstrap real y PostgreSQL 17 temporal, separado de las bases existentes.
- Migraciones `0000`–`0010`: aplicadas desde una base vacía descartable.
- Suite completa, habilitando todas las variables de integración PostgreSQL: 834 aprobadas y 4 fallidas, sin omisiones (838 pruebas).
- Incluye inmutabilidad real, regresión territorial, catálogos y ciclos.

Los cuatro fallos están en `variedades-postgres.test.ts` (1), `plantaciones-postgres.test.ts` (1) y `ciclos-productivos-postgres.test.ts` (2). Esperan SQLSTATE `23001` al borrar filas referenciadas; el PostgreSQL 17 usado rechaza correctamente el borrado con `23503`. Las mismas cuatro pruebas fallan con ese resultado al ejecutar el código original de `origin/main` en una copia temporal. No se modificaron las pruebas ni las restricciones de otros módulos para ocultarlo. No se certifica la regresión completa como aprobada.

Para repetir CU59: definir `SEGURIDAD_TEST_DATABASE_URL` apuntando exclusivamente a una base descartable llamada `agrul_test_agrul_053_etapa1` y ejecutar `npm.cmd test -- tests/integration/login-cu59-postgres.test.ts`. La suite comprueba el nombre antes de modificar datos.

## Pendientes y límites

- CU60: alta con nombre de usuario y perfiles canónicos; el alta HTTP actual aún no asigna nombres de usuario.
- CU61–CU62: filtros formales, modificación y deltas de auditoría persistentes.
- El bootstrap aún utiliza repositorios en memoria para asignaciones de fincas y auditoría; esta etapa no completa su persistencia.
- La sesión por inactividad existente se mantiene por usuario y en memoria; no se implementó un almacén distribuido ni revocación persistente.
- La protección del transporte depende de HTTPS en el despliegue; no fue validada en este entorno local.
- Resolver o validar los cuatro fallos de regresión antes de considerar un merge. No hay PR ni merge en esta etapa.
- No se puede consultar desde esta sesión el porcentaje real del cupo de Codex. Detenerse después del commit y push; no comenzar la siguiente etapa sin autorización.
