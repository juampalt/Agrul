import crypto from 'node:crypto';
import { PERFILES_CANONICOS, Usuario, UsuarioInvalidoError } from '../../core/domain/entities/usuario.entity.js';
import { AuditoriaSeguridadLog, AccionAuditoria } from '../../core/domain/entities/auditoria-seguridad-log.entity.js';
import { mismaVersion } from '../../core/domain/services/version-concurrencia.js';
import { ConflictoModificacionError, EntidadNoEncontradaError, PasswordCambioObligatorioError, PermisoInsuficienteError, UsuarioDuplicadoError } from '../../core/domain/errors/domain.error.js';
import { UsuariosTransaccionContext, UsuariosTransaccionPort } from '../../core/ports/usuarios-transaccion.port.js';
import { ActualizarUsuarioInputDto, UsuarioOutputDto } from '../dtos/usuarios.dto.js';
import { mapUsuarioToOutput } from './usuarios.use-cases.js';

/** CU62 / confirmarModificacionUsuario: cambio e historial dentro de la misma transacción. */
export class ModificarUsuarioUseCase {
  constructor(private readonly repos: UsuariosTransaccionContext, private readonly transaccion?: UsuariosTransaccionPort) {}

  execute(id: string, input: ActualizarUsuarioInputDto, responsableId: string | undefined, versionEsperada?: string): Promise<UsuarioOutputDto> {
    return this.modificar(id, input, responsableId, 'EDITAR', undefined, versionEsperada);
  }
  bloquear(id: string, responsableId: string | undefined, motivo?: string): Promise<UsuarioOutputDto> {
    return this.modificar(id, { estado: 'BLOQUEADO' }, responsableId, 'BLOQUEO', motivo);
  }
  desbloquear(id: string, responsableId: string | undefined): Promise<UsuarioOutputDto> {
    return this.modificar(id, { estado: 'ACTIVO' }, responsableId, 'DESBLOQUEO');
  }

  private async modificar(id: string, input: ActualizarUsuarioInputDto, responsableId: string | undefined,
    accion: AccionAuditoria, motivo?: string, versionEsperada?: string): Promise<UsuarioOutputDto> {
    if (!responsableId) throw new PermisoInsuficienteError();
    if (this.transaccion) {
      return this.transaccion.ejecutar([responsableId, id], repos =>
        new ModificarUsuarioUseCase(repos).modificar(id, input, responsableId, accion, motivo, versionEsperada));
    }
    const { usuariosRepo, usuarioFincasRepo, auditoriaRepo } = this.repos;
    const responsable = await usuariosRepo.buscarPorId(responsableId);
    if (!responsable?.estaActivo || responsable.perfil !== 'ADMIN_SISTEMA') throw new PermisoInsuficienteError();
    if (responsable.debeCambiarPassword) throw new PasswordCambioObligatorioError();
    const original = await usuariosRepo.buscarPorId(id);
    if (!original) throw new EntidadNoEncontradaError('Usuario', id);
    // CU62: no se sobrescribe una cuenta modificada desde la lectura del administrador.
    if (versionEsperada && !mismaVersion(versionEsperada, original.actualizadoEn)) throw new ConflictoModificacionError();
    // Una entidad separada evita alterar el objeto del repositorio antes de validar la operación.
    const usuario = Usuario.reconstituir({ ...original.toJSON(), passwordHash: original.passwordHash, salt: original.salt });
    const fincasPrevias = await usuarioFincasRepo.obtenerFincasPorUsuario(id);
    const previo = this.snapshot(original, fincasPrevias);
    if (input.perfil !== undefined && !PERFILES_CANONICOS.some(perfil => perfil === input.perfil)) {
      throw new UsuarioInvalidoError('La modificación de perfil requiere un perfil canónico.');
    }
    usuario.actualizarDatos(input);
    if (input.perfil) usuario.actualizarPerfil(input.perfil);
    if (input.estado === 'BLOQUEADO') usuario.bloquear();
    if (input.estado === 'INACTIVO') usuario.desactivar();
    if (input.estado === 'ACTIVO') {
      if (original.estaBloqueado || accion === 'DESBLOQUEO') usuario.desbloquear();
      else usuario.activar();
    }
    const fincasPropuestas = input.fincaIds ?? fincasPrevias;
    if (JSON.stringify(previo) === JSON.stringify(this.snapshot(usuario, fincasPropuestas))) {
      return mapUsuarioToOutput(original, fincasPrevias);
    }
    const porCorreo = await usuariosRepo.buscarPorEmail(usuario.email);
    if (porCorreo && porCorreo.id !== id) throw new UsuarioDuplicadoError(usuario.email);
    if (usuario.nombreUsuario) {
      const porNombre = await usuariosRepo.buscarPorNombreUsuario(usuario.nombreUsuario);
      if (porNombre && porNombre.id !== id) throw new UsuarioDuplicadoError(usuario.nombreUsuario, 'nombre de usuario');
    }
    await usuariosRepo.actualizar(usuario);
    if (input.fincaIds !== undefined) await usuarioFincasRepo.reemplazarFincas(id, input.fincaIds);
    const fincas = await usuarioFincasRepo.obtenerFincasPorUsuario(id);
    await auditoriaRepo.registrar(AuditoriaSeguridadLog.crear({
      id: crypto.randomUUID(), usuarioId: responsable.id, usuarioEmail: responsable.email,
      accion, entidad: 'USUARIO', entidadId: id, valorPrevioJson: previo,
      valorNuevoJson: { ...this.snapshot(usuario, fincas), ...(motivo ? { motivo } : {}) },
    }));
    return mapUsuarioToOutput(usuario, fincas);
  }

  private snapshot(usuario: Usuario, fincas: string[]): Record<string, unknown> {
    return { nombre: usuario.nombre, apellido: usuario.apellido, nombreUsuario: usuario.nombreUsuario ?? null,
      email: usuario.email, perfil: usuario.perfil, estado: usuario.estado, intentosFallidos: usuario.intentosFallidos,
      bloqueadoHasta: usuario.bloqueadoHasta ?? null, fincas: [...new Set(fincas)].sort() };
  }
}
