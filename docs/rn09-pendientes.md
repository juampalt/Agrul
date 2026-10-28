# Consulta persistente de pendientes — AGRUL-052 (#46)

`actividades_programadas` es la tabla canónica de `SPEC.md`. Esta etapa introduce solo
`id`, `ciclo_id` y `estado` (`PENDIENTE`, `EJECUTADA`, `CANCELADA`), con índice por ciclo/estado.
AGRUL-054 (#48) ampliará esta misma tabla con sus campos de programación y referencias;
no se agregaron endpoints, operaciones de escritura ni casos de uso del Módulo 3.
La migración `0008` agrega la FK de `ciclo_id` a `ciclos_productivos` con `ON DELETE RESTRICT`.

El bootstrap expone `cierreCicloGuard` y lo comparte con `DrizzleCiclosProductivosRepository`.
CU21 ejecuta la validación del ciclo, su transición y las actualizaciones del lote dentro
del callback de `ejecutar`, usando exclusivamente la transacción recibida.
Cualquier error aborta la operación completa.
Los pendientes causan un error de dominio 422; una consulta fallida nunca se toma como cero pendientes.

El guard toma un bloqueo `SHARE` de la tabla hasta el commit. Es una protección inicial
con alcance global: las escrituras de actividades esperan durante la operación de cierre.
El trigger `trg_pendiente_ciclo_abierto` impide insertar o reabrir pendientes en ciclos
finalizados, incluso cuando el escritor esperó al commit del cierre. Módulo 3 deberá
mantener sus demás validaciones de programación y ejecución al ampliar la tabla.

El repositorio SQL de ciclos es compartido por las rutas CU18–CU21 y los consumidores
heredados. La entidad existente reconoce ACTIVO/FINALIZADO sin romper ABIERTO/CERRADO
en pruebas y adaptadores anteriores. Las actividades heredadas en memoria no se migran;
la fuente persistente de RN-09 es exclusivamente `actividades_programadas`.

La migración `0009` materializa la tabla `usuarios` que ya estaba modelada y agrega la FK
del responsable con `ON DELETE RESTRICT`. El registro verifica existencia y estado ACTIVO
dentro de la transacción, con bloqueo SHARE del usuario. El bootstrap comparte esa tabla
con las rutas existentes de usuarios mediante `DrizzleUsuariosRepository`; no se crea
un catálogo paralelo de responsables ni se implementan los casos de uso pendientes de #47.
Si hubiera responsables huérfanos previos, la migración falla sin fabricar usuarios.

Las pruebas del guard usan una tabla auxiliar exclusiva de la base descartable para
verificar efectos transaccionales. Las de CU18–CU21 prueban el cierre por HTTP real,
incluyendo pendientes persistidos, concurrencia y rollback de ciclo y lote.

Validación final de AGRUL-052: lint, build y 822 pruebas aprobadas sin omisiones;
migraciones `0000`–`0009` aplicadas desde una base vacía y descartable, incluida
la verificación real de los triggers de inmutabilidad y la regresión territorial CU01–CU06.
