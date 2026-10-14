---
id: AGRUL-010
title: "AGRUL-010: Entorno Docker Compose para PostgreSQL Local"
epic: "Épica 5: Infraestructura PostgreSQL & Migraciones"
status: resolved
priority: "Media (P2)"
module: "Infraestructura"
labels: ["docker", "postgres", "status:done"]
---

# AGRUL-010 — Entorno Docker Compose para PostgreSQL Local

- **Épica:** Épica 5: Infraestructura PostgreSQL & Migraciones
- **Módulo:** Infraestructura
- **Prioridad:** Media (P2)
- **Status:** resolved
- **Skills:** .cursor/skills/architecture.md

## Descripción
Proveer un docker-compose.yml para levantar PostgreSQL 16 con extensiones y variables de entorno configuradas.

## Tareas Técnicas
1. Configurar docker-compose.yml con postgres:16-alpine.
2. Configurar healthcheck y volúmenes persistentes.
3. Documentar .env.example.

## Criterios de Aceptación
- [x] docker compose up -d inicializa agrul_db en puerto 5432.
- [x] Healthcheck configurado y validado.
- [x] .env.example documentado.

## Comments
