---
id: AGRUL-022
title: "AGRUL-022: Planificación de Actividades, Vencimientos y Workflow de Ejecución"
epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 3: Actividades"
labels: ["domain", "workflow", "planificacion", "ready-for-agent"]
---

# AGRUL-022 — Planificación de Actividades, Vencimientos y Workflow de Ejecución

- **Épica:** Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas
- **Módulo:** Módulo 3: Actividades
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M3-07, RF-M3-08, RF-M3-09, RF-M3-14
- **Reglas de Negocio:** RN-04, RN-13
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Ciclo de vida de actividades: PLANIFICADA -> REALIZADA, VENCIDA o CANCELADA. Una actividad planificada no impacta stock ni métricas hasta que se confirma como realizada.

## Tareas Técnicas
1. Permitir fecha prevista futura para estado PLANIFICADA (excepción de RN-04).
2. Implementar MarcarActividadRealizadaUseCase que completa datos reales y fecha efectiva de ejecución.
3. Lógica de cálculo dinámico de estado VENCIDA cuando fechaPrevista < hoy y sigue planificada.
4. Query para panel de inicio de actividades vencidas y próximas de los siguientes días (RF-M3-14).
5. Garantizar RN-13: actividades planificadas no descuentan stock ni computan en indicadores.

## Criterios de Aceptación
- [ ] RF-M3-07: Planificar tarea pendiente asignada a persona y fecha prevista.
- [ ] RF-M3-08 / RN-13: Marcar realizada actualiza fecha real y sólo en ese momento afecta indicadores.
- [ ] RF-M3-09: Manejo de estados PLANIFICADA, REALIZADA, VENCIDA y CANCELADA (con motivo obligatorio).
- [ ] RF-M3-14: Consulta rápida de pendientes vencidas y de próximos días.

## Comments
