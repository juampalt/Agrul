---
id: AGRUL-036
title: "AGRUL-036: Comparador de Campañas, Evolución Histórica y Relación Insumo-Producto"
epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas"
status: done
priority: "Media (P2)"
module: "Módulo 7: Indicadores"
labels: ["comparador", "campañas", "analytics", "status:done"]
---

# AGRUL-036 — Comparador de Campañas, Evolución Histórica y Relación Insumo-Producto

- **Épica:** Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas
- **Módulo:** Módulo 7: Indicadores
- **Prioridad:** Media (P2)
- **Status:** done
- **Requisitos Funcionales:** RF-M7-03, RF-M7-04, RF-M7-05, RF-M7-06, RF-M7-10, RF-M7-11
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Comparación entre campañas del mismo lote o entre lotes de la misma campaña, correlación entre insumos aplicados y producción obtenida, distinguiendo ciclos cerrados de ciclos en curso.

## Tareas Técnicas
1. Crear endpoint de comparación con filtros combinables (finca, lote, cultivo, variedad, fechas).
2. Diferenciar visualmente métricas de ciclos en curso (provisionales) de ciclos cerrados (definitivos) (RF-M7-11).
3. Cálculo de eficiencia de insumos: kg producto cosechado / unidades de fertilizante o agroquímico aplicado (RF-M7-05).

## Criterios de Aceptación
- [x] RF-M7-03 / RF-M7-04: Comparación tabular y gráfica de rendimientos intercampaña.
- [x] RF-M7-11: Indicador explícito de estado parcial en ciclos en curso.
- [x] RF-M7-05 / RF-M7-06: Relación insumo-producto, intensidad de aplicación y deltas porcentuales.

## Comments
Implementado con Caso de Uso `CompararCampanasUseCase`, endpoints `/api/v1/indicadores/comparador` y `/api/v1/indicadores/eficiencia-insumos`, pestaña comparadora en UI con indicadores de tendencia, deltas porcentuales y modal de desglose agronómico de insumos.
