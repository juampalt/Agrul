---
id: AGRUL-042
title: "AGRUL-042: Gestión de Ingresos por Compra y Segregación de Depósitos BPA"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: done
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["compras", "stock-inicial", "depositos", "bpa", "status:done"]
---

# AGRUL-042 — Gestión de Ingresos por Compra y Segregación de Depósitos BPA

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RF-M9-03: Ingreso registra proveedor, lote de fabricación y vencimiento.
- [x] RF-M9-19: Validación de depósito evitando almacenar fitosanitarios junto a fertilizantes conforme BPA.
- [x] RF-M9-05: Carga de saldo inicial genera movimiento auditado.

## Comments
- Implementado el dominio `DepositoAlmacenamiento` con reglas BPA estrictas de incompatibilidad fitosanitarios/fertilizantes y zona de vencidos.
- Implementadas entidades `IngresoCompraInsumo` y `StockInicialInsumo` con auditoría completa de usuario y fecha.
- Implementados casos de uso en capa de aplicación, DTOs y validaciones Zod.
- Expuestos endpoints REST con Fastify (`/api/v1/depositos`, `/api/v1/stock/ingresos-compra`, `/api/v1/stock/saldo-inicial`).
- Cobertura de tests unitarios y de integración al 100%.
