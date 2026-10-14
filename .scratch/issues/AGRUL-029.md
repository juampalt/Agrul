---
id: AGRUL-029
title: "AGRUL-029: Asignación de Destinos, Saldo Comercializable y Despachos BPA"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 5: Cosecha y Destino"
labels: ["despachos", "destinos", "bpa", "remito", "ready-for-agent"]
---

# AGRUL-029 — Asignación de Destinos, Saldo Comercializable y Despachos BPA

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M5-07, RF-M5-08, RF-M5-09, RF-M5-10
- **Reglas de Negocio:** RN-09
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Distribución de la fruta comercializable a uno o múltiples destinos (industria, mercado fresco, venta directa), control de saldo disponible y registro de remitos conforme manual de Buenas Prácticas Agrícolas (BPA).

## Tareas Técnicas
1. Crear catálogo de destinatarios (compradores, industrias empaque/procesado).
2. Crear tabla despacho_destino (id, cosechaId FK, destinatarioId FK, tipoDestino, cantidadEnviadaKg, fecha, nroGuiaRemito, renspaFinca, productor).
3. Validar RN-09: la suma acumulada de envíos no puede superar la cantidad comercializable de la cosecha.
4. Calcular saldo sin destino en tiempo real: saldo = comercializable - sum(enviados) (RF-M5-09).

## Criterios de Aceptación
- [ ] RF-M5-07 / RF-M5-09: Registro de envíos con actualización y visualización inmediata del saldo remanente.
- [ ] RF-M5-10: Datos de remito/guía, RENSPA y productor requeridos para cumplimiento de BPA.
- [ ] RN-09: Intento de despacho que exceda el saldo comercializable es rechazado con error 422.

## Comments
