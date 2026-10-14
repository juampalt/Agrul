---
id: AGRUL-040
title: "AGRUL-040: Bitácora Centralizada de Auditoría y Seguridad de Sesión"
epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 8: Usuarios y Seguridad"
labels: ["audit-log", "session", "security", "ready-for-agent"]
---

# AGRUL-040 — Bitácora Centralizada de Auditoría y Seguridad de Sesión

- **Épica:** Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M8-08, RF-M8-09
- **Reglas de Negocio:** RN-06
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/architecture.md

## Descripción
Registro inmutable de auditoría para ingresos, altas, modificaciones (con valor previo), bajas lógicas y emisión de reportes, junto con expiración de sesión por inactividad y cambio obligatorio de password inicial.

## Tareas Técnicas
1. Crear tabla auditoria_seguridad_log (id, usuarioId, accion: LOGIN | CREAR | EDITAR | ANULAR | EMITIR_REPORTE, entidad, entidadId, valorPrevioJson, valorNuevoJson, ip, userAgent, timestamp).
2. Configurar timeout de inactividad configurable en sesión (RF-M8-09).
3. Forzar flag debeCambiarPassword en primer ingreso del usuario.

## Criterios de Aceptación
- [ ] RF-M8-08 / RN-06: Cada cambio crítico queda registrado con su delta de valor previo y posterior.
- [ ] RF-M8-09: Cierre automático de sesión tras tiempo de inactividad configurado.

## Comments
