---
id: AGRUL-027
title: "AGRUL-027: Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea"
epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo"
status: done
priority: "Media (P2)"
module: "Módulo 4: Insumos y Aplicaciones"
labels: ["indicadores", "insumos", "consumo", "status:done"]
---

# AGRUL-027 — Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea

- **Épica:** Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Prioridad:** Media (P2)
- **Status:** done
- **Requisitos Funcionales:** RF-M4-10
- **Skills:** .cursor/skills/database-events.md, .cursor/skills/api-contracts.md

## Descripción
Cálculo analítico del acumulado de consumo de cada insumo por lote y ciclo productivo, así como la intensidad de uso expresada por hectárea tratada.

## Tareas Técnicas
1. Crear query de agregación agrupando por cicloId, loteId e insumoId.
2. Calcular cantidadTotalConsumida y cantidadPorHectarea dividiendo por la superficie cultivada del ciclo.
3. Endpoint GET /api/v1/ciclos/:id/insumos-acumulados.

## Criterios de Aceptación
- [x] RF-M4-10: Métricas precisas de consumo acumulado y consumo por ha por insumo en cada campaña.
- [x] Tiempos de respuesta < 2s (RNF-03).

## Comments
Implementado exitosamente con:
- DTOs `InsumoConsumoAcumuladoItemDto` y `ConsumoInsumosCicloOutputDto` en `src/application/dtos/aplicaciones.dto.ts`.
- Caso de uso `CalcularConsumoInsumosCicloUseCase` en `src/application/use-cases/consumo-insumos.use-cases.ts`:
  - Agrupación por `insumoId` a través de todas las aplicaciones del ciclo.
  - Cálculo de `cantidadTotalConsumida` y ratio por hectárea `cantidadPorHectarea` = `cantidadTotalConsumida / superficieCultivadaHa` (RF-M4-10).
  - Enriquecimiento con metadata del catálogo de insumos (`nombreComercial`, `categoria`, `unidadMedidaId`).
  - Ordenamiento descendente por volumen total consumido.
- Endpoint `GET /api/v1/ciclos/:id/insumos-acumulados` expuesto y validado sintácticamente con Zod (`ConsumoInsumosCicloParamsSchema`).
- Inyección de dependencias en `AplicacionesController` y `buildApp`.
- Cobertura completa con tests unitarios y tests de integración en Fastify HTTP Surface (190 tests passing).
