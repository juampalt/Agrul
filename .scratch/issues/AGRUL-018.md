---
id: AGRUL-018
title: "AGRUL-018: Apertura, Multivariedad y Planificación de Ciclos Productivos"
epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 2: Cultivos y Ciclos"
labels: ["domain", "ciclos", "use-case", "ready-for-agent"]
---

# AGRUL-018 — Apertura, Multivariedad y Planificación de Ciclos Productivos

- **Épica:** Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M2-02, RF-M2-03, RF-M2-10
- **Reglas de Negocio:** RN-01, RN-02, RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Apertura y planificación de ciclos productivos en un lote, admitiendo múltiples variedades con su superficie o número de plantas, garantizando la regla de máximo un ciclo abierto por lote.

## Tareas Técnicas
1. Crear entidad CicloProductivo (id, codigoCiclo UK, loteId, cultivoId, estado: PLANIFICADO | ABIERTO | CERRADO, fechaInicio, fechaFin, superficieCultivadaHa, fechaEstimadaInicio).
2. Crear entidad CicloVariedad (cicloId, variedadId, partidaPlantinesId, superficieHa, cantidadPlantas).
3. Validar invariante RN-02: rechazar apertura de ciclo si el lote ya cuenta con un ciclo en estado ABIERTO.
4. Implementar casos de uso PlanificarCicloFuturo y AbrirCicloProductivo.

## Criterios de Aceptación
- [ ] RF-M2-02 / RN-02: Apertura valida que el lote no tenga otro ciclo abierto simultáneamente.
- [ ] RF-M2-03: Posibilidad de vincular múltiples variedades y partidas dentro del mismo ciclo.
- [ ] RF-M2-10: Soporte para crear ciclo en estado PLANIFICADO y activarlo a ABIERTO posteriormente.
- [ ] RN-07: Código de ciclo generado por el sistema y no editable.

## Comments
