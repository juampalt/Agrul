---
id: AGRUL-037
title: "AGRUL-037: Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js"
epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas"
status: done
priority: "Media (P2)"
module: "Módulo 7: Indicadores"
labels: ["dashboard", "chartjs", "kpi", "status:done"]
---

# AGRUL-037 — Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js

- **Épica:** Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas
- **Módulo:** Módulo 7: Indicadores
- **Prioridad:** Media (P2)
- **Status:** done
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
- [x] RF-M7-12: Tablero ejecutivo con los 4 indicadores esenciales visibles al ingresar (lotes en producción, producción acumulada, alertas stock crítico/bajo, labores vencidas/próximas).
- [x] RF-M7-13: Gráficos interactivos responsive compatibles con exportación (Chart.js evolución mensual de cosechas, distribución de insumos en dona, rendimientos comparativos, exportación CSV con BOM UTF-8 y exportación PDF / impresión).
- [x] RF-M7-14: Desglose analítico de estructura de costos por lote (insumos + mano de obra jornalera + maquinaria tractor, costo total, costo/ha y costo/kg cosechado).
- [x] RNF-03: Tiempo de respuesta del dashboard consolidado inferior a 2s.

## Comments
Implementado exitosamente con:
- DTOs exhaustivos en `src/application/dtos/dashboard-resumen.dto.ts`.
- Caso de uso `ObtenerDashboardResumenUseCase` en `src/application/use-cases/obtener-dashboard-resumen.use-case.ts`:
  - KPI 1: Lotes en producción (lotes totales, activos, superficie total y en producción).
  - KPI 2: Producción acumulada (kilos brutos, netos comercializables, descarte y % de descarte, omitiendo cosechas anuladas).
  - KPI 3: Alertas de stock bajo de insumos clasificadas en `CRITICO`, `BAJO` y `NORMAL` según stock actual vs punto de reposición / stock mínimo.
  - KPI 4: Labores vencidas (calculando días de retraso) y labores próximas a vencer en 7 días.
  - Gráficos Chart.js: serie temporal mensual agregada de cosecha, distribución de insumos por categoría en dona y barras de rendimiento promedio por cultivo (kg/ha).
  - Estructura analítica de costos operacionales por lote: insumos + mano de obra (jornales) + maquinaria (horas tractor), con costo/ha y costo/kg cosechado.
- Validación con Zod Schema en `src/infrastructure/http/schemas/dashboard.schema.ts`.
- Controlador `DashboardController` y rutas `GET /api/v1/dashboard/resumen` y `GET /api/v1/dashboard` en Fastify.
- Inyección de dependencias en Fastify app container (`src/infrastructure/http/app.ts`).
- Frontend SPA (`public/index.html`, `public/app.css`, `public/app.js`):
  - Inclusión de Chart.js v4.4.2 desde CDN con lifecycle seguro (`chart.destroy()` antes de recrear).
  - Tablero ejecutivo con tarjetas interactivas de KPIs y paneles desplegables de alertas e incidentes vencidos.
  - Visualizaciones interactivas de evolución de cosecha (líneas), consumo por categoría (dona) y rendimiento (barras).
  - Tabla de costos operacionales por lote con desglose y métricas derivadas.
  - Exportación de resumen a CSV compatible con Excel (BOM UTF-8) y exportación a PDF vía `window.print()` con estilos optimizados en `@media print`.
- Suite completa de 7 pruebas unitarias (`tests/unit/application/obtener-dashboard-resumen.use-case.test.ts`) y pruebas de integración Fastify (`tests/integration/api.test.ts`) con 350 tests pasando (100% green).

