---
id: AGRUL-004
title: "AGRUL-004: Casos de Uso Nucleares: Alta, Eventos y Linaje"
epic: "Épica 2: Casos de Uso & Persistencia Base"
status: resolved
priority: "Alta (P1)"
module: "Aplicación"
labels: ["application", "use-cases", "status:done"]
---

# AGRUL-004 — Casos de Uso Nucleares: Alta, Eventos y Linaje

- **Épica:** Épica 2: Casos de Uso & Persistencia Base
- **Módulo:** Aplicación
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Reglas de Negocio:** RN-04, RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Orquestar la lógica de aplicación en casos de uso: CrearLoteUseCase, RegistrarEventoUseCase y ObtenerLinajeUseCase.

## Tareas Técnicas
1. Implementar DTOs tipados en src/application/dtos/.
2. Implementar casos de uso con persistencia atómica en src/application/use-cases/.
3. Crear tests de aplicación con repositorios en memoria.

## Criterios de Aceptación
- [x] DTOs tipados de entrada y salida en src/application/dtos/.
- [x] Rollback y rechazo ante transiciones de estado imposibles o lotes cerrados.
- [x] Tests unitarios de casos de uso pasando en Vitest (10 tests).

## Comments
