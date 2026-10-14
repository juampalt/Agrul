---
id: AGRUL-026
title: "AGRUL-026: Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas"
epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 4: Insumos y Aplicaciones"
labels: ["carencia", "seguridad-alimentaria", "advertencias", "ready-for-agent"]
---

# AGRUL-026 — Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas

- **Épica:** Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M4-08, RF-M4-09
- **Reglas de Negocio:** RN-14
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Servicio de dominio que evalúa aplicaciones previas en un lote y emite alertas no bloqueantes si una cosecha o labor de cosecha se registra dentro del período de carencia vigente.

## Tareas Técnicas
1. Implementar ServicioVerificacionCarencia: calcula fechaFinCarencia = fechaAplicacion + periodoCarenciaDias.
2. Emitir advertencia explícita en la respuesta si fechaCosecha < fechaFinCarencia (RF-M4-09 / RF-M5-11), sin bloquear la operación.
3. Vincular recomendación técnica (agrónomo emisor y documento PDF adjunto opcional, RF-M4-08).

## Criterios de Aceptación
- [ ] RF-M4-09 / RN-14: Devuelve warning claro indicando producto aplicado, días restantes de carencia y fecha segura.
- [ ] RF-M4-08: Posibilidad de adjuntar firma o documento de recomendación profesional.

## Comments
