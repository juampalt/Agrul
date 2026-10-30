import { z } from 'zod';

export const RegistrarPlantacionSchema = z.object({
  loteId: z.string().uuid(),
  cultivoId: z.string().uuid(),
  variedadId: z.string().uuid(),
  fechaPlantacion: z.string().date(),
  superficieHa: z.number().positive().max(999999.99).multipleOf(0.01),
  cantidadInicialPlantas: z.number().int().positive().max(2147483647),
  procedencia: z.string().nullable().default(null),
  observaciones: z.string().trim().nullable().default(null),
}).strict();
export const FinalizarPlantacionSchema = z.object({ fechaFinalizacion: z.string().date() }).strict();
export const PlantacionIdSchema = z.object({ id: z.string().uuid() }).strict();
export const SolicitudVaciaPlantacionSchema = z.object({}).strict();
export const ConsultarPlantacionesSchema = z.object({
  loteId: z.string().uuid().optional(),
  cultivoId: z.string().uuid().optional(),
  variedadId: z.string().uuid().optional(),
  estado: z.enum(['ACTIVA', 'FINALIZADA']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
