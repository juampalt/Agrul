---
id: AGRUL-029
title: "AGRUL-029: Asignación de Destinos, Saldo Comercializable y Despachos BPA"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: done
priority: "Alta (P1)"
module: "Módulo 5: Cosecha y Destino"
labels: ["despachos", "destinos", "bpa", "remito", "status:done"]
---

# AGRUL-029 — Asignación de Destinos, Saldo Comercializable y Despachos BPA

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Alta (P1)
- **Status:** done
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
- [x] RF-M5-07 / RF-M5-09: Registro de envíos con actualización y visualización inmediata del saldo remanente.
- [x] RF-M5-10: Datos de remito/guía, RENSPA y productor requeridos para cumplimiento de BPA.
- [x] RN-09: Intento de despacho que exceda el saldo comercializable es rechazado con error 422.

## Comments
- **Implementación finalizada:**
  - Entidad de dominio `Destinatario` para catálogo de compradores, industrias, empaques y mayoristas (`RF-M5-08`).
  - Entidad de dominio `DespachoDestino` con validación rigurosa de datos requeridos de Buenas Prácticas Agrícolas (`RF-M5-10`: Nro. Guía/Remito, RENSPA y Productor) y fecha no futura (`RN-04`).
  - Validación de balance de masa en dominio/aplicación (`RN-09`): rechazo con HTTP 422 (`SaldoComercializableExcedidoError`) si el envío supera el saldo comercializable disponible.
  - Tablas `destinatariosCatalogoTable` y `despachosDestinoTable` en Drizzle ORM con índices en PostgreSQL.
  - Puertos `DestinatariosRepositoryPort` y `DespachosRepositoryPort` con implementaciones en memoria para tests.
  - Casos de uso `CrearDestinatarioUseCase`, `ListarDestinatariosUseCase`, `ObtenerDestinatarioPorIdUseCase`, `RegistrarDespachoUseCase`, `ConsultarSaldoCosechaUseCase`, `ListarDespachosUseCase` y `ObtenerDespachoPorIdUseCase`.
  - Registro de evento inmutable `DESPACHO` en la bitácora histórica `eventos_trazabilidad` (`TraceEvent`).
  - Endpoints REST Fastify:
    - `POST /api/v1/destinatarios` (201 Created)
    - `GET /api/v1/destinatarios` (200 OK)
    - `GET /api/v1/destinatarios/:id` (200 OK)
    - `POST /api/v1/despachos` y `POST /api/v1/cosechas/:id/despachos` (201 Created) con reporte de saldo remanente inmediato.
    - `GET /api/v1/cosechas/:id/saldo` y `GET /api/v1/cosechas/:id/despachos` (200 OK).
    - `GET /api/v1/despachos` y `GET /api/v1/despachos/:id` (200 OK).
  - 11 tests unitarios de dominio, 7 tests de casos de uso y 7 tests de integración HTTP en `api.test.ts`. Total: 240/240 tests pasando.
