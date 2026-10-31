import { z } from 'zod';
import { esFechaProgramadaValida, esSuperficiePrevistaValida, MENSAJE_SUPERFICIE_PREVISTA } from '../../../core/domain/entities/actividad-programada.entity.js';

const FechaProgramadaSchema = z.string().refine(esFechaProgramadaValida, 'Debe ser una fecha existente con formato YYYY-MM-DD');

export const ProgramarActividadSchema = z
  .object({
    cicloId: z.string().uuid(),
    tipoActividadId: z.string().uuid(),
    fechaProgramada: FechaProgramadaSchema,
    responsableId: z.string().uuid(),
    superficiePrevista: z.number().finite().refine(esSuperficiePrevistaValida, MENSAJE_SUPERFICIE_PREVISTA).nullable().optional(),
    descripcion: z.string().nullable().optional(),
    observaciones: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const ActividadProgramadaIdSchema = z.object({ id: z.string().uuid() }).strict();

export const ReprogramarActividadSchema = z
  .object({
    fechaProgramada: FechaProgramadaSchema,
    responsableId: z.string().uuid().optional(),
    superficiePrevista: z.number().finite().refine(esSuperficiePrevistaValida, MENSAJE_SUPERFICIE_PREVISTA).nullable().optional(),
    descripcion: z.string().nullable().optional(),
    observaciones: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const CancelarActividadSchema = z
  .object({
    motivoCancelacion: z.string().trim().min(1, 'El motivo de cancelación es obligatorio'),
  })
  .strict();

export const ConsultarActividadesProgramadasSchema = z
  .object({
    cicloId: z.string().uuid().optional(),
    loteId: z.string().uuid().optional(),
    tipoActividadId: z.string().uuid().optional(),
    responsableId: z.string().uuid().optional(),
    estado: z.enum(['PENDIENTE', 'EJECUTADA', 'CANCELADA']).optional(),
    desde: FechaProgramadaSchema.optional(),
    hasta: FechaProgramadaSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const SolicitudVaciaActividadProgramadaSchema = z.object({}).strict();
