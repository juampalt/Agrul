---
id: AGRUL-017
title: "AGRUL-017: Catálogo de Cultivos, Variedades y Partidas de Plantines"
epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 2: Cultivos y Ciclos"
labels: ["domain", "catalogo", "cultivos", "plantines", "ready-for-agent"]
---

# AGRUL-017 — Catálogo de Cultivos, Variedades y Partidas de Plantines

- **Épica:** Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M2-01, RF-M2-04, RF-M2-05
- **Reglas de Negocio:** RN-01, RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Gestionar el catálogo de cultivos y variedades (ej. Frutilla: San Andreas, Camino Real con tipo fotoperiódico: día corto / neutro) y recepción de partidas de plantines con trazabilidad de origen.

## Tareas Técnicas
1. Crear entidades Cultivo, Variedad (con atributo fotoperíodo: DIA_CORTO, DIA_NEUTRO).
2. Crear entidad PartidaPlantines (codigoPartida UK, proveedorId, variedadId, fechaRecepcion, cantidadRecibida, cantidadRechazada, cantidadPlantada, origenMaterial: PROVEEDOR | PROPAGACION_LOCAL, cicloOrigenId).
3. Implementar endpoints REST /api/v1/cultivos, /variedades y /partidas-plantines.

## Criterios de Aceptación
- [ ] RF-M2-01: Catálogo configurable con variedades y tipo día corto/neutro.
- [ ] RF-M2-04: Origen trazable: partida de proveedor o bordos/propagación local referenciando ciclo previo.
- [ ] RF-M2-05 / RN-07: Código de partida único e inmutable, con cantidades recibida, rechazada y plantada.

## Comments
