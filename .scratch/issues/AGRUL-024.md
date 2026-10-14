---
id: AGRUL-024
title: "AGRUL-024: Catálogo de Insumos Fitosanitarios, Principios Activos y Carencias"
epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 4: Insumos y Aplicaciones"
labels: ["catalogo", "fitosanitarios", "carencia", "senasa", "ready-for-agent"]
---

# AGRUL-024 — Catálogo de Insumos Fitosanitarios, Principios Activos y Carencias

- **Épica:** Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M4-01, RF-M4-02
- **Reglas de Negocio:** RN-14
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Catálogo maestro de insumos categorizados (plantín/semilla, fertilizante, fitosanitario, enmienda, otro) con parámetros técnicos: principio activo, período de carencia (días), reingreso (horas) y registro SENASA.

## Tareas Técnicas
1. Crear tabla insumos_catalogo (id, nombreComercial, categoria: SEMILLA_PLANTIN | FERTILIZANTE | FITOSANITARIO | ENMIENDA | OTRO, unidadMedidaId, presentacion).
2. Crear tabla insumos_fitosanitarios_ficha (insumoId PK, principioActivo, periodoCarenciaDias, periodoReingresoHoras, nroRegistroSenasa, toxicologia).
3. Implementar RN-14: valores de carencia y reingreso se cargan tal como figuran en el rótulo comercial, sin valores por defecto inventados por el sistema.

## Criterios de Aceptación
- [ ] RF-M4-01: Catálogo estructurado con unidad de medida base y presentación comercial.
- [ ] RF-M4-02 / RN-14: Registro estricto de principio activo, carencia en días y reingreso en horas.
- [ ] Validaciones Zod de tipos y rangos numéricos.

## Comments
