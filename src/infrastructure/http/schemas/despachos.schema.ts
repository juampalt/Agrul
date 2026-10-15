import { z } from 'zod';

export const CrearDestinatarioBodySchema = z.object({
  nombre: z.string().min(1, 'El nombre o razón social es obligatorio'),
  tipo: z.enum(['MERCADO_FRESCO', 'INDUSTRIA', 'EXPORTACION', 'VENTA_DIRECTA', 'EMPAQUE', 'OTRO']),
  cuit: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

export const ListarDestinatariosQuerySchema = z.object({
  activo: z.enum(['true', 'false']).optional(),
  tipo: z.string().optional(),
  search: z.string().optional(),
});

export const RegistrarDespachoBodySchema = z.object({
  cosechaId: z.string().uuid('cosechaId debe ser un UUID válido').optional(),
  destinatarioId: z.string().uuid('destinatarioId debe ser un UUID válido'),
  tipoDestino: z.enum(['MERCADO_FRESCO', 'INDUSTRIA', 'EXPORTACION', 'VENTA_DIRECTA', 'EMPAQUE', 'OTRO']),
  cantidadEnviadaKg: z.number().positive('La cantidad enviada debe ser mayor a 0'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  nroGuiaRemito: z.string().min(1, 'El número de guía o remito es obligatorio (RF-M5-10)'),
  renspaFinca: z.string().min(1, 'El RENSPA de la finca es obligatorio para cumplimiento BPA (RF-M5-10)'),
  productor: z.string().min(1, 'El productor es obligatorio para cumplimiento BPA (RF-M5-10)'),
  precinto: z.string().optional(),
  chofer: z.string().optional(),
  patenteCamion: z.string().optional(),
  temperaturaTransporteC: z.number().optional(),
  observaciones: z.string().optional(),
});

export const RegistrarDespachoParaCosechaBodySchema = z.object({
  destinatarioId: z.string().uuid('destinatarioId debe ser un UUID válido'),
  tipoDestino: z.enum(['MERCADO_FRESCO', 'INDUSTRIA', 'EXPORTACION', 'VENTA_DIRECTA', 'EMPAQUE', 'OTRO']),
  cantidadEnviadaKg: z.number().positive('La cantidad enviada debe ser mayor a 0'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  nroGuiaRemito: z.string().min(1, 'El número de guía o remito es obligatorio (RF-M5-10)'),
  renspaFinca: z.string().min(1, 'El RENSPA de la finca es obligatorio para cumplimiento BPA (RF-M5-10)'),
  productor: z.string().min(1, 'El productor es obligatorio para cumplimiento BPA (RF-M5-10)'),
  precinto: z.string().optional(),
  chofer: z.string().optional(),
  patenteCamion: z.string().optional(),
  temperaturaTransporteC: z.number().optional(),
  observaciones: z.string().optional(),
});

export const CosechaIdParamSchema = z.object({
  id: z.string().uuid('El ID de cosecha debe ser un UUID válido'),
});

export const DespachoIdParamSchema = z.object({
  id: z.string().uuid('El ID de despacho debe ser un UUID válido'),
});

export const DestinatarioIdParamSchema = z.object({
  id: z.string().uuid('El ID de destinatario debe ser un UUID válido'),
});

export const ListarDespachosQuerySchema = z.object({
  cosechaId: z.string().uuid().optional(),
  destinatarioId: z.string().uuid().optional(),
  tipoDestino: z.string().optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
