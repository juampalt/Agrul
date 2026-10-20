---
id: AGRUL-043
title: "AGRUL-043: Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: done
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["stock", "ledger", "idempotencia", "acid", "status:done"]
---

# AGRUL-043 — Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RN-10 / RNF-05: Todo cambio de stock es transaccional (ACID) y genera fila en stock_movimientos.
- [x] RN-11 / RF-M9-06: Reintentos con la misma clave de idempotencia no duplican movimientos.
- [x] RF-M9-07: Modificación de dosis revierte el movimiento anterior e inserta el nuevo ajustado.
- [x] RF-M9-13: Saldo de envases parcialmente abiertos llevado en unidad de consumo.

## Comments
- Entidad `StockMovimiento` con soporte de 7 tipos de movimientos y reglas de dominio.
- Prevención de dobles descuentos con `claveIdempotencia` única.
- Soporte de saldo negativo condicionado a justificación explícita (RF-M9-15).
- Reversión atómica compensatoria y ajuste de dosis de aplicaciones (RF-M9-07).
- Conteo de envases parcialmente abiertos en unidad de consumo (RF-M9-13).
- Endpoints REST `/api/v1/stock/movimientos`, `/revertir`, `/ajustar`, `/saldos/:insumoId`.
- Suite completa con 100% de tests unitarios y de integración pasando.
