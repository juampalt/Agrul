---
id: AGRUL-042
title: "AGRUL-042: Gestión de Ingresos por Compra y Segregación de Depósitos BPA"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["compras", "stock-inicial", "depositos", "bpa", "ready-for-agent"]
---

# AGRUL-042 — Gestión de Ingresos por Compra y Segregación de Depósitos BPA

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M9-03, RF-M9-05, RF-M9-19
- **Reglas de Negocio:** RN-10
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Registro de compras con comprobantes, lote de fabricación, vencimiento y ubicación en depósito físico (separando fertilizantes de fitosanitarios y vencidos conforme manual BPA), y carga de saldo inicial.

## Tareas Técnicas
1. Crear tabla deposito_almacenamiento (id, fincaId, nombre, tipoPermitido: FITOSANITARIOS | FERTILIZANTES | INSUMOS_GENERALES | ZONA_VENCIDOS).
2. Crear caso de uso RegistrarIngresoCompra (insumoId, proveedorId, cantidad, loteFabricacion, fechaVencimiento, depositoId, nroFacturaRemito, comprobanteAdjunto).
3. Crear caso de uso CargarStockInicial (RF-M9-05) que crea el movimiento inicial de implantación del sistema.

## Criterios de Aceptación
- [ ] RF-M9-03: Ingreso registra proveedor, lote de fabricación y vencimiento.
- [ ] RF-M9-19: Validación de depósito evitando almacenar fitosanitarios junto a fertilizantes conforme BPA.
- [ ] RF-M9-05: Carga de saldo inicial genera movimiento auditado.

## Comments
