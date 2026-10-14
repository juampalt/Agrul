import { z } from 'zod';

// --- Helper para booleanos en query strings ---
const BooleanQuerySchema = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return undefined;
}, z.boolean().optional());

// --- Tipos de Actividad ---
export const CrearTipoActividadBodySchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  categoria: z.enum([
    'SUELO',
    'SIEMBRA',
    'RIEGO',
    'NUTRICION',
    'SANIDAD',
    'MANEJO',
    'COSECHA',
    'MANTENIMIENTO',
    'OTRO',
  ]).optional(),
  descripcion: z.string().trim().max(500).optional().nullable(),
  requiereMaquinaria: z.boolean().optional(),
  requiereInsumos: z.boolean().optional(),
  activo: z.boolean().optional(),
}).strict();

export const ListarTiposActividadQuerySchema = z.object({
  activo: BooleanQuerySchema,
  categoria: z.string().trim().optional(),
  nombre: z.string().trim().optional(),
}).strict();

// --- Personal y Cuadrillas ---
export const CrearPersonalBodySchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  tipo: z.enum(['INDIVIDUAL', 'CUADRILLA']).optional(),
  dniOIdentificacion: z.string().trim().max(50).optional().nullable(),
  usuarioId: z.string().uuid('El ID de usuario debe ser un UUID válido').optional().nullable(),
  telefono: z.string().trim().max(50).optional().nullable(),
  activo: z.boolean().optional(),
}).strict();

export const ListarPersonalQuerySchema = z.object({
  activo: BooleanQuerySchema,
  tipo: z.enum(['INDIVIDUAL', 'CUADRILLA']).optional(),
  nombre: z.string().trim().optional(),
}).strict();

// --- Maquinaria Agrícola ---
export const CrearMaquinariaBodySchema = z.object({
  identificacion: z.string().trim().min(2, 'La identificación debe tener al menos 2 caracteres').max(120),
  tipo: z.enum([
    'TRACTOR',
    'PULVERIZADORA',
    'ATOMIZADORA',
    'COSECHADORA',
    'DESMALEZADORA',
    'MOTOCULTIVADOR',
    'HERRAMIENTA_MANUAL',
    'VEHICULO_CARGA',
    'OTRO',
  ]).optional(),
  condicion: z.enum(['PROPIO', 'ALQUILADO', 'SERVICIO_CONTRATADO']).optional(),
  marcaModelo: z.string().trim().max(120).optional().nullable(),
  activo: z.boolean().optional(),
}).strict();

export const ListarMaquinariaQuerySchema = z.object({
  activo: BooleanQuerySchema,
  condicion: z.enum(['PROPIO', 'ALQUILADO', 'SERVICIO_CONTRATADO']).optional(),
  tipo: z.string().trim().optional(),
  identificacion: z.string().trim().optional(),
}).strict();

export const CatalogoIdParamSchema = z.object({
  id: z.string().uuid('El identificador debe ser un UUID válido'),
}).strict();

export type CrearTipoActividadBody = z.infer<typeof CrearTipoActividadBodySchema>;
export type ListarTiposActividadQuery = z.infer<typeof ListarTiposActividadQuerySchema>;
export type CrearPersonalBody = z.infer<typeof CrearPersonalBodySchema>;
export type ListarPersonalQuery = z.infer<typeof ListarPersonalQuerySchema>;
export type CrearMaquinariaBody = z.infer<typeof CrearMaquinariaBodySchema>;
export type ListarMaquinariaQuery = z.infer<typeof ListarMaquinariaQuerySchema>;
export type CatalogoIdParam = z.infer<typeof CatalogoIdParamSchema>;
