---
id: AGRUL-006
title: "AGRUL-006: Rutas API v1 e Ingesta Batch Offline"
epic: "Épica 3: API REST Fastify & Integración"
status: resolved
priority: "Alta (P1)"
module: "API REST"
labels: ["api", "endpoints", "batch", "status:done"]
---

# AGRUL-006 — Rutas API v1 e Ingesta Batch Offline

- **Épica:** Épica 3: API REST Fastify & Integración
- **Módulo:** API REST
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Reglas de Negocio:** RN-04
- **Skills:** .cursor/skills/api-contracts.md, .cursor/skills/testing-quality.md

## Descripción
Exponer endpoints REST en /api/v1/ para health, lotes, eventos, linaje e ingesta masiva offline (sincronizar batch de hasta 500 items).

## Tareas Técnicas
1. Crear controladores y rutas en src/infrastructure/http/.
2. Implementar endpoint batch POST /api/v1/eventos/sincronizar.
3. Escribir tests de integración HTTP con app.inject().

## Criterios de Aceptación
- [x] Endpoints /health, /lotes, /lotes/:id/eventos, /lotes/:id/linaje y /eventos/sincronizar operativos.
- [x] Tests de integración HTTP con app.inject() verificando contratos y códigos de estado.
- [x] Total acumulado de 31 tests pasando al 100%.

## Comments
