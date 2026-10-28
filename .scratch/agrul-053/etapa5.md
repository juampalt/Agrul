# AGRUL-053 / Issue #47 — Etapa 5: vigencia de sesiones y regresión completa

Fecha: 2026-10-28. Base: `2b55f50`. Rama: `feat/agrul-053-usuarios-seguridad`.

## Resultado

CU59–CU62 y los controles de sesión de esta etapa están implementados y validados localmente. **988 pruebas aprobadas, sin omisiones, en 96 archivos**, con las doce variables de integración PostgreSQL habilitadas. Lint, build, sintaxis del cliente y revisión de whitespace aprobados. PR y merge todavía pendientes.

## Cambios

- Migración `0013_sesiones_vigentes`: tabla `sesiones_usuarios` con huella SHA-256 del token, usuario, expiración, última actividad y revocación. No almacena JWT en texto plano.
- Cada token nuevo tiene un `jti` aleatorio. Dos logins en el mismo segundo producen tokens y sesiones diferentes.
- La versión de sesión del usuario cambia mediante un trigger cuando cambian credenciales, rol, estado o la obligación de cambio inicial. El repositorio no permite sobrescribir esa versión desde el DTO del usuario.
- El bootstrap productivo revalida las solicitudes API que presentan autenticación y los guards verifican la sesión. Comprueba cuenta existente/activa, rol y versión vigentes, sesión emitida, cierre/expiración e inactividad; carga las asignaciones actuales en lugar de confiar en las fincas del JWT.
- Un cambio de rol no conserva los permisos del token anterior. Reactivar una cuenta no resucita sus tokens anteriores. Revocar una asignación impide usar la finca aunque figure en un JWT viejo.
- La inactividad se comprueba en PostgreSQL y persiste entre instancias. Una cabecera de actividad futura o un nuevo login no rehabilitan una sesión anterior vencida.
- La autenticación opcional también rechaza tokens inválidos; ya no los degrada a solicitudes anónimas ni renueva su actividad sin verificar vigencia.
- Se mantiene la superficie pública heredada de otros módulos: esta etapa no inventa una matriz de permisos para esas rutas. Las rutas protegidas conservan sus roles y revalidan al actor.
- `POST /api/v1/auth/logout` revoca y audita el token elegido dentro de una transacción, sin cerrar otras sesiones vigentes. La interfaz solicita el cierre al servidor antes de eliminar la sesión local e informa si no pudo confirmarlo.
- Login, cambio de contraseña y cierre usan la unidad transaccional. Los rechazos por contraseña incorrecta confirman los intentos fallidos y el bloqueo; un fallo de persistencia/auditoría revierte la operación.
- El cambio de contraseña de una cuenta que ya completó el primer ingreso exige la contraseña actual. El primer cambio mantiene su excepción prevista. Cambiar la credencial invalida los tokens previos y requiere un nuevo login.
- La utilidad `POST /api/v1/auditoria/simular-inactividad` exige Administrador del Sistema activo, contraseña inicial cambiada y contrato estricto. Ya no permite configuración anónima; la simulación autorizada actualiza las sesiones persistidas del usuario elegido.
- Los errores internos se registran por clasificación y request ID, sin serializar consultas, parámetros, detalles o causas que puedan contener credenciales. El cliente conserva su error 500 genérico.
- Se actualizaron las skills de API, Arquitectura y Testing para evitar repetir los patrones corregidos.

## Pruebas y regresión

- 17 pruebas PostgreSQL nuevas de sesiones: tokens únicos/huellas, cierre y aislamiento entre sesiones, credenciales, rol, bloqueo/reactivación, fincas, expiración, tokens no emitidos, primer ingreso, intentos concurrentes, utilidad administrativa y rollback de login/contraseña/cierre ante fallo de auditoría.
- Una prueba HTTP de privacidad reprodujo primero la exposición del error completo en el logger y pasó después de corregirlo. Solo utiliza valores sensibles sintéticos.
- Las pruebas operativas de cultivos, variedades, plantaciones y ciclos ahora crean y autentican operadores reales. Los tokens fabricados se reservan para casos negativos explícitos y no evitan la validación persistente.
- Los cinco asserts de borrado restringido que originaban cuatro fallos aceptan los SQLSTATE de integridad previstos `23001`/`23503` y comprueban que las filas referenciadas siguen existiendo. No se cambiaron las restricciones de las tablas ni se aceptan fallas de conexión/permisos como resultados válidos.
- Cadena `0000`–`0013` aplicada desde una base PostgreSQL 17 vacía y descartable.
- Comando de regresión: `npm.cmd test -- --maxWorkers=2`, con todas las variables `*_TEST_DATABASE_URL` y `TEST_DATABASE_URL` de las suites configuradas a sus bases descartables verificadas por nombre. Resultado final: **988/988**.
- Para repetir las pruebas nuevas de sesiones, configurar `SESIONES_TEST_DATABASE_URL` exclusivamente para `agrul_test_agrul_053_etapa5` y ejecutar `npm.cmd test -- tests/integration/sesiones-vigentes-postgres.test.ts`.

## Integración y límites

- Aplicar las migraciones antes de arrancar la nueva versión. Las sesiones anteriores sin registro persistido deben iniciar sesión nuevamente. No se promueven cuentas ni se crean usuarios productivos automáticamente.
- Producción usa `src/index.ts` → `crearServidorProduccion`, con repositorios PostgreSQL y revalidación persistida habilitada. `buildApp` conserva adaptadores/fixtures de prueba para las suites anteriores; no certifica seguridad productiva si se usa directamente con mocks.
- Configurar `JWT_SECRET` externo de al menos 32 bytes en producción. La clave aleatoria de desarrollo sigue invalidando tokens al reiniciar el proceso.
- HTTPS debe proveerlo el despliegue: no se verificó un endpoint productivo ni la terminación TLS desde esta sesión. No se ejecutaron pruebas en navegador.
- No se realizó despliegue. Falta consultar el estado remoto de la base/PR, crear o actualizar el PR con `Closes #47` y verificar los controles de GitHub antes de considerar el merge. No se verificó todavía la elegibilidad remota del merge.
- Se conservan el cambio local de caché Vitest y los demás archivos ajenos fuera de los commits.
- El porcentaje real del cupo Codex no está disponible en las herramientas de esta sesión. Detenerse tras commit/push y esperar autorización para la etapa de PR/merge.
