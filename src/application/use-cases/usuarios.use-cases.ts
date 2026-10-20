import crypto from 'node:crypto';
import { Usuario, PerfilUsuario, EstadoUsuario } from '../../core/domain/entities/usuario.entity.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { UsuarioFincasRepositoryPort } from '../../core/ports/usuario-fincas-repository.port.js';
import { CryptoAuthService } from '../../infrastructure/services/crypto-auth.service.js';
import {
  EntidadNoEncontradaError,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
  UsuarioDuplicadoError,
  AccesoDenegadoFincaError,
} from '../../core/domain/errors/domain.error.js';
import {
  CrearUsuarioInputDto,
  UsuarioOutputDto,
  LoginInputDto,
  LoginOutputDto,
  ActualizarUsuarioInputDto,
  CambiarPasswordInputDto,
  VerificarAccesoFincaInputDto,
  VerificarAccesoFincaOutputDto,
} from '../dtos/usuarios.dto.js';

export interface UsuariosUseCasesDependencies {
  usuariosRepo: UsuariosRepositoryPort;
  usuarioFincasRepo: UsuarioFincasRepositoryPort;
}

export function mapUsuarioToOutput(usuario: Usuario, fincas: string[] = []): UsuarioOutputDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombreCompleto: usuario.nombreCompleto,
    email: usuario.email,
    perfil: usuario.perfil,
    estado: usuario.estado,
    intentosFallidos: usuario.intentosFallidos,
    ultimoAcceso: usuario.ultimoAcceso,
    fincasAsignadas: fincas,
    creadoEn: usuario.creadoEn,
    actualizadoEn: usuario.actualizadoEn,
  };
}

export class CrearUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(input: CrearUsuarioInputDto): Promise<UsuarioOutputDto> {
    const existente = await this.usuariosRepo.buscarPorEmail(input.email);
    if (existente) {
      throw new UsuarioDuplicadoError(input.email);
    }

    const { hash, salt } = CryptoAuthService.hashPassword(input.password);
    const id = crypto.randomUUID();

    const usuario = Usuario.crear({
      id,
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
      passwordHash: hash,
      salt,
      perfil: input.perfil,
      estado: 'ACTIVO',
    });

    await this.usuariosRepo.guardar(usuario);

    const fincasAsignadas = input.fincaIds ?? [];
    if (fincasAsignadas.length > 0) {
      await this.usuarioFincasRepo.asignarFincas(id, fincasAsignadas);
    }

    return mapUsuarioToOutput(usuario, fincasAsignadas);
  }
}

export class AutenticarUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(input: LoginInputDto): Promise<LoginOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorEmail(input.email);
    if (!usuario) {
      throw new CredencialesInvalidasError();
    }

    if (usuario.estaBloqueado) {
      throw new UsuarioBloqueadoError(
        'La cuenta se encuentra bloqueada por exceder los intentos fallidos permitidos. Contacte a un administrador (RF-M8-03).'
      );
    }

    if (!usuario.estaActivo) {
      throw new UsuarioInactivoError();
    }

    const passwordValida = CryptoAuthService.verifyPassword(
      input.password,
      usuario.passwordHash,
      usuario.salt
    );

    if (!passwordValida) {
      const { bloqueado, intentosActuales } = usuario.registrarIntentoFallido(Usuario.MAX_INTENTOS_FALLIDOS);
      await this.usuariosRepo.actualizar(usuario);

      if (bloqueado) {
        throw new UsuarioBloqueadoError(
          'Se ha bloqueado la cuenta tras 5 intentos fallidos consecutivos de inicio de sesión (RF-M8-03).'
        );
      }

      const restantes = Usuario.MAX_INTENTOS_FALLIDOS - intentosActuales;
      throw new CredencialesInvalidasError(
        `Email o contraseña incorrectos. Le quedan ${restantes} intento(s) antes del bloqueo de la cuenta.`
      );
    }

    // Acceso exitoso: reseteo de contador y actualización de último acceso
    usuario.registrarAccesoExitoso();
    await this.usuariosRepo.actualizar(usuario);

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(usuario.id);

    const token = CryptoAuthService.generateToken({
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      perfil: usuario.perfil,
      fincas,
    });

    return {
      token,
      usuario: mapUsuarioToOutput(usuario, fincas),
      expiraEnSegundos: 86400,
    };
  }
}

export class ListarUsuariosUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(filtros?: { perfil?: PerfilUsuario; estado?: EstadoUsuario; busqueda?: string }): Promise<UsuarioOutputDto[]> {
    const usuarios = await this.usuariosRepo.listar(filtros);
    const resultado: UsuarioOutputDto[] = [];

    for (const u of usuarios) {
      const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(u.id);
      resultado.push(mapUsuarioToOutput(u, fincas));
    }

    return resultado;
  }
}

export class ObtenerUsuarioPorIdUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(id: string): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(usuario.id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class ActualizarUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(id: string, input: ActualizarUsuarioInputDto): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    if (input.email && input.email.trim().toLowerCase() !== usuario.email) {
      const existente = await this.usuariosRepo.buscarPorEmail(input.email);
      if (existente && existente.id !== id) {
        throw new UsuarioDuplicadoError(input.email);
      }
    }

    usuario.actualizarDatos({
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
    });

    if (input.perfil) {
      usuario.actualizarPerfil(input.perfil);
    }

    if (input.estado) {
      if (input.estado === 'ACTIVO') usuario.activar();
      else if (input.estado === 'INACTIVO') usuario.desactivar();
      else if (input.estado === 'BLOQUEADO') usuario.bloquear();
    }

    await this.usuariosRepo.actualizar(usuario);

    if (input.fincaIds !== undefined) {
      await this.usuarioFincasRepo.reemplazarFincas(id, input.fincaIds);
    }

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class BloquearUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(id: string, motivo?: string): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    usuario.bloquear(motivo);
    await this.usuariosRepo.actualizar(usuario);

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class DesbloquearUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(id: string): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    usuario.desbloquear();
    await this.usuariosRepo.actualizar(usuario);

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class CambiarPasswordUseCase {
  constructor(private readonly usuariosRepo: UsuariosRepositoryPort) {}

  async execute(id: string, input: CambiarPasswordInputDto): Promise<void> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    if (input.passwordActual !== undefined) {
      const actualValida = CryptoAuthService.verifyPassword(
        input.passwordActual,
        usuario.passwordHash,
        usuario.salt
      );
      if (!actualValida) {
        throw new CredencialesInvalidasError('La contraseña actual proporcionada es incorrecta.');
      }
    }

    const { hash, salt } = CryptoAuthService.hashPassword(input.passwordNueva);
    usuario.cambiarPassword(hash, salt);
    await this.usuariosRepo.actualizar(usuario);
  }
}

export class VerificarAccesoFincaUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
  ) {}

  async execute(input: VerificarAccesoFincaInputDto): Promise<VerificarAccesoFincaOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', input.usuarioId);
    }

    if (!usuario.estaActivo || usuario.estaBloqueado) {
      return {
        tieneAcceso: false,
        motivo: 'El usuario se encuentra inactivo o bloqueado en el sistema.',
        esAdminGlobal: false,
        fincasAutorizadas: [],
      };
    }

    // Regla de Negocio (RF-M8-04 / RN-16): Administrador tiene acceso transversal global a todas las fincas
    if (usuario.perfil === 'ADMINISTRADOR') {
      return {
        tieneAcceso: true,
        esAdminGlobal: true,
        fincasAutorizadas: ['*'],
      };
    }

    // Para los demás perfiles (ENCARGADO, OPERARIO, ASESOR_AGRONOMO): validación estricta por fincas asignadas (RF-M8-05 / RN-16)
    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(usuario.id);
    const tieneAcceso = fincas.includes(input.fincaId);

    if (!tieneAcceso) {
      return {
        tieneAcceso: false,
        motivo: `El usuario con perfil ${usuario.perfil} no está asignado a la finca '${input.fincaId}' (RF-M8-05 / RN-16).`,
        esAdminGlobal: false,
        fincasAutorizadas: fincas,
      };
    }

    return {
      tieneAcceso: true,
      esAdminGlobal: false,
      fincasAutorizadas: fincas,
    };
  }
}
