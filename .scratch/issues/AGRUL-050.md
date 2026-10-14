---
id: AGRUL-050
title: "AGRUL-050: Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca"
epic: "Épica 17: Requisitos No Funcionales & Cumplimiento Normativo"
status: ready-for-agent
priority: "Alta (P1)"
module: "Transversal RNF"
labels: ["rnf", "localizacion", "compliance", "multi-tenant", "ready-for-agent"]
---

# AGRUL-050 — Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca

- **Épica:** Épica 17: Requisitos No Funcionales & Cumplimiento Normativo
- **Módulo:** Transversal RNF
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Reglas de Negocio:** RN-05
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/testing-quality.md

## Descripción
Configuración integral de localización: zona horaria obligatoria America/Argentina/Tucuman (UTC-3), formato dd/mm/aaaa, unidades métricas (kg, L, ha, °C, mm), política de no borrado físico por 3 años (BPA) y arquitectura multi-finca/productor.

## Tareas Técnicas
1. Configurar formateo de fechas y parsing estricto con zona horaria America/Argentina/Tucuman evitando corrimientos de día a las 23:30 (RNF-12).
2. Auditar esquema de persistencia para garantizar que toda entidad lleve fincaId u organizacionId (RNF-16).
3. Configurar reglas y políticas para impedir eliminación física (DELETE) de registros productivos antes de 3 años conforme manual de BPA (RNF-06 / RN-05).
4. Escribir test de regresión verificando que una carga a las 23:30 UTC-3 preserve la fecha correcta.

## Criterios de Aceptación
- [ ] RNF-12: Prueba de guardado a las 23:30 hs no altera la fecha del evento.
- [ ] RNF-06: Ningún endpoint de usuario admite DELETE físico sobre datos productivos históricos.
- [ ] RNF-16: Aislamiento estricto multi-finca preparado para soportar múltiples organizaciones.

## Comments
