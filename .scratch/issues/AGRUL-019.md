---
id: AGRUL-019
title: "AGRUL-019: Cierre, Reapertura Auditada y Resumen Histórico de Campañas"
epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 2: Cultivos y Ciclos"
labels: ["domain", "ciclos", "auditoria", "ready-for-agent"]
---

# AGRUL-019 — Cierre, Reapertura Auditada y Resumen Histórico de Campañas

- **Épica:** Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M2-06, RF-M2-07, RF-M2-08, RF-M2-09
- **Reglas de Negocio:** RN-03, RN-04, RN-06
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Flujo de cierre formal de ciclo con motivo, bloqueo de nuevas operaciones en ciclo cerrado, reapertura exclusiva para Administrador con auditoría, y consulta de resumen consolidado.

## Tareas Técnicas
1. Implementar CerrarCicloUseCase con fechaFin y motivo (FIN_NORMAL, ABANDONO, PERDIDA_EVENTO).
2. Implementar ReabrirCicloUseCase con validación de rol ADMINISTRADOR, motivo obligatorio y log de auditoría (RN-03).
3. Crear query de resumen de ciclo: duración en días, total de actividades realizadas, volumen de insumos consumidos y total cosechado acumulado.
4. Consultas con filtros por cultivo, variedad y rango de fechas (RF-M2-08).

## Criterios de Aceptación
- [ ] RF-M2-06 / RN-03: Al cerrar el ciclo, queda bloqueado para nuevas actividades, aplicaciones y cosechas.
- [ ] RF-M2-07: Solo usuario con perfil Administrador puede reabrir un ciclo, requiriendo motivo auditado.
- [ ] RF-M2-09: Resumen del ciclo devuelve métricas exactas consolidadas.

## Comments
