import fs from 'node:fs';
import path from 'node:path';

const tickets = [
  // --- Épicas 1 a 6 (Existentes) ---
  {
    id: "AGRUL-001",
    epic: "Épica 1: Núcleo de Dominio & Tooling",
    epicId: "epic-1-core",
    title: "Configuración de Tooling, TypeScript y Sistema de Skills",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursorrules", ".cursor/skills/architecture.md"],
    module: "Core",
    rf: [],
    rn: [],
    labels: ["core", "tooling", "status:done"],
    description: "Inicializar el entorno de desarrollo con Node.js ESM, TypeScript estricto, Vitest y la estructura modular de skills de Matt Pocock.",
    tasks: [
      "Configurar package.json con dependencias productivas y de testing.",
      "Configurar tsconfig.json con resolución NodeNext y path aliases.",
      "Crear suite de skills en .cursor/skills/."
    ],
    acceptanceCriteria: [
      "package.json configurado con fastify, drizzle-orm, zod, pg, vitest, tsx, typescript.",
      "tsconfig.json con resolución NodeNext y aliases @core/*, @app/*, @infra/*.",
      "Suite de skills creadas en .cursor/skills/ con triggers y formato canónico."
    ]
  },
  {
    id: "AGRUL-002",
    epic: "Épica 1: Núcleo de Dominio & Tooling",
    epicId: "epic-1-core",
    title: "Entidades Centrales y Value Objects del Dominio",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md"],
    module: "Core",
    rf: [],
    rn: ["RN-07"],
    labels: ["domain", "traceability", "status:done"],
    description: "Implementar las entidades de dominio puro sin dependencias de frameworks: Lote, TraceEvent, LoteGenealogia, CodigoLote, TipoEvento, MaquinaEstadosLote y jerarquía de DomainError.",
    tasks: [
      "Crear entidades de dominio en src/core/domain/entities/.",
      "Implementar Value Objects y validaciones en src/core/domain/value-objects/.",
      "Codificar suite de tests unitarios de dominio en Vitest."
    ],
    acceptanceCriteria: [
      "TraceEvent es inmutable y requiere eventoReferenciadoId en compensaciones.",
      "Lote controla su ciclo de vida y balance de masa disponible.",
      "LoteGenealogia prohíbe ciclos de auto-paternidad.",
      "15 tests unitarios de dominio pasando en verde con Vitest."
    ]
  },
  {
    id: "AGRUL-003",
    epic: "Épica 2: Casos de Uso & Persistencia Base",
    epicId: "epic-2-persistence",
    title: "Puertos de Persistencia y Esquema Drizzle ORM",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/architecture.md"],
    module: "Persistencia",
    rf: [],
    rn: ["RN-04", "RN-05"],
    labels: ["database", "drizzle", "status:done"],
    description: "Definir las interfaces de puertos de persistencia (LotesRepositoryPort, EventosRepositoryPort, GenealogiaRepositoryPort) y el esquema PostgreSQL con Drizzle ORM.",
    tasks: [
      "Definir puertos en src/core/ports/.",
      "Definir esquemas Drizzle con tipos estrictos e índices en src/infrastructure/persistence/drizzle/.",
      "Implementar repositorios en memoria para testing."
    ],
    acceptanceCriteria: [
      "Contratos de repositorios aislados en src/core/ports/.",
      "Tablas lotes, eventos_trazabilidad y lote_genealogia tipadas con índices compuestos.",
      "Repositorios en memoria (InMemory*) para testing unitario determinístico."
    ]
  },
  {
    id: "AGRUL-004",
    epic: "Épica 2: Casos de Uso & Persistencia Base",
    epicId: "epic-2-persistence",
    title: "Casos de Uso Nucleares: Alta, Eventos y Linaje",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Aplicación",
    rf: [],
    rn: ["RN-04", "RN-07"],
    labels: ["application", "use-cases", "status:done"],
    description: "Orquestar la lógica de aplicación en casos de uso: CrearLoteUseCase, RegistrarEventoUseCase y ObtenerLinajeUseCase.",
    tasks: [
      "Implementar DTOs tipados en src/application/dtos/.",
      "Implementar casos de uso con persistencia atómica en src/application/use-cases/.",
      "Crear tests de aplicación con repositorios en memoria."
    ],
    acceptanceCriteria: [
      "DTOs tipados de entrada y salida en src/application/dtos/.",
      "Rollback y rechazo ante transiciones de estado imposibles o lotes cerrados.",
      "Tests unitarios de casos de uso pasando en Vitest (10 tests)."
    ]
  },
  {
    id: "AGRUL-005",
    epic: "Épica 3: API REST Fastify & Integración",
    epicId: "epic-3-api",
    title: "Schemas Zod, Error Handler y Factoría Fastify",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/api-contracts.md"],
    module: "API REST",
    rf: [],
    rn: [],
    labels: ["api", "fastify", "zod", "status:done"],
    description: "Configurar el servidor Fastify v5 con validación Zod (fastify-type-provider-zod) y middleware centralizado de errores con Envelope Pattern.",
    tasks: [
      "Configurar Fastify con fastify-type-provider-zod.",
      "Crear middleware de manejo centralizado de DomainError y ZodError.",
      "Implementar factoría buildApp desacoplada para testing."
    ],
    acceptanceCriteria: [
      "Formato estándar de respuesta { success, data, error, timestamp } en todos los endpoints.",
      "Mapeo de errores de negocio a HTTP 422 y sintácticos a HTTP 400 con array details.",
      "Factoría buildApp desacoplada para inyección de dependencias en tests."
    ]
  },
  {
    id: "AGRUL-006",
    epic: "Épica 3: API REST Fastify & Integración",
    epicId: "epic-3-api",
    title: "Rutas API v1 e Ingesta Batch Offline",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/api-contracts.md", ".cursor/skills/testing-quality.md"],
    module: "API REST",
    rf: [],
    rn: ["RN-04"],
    labels: ["api", "endpoints", "batch", "status:done"],
    description: "Exponer endpoints REST en /api/v1/ para health, lotes, eventos, linaje e ingesta masiva offline (sincronizar batch de hasta 500 items).",
    tasks: [
      "Crear controladores y rutas en src/infrastructure/http/.",
      "Implementar endpoint batch POST /api/v1/eventos/sincronizar.",
      "Escribir tests de integración HTTP con app.inject()."
    ],
    acceptanceCriteria: [
      "Endpoints /health, /lotes, /lotes/:id/eventos, /lotes/:id/linaje y /eventos/sincronizar operativos.",
      "Tests de integración HTTP con app.inject() verificando contratos y códigos de estado.",
      "Total acumulado de 31 tests pasando al 100%."
    ]
  },
  {
    id: "AGRUL-007",
    epic: "Épica 4: Operaciones Avanzadas de Linaje",
    epicId: "epic-4-linaje",
    title: "Caso de Uso y Endpoint: División de Lote (Split 1:N)",
    status: "DONE",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Linaje",
    rf: [],
    rn: ["RN-07", "RN-09"],
    labels: ["domain", "use-case", "linaje", "status:done"],
    description: "Implementar la lógica completa para fraccionar un lote padre en N lotes hijos garantizando el balance de masa.",
    tasks: [
      "Crear DividirLoteUseCase en src/application/use-cases/.",
      "Verificar invariante de balance de masa: sum(cantidades_hijos) <= cantidad_padre.",
      "Descontar stock del padre y generar N nuevos agregados Lote.",
      "Crear los registros en lote_genealogia con motivo_relacion = 'SPLIT'.",
      "Registrar el evento DIVISION_SPLIT en el log de auditoría.",
      "Exponer endpoint POST /api/v1/lotes/:id/split."
    ],
    acceptanceCriteria: [
      "Arrojar CantidadInsuficienteError (HTTP 422) si la suma excede la cantidad del padre.",
      "Persistencia atómica de hijos, padre, aristas genealógicas y evento en la misma transacción.",
      "Tests unitarios y de integración HTTP que validen el balance de masa."
    ]
  },
  {
    id: "AGRUL-008",
    epic: "Épica 4: Operaciones Avanzadas de Linaje",
    epicId: "epic-4-linaje",
    title: "Caso de Uso y Endpoint: Fusión de Lotes (Merge / Blend N:1)",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Linaje",
    rf: [],
    rn: ["RN-07"],
    labels: ["domain", "use-case", "linaje", "ready-for-agent"],
    description: "Implementar la combinación de materias primas de múltiples lotes origen en un único lote destino (mezcla en tanque o bines).",
    tasks: [
      "Crear FusionarLotesUseCase en src/application/use-cases/.",
      "Validar existencia y disponibilidad de todos los lotes padres participantes.",
      "Crear nuevo lote hijo con la suma de las cantidades aportadas.",
      "Descontar las cantidades correspondientes a cada lote padre.",
      "Registrar aristas en lote_genealogia con motivo_relacion = 'BLEND_MERGE'.",
      "Exponer endpoint POST /api/v1/lotes/merge."
    ],
    acceptanceCriteria: [
      "Rollback total si cualquiera de los lotes origen no tiene stock suficiente.",
      "El árbol de linaje del lote hijo debe mostrar a todos los padres como ancestros inmediatos.",
      "Tests unitarios y de integración verificando la conservación de masa."
    ]
  },
  {
    id: "AGRUL-009",
    epic: "Épica 5: Infraestructura PostgreSQL & Migraciones",
    epicId: "epic-5-infra",
    title: "Generación de Migraciones SQL y Triggers de Inmutabilidad",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md"],
    module: "Base de Datos",
    rf: [],
    rn: ["RN-04", "RN-05"],
    labels: ["database", "postgres", "migrations", "ready-for-agent"],
    description: "Generar migraciones SQL formales mediante Drizzle Kit y configurar trigger PL/pgSQL que bloquea UPDATE y DELETE sobre eventos_trazabilidad.",
    tasks: [
      "Ejecutar npx drizzle-kit generate para emitir sentencias DDL iniciales.",
      "Añadir migración custom del trigger trg_bloquear_mutacion_eventos.",
      "Crear script npm run db:migrate y test de rechazo de mutación."
    ],
    acceptanceCriteria: [
      "Migraciones versionadas en drizzle/migrations/.",
      "Test automatizado contra PostgreSQL real que valide rechazo de UPDATE/DELETE con VIOLACION_DE_INMUTABILIDAD.",
      "Script de migración automatizado en package.json."
    ]
  },
  {
    id: "AGRUL-010",
    epic: "Épica 5: Infraestructura PostgreSQL & Migraciones",
    epicId: "epic-5-infra",
    title: "Entorno Docker Compose para PostgreSQL Local",
    status: "DONE",
    priority: "Media (P2)",
    skills: [".cursor/skills/architecture.md"],
    module: "Infraestructura",
    rf: [],
    rn: [],
    labels: ["docker", "postgres", "status:done"],
    description: "Proveer un docker-compose.yml para levantar PostgreSQL 16 con extensiones y variables de entorno configuradas.",
    tasks: [
      "Configurar docker-compose.yml con postgres:16-alpine.",
      "Configurar healthcheck y volúmenes persistentes.",
      "Documentar .env.example."
    ],
    acceptanceCriteria: [
      "docker compose up -d inicializa agrul_db en puerto 5432.",
      "Healthcheck configurado y validado.",
      ".env.example documentado."
    ]
  },
  {
    id: "AGRUL-011",
    epic: "Épica 6: Frontend Dashboard & Visualizador de Trazabilidad",
    epicId: "epic-6-frontend",
    title: "Dashboard Web Operativo de Lotes",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/architecture.md"],
    module: "Frontend",
    rf: [],
    rn: [],
    labels: ["frontend", "ui", "ready-for-agent"],
    description: "Interfaz moderna para visualizar la lista de lotes activos, estados, stock y registrar nuevos eventos o lotes.",
    tasks: [
      "Crear layout base con diseño estético premium (dark mode / glassmorphism).",
      "Implementar tabla interactiva de lotes con filtros por estado.",
      "Construir modal/formulario de registro de eventos con validación en cliente."
    ],
    acceptanceCriteria: [
      "Diseño estético premium con tipografía moderna y paleta cuidada.",
      "Filtro interactivo por estado (CREADO, EN_PROCESO, EMBALADO, DESPACHADO).",
      "Formulario de registro de eventos conectado a la API REST."
    ]
  },
  {
    id: "AGRUL-012",
    epic: "Épica 6: Frontend Dashboard & Visualizador de Trazabilidad",
    epicId: "epic-6-frontend",
    title: "Visualizador Gráfico de Linaje Interactivo (Grafo N:M)",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/domain-traceability.md"],
    module: "Frontend",
    rf: [],
    rn: ["RN-07"],
    labels: ["frontend", "linaje", "graph", "ready-for-agent"],
    description: "Componente visual interactivo que renderiza el árbol genealógico completo (padres, transformaciones, hijos) a partir de /api/v1/lotes/:id/linaje.",
    tasks: [
      "Integrar librería de grafos dirigida (ej. Cytoscape.js o React Flow / D3).",
      "Mapear respuesta de ancestros y descendientes a nodos y aristas con motivos SPLIT/BLEND.",
      "Implementar simulación de retiro preventivo (Recall) resaltando descendencia en rojo."
    ],
    acceptanceCriteria: [
      "Visualización clara de flujos de Split y Merge.",
      "Navegación al hacer clic en un lote a su vista de detalle.",
      "Modo Recall Simulator operativo destacando lotes derivados."
    ]
  },
  {
    id: "AGRUL-013",
    epic: "Épica 6: Frontend Dashboard & Visualizador de Trazabilidad",
    epicId: "epic-6-frontend",
    title: "Generador y Lector de Códigos QR para Operarios de Campo",
    status: "TODO",
    priority: "Baja (P3)",
    skills: [".cursor/skills/api-contracts.md"],
    module: "Frontend",
    rf: [],
    rn: ["RN-07"],
    labels: ["frontend", "qr", "mobile", "ready-for-agent"],
    description: "Generación de etiquetas con código QR descargables e imprimibles para bines/pallets y lector de cámara para escaneo rápido.",
    tasks: [
      "Implementar generador de QR con código único de lote.",
      "Diseñar plantilla imprimible de campo con datos clave y QR.",
      "Implementar lector de cámara HTML5/Webcam que redirija a la ficha o registro de evento."
    ],
    acceptanceCriteria: [
      "Generación de QR descargable e imprimible.",
      "Lector funcional en navegador móvil desde cámara trasera."
    ]
  },

  // --- MÓDULO 1: Gestión de fincas y lotes ---
  {
    id: "AGRUL-014",
    epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos",
    epicId: "epic-7-modulo-1-fincas",
    title: "Modelo de Dominio y Gestión de Fincas con Control de Superficie",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 1: Fincas y Lotes",
    rf: ["RF-M1-01", "RF-M1-02", "RF-M1-03"],
    rn: ["RN-05", "RN-06", "RN-15", "RN-16"],
    labels: ["domain", "fincas", "crud", "ready-for-agent"],
    description: "Implementar la entidad Finca, persistencia y casos de uso de alta, modificación con auditoría de valores anteriores y baja lógica condicionada a ausencia de ciclos abiertos.",
    tasks: [
      "Crear entidad Finca (id, nombre, ubicacion: {localidad, departamento, provincia}, superficieTotalHa, responsableId, renspa, coordenadas).",
      "Validar invariante RN-15: la suma de superficies de los lotes no puede exceder la superficie de la finca.",
      "Implementar casos de uso RegistrarFinca, ModificarFinca (con auditoría de cambios RN-06) y DarDeBajaFinca (baja lógica RN-05 bloqueada si hay ciclos abiertos RF-M1-03).",
      "Exponer endpoints REST en /api/v1/fincas con validación Zod."
    ],
    acceptanceCriteria: [
      "RF-M1-01: Finca registra nombre, localidad, depto, provincia, superficie en ha, responsable, y opcionales RENSPA y coords.",
      "RF-M1-02 / RN-06: Modificaciones guardan histórico del valor anterior.",
      "RF-M1-03 / RN-05: Baja lógica rechazada con HTTP 422 si la finca posee ciclos productivos abiertos.",
      "RN-15: Error de validación si la superficie de lotes supera la superficie declarada de la finca."
    ]
  },
  {
    id: "AGRUL-015",
    epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos",
    epicId: "epic-7-modulo-1-fincas",
    title: "Subdivisión de Lotes, Estados Operativos y Análisis de Suelo",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 1: Fincas y Lotes",
    rf: ["RF-M1-04", "RF-M1-05", "RF-M1-06", "RF-M1-07", "RF-M1-08", "RF-M1-09"],
    rn: ["RN-02", "RN-05", "RN-06", "RN-07"],
    labels: ["domain", "lotes", "suelos", "estados", "ready-for-agent"],
    description: "Gestión de lotes dentro de una finca: división, estados operativos (en producción, en preparación, en descanso), historial de cambios de estado, características edáficas y usos previos.",
    tasks: [
      "Extender entidad Lote con fincaId, nombre/numero, superficieHa, estadoLote (EN_PRODUCCION, EN_PREPARACION, EN_DESCANSO), usosPrevios.",
      "Crear entidad/tabla lote_analisis_suelo (loteId, textura, ph, materiaOrganica, salinidad, unidad, fechaAnalisis, fuente).",
      "Implementar máquina de estados de lote con historial inmutable de transiciones con fecha y usuario (RF-M1-08).",
      "Restringir baja lógica y modificación si tiene ciclos productivos abiertos (RF-M1-05 / RN-02)."
    ],
    acceptanceCriteria: [
      "RF-M1-04 / RN-07: Identificador único de lote autogenerado, irrepetible e ineditable.",
      "RF-M1-05: Modificación/baja lógica bloqueada si tiene ciclo abierto.",
      "RF-M1-06: Registro opcional de parámetros de suelo con unidad, fecha y fuente.",
      "RF-M1-07 / RF-M1-08: Transición de estados auditada con fecha y usuario.",
      "RF-M1-09: Soporte para registrar historial de usos previos al sistema."
    ]
  },
  {
    id: "AGRUL-016",
    epic: "Épica 7: Módulo 1 — Gestión de Fincas, Lotes y Suelos",
    epicId: "epic-7-modulo-1-fincas",
    title: "Búsqueda Filtrada, Polígonos Geográficos y Ficha Imprimible de Lote",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/api-contracts.md", ".cursor/skills/architecture.md"],
    module: "Módulo 1: Fincas y Lotes",
    rf: ["RF-M1-10", "RF-M1-11", "RF-M1-12"],
    rn: [],
    labels: ["api", "geo", "print", "ready-for-agent"],
    description: "Endpoints y vistas para listar fincas/lotes con filtros combinados, almacenamiento de coordenadas/polígonos (GeoJSON) y generación de ficha imprimible para señalética de campo.",
    tasks: [
      "Endpoint GET /api/v1/fincas y GET /api/v1/lotes con filtros combinados por estado, finca y rango de superficie.",
      "Almacenar polígono/coordenadas GPS del lote en formato GeoJSON.",
      "Generar endpoint o vista para exportar ficha técnica imprimible con código QR y datos para señalética de campo (RF-M1-11)."
    ],
    acceptanceCriteria: [
      "RF-M1-10: Listado veloz (< 2s, RNF-03) con filtros por estado, finca y superficie.",
      "RF-M1-11: Vista/PDF imprimible con código legible y QR para colocar en cartel de cabecera de lote.",
      "RF-M1-12: Coordenadas o polígono almacenados y validados correctamente."
    ]
  },

  // --- MÓDULO 2: Gestión de cultivos y ciclos productivos ---
  {
    id: "AGRUL-017",
    epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos",
    epicId: "epic-8-modulo-2-cultivos",
    title: "Catálogo de Cultivos, Variedades y Partidas de Plantines",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 2: Cultivos y Ciclos",
    rf: ["RF-M2-01", "RF-M2-04", "RF-M2-05"],
    rn: ["RN-01", "RN-07"],
    labels: ["domain", "catalogo", "cultivos", "plantines", "ready-for-agent"],
    description: "Gestionar el catálogo de cultivos y variedades (ej. Frutilla: San Andreas, Camino Real con tipo fotoperiódico: día corto / neutro) y recepción de partidas de plantines con trazabilidad de origen.",
    tasks: [
      "Crear entidades Cultivo, Variedad (con atributo fotoperíodo: DIA_CORTO, DIA_NEUTRO).",
      "Crear entidad PartidaPlantines (codigoPartida UK, proveedorId, variedadId, fechaRecepcion, cantidadRecibida, cantidadRechazada, cantidadPlantada, origenMaterial: PROVEEDOR | PROPAGACION_LOCAL, cicloOrigenId).",
      "Implementar endpoints REST /api/v1/cultivos, /variedades y /partidas-plantines."
    ],
    acceptanceCriteria: [
      "RF-M2-01: Catálogo configurable con variedades y tipo día corto/neutro.",
      "RF-M2-04: Origen trazable: partida de proveedor o bordos/propagación local referenciando ciclo previo.",
      "RF-M2-05 / RN-07: Código de partida único e inmutable, con cantidades recibida, rechazada y plantada."
    ]
  },
  {
    id: "AGRUL-018",
    epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos",
    epicId: "epic-8-modulo-2-cultivos",
    title: "Apertura, Multivariedad y Planificación de Ciclos Productivos",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 2: Cultivos y Ciclos",
    rf: ["RF-M2-02", "RF-M2-03", "RF-M2-10"],
    rn: ["RN-01", "RN-02", "RN-07"],
    labels: ["domain", "ciclos", "use-case", "ready-for-agent"],
    description: "Apertura y planificación de ciclos productivos en un lote, admitiendo múltiples variedades con su superficie o número de plantas, garantizando la regla de máximo un ciclo abierto por lote.",
    tasks: [
      "Crear entidad CicloProductivo (id, codigoCiclo UK, loteId, cultivoId, estado: PLANIFICADO | ABIERTO | CERRADO, fechaInicio, fechaFin, superficieCultivadaHa, fechaEstimadaInicio).",
      "Crear entidad CicloVariedad (cicloId, variedadId, partidaPlantinesId, superficieHa, cantidadPlantas).",
      "Validar invariante RN-02: rechazar apertura de ciclo si el lote ya cuenta con un ciclo en estado ABIERTO.",
      "Implementar casos de uso PlanificarCicloFuturo y AbrirCicloProductivo."
    ],
    acceptanceCriteria: [
      "RF-M2-02 / RN-02: Apertura valida que el lote no tenga otro ciclo abierto simultáneamente.",
      "RF-M2-03: Posibilidad de vincular múltiples variedades y partidas dentro del mismo ciclo.",
      "RF-M2-10: Soporte para crear ciclo en estado PLANIFICADO y activarlo a ABIERTO posteriormente.",
      "RN-07: Código de ciclo generado por el sistema y no editable."
    ]
  },
  {
    id: "AGRUL-019",
    epic: "Épica 8: Módulo 2 — Gestión de Cultivos y Ciclos Productivos",
    epicId: "epic-8-modulo-2-cultivos",
    title: "Cierre, Reapertura Auditada y Resumen Histórico de Campañas",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 2: Cultivos y Ciclos",
    rf: ["RF-M2-06", "RF-M2-07", "RF-M2-08", "RF-M2-09"],
    rn: ["RN-03", "RN-04", "RN-06"],
    labels: ["domain", "ciclos", "auditoria", "ready-for-agent"],
    description: "Flujo de cierre formal de ciclo con motivo, bloqueo de nuevas operaciones en ciclo cerrado, reapertura exclusiva para Administrador con auditoría, y consulta de resumen consolidado.",
    tasks: [
      "Implementar CerrarCicloUseCase con fechaFin y motivo (FIN_NORMAL, ABANDONO, PERDIDA_EVENTO).",
      "Implementar ReabrirCicloUseCase con validación de rol ADMINISTRADOR, motivo obligatorio y log de auditoría (RN-03).",
      "Crear query de resumen de ciclo: duración en días, total de actividades realizadas, volumen de insumos consumidos y total cosechado acumulado.",
      "Consultas con filtros por cultivo, variedad y rango de fechas (RF-M2-08)."
    ],
    acceptanceCriteria: [
      "RF-M2-06 / RN-03: Al cerrar el ciclo, queda bloqueado para nuevas actividades, aplicaciones y cosechas.",
      "RF-M2-07: Solo usuario con perfil Administrador puede reabrir un ciclo, requiriendo motivo auditado.",
      "RF-M2-09: Resumen del ciclo devuelve métricas exactas consolidadas."
    ]
  },

  // --- MÓDULO 3: Registro de actividades ---
  {
    id: "AGRUL-020",
    epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas",
    epicId: "epic-9-modulo-3-actividades",
    title: "Catálogos de Tipos de Actividad, Personal, Cuadrillas y Maquinaria",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/architecture.md", ".cursor/skills/database-events.md"],
    module: "Módulo 3: Actividades",
    rf: ["RF-M3-01", "RF-M3-03", "RF-M3-05", "RF-M3-06"],
    rn: ["RN-01"],
    labels: ["catalogo", "actividades", "personal", "maquinaria", "ready-for-agent"],
    description: "Catálogos configurables sin tocar código (RNF-13) para labores (preparación, siembra, riego, fertilización, control malezas/plagas, monitoreo, etc.), personal/cuadrillas y maquinaria agrícola.",
    tasks: [
      "Crear tabla tipo_actividad_catalogo con valores iniciales configurables.",
      "Crear tabla personal_cuadrilla (id, nombre, tipo: INDIVIDUAL | CUADRILLA, usuarioId nullable, activo).",
      "Crear tabla maquinaria_catalogo (id, identificacion, tipo, condicion: PROPIO | ALQUILADO | SERVICIO_CONTRATADO, activo).",
      "Endpoints CRUD para cada catálogo."
    ],
    acceptanceCriteria: [
      "RF-M3-01: Catálogo configurable con tipos estándar precargados.",
      "RF-M3-03: Registro de trabajadores/cuadrillas asociados opcionalmente a un usuario del sistema.",
      "RF-M3-06: Catálogo de maquinaria con condición (propio, alquilado, servicio contratado)."
    ]
  },
  {
    id: "AGRUL-021",
    epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas",
    epicId: "epic-9-modulo-3-actividades",
    title: "Registro de Labores Ejecutadas y Consumo de Mano de Obra",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 3: Actividades",
    rf: ["RF-M3-02", "RF-M3-04", "RF-M3-05", "RF-M3-15"],
    rn: ["RN-01", "RN-03", "RN-04", "RN-07"],
    labels: ["domain", "labores", "mano-de-obra", "ready-for-agent"],
    description: "Registro de actividades de campo realizadas vinculadas a lote y ciclo productivo abierto, con superficie trabajada, maquinaria utilizada (horas de uso) y mano de obra (jornales/horas).",
    tasks: [
      "Crear entidad ActividadAgricola (id, codigoActividad UK, tipoActividadId, loteId, cicloId, fechaHecho, horaNullable, usuarioCargaId, trabajadorResponsableId, superficieTrabajadaHa, observaciones, estado: REALIZADA).",
      "Asociar maquinarias y horas en actividad_maquinaria.",
      "Asociar mano de obra (jornales, cantidad personas, horas) en actividad_mano_obra.",
      "Validar RN-01 (pertenece a finca/lote/ciclo), RN-03 (ciclo debe estar abierto) y RN-04 (fecha hecho <= hoy)."
    ],
    acceptanceCriteria: [
      "RF-M3-02 / RN-01: Cada labor queda atada al lote y ciclo productivo abierto.",
      "RF-M3-04: Superficie trabajada toma por defecto la del ciclo si no se especifica.",
      "RF-M3-05 / RF-M3-15: Maquinaria con horas y mano de obra registradas correctamente.",
      "RN-04: La fecha del hecho no puede ser futura para actividades realizadas."
    ]
  },
  {
    id: "AGRUL-022",
    epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas",
    epicId: "epic-9-modulo-3-actividades",
    title: "Planificación de Actividades, Vencimientos y Workflow de Ejecución",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 3: Actividades",
    rf: ["RF-M3-07", "RF-M3-08", "RF-M3-09", "RF-M3-14"],
    rn: ["RN-04", "RN-13"],
    labels: ["domain", "workflow", "planificacion", "ready-for-agent"],
    description: "Ciclo de vida de actividades: PLANIFICADA -> REALIZADA, VENCIDA o CANCELADA. Una actividad planificada no impacta stock ni métricas hasta que se confirma como realizada.",
    tasks: [
      "Permitir fecha prevista futura para estado PLANIFICADA (excepción de RN-04).",
      "Implementar MarcarActividadRealizadaUseCase que completa datos reales y fecha efectiva de ejecución.",
      "Lógica de cálculo dinámico de estado VENCIDA cuando fechaPrevista < hoy y sigue planificada.",
      "Query para panel de inicio de actividades vencidas y próximas de los siguientes días (RF-M3-14).",
      "Garantizar RN-13: actividades planificadas no descuentan stock ni computan en indicadores."
    ],
    acceptanceCriteria: [
      "RF-M3-07: Planificar tarea pendiente asignada a persona y fecha prevista.",
      "RF-M3-08 / RN-13: Marcar realizada actualiza fecha real y sólo en ese momento afecta indicadores.",
      "RF-M3-09: Manejo de estados PLANIFICADA, REALIZADA, VENCIDA y CANCELADA (con motivo obligatorio).",
      "RF-M3-14: Consulta rápida de pendientes vencidas y de próximos días."
    ]
  },
  {
    id: "AGRUL-023",
    epic: "Épica 9: Módulo 3 — Registro de Actividades y Labores Agrícolas",
    epicId: "epic-9-modulo-3-actividades",
    title: "Monitoreo de Campo (Síntomas/Plagas) y Edición/Anulación de Labores",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 3: Actividades",
    rf: ["RF-M3-10", "RF-M3-11", "RF-M3-12", "RF-M3-13"],
    rn: ["RN-05", "RN-06"],
    labels: ["monitoreo", "auditoria", "fotos", "ready-for-agent"],
    description: "Registro de observaciones de campo del productor (síntomas, plagas, fotos adjuntas) como disparador de tareas, y soporte de edición/anulación auditada de actividades con compensaciones.",
    tasks: [
      "Crear tabla observacion_monitoreo (id, loteId, cicloId, fecha, sintomas, plagas, estadoCultivo, fotosUrls, usuarioId).",
      "Vincular actividad correctiva a la observación que la motivó (RF-M3-10).",
      "Implementar AnularActividadUseCase con baja lógica (RN-05) y motivo obligatorio.",
      "Si la actividad anulada involucró consumo de insumos, coordinar la reversión de stock con Módulo 9 (RF-M3-12)."
    ],
    acceptanceCriteria: [
      "RF-M3-11: Carga de observaciones de monitoreo con fotos adjuntas.",
      "RF-M3-10: Vínculo explícito entre actividad realizada y observación de monitoreo previa.",
      "RF-M3-12 / RN-05 / RN-06: Anulación conserva el registro original y revierte movimientos asociados."
    ]
  },

  // --- MÓDULO 4: Insumos y aplicaciones ---
  {
    id: "AGRUL-024",
    epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo",
    epicId: "epic-10-modulo-4-insumos",
    title: "Catálogo de Insumos Fitosanitarios, Principios Activos y Carencias",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 4: Insumos y Aplicaciones",
    rf: ["RF-M4-01", "RF-M4-02"],
    rn: ["RN-14"],
    labels: ["catalogo", "fitosanitarios", "carencia", "senasa", "ready-for-agent"],
    description: "Catálogo maestro de insumos categorizados (plantín/semilla, fertilizante, fitosanitario, enmienda, otro) con parámetros técnicos: principio activo, período de carencia (días), reingreso (horas) y registro SENASA.",
    tasks: [
      "Crear tabla insumos_catalogo (id, nombreComercial, categoria: SEMILLA_PLANTIN | FERTILIZANTE | FITOSANITARIO | ENMIENDA | OTRO, unidadMedidaId, presentacion).",
      "Crear tabla insumos_fitosanitarios_ficha (insumoId PK, principioActivo, periodoCarenciaDias, periodoReingresoHoras, nroRegistroSenasa, toxicologia).",
      "Implementar RN-14: valores de carencia y reingreso se cargan tal como figuran en el rótulo comercial, sin valores por defecto inventados por el sistema."
    ],
    acceptanceCriteria: [
      "RF-M4-01: Catálogo estructurado con unidad de medida base y presentación comercial.",
      "RF-M4-02 / RN-14: Registro estricto de principio activo, carencia en días y reingreso en horas.",
      "Validaciones Zod de tipos y rangos numéricos."
    ]
  },
  {
    id: "AGRUL-025",
    epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo",
    epicId: "epic-10-modulo-4-insumos",
    title: "Registro de Aplicaciones de Campo, Mezclas y Dosis Diferenciadas",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 4: Insumos y Aplicaciones",
    rf: ["RF-M4-03", "RF-M4-04", "RF-M4-05", "RF-M4-06", "RF-M4-11", "RF-M4-12"],
    rn: ["RN-01", "RN-04", "RN-10"],
    labels: ["aplicaciones", "dosis", "mezclas", "campo", "ready-for-agent"],
    description: "Registro de aplicaciones de insumos sobre lotes y ciclos, permitiendo caldos/mezclas (múltiples insumos por labor), descomposición de dosis (total, por ha, por planta, concentración) y condiciones climáticas de aplicación.",
    tasks: [
      "Crear tabla aplicacion_agricola (id, actividadId FK, loteId FK, cicloId FK, fecha, responsableId, metodo, motivo, equipoAplicacion, condicionesClima: { vientoKmH, tempC, lluviaMm }).",
      "Crear tabla aplicacion_linea_insumo (id, aplicacionId FK, insumoId FK, cantidadTotal, unidadMedidaId, dosisPorSuperficie, dosisPorPlanta, concentracion).",
      "Validar RN-01 (atada a lote y ciclo) y RN-10 (disparar movimiento de stock correspondiente en Módulo 9)."
    ],
    acceptanceCriteria: [
      "RF-M4-03 / RF-M4-05: Cada aplicación está atada a una actividad, un lote y un ciclo abierto.",
      "RF-M4-04: Campos independientes para dosis total, por ha, por planta y concentración.",
      "RF-M4-06: Soporta mezclas de múltiples insumos en la misma actividad.",
      "RF-M4-11 / RF-M4-12: Registro de equipo utilizado y condiciones ambientales al aplicar."
    ]
  },
  {
    id: "AGRUL-026",
    epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo",
    epicId: "epic-10-modulo-4-insumos",
    title: "Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 4: Insumos y Aplicaciones",
    rf: ["RF-M4-08", "RF-M4-09"],
    rn: ["RN-14"],
    labels: ["carencia", "seguridad-alimentaria", "advertencias", "ready-for-agent"],
    description: "Servicio de dominio que evalúa aplicaciones previas en un lote y emite alertas no bloqueantes si una cosecha o labor de cosecha se registra dentro del período de carencia vigente.",
    tasks: [
      "Implementar ServicioVerificacionCarencia: calcula fechaFinCarencia = fechaAplicacion + periodoCarenciaDias.",
      "Emitir advertencia explícita en la respuesta si fechaCosecha < fechaFinCarencia (RF-M4-09 / RF-M5-11), sin bloquear la operación.",
      "Vincular recomendación técnica (agrónomo emisor y documento PDF adjunto opcional, RF-M4-08)."
    ],
    acceptanceCriteria: [
      "RF-M4-09 / RN-14: Devuelve warning claro indicando producto aplicado, días restantes de carencia y fecha segura.",
      "RF-M4-08: Posibilidad de adjuntar firma o documento de recomendación profesional."
    ]
  },
  {
    id: "AGRUL-027",
    epic: "Épica 10: Módulo 4 — Insumos y Aplicaciones de Campo",
    epicId: "epic-10-modulo-4-insumos",
    title: "Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 4: Insumos y Aplicaciones",
    rf: ["RF-M4-10"],
    rn: [],
    labels: ["indicadores", "insumos", "consumo", "ready-for-agent"],
    description: "Cálculo analítico del acumulado de consumo de cada insumo por lote y ciclo productivo, así como la intensidad de uso expresada por hectárea tratada.",
    tasks: [
      "Crear query de agregación agrupando por cicloId, loteId e insumoId.",
      "Calcular cantidadTotalConsumida y cantidadPorHectarea dividiendo por la superficie cultivada del ciclo.",
      "Endpoint GET /api/v1/ciclos/:id/insumos-acumulados."
    ],
    acceptanceCriteria: [
      "RF-M4-10: Métricas precisas de consumo acumulado y consumo por ha por insumo en cada campaña.",
      "Tiempos de respuesta < 2s (RNF-03)."
    ]
  },

  // --- MÓDULO 5: Cosecha y destino ---
  {
    id: "AGRUL-028",
    epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable",
    epicId: "epic-11-modulo-5-cosecha",
    title: "Registro de Cosechas, Descarte y Código de Trazabilidad Único",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 5: Cosecha y Destino",
    rf: ["RF-M5-01", "RF-M5-02", "RF-M5-03", "RF-M5-04", "RF-M5-05", "RF-M5-06"],
    rn: ["RN-07", "RN-08", "RN-09"],
    labels: ["domain", "cosecha", "trazabilidad", "descarte", "ready-for-agent"],
    description: "Registro de cosechas con desglose estricto: cantidad cosechada = comercializable + descarte (RN-09), motivos configurables de descarte y asignación automática del código de trazabilidad único (ej. COS-L03-20260915-01).",
    tasks: [
      "Crear entidad Cosecha (id, codigoTrazabilidad UK, loteId, cicloId, fecha, cantidadCosechadaKg, cantidadComercializableKg, cantidadDescarteKg, motivoDescarte, observacionesCalidad, responsableId, cuadrillaId, recipientes, superficieCosechadaHa).",
      "Validar invariante RN-09: cantidadCosechadaKg === cantidadComercializableKg + cantidadDescarteKg.",
      "Generador de código algorítmico RN-07 / RN-08: formato COS-L[nro]-[YYYYMMDD]-[secuencia], inmodificable y único.",
      "Permitir múltiples cosechas sucesivas sin sobrescribir y acumulando saldo (RF-M5-04)."
    ],
    acceptanceCriteria: [
      "RF-M5-01 / RF-M5-02: Registro con total kg, comercializable y descarte justificado.",
      "RF-M5-03 / RN-08: Cada cosecha recibe un código de trazabilidad único e inalterable.",
      "RN-09: Falla con HTTP 422 si la suma de comercializable + descarte no coincide con el total cosechado."
    ]
  },
  {
    id: "AGRUL-029",
    epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable",
    epicId: "epic-11-modulo-5-cosecha",
    title: "Asignación de Destinos, Saldo Comercializable y Despachos BPA",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 5: Cosecha y Destino",
    rf: ["RF-M5-07", "RF-M5-08", "RF-M5-09", "RF-M5-10"],
    rn: ["RN-09"],
    labels: ["despachos", "destinos", "bpa", "remito", "ready-for-agent"],
    description: "Distribución de la fruta comercializable a uno o múltiples destinos (industria, mercado fresco, venta directa), control de saldo disponible y registro de remitos conforme manual de Buenas Prácticas Agrícolas (BPA).",
    tasks: [
      "Crear catálogo de destinatarios (compradores, industrias empaque/procesado).",
      "Crear tabla despacho_destino (id, cosechaId FK, destinatarioId FK, tipoDestino, cantidadEnviadaKg, fecha, nroGuiaRemito, renspaFinca, productor).",
      "Validar RN-09: la suma acumulada de envíos no puede superar la cantidad comercializable de la cosecha.",
      "Calcular saldo sin destino en tiempo real: saldo = comercializable - sum(enviados) (RF-M5-09)."
    ],
    acceptanceCriteria: [
      "RF-M5-07 / RF-M5-09: Registro de envíos con actualización y visualización inmediata del saldo remanente.",
      "RF-M5-10: Datos de remito/guía, RENSPA y productor requeridos para cumplimiento de BPA.",
      "RN-09: Intento de despacho que exceda el saldo comercializable es rechazado con error 422."
    ]
  },
  {
    id: "AGRUL-030",
    epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable",
    epicId: "epic-11-modulo-5-cosecha",
    title: "Alerta de Carencia en Cosecha, Corrección Auditada y Registro de Pérdidas",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 5: Cosecha y Destino",
    rf: ["RF-M5-11", "RF-M5-12", "RF-M5-14"],
    rn: ["RN-05", "RN-06", "RN-14"],
    labels: ["cosecha", "auditoria", "incidentes", "perdidas", "ready-for-agent"],
    description: "Validación de carencia al momento de cosechar, circuito de corrección/anulación con motivo y auditoría sin borrado físico, y registro de pérdidas/incidentes climáticos en cosecha.",
    tasks: [
      "Integrar ServicioVerificacionCarencia en el endpoint de cosecha para emitir advertencia si hay carencia vigente (RF-M5-11).",
      "Implementar AnularCosechaUseCase y ModificarCosechaUseCase preservando histórico de cambios (RN-05, RN-06).",
      "Crear tabla perdida_cosecha (cosechaId/loteId, fecha, tipo: GRANIZO | HELADA | ROBO | OTROS, cantidadEstimadaKg, descripcion)."
    ],
    acceptanceCriteria: [
      "RF-M5-11: Notificación clara si la fecha de cosecha viola un período de carencia.",
      "RF-M5-12: Corrección o anulación registra usuario, fecha anterior y motivo sin DELETE físico.",
      "RF-M5-14: Registro de incidentes con estimación de volumen afectado."
    ]
  },
  {
    id: "AGRUL-031",
    epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable",
    epicId: "epic-11-modulo-5-cosecha",
    title: "Formulario Móvil Ultrarrápido de Cosecha para Operarios de Campo",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/api-contracts.md"],
    module: "Módulo 5: Cosecha y Destino",
    rf: ["RF-M5-13"],
    rn: ["RN-01"],
    labels: ["mobile", "usabilidad", "campo", "rnf-01", "ready-for-agent"],
    description: "Interfaz y endpoint simplificado para carga en smartphone con guantes y bajo el sol (RNF-15): sólo 4 campos obligatorios (lote, cantidad total, comercializable y fecha) y resto plegado (RNF-01).",
    tasks: [
      "Diseñar formulario móvil minimalista con botones táctiles grandes (>48px) y alto contraste (RNF-15).",
      "Limitar inputs obligatorios a 4 campos: Lote, Total Cosechado, Comercializable y Fecha (RNF-01).",
      "Autocompletar ciclo activo y fecha actual."
    ],
    acceptanceCriteria: [
      "RF-M5-13 / RNF-01: Carga completable en menos de 15 segundos en campo con 4 campos obligatorios.",
      "RNF-15: Interfaz legible a plena luz solar y amigable con dispositivos desde 360px de ancho."
    ]
  },

  // --- MÓDULO 6: Trazabilidad ---
  {
    id: "AGRUL-032",
    epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales",
    epicId: "epic-12-modulo-6-trazabilidad",
    title: "Motor de Búsqueda y Recorrido Cronológico Integral de Cosecha",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 6: Trazabilidad",
    rf: ["RF-M6-01", "RF-M6-02", "RF-M6-03", "RF-M6-04", "RF-M6-05", "RF-M6-06", "RF-M6-07"],
    rn: ["RN-04", "RN-07", "RN-08"],
    labels: ["trazabilidad", "motor", "query", "recorrido", "ready-for-agent"],
    description: "Reconstrucción cronológica ascendente completa a partir de un código de cosecha o lote: origen de plantines, ciclo, labores culturales, fitosanitarios aplicados con lote de fábrica y carencia, clima y destinos finales.",
    tasks: [
      "Crear ObtenerRecorridoTrazabilidadUseCase: consulta cosecha por ID o código de trazabilidad.",
      "Recorrer y ordenar cronológicamente: partida de plantines/origen -> ciclo -> labores -> aplicaciones (con número de lote de insumo y carencia) -> cosecha -> despachos/destinos.",
      "Identificar y resaltar explícitamente lagunas de información (datos faltantes: sin responsable, sin partida de origen) sin inventar valores (RF-M6-06).",
      "Incorporar resumen meteorológico del ciclo (RF-M6-07)."
    ],
    acceptanceCriteria: [
      "RF-M6-01 / RF-M6-02: Búsqueda ágil y reconstrucción cronológica completa de la historia de la fruta.",
      "RF-M6-04 / RF-M6-05: Detalle de partida origen y lotes de insumos utilizados.",
      "RF-M6-06: Flag explícito en el árbol resaltando datos faltantes para auditoría de calidad."
    ]
  },
  {
    id: "AGRUL-033",
    epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales",
    epicId: "epic-12-modulo-6-trazabilidad",
    title: "Emisión de Informes de Trazabilidad en PDF y Exportación CSV/Excel",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/api-contracts.md", ".cursor/skills/architecture.md"],
    module: "Módulo 6: Trazabilidad",
    rf: ["RF-M6-08", "RF-M6-09", "RF-M6-10", "RF-M6-11", "RF-M6-13"],
    rn: ["RN-06"],
    labels: ["pdf", "csv", "informes", "auditoria", "export", "ready-for-agent"],
    description: "Generación de documento formal PDF de trazabilidad para compradores y organismos de certificación (SENASA/GlobalG.A.P.) con ID de emisión, firma digital/usuario emisor, marca de anulaciones y exportación en UTF-8.",
    tasks: [
      "Generar PDF estructurado con encabezado oficial, identificador único de informe, timestamp de emisión y usuario emisor (RF-M6-08).",
      "Marcar claramente rectificaciones o eventos compensatorios históricos (RF-M6-09).",
      "Filtro de privacidad (RF-M6-11 / RNF-14): omitir por defecto costos y datos de contacto de operarios.",
      "Exportador a CSV/Excel con codificación UTF-8 y encabezados con unidades de medida (RNF-11).",
      "Tabla informe_trazabilidad_log para registrar cada emisión (quién, cuándo, cuál, RF-M6-13)."
    ],
    acceptanceCriteria: [
      "RF-M6-08: PDF generado en < 10s (RNF-03) con diseño profesional apto para auditoría.",
      "RF-M6-10 / RNF-11: Archivos CSV/Excel abren sin fallas de tildes o caracteres especiales en Excel.",
      "RF-M6-13: Bitácora inmutable de emisión de informes completada."
    ]
  },
  {
    id: "AGRUL-034",
    epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales",
    epicId: "epic-12-modulo-6-trazabilidad",
    title: "Consulta Inversa de Trazabilidad para Retiro Preventivo de Insumos (Recall)",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md"],
    module: "Módulo 6: Trazabilidad",
    rf: ["RF-M6-12"],
    rn: [],
    labels: ["recall", "seguridad-alimentaria", "consulta-inversa", "ready-for-agent"],
    description: "Mecanismo de rastreo descendente inverso: dado un lote de insumo (ej. lote de fertilizante o pesticida contaminado), identificar al instante todos los lotes de campo, ciclos y cosechas que lo recibieron.",
    tasks: [
      "Implementar ConsultaInversaInsumoUseCase: recibe loteInsumoId o insumoId.",
      "Recorrer aplicaciones que utilizaron dicho lote de insumo y listar lotes productivos y cosechas derivadas.",
      "Listar despachos y compradores que recibieron dicha producción para activar protocolo de retiro inmediato."
    ],
    acceptanceCriteria: [
      "RF-M6-12: Mapeo exacto de insumo -> aplicaciones -> cosechas -> destinos en una sola consulta.",
      "Fundamental para contingencias sanitarias y certificaciones internacionales."
    ]
  },

  // --- MÓDULO 7: Indicadores y estadísticas ---
  {
    id: "AGRUL-035",
    epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas",
    epicId: "epic-13-modulo-7-indicadores",
    title: "Cálculo de Rendimiento por Hectárea, Descarte y Métricas de Producción",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 7: Indicadores",
    rf: ["RF-M7-01", "RF-M7-02", "RF-M7-07", "RF-M7-08", "RF-M7-09"],
    rn: ["RN-09"],
    labels: ["indicadores", "analytics", "rendimiento", "ready-for-agent"],
    description: "Cálculos analíticos automáticos: producción total cosechada y comercializable por finca/lote/cultivo/ciclo, rendimiento en kg/ha, % de descarte, conteo de labores y tasa de prendimiento de plantines.",
    tasks: [
      "Crear servicio de cálculo de rendimiento = totalKgCosechados / superficieHa.",
      "Calcular porcentajeDescarte = (cantidadDescarteKg / cantidadCosechadaTotalKg) * 100.",
      "Contabilizar actividades por categoría en cada ciclo (preparación, riego, fertilización, etc.).",
      "Calcular prendimiento y reposición de plantas = (plantasVivas / plantasPlantadas) * 100 (RF-M7-09)."
    ],
    acceptanceCriteria: [
      "RF-M7-01 / RF-M7-02: Rendimiento kg/ha exacto por lote y ciclo.",
      "RF-M7-07: Porcentaje de descarte calculado por cosecha y consolidado por ciclo.",
      "RF-M7-08 / RF-M7-09: Métricas agregadas disponibles vía API REST."
    ]
  },
  {
    id: "AGRUL-036",
    epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas",
    epicId: "epic-13-modulo-7-indicadores",
    title: "Comparador de Campañas, Evolución Histórica y Relación Insumo-Producto",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 7: Indicadores",
    rf: ["RF-M7-03", "RF-M7-04", "RF-M7-05", "RF-M7-06", "RF-M7-10", "RF-M7-11"],
    rn: [],
    labels: ["comparador", "campañas", "analytics", "ready-for-agent"],
    description: "Comparación entre campañas del mismo lote o entre lotes de la misma campaña, correlación entre insumos aplicados y producción obtenida, distinguiendo ciclos cerrados de ciclos en curso.",
    tasks: [
      "Crear endpoint de comparación con filtros combinables (finca, lote, cultivo, variedad, fechas).",
      "Diferenciar visualmente métricas de ciclos en curso (provisionales) de ciclos cerrados (definitivos) (RF-M7-11).",
      "Cálculo de eficiencia de insumos: kg producto cosechado / unidades de fertilizante o agroquímico aplicado (RF-M7-05)."
    ],
    acceptanceCriteria: [
      "RF-M7-03 / RF-M7-04: Comparación tabular y gráfica de rendimientos intercampaña.",
      "RF-M7-11: Indicador explícito de estado parcial en ciclos en curso."
    ]
  },
  {
    id: "AGRUL-037",
    epic: "Épica 13: Módulo 7 — Indicadores, Rendimientos y Métricas Productivas",
    epicId: "epic-13-modulo-7-indicadores",
    title: "Pantalla de Inicio con Resumen Operativo y Gráficos Chart.js",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/architecture.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 7: Indicadores",
    rf: ["RF-M7-12", "RF-M7-13", "RF-M7-14"],
    rn: [],
    labels: ["dashboard", "chartjs", "kpi", "ready-for-agent"],
    description: "Panel de control principal con KPIs clave (lotes en producción, producción acumulada, alertas de stock bajo y actividades vencidas), visualizaciones con Chart.js y módulo opcional de costos.",
    tasks: [
      "Crear endpoint GET /api/v1/dashboard/resumen que agregue los 4 KPIs en una sola llamada rápida (<2s, RNF-03).",
      "Integrar gráficos de barras y líneas con Chart.js para evolución de cosecha y consumos.",
      "Exportación de tablas y gráficos a PDF y CSV.",
      "Estructura opcional para cómputo de costos por lote (insumos + mano de obra + horas tractor, RF-M7-14)."
    ],
    acceptanceCriteria: [
      "RF-M7-12: Tablero ejecutivo con los 4 indicadores esenciales visibles al ingresar.",
      "RF-M7-13: Gráficos interactivos responsive compatibles con exportación."
    ]
  },

  // --- MÓDULO 8: Usuarios y seguridad ---
  {
    id: "AGRUL-038",
    epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría",
    epicId: "epic-14-modulo-8-usuarios",
    title: "Gestión de Usuarios, Autenticación y Control de Acceso por Finca",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/architecture.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 8: Usuarios y Seguridad",
    rf: ["RF-M8-01", "RF-M8-02", "RF-M8-03", "RF-M8-04", "RF-M8-05", "RF-M8-10"],
    rn: ["RN-16"],
    labels: ["auth", "security", "rbac", "fincas", "ready-for-agent"],
    description: "Sistema de autenticación y autorización con perfiles diferenciados (ADMINISTRADOR, ENCARGADO, OPERARIO, ASESOR_AGRONOMO), hashing seguro (Argon2/bcrypt), bloqueo por intentos fallidos y restricción por fincas asignadas.",
    tasks: [
      "Crear tablas usuarios, perfiles_permisos y usuario_finca_asignacion.",
      "Implementar autenticación con JWT / cookie segura, hash + salt y bloqueo temporal tras N intentos fallidos.",
      "Middleware de autorización Fastify que verifica permisos del perfil y asignación de finca en cada request (RF-M8-05 / RN-16).",
      "Soportar rol asesor agrónomo con permisos de solo lectura y carga de recomendaciones (RF-M8-10)."
    ],
    acceptanceCriteria: [
      "RF-M8-03 / RNF-04: Contraseñas con hash seguro y bloqueo tras intentos fallidos.",
      "RF-M8-04 / RN-16: Operario solo accede a carga/consulta de sus tareas; Administrador a configuración total.",
      "RF-M8-05: El usuario no puede visualizar ni operar fincas a las que no fue expresamente asignado."
    ]
  },
  {
    id: "AGRUL-039",
    epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría",
    epicId: "epic-14-modulo-8-usuarios",
    title: "Atribución Automática Inalterable y Diferenciación de Ejecutor vs Cargador",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 8: Usuarios y Seguridad",
    rf: ["RF-M8-06", "RF-M8-07"],
    rn: ["RN-04"],
    labels: ["auditoria", "atribucion", "seguridad", "ready-for-agent"],
    description: "Registro automático e inalterable del usuario autenticado que cargó el registro en base de datos, diferenciándolo del trabajador de campo que realizó materialmente la tarea.",
    tasks: [
      "Inyectar usuarioCargaId automáticamente desde el contexto de la sesión autenticada en todos los casos de uso.",
      "Prohibir que el payload del cliente sobreescriba el usuarioCargaId (RN-04 / RF-M8-06).",
      "Permitir campo trabajadorEjecutorId separado para reflejar cuando el encargado pasa labores registradas en papel por operarios (RF-M8-07)."
    ],
    acceptanceCriteria: [
      "RF-M8-06 / RN-04: usuarioCargaId siempre corresponde al usuario autenticado y es inalterable.",
      "RF-M8-07: Claridad total entre quién ingresó el dato al sistema y quién ejecutó la labor en el lote."
    ]
  },
  {
    id: "AGRUL-040",
    epic: "Épica 14: Módulo 8 — Usuarios, Roles, Seguridad y Auditoría",
    epicId: "epic-14-modulo-8-usuarios",
    title: "Bitácora Centralizada de Auditoría y Seguridad de Sesión",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/architecture.md"],
    module: "Módulo 8: Usuarios y Seguridad",
    rf: ["RF-M8-08", "RF-M8-09"],
    rn: ["RN-06"],
    labels: ["audit-log", "session", "security", "ready-for-agent"],
    description: "Registro inmutable de auditoría para ingresos, altas, modificaciones (con valor previo), bajas lógicas y emisión de reportes, junto con expiración de sesión por inactividad y cambio obligatorio de password inicial.",
    tasks: [
      "Crear tabla auditoria_seguridad_log (id, usuarioId, accion: LOGIN | CREAR | EDITAR | ANULAR | EMITIR_REPORTE, entidad, entidadId, valorPrevioJson, valorNuevoJson, ip, userAgent, timestamp).",
      "Configurar timeout de inactividad configurable en sesión (RF-M8-09).",
      "Forzar flag debeCambiarPassword en primer ingreso del usuario."
    ],
    acceptanceCriteria: [
      "RF-M8-08 / RN-06: Cada cambio crítico queda registrado con su delta de valor previo y posterior.",
      "RF-M8-09: Cierre automático de sesión tras tiempo de inactividad configurado."
    ]
  },

  // --- MÓDULO 9: Inventario de insumos con alertas de reposición ---
  {
    id: "AGRUL-041",
    epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock",
    epicId: "epic-15-modulo-9-stock",
    title: "Catálogo de Proveedores, Unidades de Medida y Conversiones Validadas",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 9: Stock de Insumos",
    rf: ["RF-M9-01", "RF-M9-02", "RF-M9-14"],
    rn: ["RN-12"],
    labels: ["catalogo", "proveedores", "unidades", "conversiones", "ready-for-agent"],
    description: "Gestión de proveedores comerciales y sistema riguroso de unidades de medida (unidad de consumo vs unidad de compra) con tabla de equivalencias explícita (el sistema nunca convierte litros a kg sin densidad cargada, RN-12).",
    tasks: [
      "Crear tabla proveedores (id, razonSocial, cuit, contacto, telefono, email).",
      "Crear tabla insumo_unidades_equivalencia (insumoId, unidadCompra, unidadConsumo, factorMultiplicador, densidadKgL nullable).",
      "Implementar convertidor de unidades de dominio que arroje UnidadConversionInvalidaError si no existe equivalencia registrada (RN-12 / RF-M9-14)."
    ],
    acceptanceCriteria: [
      "RF-M9-01: Definición clara de unidad de compra (ej. bidón 20L) y unidad de consumo (ej. L o ml).",
      "RN-12 / RF-M9-14: Prohibida la conversión automática litros a kg salvo que exista densidad registrada para ese insumo."
    ]
  },
  {
    id: "AGRUL-042",
    epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock",
    epicId: "epic-15-modulo-9-stock",
    title: "Gestión de Ingresos por Compra y Segregación de Depósitos BPA",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 9: Stock de Insumos",
    rf: ["RF-M9-03", "RF-M9-05", "RF-M9-19"],
    rn: ["RN-10"],
    labels: ["compras", "stock-inicial", "depositos", "bpa", "ready-for-agent"],
    description: "Registro de compras con comprobantes, lote de fabricación, vencimiento y ubicación en depósito físico (separando fertilizantes de fitosanitarios y vencidos conforme manual BPA), y carga de saldo inicial.",
    tasks: [
      "Crear tabla deposito_almacenamiento (id, fincaId, nombre, tipoPermitido: FITOSANITARIOS | FERTILIZANTES | INSUMOS_GENERALES | ZONA_VENCIDOS).",
      "Crear caso de uso RegistrarIngresoCompra (insumoId, proveedorId, cantidad, loteFabricacion, fechaVencimiento, depositoId, nroFacturaRemito, comprobanteAdjunto).",
      "Crear caso de uso CargarStockInicial (RF-M9-05) que crea el movimiento inicial de implantación del sistema."
    ],
    acceptanceCriteria: [
      "RF-M9-03: Ingreso registra proveedor, lote de fabricación y vencimiento.",
      "RF-M9-19: Validación de depósito evitando almacenar fitosanitarios junto a fertilizantes conforme BPA.",
      "RF-M9-05: Carga de saldo inicial genera movimiento auditado."
    ]
  },
  {
    id: "AGRUL-043",
    epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock",
    epicId: "epic-15-modulo-9-stock",
    title: "Libro Mayor de Movimientos de Stock, Idempotencia y Atomicidad ACID",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 9: Stock de Insumos",
    rf: ["RF-M9-04", "RF-M9-06", "RF-M9-07", "RF-M9-13", "RF-M9-15"],
    rn: ["RN-10", "RN-11"],
    labels: ["stock", "ledger", "idempotencia", "acid", "ready-for-agent"],
    description: "Libro mayor append-only de inventario (el stock nunca cambia sin movimiento, RN-10), clave única de idempotencia en formularios (RN-11 / RF-M9-06), compensación de movimientos ante edición/anulación y manejo de saldos negativos advertidos.",
    tasks: [
      "Crear tabla stock_movimientos (id, insumoId, loteFabricacionId, tipoMovimiento: SALDO_INICIAL | INGRESO_COMPRA | SALIDA_CONSUMO | DEVOLUCION | PERDIDA | AJUSTE_FISICO | REVERSION, cantidad, unidadMedidaId, fecha, usuarioId, referenciaTipo, referenciaId, claveIdempotencia UK).",
      "Implementar protección contra dobles descuentos mediante claveIdempotencia única por envío de formulario (RF-M9-06 / RN-11).",
      "Implementar reversión atómica de movimientos al modificar o anular una aplicación de campo (RF-M9-07).",
      "Si la salida excede el stock físico disponible, permitir continuar solo con justificación/motivo explícito marcando la diferencia (RF-M9-15)."
    ],
    acceptanceCriteria: [
      "RN-10 / RNF-05: Todo cambio de stock es transaccional (ACID) y genera fila en stock_movimientos.",
      "RN-11 / RF-M9-06: Reintentos con la misma clave de idempotencia no duplican movimientos.",
      "RF-M9-07: Modificación de dosis revierte el movimiento anterior e inserta el nuevo ajustado.",
      "RF-M9-13: Saldo de envases parcialmente abiertos llevado en unidad de consumo."
    ]
  },
  {
    id: "AGRUL-044",
    epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock",
    epicId: "epic-15-modulo-9-stock",
    title: "Stock Mínimo Configurable, Stock Reservado y Alertas de Reposición",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 9: Stock de Insumos",
    rf: ["RF-M9-08", "RF-M9-09", "RF-M9-18"],
    rn: ["RN-13"],
    labels: ["alertas", "stock-minimo", "reposicion", "ready-for-agent"],
    description: "Definición de stock crítico/mínimo por insumo sin defaults, cálculo de stock disponible = físico - reservado (actividades planificadas futuras) y despacho de alertas visuales y por correo.",
    tasks: [
      "Agregar campo stockMinimoConfigurable a insumos (sin valores precargados arbitrarios, RF-M9-08).",
      "Calcular stockReservado sumando insumos previstos en actividades con estado PLANIFICADA (RF-M9-18 / RN-13).",
      "Calcular stockDisponible = stockFisico - stockReservado.",
      "Emitir alertas de reposición cuando stockDisponible <= stockMinimoConfigurable en pantalla principal y notificaciones (RF-M9-09)."
    ],
    acceptanceCriteria: [
      "RF-M9-08 / RF-M9-09: Alerta visual inmediata en dashboard ante quiebre de stock mínimo.",
      "RF-M9-18: Stock reservado bloquea insumos comprometidos en tareas planificadas sin descontarlos antes de tiempo."
    ]
  },
  {
    id: "AGRUL-045",
    epic: "Épica 15: Módulo 9 — Inventario de Insumos y Stock",
    epicId: "epic-15-modulo-9-stock",
    title: "Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 9: Stock de Insumos",
    rf: ["RF-M9-10", "RF-M9-11", "RF-M9-12", "RF-M9-16", "RF-M9-17", "RF-M9-20"],
    rn: [],
    labels: ["fefo", "vencimientos", "ajustes", "inventario-fisico", "ready-for-agent"],
    description: "Sugerencia de lote de insumo más próximo a vencer (First Expired, First Out - FEFO), bloqueo de insumos vencidos para aplicación, registro de inventarios físicos con ajuste por diferencia y reporte valorizado de existencias.",
    tasks: [
      "Algoritmo de sugerencia FEFO al consumir insumos con varios lotes (RF-M9-16).",
      "Bloquear la selección de lotes de insumos cuya fecha de vencimiento ya expiró (RF-M9-10).",
      "Implementar caso de uso RegistrarInventarioFisico: calcula diferencia y genera movimiento AJUSTE_FISICO con motivo (RF-M9-11).",
      "Registrar mermas y pérdidas (robo, derrame, rotura) con motivo (RF-M9-12).",
      "Emitir reporte de existencias valorizadas según precio de compra ponderado (RF-M9-20)."
    ],
    acceptanceCriteria: [
      "RF-M9-10: Error si se intenta aplicar un insumo vencido.",
      "RF-M9-16: Sugerencia automática del lote que vence primero.",
      "RF-M9-11: Inventario físico auditado con permisos de Encargado o Administrador."
    ]
  },

  // --- MÓDULO 10: Información meteorológica ---
  {
    id: "AGRUL-046",
    epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica",
    epicId: "epic-16-modulo-10-clima",
    title: "Registro Manual e Importación CSV de Datos Climáticos de Finca",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 10: Clima",
    rf: ["RF-M10-01", "RF-M10-02", "RF-M10-04", "RF-M10-05", "RF-M10-06"],
    rn: ["RN-04", "RN-06"],
    labels: ["clima", "meteorologia", "csv", "registro", "ready-for-agent"],
    description: "Carga manual diaria e importación masiva por archivo CSV de datos de estaciones meteorológicas propias: temperaturas (min/max), precipitación (mm), humedad relativa, velocidad de viento, heladas y granizo con validación física estricta.",
    tasks: [
      "Crear tabla mediciones_meteorologicas (id, fincaId, fecha, tempMinC, tempMaxC, precipitacionMm, humedadRelativaPct, vientoKmH, huboHelada, huboGranizo, fuenteDato: MEDICION_PROPIA | ESTACION_PROPIA | SERVICIO_EXTERNO | DATO_ZONA, observaciones).",
      "Validaciones de integridad física (RF-M10-05): humedad entre 0 y 100%, precipitación >= 0, tempMin <= tempMax.",
      "Parser e importador de archivos CSV para estaciones automáticas locales (RF-M10-04).",
      "Inmutabilidad histórica (RF-M10-06): datos importados no se sobreescriben; correcciones generan nuevo registro auditado con motivo."
    ],
    acceptanceCriteria: [
      "RF-M10-01 / RF-M10-02: Registro manual diario con fuente de datos guardada.",
      "RF-M10-05: Rechazo inmediato ante datos físicamente inválidos (ej. humedad negativa o lluvia negativa).",
      "RF-M10-04: Carga batch vía CSV validada."
    ]
  },
  {
    id: "AGRUL-047",
    epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica",
    epicId: "epic-16-modulo-10-clima",
    title: "Integración de API de Clima para Lules, Pronósticos y Alertas Adversas",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/architecture.md", ".cursor/skills/api-contracts.md"],
    module: "Módulo 10: Clima",
    rf: ["RF-M10-03", "RF-M10-08", "RF-M10-09", "RF-M10-14"],
    rn: [],
    labels: ["clima", "api-externa", "pronostico", "alertas", "ready-for-agent"],
    description: "Conexión automática a servicio meteorológico externo configurable por coordenadas GPS de la finca (Lules, Tucumán), captura de pronósticos a 5 días y motor de alertas tempranas configurables (heladas, vientos fuertes para pulverización).",
    tasks: [
      "Crear adaptador de infraestructura para API meteorológica (Open-Meteo o similar sin costo para lat/lon de Lules).",
      "Crear job programado para sincronización diaria de mediciones y pronósticos (RF-M10-03 / RF-M10-14).",
      "Tabla alertas_climaticas_config (fincaId, variable, condicion: MAYOR_QUE | MENOR_QUE, umbral, destinatarios).",
      "Disparar alerta en pantalla de inicio si el pronóstico o dato real quiebra el umbral configurado (RF-M10-09)."
    ],
    acceptanceCriteria: [
      "RF-M10-03: Sincronización automática de clima según coordenadas de la finca.",
      "RF-M10-08 / RF-M10-09: Reglas de alerta configuradas por usuario activas y visibles en dashboard.",
      "RF-M10-14: Visualización de pronóstico extendido con advertencia temprana."
    ]
  },
  {
    id: "AGRUL-048",
    epic: "Épica 16: Módulo 10 — Información Agro-Meteorológica",
    epicId: "epic-16-modulo-10-clima",
    title: "Contexto Climático en Labores, Eventos Adversos y Serie Histórica del Lote",
    status: "TODO",
    priority: "Media (P2)",
    skills: [".cursor/skills/domain-traceability.md", ".cursor/skills/database-events.md"],
    module: "Módulo 10: Clima",
    rf: ["RF-M10-07", "RF-M10-10", "RF-M10-11", "RF-M10-12", "RF-M10-13"],
    rn: [],
    labels: ["clima", "series-temporales", "eventos-adversos", "ready-for-agent"],
    description: "Exhibición automática de condiciones del día (lluvia 24h previa, viento) al registrar riego o pulverizaciones, registro de siniestros (helada, granizo con fotos y daño estimado) y superposición de actividades sobre la curva climática del ciclo.",
    tasks: [
      "Endpoint contextual: GET /api/v1/fincas/:id/clima-contexto que devuelve lluvia últimas 24h, viento actual y temp para sugerir o advertir condiciones de pulverización (RF-M10-10).",
      "Crear tabla eventos_climaticos_adversos (loteId, fecha, tipoSiniestro: HELADA | GRANIZO | CALOR_EXTREMO | INUNDACION, danoEstimadoPct, fotosUrls, descripcion) (RF-M10-11).",
      "Calcular resumen climático del ciclo: lluvia acumulada en la campaña, días de helada registrados y temperaturas extremas (RF-M10-12).",
      "Gráfico de serie temporal combinando temperatura, lluvia acumulada e hitos de labores/aplicaciones (RF-M10-07 / RF-M10-13)."
    ],
    acceptanceCriteria: [
      "RF-M10-10: Información climática previa visible al operario durante la carga de aplicaciones.",
      "RF-M10-11: Registro fotográfico y volumétrico de siniestros de campo.",
      "RF-M10-12 / RF-M10-13: Gráfica climática integrada con los eventos del ciclo productivo."
    ]
  },

  // --- REQUISITOS NO FUNCIONALES Y ARQUITECTURA ---
  {
    id: "AGRUL-049",
    epic: "Épica 17: Requisitos No Funcionales & Cumplimiento Normativo",
    epicId: "epic-17-rnf-transversal",
    title: "Resiliencia Móvil Offline, Borradores Locales e Idempotencia en Cliente",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/api-contracts.md", ".cursor/skills/architecture.md"],
    module: "Transversal RNF",
    rf: [],
    rn: ["RN-11"],
    labels: ["rnf", "offline", "pwa", "idempotencia", "ready-for-agent"],
    description: "Garantizar la operatividad en fincas rurales con conectividad intermitente: almacenamiento local en IndexedDB/LocalStorage, reintentos automáticos sin duplicación mediante claves UUIDv4 y diseño para pantallas de 360px.",
    tasks: [
      "Implementar wrapper de almacenamiento local para guardar borradores de actividades/cosechas ante caída de red (RNF-02).",
      "Generar clave única de idempotencia en frontend al abrir el formulario (RF-M9-06 / RN-11).",
      "Sincronización en segundo plano con backoff exponencial al detectar restauración de conectividad.",
      "Verificar diseño responsivo desde 360px de ancho con viewport móvil adecuado (RNF-09)."
    ],
    acceptanceCriteria: [
      "RNF-02: Cortar la conexión durante el envío y reintentar no genera duplicados en la base de datos.",
      "RNF-09: Funcionalidad completa y testeada en Chrome móvil y Android estándar.",
      "RNF-01 / RNF-15: Experiencia de usuario optimizada para campo."
    ]
  },
  {
    id: "AGRUL-050",
    epic: "Épica 17: Requisitos No Funcionales & Cumplimiento Normativo",
    epicId: "epic-17-rnf-transversal",
    title: "Localización Oficial (Tucumán UTC-3), Políticas de Retención 3 Años y Multi-Finca",
    status: "TODO",
    priority: "Alta (P1)",
    skills: [".cursor/skills/database-events.md", ".cursor/skills/testing-quality.md"],
    module: "Transversal RNF",
    rf: [],
    rn: ["RN-05"],
    labels: ["rnf", "localizacion", "compliance", "multi-tenant", "ready-for-agent"],
    description: "Configuración integral de localización: zona horaria obligatoria America/Argentina/Tucuman (UTC-3), formato dd/mm/aaaa, unidades métricas (kg, L, ha, °C, mm), política de no borrado físico por 3 años (BPA) y arquitectura multi-finca/productor.",
    tasks: [
      "Configurar formateo de fechas y parsing estricto con zona horaria America/Argentina/Tucuman evitando corrimientos de día a las 23:30 (RNF-12).",
      "Auditar esquema de persistencia para garantizar que toda entidad lleve fincaId u organizacionId (RNF-16).",
      "Configurar reglas y políticas para impedir eliminación física (DELETE) de registros productivos antes de 3 años conforme manual de BPA (RNF-06 / RN-05).",
      "Escribir test de regresión verificando que una carga a las 23:30 UTC-3 preserve la fecha correcta."
    ],
    acceptanceCriteria: [
      "RNF-12: Prueba de guardado a las 23:30 hs no altera la fecha del evento.",
      "RNF-06: Ningún endpoint de usuario admite DELETE físico sobre datos productivos históricos.",
      "RNF-16: Aislamiento estricto multi-finca preparado para soportar múltiples organizaciones."
    ]
  }
];

// Generar TICKETS.md
function generateTicketsMarkdown() {
  let md = `# 🎫 Agrul — Backlog de Tickets de Ingeniería (TICKETS.md)\n`;
  md += `**Documento Fuente:** Especificación Técnica de Requisitos y Gestión Agrícola (Módulos 1 al 10, Reglas RN-01 a RN-16, Requisitos RNF-01 a RNF-16)\n`;
  md += `**Metodología:** Spec-Driven Development & Matt Pocock Modular Skills  \n`;
  md += `**Última actualización:** 2026-10-14  \n\n`;
  md += `---\n\n`;
  md += `## 📊 Tablero de Estado General\n\n`;
  md += `| Épica / Fase | Tickets Totales | Completados | En Progreso | Pendientes |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  // Agrupar por épicas
  const epicsMap = new Map();
  for (const t of tickets) {
    if (!epicsMap.has(t.epic)) {
      epicsMap.set(t.epic, []);
    }
    epicsMap.get(t.epic).push(t);
  }

  for (const [epicName, epicTickets] of epicsMap.entries()) {
    const total = epicTickets.length;
    const done = epicTickets.filter(t => t.status === "DONE").length;
    const inProgress = epicTickets.filter(t => t.status === "IN_PROGRESS").length;
    const pending = total - done - inProgress;
    md += `| **${epicName}** | ${total} | ${done} | ${inProgress} | ${pending} |\n`;
  }

  const grandTotal = tickets.length;
  const grandDone = tickets.filter(t => t.status === "DONE").length;
  const grandInProgress = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const grandPending = grandTotal - grandDone - grandInProgress;
  md += `| **TOTAL GENERAL** | **${grandTotal}** | **${grandDone}** | **${grandInProgress}** | **${grandPending}** |\n\n`;
  md += `---\n\n`;

  // Listado detallado por épica
  for (const [epicName, epicTickets] of epicsMap.entries()) {
    md += `## ${epicName.toUpperCase()}\n\n`;
    for (const t of epicTickets) {
      const statusEmoji = t.status === "DONE" ? "✅" : t.status === "IN_PROGRESS" ? "🔄" : "📌";
      md += `### \`[${t.id}]\` ${t.title}\n`;
      md += `- **Estado:** \`${t.status}\` ${statusEmoji}\n`;
      md += `- **Prioridad:** ${t.priority}\n`;
      md += `- **Módulo:** ${t.module}\n`;
      if (t.rf.length > 0) md += `- **Requisitos Funcionales:** ${t.rf.join(', ')}\n`;
      if (t.rn.length > 0) md += `- **Reglas de Negocio:** ${t.rn.join(', ')}\n`;
      md += `- **Skills:** ${t.skills.map(s => `[${path.basename(s)}](file:///c:/AGRUL/${s})`).join(', ')}\n`;
      md += `- **Etiquetas:** \`${t.labels.join('`, `')}\`\n`;
      md += `- **Descripción:** ${t.description}\n`;
      md += `- **Tareas Técnicas:**\n`;
      for (let i = 0; i < t.tasks.length; i++) {
        md += `  ${i + 1}. ${t.tasks[i]}\n`;
      }
      md += `- **Criterios de Aceptación:**\n`;
      for (const c of t.acceptanceCriteria) {
        const check = t.status === "DONE" ? "[x]" : "[ ]";
        md += `  - ${check} ${c}\n`;
      }
      md += `\n`;
    }
    md += `---\n\n`;
  }

  return md;
}

// Generar archivos individuales en .scratch/issues/
function generateScratchIssues() {
  const issuesDir = path.resolve('c:/AGRUL/.scratch/issues');
  if (!fs.existsSync(issuesDir)) {
    fs.mkdirSync(issuesDir, { recursive: true });
  }

  for (const t of tickets) {
    let issueMd = `---
id: ${t.id}
title: "${t.id}: ${t.title}"
epic: "${t.epic}"
status: ${t.status === 'DONE' ? 'resolved' : 'ready-for-agent'}
priority: "${t.priority}"
module: "${t.module}"
labels: [${t.labels.map(l => `"${l}"`).join(', ')}]
---

# ${t.id} — ${t.title}

- **Épica:** ${t.epic}
- **Módulo:** ${t.module}
- **Prioridad:** ${t.priority}
- **Status:** ${t.status === 'DONE' ? 'resolved' : 'ready-for-agent'}
${t.rf.length ? `- **Requisitos Funcionales:** ${t.rf.join(', ')}\n` : ''}${t.rn.length ? `- **Reglas de Negocio:** ${t.rn.join(', ')}\n` : ''}- **Skills:** ${t.skills.join(', ')}

## Descripción
${t.description}

## Tareas Técnicas
${t.tasks.map((task, idx) => `${idx + 1}. ${task}`).join('\n')}

## Criterios de Aceptación
${t.acceptanceCriteria.map(c => `- [${t.status === 'DONE' ? 'x' : ' '}] ${c}`).join('\n')}

## Comments
`;
    const filePath = path.join(issuesDir, `${t.id}.md`);
    fs.writeFileSync(filePath, issueMd, 'utf-8');
  }
}

// Generar script de PowerShell para sincronizar con GitHub Issues
function generateSyncScript() {
  const ps1Content = `# Sync tickets to GitHub Issues via gh CLI
# Usage: ./scripts/sync-github-issues.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Sincronizador de Tickets de Agrul a GitHub Issues ===" -ForegroundColor Cyan

# 1. Verificar gh CLI y autenticacion
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "No se detecto sesion activa de GitHub en gh CLI."
        Write-Host "Por favor ejecuta: gh auth login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Error "El comando 'gh' no esta disponible o no esta en el PATH."
    exit 1
}

$repo = "juampalt/Agrul"
Write-Host "Repositorio destino: $repo" -ForegroundColor Green

# 2. Cargar tickets desde JSON
$ticketsJson = Get-Content -Raw -Path "scripts/tickets-data.json" | ConvertFrom-Json

# 3. Iterar y crear issues que no existan
Write-Host "Obteniendo issues existentes en el repositorio..." -ForegroundColor Cyan
$existingIssues = gh issue list --repo $repo --limit 200 --json title --jq '.[].title'

foreach ($t in $ticketsJson) {
    $expectedTitle = "$($t.id): $($t.title)"
    
    if ($existingIssues -contains $expectedTitle) {
        Write-Host "[SKIP] Ya existe issue: $expectedTitle" -ForegroundColor DarkGray
        continue
    }

    $body = @"
## $($t.id) — $($t.title)

**Épica:** $($t.epic)  
**Módulo:** $($t.module)  
**Prioridad:** $($t.priority)  
$(if ($t.rf.Count -gt 0) { "**Requisitos:** " + ($t.rf -join ", ") + "  " } else { "" })
$(if ($t.rn.Count -gt 0) { "**Reglas de Negocio:** " + ($t.rn -join ", ") + "  " } else { "" })

### Descripción
$($t.description)

### Tareas Técnicas
$($t.tasks | ForEach-Object { "- $_" } | Out-String)

### Criterios de Aceptación
$($t.acceptanceCriteria | ForEach-Object { "- [ ] $_" } | Out-String)

---
*Ticket generado automáticamente por Antigravity para Agrul.*
"@

    Write-Host "Creando issue: $expectedTitle..." -ForegroundColor Yellow
    
    # Preparar labels
    $labelArgs = @()
    foreach ($l in $t.labels) {
        $labelArgs += "--label"
        $labelArgs += $l
    }

    gh issue create --repo $repo --title $expectedTitle --body $body @labelArgs
    Start-Sleep -Milliseconds 800
}

Write-Host "=== Sincronización completada con éxito ===" -ForegroundColor Green
`;

  fs.writeFileSync(path.resolve('c:/AGRUL/scripts/sync-github-issues.ps1'), ps1Content, 'utf-8');

  // Bash equivalent
  const shContent = `#!/usr/bin/env bash
set -e

echo "=== Sincronizador de Tickets de Agrul a GitHub Issues ==="

if ! gh auth status > /dev/null 2>&1; then
  echo "No hay sesión activa en gh. Por favor ejecutá: gh auth login"
  exit 1
fi

REPO="juampalt/Agrul"
echo "Repositorio destino: $REPO"

node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const tickets = JSON.parse(fs.readFileSync('scripts/tickets-data.json', 'utf8'));

let existing = '';
try {
  existing = execSync('gh issue list --repo juampalt/Agrul --limit 200 --json title --jq \".[].title\"').toString();
} catch (e) {
  console.log('Error listando issues existentes');
}

for (const t of tickets) {
  const expectedTitle = \`\${t.id}: \${t.title}\`;
  if (existing.includes(expectedTitle)) {
    console.log('[SKIP] Ya existe: ' + expectedTitle);
    continue;
  }
  console.log('Creando: ' + expectedTitle);
  const body = \`## \${t.id} — \${t.title}\\n\\n**Épica:** \${t.epic}\\n**Módulo:** \${t.module}\\n**Prioridad:** \${t.priority}\\n\\n### Descripción\\n\${t.description}\\n\\n### Criterios de Aceptación\\n\${t.acceptanceCriteria.map(c => '- [ ] ' + c).join('\\\\n')}\`;
  const labels = t.labels.map(l => \`--label \"\${l}\"\`).join(' ');
  const tmpFile = '/tmp/issue_body.txt';
  fs.writeFileSync(tmpFile, body);
  execSync(\`gh issue create --repo \${REPO} --title \"\${expectedTitle}\" --body-file \${tmpFile} \${labels}\`);
}
"
echo "=== Sincronización completada con éxito ==="
`;
  fs.writeFileSync(path.resolve('c:/AGRUL/scripts/sync-github-issues.sh'), shContent, 'utf-8');
}

// 1. Guardar tickets-data.json
fs.writeFileSync(path.resolve('c:/AGRUL/scripts/tickets-data.json'), JSON.stringify(tickets, null, 2), 'utf-8');

// 2. Guardar TICKETS.md
const ticketsMd = generateTicketsMarkdown();
fs.writeFileSync(path.resolve('c:/AGRUL/TICKETS.md'), ticketsMd, 'utf-8');

// 3. Generar issues individuales en .scratch/issues/
generateScratchIssues();

// 4. Generar scripts de sincronización
generateSyncScript();

console.log(`Generados exitosamente ${tickets.length} tickets en TICKETS.md, .scratch/issues/ y scripts de sincronización.`);
