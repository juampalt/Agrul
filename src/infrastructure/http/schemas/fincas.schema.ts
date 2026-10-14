import { z } from 'zod';
import { GeoJSONGeometrySchema } from './lotes.schema.js';

export const CrearFincaBodySchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  localidad: z.string().trim().min(2).max(120),
  departamento: z.string().trim().min(2).max(120),
  provincia: z.string().trim().min(2).max(120),
  superficieTotalHa: z.number().positive('La superficie total debe ser mayor a 0 ha'),
  responsableId: z.string().uuid().optional().nullable(),
  renspa: z.string().trim().max(50).optional().nullable(),
  geometria: GeoJSONGeometrySchema.optional().nullable(),
}).strict();

export const FincaIdParamSchema = z.object({
  id: z.string().uuid('El ID de la finca debe ser un UUID válido'),
}).strict();

export const ListarFincasQuerySchema = z.object({
  provincia: z.string().trim().optional(),
  departamento: z.string().trim().optional(),
  nombre: z.string().trim().optional(),
  limit: z.coerce.number().positive().optional(),
  offset: z.coerce.number().min(0).optional(),
}).strict();

export type CrearFincaBody = z.infer<typeof CrearFincaBodySchema>;
export type FincaIdParam = z.infer<typeof FincaIdParamSchema>;
export type ListarFincasQuery = z.infer<typeof ListarFincasQuerySchema>;
