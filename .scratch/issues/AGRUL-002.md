---
id: AGRUL-002
title: "AGRUL-002: Entidades Centrales y Value Objects del Dominio"
epic: "Épica 1: Núcleo de Dominio & Tooling"
status: resolved
priority: "Alta (P1)"
module: "Core"
labels: ["domain", "traceability", "status:done"]
---

# AGRUL-002 — Entidades Centrales y Value Objects del Dominio

- **Épica:** Épica 1: Núcleo de Dominio & Tooling
- **Módulo:** Core
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Reglas de Negocio:** RN-07
- **Skills:** .cursor/skills/domain-traceability.md

## Descripción
Implementar las entidades de dominio puro sin dependencias de frameworks: Lote, TraceEvent, LoteGenealogia, CodigoLote, TipoEvento, MaquinaEstadosLote y jerarquía de DomainError.

## Tareas Técnicas
1. Crear entidades de dominio en src/core/domain/entities/.
2. Implementar Value Objects y validaciones en src/core/domain/value-objects/.
3. Codificar suite de tests unitarios de dominio en Vitest.

## Criterios de Aceptación
- [x] TraceEvent es inmutable y requiere eventoReferenciadoId en compensaciones.
- [x] Lote controla su ciclo de vida y balance de masa disponible.
- [x] LoteGenealogia prohíbe ciclos de auto-paternidad.
- [x] 15 tests unitarios de dominio pasando en verde con Vitest.

## Comments
