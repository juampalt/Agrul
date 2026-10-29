# AGRUL-054 — Validación global final

Fecha: 2026-10-29. Issue #48, PR #57. Rama existente conservada.

## Último bloque de infraestructura

Consulta (26), modificación (45) y sesiones (17) usan la misma base autorizada
y un esquema temporal vacío por caso. El fixture compartido ya no crea pools
antes de validar la conexión. Las instancias adicionales del servidor reciben
la URL del esquema propio. Se cierra cada pool y se elimina solo su esquema.

Se comprueban identidad, perfil, estado y versión de usuarios compartidos, además
de recuentos de sesiones, auditoría, modificaciones y asignaciones. El fixture
compartido verifica también las fincas. No se leen hashes o sales compartidos para
estas comprobaciones. Se elimina limpiar-usuarios-seguridad.ts, ya sin consumidores,
que deshabilitaba triggers; los controles append-only permanecen activos.

## Resultados ejecutados

- Pruebas específicas de las últimas tres suites: **88 aprobadas**, sin omisiones.
- `npm.cmd run lint`: aprobado después del último cambio de código.
- `npm.cmd run build`: aprobado después del último cambio de código.
- **Suite global: 1232 pruebas aprobadas en 115 archivos.**
- **0 fallos, 0 omitidas y 0 pendientes/todo.** Proceso finalizado con código 0.
- 342 pruebas PostgreSQL reales; 890 unitarias/estáticas o integraciones en memoria.
- Duración global informada por Vitest: 470,25 segundos.
- El JSON de Vitest confirma success=true y total=passed=1232.

Comando completo de pruebas:

```text
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-054/validacion-final-vitest.json
```

Se borraron solo del entorno del proceso las variables antiguas de conexión, sin
leer sus valores. Se configuraron ACTIVIDADES_TEST_DATABASE_URL y
RN09_TEST_DATABASE_URL con la URL sin contraseña de agrul_test_user en
127.0.0.1:5432/agrul_test_agrul_054. No se habilitó ninguna otra base.
Todas las suites condicionales de PostgreSQL se ejecutaron y no quedaron omisiones.
La ejecución fue secuencial para evitar interferencias entre fixtures.

Consulta posterior de solo lectura: base agrul_test_agrul_054, rol agrul_test_user,
**0 esquemas agrul054_aislado_* o agrul054_p1_* remanentes**.

## Alcance y límites

El criterio global de la issue queda acreditado junto con RN-10 a RN-13; véase
cierre-validacion.md. Los informes anteriores describen corridas históricas y no
reemplazan este resultado final. No se suman los totales de bloques superpuestos.

Entorno validado: Windows, PostgreSQL 18 y pg_dump 18 instalado. Solo base
descartable y rol sin privilegios administrativos; sin nuevas migraciones en este
bloque ni cambios productivos. No se leyó pgpass, no se mostraron credenciales
reales y no se crearon ni eliminaron bases. No se tocaron gimnasio_db ni PostgreSQL 17.

El JSON final y el JSON global anterior quedan locales, fuera del commit; no se
suben artefactos con datos de fixtures. Se conservan etapa1.md y la caché local
de Vitest preexistentes. Los últimos cambios posteriores a las pruebas son solo
documentación. Sin merge ni cierre de #48. PR preparado para revisión humana;
detención para revisar el cupo.
