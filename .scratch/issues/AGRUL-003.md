---
id: AGRUL-003
title: "AGRUL-003: Puertos de Persistencia y Esquema Drizzle ORM"
epic: "Épica 2: Casos de Uso & Persistencia Base"
status: resolved
priority: "Alta (P1)"
module: "Persistencia"
labels: ["database", "drizzle", "status:done"]
---

# AGRUL-003 — Puertos de Persistencia y Esquema Drizzle ORM

- **Épica:** Épica 2: Casos de Uso & Persistencia Base
- **Módulo:** Persistencia
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Reglas de Negocio:** RN-04, RN-05
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/architecture.md

## Descripción
Definir las interfaces de puertos de persistencia (LotesRepositoryPort, EventosRepositoryPort, GenealogiaRepositoryPort) y el esquema PostgreSQL con Drizzle ORM.

## Tareas Técnicas
1. Definir puertos en src/core/ports/.
2. Definir esquemas Drizzle con tipos estrictos e índices en src/infrastructure/persistence/drizzle/.
3. Implementar repositorios en memoria para testing.

## Criterios de Aceptación
- [x] Contratos de repositorios aislados en src/core/ports/.
- [x] Tablas lotes, eventos_trazabilidad y lote_genealogia tipadas con índices compuestos.
- [x] Repositorios en memoria (InMemory*) para testing unitario determinístico.

## Comments
