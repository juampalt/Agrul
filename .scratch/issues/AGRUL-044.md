---
id: AGRUL-044
title: "AGRUL-044: Stock Mínimo Configurable, Stock Reservado y Alertas de Reposición"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["alertas", "stock-minimo", "reposicion", "ready-for-agent"]
---

# AGRUL-044 — Stock Mínimo Configurable, Stock Reservado y Alertas de Reposición

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M9-08, RF-M9-09, RF-M9-18
- **Reglas de Negocio:** RN-13
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Definición de stock crítico/mínimo por insumo sin defaults, cálculo de stock disponible = físico - reservado (actividades planificadas futuras) y despacho de alertas visuales y por correo.

## Tareas Técnicas
1. Agregar campo stockMinimoConfigurable a insumos (sin valores precargados arbitrarios, RF-M9-08).
2. Calcular stockReservado sumando insumos previstos en actividades con estado PLANIFICADA (RF-M9-18 / RN-13).
3. Calcular stockDisponible = stockFisico - stockReservado.
4. Emitir alertas de reposición cuando stockDisponible <= stockMinimoConfigurable en pantalla principal y notificaciones (RF-M9-09).

## Criterios de Aceptación
- [ ] RF-M9-08 / RF-M9-09: Alerta visual inmediata en dashboard ante quiebre de stock mínimo.
- [ ] RF-M9-18: Stock reservado bloquea insumos comprometidos en tareas planificadas sin descontarlos antes de tiempo.

## Comments
