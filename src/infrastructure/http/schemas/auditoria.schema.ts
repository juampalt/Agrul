import { z } from 'zod';

export const AccionAuditoriaEnum = z.enum([
  'LOGOUT',
  'LOGIN',
  'CREAR',
  'EDITAR',
  'ANULAR',
  'EMITIR_REPORTE',
  'BLOQUEO',
  'DESBLOQUEO',
  'CAMBIO_PASSWORD',
]);

export const ConsultarAuditoriaQuerySchema = z.object({
  usuarioId: z.string().uuid().optional(),
  accion: AccionAuditoriaEnum.optional(),
  entidad: z.string().trim().min(1).max(100).optional(),
  entidadId: z.string().trim().min(1).max(100).optional(),
  fechaDesde: z.string().datetime({ offset: true }).optional(),
  fechaHasta: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

export const AuditoriaIdParamSchema = z.object({
  id: z.string().uuid(),
}).strict();

export const SimularInactividadBodySchema = z.object({
  timeoutMs: z.number().int().positive().max(86400000).optional(),
  usuarioId: z.string().uuid().optional(),
  simularSegundosInactividad: z.number().int().positive().max(86400).optional(),
}).strict();
