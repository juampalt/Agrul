import { z } from 'zod';

export const DatosVariedadSchema = z.object({
  nombre: z.string().trim().min(1).max(40),
  descripcion: z.string().nullable().default(null),
}).strict();

export const RegistrarVariedadSchema = DatosVariedadSchema.extend({ cultivoId: z.string().uuid() }).strict();
export const VariedadIdSchema = z.object({ id: z.string().uuid() }).strict();
export const SolicitudVaciaVariedadSchema = z.object({}).strict();

export const ConsultarVariedadesSchema = z.object({
  cultivoId: z.string().uuid().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  nombre: z.string().trim().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
