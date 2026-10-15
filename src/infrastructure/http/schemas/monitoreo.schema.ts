import { z } from 'zod';

export const RegistrarObservacionBodySchema = z.object({
  loteId: z.string().uuid('loteId debe ser un UUID válido'),
  cicloId: z.string().uuid('cicloId debe ser un UUID válido'),
  fecha: z.string().min(1, 'fecha es obligatoria'),
  sintomas: z.string().trim().min(3, 'sintomas debe tener al menos 3 caracteres').max(2000),
  plagas: z.string().trim().max(500).optional().nullable(),
  estadoCultivo: z.string().trim().max(100).optional(),
  fotosUrls: z.array(z.string().url('Cada foto debe ser una URL válida')).optional(),
  usuarioId: z.string().uuid('usuarioId debe ser un UUID válido'),
}).strict();

export const ListarObservacionesQuerySchema = z.object({
  loteId: z.string().uuid().optional(),
  cicloId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
}).strict();

export const ObservacionIdParamSchema = z.object({
  id: z.string().uuid('El ID de la observación debe ser un UUID válido'),
}).strict();
