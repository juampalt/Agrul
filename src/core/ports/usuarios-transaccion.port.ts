import { UsuariosRepositoryPort } from './usuarios-repository.port.js';
import { UsuarioFincasRepositoryPort } from './usuario-fincas-repository.port.js';
import { AuditoriaSeguridadRepositoryPort } from './auditoria-seguridad-repository.port.js';

export interface UsuariosTransaccionContext {
  usuariosRepo: UsuariosRepositoryPort;
  usuarioFincasRepo: UsuarioFincasRepositoryPort;
  auditoriaRepo: AuditoriaSeguridadRepositoryPort;
}

export interface UsuariosTransaccionPort {
  ejecutar<T>(usuarioIds: string[], trabajo: (repos: UsuariosTransaccionContext) => Promise<T>): Promise<T>;
}
