# 🎫 Agrul — Backlog de Tickets de Ingeniería (TICKETS.md)
**Documento Fuente:** Especificación Técnica de Requisitos y Gestión Agrícola (Módulos 1 al 10, Reglas RN-01 a RN-16, Requisitos RNF-01 a RNF-16)
**Metodología:** Spec-Driven Development & Matt Pocock Modular Skills  
**Última actualización:** 2026-10-14  

---

## 📊 Tablero de Estado General

| Épica / Fase | Tickets Totales | Completados | En Progreso | Pendientes |
| :--- | :---: | :---: | :---: | :---: |
| **Épica 1: Núcleo de Dominio & Tooling** | 2 | 2 | 0 | 0 |
| **Épica 2: Casos de Uso & Persistencia Base** | 2 | 2 | 0 | 0 |
| **Épica 3: API REST Fastify & Integración** | 2 | 2 | 0 | 0 |
| **Épica 4: Operaciones Avanzadas de Linaje** | 2 | 2 | 0 | 0 |
| **Épica 5: Infraestructura PostgreSQL & Migraciones** | 2 | 2 | 0 | 0 |
| **Épica 6: Frontend Dashboard & Visualizador de Trazabilidad** | 3 | 3 | 0 | 0 |
| **Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos** | 3 | 1 | 0 | 2 |
| **Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos** | 3 | 0 | 0 | 3 |
| **Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas** | 4 | 3 | 0 | 1 |
| **Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo** | 4 | 2 | 0 | 2 |
| **Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable** | 4 | 0 | 0 | 4 |
| **Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales** | 3 | 0 | 0 | 3 |
| **Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas** | 3 | 0 | 0 | 3 |
| **Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría** | 3 | 0 | 0 | 3 |
| **Épica 15: Módulo 9 — Inventario de Insumos y Stock** | 5 | 0 | 0 | 5 |
| **Épica 16: Módulo 10 — Información Agro-Meteorológica** | 3 | 0 | 0 | 3 |
| **Épica 17: Requisitos No Funcionales & Cumplimiento Normativo** | 2 | 0 | 0 | 2 |
| **TOTAL GENERAL** | **50** | **19** | **0** | **31** |

---

## ÉPICA 1: NÚCLEO DE DOMINIO & TOOLING

### `[AGRUL-001]` Configuración de Tooling, TypeScript y Sistema de Skills
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Core
- **Skills:** [.cursorrules](file:///c:/AGRUL/.cursorrules), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `core`, `tooling`, `status:done`
- **Descripción:** Inicializar el entorno de desarrollo con Node.js ESM, TypeScript estricto, Vitest y la estructura modular de skills de Matt Pocock.
- **Tareas Técnicas:**
  1. Configurar package.json con dependencias productivas y de testing.
  2. Configurar tsconfig.json con resolución NodeNext y path aliases.
  3. Crear suite de skills en .cursor/skills/.
- **Criterios de Aceptación:**
  - [x] package.json configurado con fastify, drizzle-orm, zod, pg, vitest, tsx, typescript.
  - [x] tsconfig.json con resolución NodeNext y aliases @core/*, @app/*, @infra/*.
  - [x] Suite de skills creadas en .cursor/skills/ con triggers y formato canónico.

### `[AGRUL-002]` Entidades Centrales y Value Objects del Dominio
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Core
- **Reglas de Negocio:** RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md)
- **Etiquetas:** `domain`, `traceability`, `status:done`
- **Descripción:** Implementar las entidades de dominio puro sin dependencias de frameworks: Lote, TraceEvent, LoteGenealogia, CodigoLote, TipoEvento, MaquinaEstadosLote y jerarquía de DomainError.
- **Tareas Técnicas:**
  1. Crear entidades de dominio en src/core/domain/entities/.
  2. Implementar Value Objects y validaciones en src/core/domain/value-objects/.
  3. Codificar suite de tests unitarios de dominio en Vitest.
- **Criterios de Aceptación:**
  - [x] TraceEvent es inmutable y requiere eventoReferenciadoId en compensaciones.
  - [x] Lote controla su ciclo de vida y balance de masa disponible.
  - [x] LoteGenealogia prohíbe ciclos de auto-paternidad.
  - [x] 15 tests unitarios de dominio pasando en verde con Vitest.

---

## ÉPICA 2: CASOS DE USO & PERSISTENCIA BASE

### `[AGRUL-003]` Puertos de Persistencia y Esquema Drizzle ORM
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Persistencia
- **Reglas de Negocio:** RN-04, RN-05
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `database`, `drizzle`, `status:done`
- **Descripción:** Definir las interfaces de puertos de persistencia (LotesRepositoryPort, EventosRepositoryPort, GenealogiaRepositoryPort) y el esquema PostgreSQL con Drizzle ORM.
- **Tareas Técnicas:**
  1. Definir puertos en src/core/ports/.
  2. Definir esquemas Drizzle con tipos estrictos e índices en src/infrastructure/persistence/drizzle/.
  3. Implementar repositorios en memoria para testing.
- **Criterios de Aceptación:**
  - [x] Contratos de repositorios aislados en src/core/ports/.
  - [x] Tablas lotes, eventos_trazabilidad y lote_genealogia tipadas con índices compuestos.
  - [x] Repositorios en memoria (InMemory*) para testing unitario determinístico.

### `[AGRUL-004]` Casos de Uso Nucleares: Alta, Eventos y Linaje
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Aplicación
- **Reglas de Negocio:** RN-04, RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `application`, `use-cases`, `status:done`
- **Descripción:** Orquestar la lógica de aplicación en casos de uso: CrearLoteUseCase, RegistrarEventoUseCase y ObtenerLinajeUseCase.
- **Tareas Técnicas:**
  1. Implementar DTOs tipados en src/application/dtos/.
  2. Implementar casos de uso con persistencia atómica en src/application/use-cases/.
  3. Crear tests de aplicación con repositorios en memoria.
- **Criterios de Aceptación:**
  - [x] DTOs tipados de entrada y salida en src/application/dtos/.
  - [x] Rollback y rechazo ante transiciones de estado imposibles o lotes cerrados.
  - [x] Tests unitarios de casos de uso pasando en Vitest (10 tests).

---

## ÉPICA 3: API REST FASTIFY & INTEGRACIÓN

### `[AGRUL-005]` Schemas Zod, Error Handler y Factoría Fastify
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** API REST
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `api`, `fastify`, `zod`, `status:done`
- **Descripción:** Configurar el servidor Fastify v5 con validación Zod (fastify-type-provider-zod) y middleware centralizado de errores con Envelope Pattern.
- **Tareas Técnicas:**
  1. Configurar Fastify con fastify-type-provider-zod.
  2. Crear middleware de manejo centralizado de DomainError y ZodError.
  3. Implementar factoría buildApp desacoplada para testing.
- **Criterios de Aceptación:**
  - [x] Formato estándar de respuesta { success, data, error, timestamp } en todos los endpoints.
  - [x] Mapeo de errores de negocio a HTTP 422 y sintácticos a HTTP 400 con array details.
  - [x] Factoría buildApp desacoplada para inyección de dependencias en tests.

### `[AGRUL-006]` Rutas API v1 e Ingesta Batch Offline
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** API REST
- **Reglas de Negocio:** RN-04
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md), [testing-quality.md](file:///c:/AGRUL/.cursor/skills/testing-quality.md)
- **Etiquetas:** `api`, `endpoints`, `batch`, `status:done`
- **Descripción:** Exponer endpoints REST en /api/v1/ para health, lotes, eventos, linaje e ingesta masiva offline (sincronizar batch de hasta 500 items).
- **Tareas Técnicas:**
  1. Crear controladores y rutas en src/infrastructure/http/.
  2. Implementar endpoint batch POST /api/v1/eventos/sincronizar.
  3. Escribir tests de integración HTTP con app.inject().
- **Criterios de Aceptación:**
  - [x] Endpoints /health, /lotes, /lotes/:id/eventos, /lotes/:id/linaje y /eventos/sincronizar operativos.
  - [x] Tests de integración HTTP con app.inject() verificando contratos y códigos de estado.
  - [x] Total acumulado de 31 tests pasando al 100%.

---

## ÉPICA 4: OPERACIONES AVANZADAS DE LINAJE

### `[AGRUL-007]` Caso de Uso y Endpoint: División de Lote (Split 1:N)
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Linaje
- **Reglas de Negocio:** RN-07, RN-09
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `use-case`, `linaje`, `status:done`
- **Descripción:** Implementar la lógica completa para fraccionar un lote padre en N lotes hijos garantizando el balance de masa.
- **Tareas Técnicas:**
  1. Crear DividirLoteUseCase en src/application/use-cases/.
  2. Verificar invariante de balance de masa: sum(cantidades_hijos) <= cantidad_padre.
  3. Descontar stock del padre y generar N nuevos agregados Lote.
  4. Crear los registros en lote_genealogia con motivo_relacion = 'SPLIT'.
  5. Registrar el evento DIVISION_SPLIT en el log de auditoría.
  6. Exponer endpoint POST /api/v1/lotes/:id/split.
- **Criterios de Aceptación:**
  - [x] Arrojar CantidadInsuficienteError (HTTP 422) si la suma excede la cantidad del padre.
  - [x] Persistencia atómica de hijos, padre, aristas genealógicas y evento en la misma transacción.
  - [x] Tests unitarios y de integración HTTP que validen el balance de masa.

### `[AGRUL-008]` Caso de Uso y Endpoint: Fusión de Lotes (Merge / Blend N:1)
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Linaje
- **Reglas de Negocio:** RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `use-case`, `linaje`, `status:done`
- **Descripción:** Implementar la combinación de materias primas de múltiples lotes origen en un único lote destino (mezcla en tanque o bines).
- **Tareas Técnicas:**
  1. Crear FusionarLotesUseCase en src/application/use-cases/.
  2. Validar existencia y disponibilidad de todos los lotes padres participantes.
  3. Crear nuevo lote hijo con la suma de las cantidades aportadas.
  4. Descontar las cantidades correspondientes a cada lote padre.
  5. Registrar aristas en lote_genealogia con motivo_relacion = 'BLEND_MERGE'.
  6. Exponer endpoint POST /api/v1/lotes/merge.
- **Criterios de Aceptación:**
  - [x] Rollback total si cualquiera de los lotes origen no tiene stock suficiente.
  - [x] El árbol de linaje del lote hijo debe mostrar a todos los padres como ancestros inmediatos.
  - [x] Tests unitarios y de integración verificando la conservación de masa.

---

## ÉPICA 5: INFRAESTRUCTURA POSTGRESQL & MIGRACIONES

### `[AGRUL-009]` Generación de Migraciones SQL y Triggers de Inmutabilidad
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Base de Datos
- **Reglas de Negocio:** RN-04, RN-05
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `database`, `postgres`, `migrations`, `status:done`
- **Descripción:** Generar migraciones SQL formales mediante Drizzle Kit y configurar trigger PL/pgSQL que bloquea UPDATE y DELETE sobre eventos_trazabilidad.
- **Tareas Técnicas:**
  1. Ejecutar npx drizzle-kit generate para emitir sentencias DDL iniciales.
  2. Añadir migración custom del trigger trg_bloquear_mutacion_eventos.
  3. Crear script npm run db:migrate y test de rechazo de mutación.
- **Criterios de Aceptación:**
  - [x] Migraciones versionadas en drizzle/migrations/.
  - [x] Test automatizado contra PostgreSQL real que valide rechazo de UPDATE/DELETE con VIOLACION_DE_INMUTABILIDAD.
  - [x] Script de migración automatizado en package.json.

### `[AGRUL-010]` Entorno Docker Compose para PostgreSQL Local
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Infraestructura
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `docker`, `postgres`, `status:done`
- **Descripción:** Proveer un docker-compose.yml para levantar PostgreSQL 16 con extensiones y variables de entorno configuradas.
- **Tareas Técnicas:**
  1. Configurar docker-compose.yml con postgres:16-alpine.
  2. Configurar healthcheck y volúmenes persistentes.
  3. Documentar .env.example.
- **Criterios de Aceptación:**
  - [x] docker compose up -d inicializa agrul_db en puerto 5432.
  - [x] Healthcheck configurado y validado.
  - [x] .env.example documentado.

---

## ÉPICA 6: FRONTEND DASHBOARD & VISUALIZADOR DE TRAZABILIDAD

### `[AGRUL-011]` Dashboard Web Operativo de Lotes
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Frontend
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `frontend`, `ui`, `status:done`
- **Descripción:** Interfaz moderna para visualizar la lista de lotes activos, estados, stock y registrar nuevos eventos o lotes.
- **Tareas Técnicas:**
  1. Crear layout base con diseño estético premium (dark mode / glassmorphism).
  2. Implementar tabla interactiva de lotes con filtros por estado.
  3. Construir modal/formulario de registro de eventos con validación en cliente.
- **Criterios de Aceptación:**
  - [x] Diseño estético premium con tipografía moderna y paleta cuidada.
  - [x] Filtro interactivo por estado (CREADO, EN_PROCESO, EMBALADO, DESPACHADO).
  - [x] Formulario de registro de eventos conectado a la API REST.

### `[AGRUL-012]` Visualizador Gráfico de Linaje Interactivo (Grafo N:M)
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Frontend
- **Reglas de Negocio:** RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md)
- **Etiquetas:** `frontend`, `linaje`, `graph`, `status:done`
- **Descripción:** Componente visual interactivo que renderiza el árbol genealógico completo (padres, transformaciones, hijos) a partir de /api/v1/lotes/:id/linaje.
- **Tareas Técnicas:**
  1. Integrar librería de grafos dirigida (ej. Cytoscape.js o React Flow / D3 / SVG Nativo Reactivo).
  2. Mapear respuesta de ancestros y descendientes a nodos y aristas con motivos SPLIT/BLEND.
  3. Implementar simulación de retiro preventivo (Recall) resaltando descendencia en rojo.
- **Criterios de Aceptación:**
  - [x] Visualización clara de flujos de Split y Merge.
  - [x] Navegación al hacer clic en un lote a su vista de detalle.
  - [x] Modo Recall Simulator operativo destacando lotes derivados.

### `[AGRUL-013]` Generador y Lector de Códigos QR para Operarios de Campo
- **Estado:** `DONE` ✅
- **Prioridad:** Baja (P3)
- **Módulo:** Frontend
- **Reglas de Negocio:** RN-07
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `frontend`, `qr`, `mobile`, `status:done`
- **Descripción:** Generación de etiquetas con código QR descargables e imprimibles para bines/pallets y lector de cámara para escaneo rápido.
- **Tareas Técnicas:**
  1. Implementar generador de QR con código único de lote.
  2. Diseñar plantilla imprimible de campo con datos clave y QR.
  3. Implementar lector de cámara HTML5/Webcam que redirija a la ficha o registro de evento.
- **Criterios de Aceptación:**
  - [x] Generación de QR descargable e imprimible.
  - [x] Lector funcional en navegador móvil desde cámara trasera.

---

## ÉPICA 7: MÓDULO 1 — GESTIÓN DE FINCAS, LOTES Y SUELOS

### `[AGRUL-014]` Modelo de Dominio y Gestión de Fincas con Control de Superficie
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 1: Fincas y Lotes
- **Requisitos Funcionales:** RF-M1-01, RF-M1-02, RF-M1-03
- **Reglas de Negocio:** RN-05, RN-06, RN-15, RN-16
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `fincas`, `crud`, `ready-for-agent`
- **Descripción:** Implementar la entidad Finca, persistencia y casos de uso de alta, modificación con auditoría de valores anteriores y baja lógica condicionada a ausencia de ciclos abiertos.
- **Tareas Técnicas:**
  1. Crear entidad Finca (id, nombre, ubicacion: {localidad, departamento, provincia}, superficieTotalHa, responsableId, renspa, coordenadas).
  2. Validar invariante RN-15: la suma de superficies de los lotes no puede exceder la superficie de la finca.
  3. Implementar casos de uso RegistrarFinca, ModificarFinca (con auditoría de cambios RN-06) y DarDeBajaFinca (baja lógica RN-05 bloqueada si hay ciclos abiertos RF-M1-03).
  4. Exponer endpoints REST en /api/v1/fincas con validación Zod.
- **Criterios de Aceptación:**
  - [ ] RF-M1-01: Finca registra nombre, localidad, depto, provincia, superficie en ha, responsable, y opcionales RENSPA y coords.
  - [ ] RF-M1-02 / RN-06: Modificaciones guardan histórico del valor anterior.
  - [ ] RF-M1-03 / RN-05: Baja lógica rechazada con HTTP 422 si la finca posee ciclos productivos abiertos.
  - [ ] RN-15: Error de validación si la superficie de lotes supera la superficie declarada de la finca.

### `[AGRUL-015]` Subdivisión de Lotes, Estados Operativos y Análisis de Suelo
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 1: Fincas y Lotes
- **Requisitos Funcionales:** RF-M1-04, RF-M1-05, RF-M1-06, RF-M1-07, RF-M1-08, RF-M1-09
- **Reglas de Negocio:** RN-02, RN-05, RN-06, RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `lotes`, `suelos`, `estados`, `ready-for-agent`
- **Descripción:** Gestión de lotes dentro de una finca: división, estados operativos (en producción, en preparación, en descanso), historial de cambios de estado, características edáficas y usos previos.
- **Tareas Técnicas:**
  1. Extender entidad Lote con fincaId, nombre/numero, superficieHa, estadoLote (EN_PRODUCCION, EN_PREPARACION, EN_DESCANSO), usosPrevios.
  2. Crear entidad/tabla lote_analisis_suelo (loteId, textura, ph, materiaOrganica, salinidad, unidad, fechaAnalisis, fuente).
  3. Implementar máquina de estados de lote con historial inmutable de transiciones con fecha y usuario (RF-M1-08).
  4. Restringir baja lógica y modificación si tiene ciclos productivos abiertos (RF-M1-05 / RN-02).
- **Criterios de Aceptación:**
  - [ ] RF-M1-04 / RN-07: Identificador único de lote autogenerado, irrepetible e ineditable.
  - [ ] RF-M1-05: Modificación/baja lógica bloqueada si tiene ciclo abierto.
  - [ ] RF-M1-06: Registro opcional de parámetros de suelo con unidad, fecha y fuente.
  - [ ] RF-M1-07 / RF-M1-08: Transición de estados auditada con fecha y usuario.
  - [ ] RF-M1-09: Soporte para registrar historial de usos previos al sistema.

### `[AGRUL-016]` Búsqueda Filtrada, Polígonos Geográficos y Ficha Imprimible de Lote
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 1: Fincas y Lotes
- **Requisitos Funcionales:** RF-M1-10, RF-M1-11, RF-M1-12
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `api`, `geo`, `print`, `status:done`
- **Descripción:** Endpoints y vistas para listar fincas/lotes con filtros combinados, almacenamiento de coordenadas/polígonos (GeoJSON) y generación de ficha imprimible para señalética de campo.
- **Tareas Técnicas:**
  1. Endpoint GET /api/v1/fincas y GET /api/v1/lotes con filtros combinados por estado, finca y rango de superficie.
  2. Almacenar polígono/coordenadas GPS del lote en formato GeoJSON.
  3. Generar endpoint o vista para exportar ficha técnica imprimible con código QR y datos para señalética de campo (RF-M1-11).
- **Criterios de Aceptación:**
  - [x] RF-M1-10: Listado veloz (< 2s, RNF-03) con filtros por estado, finca y superficie.
  - [x] RF-M1-11: Vista/PDF imprimible con código legible y QR para colocar en cartel de cabecera de lote.
  - [x] RF-M1-12: Coordenadas o polígono almacenados y validados correctamente.

---

## ÉPICA 8: MÓDULO 2 — GESTIÓN DE CULTIVOS Y CICLOS PRODUCTIVOS

### `[AGRUL-017]` Catálogo de Cultivos, Variedades y Partidas de Plantines
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Requisitos Funcionales:** RF-M2-01, RF-M2-04, RF-M2-05
- **Reglas de Negocio:** RN-01, RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `domain`, `catalogo`, `cultivos`, `plantines`, `ready-for-agent`
- **Descripción:** Gestionar el catálogo de cultivos y variedades (ej. Frutilla: San Andreas, Camino Real con tipo fotoperiódico: día corto / neutro) y recepción de partidas de plantines con trazabilidad de origen.
- **Tareas Técnicas:**
  1. Crear entidades Cultivo, Variedad (con atributo fotoperíodo: DIA_CORTO, DIA_NEUTRO).
  2. Crear entidad PartidaPlantines (codigoPartida UK, proveedorId, variedadId, fechaRecepcion, cantidadRecibida, cantidadRechazada, cantidadPlantada, origenMaterial: PROVEEDOR | PROPAGACION_LOCAL, cicloOrigenId).
  3. Implementar endpoints REST /api/v1/cultivos, /variedades y /partidas-plantines.
- **Criterios de Aceptación:**
  - [ ] RF-M2-01: Catálogo configurable con variedades y tipo día corto/neutro.
  - [ ] RF-M2-04: Origen trazable: partida de proveedor o bordos/propagación local referenciando ciclo previo.
  - [ ] RF-M2-05 / RN-07: Código de partida único e inmutable, con cantidades recibida, rechazada y plantada.

### `[AGRUL-018]` Apertura, Multivariedad y Planificación de Ciclos Productivos
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Requisitos Funcionales:** RF-M2-02, RF-M2-03, RF-M2-10
- **Reglas de Negocio:** RN-01, RN-02, RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `ciclos`, `use-case`, `ready-for-agent`
- **Descripción:** Apertura y planificación de ciclos productivos en un lote, admitiendo múltiples variedades con su superficie o número de plantas, garantizando la regla de máximo un ciclo abierto por lote.
- **Tareas Técnicas:**
  1. Crear entidad CicloProductivo (id, codigoCiclo UK, loteId, cultivoId, estado: PLANIFICADO | ABIERTO | CERRADO, fechaInicio, fechaFin, superficieCultivadaHa, fechaEstimadaInicio).
  2. Crear entidad CicloVariedad (cicloId, variedadId, partidaPlantinesId, superficieHa, cantidadPlantas).
  3. Validar invariante RN-02: rechazar apertura de ciclo si el lote ya cuenta con un ciclo en estado ABIERTO.
  4. Implementar casos de uso PlanificarCicloFuturo y AbrirCicloProductivo.
- **Criterios de Aceptación:**
  - [ ] RF-M2-02 / RN-02: Apertura valida que el lote no tenga otro ciclo abierto simultáneamente.
  - [ ] RF-M2-03: Posibilidad de vincular múltiples variedades y partidas dentro del mismo ciclo.
  - [ ] RF-M2-10: Soporte para crear ciclo en estado PLANIFICADO y activarlo a ABIERTO posteriormente.
  - [ ] RN-07: Código de ciclo generado por el sistema y no editable.

### `[AGRUL-019]` Cierre, Reapertura Auditada y Resumen Histórico de Campañas
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 2: Cultivos y Ciclos
- **Requisitos Funcionales:** RF-M2-06, RF-M2-07, RF-M2-08, RF-M2-09
- **Reglas de Negocio:** RN-03, RN-04, RN-06
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `domain`, `ciclos`, `auditoria`, `ready-for-agent`
- **Descripción:** Flujo de cierre formal de ciclo con motivo, bloqueo de nuevas operaciones en ciclo cerrado, reapertura exclusiva para Administrador con auditoría, y consulta de resumen consolidado.
- **Tareas Técnicas:**
  1. Implementar CerrarCicloUseCase con fechaFin y motivo (FIN_NORMAL, ABANDONO, PERDIDA_EVENTO).
  2. Implementar ReabrirCicloUseCase con validación de rol ADMINISTRADOR, motivo obligatorio y log de auditoría (RN-03).
  3. Crear query de resumen de ciclo: duración en días, total de actividades realizadas, volumen de insumos consumidos y total cosechado acumulado.
  4. Consultas con filtros por cultivo, variedad y rango de fechas (RF-M2-08).
- **Criterios de Aceptación:**
  - [ ] RF-M2-06 / RN-03: Al cerrar el ciclo, queda bloqueado para nuevas actividades, aplicaciones y cosechas.
  - [ ] RF-M2-07: Solo usuario con perfil Administrador puede reabrir un ciclo, requiriendo motivo auditado.
  - [ ] RF-M2-09: Resumen del ciclo devuelve métricas exactas consolidadas.

---

## ÉPICA 9: MÓDULO 3 — REGISTRO DE ACTIVIDADES Y LABORES AGRÍCOLAS

### `[AGRUL-020]` Catálogos de Tipos de Actividad, Personal, Cuadrillas y Maquinaria
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 3: Actividades
- **Requisitos Funcionales:** RF-M3-01, RF-M3-03, RF-M3-05, RF-M3-06
- **Reglas de Negocio:** RN-01
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `catalogo`, `actividades`, `personal`, `maquinaria`, `ready-for-agent`
- **Descripción:** Catálogos configurables sin tocar código (RNF-13) para labores (preparación, siembra, riego, fertilización, control malezas/plagas, monitoreo, etc.), personal/cuadrillas y maquinaria agrícola.
- **Tareas Técnicas:**
  1. Crear tabla tipo_actividad_catalogo con valores iniciales configurables.
  2. Crear tabla personal_cuadrilla (id, nombre, tipo: INDIVIDUAL | CUADRILLA, usuarioId nullable, activo).
  3. Crear tabla maquinaria_catalogo (id, identificacion, tipo, condicion: PROPIO | ALQUILADO | SERVICIO_CONTRATADO, activo).
  4. Endpoints CRUD para cada catálogo.
- **Criterios de Aceptación:**
  - [x] RF-M3-01: Catálogo configurable con tipos estándar precargados.
  - [x] RF-M3-03: Registro de trabajadores/cuadrillas asociados opcionalmente a un usuario del sistema.
  - [x] RF-M3-06: Catálogo de maquinaria con condición (propio, alquilado, servicio contratado).

### `[AGRUL-021]` Registro de Labores Ejecutadas y Consumo de Mano de Obra
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 3: Actividades
- **Requisitos Funcionales:** RF-M3-02, RF-M3-04, RF-M3-05, RF-M3-15
- **Reglas de Negocio:** RN-01, RN-03, RN-04, RN-07
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `domain`, `labores`, `mano-de-obra`, `ready-for-agent`
- **Descripción:** Registro de actividades de campo realizadas vinculadas a lote y ciclo productivo abierto, con superficie trabajada, maquinaria utilizada (horas de uso) y mano de obra (jornales/horas).
- **Tareas Técnicas:**
  1. Crear entidad ActividadAgricola (id, codigoActividad UK, tipoActividadId, loteId, cicloId, fechaHecho, horaNullable, usuarioCargaId, trabajadorResponsableId, superficieTrabajadaHa, observaciones, estado: REALIZADA).
  2. Asociar maquinarias y horas en actividad_maquinaria.
  3. Asociar mano de obra (jornales, cantidad personas, horas) en actividad_mano_obra.
  4. Validar RN-01 (pertenece a finca/lote/ciclo), RN-03 (ciclo debe estar abierto) y RN-04 (fecha hecho <= hoy).
- **Criterios de Aceptación:**
  - [x] RF-M3-02 / RN-01: Cada labor queda atada al lote y ciclo productivo abierto.
  - [x] RF-M3-04: Superficie trabajada toma por defecto la del ciclo si no se especifica.
  - [x] RF-M3-05 / RF-M3-15: Maquinaria con horas y mano de obra registradas correctamente.
  - [x] RN-04: La fecha del hecho no puede ser futura para actividades realizadas.

### `[AGRUL-022]` Planificación de Actividades, Vencimientos y Workflow de Ejecución
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 3: Actividades
- **Requisitos Funcionales:** RF-M3-07, RF-M3-08, RF-M3-09, RF-M3-14
- **Reglas de Negocio:** RN-04, RN-13
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `domain`, `workflow`, `planificacion`, `ready-for-agent`
- **Descripción:** Ciclo de vida de actividades: PLANIFICADA -> REALIZADA, VENCIDA o CANCELADA. Una actividad planificada no impacta stock ni métricas hasta que se confirma como realizada.
- **Tareas Técnicas:**
  1. Permitir fecha prevista futura para estado PLANIFICADA (excepción de RN-04).
  2. Implementar MarcarActividadRealizadaUseCase que completa datos reales y fecha efectiva de ejecución.
  3. Lógica de cálculo dinámico de estado VENCIDA cuando fechaPrevista < hoy y sigue planificada.
  4. Query para panel de inicio de actividades vencidas y próximas de los siguientes días (RF-M3-14).
  5. Garantizar RN-13: actividades planificadas no descuentan stock ni computan en indicadores.
- **Criterios de Aceptación:**
  - [ ] RF-M3-07: Planificar tarea pendiente asignada a persona y fecha prevista.
  - [ ] RF-M3-08 / RN-13: Marcar realizada actualiza fecha real y sólo en ese momento afecta indicadores.
  - [ ] RF-M3-09: Manejo de estados PLANIFICADA, REALIZADA, VENCIDA y CANCELADA (con motivo obligatorio).
  - [ ] RF-M3-14: Consulta rápida de pendientes vencidas y de próximos días.

### `[AGRUL-023]` Monitoreo de Campo (Síntomas/Plagas) y Edición/Anulación de Labores
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 3: Actividades
- **Requisitos Funcionales:** RF-M3-10, RF-M3-11, RF-M3-12, RF-M3-13
- **Reglas de Negocio:** RN-05, RN-06
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `monitoreo`, `auditoria`, `fotos`, `status:done`
- **Descripción:** Registro de observaciones de campo del productor (síntomas, plagas, fotos adjuntas) como disparador de tareas, y soporte de edición/anulación auditada de actividades con compensaciones.
- **Tareas Técnicas:**
  1. Crear tabla observacion_monitoreo (id, loteId, cicloId, fecha, sintomas, plagas, estadoCultivo, fotosUrls, usuarioId).
  2. Vincular actividad correctiva a la observación que la motivó (RF-M3-10).
  3. Implementar AnularActividadUseCase con baja lógica (RN-05) y motivo obligatorio.
  4. Si la actividad anulada involucró consumo de insumos, coordinar la reversión de stock con Módulo 9 (RF-M3-12).
- **Criterios de Aceptación:**
  - [x] RF-M3-11: Carga de observaciones de monitoreo con fotos adjuntas.
  - [x] RF-M3-10: Vínculo explícito entre actividad realizada y observación de monitoreo previa.
  - [x] RF-M3-12 / RN-05 / RN-06: Anulación conserva el registro original y revierte movimientos asociados.

---

## ÉPICA 10: MÓDULO 4 — INSUMOS Y APLICACIONES DE CAMPO

### `[AGRUL-024]` Catálogo de Insumos Fitosanitarios, Principios Activos y Carencias
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Requisitos Funcionales:** RF-M4-01, RF-M4-02
- **Reglas de Negocio:** RN-14
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `catalogo`, `fitosanitarios`, `carencia`, `senasa`, `status:done`
- **Descripción:** Catálogo maestro de insumos categorizados (plantín/semilla, fertilizante, fitosanitario, enmienda, otro) con parámetros técnicos: principio activo, período de carencia (días), reingreso (horas) y registro SENASA.
- **Tareas Técnicas:**
  1. Crear tabla insumos_catalogo (id, nombreComercial, categoria: SEMILLA_PLANTIN | FERTILIZANTE | FITOSANITARIO | ENMIENDA | OTRO, unidadMedidaId, presentacion).
  2. Crear tabla insumos_fitosanitarios_ficha (insumoId PK, principioActivo, periodoCarenciaDias, periodoReingresoHoras, nroRegistroSenasa, toxicologia).
  3. Implementar RN-14: valores de carencia y reingreso se cargan tal como figuran en el rótulo comercial, sin valores por defecto inventados por el sistema.
- **Criterios de Aceptación:**
  - [x] RF-M4-01: Catálogo estructurado con unidad de medida base y presentación comercial.
  - [x] RF-M4-02 / RN-14: Registro estricto de principio activo, carencia en días y reingreso en horas.
  - [x] Validaciones Zod de tipos y rangos numéricos.

### `[AGRUL-025]` Registro de Aplicaciones de Campo, Mezclas y Dosis Diferenciadas
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Requisitos Funcionales:** RF-M4-03, RF-M4-04, RF-M4-05, RF-M4-06, RF-M4-11, RF-M4-12
- **Reglas de Negocio:** RN-01, RN-04, RN-10
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `aplicaciones`, `dosis`, `mezclas`, `campo`, `status:done`
- **Descripción:** Registro de aplicaciones de insumos sobre lotes y ciclos, permitiendo caldos/mezclas (múltiples insumos por labor), descomposición de dosis (total, por ha, por planta, concentración) y condiciones climáticas de aplicación.
- **Tareas Técnicas:**
  1. Crear tabla aplicacion_agricola (id, actividadId FK, loteId FK, cicloId FK, fecha, responsableId, metodo, motivo, equipoAplicacion, condicionesClima: { vientoKmH, tempC, lluviaMm }).
  2. Crear tabla aplicacion_linea_insumo (id, aplicacionId FK, insumoId FK, cantidadTotal, unidadMedidaId, dosisPorSuperficie, dosisPorPlanta, concentracion).
  3. Validar RN-01 (atada a lote y ciclo) y RN-10 (disparar movimiento de stock correspondiente en Módulo 9).
- **Criterios de Aceptación:**
  - [x] RF-M4-03 / RF-M4-05: Cada aplicación está atada a una actividad, un lote y un ciclo abierto.
  - [x] RF-M4-04: Campos independientes para dosis total, por ha, por planta y concentración.
  - [x] RF-M4-06: Soporta mezclas de múltiples insumos en la misma actividad.
  - [x] RF-M4-11 / RF-M4-12: Registro de equipo utilizado y condiciones ambientales al aplicar.

### `[AGRUL-026]` Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas
- **Estado:** `DONE` ✅
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Requisitos Funcionales:** RF-M4-08, RF-M4-09
- **Reglas de Negocio:** RN-14
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `carencia`, `seguridad-alimentaria`, `advertencias`, `status:done`
- **Descripción:** Servicio de dominio que evalúa aplicaciones previas en un lote y emite alertas no bloqueantes si una cosecha o labor de cosecha se registra dentro del período de carencia vigente.
- **Tareas Técnicas:**
  1. Implementar ServicioVerificacionCarencia: calcula fechaFinCarencia = fechaAplicacion + periodoCarenciaDias.
  2. Emitir advertencia explícita en la respuesta si fechaCosecha < fechaFinCarencia (RF-M4-09 / RF-M5-11), sin bloquear la operación.
  3. Vincular recomendación técnica (agrónomo emisor y documento PDF adjunto opcional, RF-M4-08).
- **Criterios de Aceptación:**
  - [x] RF-M4-09 / RN-14: Devuelve warning claro indicando producto aplicado, días restantes de carencia y fecha segura.
  - [x] RF-M4-08: Posibilidad de adjuntar firma o documento de recomendación profesional.

### `[AGRUL-027]` Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea
- **Estado:** `DONE` ✅
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 4: Insumos y Aplicaciones
- **Requisitos Funcionales:** RF-M4-10
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `indicadores`, `insumos`, `consumo`, `status:done`
- **Descripción:** Cálculo analítico del acumulado de consumo de cada insumo por lote y ciclo productivo, así como la intensidad de uso expresada por hectárea tratada.
- **Tareas Técnicas:**
  1. Crear query de agregación agrupando por cicloId, loteId e insumoId.
  2. Calcular cantidadTotalConsumida y cantidadPorHectarea dividiendo por la superficie cultivada del ciclo.
  3. Endpoint GET /api/v1/ciclos/:id/insumos-acumulados.
- **Criterios de Aceptación:**
  - [x] RF-M4-10: Métricas precisas de consumo acumulado y consumo por ha por insumo en cada campaña.
  - [x] Tiempos de respuesta < 2s (RNF-03).

---

## ÉPICA 11: MÓDULO 5 — COSECHA, DESTINOS Y SALDO COMERCIALIZABLE

### `[AGRUL-028]` Registro de Cosechas, Descarte y Código de Trazabilidad Único
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 5: Cosecha y Destino
- **Requisitos Funcionales:** RF-M5-01, RF-M5-02, RF-M5-03, RF-M5-04, RF-M5-05, RF-M5-06
- **Reglas de Negocio:** RN-07, RN-08, RN-09
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `domain`, `cosecha`, `trazabilidad`, `descarte`, `ready-for-agent`
- **Descripción:** Registro de cosechas con desglose estricto: cantidad cosechada = comercializable + descarte (RN-09), motivos configurables de descarte y asignación automática del código de trazabilidad único (ej. COS-L03-20260915-01).
- **Tareas Técnicas:**
  1. Crear entidad Cosecha (id, codigoTrazabilidad UK, loteId, cicloId, fecha, cantidadCosechadaKg, cantidadComercializableKg, cantidadDescarteKg, motivoDescarte, observacionesCalidad, responsableId, cuadrillaId, recipientes, superficieCosechadaHa).
  2. Validar invariante RN-09: cantidadCosechadaKg === cantidadComercializableKg + cantidadDescarteKg.
  3. Generador de código algorítmico RN-07 / RN-08: formato COS-L[nro]-[YYYYMMDD]-[secuencia], inmodificable y único.
  4. Permitir múltiples cosechas sucesivas sin sobrescribir y acumulando saldo (RF-M5-04).
- **Criterios de Aceptación:**
  - [ ] RF-M5-01 / RF-M5-02: Registro con total kg, comercializable y descarte justificado.
  - [ ] RF-M5-03 / RN-08: Cada cosecha recibe un código de trazabilidad único e inalterable.
  - [ ] RN-09: Falla con HTTP 422 si la suma de comercializable + descarte no coincide con el total cosechado.

### `[AGRUL-029]` Asignación de Destinos, Saldo Comercializable y Despachos BPA
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 5: Cosecha y Destino
- **Requisitos Funcionales:** RF-M5-07, RF-M5-08, RF-M5-09, RF-M5-10
- **Reglas de Negocio:** RN-09
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `despachos`, `destinos`, `bpa`, `remito`, `ready-for-agent`
- **Descripción:** Distribución de la fruta comercializable a uno o múltiples destinos (industria, mercado fresco, venta directa), control de saldo disponible y registro de remitos conforme manual de Buenas Prácticas Agrícolas (BPA).
- **Tareas Técnicas:**
  1. Crear catálogo de destinatarios (compradores, industrias empaque/procesado).
  2. Crear tabla despacho_destino (id, cosechaId FK, destinatarioId FK, tipoDestino, cantidadEnviadaKg, fecha, nroGuiaRemito, renspaFinca, productor).
  3. Validar RN-09: la suma acumulada de envíos no puede superar la cantidad comercializable de la cosecha.
  4. Calcular saldo sin destino en tiempo real: saldo = comercializable - sum(enviados) (RF-M5-09).
- **Criterios de Aceptación:**
  - [ ] RF-M5-07 / RF-M5-09: Registro de envíos con actualización y visualización inmediata del saldo remanente.
  - [ ] RF-M5-10: Datos de remito/guía, RENSPA y productor requeridos para cumplimiento de BPA.
  - [ ] RN-09: Intento de despacho que exceda el saldo comercializable es rechazado con error 422.

### `[AGRUL-030]` Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 5: Cosecha y Destino
- **Requisitos Funcionales:** RF-M5-11, RF-M5-12, RF-M5-14
- **Reglas de Negocio:** RN-05, RN-06, RN-14
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `cosecha`, `auditoria`, `incidentes`, `perdidas`, `ready-for-agent`
- **Descripción:** Validación de carencia al momento de cosechar, circuito de corrección/anulación con motivo y auditoría sin borrado físico, y registro de pérdidas/incidentes climáticos en cosecha.
- **Tareas Técnicas:**
  1. Integrar ServicioVerificacionCarencia en el endpoint de cosecha para emitir advertencia si hay carencia vigente (RF-M5-11).
  2. Implementar AnularCosechaUseCase y ModificarCosechaUseCase preservando histórico de cambios (RN-05, RN-06).
  3. Crear tabla perdida_cosecha (cosechaId/loteId, fecha, tipo: GRANIZO | HELADA | ROBO | OTROS, cantidadEstimadaKg, descripcion).
- **Criterios de Aceptación:**
  - [ ] RF-M5-11: Notificación clara si la fecha de cosecha viola un período de carencia.
  - [ ] RF-M5-12: Corrección o anulación registra usuario, fecha anterior y motivo sin DELETE físico.
  - [ ] RF-M5-14: Registro de incidentes con estimación de volumen afectado.

### `[AGRUL-031]` Formulario Móvil Ultrarrápido de Cosecha para Operarios de Campo
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 5: Cosecha y Destino
- **Requisitos Funcionales:** RF-M5-13
- **Reglas de Negocio:** RN-01
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `mobile`, `usabilidad`, `campo`, `rnf-01`, `ready-for-agent`
- **Descripción:** Interfaz y endpoint simplificado para carga en smartphone con guantes y bajo el sol (RNF-15): sólo 4 campos obligatorios (lote, cantidad total, comercializable y fecha) y resto plegado (RNF-01).
- **Tareas Técnicas:**
  1. Diseñar formulario móvil minimalista con botones táctiles grandes (>48px) y alto contraste (RNF-15).
  2. Limitar inputs obligatorios a 4 campos: Lote, Total Cosechado, Comercializable y Fecha (RNF-01).
  3. Autocompletar ciclo activo y fecha actual.
- **Criterios de Aceptación:**
  - [ ] RF-M5-13 / RNF-01: Carga completable en menos de 15 segundos en campo con 4 campos obligatorios.
  - [ ] RNF-15: Interfaz legible a plena luz solar y amigable con dispositivos desde 360px de ancho.

---

## ÉPICA 12: MÓDULO 6 — MOTOR DE TRAZABILIDAD E INFORMES OFICIALES

### `[AGRUL-032]` Motor de Búsqueda y Recorrido Cronológico Integral de Cosecha
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 6: Trazabilidad
- **Requisitos Funcionales:** RF-M6-01, RF-M6-02, RF-M6-03, RF-M6-04, RF-M6-05, RF-M6-06, RF-M6-07
- **Reglas de Negocio:** RN-04, RN-07, RN-08
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `trazabilidad`, `motor`, `query`, `recorrido`, `ready-for-agent`
- **Descripción:** Reconstrucción cronológica ascendente completa a partir de un código de cosecha o lote: origen de plantines, ciclo, labores culturales, fitosanitarios aplicados con lote de fábrica y carencia, clima y destinos finales.
- **Tareas Técnicas:**
  1. Crear ObtenerRecorridoTrazabilidadUseCase: consulta cosecha por ID o código de trazabilidad.
  2. Recorrer y ordenar cronológicamente: partida de plantines/origen -> ciclo -> labores -> aplicaciones (con número de lote de insumo y carencia) -> cosecha -> despachos/destinos.
  3. Identificar y resaltar explícitamente lagunas de información (datos faltantes: sin responsable, sin partida de origen) sin inventar valores (RF-M6-06).
  4. Incorporar resumen meteorológico del ciclo (RF-M6-07).
- **Criterios de Aceptación:**
  - [ ] RF-M6-01 / RF-M6-02: Búsqueda ágil y reconstrucción cronológica completa de la historia de la fruta.
  - [ ] RF-M6-04 / RF-M6-05: Detalle de partida origen y lotes de insumos utilizados.
  - [ ] RF-M6-06: Flag explícito en el árbol resaltando datos faltantes para auditoría de calidad.

### `[AGRUL-033]` Emisión de Informes de Trazabilidad en PDF y Exportación CSV/Excel
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 6: Trazabilidad
- **Requisitos Funcionales:** RF-M6-08, RF-M6-09, RF-M6-10, RF-M6-11, RF-M6-13
- **Reglas de Negocio:** RN-06
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `pdf`, `csv`, `informes`, `auditoria`, `export`, `ready-for-agent`
- **Descripción:** Generación de documento formal PDF de trazabilidad para compradores y organismos de certificación (SENASA/GlobalG.A.P.) con ID de emisión, firma digital/usuario emisor, marca de anulaciones y exportación en UTF-8.
- **Tareas Técnicas:**
  1. Generar PDF estructurado con encabezado oficial, identificador único de informe, timestamp de emisión y usuario emisor (RF-M6-08).
  2. Marcar claramente rectificaciones o eventos compensatorios históricos (RF-M6-09).
  3. Filtro de privacidad (RF-M6-11 / RNF-14): omitir por defecto costos y datos de contacto de operarios.
  4. Exportador a CSV/Excel con codificación UTF-8 y encabezados con unidades de medida (RNF-11).
  5. Tabla informe_trazabilidad_log para registrar cada emisión (quién, cuándo, cuál, RF-M6-13).
- **Criterios de Aceptación:**
  - [ ] RF-M6-08: PDF generado en < 10s (RNF-03) con diseño profesional apto para auditoría.
  - [ ] RF-M6-10 / RNF-11: Archivos CSV/Excel abren sin fallas de tildes o caracteres especiales en Excel.
  - [ ] RF-M6-13: Bitácora inmutable de emisión de informes completada.

### `[AGRUL-034]` Consulta Inversa de Trazabilidad para Retiro Preventivo de Insumos (Recall)
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 6: Trazabilidad
- **Requisitos Funcionales:** RF-M6-12
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md)
- **Etiquetas:** `recall`, `seguridad-alimentaria`, `consulta-inversa`, `ready-for-agent`
- **Descripción:** Mecanismo de rastreo descendente inverso: dado un lote de insumo (ej. lote de fertilizante o pesticida contaminado), identificar al instante todos los lotes de campo, ciclos y cosechas que lo recibieron.
- **Tareas Técnicas:**
  1. Implementar ConsultaInversaInsumoUseCase: recibe loteInsumoId o insumoId.
  2. Recorrer aplicaciones que utilizaron dicho lote de insumo y listar lotes productivos y cosechas derivadas.
  3. Listar despachos y compradores que recibieron dicha producción para activar protocolo de retiro inmediato.
- **Criterios de Aceptación:**
  - [ ] RF-M6-12: Mapeo exacto de insumo -> aplicaciones -> cosechas -> destinos en una sola consulta.
  - [ ] Fundamental para contingencias sanitarias y certificaciones internacionales.

---

## ÉPICA 13: MÓDULO 7 — INDICADORES, RENDIMIENTOS Y MÉTRICAS PRODUCTIVAS

### `[AGRUL-035]` Cálculo de Rendimiento por Hectárea, Descarte y Métricas de Producción
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 7: Indicadores
- **Requisitos Funcionales:** RF-M7-01, RF-M7-02, RF-M7-07, RF-M7-08, RF-M7-09
- **Reglas de Negocio:** RN-09
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `indicadores`, `analytics`, `rendimiento`, `ready-for-agent`
- **Descripción:** Cálculos analíticos automáticos: producción total cosechada y comercializable por finca/lote/cultivo/ciclo, rendimiento en kg/ha, % de descarte, conteo de labores y tasa de prendimiento de plantines.
- **Tareas Técnicas:**
  1. Crear servicio de cálculo de rendimiento = totalKgCosechados / superficieHa.
  2. Calcular porcentajeDescarte = (cantidadDescarteKg / cantidadCosechadaTotalKg) * 100.
  3. Contabilizar actividades por categoría en cada ciclo (preparación, riego, fertilización, etc.).
  4. Calcular prendimiento y reposición de plantas = (plantasVivas / plantasPlantadas) * 100 (RF-M7-09).
- **Criterios de Aceptación:**
  - [ ] RF-M7-01 / RF-M7-02: Rendimiento kg/ha exacto por lote y ciclo.
  - [ ] RF-M7-07: Porcentaje de descarte calculado por cosecha y consolidado por ciclo.
  - [ ] RF-M7-08 / RF-M7-09: Métricas agregadas disponibles vía API REST.

### `[AGRUL-036]` Comparador de Campañas, Evolución Histórica y Relación Insumo-Producto
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 7: Indicadores
- **Requisitos Funcionales:** RF-M7-03, RF-M7-04, RF-M7-05, RF-M7-06, RF-M7-10, RF-M7-11
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `comparador`, `campañas`, `analytics`, `ready-for-agent`
- **Descripción:** Comparación entre campañas del mismo lote o entre lotes de la misma campaña, correlación entre insumos aplicados y producción obtenida, distinguiendo ciclos cerrados de ciclos en curso.
- **Tareas Técnicas:**
  1. Crear endpoint de comparación con filtros combinables (finca, lote, cultivo, variedad, fechas).
  2. Diferenciar visualmente métricas de ciclos en curso (provisionales) de ciclos cerrados (definitivos) (RF-M7-11).
  3. Cálculo de eficiencia de insumos: kg producto cosechado / unidades de fertilizante o agroquímico aplicado (RF-M7-05).
- **Criterios de Aceptación:**
  - [ ] RF-M7-03 / RF-M7-04: Comparación tabular y gráfica de rendimientos intercampaña.
  - [ ] RF-M7-11: Indicador explícito de estado parcial en ciclos en curso.

### `[AGRUL-037]` Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 7: Indicadores
- **Requisitos Funcionales:** RF-M7-12, RF-M7-13, RF-M7-14
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `dashboard`, `chartjs`, `kpi`, `ready-for-agent`
- **Descripción:** Panel de control principal con KPIs clave (lotes en producción, producción acumulada, alertas de stock bajo y actividades vencidas), visualizaciones con Chart.js y módulo opcional de costos.
- **Tareas Técnicas:**
  1. Crear endpoint GET /api/v1/dashboard/resumen que agregue los 4 KPIs en una sola llamada rápida (<2s, RNF-03).
  2. Integrar gráficos de barras y líneas con Chart.js para evolución de cosecha y consumos.
  3. Exportación de tablas y gráficos a PDF y CSV.
  4. Estructura opcional para cómputo de costos por lote (insumos + mano de obra + horas tractor, RF-M7-14).
- **Criterios de Aceptación:**
  - [ ] RF-M7-12: Tablero ejecutivo con los 4 indicadores esenciales visibles al ingresar.
  - [ ] RF-M7-13: Gráficos interactivos responsive compatibles con exportación.

---

## ÉPICA 14: MÓDULO 8 — USUARIOS, ROLES, SEGURIDAD Y AUDITORÍA

### `[AGRUL-038]` Gestión de Usuarios, Autenticación y Control de Acceso por Finca
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Requisitos Funcionales:** RF-M8-01, RF-M8-02, RF-M8-03, RF-M8-04, RF-M8-05, RF-M8-10
- **Reglas de Negocio:** RN-16
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `auth`, `security`, `rbac`, `fincas`, `ready-for-agent`
- **Descripción:** Sistema de autenticación y autorización con perfiles diferenciados (ADMINISTRADOR, ENCARGADO, OPERARIO, ASESOR_AGRONOMO), hashing seguro (Argon2/bcrypt), bloqueo por intentos fallidos y restricción por fincas asignadas.
- **Tareas Técnicas:**
  1. Crear tablas usuarios, perfiles_permisos y usuario_finca_asignacion.
  2. Implementar autenticación con JWT / cookie segura, hash + salt y bloqueo temporal tras N intentos fallidos.
  3. Middleware de autorización Fastify que verifica permisos del perfil y asignación de finca en cada request (RF-M8-05 / RN-16).
  4. Soportar rol asesor agrónomo con permisos de solo lectura y carga de recomendaciones (RF-M8-10).
- **Criterios de Aceptación:**
  - [ ] RF-M8-03 / RNF-04: Contraseñas con hash seguro y bloqueo tras intentos fallidos.
  - [ ] RF-M8-04 / RN-16: Operario solo accede a carga/consulta de sus tareas; Administrador a configuración total.
  - [ ] RF-M8-05: El usuario no puede visualizar ni operar fincas a las que no fue expresamente asignado.

### `[AGRUL-039]` Atribución Automática Inalterable y Diferenciación de Ejecutor vs Cargador
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Requisitos Funcionales:** RF-M8-06, RF-M8-07
- **Reglas de Negocio:** RN-04
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `auditoria`, `atribucion`, `seguridad`, `ready-for-agent`
- **Descripción:** Registro automático e inalterable del usuario autenticado que cargó el registro en base de datos, diferenciándolo del trabajador de campo que realizó materialmente la tarea.
- **Tareas Técnicas:**
  1. Inyectar usuarioCargaId automáticamente desde el contexto de la sesión autenticada en todos los casos de uso.
  2. Prohibir que el payload del cliente sobreescriba el usuarioCargaId (RN-04 / RF-M8-06).
  3. Permitir campo trabajadorEjecutorId separado para reflejar cuando el encargado pasa labores registradas en papel por operarios (RF-M8-07).
- **Criterios de Aceptación:**
  - [ ] RF-M8-06 / RN-04: usuarioCargaId siempre corresponde al usuario autenticado y es inalterable.
  - [ ] RF-M8-07: Claridad total entre quién ingresó el dato al sistema y quién ejecutó la labor en el lote.

### `[AGRUL-040]` Bitácora Centralizada de Auditoría y Seguridad de Sesión
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 8: Usuarios y Seguridad
- **Requisitos Funcionales:** RF-M8-08, RF-M8-09
- **Reglas de Negocio:** RN-06
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `audit-log`, `session`, `security`, `ready-for-agent`
- **Descripción:** Registro inmutable de auditoría para ingresos, altas, modificaciones (con valor previo), bajas lógicas y emisión de reportes, junto con expiración de sesión por inactividad y cambio obligatorio de password inicial.
- **Tareas Técnicas:**
  1. Crear tabla auditoria_seguridad_log (id, usuarioId, accion: LOGIN | CREAR | EDITAR | ANULAR | EMITIR_REPORTE, entidad, entidadId, valorPrevioJson, valorNuevoJson, ip, userAgent, timestamp).
  2. Configurar timeout de inactividad configurable en sesión (RF-M8-09).
  3. Forzar flag debeCambiarPassword en primer ingreso del usuario.
- **Criterios de Aceptación:**
  - [ ] RF-M8-08 / RN-06: Cada cambio crítico queda registrado con su delta de valor previo y posterior.
  - [ ] RF-M8-09: Cierre automático de sesión tras tiempo de inactividad configurado.

---

## ÉPICA 15: MÓDULO 9 — INVENTARIO DE INSUMOS Y STOCK

### `[AGRUL-041]` Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 9: Stock de Insumos
- **Requisitos Funcionales:** RF-M9-01, RF-M9-02, RF-M9-14
- **Reglas de Negocio:** RN-12
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `catalogo`, `proveedores`, `unidades`, `conversiones`, `ready-for-agent`
- **Descripción:** Gestión de proveedores comerciales y sistema riguroso de unidades de medida (unidad de consumo vs unidad de compra) con tabla de equivalencias explícita (el sistema nunca convierte litros a kg sin densidad cargada, RN-12).
- **Tareas Técnicas:**
  1. Crear tabla proveedores (id, razonSocial, cuit, contacto, telefono, email).
  2. Crear tabla insumo_unidades_equivalencia (insumoId, unidadCompra, unidadConsumo, factorMultiplicador, densidadKgL nullable).
  3. Implementar convertidor de unidades de dominio que arroje UnidadConversionInvalidaError si no existe equivalencia registrada (RN-12 / RF-M9-14).
- **Criterios de Aceptación:**
  - [ ] RF-M9-01: Definición clara de unidad de compra (ej. bidón 20L) y unidad de consumo (ej. L o ml).
  - [ ] RN-12 / RF-M9-14: Prohibida la conversión automática litros a kg salvo que exista densidad registrada para ese insumo.

### `[AGRUL-042]` Gestión de Ingresos por Compra y Segregación de Depósitos BPA
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 9: Stock de Insumos
- **Requisitos Funcionales:** RF-M9-03, RF-M9-05, RF-M9-19
- **Reglas de Negocio:** RN-10
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `compras`, `stock-inicial`, `depositos`, `bpa`, `ready-for-agent`
- **Descripción:** Registro de compras con comprobantes, lote de fabricación, vencimiento y ubicación en depósito físico (separando fertilizantes de fitosanitarios y vencidos conforme manual BPA), y carga de saldo inicial.
- **Tareas Técnicas:**
  1. Crear tabla deposito_almacenamiento (id, fincaId, nombre, tipoPermitido: FITOSANITARIOS | FERTILIZANTES | INSUMOS_GENERALES | ZONA_VENCIDOS).
  2. Crear caso de uso RegistrarIngresoCompra (insumoId, proveedorId, cantidad, loteFabricacion, fechaVencimiento, depositoId, nroFacturaRemito, comprobanteAdjunto).
  3. Crear caso de uso CargarStockInicial (RF-M9-05) que crea el movimiento inicial de implantación del sistema.
- **Criterios de Aceptación:**
  - [ ] RF-M9-03: Ingreso registra proveedor, lote de fabricación y vencimiento.
  - [ ] RF-M9-19: Validación de depósito evitando almacenar fitosanitarios junto a fertilizantes conforme BPA.
  - [ ] RF-M9-05: Carga de saldo inicial genera movimiento auditado.

### `[AGRUL-043]` Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 9: Stock de Insumos
- **Requisitos Funcionales:** RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15
- **Reglas de Negocio:** RN-10, RN-11
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `stock`, `ledger`, `idempotencia`, `acid`, `ready-for-agent`
- **Descripción:** Libro mayor append-only de inventario (el stock nunca cambia sin movimiento, RN-10), clave única de idempotencia en formularios (RN-11 / RF-M9-06), compensación de movimientos ante edición/anulación y manejo de saldos negativos advertidos.
- **Tareas Técnicas:**
  1. Crear tabla stock_movimientos (id, insumoId, loteFabricacionId, tipoMovimiento: SALDO_INICIAL | INGRESO_COMPRA | SALIDA_CONSUMO | DEVOLUCION | PERDIDA | AJUSTE_FISICO | REVERSION, cantidad, unidadMedidaId, fecha, usuarioId, referenciaTipo, referenciaId, claveIdempotencia UK).
  2. Implementar protección contra dobles descuentos mediante claveIdempotencia única por envío de formulario (RF-M9-06 / RN-11).
  3. Implementar reversión atómica de movimientos al modificar o anular una aplicación de campo (RF-M9-07).
  4. Si la salida excede el stock físico disponible, permitir continuar solo con justificación/motivo explícito marcando la diferencia (RF-M9-15).
- **Criterios de Aceptación:**
  - [ ] RN-10 / RNF-05: Todo cambio de stock es transaccional (ACID) y genera fila en stock_movimientos.
  - [ ] RN-11 / RF-M9-06: Reintentos con la misma clave de idempotencia no duplican movimientos.
  - [ ] RF-M9-07: Modificación de dosis revierte el movimiento anterior e inserta el nuevo ajustado.
  - [ ] RF-M9-13: Saldo de envases parcialmente abiertos llevado en unidad de consumo.

### `[AGRUL-044]` Stock Mínimo Configurable, Stock Reservado y Alertas de Reposición
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 9: Stock de Insumos
- **Requisitos Funcionales:** RF-M9-08, RF-M9-09, RF-M9-18
- **Reglas de Negocio:** RN-13
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `alertas`, `stock-minimo`, `reposicion`, `ready-for-agent`
- **Descripción:** Definición de stock crítico/mínimo por insumo sin defaults, cálculo de stock disponible = físico - reservado (actividades planificadas futuras) y despacho de alertas visuales y por correo.
- **Tareas Técnicas:**
  1. Agregar campo stockMinimoConfigurable a insumos (sin valores precargados arbitrarios, RF-M9-08).
  2. Calcular stockReservado sumando insumos previstos en actividades con estado PLANIFICADA (RF-M9-18 / RN-13).
  3. Calcular stockDisponible = stockFisico - stockReservado.
  4. Emitir alertas de reposición cuando stockDisponible <= stockMinimoConfigurable en pantalla principal y notificaciones (RF-M9-09).
- **Criterios de Aceptación:**
  - [ ] RF-M9-08 / RF-M9-09: Alerta visual inmediata en dashboard ante quiebre de stock mínimo.
  - [ ] RF-M9-18: Stock reservado bloquea insumos comprometidos en tareas planificadas sin descontarlos antes de tiempo.

### `[AGRUL-045]` Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Módulo 9: Stock de Insumos
- **Requisitos Funcionales:** RF-M9-10, RF-M9-11, RF-M9-12, RF-M9-16, RF-M9-17, RF-M9-20
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `fefo`, `vencimientos`, `ajustes`, `inventario-fisico`, `ready-for-agent`
- **Descripción:** Sugerencia de lote de insumo más próximo a vencer (First Expired, First Out - FEFO), bloqueo de insumos vencidos para aplicación, registro de inventarios físicos con ajuste por diferencia y reporte valorizado de existencias.
- **Tareas Técnicas:**
  1. Algoritmo de sugerencia FEFO al consumir insumos con varios lotes (RF-M9-16).
  2. Bloquear la selección de lotes de insumos cuya fecha de vencimiento ya expiró (RF-M9-10).
  3. Implementar caso de uso RegistrarInventarioFisico: calcula diferencia y genera movimiento AJUSTE_FISICO con motivo (RF-M9-11).
  4. Registrar mermas y pérdidas (robo, derrame, rotura) con motivo (RF-M9-12).
  5. Emitir reporte de existencias valorizadas según precio de compra ponderado (RF-M9-20).
- **Criterios de Aceptación:**
  - [ ] RF-M9-10: Error si se intenta aplicar un insumo vencido.
  - [ ] RF-M9-16: Sugerencia automática del lote que vence primero.
  - [ ] RF-M9-11: Inventario físico auditado con permisos de Encargado o Administrador.

---

## ÉPICA 16: MÓDULO 10 — INFORMACIÓN AGRO-METEOROLÓGICA

### `[AGRUL-046]` Registro Manual e Importación CSV de Datos Climáticos de Finca
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 10: Clima
- **Requisitos Funcionales:** RF-M10-01, RF-M10-02, RF-M10-04, RF-M10-05, RF-M10-06
- **Reglas de Negocio:** RN-04, RN-06
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `clima`, `meteorologia`, `csv`, `registro`, `ready-for-agent`
- **Descripción:** Carga manual diaria e importación masiva por archivo CSV de datos de estaciones meteorológicas propias: temperaturas (min/max), precipitación (mm), humedad relativa, velocidad de viento, heladas y granizo con validación física estricta.
- **Tareas Técnicas:**
  1. Crear tabla mediciones_meteorologicas (id, fincaId, fecha, tempMinC, tempMaxC, precipitacionMm, humedadRelativaPct, vientoKmH, huboHelada, huboGranizo, fuenteDato: MEDICION_PROPIA | ESTACION_PROPIA | SERVICIO_EXTERNO | DATO_ZONA, observaciones).
  2. Validaciones de integridad física (RF-M10-05): humedad entre 0 y 100%, precipitación >= 0, tempMin <= tempMax.
  3. Parser e importador de archivos CSV para estaciones automáticas locales (RF-M10-04).
  4. Inmutabilidad histórica (RF-M10-06): datos importados no se sobreescriben; correcciones generan nuevo registro auditado con motivo.
- **Criterios de Aceptación:**
  - [ ] RF-M10-01 / RF-M10-02: Registro manual diario con fuente de datos guardada.
  - [ ] RF-M10-05: Rechazo inmediato ante datos físicamente inválidos (ej. humedad negativa o lluvia negativa).
  - [ ] RF-M10-04: Carga batch vía CSV validada.

### `[AGRUL-047]` Integración de API de Clima para Lules, Pronósticos y Alertas Adversas
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 10: Clima
- **Requisitos Funcionales:** RF-M10-03, RF-M10-08, RF-M10-09, RF-M10-14
- **Skills:** [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md), [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md)
- **Etiquetas:** `clima`, `api-externa`, `pronostico`, `alertas`, `ready-for-agent`
- **Descripción:** Conexión automática a servicio meteorológico externo configurable por coordenadas GPS de la finca (Lules, Tucumán), captura de pronósticos a 5 días y motor de alertas tempranas configurables (heladas, vientos fuertes para pulverización).
- **Tareas Técnicas:**
  1. Crear adaptador de infraestructura para API meteorológica (Open-Meteo o similar sin costo para lat/lon de Lules).
  2. Crear job programado para sincronización diaria de mediciones y pronósticos (RF-M10-03 / RF-M10-14).
  3. Tabla alertas_climaticas_config (fincaId, variable, condicion: MAYOR_QUE | MENOR_QUE, umbral, destinatarios).
  4. Disparar alerta en pantalla de inicio si el pronóstico o dato real quiebra el umbral configurado (RF-M10-09).
- **Criterios de Aceptación:**
  - [ ] RF-M10-03: Sincronización automática de clima según coordenadas de la finca.
  - [ ] RF-M10-08 / RF-M10-09: Reglas de alerta configuradas por usuario activas y visibles en dashboard.
  - [ ] RF-M10-14: Visualización de pronóstico extendido con advertencia temprana.

### `[AGRUL-048]` Contexto Climático en Labores, Eventos Adversos y Serie Histórica del Lote
- **Estado:** `TODO` 📌
- **Prioridad:** Media (P2)
- **Módulo:** Módulo 10: Clima
- **Requisitos Funcionales:** RF-M10-07, RF-M10-10, RF-M10-11, RF-M10-12, RF-M10-13
- **Skills:** [domain-traceability.md](file:///c:/AGRUL/.cursor/skills/domain-traceability.md), [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md)
- **Etiquetas:** `clima`, `series-temporales`, `eventos-adversos`, `ready-for-agent`
- **Descripción:** Exhibición automática de condiciones del día (lluvia 24h previa, viento) al registrar riego o pulverizaciones, registro de siniestros (helada, granizo con fotos y daño estimado) y superposición de actividades sobre la curva climática del ciclo.
- **Tareas Técnicas:**
  1. Endpoint contextual: GET /api/v1/fincas/:id/clima-contexto que devuelve lluvia últimas 24h, viento actual y temp para sugerir o advertir condiciones de pulverización (RF-M10-10).
  2. Crear tabla eventos_climaticos_adversos (loteId, fecha, tipoSiniestro: HELADA | GRANIZO | CALOR_EXTREMO | INUNDACION, danoEstimadoPct, fotosUrls, descripcion) (RF-M10-11).
  3. Calcular resumen climático del ciclo: lluvia acumulada en la campaña, días de helada registrados y temperaturas extremas (RF-M10-12).
  4. Gráfico de serie temporal combinando temperatura, lluvia acumulada e hitos de labores/aplicaciones (RF-M10-07 / RF-M10-13).
- **Criterios de Aceptación:**
  - [ ] RF-M10-10: Información climática previa visible al operario durante la carga de aplicaciones.
  - [ ] RF-M10-11: Registro fotográfico y volumétrico de siniestros de campo.
  - [ ] RF-M10-12 / RF-M10-13: Gráfica climática integrada con los eventos del ciclo productivo.

---

## ÉPICA 17: REQUISITOS NO FUNCIONALES & CUMPLIMIENTO NORMATIVO

### `[AGRUL-049]` Resiliencia Móvil Offline, Borradores Locales e Idempotencia en Cliente
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Transversal RNF
- **Reglas de Negocio:** RN-11
- **Skills:** [api-contracts.md](file:///c:/AGRUL/.cursor/skills/api-contracts.md), [architecture.md](file:///c:/AGRUL/.cursor/skills/architecture.md)
- **Etiquetas:** `rnf`, `offline`, `pwa`, `idempotencia`, `ready-for-agent`
- **Descripción:** Garantizar la operatividad en fincas rurales con conectividad intermitente: almacenamiento local en IndexedDB/LocalStorage, reintentos automáticos sin duplicación mediante claves UUIDv4 y diseño para pantallas de 360px.
- **Tareas Técnicas:**
  1. Implementar wrapper de almacenamiento local para guardar borradores de actividades/cosechas ante caída de red (RNF-02).
  2. Generar clave única de idempotencia en frontend al abrir el formulario (RF-M9-06 / RN-11).
  3. Sincronización en segundo plano con backoff exponencial al detectar restauración de conectividad.
  4. Verificar diseño responsivo desde 360px de ancho con viewport móvil adecuado (RNF-09).
- **Criterios de Aceptación:**
  - [ ] RNF-02: Cortar la conexión durante el envío y reintentar no genera duplicados en la base de datos.
  - [ ] RNF-09: Funcionalidad completa y testeada en Chrome móvil y Android estándar.
  - [ ] RNF-01 / RNF-15: Experiencia de usuario optimizada para campo.

### `[AGRUL-050]` Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca
- **Estado:** `TODO` 📌
- **Prioridad:** Alta (P1)
- **Módulo:** Transversal RNF
- **Reglas de Negocio:** RN-05
- **Skills:** [database-events.md](file:///c:/AGRUL/.cursor/skills/database-events.md), [testing-quality.md](file:///c:/AGRUL/.cursor/skills/testing-quality.md)
- **Etiquetas:** `rnf`, `localizacion`, `compliance`, `multi-tenant`, `ready-for-agent`
- **Descripción:** Configuración integral de localización: zona horaria obligatoria America/Argentina/Tucuman (UTC-3), formato dd/mm/aaaa, unidades métricas (kg, L, ha, °C, mm), política de no borrado físico por 3 años (BPA) y arquitectura multi-finca/productor.
- **Tareas Técnicas:**
  1. Configurar formateo de fechas y parsing estricto con zona horaria America/Argentina/Tucuman evitando corrimientos de día a las 23:30 (RNF-12).
  2. Auditar esquema de persistencia para garantizar que toda entidad lleve fincaId u organizacionId (RNF-16).
  3. Configurar reglas y políticas para impedir eliminación física (DELETE) de registros productivos antes de 3 años conforme manual de BPA (RNF-06 / RN-05).
  4. Escribir test de regresión verificando que una carga a las 23:30 UTC-3 preserve la fecha correcta.
- **Criterios de Aceptación:**
  - [ ] RNF-12: Prueba de guardado a las 23:30 hs no altera la fecha del evento.
  - [ ] RNF-06: Ningún endpoint de usuario admite DELETE físico sobre datos productivos históricos.
  - [ ] RNF-16: Aislamiento estricto multi-finca preparado para soportar múltiples organizaciones.

---

