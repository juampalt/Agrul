---
id: AGRUL-025
title: "AGRUL-025: Registro de Aplicaciones de Campo, Mezclas y Dosis Diferenciadas"
epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 4: Insumos y Aplicaciones"
labels: ["aplicaciones", "dosis", "mezclas", "campo", "ready-for-agent"]
---

# AGRUL-025 — Registro de Aplicaciones de Campo, Mezclas y Dosis Diferenciadas

- **Épica:** Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M4-03, RF-M4-04, RF-M4-05, RF-M4-06, RF-M4-11, RF-M4-12
- **Reglas de Negocio:** RN-01, RN-04, RN-10
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Registro de aplicaciones de insumos sobre lotes y ciclos, permitiendo caldos/mezclas (múltiples insumos por labor), descomposición de dosis (total, por ha, por planta, concentración) y condiciones climáticas de aplicación.

## Tareas Técnicas
1. Crear tabla aplicacion_agricola (id, actividadId FK, loteId FK, cicloId FK, fecha, responsableId, metodo, motivo, equipoAplicacion, condicionesClima: { vientoKmH, tempC, lluviaMm }).
2. Crear tabla aplicacion_linea_insumo (id, aplicacionId FK, insumoId FK, cantidadTotal, unidadMedidaId, dosisPorSuperficie, dosisPorPlanta, concentracion).
3. Validar RN-01 (atada a lote y ciclo) y RN-10 (disparar movimiento de stock correspondiente en Módulo 9).

## Criterios de Aceptación
- [ ] RF-M4-03 / RF-M4-05: Cada aplicación está atada a una actividad, un lote y un ciclo abierto.
- [ ] RF-M4-04: Campos independientes para dosis total, por ha, por planta y concentración.
- [ ] RF-M4-06: Soporta mezclas de múltiples insumos en la misma actividad.
- [ ] RF-M4-11 / RF-M4-12: Registro de equipo utilizado y condiciones ambientales al aplicar.

## Comments
