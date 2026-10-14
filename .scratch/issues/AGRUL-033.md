---
id: AGRUL-033
title: "AGRUL-033: Emisión de Informes de Trazabilidad en PDF y Exportación CSV/Excel"
epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 6: Trazabilidad"
labels: ["pdf", "csv", "informes", "auditoria", "export", "ready-for-agent"]
---

# AGRUL-033 — Emisión de Informes de Trazabilidad en PDF y Exportación CSV/Excel

- **Épica:** Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales
- **Módulo:** Módulo 6: Trazabilidad
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M6-08, RF-M6-09, RF-M6-10, RF-M6-11, RF-M6-13
- **Reglas de Negocio:** RN-06
- **Skills:** .cursor/skills/api-contracts.md, .cursor/skills/architecture.md

## Descripción
Generación de documento formal PDF de trazabilidad para compradores y organismos de certificación (SENASA/GlobalG.A.P.) con ID de emisión, firma digital/usuario emisor, marca de anulaciones y exportación en UTF-8.

## Tareas Técnicas
1. Generar PDF estructurado con encabezado oficial, identificador único de informe, timestamp de emisión y usuario emisor (RF-M6-08).
2. Marcar claramente rectificaciones o eventos compensatorios históricos (RF-M6-09).
3. Filtro de privacidad (RF-M6-11 / RNF-14): omitir por defecto costos y datos de contacto de operarios.
4. Exportador a CSV/Excel con codificación UTF-8 y encabezados con unidades de medida (RNF-11).
5. Tabla informe_trazabilidad_log para registrar cada emisión (quién, cuándo, cuál, RF-M6-13).

## Criterios de Aceptación
- [ ] RF-M6-08: PDF generado en < 10s (RNF-03) con diseño profesional apto para auditoría.
- [ ] RF-M6-10 / RNF-11: Archivos CSV/Excel abren sin fallas de tildes o caracteres especiales en Excel.
- [ ] RF-M6-13: Bitácora inmutable de emisión de informes completada.

## Comments
