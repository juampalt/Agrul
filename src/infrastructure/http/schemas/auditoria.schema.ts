import { z } from 'zod';

export const AccionAuditoriaEnum = z.enum([
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
  usuarioId: z.string().optional(),
  accion: AccionAuditoriaEnum.optional(),
  entidad: z.string().optional(),
  entidadId: z.string().optional(),
  fechaDesde: z.string().datetime({ offset: true }).optional(),
  fechaHasta: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const AuditoriaIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const SimularInactividadBodySchema = z.object({
  timeoutMs: z.number().int().positive().optional(),
  usuarioId: z.string().optional(),
  simularSegundosInactividad: z.number().int().positive().optional(),
});
