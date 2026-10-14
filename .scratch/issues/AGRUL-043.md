---
id: AGRUL-043
title: "AGRUL-043: Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["stock", "ledger", "idempotencia", "acid", "ready-for-agent"]
---

# AGRUL-043 — Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15
- **Reglas de Negocio:** RN-10, RN-11
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Libro mayor append-only de inventario (el stock nunca cambia sin movimiento, RN-10), clave única de idempotencia en formularios (RN-11 / RF-M9-06), compensación de movimientos ante edición/anulación y manejo de saldos negativos advertidos.

## Tareas Técnicas
1. Crear tabla stock_movimientos (id, insumoId, loteFabricacionId, tipoMovimiento: SALDO_INICIAL | INGRESO_COMPRA | SALIDA_CONSUMO | DEVOLUCION | PERDIDA | AJUSTE_FISICO | REVERSION, cantidad, unidadMedidaId, fecha, usuarioId, referenciaTipo, referenciaId, claveIdempotencia UK).
2. Implementar protección contra dobles descuentos mediante claveIdempotencia única por envío de formulario (RF-M9-06 / RN-11).
3. Implementar reversión atómica de movimientos al modificar o anular una aplicación de campo (RF-M9-07).
4. Si la salida excede el stock físico disponible, permitir continuar solo con justificación/motivo explícito marcando la diferencia (RF-M9-15).

## Criterios de Aceptación
- [ ] RN-10 / RNF-05: Todo cambio de stock es transaccional (ACID) y genera fila en stock_movimientos.
- [ ] RN-11 / RF-M9-06: Reintentos con la misma clave de idempotencia no duplican movimientos.
- [ ] RF-M9-07: Modificación de dosis revierte el movimiento anterior e inserta el nuevo ajustado.
- [ ] RF-M9-13: Saldo de envases parcialmente abiertos llevado en unidad de consumo.

## Comments
