---
id: AGRUL-049
title: "AGRUL-049: Resiliencia Móvil Offline, Borradores Locales e Idempotencia en Cliente"
epic: "Épica 17: Requisitos No Funcionales & Cumplimiento Normativo"
status: ready-for-agent
priority: "Alta (P1)"
module: "Transversal RNF"
labels: ["rnf", "offline", "pwa", "idempotencia", "ready-for-agent"]
---

# AGRUL-049 — Resiliencia Móvil Offline, Borradores Locales e Idempotencia en Cliente

- **Épica:** Épica 17: Requisitos No Funcionales & Cumplimiento Normativo
- **Módulo:** Transversal RNF
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Reglas de Negocio:** RN-11
- **Skills:** .cursor/skills/api-contracts.md, .cursor/skills/architecture.md

## Descripción
Garantizar la operatividad en fincas rurales con conectividad intermitente: almacenamiento local en IndexedDB/LocalStorage, reintentos automáticos sin duplicación mediante claves UUIDv4 y diseño para pantallas de 360px.

## Tareas Técnicas
1. Implementar wrapper de almacenamiento local para guardar borradores de actividades/cosechas ante caída de red (RNF-02).
2. Generar clave única de idempotencia en frontend al abrir el formulario (RF-M9-06 / RN-11).
3. Sincronización en segundo plano con backoff exponencial al detectar restauración de conectividad.
4. Verificar diseño responsivo desde 360px de ancho con viewport móvil adecuado (RNF-09).

## Criterios de Aceptación
- [ ] RNF-02: Cortar la conexión durante el envío y reintentar no genera duplicados en la base de datos.
- [ ] RNF-09: Funcionalidad completa y testeada en Chrome móvil y Android estándar.
- [ ] RNF-01 / RNF-15: Experiencia de usuario optimizada para campo.

## Comments
