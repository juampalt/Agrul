import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { UsuarioFincasRepositoryPort } from '../../core/ports/usuario-fincas-repository.port.js';
import { SesionesRepositoryPort } from '../../core/ports/sesiones-repository.port.js';
import { CredencialesInvalidasError, PasswordCambioObligatorioError, PermisoInsuficienteError, UsuarioInactivoError, UsuarioBloqueadoError } from '../../core/domain/errors/domain.error.js';
import { CryptoAuthService, TokenPayload } from './crypto-auth.service.js';
import { SessionInactivityService } from './session-inactivity.service.js';
import { z } from 'zod';

export class ValidacionSesionService {
  constructor(private readonly usuarios: UsuariosRepositoryPort, private readonly fincas: UsuarioFincasRepositoryPort,
    private readonly sesiones: SesionesRepositoryPort, private readonly persistida: boolean) {}

  async validar(payload: TokenPayload, token: string): Promise<TokenPayload> {
    const hash = CryptoAuthService.hashToken(token);
    // Los fixtures de buildApp pueden firmar JWT directamente; producción siempre exige una sesión persistida.
    if (!this.persistida) {
      if (await this.sesiones.estaRevocada(hash)) throw new CredencialesInvalidasError('La sesión fue cerrada.');
      return payload;
    }
    if (!z.string().uuid().safeParse(payload.sub).success) throw new CredencialesInvalidasError();
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario) throw new CredencialesInvalidasError();
    if (usuario.estaBloqueado) throw new UsuarioBloqueadoError();
    if (!usuario.estaActivo) throw new UsuarioInactivoError();
    if (usuario.perfil !== payload.perfil) throw new PermisoInsuficienteError('Los permisos de la sesión cambiaron. Inicie sesión nuevamente.');
    if (usuario.debeCambiarPassword && !payload.debeCambiarPassword) throw new PasswordCambioObligatorioError();
    if (usuario.versionSesion !== (payload.versionSesion ?? 0)) throw new CredencialesInvalidasError('La sesión dejó de estar vigente.');
    if (!await this.sesiones.validar(hash, usuario.id, SessionInactivityService.getTimeoutMs())) {
      throw new CredencialesInvalidasError('La sesión fue cerrada o expiró.');
    }
    return { ...payload, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email,
      fincas: await this.fincas.obtenerFincasPorUsuario(usuario.id),
      debeCambiarPassword: usuario.debeCambiarPassword || payload.debeCambiarPassword };
  }
}
