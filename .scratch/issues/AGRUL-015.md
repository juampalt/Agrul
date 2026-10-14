---
id: AGRUL-015
title: "AGRUL-015: Subdivisión de Lotes, Estados Operativos y Análisis de Suelo"
epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 1: Fincas y Lotes"
labels: ["domain", "lotes", "suelos", "estados", "ready-for-agent"]
---

# AGRUL-015 — Subdivisión de Lotes, Estados Operativos y Análisis de Suelo

- **Épica:** Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos
- **Módulo:** Módulo 1: Fincas y Lotes
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M1-04, RF-M1-05, RF-M1-06, RF-M1-07, RF-M1-08, RF-M1-09
- **Reglas de Negocio:** RN-02, RN-05, RN-06, RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Gestión de lotes dentro de una finca: división, estados operativos (en producción, en preparación, en descanso), historial de cambios de estado, características edáficas y usos previos.

## Tareas Técnicas
1. Extender entidad Lote con fincaId, nombre/numero, superficieHa, estadoLote (EN_PRODUCCION, EN_PREPARACION, EN_DESCANSO), usosPrevios.
2. Crear entidad/tabla lote_analisis_suelo (loteId, textura, ph, materiaOrganica, salinidad, unidad, fechaAnalisis, fuente).
3. Implementar máquina de estados de lote con historial inmutable de transiciones con fecha y usuario (RF-M1-08).
4. Restringir baja lógica y modificación si tiene ciclos productivos abiertos (RF-M1-05 / RN-02).

## Criterios de Aceptación
- [ ] RF-M1-04 / RN-07: Identificador único de lote autogenerado, irrepetible e ineditable.
- [ ] RF-M1-05: Modificación/baja lógica bloqueada si tiene ciclo abierto.
- [ ] RF-M1-06: Registro opcional de parámetros de suelo con unidad, fecha y fuente.
- [ ] RF-M1-07 / RF-M1-08: Transición de estados auditada con fecha y usuario.
- [ ] RF-M1-09: Soporte para registrar historial de usos previos al sistema.

## Comments
