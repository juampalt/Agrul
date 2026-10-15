import { z } from 'zod';

export const CondicionesClimaSchema = z.object({
  vientoKmH: z.number().min(0, 'La velocidad del viento no puede ser negativa').optional().nullable(),
  tempC: z.number().optional().nullable(),
  lluviaMm: z.number().min(0, 'La precipitación no puede ser negativa').optional().nullable(),
  observaciones: z.string().trim().max(500).optional().nullable(),
}).strict();

export const LineaInsumoSchema = z.object({
  insumoId: z.string().uuid('El insumoId debe ser un UUID válido'),
  cantidadTotal: z.number().positive('La cantidad total consumida debe ser mayor a cero (RF-M4-04)'),
  unidadMedidaId: z.string().trim().min(1, 'La unidad de medida es obligatoria').max(30),
  dosisPorSuperficie: z.number().min(0, 'La dosis por superficie no puede ser negativa').optional().nullable(),
  dosisPorPlanta: z.number().min(0, 'La dosis por planta no puede ser negativa').optional().nullable(),
  concentracion: z.union([z.string().trim().max(100), z.number()]).optional().nullable(),
}).strict();

export const RecomendacionTecnicaSchema = z.object({
  agronomoEmisor: z.string().trim().min(2, 'El nombre del agrónomo emisor debe tener al menos 2 caracteres (RF-M4-08)').max(200),
  nroMatricula: z.string().trim().max(100).optional().nullable(),
  documentoUrl: z.string().trim().max(500).optional().nullable(),
  firmaDigital: z.string().trim().max(500).optional().nullable(),
  fechaEmision: z.string().trim().optional().nullable(),
  observaciones: z.string().trim().max(1000).optional().nullable(),
}).strict();

export const RegistrarAplicacionBodySchema = z.object({
  actividadId: z.string().uuid('El actividadId debe ser un UUID válido (RF-M4-03)'),
  loteId: z.string().uuid('El loteId debe ser un UUID válido (RF-M4-03 / RF-M4-05)'),
  cicloId: z.string().uuid('El cicloId debe ser un UUID válido (RF-M4-03 / RF-M4-05)'),
  fecha: z.string().trim().min(1, 'La fecha de aplicación es obligatoria'),
  responsableId: z.string().uuid('El responsableId debe ser un UUID válido').optional().nullable(),
  metodo: z.string().trim().min(1, 'El método de aplicación es obligatorio').max(50),
  motivo: z.string().trim().min(2, 'El motivo de aplicación es obligatorio').max(500),
  equipoAplicacion: z.string().trim().min(2, 'El equipo de aplicación utilizado es obligatorio (RF-M4-11)').max(200),
  condicionesClima: CondicionesClimaSchema.optional().nullable(),
  lineas: z.array(LineaInsumoSchema).min(1, 'La aplicación debe incluir al menos un insumo aplicado (RF-M4-06)'),
  recomendacionTecnica: RecomendacionTecnicaSchema.optional().nullable(), // RF-M4-08
}).strict();

export const ListarAplicacionesQuerySchema = z.object({
  loteId: z.string().uuid().optional(),
  cicloId: z.string().uuid().optional(),
  actividadId: z.string().uuid().optional(),
  insumoId: z.string().uuid().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
}).strict();

export const AplicacionIdParamSchema = z.object({
  id: z.string().uuid('El ID de la aplicación debe ser un UUID válido'),
}).strict();

export const VerificarCarenciaParamsSchema = z.object({
  id: z.string().uuid('El loteId debe ser un UUID válido'),
}).strict();

export const VerificarCarenciaQuerySchema = z.object({
  fecha: z.string().trim().optional(),
}).strict();

export const ConsumoInsumosCicloParamsSchema = z.object({
  id: z.string().uuid('El ID del ciclo productivo debe ser un UUID válido'),
}).strict();
