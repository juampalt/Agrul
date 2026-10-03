# 🎫 Agrul — Backlog de Tickets de Ingeniería (TICKETS.md)
**Documento Fuente:** [SPEC.md](file:///c:/AGRUL/SPEC.md)  
**Metodología:** Spec-Driven Development & Matt Pocock Modular Skills  
**Última actualización:** 2026-10-03  

---

## 📊 Tablero de Estado General

| Épica / Fase | Tickets Totales | Completados | En Progreso | Pendientes |
| :--- | :---: | :---: | :---: | :---: |
| **Épica 1: Núcleo de Dominio & Tooling** | 3 | 3 | 0 | 0 |
| **Épica 2: Casos de Uso & Persistencia Base** | 3 | 3 | 0 | 0 |
| **Épica 3: API REST Fastify & Integración** | 2 | 2 | 0 | 0 |
| **Épica 4: Operaciones Avanzadas de Linaje (Split / Merge)** | 2 | 0 | 0 | 2 |
| **Épica 5: Infraestructura PostgreSQL & Migraciones** | 2 | 0 | 0 | 2 |
| **Épica 6: Frontend Dashboard & Visualizador de Linaje** | 3 | 0 | 0 | 3 |

---

## ÉPICA 1: Núcleo de Dominio & Tooling (Fase 1 - Completada ✅)

### `[AGRUL-001]` Configuración de Tooling, TypeScript y Sistema de Skills
- **Estado:** `DONE` ✅
- **Skills:** [.cursorrules](file:///c:/AGRUL/.cursorrules), [.cursor/skills/architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Descripción:** Inicializar el entorno de desarrollo con Node.js ESM, TypeScript estricto, Vitest y la estructura modular de skills de Matt Pocock.
- **Criterios de Aceptación:**
  - [x] `package.json` configurado con dependencias productivas (`fastify`, `drizzle-orm`, `zod`, `pg`) y de desarrollo (`vitest`, `tsx`, `typescript`).
  - [x] `tsconfig.json` con resolución `NodeNext` y path aliases `@core/*`, `@app/*`, `@infra/*`.
  - [x] Suite de skills creadas en `.cursor/skills/` con triggers y formato canónico.

### `[AGRUL-002]` Entidades Centrales y Value Objects del Dominio
- **Estado:** `DONE` ✅
- **Skills:** [.cursor/skills/domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md)
- **Descripción:** Implementar las entidades de dominio puro sin dependencias de frameworks: `Lote`, `TraceEvent`, `LoteGenealogia`, `CodigoLote`, `TipoEvento`, `MaquinaEstadosLote` y jerarquía de `DomainError`.
- **Criterios de Aceptación:**
  - [x] `TraceEvent` es inmutable y requiere `eventoReferenciadoId` en compensaciones.
  - [x] `Lote` controla su ciclo de vida y balance de masa disponible.
  - [x] `LoteGenealogia` prohíbe ciclos de auto-paternidad.
  - [x] 15 tests unitarios de dominio pasando en verde con Vitest.

---

## ÉPICA 2: Casos de Uso & Persistencia Base (Fase 1 - Completada ✅)

### `[AGRUL-003]` Puertos de Persistencia y Esquema Drizzle ORM
- **Estado:** `DONE` ✅
- **Skills:** [.cursor/skills/database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [.cursor/skills/architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Descripción:** Definir las interfaces de puertos de persistencia (`LotesRepositoryPort`, `EventosRepositoryPort`, `GenealogiaRepositoryPort`) y el esquema PostgreSQL con Drizzle ORM.
- **Criterios de Aceptación:**
  - [x] Contratos de repositorios aislados en `src/core/ports/`.
  - [x] Tablas `lotes`, `eventos_trazabilidad` y `lote_genealogia` tipadas con índices compuestos.
  - [x] Repositorios en memoria (`InMemory*`) para testing unitario determinístico.

### `[AGRUL-004]` Casos de Uso Nucleares: Alta, Eventos y Linaje
- **Estado:** `DONE` ✅
- **Skills:** [.cursor/skills/domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [.cursor/skills/database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Descripción:** Orquestar la lógica de aplicación en casos de uso:
  - `CrearLoteUseCase` (con validación de unicidad de código o autogeneración).
  - `RegistrarEventoUseCase` (con atomicidad ACID: insert evento + update read model de lote).
  - `ObtenerLinajeUseCase` (búsqueda recursiva bidireccional upstream/downstream).
- **Criterios de Aceptación:**
  - [x] DTOs tipados de entrada y salida en `src/application/dtos/`.
  - [x] Rollback y rechazo ante transiciones de estado imposibles o lotes cerrados.
  - [x] Tests unitarios de casos de uso pasando en Vitest (10 tests).

---

## ÉPICA 3: API REST Fastify & Integración (Fase 1 - Completada ✅)

### `[AGRUL-005]` Schemas Zod, Error Handler y Factoría Fastify
- **Estado:** `DONE` ✅
- **Skills:** [.cursor/skills/api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Descripción:** Configurar el servidor Fastify v5 con validación Zod (`fastify-type-provider-zod`) y middleware centralizado de errores.
- **Criterios de Aceptación:**
  - [x] Formato estándar de respuesta `{ success, data, error, timestamp }` en todos los casos.
  - [x] Mapeo de errores de negocio a HTTP 422 y sintácticos a HTTP 400 con array `details`.
  - [x] Factoría `buildApp` desacoplada para permitir inyección de dependencias en tests.

### `[AGRUL-006]` Rutas API v1 e Ingesta Batch Offline
- **Estado:** `DONE` ✅
- **Skills:** [.cursor/skills/api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md), [.cursor/skills/testing-quality.md](file:///c:/AGRUL/.cursor/skills/testing-quality.md)
- **Descripción:** Exponer endpoints REST en `/api/v1/`:
  - `GET /api/v1/health`
  - `POST /api/v1/lotes` y `GET /api/v1/lotes/:id`
  - `POST /api/v1/lotes/:id/eventos` y `GET /api/v1/lotes/:id/eventos`
  - `GET /api/v1/lotes/:id/linaje`
  - `POST /api/v1/eventos/sincronizar` (batch offline de hasta 500 eventos)
- **Criterios de Aceptación:**
  - [x] Tests de integración HTTP con `app.inject()` verificando contratos y códigos de estado.
  - [x] Total acumulado de 31 tests pasando al 100%.

---

## ÉPICA 4: Operaciones Avanzadas de Linaje (Fase 2 - Ready to Start 🟡)

### `[AGRUL-007]` Caso de Uso y Endpoint: División de Lote (Split 1:N)
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Skills:** [.cursor/skills/domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [.cursor/skills/api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Descripción:** Implementar la lógica completa para fraccionar un lote padre en N lotes hijos (ej: clasificación por calibre o empaque).
- **Tareas Técnicas:**
  1. Crear `DividirLoteUseCase` en `src/application/use-cases/`.
  2. Verificar invariante de balance de masa: `sum(cantidades_hijos) <= cantidad_padre`.
  3. Descontar stock del padre y generar N nuevos agregados `Lote`.
  4. Crear los registros en `lote_genealogia` con `motivo_relacion = 'SPLIT'`.
  5. Registrar el evento `DIVISION_SPLIT` en el log de auditoría.
  6. Exponer endpoint `POST /api/v1/lotes/:id/split`.
- **Criterios de Aceptación:**
  - [ ] Arrojar `CantidadInsuficienteError` (HTTP 422) si la suma excede la cantidad del padre.
  - [ ] Persistencia atómica de hijos, padre, aristas genealógicas y evento en la misma transacción.
  - [ ] Tests unitarios y de integración HTTP que validen el balance de masa.

### `[AGRUL-008]` Caso de Uso y Endpoint: Fusión de Lotes (Merge / Blend N:1)
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Skills:** [.cursor/skills/domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [.cursor/skills/api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Descripción:** Implementar la combinación de materias primas de múltiples lotes origen en un único lote destino (ej: uvas de 3 fincas mezcladas en un tanque).
- **Tareas Técnicas:**
  1. Crear `FusionarLotesUseCase` en `src/application/use-cases/`.
  2. Validar existencia y disponibilidad de todos los lotes padres participantes.
  3. Crear nuevo lote hijo con la suma de las cantidades aportadas.
  4. Descontar las cantidades correspondientes a cada lote padre.
  5. Registrar aristas en `lote_genealogia` con `motivo_relacion = 'BLEND_MERGE'`.
  6. Exponer endpoint `POST /api/v1/lotes/merge`.
- **Criterios de Aceptación:**
  - [ ] Rollback total si cualquiera de los lotes origen no tiene stock suficiente.
  - [ ] El árbol de linaje (`GET /api/v1/lotes/:id/linaje`) del lote hijo debe mostrar a todos los padres como ancestros inmediatos.

---

## ÉPICA 5: Infraestructura PostgreSQL & Migraciones (Fase 3 - Ready to Start 🟡)

### `[AGRUL-009]` Generación de Migraciones SQL y Triggers de Inmutabilidad
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Skills:** [.cursor/skills/database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Descripción:** Generar las migraciones SQL formales mediante Drizzle Kit y añadir la función/trigger PL/pgSQL que bloquea `UPDATE` y `DELETE` sobre `eventos_trazabilidad`.
- **Tareas Técnicas:**
  1. Ejecutar `npx drizzle-kit generate` para emitir las sentencias DDL.
  2. Añadir la migración custom del trigger `trg_bloquear_mutacion_eventos`.
  3. Crear script `npm run db:migrate`.
- **Criterios de Aceptación:**
  - [ ] Migraciones versionadas en `drizzle/migrations/`.
  - [ ] Test automatizado contra PostgreSQL real que intente ejecutar un UPDATE o DELETE y verifique el error `VIOLACION_DE_INMUTABILIDAD`.

### `[AGRUL-010]` Entorno Docker Compose para PostgreSQL Local
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Skills:** [.cursor/skills/architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Descripción:** Proveer un `docker-compose.yml` para levantar PostgreSQL 16 con extensiones y variables de entorno configuradas (`.env.example`).
- **Criterios de Aceptación:**
  - [ ] `docker compose up -d` inicializa la base de datos `agrul_db` en el puerto 5432.
  - [ ] Healthcheck configurado en Docker Compose.
  - [ ] `.env.example` documentado con `DATABASE_URL`.

---

## ÉPICA 6: Frontend Dashboard & Visualizador de Trazabilidad (Fase 4 - Planned 🔵)

### `[AGRUL-011]` Dashboard Web Operativo de Lotes
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Descripción:** Interfaz moderna para visualizar la lista de lotes activos, estados, stock y registrar nuevos eventos o lotes.
- **Criterios de Aceptación:**
  - [ ] Diseño estético premium (dark mode / glassmorphism / tipografía moderna).
  - [ ] Filtro interactivo por estado (`CREADO`, `EN_PROCESO`, `EMBALADO`, `DESPACHADO`).
  - [ ] Formulario de registro de eventos con validación en cliente.

### `[AGRUL-012]` Visualizador Gráfico de Linaje Interactivo (Grafo N:M)
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Descripción:** Componente visual interactivo que renderiza el árbol genealógico completo (nodos padres, transformaciones, hijos y sub-lotes) utilizando la respuesta de `GET /api/v1/lotes/:id/linaje`.
- **Criterios de Aceptación:**
  - [ ] Visualización clara de flujos de Split y Merge.
  - [ ] Clic en cualquier nodo para navegar a la ficha técnica del lote correspondiente.
  - [ ] Vista de retiro preventivo (*Recall Simulator*): seleccionar un lote contaminado y resaltar en rojo todos los descendientes en distribución.

### `[AGRUL-013]` Generador y Lector de Códigos QR para Operarios de Campo
- **Estado:** `TODO` 📌
- **Prioridad:** Baja (P3)
- **Descripción:** Generación de etiquetas con código QR descargables e imprimibles para bines/pallets y lector de cámara para escaneo rápido en empaque.
- **Criterios de Aceptación:**
  - [ ] Impresión de etiquetas estandarizadas con `codigoLote`, producto y fecha.
  - [ ] Escáner que abre directamente la pantalla de registro de eventos para el lote escaneado.
