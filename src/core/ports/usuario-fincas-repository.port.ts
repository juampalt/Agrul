import { UsuarioFinca } from '../domain/entities/usuario-finca.entity.js';

export interface UsuarioFincasRepositoryPort {
  asignarFincas(usuarioId: string, fincaIds: string[]): Promise<void>;
  obtenerFincasPorUsuario(usuarioId: string): Promise<string[]>;
  obtenerUsuariosPorFinca(fincaId: string): Promise<string[]>;
  desasignarFinca(usuarioId: string, fincaId: string): Promise<void>;
  reemplazarFincas(usuarioId: string, fincaIds: string[]): Promise<void>;
  listarTodas(): Promise<UsuarioFinca[]>;
}
