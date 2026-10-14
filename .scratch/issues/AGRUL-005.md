---
id: AGRUL-005
title: "AGRUL-005: Schemas Zod, Error Handler y Factoría Fastify"
epic: "Épica 3: API REST Fastify & Integración"
status: resolved
priority: "Alta (P1)"
module: "API REST"
labels: ["api", "fastify", "zod", "status:done"]
---

# AGRUL-005 — Schemas Zod, Error Handler y Factoría Fastify

- **Épica:** Épica 3: API REST Fastify & Integración
- **Módulo:** API REST
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Skills:** .cursor/skills/api-contracts.md

## Descripción
Configurar el servidor Fastify v5 con validación Zod (fastify-type-provider-zod) y middleware centralizado de errores con Envelope Pattern.

## Tareas Técnicas
1. Configurar Fastify con fastify-type-provider-zod.
2. Crear middleware de manejo centralizado de DomainError y ZodError.
3. Implementar factoría buildApp desacoplada para testing.

## Criterios de Aceptación
- [x] Formato estándar de respuesta { success, data, error, timestamp } en todos los endpoints.
- [x] Mapeo de errores de negocio a HTTP 422 y sintácticos a HTTP 400 con array details.
- [x] Factoría buildApp desacoplada para inyección de dependencias en tests.

## Comments
