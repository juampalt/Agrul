---
id: AGRUL-020
title: "AGRUL-020: Catálogos de Tipos de Actividad, Personal, Cuadrillas y Maquinaria"
epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 3: Actividades"
labels: ["catalogo", "actividades", "personal", "maquinaria", "ready-for-agent"]
---

# AGRUL-020 — Catálogos de Tipos de Actividad, Personal, Cuadrillas y Maquinaria

- **Épica:** Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas
- **Módulo:** Módulo 3: Actividades
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M3-01, RF-M3-03, RF-M3-05, RF-M3-06
- **Reglas de Negocio:** RN-01
- **Skills:** .cursor/skills/architecture.md, .cursor/skills/database-events.md

## Descripción
Catálogos configurables sin tocar código (RNF-13) para labores (preparación, siembra, riego, fertilización, control malezas/plagas, monitoreo, etc.), personal/cuadrillas y maquinaria agrícola.

## Tareas Técnicas
1. Crear tabla tipo_actividad_catalogo con valores iniciales configurables.
2. Crear tabla personal_cuadrilla (id, nombre, tipo: INDIVIDUAL | CUADRILLA, usuarioId nullable, activo).
3. Crear tabla maquinaria_catalogo (id, identificacion, tipo, condicion: PROPIO | ALQUILADO | SERVICIO_CONTRATADO, activo).
4. Endpoints CRUD para cada catálogo.

## Criterios de Aceptación
- [ ] RF-M3-01: Catálogo configurable con tipos estándar precargados.
- [ ] RF-M3-03: Registro de trabajadores/cuadrillas asociados opcionalmente a un usuario del sistema.
- [ ] RF-M3-06: Catálogo de maquinaria con condición (propio, alquilado, servicio contratado).

## Comments
