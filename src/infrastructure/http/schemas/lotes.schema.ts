import { z } from 'zod';

export const CrearLoteBodySchema = z.object({
  codigoLote: z.string().trim().min(3).max(60).optional(),
  producto: z.string().trim().min(2).max(120),
  variedad: z.string().trim().max(100).optional().nullable(),
  cantidadInicial: z.number().positive('La cantidad inicial debe ser mayor a 0'),
  unidadMedida: z.string().trim().min(1).max(20),
}).strict();

export const LoteIdParamSchema = z.object({
  id: z.string().uuid('El ID del lote debe ser un UUID válido'),
}).strict();

export type CrearLoteBody = z.infer<typeof CrearLoteBodySchema>;
export type LoteIdParam = z.infer<typeof LoteIdParamSchema>;
