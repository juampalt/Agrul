# Consulta persistente de pendientes — AGRUL-052 (#46)

`actividades_programadas` es la tabla canónica de `SPEC.md`. Esta etapa introduce solo
`id`, `ciclo_id` y `estado` (`PENDIENTE`, `EJECUTADA`, `CANCELADA`), con índice por ciclo/estado.
AGRUL-054 (#48) ampliará esta misma tabla con sus campos de programación y referencias;
no se agregaron endpoints, operaciones de escritura ni casos de uso del Módulo 3.
La FK de `ciclo_id` debe agregarse cuando CU18–CU21 versionen la tabla de ciclos.

El bootstrap expone `cierreCicloGuard`. CU21 deberá ejecutar la validación del ciclo,
su transición y las actualizaciones del lote dentro del callback de `ejecutar`, usando
exclusivamente la transacción recibida. Cualquier error aborta la operación completa.
Los pendientes causan un error de dominio 422; una consulta fallida nunca se toma como cero pendientes.

El guard toma un bloqueo `SHARE` de la tabla hasta el commit. Es una protección inicial
con alcance global: las escrituras de actividades esperan durante la operación de cierre.
Módulo 3 deberá comprobar también que el ciclo permite nuevas actividades al escribir;
el bloqueo de RN-09 protege la ventana de cierre, pero no sustituye esa validación posterior.

Esta dependencia no implementa CU18–CU21 ni migra los repositorios heredados en memoria.
Las pruebas usan una tabla auxiliar exclusiva de la base descartable para verificar efectos
transaccionales; no representan una implementación del cierre productivo.
