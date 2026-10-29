# AGRUL-054 — Regresiones de cultivos y variedades aisladas

Las suites cultivos-postgres.test.ts (21 pruebas) y variedades-postgres.test.ts
(25 pruebas) usan ACTIVIDADES_TEST_DATABASE_URL con el helper de esquema temporal.
Solo se admite agrul_test_user en agrul_test_agrul_054, PostgreSQL 18, puerto 5432
de 127.0.0.1. Cada suite tiene su esquema vacío con DDL real y sin fallback a
public, incluido el segundo servidor del caso de persistencia entre instancias.
No se crearon ni eliminaron bases.

Los DELETE del fixture quedan contenidos en su propio esquema. Se comparan
huellas de las filas completas de public.cultivos y public.variedades para
comprobar que la limpieza no altere los registros compartidos. El helper cierra
los pools y elimina únicamente su esquema temporal.

Los casos negativos de permisos preparan el perfil y el cambio inicial de
contraseña en el usuario persistido, además de emitir su sesión de prueba.
Restauran ese estado y autentican nuevamente al actor al terminar. Se registra
esta regla preventiva en testing-quality.md. No se modifica la autenticación
productiva ni se debilitan sus comprobaciones de vigencia.

## Validación ejecutada

La primera corrida dio 45 aprobadas y un fallo: el caso de permisos dejó una
sesión inválida para el siguiente beforeEach de variedades, que respondió 401.
Después de renovar la sesión al restaurar el actor, las 46 pruebas pasaron juntas.

Corrida final: **186 pruebas aprobadas en 16 archivos, sin fallos ni omisiones**.
Incluye 159 PostgreSQL, 11 unitarias de cultivos/variedades, cuatro de rechazo de
destinos de conexión, cinco estáticas de migraciones y siete territoriales en
memoria. También pasan las regresiones PostgreSQL de territorio, catálogo,
programación, labores, monitoreos, autorización por finca, históricos,
concurrencia, RN-09 e inmutabilidad. Lint y build aprobados tras el último cambio
de código. Las suites se ejecutaron secuencialmente.

## Pendiente

De las omisiones de la corrida global original quedan **183 pruebas de siete
suites**: plantaciones (32), ciclos (32), login (4), registro de usuarios (27),
consulta de usuarios (26), modificación de usuarios (45) y sesiones (17).
No se consideran aprobadas. No se repitió toda la suite global ni se extrapola
un total global actualizado.

Sin nuevas migraciones ni cambios productivos. No se accedió a bases antiguas,
gimnasio_db ni PostgreSQL 17. No se leyó pgpass ni se incluyeron secretos.
Se conservan los cambios locales previos. PR #57 continúa en borrador, sin merge
ni cierre de #48. Detención para revisar el cupo al finalizar este bloque.
