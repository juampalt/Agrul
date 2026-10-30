import { z } from 'zod';
import { TIPOS_MOVIMIENTO_MANUAL, validarCantidadInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { esFechaProgramadaValida } from '../../../core/domain/entities/actividad-programada.entity.js';

const fecha = z.string().refine(esFechaProgramadaValida, 'Fecha inexistente; usar YYYY-MM-DD.');
const cantidad = z.number().finite().superRefine((valor, ctx) => {
  try { validarCantidadInventario(valor); } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cantidad positiva representable como NUMERIC(10,2).' });
  }
});
const comunes = { operacionId: z.string().uuid(), cantidad, unidadMedida: z.string().trim().min(1).max(30),
  motivo: z.string().trim().min(1).max(2000) };
export const IngresoInsumosSchema = z.object({ ...comunes, fincaId: z.string().uuid(), insumoId: z.string().uuid(),
  fechaIngreso: fecha, proveedor: z.string().trim().min(1).max(2000), fechaVencimiento: fecha.nullable().default(null),
  tipoMovimiento: z.enum(['INGRESO', 'EXISTENCIA_INICIAL']),
}).strict();
export const MovimientoInventarioSchema = z.object({ ...comunes, partidaId: z.string().uuid(),
  fechaMovimiento: fecha, tipoMovimiento: z.enum(TIPOS_MOVIMIENTO_MANUAL),
}).strict();
export const ConsultarExistenciasSchema = z.object({ fincaId: z.string().uuid().optional(), insumoId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).default(0),
}).strict();
export const ConsultarInventarioSchema = ConsultarExistenciasSchema.extend({ partidaId: z.string().uuid().optional() }).strict();
export const ConsultarMovimientosInventarioSchema = ConsultarInventarioSchema.extend({
  tipoMovimiento: z.enum(['INGRESO', 'EXISTENCIA_INICIAL', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION', 'PERDIDA', 'EGRESO_APLICACION', 'REGULARIZACION_CORRECCION']).optional(),
  desde: fecha.optional(), hasta: fecha.optional(),
}).strict().refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, { path: ['hasta'], message: 'El rango de fechas está invertido.' });
export const InventarioIdSchema = z.object({ id: z.string().uuid() }).strict();
export const InventarioVacioSchema = z.object({}).strict();
