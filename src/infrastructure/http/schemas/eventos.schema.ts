import { z } from 'zod';
import { TipoEventoEnum } from '../../../core/domain/value-objects/tipo-evento.vo.js';

export const RegistrarEventoBodySchema = z.object({
  actorId: z.string().uuid('El actorId debe ser un UUID válido'),
  ubicacionId: z.string().uuid('La ubicacionId debe ser un UUID válido'),
  tipoEvento: z.enum([
    TipoEventoEnum.COSECHA,
    TipoEventoEnum.RECEPCION,
    TipoEventoEnum.CLASIFICACION,
    TipoEventoEnum.TRATAMIENTO,
    TipoEventoEnum.PROCESO,
    TipoEventoEnum.EMBALAJE,
    TipoEventoEnum.DESPACHO,
    TipoEventoEnum.FUSION_ORIGEN,
    TipoEventoEnum.FUSION_RECEPCION,
    TipoEventoEnum.DIVISION_SPLIT,
    TipoEventoEnum.COMPENSACION_AJUSTE,
    TipoEventoEnum.COMPENSACION_ANULACION,
  ]),
  timestampCapturaLocal: z.string().datetime({ message: 'Debe ser un timestamp ISO 8601 UTC válido' }).optional(),
  payloadEspecifico: z.record(z.unknown()),
  eventoReferenciadoId: z.string().uuid().optional().nullable(),
}).strict();

export type RegistrarEventoBody = z.infer<typeof RegistrarEventoBodySchema>;
