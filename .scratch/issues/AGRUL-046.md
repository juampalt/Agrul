---
id: AGRUL-046
title: "AGRUL-046: Registro Manual e Importación CSV de Datos Climáticos de Finca"
epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica"
status: ready-for-agent
priority: "Media (P2)"
module: "Módulo 10: Clima"
labels: ["clima", "meteorologia", "csv", "registro", "ready-for-agent"]
---

# AGRUL-046 — Registro Manual e Importación CSV de Datos Climáticos de Finca

- **Épica:** Épica 16: Módulo 10 — Información Agro-Meteorológica
- **Módulo:** Módulo 10: Clima
- **Prioridad:** Media (P2)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M10-01, RF-M10-02, RF-M10-04, RF-M10-05, RF-M10-06
- **Reglas de Negocio:** RN-04, RN-06
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Carga manual diaria e importación masiva por archivo CSV de datos de estaciones meteorológicas propias: temperaturas (min/max), precipitación (mm), humedad relativa, velocidad de viento, heladas y granizo con validación física estricta.

## Tareas Técnicas
1. Crear tabla mediciones_meteorologicas (id, fincaId, fecha, tempMinC, tempMaxC, precipitacionMm, humedadRelativaPct, vientoKmH, huboHelada, huboGranizo, fuenteDato: MEDICION_PROPIA | ESTACION_PROPIA | SERVICIO_EXTERNO | DATO_ZONA, observaciones).
2. Validaciones de integridad física (RF-M10-05): humedad entre 0 y 100%, precipitación >= 0, tempMin <= tempMax.
3. Parser e importador de archivos CSV para estaciones automáticas locales (RF-M10-04).
4. Inmutabilidad histórica (RF-M10-06): datos importados no se sobreescriben; correcciones generan nuevo registro auditado con motivo.

## Criterios de Aceptación
- [ ] RF-M10-01 / RF-M10-02: Registro manual diario con fuente de datos guardada.
- [ ] RF-M10-05: Rechazo inmediato ante datos físicamente inválidos (ej. humedad negativa o lluvia negativa).
- [ ] RF-M10-04: Carga batch vía CSV validada.

## Comments
