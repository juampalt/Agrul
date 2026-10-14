---
id: AGRUL-045
title: "AGRUL-045: Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["fefo", "vencimientos", "ajustes", "inventario-fisico", "ready-for-agent"]
---

# AGRUL-045 — Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M9-10, RF-M9-11, RF-M9-12, RF-M9-16, RF-M9-17, RF-M9-20
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Sugerencia de lote de insumo más próximo a vencer (First Expired, First Out - FEFO), bloqueo de insumos vencidos para aplicación, registro de inventarios físicos con ajuste por diferencia y reporte valorizado de existencias.

## Tareas Técnicas
1. Algoritmo de sugerencia FEFO al consumir insumos con varios lotes (RF-M9-16).
2. Bloquear la selección de lotes de insumos cuya fecha de vencimiento ya expiró (RF-M9-10).
3. Implementar caso de uso RegistrarInventarioFisico: calcula diferencia y genera movimiento AJUSTE_FISICO con motivo (RF-M9-11).
4. Registrar mermas y pérdidas (robo, derrame, rotura) con motivo (RF-M9-12).
5. Emitir reporte de existencias valorizadas según precio de compra ponderado (RF-M9-20).

## Criterios de Aceptación
- [ ] RF-M9-10: Error si se intenta aplicar un insumo vencido.
- [ ] RF-M9-16: Sugerencia automática del lote que vence primero.
- [ ] RF-M9-11: Inventario físico auditado con permisos de Encargado o Administrador.

## Comments
