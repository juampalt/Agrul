---
id: AGRUL-014
title: "AGRUL-014: Modelo de Dominio y Gestión de Fincas con Control de Superficie"
epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 1: Fincas y Lotes"
labels: ["domain", "fincas", "crud", "ready-for-agent"]
---

# AGRUL-014 — Modelo de Dominio y Gestión de Fincas con Control de Superficie

- **Épica:** Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos
- **Módulo:** Módulo 1: Fincas y Lotes
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M1-01, RF-M1-02, RF-M1-03
- **Reglas de Negocio:** RN-05, RN-06, RN-15, RN-16
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Implementar la entidad Finca, persistencia y casos de uso de alta, modificación con auditoría de valores anteriores y baja lógica condicionada a ausencia de ciclos abiertos.

## Tareas Técnicas
1. Crear entidad Finca (id, nombre, ubicacion: {localidad, departamento, provincia}, superficieTotalHa, responsableId, renspa, coordenadas).
2. Validar invariante RN-15: la suma de superficies de los lotes no puede exceder la superficie de la finca.
3. Implementar casos de uso RegistrarFinca, ModificarFinca (con auditoría de cambios RN-06) y DarDeBajaFinca (baja lógica RN-05 bloqueada si hay ciclos abiertos RF-M1-03).
4. Exponer endpoints REST en /api/v1/fincas con validación Zod.

## Criterios de Aceptación
- [ ] RF-M1-01: Finca registra nombre, localidad, depto, provincia, superficie en ha, responsable, y opcionales RENSPA y coords.
- [ ] RF-M1-02 / RN-06: Modificaciones guardan histórico del valor anterior.
- [ ] RF-M1-03 / RN-05: Baja lógica rechazada con HTTP 422 si la finca posee ciclos productivos abiertos.
- [ ] RN-15: Error de validación si la superficie de lotes supera la superficie declarada de la finca.

## Comments
