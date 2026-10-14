---
id: AGRUL-030
title: "AGRUL-030: Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 5: Cosecha y Destino"
labels: ["cosecha", "auditoria", "incidentes", "perdidas", "ready-for-agent"]
---

# AGRUL-030 — Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M5-11, RF-M5-12, RF-M5-14
- **Reglas de Negocio:** RN-05, RN-06, RN-14
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Validación de carencia al momento de cosechar, circuito de corrección/anulación con motivo y auditoría sin borrado físico, y registro de pérdidas/incidentes climáticos en cosecha.

## Tareas Técnicas
1. Integrar ServicioVerificacionCarencia en el endpoint de cosecha para emitir advertencia si hay carencia vigente (RF-M5-11).
2. Implementar AnularCosechaUseCase y ModificarCosechaUseCase preservando histórico de cambios (RN-05, RN-06).
3. Crear tabla perdida_cosecha (cosechaId/loteId, fecha, tipo: GRANIZO | HELADA | ROBO | OTROS, cantidadEstimadaKg, descripcion).

## Criterios de Aceptación
- [ ] RF-M5-11: Notificación clara si la fecha de cosecha viola un período de carencia.
- [ ] RF-M5-12: Corrección o anulación registra usuario, fecha anterior y motivo sin DELETE físico.
- [ ] RF-M5-14: Registro de incidentes con estimación de volumen afectado.

## Comments
