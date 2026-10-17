---
id: AGRUL-032
title: "AGRUL-032: Motor de Búsqueda y Recorrido Cronológico Integral de Cosecha"
epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales"
status: closed
priority: "Alta (P1)"
module: "Módulo 6: Trazabilidad"
labels: ["trazabilidad", "motor", "query", "recorrido", "status:done"]
---

# AGRUL-032 — Motor de Búsqueda y Recorrido Cronológico Integral de Cosecha

- **Épica:** Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales
- **Módulo:** Módulo 6: Trazabilidad
- **Prioridad:** Alta (P1)
- **Status:** closed
- **Requisitos Funcionales:** RF-M6-01, RF-M6-02, RF-M6-03, RF-M6-04, RF-M6-05, RF-M6-06, RF-M6-07
- **Reglas de Negocio:** RN-04, RN-07, RN-08
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Reconstrucción cronológica ascendente completa a partir de un código de cosecha o lote: origen de plantines, ciclo, labores culturales, fitosanitarios aplicados con lote de fábrica y carencia, clima y destinos finales.

## Tareas Técnicas
1. Crear ObtenerRecorridoTrazabilidadUseCase: consulta cosecha por ID o código de trazabilidad.
2. Recorrer y ordenar cronológicamente: partida de plantines/origen -> ciclo -> labores -> aplicaciones (con número de lote de insumo y carencia) -> cosecha -> despachos/destinos.
3. Identificar y resaltar explícitamente lagunas de información (datos faltantes: sin responsable, sin partida de origen) sin inventar valores (RF-M6-06).
4. Incorporar resumen meteorológico del ciclo (RF-M6-07).

## Criterios de Aceptación
- [x] RF-M6-01 / RF-M6-02: Búsqueda ágil y reconstrucción cronológica completa de la historia de la fruta.
- [x] RF-M6-04 / RF-M6-05: Detalle de partida origen y lotes de insumos utilizados.
- [x] RF-M6-06: Flag explícito en el árbol resaltando datos faltantes para auditoría de calidad.

## Comments
Implementación completada con éxito. Cierre formal de AGRUL-032 (Motor de Búsqueda y Recorrido Cronológico Integral de Cosecha).
