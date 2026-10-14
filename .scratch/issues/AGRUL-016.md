---
id: AGRUL-016
title: "AGRUL-016: Búsqueda Filtrada, Polígonos Geográficos y Ficha Imprimible de Lote"
epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 1: Fincas y Lotes"
labels: ["api", "geo", "print", "ready-for-agent"]
---

# AGRUL-016 — Búsqueda Filtrada, Polígonos Geográficos y Ficha Imprimible de Lote

- **Épica:** Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos
- **Módulo:** Módulo 1: Fincas y Lotes
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M1-10, RF-M1-11, RF-M1-12
- **Skills:** .cursor/skills/api-contracts.md, .cursor/skills/architecture.md

## Descripción
Endpoints y vistas para listar fincas/lotes con filtros combinados, almacenamiento de coordenadas/polígonos (GeoJSON) y generación de ficha imprimible para señalética de campo.

## Tareas Técnicas
1. Endpoint GET /api/v1/fincas y GET /api/v1/lotes con filtros combinados por estado, finca y rango de superficie.
2. Almacenar polígono/coordenadas GPS del lote en formato GeoJSON.
3. Generar endpoint o vista para exportar ficha técnica imprimible con código QR y datos para señalética de campo (RF-M1-11).

## Criterios de Aceptación
- [ ] RF-M1-10: Listado veloz (< 2s, RNF-03) con filtros por estado, finca y superficie.
- [ ] RF-M1-11: Vista/PDF imprimible con código legible y QR para colocar en cartel de cabecera de lote.
- [ ] RF-M1-12: Coordenadas o polígono almacenados y validados correctamente.

## Comments
