---
id: AGRUL-012
title: "AGRUL-012: Visualizador Gráfico de Linaje Interactivo (Grafo N:M)"
epic: "Épica 6: Frontend Dashboard & Visualizador de Trazabilidad"
status: ready-for-agent
priority: "Media (P2)"
module: "Frontend"
labels: ["frontend", "linaje", "graph", "ready-for-agent"]
---

# AGRUL-012 — Visualizador Gráfico de Linaje Interactivo (Grafo N:M)

- **Épica:** Épica 6: Frontend Dashboard & Visualizador de Trazabilidad
- **Módulo:** Frontend
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Reglas de Negocio:** RN-07
- **Skills:** .cursor/skills/domain-traceability.md

## Descripción
Componente visual interactivo que renderiza el árbol genealógico completo (padres, transformaciones, hijos) a partir de /api/v1/lotes/:id/linaje.

## Tareas Técnicas
1. Integrar librería de grafos dirigida (ej. Cytoscape.js o React Flow / D3).
2. Mapear respuesta de ancestros y descendientes a nodos y aristas con motivos SPLIT/BLEND.
3. Implementar simulación de retiro preventivo (Recall) resaltando descendencia en rojo.

## Criterios de Aceptación
- [ ] Visualización clara de flujos de Split y Merge.
- [ ] Navegación al hacer clic en un lote a su vista de detalle.
- [ ] Modo Recall Simulator operativo destacando lotes derivados.

## Comments
