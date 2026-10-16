---
id: AGRUL-030
title: "AGRUL-030: Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: done
priority: "Media (P2)"
module: "Módulo 5: Cosecha y Destino"
labels: ["cosecha", "auditoria", "incidentes", "perdidas", "status:done"]
---

# AGRUL-030 — Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Media (P2)
- **Status:** done
- **Requisitos Funcionales:** RF-M5-11, RF-M5-12, RF-M5-14
- **Reglas de Negocio:** RN-05, RN-06, RN-14
- **Skills:** .cursor/skills/domain-traceability.md, .cursor/skills/database-events.md

## Descripción
Validación de carencia al momento de cosechar, circuito de corrección/anulación con motivo y auditoría sin borrado físico, y registro de pérdidas/incidentes climáticos en cosecha.

## Tareas Técnicas
1. Integrar ServicioVerificacionCarencia en el endpoint de cosecha para emitir advertencia si hay carencia vigente (RF-M5-11).
2. Implementar AnularCosechaUseCase y ModificarCosechaUseCase preservando histórico de cambios (RN-05, RN-06).
3. Crear tabla perdida_cosecha (cosechaId/loteId, fecha, tipo: GRANIZO | HELADA | ROBO | OTROS, cantidadEstimadaKg, descripcion).

## Criterios de Aceptación
- [x] RF-M5-11: Notificación clara si la fecha de cosecha viola un período de carencia.
- [x] RF-M5-12: Corrección o anulación registra usuario, fecha anterior y motivo sin DELETE físico.
- [x] RF-M5-14: Registro de incidentes con estimación de volumen afectado.

## Comments
- **Implementación finalizada:**
  - Verificación de carencia no bloqueante (`RF-M5-11`, `RN-14`) integrada en `RegistrarCosechaUseCase` mediante `VerificarCarenciaLoteUseCase`: cuando existe conflicto de carencia fitosanitaria, se incluye advertencia estructurada en el payload del evento `COSECHA` y en el meta/envelope de la respuesta HTTP, sin abortar la operación.
  - Modificación y anulación lógica auditada (`RF-M5-12`, `RN-05`, `RN-06`):
    - Entidad `Cosecha` extendida con `estado` (`ACTIVA` / `ANULADA`), `motivoAnulacion`, `usuarioAnulacionId`, `anuladoEn`, `historialModificaciones` e invariantes de negocio. Prohibición estricta de borrado físico (`DELETE`).
    - `AnularCosechaUseCase`: realiza la baja lógica, deduce la masa del balance del lote y emite un `TraceEvent` compensatorio inmutable `COMPENSACION_ANULACION` referenciando el evento original (`eventoReferenciadoId`).
    - `ModificarCosechaUseCase`: valida la invariante `RN-09` (`cantidadCosechadaKg = cantidadComercializableKg + cantidadDescarteKg`), registra la auditoría con valores anteriores, nuevos, fecha, usuario y motivo, ajusta el diferencial de balance de masa en el lote y emite un `TraceEvent` compensatorio inmutable `COMPENSACION_AJUSTE`.
  - Registro de pérdidas e incidentes de cosecha (`RF-M5-14`):
    - Entidad de dominio `PerdidaCosecha` y tipos de incidente (`GRANIZO`, `HELADA`, `VIENTO`, `PLAGA`, `ENFERMEDAD`, `ROBO`, `OTRO`).
    - Tabla `perdidasCosechaTable` en Drizzle ORM con índices en `cosecha_id`, `lote_id` y `fecha`.
    - Puerto `PerdidasCosechaRepositoryPort` e implementación `InMemoryPerdidasCosechaRepository`.
    - Casos de uso `RegistrarPerdidaCosechaUseCase`, `ListarPerdidasCosechaUseCase` y `ObtenerPerdidaCosechaPorIdUseCase`. Emite `TraceEvent` inmutable de tipo `OBSERVACION_MONITOREO` (con subtype `PERDIDA_COSECHA`).
  - Endpoints REST Fastify:
    - `POST /api/v1/cosechas/:id/anular` (200 OK)
    - `PUT /api/v1/cosechas/:id` y `PATCH /api/v1/cosechas/:id` (200 OK)
    - `POST /api/v1/cosechas/perdidas`, `POST /api/v1/cosechas/:id/perdidas` y `POST /api/v1/perdidas` (201 Created)
    - `GET /api/v1/cosechas/perdidas`, `GET /api/v1/cosechas/:id/perdidas` y `GET /api/v1/perdidas` (200 OK)
    - `GET /api/v1/perdidas/:id` (200 OK)
  - Cobertura de pruebas completa:
    - `tests/unit/domain/cosecha.test.ts` (16 tests)
    - `tests/unit/domain/perdida-cosecha.test.ts` (8 tests)
    - `tests/unit/application/cosechas-audit.use-case.test.ts` (4 tests)
    - `tests/unit/application/perdidas-cosecha.use-case.test.ts` (6 tests)
    - `tests/integration/api.test.ts` (90 tests)
    - Total de la suite: 30 archivos y 268/268 tests en verde. Compilación TypeScript limpia sin errores.
