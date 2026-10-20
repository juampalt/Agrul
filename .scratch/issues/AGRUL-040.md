---
id: AGRUL-040
title: "AGRUL-040: Bitácora Centralizada de Auditoría y Seguridad de Sesión"
epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría"
status: done
priority: "Alta (P1)"
module: "Módulo 8: Usuarios y Seguridad"
labels: ["audit-log", "session", "security", "status:done"]
---

# AGRUL-040 — Bitácora Centralizada de Auditoría y Seguridad de Sesión

- **Épica:** Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RF-M8-08 / RN-06: Cada cambio crítico queda registrado con su delta de valor previo y posterior.
- [x] RF-M8-09: Cierre automático de sesión tras tiempo de inactividad configurado.

## Comments
- Implementada la entidad de dominio `AuditoriaSeguridadLog` con validación estricta de acciones (`LOGIN`, `CREAR`, `EDITAR`, `ANULAR`, `EMITIR_REPORTE`, `BLOQUEO`, `DESBLOQUEO`, `CAMBIO_PASSWORD`), entidad, usuario y deltas inmutables (`valorPrevioJson`, `valorNuevoJson`).
- Implementado el puerto `IAuditoriaSeguridadRepository` e `InMemoryAuditoriaSeguridadRepository` con soporte para filtrado multidimensional y paginación.
- Creada la tabla Drizzle `auditoria_seguridad_log` con índices compuestos en `tables.ts`.
- Casos de uso de auditoría implementados y conectados en los flujos de creación, login, bloqueo por 5 intentos fallidos, modificación, y cambio de password en `usuarios.use-cases.ts`.
- Implementado el servicio `SessionInactivityService` y middleware `verificarInactividadSesion` con respuesta HTTP 401 `SESION_EXPIRADA_POR_INACTIVIDAD` ante inactividad superior al timeout configurable (15 min por defecto).
- Implementado el middleware `verificarPasswordInicial` con bloqueo HTTP 403 `PASSWORD_CAMBIO_OBLIGATORIO` para usuarios que requieran cambiar su contraseña inicial.
- Rutas REST `/api/v1/auditoria`, `/api/v1/auditoria/:id` y `/api/v1/auditoria/simular-inactividad` expuestas con control de acceso por rol y sobre estandarizado.
- Interfaz gráfica en dashboard con modal `#modal-auditoria-seguridad` (tabs de Bitácora con visor de deltas JSON, Control de Sesión con simulador, y Cambio de Contraseña Inicial).
- 410 tests pasando en la suite total (100% éxito) y 0 errores de TypeScript.
