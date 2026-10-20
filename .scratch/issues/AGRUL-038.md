---
id: AGRUL-038
title: "AGRUL-038: Gestión de Usuarios, Autenticación y Control de Acceso por Finca"
epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría"
status: done
priority: "Alta (P1)"
module: "Módulo 8: Usuarios y Seguridad"
labels: ["auth", "security", "rbac", "fincas", "status:done"]
---

# AGRUL-038 — Gestión de Usuarios, Autenticación y Control de Acceso por Finca

- **Épica:** Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Prioridad:** Alta (P1)
- **Status:** done
- **Requisitos Funcionales:** RF-M8-01, RF-M8-02, RF-M8-03, RF-M8-04, RF-M8-05, RF-M8-10
- **Reglas de Negocio:** RN-16
- **Skills:** .cursor/skills/architecture.md, .cursor/skills/api-contracts.md

## Descripción
Sistema de autenticación y autorización con perfiles diferenciados (ADMINISTRADOR, ENCARGADO, OPERARIO, ASESOR_AGRONOMO), hashing seguro (Argon2/bcrypt), bloqueo por intentos fallidos y restricción por fincas asignadas.

## Tareas Técnicas
1. Crear tablas usuarios, perfiles_permisos y usuario_finca_asignacion.
2. Implementar autenticación con JWT / cookie segura, hash + salt y bloqueo temporal tras N intentos fallidos.
3. Middleware de autorización Fastify que verifica permisos del perfil y asignación de finca en cada request (RF-M8-05 / RN-16).
4. Soportar rol asesor agrónomo con permisos de solo lectura y carga de recomendaciones (RF-M8-10).

## Criterios de Aceptación
- [x] RF-M8-03 / RNF-04: Contraseñas con hash seguro y bloqueo tras intentos fallidos.
- [x] RF-M8-04 / RN-16: Operario solo accede a carga/consulta de sus tareas; Administrador a configuración total.
- [x] RF-M8-05: El usuario no puede visualizar ni operar fincas a las que no fue expresamente asignado.

## Comments
- Entidades de dominio `Usuario` y `UsuarioFinca` con soporte de roles (`ADMINISTRADOR`, `ENCARGADO`, `OPERARIO`, `ASESOR_AGRONOMO`), estados (`ACTIVO`, `INACTIVO`, `BLOQUEADO`), y bloqueo automático a los 5 intentos fallidos consecutivos.
- Servicio de seguridad criptográfica con hashing nativo PBKDF2-SHA512 (100.000 iteraciones + salt aleatorio de 16 bytes), verificación en tiempo constante, validación de complejidad de contraseña (RNF-04) y emisión/verificación de tokens JWT HMAC-SHA256.
- Tablas Drizzle `usuarios` y `usuario_finca_asignacion` con índices y claves foráneas.
- Casos de uso de autenticación, gestión y verificación de acceso a fincas, junto con schemas Zod estrictos y respuestas estandarizadas `{ success, data, error, timestamp }`.
- Middlewares Fastify `verificarAutenticacion`, `requerirRol`, `requerirAccesoFinca` y `requerirPermisoAgronomo`.
- Interfaz gráfica con modal de gestión de usuarios, visualización de fincas asignadas y simulador interactivo de aislamiento multi-finca.
- Suite de pruebas completa: 11 tests unitarios de entidad, 11 tests unitarios de casos de uso y 12 tests de integración (34 tests nuevos, 384 tests pasando en total).
