import { z } from 'zod';

export const IndicadoresProduccionQuerySchema = z.object({
  fincaId: z.string().trim().optional(),
  loteId: z.string().trim().optional(),
  cicloId: z.string().trim().optional(),
  cultivo: z.string().trim().optional(),
  variedad: z.string().trim().optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
  estadoCiclo: z.enum(['PLANIFICADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO']).optional(),
});

export const IndicadoresCicloParamSchema = z.object({
  cicloId: z.string().trim().min(1, 'El identificador de ciclo es obligatorio'),
});

export const IndicadoresLoteParamSchema = z.object({
  loteId: z.string().trim().min(1, 'El identificador de lote es obligatorio'),
});
