---
id: AGRUL-026
title: "AGRUL-026: Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas"
epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo"
status: done
priority: "Alta (P1)"
module: "Módulo 4: Insumos y Aplicaciones"
labels: ["carencia", "seguridad-alimentaria", "advertencias", "status:done"]
---

# AGRUL-026 — Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas

- **Épica:** Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RF-M4-09 / RN-14: Devuelve warning claro indicando producto aplicado, días restantes de carencia y fecha segura.
- [x] RF-M4-08: Posibilidad de adjuntar firma o documento de recomendación profesional.

## Comments
Implementado exitosamente con:
- Entidad `RecomendacionTecnica` para vincular agrónomo emisor, matrícula, firma digital y documento PDF opcional (RF-M4-08).
- Soporte de `recomendacionTecnica` en `AplicacionAgricola`, schemas Zod y base de datos con columna `recomendacion_tecnica` JSONB.
- Servicio de Dominio puro `ServicioVerificacionCarencia`:
  - Cálculo de `fechaFinCarencia = fechaAplicacion + periodoCarenciaDias` y `fechaFinReingreso = fechaHoraAplicacion + periodoReingresoHoras` (RN-14).
  - Cálculo dinámico de días/horas restantes y determinación de la fecha segura de cosecha más restrictiva del lote.
  - Alertas no bloqueantes con producto comercial, principio activo, SENASA, días restantes y mensaje claro de advertencia de seguridad alimentaria.
- Caso de uso `VerificarCarenciaLoteUseCase` e integración en `AplicacionesController`.
- Endpoints REST Fastify:
  - `GET /api/v1/lotes/:id/carencia`
  - `GET /api/v1/aplicaciones/carencia/lote/:id` (alias)
- Suite completa de tests unitarios y de integración pasando al 100% (182 tests en total).
