# AGRUL-055 / #49 — Revisión de integración

Fecha: 2026-10-29. Punto fijo: origin/main bb6af6d. Base del bloque: dbf23af.
Se aplicaron las skills locales code-review y pr; la primera ejecutó dos
revisiones independientes del diff completo, Standards y Spec.

## Standards

La revisión inicial encontró un P1: los triggers append-only impedían modificar
filas de aplicaciones/items, pero no agregar nuevos items a una aplicación ya
confirmada. El INSERT directo descontaba stock y ampliaba el original consultado
sin actualizar su evento inmutable. Se reprodujo con una prueba PostgreSQL roja.

La migración incremental 0023 toma la cabecera FOR UPDATE antes de los bloqueos
de insumos, compartiendo el orden de CU40. Si existe el evento APLICACION_INSUMOS
de confirmación o una corrección que sustituyó esa versión, rechaza nuevos items.
El registro original y las versiones reemplazantes construyen sus items antes
del evento, dentro de su transacción, y siguen funcionando. No se usa un estado
histórico inventado ni se modifica contenido previo.

La prueba cubre aplicación confirmada, intento concurrente con corrección y
versión sustituida; comprueba rechazo 23514, contenido original idéntico y saldo.
La revisión posterior del arreglo no encontró hallazgos adicionales. Se agregó
la regla de congelar también el conjunto de hijos a database-events.md, según
la auto-mejora exigida por AGENTS.md.

## Spec

La revisión inicial no detectó faltantes. Durante la revisión conjunta se
confirmó además un P2: si el catálogo cambiaba de unidad antes de aplicaciones
y solo existían partidas con la unidad anterior, faltaba una fila con saldo cero
para la unidad vigente; por eso desaparecía la alerta de mínimo correspondiente.

La consulta genera las unidades vigentes e históricas por finca/insumo mediante
LATERAL y UNION, y enlaza las partidas a su unidad exacta. Conserva el stock
físico anterior sin convertirlo ni sumarlo con otra unidad. La prueba, roja
antes del arreglo, verifica kg físicos separados de L utilizables cero, alerta
de reposición y desaparición de esa alerta después de ingresar 6 L contra mínimo 5.

La revisión Spec posterior confirmó ambos arreglos dentro del alcance de #49.
No se reinterpretaron los grupos CU38/CU39 ni CU63–CU66 publicados por la issue.

## Resultado por eje

| Eje | Hallazgos identificados | Estado tras revisión del arreglo |
| --- | --- | --- |
| Standards | 1 P1 de preservación histórica | Corregido; sin hallazgos pendientes |
| Spec | 2 confirmados en revisión conjunta: P1 histórico y P2 de alertas | Corregidos; sin hallazgos pendientes |

El P1 es el mismo hecho visto desde ambos ejes, no un tercer defecto.
Las revisiones fueron estáticas; la validación ejecutada por el agente principal
se detalla por separado a continuación.

## Validación

- Dos regresiones nuevas reprodujeron los dos fallos antes de corregirlos.
- Después: 34 pruebas dirigidas aprobadas en inventario, correcciones concurrentes
  y migraciones, incluida la cadena completa de 24 migraciones desde cero.
- Lint y build aprobados después del último cambio productivo.
- Regresión global: **1404 aprobadas, 0 omitidas, 0 fallidas**, 131 archivos,
  375,79 segundos. Reporte local: .scratch/agrul-055-revision-integracion-vitest.json.
- La única conexión de pruebas fue agrul_test_agrul_055 en PostgreSQL 18.4, con
  agrul_test_user sin privilegios administrativos. Las 24 tablas públicas siguen
  vacías y no quedan esquemas temporales agrul054_* ni agrul055_*.
- `git diff --check` aprobado. Se preservan los cambios locales previos y los
  reportes JSON/caché de pruebas fuera del commit.

## Publicación

Se prepara un PR hacia main con el título pedido, matriz de once CU, reglas,
migraciones, evidencia y riesgos. No se hace merge dentro de este bloque:
se detiene tras publicar para que el usuario revise su cupo.

PR publicado: [#58](https://github.com/juampalt/Agrul/pull/58), abierto, no draft,
con ae449d1 como commit productivo validado y `Closes #49`. El enlace se registra
en un commit posterior de documentación; no modifica el código probado.
