---
id: AGRUL-009
title: "AGRUL-009: Generación de Migraciones SQL y Triggers de Inmutabilidad"
epic: "Épica 5: Infraestructura PostgreSQL & Migraciones"
status: ready-for-agent
priority: "Alta (P1)"
module: "Base de Datos"
labels: ["database", "postgres", "migrations", "ready-for-agent"]
---

# AGRUL-009 — Generación de Migraciones SQL y Triggers de Inmutabilidad

- **Épica:** Épica 5: Infraestructura PostgreSQL & Migraciones
- **Módulo:** Base de Datos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Reglas de Negocio:** RN-04, RN-05
- **Skills:** .cursor/skills/database-events.md

## Descripción
Generar migraciones SQL formales mediante Drizzle Kit y configurar trigger PL/pgSQL que bloquea UPDATE y DELETE sobre eventos_trazabilidad.

## Tareas Técnicas
1. Ejecutar npx drizzle-kit generate para emitir sentencias DDL iniciales.
2. Añadir migración custom del trigger trg_bloquear_mutacion_eventos.
3. Crear script npm run db:migrate y test de rechazo de mutación.

## Criterios de Aceptación
- [ ] Migraciones versionadas en drizzle/migrations/.
- [ ] Test automatizado contra PostgreSQL real que valide rechazo de UPDATE/DELETE con VIOLACION_DE_INMUTABILIDAD.
- [ ] Script de migración automatizado en package.json.

## Comments
