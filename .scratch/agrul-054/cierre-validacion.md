# AGRUL-054 — Contraste de aceptación y preparación de PR

Fuente: issue #48 de juampalt/Agrul, consultada mediante API de GitHub el
2026-10-28. La issue continúa abierta. Contraste con HEAD b65d2d9.

| Criterio de GitHub | Evidencia | Estado |
| --- | --- | --- |
| RN-10: labores planificadas o directas | ejecutar-programada-postgres.test.ts: ejecución desde programación y registro NO_PROGRAMADA | Cubierto por pruebas específicas |
| RN-11: lote, ciclo activo, fecha no futura y responsable | Misma suite: rechazos de ciclos no activos, fechas fuera de ciclo/futuras y responsables inválidos | Cubierto por pruebas específicas |
| RN-12: historial y motivo de cancelación | actividades-programadas-postgres.test.ts, actividades-historicas-postgres.test.ts y rn09-pendientes-postgres.test.ts | Cubierto; históricos sin motivo se conservan, altas nuevas lo exigen |
| RN-13: recomendaciones sin aplicaciones ni actividades ficticias | monitoreos-postgres.test.ts: inspecciones desacopladas | Cubierto por pruebas específicas |
| 100% de tests unitarios e integración en verde | Últimos bloques: 275 y 99 pruebas relacionadas aprobadas; totales superpuestos | Pendiente: suite global completa no ejecutada |

Se verificaron las tareas técnicas de la issue: catálogo CU22–CU25, programación
CU26–CU29, labores CU30/CU31, monitoreos CU32/CU33, puertos/repositores y endpoints
integrados en bootstrap. Se reutiliza la tabla actividades_programadas.

Los cinco hallazgos S1/P1/P2/S2/P3 tienen correcciones publicadas y una revisión
estática posterior sin bloqueantes nuevos identificados. Esa revisión no reemplaza
la ejecución de la suite global ni certifica componentes ajenos al alcance revisado.

La evidencia del catálogo CU22–CU25 proviene del trabajo previo de Gemini; no se
repitieron esas pruebas en este bloque ni se conecta su antigua base de pruebas.
El informe local etapa1.md se conserva fuera de Git por ser un cambio preexistente.

Este bloque solo agrega documentación de aceptación y el cuerpo del PR. No cambia
código, migraciones ni datos. Se conservan los resultados previos de lint y build;
no se ejecutan pruebas nuevas por estos archivos Markdown.

## Pendiente para salir de borrador

1. Revisar qué suites globales dependen de otras bases o variables de conexión.
2. Ejecutar la validación global con aislamiento explícito y exclusivamente la
   base descartable autorizada; registrar fallos u omisiones sin declararlos aprobados.
3. Revisión humana y autorización expresa antes de merge o cierre de la issue.

No se modifica TICKETS.md a completado mientras siga pendiente el criterio global.
La creación del borrador no autoriza despliegue ni cambios de producción.
Se detiene el trabajo al finalizar este bloque para revisión manual del cupo.
