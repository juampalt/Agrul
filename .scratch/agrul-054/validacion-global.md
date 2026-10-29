# AGRUL-054 — Ejecución global con aislamiento seguro

Código evaluado: ec552d8. Fecha: 2026-10-28. Issue #48, PR #57.

## Resultado ejecutado

- 114 archivos descubiertos: 103 aprobados y 11 omitidos completamente.
- 1226 pruebas: **982 aprobadas, 244 omitidas, 0 fallos**.
- Duración informada por Vitest: 107,73 segundos. Salida del proceso: 0.
- Entre las pruebas aprobadas hay 96 PostgreSQL en siete suites con bootstrap
  real: actividades programadas, labores, monitoreos, autorización por finca,
  históricos, concurrencia y RN-09.

Comando: `npm.cmd exec -- vitest run --no-file-parallelism --reporter=default --reporter=json --outputFile=.scratch/agrul-054/validacion-global-vitest.json`.

Antes de ejecutarlo se eliminaron del entorno del proceso todas las variables
de conexión DATABASE_URL identificadas estáticamente en tests, sin leer sus
valores. Se habilitaron solo ACTIVIDADES_TEST_DATABASE_URL y
RN09_TEST_DATABASE_URL con la URL sin contraseña del rol agrul_test_user en
127.0.0.1:5432/agrul_test_agrul_054. Los guards verifican PostgreSQL 18 y permisos
antes de las escrituras. Ninguna otra base se habilitó.

## Omisiones exactas

| Archivo | Pruebas omitidas |
| --- | ---: |
| ciclos-productivos-postgres.test.ts | 32 |
| consulta-cu61-postgres.test.ts | 26 |
| cultivos-postgres.test.ts | 21 |
| login-cu59-postgres.test.ts | 4 |
| modificacion-cu62-postgres.test.ts | 45 |
| plantaciones-postgres.test.ts | 32 |
| registro-cu60-postgres.test.ts | 27 |
| sesiones-vigentes-postgres.test.ts | 17 |
| territorio-postgres.test.ts | 7 |
| tipos-actividad-postgres.test.ts | 7 |
| variedades-postgres.test.ts | 25 |
| migrations-inmutabilidad.test.ts | 1 |
| **Total** | **244** |

Las primeras once suites exigen bases antiguas específicas. La última contiene
cinco pruebas estáticas aprobadas y una prueba PostgreSQL omitida. No se cambiaron
sus guards ni se utilizaron esas bases. Los resultados omitidos no están aprobados.

## Pendiente y límites

El criterio de la issue «100% de tests unitarios y de integración pasando en
verde» sigue pendiente. El siguiente bloque acotado debe adaptar CU22–CU25 a la
base autorizada y eliminar su limpieza global de catálogos/cultivos, conservando
las filas de otras suites y las restricciones. Después quedan las suites ajenas
al módulo y la prueba real de inmutabilidad, que requieren aislamiento equivalente.

Este bloque no cambió código ni fixtures. Se conserva la evidencia anterior de
lint y build; no se repitieron por cambios exclusivos de documentación. El JSON
de Vitest queda local como evidencia y fuera del commit. Se preservan los cambios
locales preexistentes. Sin merge, cierre de issue o cambios en producción.
El PR sigue en borrador. Se detiene el trabajo para revisión del cupo.
