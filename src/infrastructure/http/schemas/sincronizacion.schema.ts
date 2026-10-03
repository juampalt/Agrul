import { z } from 'zod';

export const SincronizarBatchOfflineSchema = z.object({
  dispositivoId: z.string().min(3, 'El dispositivoId debe tener al menos 3 caracteres'),
  eventos: z.array(
    z.object({
      idLocalTemporal: z.string().min(1),
      loteId: z.string().uuid(),
      actorId: z.string().uuid(),
      ubicacionId: z.string().uuid(),
      tipoEvento: z.string(),
      timestampCapturaLocal: z.string().datetime({ message: 'El timestamp debe ser ISO 8601' }),
      payloadEspecifico: z.record(z.unknown()),
      eventoReferenciadoId: z.string().uuid().optional().nullable(),
    }).strict()
  ).min(1, 'Debe enviar al menos un evento para sincronizar').max(500, 'Máximo 500 eventos por lote de sincronización'),
}).strict();

export type SincronizarBatchOfflineBody = z.infer<typeof SincronizarBatchOfflineSchema>;
