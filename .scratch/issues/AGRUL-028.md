---
id: AGRUL-028
title: "AGRUL-028: Registro de Cosechas, Descarte y Código de Trazabilidad Único"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 5: Cosecha y Destino"
labels: ["domain", "cosecha", "trazabilidad", "descarte", "ready-for-agent"]
---

# AGRUL-028 — Registro de Cosechas, Descarte y Código de Trazabilidad Único

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M5-01, RF-M5-02, RF-M5-03, RF-M5-04, RF-M5-05, RF-M5-06
- **Reglas de Negocio:** RN-07, RN-08, RN-09
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Registro de cosechas con desglose estricto: cantidad cosechada = comercializable + descarte (RN-09), motivos configurables de descarte y asignación automática del código de trazabilidad único (ej. COS-L03-20260915-01).

## Tareas Técnicas
1. Crear entidad Cosecha (id, codigoTrazabilidad UK, loteId, cicloId, fecha, cantidadCosechadaKg, cantidadComercializableKg, cantidadDescarteKg, motivoDescarte, observacionesCalidad, responsableId, cuadrillaId, recipientes, superficieCosechadaHa).
2. Validar invariante RN-09: cantidadCosechadaKg === cantidadComercializableKg + cantidadDescarteKg.
3. Generador de código algorítmico RN-07 / RN-08: formato COS-L[nro]-[YYYYMMDD]-[secuencia], inmodificable y único.
4. Permitir múltiples cosechas sucesivas sin sobrescribir y acumulando saldo (RF-M5-04).

## Criterios de Aceptación
- [ ] RF-M5-01 / RF-M5-02: Registro con total kg, comercializable y descarte justificado.
- [ ] RF-M5-03 / RN-08: Cada cosecha recibe un código de trazabilidad único e inalterable.
- [ ] RN-09: Falla con HTTP 422 si la suma de comercializable + descarte no coincide con el total cosechado.

## Comments
