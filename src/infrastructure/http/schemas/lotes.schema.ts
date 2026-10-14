import { z } from 'zod';

export const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
}).strict();

export const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1),
}).strict();

export const GeoJSONGeometrySchema = z.union([GeoJSONPointSchema, GeoJSONPolygonSchema]);

export const CrearLoteBodySchema = z.object({
  codigoLote: z.string().trim().min(3).max(60).optional(),
  producto: z.string().trim().min(2).max(120),
  variedad: z.string().trim().max(100).optional().nullable(),
  cantidadInicial: z.number().positive('La cantidad inicial debe ser mayor a 0'),
  unidadMedida: z.string().trim().min(1).max(20),
  fincaId: z.string().uuid().optional().nullable(),
  superficieHa: z.number().positive('La superficie debe ser mayor a 0').optional().nullable(),
  geometria: GeoJSONGeometrySchema.optional().nullable(),
}).strict();

export const LoteIdParamSchema = z.object({
  id: z.string().uuid('El ID del lote debe ser un UUID válido'),
}).strict();

export const ListarLotesQuerySchema = z.object({
  estado: z.string().trim().optional(),
  fincaId: z.string().uuid().optional(),
  superficieMinHa: z.coerce.number().min(0).optional(),
  superficieMaxHa: z.coerce.number().min(0).optional(),
  producto: z.string().trim().optional(),
  limit: z.coerce.number().positive().optional(),
  offset: z.coerce.number().min(0).optional(),
}).strict();

export type CrearLoteBody = z.infer<typeof CrearLoteBodySchema>;
export type LoteIdParam = z.infer<typeof LoteIdParamSchema>;
export type ListarLotesQuery = z.infer<typeof ListarLotesQuerySchema>;
export type GeoJSONGeometryInput = z.infer<typeof GeoJSONGeometrySchema>;
