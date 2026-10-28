import { FastifyRequest, FastifyReply } from 'fastify';
import { ConsultarAuditoriaSeguraUseCase } from '../../../application/use-cases/consultar-auditoria-segura.use-case.js';
import {
  ConsultarAuditoriaQuerySchema,
  AuditoriaIdParamSchema,
  SimularInactividadBodySchema,
} from '../schemas/auditoria.schema.js';
import { SessionInactivityService } from '../../services/session-inactivity.service.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';

export class AuditoriaController {
  constructor(
    private readonly consultarAuditoriaUseCase: ConsultarAuditoriaSeguraUseCase,
  ) {}

  public async listar(request: FastifyRequest, reply: FastifyReply) {
    const query = ConsultarAuditoriaQuerySchema.parse(request.query);
    const resultado = await this.consultarAuditoriaUseCase.execute(query, request.usuario?.sub);
    reply.header('Cache-Control', 'no-store');

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(request: FastifyRequest, reply: FastifyReply) {
    const params = AuditoriaIdParamSchema.parse(request.params);
    const log = await this.consultarAuditoriaUseCase.obtener(params.id, request.usuario?.sub);
    reply.header('Cache-Control', 'no-store');

    if (!log) {
      throw new EntidadNoEncontradaError('AuditoriaSeguridadLog', params.id);
    }

    return reply.status(200).send({
      success: true,
      data: log,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async simularInactividad(request: FastifyRequest, reply: FastifyReply) {
    const body = SimularInactividadBodySchema.parse(request.body ?? {});

    if (body.timeoutMs !== undefined) {
      SessionInactivityService.setTimeoutMs(body.timeoutMs);
    }

    const usuarioId = body.usuarioId ?? request.usuario?.sub;
    if (usuarioId && body.simularSegundosInactividad !== undefined) {
      // Retrasar el timestamp de actividad para simular tiempo inactivo
      const tiempoPasadoMs = Date.now() - body.simularSegundosInactividad * 1000;
      SessionInactivityService.registrarActividad(usuarioId, tiempoPasadoMs);
    }

    return reply.status(200).send({
      success: true,
      data: {
        timeoutMs: SessionInactivityService.getTimeoutMs(),
        usuarioId: usuarioId ?? null,
        ultimaActividad: usuarioId ? SessionInactivityService.obtenerUltimaActividad(usuarioId) : null,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
