import { PerfilUsuario, EstadoUsuario } from '../../core/domain/entities/usuario.entity.js';

export interface CrearUsuarioInputDto {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  perfil: PerfilUsuario;
  fincaIds?: string[];
}

export interface UsuarioOutputDto {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  perfil: PerfilUsuario;
  estado: EstadoUsuario;
  intentosFallidos: number;
  debeCambiarPassword: boolean;
  ultimoAcceso?: string | null;
  fincasAsignadas: string[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface LoginInputDto {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface LoginOutputDto {
  token: string;
  usuario: UsuarioOutputDto;
  expiraEnSegundos: number;
}

export interface ActualizarUsuarioInputDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  perfil?: PerfilUsuario;
  estado?: EstadoUsuario;
  fincaIds?: string[];
}

export interface CambiarPasswordInputDto {
  passwordActual?: string;
  passwordNueva: string;
}

export interface VerificarAccesoFincaInputDto {
  usuarioId: string;
  fincaId: string;
}

export interface VerificarAccesoFincaOutputDto {
  tieneAcceso: boolean;
  motivo?: string;
  esAdminGlobal: boolean;
  fincasAutorizadas: string[];
}
