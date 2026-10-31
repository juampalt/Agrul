import { z } from 'zod';
import { esEstimacionKgValida, esFechaCosechaValida } from '../../../core/domain/entities/cosecha-programada.entity.js';

const uuid = z.string().uuid().transform(valor => valor.toLowerCase());
const fecha = z.string().refine(esFechaCosechaValida, 'Debe ser una fecha de calendario YYYY-MM-DD');
const pasada = z.number().int().min(1).max(2147483647);
const comun = {
  operacionId: uuid, fechaEfectiva: fecha, numeroPasada: pasada, responsableId: uuid,
  sector: z.string().trim().min(1).optional(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
  cantidadCosechadaKg: z.number().positive().refine(esEstimacionKgValida, 'Los kg reales deben tener hasta dos decimales, sin superar 99999999.99'),
  timestampCapturaLocal: z.string().datetime({ offset: true }).optional(),
};
export const RegistrarCosechaVigenteSchema = z.discriminatedUnion('origen', [
  z.object({ ...comun, origen: z.literal('PROGRAMADA'), cosechaProgramadaId: uuid,
    versionProgramacion: z.number().int().min(1).max(2147483647) }).strict(),
  z.object({ ...comun, origen: z.literal('NO_PROGRAMADA'), cicloId: uuid }).strict(),
]);
export const CosechaRegistroIdSchema = z.object({ id: uuid }).strict();
export const CosechaRegistroVacioSchema = z.object({}).strict();
export const ConsultarCosechasVigentesSchema = z.object({
  cicloId: uuid.optional(), loteId: uuid.optional(), origen: z.enum(['PROGRAMADA','NO_PROGRAMADA']).optional(),
  cultivoId: uuid.optional(), variedadId: uuid.optional(), cosechaId: uuid.optional(),
  numeroPasada: z.coerce.number().int().min(1).max(2147483647).optional(),
  desde: fecha.optional(), hasta: fecha.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).max(2147483647).default(0),
}).strict().refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, 'El rango de fechas está invertido');
