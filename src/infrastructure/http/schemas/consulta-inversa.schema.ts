import { z } from 'zod';

export const ConsultaInversaQuerySchema = z.object({
  insumoId: z.string().trim().optional(),
  loteInsumoId: z.string().trim().optional(),
  numeroLote: z.string().trim().optional(),
}).refine(data => Boolean(data.insumoId || data.loteInsumoId || data.numeroLote), {
  message: 'Debe especificar al menos un criterio: insumoId, loteInsumoId o numeroLote (RF-M6-12).',
});
