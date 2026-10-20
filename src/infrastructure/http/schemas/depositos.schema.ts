import { z } from 'zod';

export const CrearDepositoBodySchema = z.object({
  id: z.string().uuid().optional(),
  fincaId: z.string().uuid('El fincaId debe ser un UUID válido.'),
  nombre: z.string().min(2, 'El nombre del depósito debe tener al menos 2 caracteres.'),
  tipoPermitido: z.enum(
    ['FITOSANITARIOS', 'FERTILIZANTES', 'INSUMOS_GENERALES', 'ZONA_VENCIDOS'],
    {
      errorMap: () => ({
        message:
          "El tipo permitido debe ser 'FITOSANITARIOS', 'FERTILIZANTES', 'INSUMOS_GENERALES' o 'ZONA_VENCIDOS'.",
      }),
    }
  ),
  ubicacionFisica: z.string().trim().optional().nullable(),
  capacidadMaxima: z.number().positive().optional().nullable(),
});

export const ListarDepositosQuerySchema = z.object({
  fincaId: z.string().uuid().optional(),
  tipoPermitido: z
    .enum(['FITOSANITARIOS', 'FERTILIZANTES', 'INSUMOS_GENERALES', 'ZONA_VENCIDOS'])
    .optional(),
  activo: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

export const DepositoIdParamSchema = z.object({
  id: z.string().min(1, 'El identificador id del depósito es obligatorio.'),
});
