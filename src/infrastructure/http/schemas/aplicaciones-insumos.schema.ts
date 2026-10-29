import { z } from 'zod';
import { validarMedidaAplicacion } from '../../../core/domain/entities/aplicacion-insumos.js';
import { validarCantidadInventario } from '../../../core/domain/entities/inventario-insumos.js';

const uuid = z.string().uuid().transform(id => id.toLowerCase());
const cantidad = z.number().finite().superRefine((valor, ctx) => {
  try { validarCantidadInventario(valor); } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cantidad positiva con hasta dos decimales y rango NUMERIC(10,2).' });
  }
});
const medida = z.number().finite().superRefine((valor, ctx) => {
  try { validarMedidaAplicacion(valor); } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Medida positiva representable como NUMERIC(8,2).' });
  }
});
export const RegistrarAplicacionInsumosSchema = z.object({
  operacionId: uuid, actividadRealizadaId: uuid, superficieTratada: medida,
  metodoAplicacion: z.string().trim().min(1).max(2000), motivoAplicacion: z.string().trim().min(1).max(2000),
  observaciones: z.string().trim().max(5000).nullable().default(null),
  items: z.array(z.object({ insumoId: uuid, cantidad, unidadMedida: z.string().trim().min(1).max(30), dosis: medida }).strict()).min(1).max(100),
}).strict().superRefine(refinarInsumosUnicos);

function refinarInsumosUnicos(datos: { items: { insumoId: string }[] }, ctx: z.RefinementCtx) {
  if (new Set(datos.items.map(i => i.insumoId)).size !== datos.items.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Cada insumo debe declararse una sola vez.' });
  }
}
export const NuevaVersionAplicacionSchema = RegistrarAplicacionInsumosSchema.innerType().omit({ operacionId: true }).superRefine(refinarInsumosUnicos);
export const ConsultarAplicacionesInsumosSchema = z.object({ actividadRealizadaId: uuid.optional(),
  incluirHistoricas: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  fincaId: uuid.optional(), insumoId: uuid.optional(), limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
export const AplicacionInsumosIdSchema = z.object({ id: uuid }).strict();
export const AplicacionInsumosVacioSchema = z.object({}).strict();
