import { z } from 'zod';

export const DatosCultivoSchema = z.object({
  nombre: z.string().trim().min(1).max(40),
  tipoCicloVida: z.enum(['ANUAL', 'PERENNE']),
  descripcion: z.string().nullable().default(null),
}).strict();

export const CultivoIdSchema = z.object({ id: z.string().uuid() }).strict();

export const ConsultarCultivosSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

export const SolicitudVaciaCultivoSchema = z.object({}).strict();
