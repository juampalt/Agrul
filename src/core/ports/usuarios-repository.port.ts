import { Usuario, PerfilUsuario, EstadoUsuario } from '../domain/entities/usuario.entity.js';

export interface FiltrosUsuarios {
  perfil?: PerfilUsuario;
  estado?: EstadoUsuario;
  busqueda?: string;
  nombre?: string;
  apellido?: string;
  nombreUsuario?: string;
  email?: string;
}

export interface UsuariosRepositoryPort {
  guardar(usuario: Usuario): Promise<void>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorNombreUsuario(nombreUsuario: string): Promise<Usuario | null>;
  listar(filtros?: FiltrosUsuarios): Promise<Usuario[]>;
  actualizar(usuario: Usuario): Promise<void>;
}
