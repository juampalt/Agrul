# API Contracts & Validations

> **Cuándo usar esta skill:** Al definir o modificar rutas HTTP en Fastify, schemas Zod de validación de entrada/salida, middlewares de error o endpoints de ingesta online/offline.

---

## 1. Contexto & Propósito
Agrul expone una API REST consistente y fuertemente tipada vía **Fastify y Zod**. Garantiza que ningún cliente móvil o web reciba respuestas ambiguas y que todas las cargas útiles (incluyendo lotes offline) se validen exhaustivamente antes de llegar a los casos de uso.

---

## 2. Invariantes y Reglas No Negociables
1. **Envelope Unificado:** Toda respuesta HTTP respeta la estructura:
   ```json
   {
     "success": true,
     "data": { ... },
     "error": null,
     "timestamp": "2026-10-03T22:30:00.000Z"
   }
   ```
2. **Validación Zod Estricta:** Todo request body, query y parámetro de ruta se valida con Zod (`.strict()`).
3. **Manejo de Respuestas de Batch Sync (Offline):** El endpoint de sincronización offline devuelve un reporte detallado con los eventos persistidos exitosamente y aquellos observados/rechazados.

---

## 3. Endpoints Canónicos (API Surface)

| Método | Ruta | Descripción | Código Éxito |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/lotes` | Alta de nuevo lote primario | `201 Created` |
| `GET` | `/api/v1/lotes/:id` | Ficha técnica y estado del lote | `200 OK` |
| `POST` | `/api/v1/lotes/:id/eventos` | Registro online de un evento inmutable | `201 Created` |
| `POST` | `/api/v1/lotes/:id/split` | División de lote padre en N lotes hijos | `201 Created` |
| `POST` | `/api/v1/lotes/merge` | Fusión de múltiples lotes padres en un nuevo lote | `201 Created` |
| `GET` | `/api/v1/lotes/:id/linaje` | Árbol genealógico (ancestros y descendientes) | `200 OK` |
| `POST` | `/api/v1/eventos/sincronizar` | **Batch Sync Offline:** Ingesta de buffer de eventos | `200 OK` |
| `POST` | `/api/v1/lotes/:id/compensar` | Registro de evento compensatorio (anulación/ajuste) | `201 Created` |

---

## 4. Schemas Zod de Referencia

### Ingesta de Evento Individual
```typescript
import { z } from 'zod';

export const RegistrarEventoSchema = z.object({
  actorId: z.string().uuid(),
  ubicacionId: z.string().uuid(),
  tipoEvento: z.enum(['COSECHA', 'RECEPCION', 'PROCESO', 'EMBALAJE', 'DESPACHO', 'COMPENSACION']),
  timestampCapturaLocal: z.string().datetime({ offset: true }),
  payloadEspecifico: z.record(z.unknown()),
  eventoReferenciadoId: z.string().uuid().optional(),
}).strict();
```

### Ingesta Batch Offline (`/api/v1/eventos/sincronizar`)
```typescript
export const SincronizarBatchOfflineSchema = z.object({
  dispositivoId: z.string().min(3),
  eventos: z.array(
    z.object({
      idLocalTemporal: z.string(),
      loteId: z.string().uuid(),
      actorId: z.string().uuid(),
      ubicacionId: z.string().uuid(),
      tipoEvento: z.string(),
      timestampCapturaLocal: z.string().datetime({ offset: true }),
      payloadEspecifico: z.record(z.unknown()),
    })
  ).min(1).max(500),
}).strict();
```

---

## 5. DOs and DON'Ts

### DO
- **DO:** Usar `fastify-type-provider-zod` para inferir tipos de Typescript directamente de los schemas Zod sin duplicar interfaces.
- **DO:** Devolver `422 Unprocessable Entity` cuando una regla de negocio de trazabilidad falla (ej: lote ya cerrado o cantidad excedida).
- **DO:** Asegurar que los errores de validación (400) retornen un array claro de campos con sus problemas (`error.details`).

### DON'T
- **DON'T:** Nunca exponer stack traces o errores crudos de PostgreSQL al cliente.
- **DON'T:** No permitir que clientes externos envíen `timestampServidor`; el servidor siempre asigna su propio reloj UTC de ingesta.

---

## 6. Registro de Decisiones (Self-Correction Log)
- *2026-10-03:* Se incorpora endpoint específico `POST /api/v1/eventos/sincronizar` para absorción de colas offline generadas en campo.
- *2026-10-03:* Se añaden endpoints dedicados de split y merge para el grafo N:M.
