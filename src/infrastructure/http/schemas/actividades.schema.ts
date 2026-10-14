import { z } from 'zod';

export const RegistrarActividadBodySchema = z.object({
  codigoActividad: z.string().trim().min(3).max(60).optional(),
  tipoActividadId: z.string().uuid('tipoActividadId debe ser un UUID válido'),
  loteId: z.string().uuid('loteId debe ser un UUID válido'),
  cicloId: z.string().uuid('cicloId debe ser un UUID válido'),
  fechaHecho: z.string().min(1, 'fechaHecho es obligatoria'),
  hora: z.string().trim().max(15).optional().nullable(),
  usuarioCargaId: z.string().uuid('usuarioCargaId debe ser un UUID válido'),
  trabajadorResponsableId: z.string().uuid('trabajadorResponsableId debe ser un UUID válido').optional().nullable(),
  superficieTrabajadaHa: z.number().positive('superficieTrabajadaHa debe ser mayor a 0').optional().nullable(),
  observaciones: z.string().trim().max(1000).optional().nullable(),
  maquinarias: z.array(
    z.object({
      maquinariaId: z.string().uuid('maquinariaId debe ser un UUID válido'),
      horasUso: z.number().positive('horasUso debe ser mayor a 0'),
    }).strict()
  ).optional(),
  manoDeObra: z.array(
    z.object({
      personalCuadrillaId: z.string().uuid('personalCuadrillaId debe ser un UUID válido'),
      cantidadPersonas: z.number().int().positive('cantidadPersonas debe ser entero positivo'),
      horasTrabajadas: z.number().positive('horasTrabajadas debe ser mayor a 0'),
      jornales: z.number().positive('jornales debe ser mayor a 0'),
    }).strict()
  ).optional(),
}).strict();

export const ListarActividadesQuerySchema = z.object({
  loteId: z.string().uuid().optional(),
  cicloId: z.string().uuid().optional(),
  tipoActividadId: z.string().uuid().optional(),
  estado: z.string().trim().optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
}).strict();

export const ActividadIdParamSchema = z.object({
  id: z.string().uuid('El ID de la actividad debe ser un UUID válido'),
}).strict();
