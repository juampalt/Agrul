# AGRUL-054 — Inmutabilidad PostgreSQL en la base autorizada

Se adapta la prueba real de migrations-inmutabilidad.test.ts para usar
ACTIVIDADES_TEST_DATABASE_URL y exclusivamente agrul_test_agrul_054, en
127.0.0.1:5432, como agrul_test_user. Verifica PostgreSQL 18 y que el rol no tenga
privilegios administrativos antes de aplicar el journal existente.

El lote y el evento de prueba se insertan dentro de una transacción. Cada intento
de UPDATE o DELETE tiene un savepoint; se exige SQLSTATE P0001 y el mensaje del
trigger de inmutabilidad. Tras restaurar el savepoint, se compara toda la fila con
el original. El rollback final elimina ambos datos de prueba sin deshabilitar
triggers ni ejecutar borrados globales. Se verifica que ya no existan.

## Validación ejecutada

- Lint y build aprobados después del cambio.
- 110 pruebas aprobadas en nueve archivos, sin fallos ni omisiones.
- Incluye 105 pruebas PostgreSQL: 104 de las ocho suites agrícolas autorizadas
  más la prueba real de inmutabilidad; las otras cinco son estáticas de migraciones.
- Se verifican conjuntamente catálogo, programación, labores, monitoreos,
  autorización por finca, históricos, concurrencia y RN-09 desde bootstrap real.
- Sin cambios productivos, nuevas migraciones, lectura de pgpass ni secretos.
- Solo se utilizó la base descartable autorizada; no se creó ni eliminó otra base.

## Pendiente

De las 244 omisiones de la corrida global original, se validaron posteriormente
las siete pruebas de catálogo y esta prueba de inmutabilidad. Quedan 236 pruebas
de diez suites de otros módulos que todavía exigen bases antiguas y/o hacen
limpieza global. No se consideran aprobadas. La suite global no se repitió por
este cambio; sus resultados siguen referidos al commit registrado en su informe.

El próximo bloque debe aislar las pruebas territoriales antes de habilitarlas en
la misma base: hoy borran todos los lotes y fincas y no pueden ejecutarse así.
Las restantes suites de cultivos/ciclos y usuarios también necesitan aislamiento.

PR #57 en borrador, sin merge ni cierre de #48. Cambios locales previos
conservados. Se detiene el bloque para revisión manual del cupo.
