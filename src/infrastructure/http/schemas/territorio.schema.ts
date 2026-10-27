import { z } from 'zod';

const CamposFincaSchema = z.object({
  nombre: z.string().trim().min(2).max(150),
  provincia: z.string().trim().min(2).max(120),
  departamento: z.string().trim().min(2).max(120),
  localidad: z.string().trim().min(2).max(120),
  superficieTotalHa: z.number().positive(),
  propietario: z.string().trim().max(150).optional().nullable(),
  telefono: z.string().trim().max(50).optional().nullable(),
  observaciones: z.string().trim().max(2000).optional().nullable(),
});

export const ModificarFincaUnicaBodySchema = CamposFincaSchema.strict();

const CamposLoteSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  superficieHa: z.number().positive(),
  ubicacionSector: z.string().trim().max(150).optional().nullable(),
  tipoSuelo: z.string().trim().max(100).optional().nullable(),
  sistemaRiego: z.string().trim().max(100).optional().nullable(),
  estado: z.enum(['DISPONIBLE', 'EN_PRODUCCION']).optional(),
});

export const RegistrarLoteTerritorialBodySchema = CamposLoteSchema.extend({
  fincaId: z.string().uuid().optional(),
  codigo: z.string().trim().min(3).max(60),
  fechaRegistro: z.string().date().optional(),
}).strict();

export const ModificarLoteTerritorialBodySchema = CamposLoteSchema.strict();

export const LoteTerritorialIdParamSchema = z.object({ id: z.string().uuid() }).strict();

export const ConsultarLotesTerritorialesQuerySchema = z.object({
  codigo: z.string().trim().optional(),
  nombre: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  estado: z.enum(['DISPONIBLE', 'EN_PRODUCCION', 'INACTIVO']).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).strict();
