---
id: AGRUL-041
title: "AGRUL-041: Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["catalogo", "proveedores", "unidades", "conversiones", "ready-for-agent"]
---

# AGRUL-041 — Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M9-01, RF-M9-02, RF-M9-14
- **Reglas de Negocio:** RN-12
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Gestión de proveedores comerciales y sistema riguroso de unidades de medida (unidad de consumo vs unidad de compra) con tabla de equivalencias explícita (el sistema nunca convierte litros a kg sin densidad cargada, RN-12).

## Tareas Técnicas
1. Crear tabla proveedores (id, razonSocial, cuit, contacto, telefono, email).
2. Crear tabla insumo_unidades_equivalencia (insumoId, unidadCompra, unidadConsumo, factorMultiplicador, densidadKgL nullable).
3. Implementar convertidor de unidades de dominio que arroje UnidadConversionInvalidaError si no existe equivalencia registrada (RN-12 / RF-M9-14).

## Criterios de Aceptación
- [ ] RF-M9-01: Definición clara de unidad de compra (ej. bidón 20L) y unidad de consumo (ej. L o ml).
- [ ] RN-12 / RF-M9-14: Prohibida la conversión automática litros a kg salvo que exista densidad registrada para ese insumo.

## Comments
