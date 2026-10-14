---
id: AGRUL-047
title: "AGRUL-047: Integración de API de Clima para Lules, Pronósticos y Alertas Adversas"
epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 10: Clima"
labels: ["clima", "api-externa", "pronostico", "alertas", "ready-for-agent"]
---

# AGRUL-047 — Integración de API de Clima para Lules, Pronósticos y Alertas Adversas

- **Épica:** Épica 16: Módulo 10 — Información Agro-Meteorológica
- **Módulo:** Módulo 10: Clima
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M10-03, RF-M10-08, RF-M10-09, RF-M10-14
- **Skills:** .cursor/skills/architecture.md, .cursor/skills/api-contracts.md

## Descripción
Conexión automática a servicio meteorológico externo configurable por coordenadas GPS de la finca (Lules, Tucumán), captura de pronósticos a 5 días y motor de alertas tempranas configurables (heladas, vientos fuertes para pulverización).

## Tareas Técnicas
1. Crear adaptador de infraestructura para API meteorológica (Open-Meteo o similar sin costo para lat/lon de Lules).
2. Crear job programado para sincronización diaria de mediciones y pronósticos (RF-M10-03 / RF-M10-14).
3. Tabla alertas_climaticas_config (fincaId, variable, condicion: MAYOR_QUE | MENOR_QUE, umbral, destinatarios).
4. Disparar alerta en pantalla de inicio si el pronóstico o dato real quiebra el umbral configurado (RF-M10-09).

## Criterios de Aceptación
- [ ] RF-M10-03: Sincronización automática de clima según coordenadas de la finca.
- [ ] RF-M10-08 / RF-M10-09: Reglas de alerta configuradas por usuario activas y visibles en dashboard.
- [ ] RF-M10-14: Visualización de pronóstico extendido con advertencia temprana.

## Comments
