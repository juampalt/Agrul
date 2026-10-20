---
id: AGRUL-041
title: "AGRUL-041: Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas"
epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock"
status: done
priority: "Alta (P1)"
module: "Módulo 9: Stock de Insumos"
labels: ["catalogo", "proveedores", "unidades", "conversiones", "status:done"]
---

# AGRUL-041 — Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas

- **Épica:** Épica 15: Módulo 9 — Inventario de Insumos y Stock
- **Módulo:** Módulo 9: Stock de Insumos
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RF-M9-01: Definición clara de unidad de compra (ej. bidón 20L) y unidad de consumo (ej. L o ml).
- [x] RN-12 / RF-M9-14: Prohibida la conversión automática litros a kg salvo que exista densidad registrada para ese insumo.

## Comments
- Implementada la entidad de dominio `Proveedor` con validación de razón social, CUIT, teléfono, dirección, email y estado activo.
- Implementada la entidad de dominio `InsumoUnidadEquivalencia` para mapear explícitamente unidades de compra y unidades de consumo mediante un factor multiplicador positivo y densidad opcional (`densidadKgL`).
- Implementado el servicio de dominio `ConversorUnidadesService` con cumplimiento estricto de la regla RN-12 (prohibida la conversión automática litros a kg sin densidad registrada para el insumo, arrojando `UnidadConversionInvalidaError`).
- Diseñadas y creadas las tablas Drizzle `proveedores` e `insumo_unidades_equivalencia` en `tables.ts` con índices de unicidad y búsqueda.
- Implementados los puertos `ProveedoresRepositoryPort` e `InsumoEquivalenciasRepositoryPort`, con sus implementaciones en memoria (`InMemoryProveedoresRepository` e `InMemoryInsumoEquivalenciasRepository`).
- Desarrollados casos de uso en `proveedores.use-cases.ts` y `insumo-equivalencias.use-cases.ts` con sus DTOs correspondientes.
- Expuestos los endpoints REST en `api.routes.ts`: `POST /proveedores`, `GET /proveedores`, `GET /proveedores/:id`, `PUT /proveedores/:id`, `POST /insumos/:id/equivalencias`, `GET /insumos/:id/equivalencias`, `POST /insumos/:id/convertir`, `POST /insumos/conversiones/convertir`.
- 455 tests pasando en verde (100% de la suite total) incluyendo 45 tests unitarios e integrados dedicados a este módulo.
