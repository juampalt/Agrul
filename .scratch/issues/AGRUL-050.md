---
id: AGRUL-050
title: "AGRUL-050: Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca"
epic: "Épica 17: Requisitos No Funcionales & Cumplimiento Normativo"
status: closed
priority: "Alta (P1)"
module: "Transversal RNF"
labels: ["rnf", "localizacion", "compliance", "multi-tenant", "status:done"]
---

# AGRUL-050 — Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca

- **Épica:** Épica 17: Requisitos No Funcionales & Cumplimiento Normativo
- **Módulo:** Transversal RNF
- **Prioridad:** Alta (P1)
- **Status:** closed
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
- [x] RNF-12: Prueba de guardado a las 23:30 hs no altera la fecha del evento.
- [x] RNF-06: Ningún endpoint de usuario admite DELETE físico sobre datos productivos históricos.
- [x] RNF-16: Aislamiento estricto multi-finca preparado para soportar múltiples organizaciones.

## Comments
Implementado exitosamente con:
1. `LocalizacionTucumanService` con zona horaria `America/Argentina/Tucuman`, formato `dd/mm/aaaa`, catálogo de unidades métricas obligatorias y test de preservación a las 23:30 hs.
2. `PoliticaRetencionBpaService` y hook global en Fastify que intercepta sentencias HTTP `DELETE` retornando `405 Method Not Allowed` con código `DELETE_FISICO_PROHIBIDO_BPA`.
3. Migración SQL `0002_retencion_bpa_triggers.sql` con triggers PL/pgSQL bloqueando sentencias `DELETE` directas sobre datos productivos históricos.
4. Soporte multi-organización y multi-finca mediante `organizacionId` indexado en `fincasTable`, `usuariosTable` e `insumosCatalogoTable` junto al middleware `requerirAccesoOrganizacion`.
5. Suite completa de tests unitarios y de integración pasando con éxito al 100%.
