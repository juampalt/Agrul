---
id: AGRUL-037
title: "AGRUL-037: Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js"
epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 7: Indicadores"
labels: ["dashboard", "chartjs", "kpi", "ready-for-agent"]
---

# AGRUL-037 — Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js

- **Épica:** Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas
- **Módulo:** Módulo 7: Indicadores
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M7-12, RF-M7-13, RF-M7-14
- **Skills:** .cursor/skills/architecture.md, .cursor/skills/api-contracts.md

## Descripción
Panel de control principal con KPIs clave (lotes en producción, producción acumulada, alertas de stock bajo y actividades vencidas), visualizaciones con Chart.js y módulo opcional de costos.

## Tareas Técnicas
1. Crear endpoint GET /api/v1/dashboard/resumen que agregue los 4 KPIs en una sola llamada rápida (<2s, RNF-03).
2. Integrar gráficos de barras y líneas con Chart.js para evolución de cosecha y consumos.
3. Exportación de tablas y gráficos a PDF y CSV.
4. Estructura opcional para cómputo de costos por lote (insumos + mano de obra + horas tractor, RF-M7-14).

## Criterios de Aceptación
- [ ] RF-M7-12: Tablero ejecutivo con los 4 indicadores esenciales visibles al ingresar.
- [ ] RF-M7-13: Gráficos interactivos responsive compatibles con exportación.

## Comments
