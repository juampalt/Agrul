import { z } from 'zod';
import { CATEGORIAS_INSUMO_CANONICO, validarNivelMinimo } from '../../../core/domain/entities/insumo.entity.js';

export const DatosInsumoSchema = z.object({
  codigo: z.string().trim().min(1).max(15),
  nombre: z.string().trim().min(1).max(200),
  categoria: z.enum(CATEGORIAS_INSUMO_CANONICO),
  unidadMedida: z.string().trim().min(1).max(30),
  tipoProducto: z.string().trim().min(1).max(150).nullable().default(null),
  fabricanteMarca: z.string().trim().min(1).max(150).nullable().default(null),
  nivelMinimo: z.number().finite().superRefine((valor, ctx) => {
    try { validarNivelMinimo(valor); } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser no negativo y representable como NUMERIC(10,2).' });
    }
  }),
}).strict();

export const ConsultarInsumosSchema = z.object({
  categoria: z.enum(CATEGORIAS_INSUMO_CANONICO).optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  codigo: z.string().trim().min(1).max(15).optional(),
  nombre: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
export const InsumoCanonicoIdSchema = z.object({ id: z.string().uuid() }).strict();
export const SolicitudVaciaInsumoSchema = z.object({}).strict();
