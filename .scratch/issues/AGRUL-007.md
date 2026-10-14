---
id: AGRUL-007
title: "AGRUL-007: Caso de Uso y Endpoint: División de Lote (Split 1:N)"
epic: "Épica 4: Operaciones Avanzadas de Linaje"
status: resolved
priority: "Alta (P1)"
module: "Linaje"
labels: ["domain", "use-case", "linaje", "status:done"]
---

# AGRUL-007 — Caso de Uso y Endpoint: División de Lote (Split 1:N)

- **Épica:** Épica 4: Operaciones Avanzadas de Linaje
- **Módulo:** Linaje
- **Prioridad:** Alta (P1)
- **Status:** resolved
- **Reglas de Negocio:** RN-07, RN-09
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/api-contracts.md

## Descripción
Implementar la lógica completa para fraccionar un lote padre en N lotes hijos garantizando el balance de masa.

## Tareas Técnicas
1. Crear DividirLoteUseCase en src/application/use-cases/.
2. Verificar invariante de balance de masa: sum(cantidades_hijos) <= cantidad_padre.
3. Descontar stock del padre y generar N nuevos agregados Lote.
4. Crear los registros en lote_genealogia con motivo_relacion = 'SPLIT'.
5. Registrar el evento DIVISION_SPLIT en el log de auditoría.
6. Exponer endpoint POST /api/v1/lotes/:id/split.

## Criterios de Aceptación
- [x] Arrojar CantidadInsuficienteError (HTTP 422) si la suma excede la cantidad del padre.
- [x] Persistencia atómica de hijos, padre, aristas genealógicas y evento en la misma transacción.
- [x] Tests unitarios y de integración HTTP que validen el balance de masa.

## Comments
