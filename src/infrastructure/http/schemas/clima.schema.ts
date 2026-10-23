import { z } from 'zod';

export const FuenteDatoClimaSchema = z.enum([
  'MEDICION_PROPIA',
  'ESTACION_PROPIA',
  'SERVICIO_EXTERNO',
  'DATO_ZONA',
]);

export const RegistrarMedicionClimaticaSchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD (RN-04)'),
  tempMinC: z.number().optional().nullable(),
  tempMaxC: z.number().optional().nullable(),
  tempMediaC: z.number().optional().nullable(),
  precipitacionMm: z.number().min(0, 'La precipitación no puede ser negativa (RF-M10-05)'),
  humedadRelativaPct: z
    .number()
    .min(0, 'La humedad no puede ser inferior a 0% (RF-M10-05)')
    .max(100, 'La humedad no puede superar el 100% (RF-M10-05)')
    .optional()
    .nullable(),
  vientoKmH: z.number().min(0, 'La velocidad del viento no puede ser negativa (RF-M10-05)').optional().nullable(),
  huboHelada: z.boolean().optional().nullable(),
  huboGranizo: z.boolean().optional().nullable(),
  fuenteDato: FuenteDatoClimaSchema,
  observaciones: z.string().trim().max(1000).optional().nullable(),
}).strict();

export const CorregirMedicionClimaticaSchema = z.object({
  motivoCorreccion: z
    .string()
    .trim()
    .min(3, 'El motivo de la corrección es obligatorio para mantener la trazabilidad histórica (RF-M10-06 / RN-06)')
    .max(1000),
  tempMinC: z.number().optional().nullable(),
  tempMaxC: z.number().optional().nullable(),
  tempMediaC: z.number().optional().nullable(),
  precipitacionMm: z.number().min(0, 'La precipitación no puede ser negativa').optional().nullable(),
  humedadRelativaPct: z.number().min(0).max(100).optional().nullable(),
  vientoKmH: z.number().min(0).optional().nullable(),
  huboHelada: z.boolean().optional().nullable(),
  huboGranizo: z.boolean().optional().nullable(),
  fuenteDato: FuenteDatoClimaSchema.optional().nullable(),
  observaciones: z.string().trim().max(1000).optional().nullable(),
}).strict();

export const ImportarCsvClimaSchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  contenidoCsv: z.string().min(1, 'El contenido del archivo CSV es obligatorio (RF-M10-04)'),
  fuenteDatoPorDefecto: FuenteDatoClimaSchema.optional().nullable(),
}).strict();

export const ListarMedicionesClimaticasQuerySchema = z.object({
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido'),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  soloVigentes: z
    .union([z.boolean(), z.string().transform(v => v === 'true' || v === '1')])
    .optional(),
}).strict();

export const MedicionIdParamSchema = z.object({
  id: z.string().uuid('El ID de la medición debe ser un UUID válido'),
}).strict();
