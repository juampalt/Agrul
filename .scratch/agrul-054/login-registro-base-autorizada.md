# AGRUL-054 — Login y registro en esquemas temporales

Fecha: 2026-10-29. Se adaptan login-cu59-postgres.test.ts (4 pruebas) y
registro-cu60-postgres.test.ts (27 pruebas).

Ambas suites usan ACTIVIDADES_TEST_DATABASE_URL y el helper que solo admite
agrul_test_agrul_054, PostgreSQL 18, en 127.0.0.1:5432, como agrul_test_user sin
privilegios administrativos. Cada caso crea un esquema vacío con DDL real y sin
fallback a public. Las reconstrucciones del servidor conservan esa misma URL.

Se retira el uso de limpiarUsuariosSeguridad de estas dos suites. No se ejecutan
DELETE globales ni se deshabilitan triggers de auditoría: al finalizar cada caso
se cierran sus pools y se elimina únicamente su esquema temporal. Se registra la
regla preventiva de reinicio de fixtures append-only en testing-quality.md.

Antes y después de cada caso se comparan la identidad, perfil, estado y versión
de usuarios compartidos mediante una huella, y los recuentos de sesiones,
auditoría y modificaciones en public. No se leen hashes o sales compartidos para
esta comprobación. Los datos de autenticación del fixture permanecen en su esquema.

## Validación ejecutada

- Prueba inicial de login: cuatro aprobadas.
- Corrida final: **115 aprobadas en doce archivos, sin fallos ni omisiones**.
- Incluye 39 PostgreSQL: 31 de login/registro y ocho de autorización agrícola por
  finca; las otras 76 cubren autenticación/RBAC, auditoría, contrato de login,
  registro de usuarios, dominio, JWT, inactividad y rechazo de destinos no autorizados.
- Lint y build aprobados después del último cambio de código.
- Duración final informada: 110,08 segundos. Ejecución secuencial.

## Pendiente

Quedan **88 pruebas de tres suites** de la corrida global original: consulta de
usuarios (26), modificación de usuarios (45) y sesiones (17). Comparten fixtures
que todavía deben adaptarse. No se declaran aprobadas ni se repitió la suite global
completa; los resultados globales anteriores siguen referidos a su propio commit.

Sin código productivo ni nuevas migraciones. No se crearon ni eliminaron bases,
ni se utilizaron las antiguas, gimnasio_db o PostgreSQL 17. No se leyó pgpass ni
se incluyeron secretos. Cambios locales previos conservados. PR #57 en borrador,
sin merge ni cierre de #48. Detención al finalizar para revisar el cupo.
