import { z } from 'zod';

export const HijoSplitSchema = z.object({
  codigoLote: z.string().trim().min(3).max(60).optional(),
  producto: z.string().trim().min(2).max(120).optional(),
  variedad: z.string().trim().max(100).optional().nullable(),
  cantidad: z.number().positive('La cantidad de cada lote hijo debe ser mayor a 0'),
  unidadMedida: z.string().trim().min(1).max(20).optional(),
}).strict();

export const DividirLoteBodySchema = z.object({
  actorId: z.string().uuid('El actorId debe ser un UUID válido'),
  ubicacionId: z.string().uuid('El ubicacionId debe ser un UUID válido'),
  hijos: z.array(HijoSplitSchema).min(1, 'Debe especificar al menos un lote hijo para la división'),
  motivo: z.string().trim().max(255).optional(),
  timestampCapturaLocal: z.string().datetime().optional(),
}).strict();

export type DividirLoteBody = z.infer<typeof DividirLoteBodySchema>;
export type HijoSplit = z.infer<typeof HijoSplitSchema>;
