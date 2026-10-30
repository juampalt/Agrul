import { z } from 'zod';
import { esEstimacionKgValida, esFechaCosechaValida } from '../../../core/domain/entities/cosecha-programada.entity.js';
import { esTemperaturaObjetivoValida } from '../../../core/domain/entities/almacenamiento-produccion.js';

const uuid = z.string().uuid().transform(v => v.toLowerCase());
const fecha = z.string().refine(esFechaCosechaValida, 'Debe ser una fecha de calendario YYYY-MM-DD');
const kg = z.number().positive().refine(esEstimacionKgValida, 'Los kg requieren hasta dos decimales y máximo 99999999.99');
const captura = { responsableId: uuid, timestampCapturaLocal: z.string().datetime({ offset: true }).optional() };
const pagina = { limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).max(2147483647).default(0) };
const rango = (v: { desde?: string; hasta?: string }) => !v.desde || !v.hasta || v.desde <= v.hasta;
export const RegistrarCamaraSchema = z.object({ operacionId: uuid, fincaId: uuid, nombre: z.string().trim().min(1).max(40),
  descripcion: z.string().nullable().optional().default(null),
  temperaturaObjetivoC: z.number().refine(esTemperaturaObjetivoValida, 'La temperatura requiere hasta dos decimales entre -999.99 y 999.99').nullable().optional().default(null),
}).strict();
export const RegistrarMovimientoAlmacenamientoSchema = z.object({ ...captura, operacionId: uuid, partidaProduccionId: uuid,
  camaraSectorId: uuid, tipoMovimiento: z.enum(['INGRESO','SALIDA']), cantidadKg: kg, fechaMovimiento: fecha }).strict();
export const RegistrarDestinoProduccionSchema = z.object({ ...captura, operacionId: uuid, partidaProduccionId: uuid,
  fechaDestino: fecha, tipoDestino: z.enum(['MERCADO_FRESCO','INDUSTRIA','OTRO']), destinoEspecifico: z.string().trim().min(1), cantidadDestinadaKg: kg }).strict();
export const AlmacenamientoIdSchema = z.object({ id: uuid }).strict();
export const AlmacenamientoVacioSchema = z.object({}).strict();
export const ConsultarCamarasSchema = z.object({ ...pagina, fincaId: uuid.optional() }).strict();
const saldo = { ...pagina, fincaId: uuid.optional(), camaraSectorId: uuid.optional(), partidaProduccionId: uuid.optional(), cosechaId: uuid.optional() };
export const ConsultarSaldosCamaraSchema = z.object(saldo).strict();
export const ConsultarMovimientosAlmacenamientoSchema = z.object({ ...saldo, tipoMovimiento: z.enum(['INGRESO','SALIDA']).optional(),
  desde: fecha.optional(), hasta: fecha.optional() }).strict().refine(rango, 'El rango de fechas está invertido');
export const ConsultarDestinosProduccionSchema = z.object({ ...pagina, fincaId: uuid.optional(), partidaProduccionId: uuid.optional(),
  cosechaId: uuid.optional(), tipoDestino: z.enum(['MERCADO_FRESCO','INDUSTRIA','OTRO']).optional(), desde: fecha.optional(), hasta: fecha.optional() })
  .strict().refine(rango, 'El rango de fechas está invertido');
