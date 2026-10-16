import { z } from 'zod';
import { TIPOS_PERDIDA_VALIDOS } from '../../../core/domain/entities/perdida-cosecha.entity.js';

export const RegistrarPerdidaCosechaBodySchema = z.object({
  cosechaId: z.string().uuid('El ID de cosecha debe ser un UUID válido').optional().nullable(),
  loteId: z.string().uuid('El loteId debe ser un UUID válido (RF-M5-14)'),
  cicloId: z.string().uuid('El cicloId debe ser un UUID válido').optional().nullable(),
  fecha: z.string().trim().min(1, 'La fecha del incidente o pérdida es obligatoria (RF-M5-14)'),
  tipo: z.enum(TIPOS_PERDIDA_VALIDOS, {
    errorMap: () => ({ message: `Tipo de pérdida inválido. Valores permitidos: ${TIPOS_PERDIDA_VALIDOS.join(', ')}` }),
  }),
  cantidadEstimadaKg: z.number().positive('El volumen estimado afectado en kg debe ser mayor a cero (RF-M5-14)'),
  superficieAfectadaHa: z.number().positive('La superficie afectada debe ser un valor positivo').optional().nullable(),
  descripcion: z.string().trim().min(1, 'La descripción del incidente o pérdida es obligatoria (RF-M5-14)').max(1000),
  responsableRegistroId: z.string().uuid('El responsableRegistroId debe ser un UUID válido').optional().nullable(),
}).strict();

export const ListarPerdidasCosechaQuerySchema = z.object({
  loteId: z.string().uuid().optional(),
  cicloId: z.string().uuid().optional(),
  cosechaId: z.string().uuid().optional(),
  tipo: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
}).strict();

export const PerdidaIdParamSchema = z.object({
  id: z.string().uuid('El ID de la pérdida debe ser un UUID válido'),
}).strict();
