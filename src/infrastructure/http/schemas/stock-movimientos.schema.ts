import { z } from 'zod';

export const RegistrarMovimientoStockBodySchema = z.object({
  insumoId: z.string().min(1, 'El identificador del insumo es obligatorio.'),
  depositoId: z.string().min(1, 'El identificador del depósito es obligatorio.'),
  loteFabricacion: z.string().optional().nullable(),
  tipoMovimiento: z.enum([
    'SALDO_INICIAL',
    'INGRESO_COMPRA',
    'SALIDA_CONSUMO',
    'DEVOLUCION',
    'PERDIDA',
    'AJUSTE_FISICO',
    'REVERSION',
  ]),
  cantidad: z.number().positive('La cantidad debe ser un número positivo mayor a 0 (RN-10).'),
  unidadMedida: z.string().min(1, 'La unidad de medida es requerida.'),
  fecha: z.string().optional(),
  usuarioId: z.string().optional().nullable(),
  referenciaTipo: z.string().optional().nullable(),
  referenciaId: z.string().optional().nullable(),
  claveIdempotencia: z.string().min(1, 'La clave de idempotencia es obligatoria (RN-11 / RF-M9-06).'),
  motivoJustificacion: z.string().optional().nullable(),
  esEnvaseAbierto: z.boolean().optional(),
});

export const RevertirMovimientoStockBodySchema = z.object({
  usuarioId: z.string().optional().nullable(),
  motivo: z.string().min(1, 'El motivo de reversión es obligatorio (RF-M9-07).'),
  claveIdempotencia: z.string().min(1, 'La clave de idempotencia es obligatoria para la reversión.'),
});

export const AjustarMovimientoAplicacionBodySchema = z.object({
  nuevaCantidad: z.number().positive('La nueva cantidad ajustada debe ser mayor a 0.'),
  usuarioId: z.string().optional().nullable(),
  claveIdempotencia: z.string().min(1, 'La clave de idempotencia es obligatoria.'),
  motivoJustificacion: z.string().optional().nullable(),
});

export const ListarMovimientosStockQuerySchema = z.object({
  insumoId: z.string().optional(),
  depositoId: z.string().optional(),
  tipoMovimiento: z.string().optional(),
  referenciaTipo: z.string().optional(),
  referenciaId: z.string().optional(),
  loteFabricacion: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});
