import { z } from 'zod';

export const RegistrarInsumoEquivalenciaBodySchema = z.object({
  id: z.string().uuid().optional(),
  unidadCompra: z.string().min(1, 'La unidad de compra es obligatoria (RF-M9-01).'),
  unidadConsumo: z.string().min(1, 'La unidad de consumo es obligatoria (RF-M9-01).'),
  factorMultiplicador: z.number().positive('El factor multiplicador debe ser un número positivo mayor a 0.'),
  densidadKgL: z.number().positive('La densidad (kg/L) debe ser mayor a 0.').optional().nullable(),
});

export const ConvertirUnidadInsumoBodySchema = z.object({
  insumoId: z.string().optional(),
  cantidad: z.number({ required_error: 'La cantidad a convertir es obligatoria.' }),
  unidadOrigen: z.string().min(1, 'La unidad de origen es obligatoria.'),
  unidadDestino: z.string().min(1, 'La unidad de destino es obligatoria.'),
});

export const InsumoIdParamSchema = z.object({
  id: z.string().min(1, 'El identificador id del insumo es obligatorio.'),
});
