---
id: AGRUL-035
title: "AGRUL-035: Cálculo de Rendimiento por Hectárea, Descarte y Métricas de Producción"
epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 7: Indicadores"
labels: ["indicadores", "analytics", "rendimiento", "ready-for-agent"]
---

# AGRUL-035 — Cálculo de Rendimiento por Hectárea, Descarte y Métricas de Producción

- **Épica:** Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas
- **Módulo:** Módulo 7: Indicadores
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M7-01, RF-M7-02, RF-M7-07, RF-M7-08, RF-M7-09
- **Reglas de Negocio:** RN-09
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Cálculos analíticos automáticos: producción total cosechada y comercializable por finca/lote/cultivo/ciclo, rendimiento en kg/ha, % de descarte, conteo de labores y tasa de prendimiento de plantines.

## Tareas Técnicas
1. Crear servicio de cálculo de rendimiento = totalKgCosechados / superficieHa.
2. Calcular porcentajeDescarte = (cantidadDescarteKg / cantidadCosechadaTotalKg) * 100.
3. Contabilizar actividades por categoría en cada ciclo (preparación, riego, fertilización, etc.).
4. Calcular prendimiento y reposición de plantas = (plantasVivas / plantasPlantadas) * 100 (RF-M7-09).

## Criterios de Aceptación
- [ ] RF-M7-01 / RF-M7-02: Rendimiento kg/ha exacto por lote y ciclo.
- [ ] RF-M7-07: Porcentaje de descarte calculado por cosecha y consolidado por ciclo.
- [ ] RF-M7-08 / RF-M7-09: Métricas agregadas disponibles vía API REST.

## Comments
