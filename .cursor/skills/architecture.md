# Architecture & Layering Conventions

> **Cuándo usar esta skill:** Al estructurar carpetas, crear nuevos casos de uso, conectar dependencias entre módulos, configurar Fastify o refactorizar código de la aplicación.

---

## 1. Contexto & Propósito
Agrul utiliza **TypeScript con Node.js y Fastify**, respaldado por **PostgreSQL** y **Drizzle ORM**. Sigue una arquitectura limpia pragmática (*Vertical Slice* o *Hexagonal ligera*). El núcleo de dominio (reglas de trazabilidad, validaciones de linaje N:M, transiciones de estado) está completamente desacoplado de Fastify y de Drizzle.

---

## 2. Invariantes y Reglas No Negociables
1. **Flujo de Dependencias hacia el Interior:** Las capas externas (HTTP con Fastify, DB con Drizzle, CLI) conocen al dominio, pero el dominio **nunca** importa `fastify`, `drizzle-orm` ni librerías de infraestructura.
2. **Casos de Uso Explícitos (Single Responsibility):** Cada servicio o caso de uso resuelve una acción concreta del negocio (`RegistrarEventoUseCase`, `DividirLoteUseCase`, `FusionarLotesUseCase`, `SincronizarEventosOfflineUseCase`).
3. **Manejo Centralizado de Errores en Fastify:** Las excepciones de negocio (`DomainError`, `EntityNotFoundError`, `InvalidStateTransitionError`) se originan en el dominio y un `errorHandler` central de Fastify las mapea a respuestas HTTP estandarizadas.
4. **Soporte Offline-First:** Los endpoints de ingesta de eventos admiten sincronización en lote (*batch sync*) para procesar eventos capturados sin conexión en campo.

---

## 3. Estructura de Directorios Canónica

```text
src/
├── core/                        # Núcleo de Dominio (TypeScript puro, 0 deps de frameworks)
│   ├── domain/
│   │   ├── entities/            # Lote, TraceEvent, LoteGenealogia, Actor, Ubicacion
│   │   ├── value-objects/       # CodigoLote, TimestampUtc, TipoEvento
│   │   └── errors/              # DomainError, BusinessRuleViolationError, StateConflictError
│   └── ports/                   # Interfaces (contratos) de repositorios y servicios externos
│       ├── lotes-repository.port.ts
│       ├── eventos-repository.port.ts
│       └── genealogia-repository.port.ts
│
├── application/                 # Casos de uso / Orquestación
│   ├── use-cases/
│   │   ├── registrar-evento.use-case.ts
│   │   ├── crear-lote.use-case.ts
│   │   ├── dividir-lote.use-case.ts
│   │   ├── fusionar-lotes.use-case.ts
│   │   ├── obtener-arbol-linaje.use-case.ts
│   │   └── sincronizar-eventos-offline.use-case.ts
│   └── dtos/                    # DTOs de entrada/salida de casos de uso
│
├── infrastructure/              # Adaptadores de Entrada/Salida
│   ├── database/                # Drizzle ORM + PostgreSQL
│   │   ├── schema/              # Tablas: lotes, eventos, genealogia
│   │   ├── migrations/          # SQL migrations
│   │   └── repositories/        # Implementación concreta de los puertos
│   └── http/                    # API Fastify
│       ├── controllers/
│       ├── middlewares/         # Autenticación, tenant isolation, error handler
│       ├── routes/              # Declaración de rutas Fastify v5
│       └── schemas/             # Validación Zod integrada con TypeProvider
│
└── config/                      # Variables de entorno validadas con Zod
```

---

## 4. DOs and DON'Ts

### DO
- **DO:** Usar Fastify Type Provider con Zod (`fastify-type-provider-zod`) para tener tipado estricto extremo desde el schema HTTP hasta el caso de uso.
- **DO:** Escribir funciones o clases de casos de uso que reciban sus dependencias (repositorios) a través del constructor (Inyección de Dependencias manual o contenedor liviano).
- **DO:** Nombrar archivos con kebab-case descriptivo: `registrar-evento.use-case.ts`, `lote.entity.ts`.
- **DO:** Mantener cada archivo por debajo de 250 líneas.

### DON'T
- **DON'T:** No instanciar conexiones a base de datos dentro de las entidades de dominio.
- **DON'T:** No usar `any` en TypeScript. Tipar exhaustivamente inputs, outputs, schemas y estados.
- **DON'T:** No mezclar la lógica de transacción SQL de Drizzle dentro del controlador HTTP.

---

## 5. Patrones Canónicos

### ✅ Golden Pattern: Fastify Controller + Caso de Uso Tipado
```typescript
// infrastructure/http/controllers/eventos.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { RegistrarEventoUseCase } from '../../../application/use-cases/registrar-evento.use-case';
import { RegistrarEventoInputSchema } from '../schemas/eventos.schema';

export class EventosController {
  constructor(private readonly registrarEventoUseCase: RegistrarEventoUseCase) {}

  async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarEventoInputSchema.parse(req.body);
    const result = await this.registrarEventoUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 6. Registro de Decisiones (Self-Correction Log)
- *2026-10-03:* Se define oficialmente el stack: **TypeScript + Node.js + Fastify + PostgreSQL + Drizzle ORM**.
- *2026-10-03:* Se aprueba arquitectura de ingesta offline-first con soporte para batch sync en endpoints de eventos.
