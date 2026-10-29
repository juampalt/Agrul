# AGRUL-054 — Plantaciones y ciclos en la base autorizada

Fecha: 2026-10-29. Se adaptan plantaciones-postgres.test.ts (32 pruebas) y
ciclos-productivos-postgres.test.ts (32 pruebas), junto con su fixture de ciclos.

Ambas suites usan ACTIVIDADES_TEST_DATABASE_URL y el helper de esquema temporal.
Solo se conecta agrul_test_user a agrul_test_agrul_054 en PostgreSQL 18,
127.0.0.1:5432. El fixture de ciclos ya no construye un pool en el constructor:
primero valida y prepara el esquema autorizado. Todos los servidores adicionales
reciben la URL del esquema propio, sin fallback a public.

La limpieza se limita a las tablas del esquema temporal. Las suites comparan
huellas de las filas completas de las tablas compartidas afectadas para verificar
que public permanezca intacto; luego cierran los pools y eliminan solo su esquema.

Los casos negativos de permisos preparan el perfil y el cambio obligatorio de
contraseña del actor persistido, restaurándolo y renovando su sesión al terminar.
La cancelación nueva del fixture de RN-09 incluye motivo, conforme al CHECK vigente;
no se modifica la migración ni se debilita la compatibilidad histórica.

## Validación ejecutada

- Pruebas específicas: 64 aprobadas en dos archivos, sin omisiones.
- Corrida final: **294 aprobadas en 21 archivos, sin fallos ni omisiones**.
- Incluye 223 PostgreSQL y 71 pruebas unitarias/estáticas y de integración en
  memoria. Se cubren superficies, vínculos, estados, fechas, concurrencia,
  rollback, RN-09, persistencia entre servidores y autenticación real.
- Regresiones de cultivos, variedades, territorio, catálogo, programación,
  labores, monitoreos, autorización por finca, históricos e inmutabilidad.
- Lint y build aprobados después del último cambio de código.
- Las suites PostgreSQL se ejecutaron secuencialmente en la misma base autorizada.

## Pendientes

Quedan **119 pruebas de cinco suites** de la corrida global original:
login (4), registro de usuarios (27), consulta de usuarios (26), modificación de
usuarios (45) y sesiones (17). Todavía deben aislarse y ejecutarse; no se declaran
aprobadas. No se repitió la suite global completa ni se extrapolan sus resultados.

Sin cambios productivos ni nuevas migraciones. No se crearon ni eliminaron bases,
ni se accedió a bases antiguas, gimnasio_db o PostgreSQL 17. No se leyó pgpass ni
se incluyeron secretos. Cambios locales previos conservados. PR #57 en borrador,
sin merge ni cierre de #48. Detención al finalizar para revisar el cupo.
