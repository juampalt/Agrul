import { z } from 'zod';

export const RegistrarCicloProductivoSchema = z.object({
  plantacionId: z.string().uuid(),
  nombreCodigo: z.string().trim().min(1).max(30),
  fechaInicioPrevista: z.string().date(),
  fechaFinPrevista: z.string().date(),
  responsableSeguimientoId: z.string().uuid(),
  observaciones: z.string().nullable().default(null),
}).strict();
export const CicloProductivoIdSchema = z.object({ id: z.string().uuid() }).strict();
export const SolicitudVaciaCicloSchema = z.object({}).strict();
export const IniciarCicloProductivoSchema = z.object({ fechaInicioEfectiva: z.string().date() }).strict();
export const FinalizarCicloProductivoSchema = z.object({ fechaFinEfectiva: z.string().date() }).strict();
export const ConsultarCiclosProductivosSchema = z.object({
  plantacionId: z.string().uuid().optional(),
  loteId: z.string().uuid().optional(),
  estado: z.enum(['PLANIFICADO', 'ACTIVO', 'FINALIZADO']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
