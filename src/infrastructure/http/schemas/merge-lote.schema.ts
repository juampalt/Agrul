import { z } from 'zod';

export const PadreAporteSchema = z.object({
  loteId: z.string().uuid('El loteId del padre debe ser un UUID válido'),
  cantidad: z.number().positive('La cantidad aportada por cada lote padre debe ser mayor a 0'),
}).strict();

export const NuevoLoteMergeSchema = z.object({
  codigoLote: z.string().trim().min(3).max(60).optional(),
  producto: z.string().trim().min(2).max(120, 'El producto debe tener entre 2 y 120 caracteres'),
  variedad: z.string().trim().max(100).optional().nullable(),
  unidadMedida: z.string().trim().min(1).max(20, 'La unidad de medida es requerida'),
}).strict();

export const FusionarLotesBodySchema = z.object({
  padres: z.array(PadreAporteSchema).min(2, 'Debe especificar al menos 2 lotes padres para una fusión/merge'),
  nuevoLote: NuevoLoteMergeSchema,
  actorId: z.string().uuid('El actorId debe ser un UUID válido'),
  ubicacionId: z.string().uuid('El ubicacionId debe ser un UUID válido'),
  motivo: z.string().trim().max(255).optional(),
  timestampCapturaLocal: z.string().datetime().optional(),
}).strict();

export type FusionarLotesBody = z.infer<typeof FusionarLotesBodySchema>;
export type PadreAporte = z.infer<typeof PadreAporteSchema>;
export type NuevoLoteMerge = z.infer<typeof NuevoLoteMergeSchema>;
