---
id: AGRUL-008
title: "AGRUL-008: Caso de Uso y Endpoint: Fusión de Lotes (Merge / Blend N:1)"
epic: "Épica 4: Operaciones Avanzadas de Linaje"
status: ready-for-agent
priority: "Alta (P1)"
module: "Linaje"
labels: ["domain", "use-case", "linaje", "ready-for-agent"]
---

# AGRUL-008 — Caso de Uso y Endpoint: Fusión de Lotes (Merge / Blend N:1)

- **Épica:** Épica 4: Operaciones Avanzadas de Linaje
- **Módulo:** Linaje
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Reglas de Negocio:** RN-07
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Implementar la combinación de materias primas de múltiples lotes origen en un único lote destino (mezcla en tanque o bines).

## Tareas Técnicas
1. Crear FusionarLotesUseCase en src/application/use-cases/.
2. Validar existencia y disponibilidad de todos los lotes padres participantes.
3. Crear nuevo lote hijo con la suma de las cantidades aportadas.
4. Descontar las cantidades correspondientes a cada lote padre.
5. Registrar aristas en lote_genealogia con motivo_relacion = 'BLEND_MERGE'.
6. Exponer endpoint POST /api/v1/lotes/merge.

## Criterios de Aceptación
- [ ] Rollback total si cualquiera de los lotes origen no tiene stock suficiente.
- [ ] El árbol de linaje del lote hijo debe mostrar a todos los padres como ancestros inmediatos.
- [ ] Tests unitarios y de integración verificando la conservación de masa.

## Comments
