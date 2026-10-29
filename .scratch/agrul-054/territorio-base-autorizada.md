# AGRUL-054 — Pruebas territoriales en esquema aislado

Se adaptan las siete pruebas de territorio-postgres.test.ts para usar únicamente
agrul_test_agrul_054 como agrul_test_user en PostgreSQL 18 (127.0.0.1:5432).
No se crea ni se elimina ninguna base de datos.

## Aislamiento

El nuevo helper esquema-postgres-aislado.fixture.ts valida el destino antes de
crear pools y verifica versión y permisos antes de escribir. Aplica el journal
existente a la base autorizada y obtiene el DDL de public con pg_dump 18 en modo
schema-only, sin datos, propietarios ni permisos. No imprime ni persiste ese DDL.
Usa el ejecutable PostgreSQL 18 instalado en Windows y la autenticación local
habitual de libpq; no lee ni muestra pgpass ni contraseñas.

El DDL se copia dentro de una transacción a un esquema aleatorio validado. Todas
las referencias a public —incluidas FK y funciones— se redirigen al esquema
temporal. La conexión de prueba usa ese esquema y pg_catalog, sin fallback a
public. Las limpiezas de lotes/fincas quedan contenidas allí. Al cerrar los pools
se elimina exclusivamente el esquema creado por el helper.

La prueba del bootstrap real autentica un actor persistido en el esquema propio.
Una prueba nueva verifica que las FK locales no apunten a tablas compartidas;
también se comparan huellas de las filas completas de public.fincas y public.lotes
antes y después. Cuatro pruebas unitarias comprueban rechazo previo a crear pools
para usuario administrador, otra base, otro puerto y parámetros de conexión.

Se registra la regla preventiva de aislamiento en la skill testing-quality.

## Validación ejecutada

- Prueba inicial territorial: ocho aprobadas (siete existentes y una nueva).
- Corrida final: **129 aprobadas en doce archivos, sin fallos ni omisiones**.
- Incluye 113 PostgreSQL (105 previamente habilitadas más ocho territoriales),
  cuatro pruebas unitarias de conexión segura, cinco estáticas de migraciones y
  siete regresiones territoriales en memoria.
- Lint y build aprobados después del último cambio de código.
- Regresiones de catálogo, programación, labores, monitoreos, autorización,
  históricos, concurrencia, RN-09 e inmutabilidad ejecutadas secuencialmente.

## Pendientes

De la corrida global original se resolvieron siete omisiones de catálogo, una de
inmutabilidad y siete territoriales. Quedan **229 pruebas de nueve suites**:
cultivos (21), variedades (25), plantaciones (32), ciclos (32), login (4), registro
de usuarios (27), consulta de usuarios (26), modificación de usuarios (45) y
sesiones (17). No se consideran aprobadas ni se extrapola una nueva corrida global.

El helper permite aislar esas suites en futuros bloques sin requerir bases
adicionales. Las bases antiguas no se accedieron ni eliminaron. Se conservan los
cambios locales previos. PR #57 en borrador; sin merge, cierre de #48, nuevas
migraciones ni cambios de código productivo. Detención para revisar el cupo.
