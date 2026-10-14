---
id: AGRUL-023
title: "AGRUL-023: Monitoreo de Campo (Síntomas/Plagas) y Edición/Anulación de Labores"
epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 3: Actividades"
labels: ["monitoreo", "auditoria", "fotos", "ready-for-agent"]
---

# AGRUL-023 — Monitoreo de Campo (Síntomas/Plagas) y Edición/Anulación de Labores

- **Épica:** Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas
- **Módulo:** Módulo 3: Actividades
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M3-10, RF-M3-11, RF-M3-12, RF-M3-13
- **Reglas de Negocio:** RN-05, RN-06
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Registro de observaciones de campo del productor (síntomas, plagas, fotos adjuntas) como disparador de tareas, y soporte de edición/anulación auditada de actividades con compensaciones.

## Tareas Técnicas
1. Crear tabla observacion_monitoreo (id, loteId, cicloId, fecha, sintomas, plagas, estadoCultivo, fotosUrls, usuarioId).
2. Vincular actividad correctiva a la observación que la motivó (RF-M3-10).
3. Implementar AnularActividadUseCase con baja lógica (RN-05) y motivo obligatorio.
4. Si la actividad anulada involucró consumo de insumos, coordinar la reversión de stock con Módulo 9 (RF-M3-12).

## Criterios de Aceptación
- [ ] RF-M3-11: Carga de observaciones de monitoreo con fotos adjuntas.
- [ ] RF-M3-10: Vínculo explícito entre actividad realizada y observación de monitoreo previa.
- [ ] RF-M3-12 / RN-05 / RN-06: Anulación conserva el registro original y revierte movimientos asociados.

## Comments
