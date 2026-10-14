---
id: AGRUL-001
title: "AGRUL-001: Configuración de Tooling, TypeScript y Sistema de Skills"
epic: "Épica 1: Núcleo de Dominio & Tooling"
status: resolved
priority: "Alta (P1)"
module: "Core"
labels: ["core", "tooling", "status:done"]
---

# AGRUL-001 — Configuración de Tooling, TypeScript y Sistema de Skills

- **Épica:** Épica 1: Núcleo de Dominio & Tooling
- **Módulo:** Core
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Skills:** .cursorrules, .cursor/skills/architecture.md

## Descripción
Inicializar el entorno de desarrollo con Node.js ESM, TypeScript estricto, Vitest y la estructura modular de skills de Matt Pocock.

## Tareas Técnicas
1. Configurar package.json con dependencias productivas y de testing.
2. Configurar tsconfig.json con resolución NodeNext y path aliases.
3. Crear suite de skills en .cursor/skills/.

## Criterios de Aceptación
- [x] package.json configurado con fastify, drizzle-orm, zod, pg, vitest, tsx, typescript.
- [x] tsconfig.json con resolución NodeNext y aliases @core/*, @app/*, @infra/*.
- [x] Suite de skills creadas en .cursor/skills/ con triggers y formato canónico.

## Comments
