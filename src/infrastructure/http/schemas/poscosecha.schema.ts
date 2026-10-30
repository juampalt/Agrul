import { z } from 'zod';
import { esEstimacionKgValida, esFechaCosechaValida } from '../../../core/domain/entities/cosecha-programada.entity.js';

const uuid = z.string().uuid().transform(v => v.toLowerCase());
const fecha = z.string().refine(esFechaCosechaValida, 'Debe ser una fecha de calendario YYYY-MM-DD');
const kg = z.number().refine(esEstimacionKgValida, 'Los kg deben ser no negativos, con hasta dos decimales y máximo 99999999.99');
const comun = { operacionId: uuid, responsableId: uuid, timestampCapturaLocal: z.string().datetime({ offset: true }).optional() };
export const ClasificarProduccionSchema = z.object({ ...comun, cosechaId: uuid, fechaClasificacion: fecha,
  cantidadRecibidaKg: kg.refine(v => v > 0, 'Los kg recibidos deben ser positivos'),
  kgFresco: kg, kgIndustria: kg, kgDescarte: kg, motivosDescarte: z.array(z.string().trim().min(1)).default([]),
}).strict();
export const AcondicionarProduccionSchema = z.object({ ...comun, partidaProduccionId: uuid, fechaAcondicionamiento: fecha,
  tipoAcondicionamiento: z.string().trim().min(1), tipoEnvase: z.string().trim().min(1),
  cantidadKg: kg.refine(v => v > 0, 'Los kg deben ser positivos'), cantidadEnvases: z.number().int().min(1).max(2147483647),
}).strict();
export const PoscosechaIdSchema = z.object({ id: uuid }).strict();
export const PoscosechaVacioSchema = z.object({}).strict();
const pagina = { limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).max(2147483647).default(0) };
const rango = (v: { desde?: string; hasta?: string }) => !v.desde || !v.hasta || v.desde <= v.hasta;
export const ConsultarClasificacionesSchema = z.object({ ...pagina, cosechaId: uuid.optional(), desde: fecha.optional(), hasta: fecha.optional() })
  .strict().refine(rango, 'El rango de fechas está invertido');
export const ConsultarPartidasProduccionSchema = z.object({ ...pagina, cosechaId: uuid.optional(), clasificacionId: uuid.optional(),
  categoria: z.enum(['FRESCO', 'INDUSTRIA']).optional() }).strict();
export const ConsultarAcondicionamientosSchema = z.object({ ...pagina, cosechaId: uuid.optional(), partidaProduccionId: uuid.optional(),
  desde: fecha.optional(), hasta: fecha.optional() }).strict().refine(rango, 'El rango de fechas está invertido');
