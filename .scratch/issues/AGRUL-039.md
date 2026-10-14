---
id: AGRUL-039
title: "AGRUL-039: Atribución Automática Inalterable y Diferenciación de Ejecutor vs Cargador"
epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 8: Usuarios y Seguridad"
labels: ["auditoria", "atribucion", "seguridad", "ready-for-agent"]
---

# AGRUL-039 — Atribución Automática Inalterable y Diferenciación de Ejecutor vs Cargador

- **Épica:** Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M8-06, RF-M8-07
- **Reglas de Negocio:** RN-04
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Registro automático e inalterable del usuario autenticado que cargó el registro en base de datos, diferenciándolo del trabajador de campo que realizó materialmente la tarea.

## Tareas Técnicas
1. Inyectar usuarioCargaId automáticamente desde el contexto de la sesión autenticada en todos los casos de uso.
2. Prohibir que el payload del cliente sobreescriba el usuarioCargaId (RN-04 / RF-M8-06).
3. Permitir campo trabajadorEjecutorId separado para reflejar cuando el encargado pasa labores registradas en papel por operarios (RF-M8-07).

## Criterios de Aceptación
- [ ] RF-M8-06 / RN-04: usuarioCargaId siempre corresponde al usuario autenticado y es inalterable.
- [ ] RF-M8-07: Claridad total entre quién ingresó el dato al sistema y quién ejecutó la labor en el lote.

## Comments
