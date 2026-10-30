import { z } from 'zod';
import { esEstimacionKgValida, esFechaCosechaValida } from '../../../core/domain/entities/cosecha-programada.entity.js';

const fecha = z.string().refine(esFechaCosechaValida, 'Debe ser una fecha de calendario válida YYYY-MM-DD');
export const JornadaIdSchema = z.object({ id: z.string().uuid().transform(id => id.toLowerCase()) }).strict();
export const SolicitudVaciaJornadaSchema = z.object({}).strict();
export const ProgramarCosechaSchema = z.object({
  operacionId: z.string().uuid().transform(id => id.toLowerCase()),
  cicloId: z.string().uuid().transform(id => id.toLowerCase()),
  fechaPrevista: fecha,
  responsableId: z.string().uuid().transform(id => id.toLowerCase()),
  sector: z.string().trim().min(1),
  cantidadEstimadaKg: z.number().refine(esEstimacionKgValida, 'Los kg estimados deben estar entre 0 y 99999999.99, con hasta dos decimales'),
}).strict();
export const ReprogramarCosechaSchema = z.object({
  version: z.number().int().positive(),
  fechaPrevista: fecha,
  responsableId: z.string().uuid().transform(id => id.toLowerCase()).optional(),
}).strict();
export const CancelarJornadaSchema = z.object({
  version: z.number().int().positive(),
  motivoCancelacion: z.string().trim().min(1),
}).strict();
export const PaginaHistorialJornadaSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
export const ConsultarJornadasSchema = PaginaHistorialJornadaSchema.extend({
  cicloId: z.string().uuid().transform(id => id.toLowerCase()).optional(),
  responsableId: z.string().uuid().transform(id => id.toLowerCase()).optional(),
  estado: z.enum(['PENDIENTE', 'EJECUTADA', 'CANCELADA']).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
}).refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, 'El rango de fechas está invertido');
