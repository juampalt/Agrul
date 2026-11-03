import { z } from 'zod';

export const TipoEventoClimaticoSGTASchema = z.enum([
  'HELADA',
  'GRANIZO',
  'LLUVIA_INTENSA',
  'VIENTO_FUERTE',
  'OTRO',
]);

export const RegistrarObservacionMeteorologicaSchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  fechaHoraObservacion: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'La fecha y hora de observación debe ser una fecha ISO válida'
  ),
  temperaturaC: z.number({
    required_error: 'La temperatura es obligatoria',
    invalid_type_error: 'La temperatura debe ser un número',
  }).min(-50, 'La temperatura física no puede ser menor a -50°C').max(65, 'La temperatura física no puede superar 65°C'),
  humedadRelativa: z.number({
    required_error: 'La humedad relativa es obligatoria (RN-28)',
    invalid_type_error: 'La humedad relativa debe ser un número',
  }).min(0, 'La humedad relativa no puede ser inferior a 0% (RN-28)').max(100, 'La humedad relativa no puede superar 100% (RN-28)'),
  precipitacionesMm: z.number({
    required_error: 'Las precipitaciones son obligatorias (RN-28)',
    invalid_type_error: 'Las precipitaciones deben ser un número',
  }).min(0, 'Las precipitaciones no pueden ser negativas (RN-28)'),
  observaciones: z.string().trim().max(1000).optional().nullable(),
  responsableId: z.string().uuid().optional().nullable(),
}).strict();

export const ListarObservacionesMeteorologicasQuerySchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const LoteAfectadoItemSchema = z.object({
  loteId: z.string().uuid('El loteId debe ser un UUID válido'),
  descripcionDano: z.string().trim().min(3, 'La descripción del daño debe tener al menos 3 caracteres'),
  superficieAfectadaHa: z.number().positive('La superficie afectada debe ser un número positivo').optional().nullable(),
  porcentajeDano: z.number().min(0, 'El porcentaje de daño no puede ser negativo').max(100, 'El porcentaje de daño no puede exceder 100%').optional().nullable(),
}).strict();

export const RegistrarEventoClimaticoSchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  tipoEvento: TipoEventoClimaticoSGTASchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD (RN-04)'),
  descripcion: z.string().trim().min(5, 'La descripción del evento debe contener al menos 5 caracteres'),
  responsableId: z.string().uuid().optional().nullable(),
  lotesAfectados: z.array(LoteAfectadoItemSchema).min(1, 'Debe asociar al menos un lote afectado por el evento adverso (CU69)'),
}).strict();

export const ListarEventosClimaticosQuerySchema = z.object({
  fincaId: z.string().uuid().optional(),
  loteId: z.string().uuid().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  tipoEvento: TipoEventoClimaticoSGTASchema.optional(),
});
