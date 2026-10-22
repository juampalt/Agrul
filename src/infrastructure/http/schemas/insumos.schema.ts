import { z } from 'zod';

export const FichaFitosanitariaSchema = z.object({
  principioActivo: z.string().trim().min(2, 'El principio activo debe tener al menos 2 caracteres').max(250),
  periodoCarenciaDias: z.number().int('El período de carencia en días debe ser un número entero').min(0, 'El período de carencia no puede ser negativo'),
  periodoReingresoHoras: z.number().int('El período de reingreso en horas debe ser un número entero').min(0, 'El período de reingreso no puede ser negativo'),
  nroRegistroSenasa: z.string().trim().min(1, 'El número de registro SENASA es obligatorio').max(100),
  toxicologia: z.string().trim().max(100).optional().nullable(),
}).strict();

export const RegistrarInsumoBodySchema = z.object({
  nombreComercial: z.string().trim().min(2, 'El nombre comercial debe tener al menos 2 caracteres').max(200),
  categoria: z.enum(['SEMILLA_PLANTIN', 'FERTILIZANTE', 'FITOSANITARIO', 'ENMIENDA', 'OTRO']),
  unidadMedidaId: z.string().trim().min(1, 'La unidad de medida es obligatoria').max(30),
  presentacion: z.string().trim().min(1, 'La presentación comercial es obligatoria').max(150),
  activo: z.boolean().optional(),
  stockMinimoConfigurable: z.number().min(0, 'El stock mínimo no puede ser negativo').optional().nullable(),
  fichaFitosanitaria: FichaFitosanitariaSchema.optional().nullable(),
}).strict().superRefine((data, ctx) => {
  if (data.categoria === 'FITOSANITARIO' && !data.fichaFitosanitaria) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La ficha fitosanitaria técnica es obligatoria para insumos de categoría FITOSANITARIO (RN-14).',
      path: ['fichaFitosanitaria'],
    });
  }
});

export const ConfigurarStockMinimoBodySchema = z.object({
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').nullable(),
}).strict();

export const ListarInsumosQuerySchema = z.object({
  categoria: z.enum(['SEMILLA_PLANTIN', 'FERTILIZANTE', 'FITOSANITARIO', 'ENMIENDA', 'OTRO']).optional(),
  activo: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
}).strict();

export const InsumoIdParamSchema = z.object({
  id: z.string().uuid('El ID del insumo debe ser un UUID válido'),
}).strict();
