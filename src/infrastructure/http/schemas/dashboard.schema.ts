import { z } from 'zod';

export const DashboardResumenQuerySchema = z.object({
  fincaId: z.string().trim().optional(),
  temporada: z.string().trim().min(1).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
});

export type DashboardResumenQuery = z.infer<typeof DashboardResumenQuerySchema>;
