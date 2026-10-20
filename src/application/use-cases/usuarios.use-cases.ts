import crypto from 'node:crypto';
import { Usuario, PerfilUsuario, EstadoUsuario } from '../../core/domain/entities/usuario.entity.js';
import { AuditoriaSeguridadLog } from '../../core/domain/entities/auditoria-seguridad-log.entity.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { UsuarioFincasRepositoryPort } from '../../core/ports/usuario-fincas-repository.port.js';
import { AuditoriaSeguridadRepositoryPort } from '../../core/ports/auditoria-seguridad-repository.port.js';
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
  auditoriaRepo?: AuditoriaSeguridadRepositoryPort;
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
    debeCambiarPassword: usuario.debeCambiarPassword,
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
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
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
      debeCambiarPassword: true,
    });

    await this.usuariosRepo.guardar(usuario);

    const fincasAsignadas = input.fincaIds ?? [];
    if (fincasAsignadas.length > 0) {
      await this.usuarioFincasRepo.asignarFincas(id, fincasAsignadas);
    }

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'CREAR',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: null,
          valorNuevoJson: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            perfil: usuario.perfil,
            fincas: fincasAsignadas,
            debeCambiarPassword: usuario.debeCambiarPassword,
          },
        })
      );
    }

    return mapUsuarioToOutput(usuario, fincasAsignadas);
  }
}

export class AutenticarUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
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
        if (this.auditoriaRepo) {
          await this.auditoriaRepo.registrar(
            AuditoriaSeguridadLog.crear({
              id: crypto.randomUUID(),
              usuarioId: usuario.id,
              usuarioEmail: usuario.email,
              accion: 'BLOQUEO',
              entidad: 'USUARIO',
              entidadId: usuario.id,
              valorPrevioJson: { estado: 'ACTIVO', intentosFallidos: Usuario.MAX_INTENTOS_FALLIDOS - 1 },
              valorNuevoJson: { estado: 'BLOQUEADO', intentosFallidos: Usuario.MAX_INTENTOS_FALLIDOS },
              ip: input.ip,
              userAgent: input.userAgent,
            })
          );
        }

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
      debeCambiarPassword: usuario.debeCambiarPassword,
    });

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'LOGIN',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: null,
          valorNuevoJson: { debeCambiarPassword: usuario.debeCambiarPassword },
          ip: input.ip,
          userAgent: input.userAgent,
        })
      );
    }

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
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
  ) {}

  async execute(id: string, input: ActualizarUsuarioInputDto): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    const valorPrevio = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      perfil: usuario.perfil,
      estado: usuario.estado,
    };

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

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'EDITAR',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: valorPrevio,
          valorNuevoJson: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            perfil: usuario.perfil,
            estado: usuario.estado,
            fincas,
          },
        })
      );
    }

    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class BloquearUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
  ) {}

  async execute(id: string, motivo?: string): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    const estadoPrevio = usuario.estado;
    usuario.bloquear(motivo);
    await this.usuariosRepo.actualizar(usuario);

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'BLOQUEO',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: { estado: estadoPrevio },
          valorNuevoJson: { estado: 'BLOQUEADO', motivo: motivo ?? 'Decisión administrativa' },
        })
      );
    }

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class DesbloquearUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly usuarioFincasRepo: UsuarioFincasRepositoryPort,
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
  ) {}

  async execute(id: string): Promise<UsuarioOutputDto> {
    const usuario = await this.usuariosRepo.buscarPorId(id);
    if (!usuario) {
      throw new EntidadNoEncontradaError('Usuario', id);
    }

    const estadoPrevio = usuario.estado;
    usuario.desbloquear();
    await this.usuariosRepo.actualizar(usuario);

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'DESBLOQUEO',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: { estado: estadoPrevio },
          valorNuevoJson: { estado: 'ACTIVO' },
        })
      );
    }

    const fincas = await this.usuarioFincasRepo.obtenerFincasPorUsuario(id);
    return mapUsuarioToOutput(usuario, fincas);
  }
}

export class CambiarPasswordUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly auditoriaRepo?: AuditoriaSeguridadRepositoryPort,
  ) {}

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

    const previoDebeCambiar = usuario.debeCambiarPassword;
    const { hash, salt } = CryptoAuthService.hashPassword(input.passwordNueva);
    usuario.cambiarPassword(hash, salt);
    await this.usuariosRepo.actualizar(usuario);

    if (this.auditoriaRepo) {
      await this.auditoriaRepo.registrar(
        AuditoriaSeguridadLog.crear({
          id: crypto.randomUUID(),
          usuarioId: usuario.id,
          usuarioEmail: usuario.email,
          accion: 'CAMBIO_PASSWORD',
          entidad: 'USUARIO',
          entidadId: usuario.id,
          valorPrevioJson: { debeCambiarPassword: previoDebeCambiar },
          valorNuevoJson: { debeCambiarPassword: false },
        })
      );
    }
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
