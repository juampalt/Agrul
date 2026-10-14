---
id: AGRUL-021
title: "AGRUL-021: Registro de Labores Ejecutadas y Consumo de Mano de Obra"
epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 3: Actividades"
labels: ["domain", "labores", "mano-de-obra", "ready-for-agent"]
---

# AGRUL-021 — Registro de Labores Ejecutadas y Consumo de Mano de Obra

- **Épica:** Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas
- **Módulo:** Módulo 3: Actividades
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M3-02, RF-M3-04, RF-M3-05, RF-M3-15
- **Reglas de Negocio:** RN-01, RN-03, RN-04, RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Registro de actividades de campo realizadas vinculadas a lote y ciclo productivo abierto, con superficie trabajada, maquinaria utilizada (horas de uso) y mano de obra (jornales/horas).

## Tareas Técnicas
1. Crear entidad ActividadAgricola (id, codigoActividad UK, tipoActividadId, loteId, cicloId, fechaHecho, horaNullable, usuarioCargaId, trabajadorResponsableId, superficieTrabajadaHa, observaciones, estado: REALIZADA).
2. Asociar maquinarias y horas en actividad_maquinaria.
3. Asociar mano de obra (jornales, cantidad personas, horas) en actividad_mano_obra.
4. Validar RN-01 (pertenece a finca/lote/ciclo), RN-03 (ciclo debe estar abierto) y RN-04 (fecha hecho <= hoy).

## Criterios de Aceptación
- [ ] RF-M3-02 / RN-01: Cada labor queda atada al lote y ciclo productivo abierto.
- [ ] RF-M3-04: Superficie trabajada toma por defecto la del ciclo si no se especifica.
- [ ] RF-M3-05 / RF-M3-15: Maquinaria con horas y mano de obra registradas correctamente.
- [ ] RN-04: La fecha del hecho no puede ser futura para actividades realizadas.

## Comments
