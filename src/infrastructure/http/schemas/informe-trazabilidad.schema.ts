import { z } from 'zod';

export const EmitirInformeParamSchema = z
  .object({
    identificador: z.string().min(1, 'El identificador de cosecha o lote es obligatorio.'),
  })
  .strict();

export const EmitirInformeQuerySchema = z
  .object({
    formato: z.enum(['PDF', 'CSV', 'EXCEL']).optional().default('PDF'),
    usuarioEmisor: z.string().optional(),
    rolEmisor: z.string().optional(),
    incluirDatosSensibles: z.coerce.boolean().optional().default(false),
    incluirCostos: z.coerce.boolean().optional().default(false),
  })
  .strict();

export const ListarInformesLogQuerySchema = z
  .object({
    cosechaId: z.string().uuid().optional(),
    loteId: z.string().uuid().optional(),
    codigoTrazabilidad: z.string().optional(),
    usuarioEmisor: z.string().optional(),
    tipoFormato: z.enum(['PDF', 'CSV', 'EXCEL']).optional(),
  })
  .strict();

export type EmitirInformeParamType = z.infer<typeof EmitirInformeParamSchema>;
export type EmitirInformeQueryType = z.infer<typeof EmitirInformeQuerySchema>;
export type ListarInformesLogQueryType = z.infer<typeof ListarInformesLogQuerySchema>;
