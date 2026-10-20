import { z } from 'zod';

export const RegistrarIngresoCompraBodySchema = z.object({
  id: z.string().optional(),
  insumoId: z.string().min(1, 'El identificador del insumo es obligatorio.'),
  proveedorId: z.string().min(1, 'El identificador del proveedor es obligatorio (RF-M9-03).'),
  depositoId: z.string().min(1, 'El identificador del depósito es obligatorio.'),
  cantidad: z.number().positive('La cantidad ingresada debe ser un valor numérico positivo mayor a 0.'),
  unidadMedida: z.string().min(1, 'La unidad de medida es requerida.'),
  loteFabricacion: z.string().min(1, 'El lote de fabricación es obligatorio (RF-M9-03).'),
  fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es obligatoria (RF-M9-03).'),
  nroFacturaRemito: z.string().min(1, 'El número de factura o remito es obligatorio (RF-M9-03).'),
  fechaIngreso: z.string().optional(),
  precioUnitarioCompra: z.number().positive().optional().nullable(),
  comprobanteAdjuntoUrl: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  usuarioCargaId: z.string().optional().nullable(),
});

export const CargarStockInicialBodySchema = z.object({
  id: z.string().optional(),
  insumoId: z.string().min(1, 'El identificador del insumo es obligatorio.'),
  depositoId: z.string().min(1, 'El identificador del depósito es obligatorio.'),
  cantidad: z.number().positive('La cantidad inicial debe ser mayor a 0 (RF-M9-05).'),
  unidadMedida: z.string().min(1, 'La unidad de medida es obligatoria.'),
  loteFabricacion: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  usuarioCargaId: z.string().optional(),
  fecha: z.string().optional(),
});

export const ListarIngresosCompraQuerySchema = z.object({
  insumoId: z.string().optional(),
  proveedorId: z.string().optional(),
  depositoId: z.string().optional(),
  loteFabricacion: z.string().optional(),
});
