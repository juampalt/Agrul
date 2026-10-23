import { z } from 'zod';

export const sugerirFefoSchema = {
  params: z.object({
    insumoId: z.string().min(1, 'El identificador del insumo es requerido.'),
  }),
  querystring: z.object({
    depositoId: z.string().optional(),
    cantidadRequerida: z.coerce.number().positive('La cantidad requerida debe ser un número positivo.').optional(),
    fechaReferencia: z.string().optional(),
  }),
};

export const validarLoteSchema = {
  body: z.object({
    insumoId: z.string().min(1, 'El identificador del insumo es requerido.'),
    loteFabricacion: z.string().min(1, 'El lote de fabricación es requerido.'),
    fechaReferencia: z.string().optional(),
  }),
};

export const registrarInventarioFisicoSchema = {
  body: z.object({
    insumoId: z.string().min(1, 'El identificador del insumo es obligatorio.'),
    depositoId: z.string().min(1, 'El identificador del depósito es obligatorio.'),
    loteFabricacion: z.string().optional().nullable(),
    cantidadFisica: z.number().min(0, 'La cantidad física no puede ser negativa.'),
    unidadMedida: z.string().min(1, 'La unidad de medida es requerida.'),
    motivo: z.string().min(3, 'El motivo o justificación del conteo es obligatorio (RF-M9-11).'),
    usuarioId: z.string().min(1, 'El identificador de usuario es obligatorio.'),
    claveIdempotencia: z.string().min(1, 'La clave de idempotencia es requerida (RN-11 / RF-M9-06).'),
    fecha: z.string().optional(),
  }),
};

export const listarInventariosFisicosSchema = {
  querystring: z.object({
    insumoId: z.string().optional(),
    depositoId: z.string().optional(),
    loteFabricacion: z.string().optional(),
    usuarioId: z.string().optional(),
    desde: z.string().optional(),
    hasta: z.string().optional(),
  }),
};

export const registrarPerdidaSchema = {
  body: z.object({
    insumoId: z.string().min(1, 'El identificador del insumo es obligatorio.'),
    depositoId: z.string().min(1, 'El identificador del depósito es obligatorio.'),
    loteFabricacion: z.string().optional().nullable(),
    cantidad: z.number().positive('La cantidad de pérdida debe ser mayor a 0 (RN-10).'),
    unidadMedida: z.string().min(1, 'La unidad de medida es requerida.'),
    tipoPerdida: z.enum(['ROBO', 'DERRAME', 'ROTURA', 'VENCIMIENTO', 'DETERIORO', 'OTRO']),
    motivo: z.string().min(3, 'El motivo o causa de la pérdida es obligatorio (RF-M9-12).'),
    usuarioId: z.string().min(1, 'El identificador de usuario es obligatorio.'),
    claveIdempotencia: z.string().min(1, 'La clave de idempotencia es requerida (RN-11 / RF-M9-06).'),
    fecha: z.string().optional(),
  }),
};

export const reporteExistenciasValorizadasSchema = {
  querystring: z.object({
    depositoId: z.string().optional(),
    categoria: z.string().optional(),
    insumoId: z.string().optional(),
  }),
};
