---
id: AGRUL-048
title: "AGRUL-048: Contexto Climático en Labores, Eventos Adversos y Serie Histórica del Lote"
epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 10: Clima"
labels: ["clima", "series-temporales", "eventos-adversos", "ready-for-agent"]
---

# AGRUL-048 — Contexto Climático en Labores, Eventos Adversos y Serie Histórica del Lote

- **Épica:** Épica 16: Módulo 10 — Información Agro-Meteorológica
- **Módulo:** Módulo 10: Clima
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M10-07, RF-M10-10, RF-M10-11, RF-M10-12, RF-M10-13
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Exhibición automática de condiciones del día (lluvia 24h previa, viento) al registrar riego o pulverizaciones, registro de siniestros (helada, granizo con fotos y daño estimado) y superposición de actividades sobre la curva climática del ciclo.

## Tareas Técnicas
1. Endpoint contextual: GET /api/v1/fincas/:id/clima-contexto que devuelve lluvia últimas 24h, viento actual y temp para sugerir o advertir condiciones de pulverización (RF-M10-10).
2. Crear tabla eventos_climaticos_adversos (loteId, fecha, tipoSiniestro: HELADA | GRANIZO | CALOR_EXTREMO | INUNDACION, danoEstimadoPct, fotosUrls, descripcion) (RF-M10-11).
3. Calcular resumen climático del ciclo: lluvia acumulada en la campaña, días de helada registrados y temperaturas extremas (RF-M10-12).
4. Gráfico de serie temporal combinando temperatura, lluvia acumulada e hitos de labores/aplicaciones (RF-M10-07 / RF-M10-13).

## Criterios de Aceptación
- [ ] RF-M10-10: Información climática previa visible al operario durante la carga de aplicaciones.
- [ ] RF-M10-11: Registro fotográfico y volumétrico de siniestros de campo.
- [ ] RF-M10-12 / RF-M10-13: Gráfica climática integrada con los eventos del ciclo productivo.

## Comments
