import { z } from 'zod';

export const PerfilUsuarioEnum = z.enum([
  'ADMINISTRADOR',
  'ENCARGADO',
  'OPERARIO',
  'ASESOR_AGRONOMO',
]);

export const EstadoUsuarioEnum = z.enum([
  'ACTIVO',
  'INACTIVO',
  'BLOQUEADO',
]);

export const CrearUsuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio.').max(100),
  apellido: z.string().min(1, 'El apellido es obligatorio.').max(100),
  email: z.string().email('Formato de email inválido.').max(150),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres (RNF-04).'),
  perfil: PerfilUsuarioEnum,
  fincaIds: z.array(z.string().trim()).optional(),
}).strict();

export const LoginSchema = z.object({
  email: z.string().email('Formato de email inválido.').max(150),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
}).strict();

export const ActualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150).optional(),
  perfil: PerfilUsuarioEnum.optional(),
  estado: EstadoUsuarioEnum.optional(),
  fincaIds: z.array(z.string().trim()).optional(),
}).strict();

export const CambiarPasswordSchema = z.object({
  passwordActual: z.string().optional(),
  passwordNueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres (RNF-04).'),
}).strict();

export const AsignarFincasSchema = z.object({
  fincaIds: z.array(z.string().trim()),
}).strict();

export const ListarUsuariosQuerySchema = z.object({
  perfil: PerfilUsuarioEnum.optional(),
  estado: EstadoUsuarioEnum.optional(),
  busqueda: z.string().trim().optional(),
});

export const UsuarioIdParamSchema = z.object({
  id: z.string().trim().min(1, 'El identificador de usuario es obligatorio.'),
});

export const FincaIdParamSchema = z.object({
  id: z.string().trim().min(1, 'El identificador de finca es obligatorio.'),
});
