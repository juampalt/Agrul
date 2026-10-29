import { z } from 'zod';
import { CATEGORIAS_TIPO_ACTIVIDAD } from '../../../core/domain/entities/tipo-actividad-canonico.entity.js';

export const DatosTipoActividadSchema = z
  .object({
    nombre: z.string().trim().min(1).max(40),
    categoria: z.enum(CATEGORIAS_TIPO_ACTIVIDAD),
    descripcion: z.string().nullable().default(null),
    cultivoIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const TipoActividadIdSchema = z.object({ id: z.string().uuid() }).strict();

export const ConsultarTiposActividadSchema = z
  .object({
    estado: z.enum(['ACTIVA', 'INACTIVA']).optional(),
    categoria: z.enum(CATEGORIAS_TIPO_ACTIVIDAD).optional(),
    cultivoId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const SolicitudVaciaTipoActividadSchema = z.object({}).strict();
