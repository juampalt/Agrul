import { z } from 'zod';

export const RegistrarProveedorBodySchema = z.object({
  id: z.string().uuid().optional(),
  razonSocial: z.string().min(2, 'La razón social debe tener al menos 2 caracteres.'),
  cuit: z.string().trim().min(5).optional().nullable(),
  contacto: z.string().trim().optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().email('Formato de email inválido.').optional().nullable(),
  direccion: z.string().trim().optional().nullable(),
});

export const ActualizarProveedorBodySchema = z.object({
  razonSocial: z.string().min(2, 'La razón social debe tener al menos 2 caracteres.').optional(),
  cuit: z.string().trim().min(5).optional().nullable(),
  contacto: z.string().trim().optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().email('Formato de email inválido.').optional().nullable(),
  direccion: z.string().trim().optional().nullable(),
  activo: z.boolean().optional(),
});

export const ListarProveedoresQuerySchema = z.object({
  activo: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  busqueda: z.string().optional(),
});

export const ProveedorIdParamSchema = z.object({
  id: z.string().min(1, 'El identificador id del proveedor es obligatorio.'),
});
