# AGRUL-054 — Una base autorizada para el módulo

Se adapta tipos-actividad-postgres.test.ts para usar ACTIVIDADES_TEST_DATABASE_URL,
igual que las demás suites de AGRUL-054. Solo admite la URL sin contraseña de
agrul_test_user en 127.0.0.1:5432/agrul_test_agrul_054. Antes de escribir verifica
PostgreSQL 18 y ausencia de privilegios administrativos.

Se eliminan los DELETE globales de tipos, relaciones y cultivos. La limpieza
solo afecta UUID creados por esta suite; los nombres y actores son exclusivos
de la ejecución. Se agrega una prueba de conservación íntegra del catálogo
preexistente tras limpiar datos propios. Los filtros siguen verificando categoría
y cultivo con registros de control de otra categoría y sin vinculación.

## Validación ejecutada

- Primera ejecución específica: 70 pruebas aprobadas en cinco archivos.
- Tras reforzar filtros y conservación de datos: **109 aprobadas en nueve
  archivos, sin fallos ni omisiones**, incluidas 104 PostgreSQL desde bootstrap
  real y cinco unitarias del catálogo.
- CU22–CU25: ocho pruebas PostgreSQL aprobadas (siete existentes y una nueva).
- Regresiones: programación, labores, monitoreos, finca, históricos, concurrencia
  y RN-09; todas ejecutadas juntas secuencialmente en la misma base autorizada.
- Lint y build aprobados después del último cambio de código.

No se crearon ni eliminaron bases. No se accedió a las bases antiguas, gimnasio_db
o PostgreSQL 17. No se leyó pgpass ni se incluyeron secretos. No hay cambios de
producción ni nuevas migraciones; los fixtures aplican el journal existente solo
sobre la base descartable.

## Pendiente

Las siete omisiones de catálogo de la ejecución global anterior ya tienen
validación específica en la base autorizada. No se repitió toda la suite global
en este bloque; los resultados globales de validacion-global.md siguen referidos
a su commit original. Quedan por adaptar las suites de otros módulos y la prueba
real de inmutabilidad, correspondientes a las otras 237 omisiones de esa corrida.
No se afirma que el criterio global del 100% esté cumplido.

Las bases antiguas no se consideran duplicadas solo por su nombre. Su eliminación
requiere inventario y revisión de contenido/dependencias; este cambio consolida
el uso de la base de pruebas de AGRUL-054 sin borrar las demás.

Cambios locales previos conservados. PR #57 en borrador, sin merge ni cierre de
#48. Detención al finalizar este bloque para revisar el cupo.
