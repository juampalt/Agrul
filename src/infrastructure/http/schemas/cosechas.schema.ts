import { z } from 'zod';

export const RecipienteSchema = z.object({
  tipo: z.string().trim().min(1, 'El tipo de recipiente es obligatorio').max(50),
  cantidad: z.number().int().positive('La cantidad de recipientes debe ser un entero positivo'),
}).strict();

export const RegistrarCosechaBodySchema = z.object({
  loteId: z.string().uuid('El loteId debe ser un UUID válido (RF-M5-01)'),
  cicloId: z.string().uuid('El cicloId debe ser un UUID válido (RF-M5-01)'),
  fecha: z.string().trim().min(1, 'La fecha de cosecha es obligatoria (RF-M5-01)'),
  cantidadCosechadaKg: z.number().positive('La cantidad total cosechada debe ser mayor a cero (RF-M5-01)'),
  cantidadComercializableKg: z.number().min(0, 'La cantidad comercializable no puede ser negativa (RF-M5-01)'),
  cantidadDescarteKg: z.number().min(0, 'La cantidad de descarte no puede ser negativa (RF-M5-02)'),
  motivoDescarte: z.string().trim().max(200).optional().nullable(),
  observacionesCalidad: z.string().trim().max(1000).optional().nullable(),
  responsableId: z.string().uuid('El responsableId debe ser un UUID válido').optional().nullable(),
  cuadrillaId: z.string().uuid('El cuadrillaId debe ser un UUID válido').optional().nullable(),
  recipientes: z.array(RecipienteSchema).optional().nullable(),
  superficieCosechadaHa: z.number().positive('La superficie cosechada debe ser un valor positivo').optional().nullable(),
}).strict();

export const RegistrarCosechaRapidaBodySchema = z.object({
  loteId: z.string().trim().min(1, 'El identificador o código de lote es obligatorio (RF-M5-13)'),
  cantidadCosechadaKg: z.number().positive('La cantidad total cosechada debe ser mayor a cero (RF-M5-13)'),
  cantidadComercializableKg: z.number().min(0, 'La cantidad comercializable no puede ser negativa (RF-M5-13)'),
  fecha: z.string().trim().optional(),
  cicloId: z.string().uuid('El cicloId debe ser un UUID válido').optional(),
  cantidadDescarteKg: z.number().min(0).optional(),
  motivoDescarte: z.string().trim().max(200).optional().nullable(),
  observacionesCalidad: z.string().trim().max(1000).optional().nullable(),
  responsableId: z.string().uuid('El responsableId debe ser un UUID válido').optional().nullable(),
  cuadrillaId: z.string().uuid('El cuadrillaId debe ser un UUID válido').optional().nullable(),
  recipientes: z.array(RecipienteSchema).optional().nullable(),
  superficieCosechadaHa: z.number().positive('La superficie cosechada debe ser un valor positivo').optional().nullable(),
}).strict();

export const ListarCosechasQuerySchema = z.object({
  loteId: z.string().uuid().optional(),
  cicloId: z.string().uuid().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  estado: z.enum(['ACTIVA', 'ANULADA']).optional(),
}).strict();

export const CosechaIdParamSchema = z.object({
  id: z.string().uuid('El ID de la cosecha debe ser un UUID válido'),
}).strict();

export const AnularCosechaBodySchema = z.object({
  usuarioId: z.string().uuid('El ID del usuario que anula debe ser un UUID válido (RF-M5-12)'),
  motivo: z.string().trim().min(1, 'El motivo de anulación es obligatorio (RN-05)'),
}).strict();

export const ModificarCosechaBodySchema = z.object({
  usuarioId: z.string().uuid('El ID del usuario que modifica debe ser un UUID válido (RF-M5-12)'),
  motivo: z.string().trim().min(1, 'El motivo de modificación es obligatorio (RN-05)'),
  cantidadCosechadaKg: z.number().positive('La cantidad total cosechada debe ser mayor a cero').optional(),
  cantidadComercializableKg: z.number().min(0, 'La cantidad comercializable no puede ser negativa').optional(),
  cantidadDescarteKg: z.number().min(0, 'La cantidad de descarte no puede ser negativa').optional(),
  motivoDescarte: z.string().trim().max(200).optional().nullable(),
  observacionesCalidad: z.string().trim().max(1000).optional().nullable(),
  responsableId: z.string().uuid('El responsableId debe ser un UUID válido').optional().nullable(),
  cuadrillaId: z.string().uuid('El cuadrillaId debe ser un UUID válido').optional().nullable(),
  recipientes: z.array(RecipienteSchema).optional().nullable(),
  superficieCosechadaHa: z.number().positive('La superficie cosechada debe ser un valor positivo').optional().nullable(),
}).strict();
