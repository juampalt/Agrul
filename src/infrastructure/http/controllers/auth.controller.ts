import { FastifyReply, FastifyRequest } from 'fastify';
import {
  AutenticarUsuarioUseCase,
  ObtenerUsuarioPorIdUseCase,
  CambiarPasswordUseCase,
} from '../../../application/use-cases/usuarios.use-cases.js';
import {
  LoginSchema,
  CambiarPasswordSchema,
} from '../schemas/usuarios.schema.js';
import { CerrarSesionUseCase } from '../../../application/use-cases/cerrar-sesion.use-case.js';
import { SessionInactivityService } from '../../services/session-inactivity.service.js';
import { z } from 'zod';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';

export class AuthController {
  constructor(
    private readonly autenticarUsuarioUC: AutenticarUsuarioUseCase,
    private readonly obtenerUsuarioPorIdUC: ObtenerUsuarioPorIdUseCase,
    private readonly cambiarPasswordUC: CambiarPasswordUseCase,
    private readonly cerrarSesionUC: CerrarSesionUseCase,
  ) {}

  async login(req: FastifyRequest, reply: FastifyReply) {
    const body = LoginSchema.parse(req.body);
    const resultado = await this.autenticarUsuarioUC.execute({
      ...body,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    reply.header('Cache-Control', 'no-store');
    reply.header('Pragma', 'no-cache');

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async me(req: FastifyRequest, reply: FastifyReply) {
    reply.header('Cache-Control', 'no-store');
    const usuarioId = req.usuario?.sub;
    if (!usuarioId) {
      return reply.status(401).send({
        success: false,
        data: null,
        error: {
          code: 'NO_AUTENTICADO',
          message: 'No existe sesión activa para consultar.',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const usuario = await this.obtenerUsuarioPorIdUC.execute(usuarioId);

    return reply.status(200).send({
      success: true,
      data: {
        usuario,
        sesion: req.usuario,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async cambiarPassword(req: FastifyRequest, reply: FastifyReply) {
    const usuarioId = req.usuario?.sub;
    if (!usuarioId) {
      return reply.status(401).send({
        success: false,
        data: null,
        error: {
          code: 'NO_AUTENTICADO',
          message: 'Debe iniciar sesión para cambiar la contraseña.',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const body = CambiarPasswordSchema.parse(req.body);
    await this.cambiarPasswordUC.execute(usuarioId, body);

    return reply.status(200).send({
      success: true,
      data: {
        mensaje: 'Contraseña actualizada exitosamente (RNF-04).',
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async logout(req: FastifyRequest, reply: FastifyReply) {
    z.object({}).strict().parse(req.body ?? {});
    const token = req.headers.authorization?.substring(7).trim();
    if (!req.usuario || !token) throw new CredencialesInvalidasError();
    await this.cerrarSesionUC.execute(token, req.usuario);
    SessionInactivityService.cerrarSesion(req.usuario.jti ? `${req.usuario.sub}:${req.usuario.jti}` : req.usuario.sub);
    reply.header('Cache-Control', 'no-store');
    return reply.send({ success: true, data: { mensaje: 'Sesión cerrada.' }, error: null, timestamp: new Date().toISOString() });
  }
}
