import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarCosechaUseCase,
  RegistrarCosechaRapidaUseCase,
  ListarCosechasUseCase,
  ObtenerCosechaPorIdUseCase,
  AnularCosechaUseCase,
  ModificarCosechaUseCase,
} from '../../../application/use-cases/cosechas.use-cases.js';
import {
  RegistrarCosechaBodySchema,
  RegistrarCosechaRapidaBodySchema,
  ListarCosechasQuerySchema,
  CosechaIdParamSchema,
  AnularCosechaBodySchema,
  ModificarCosechaBodySchema,
} from '../schemas/cosechas.schema.js';

export class CosechasController {
  constructor(
    private readonly registrarCosechaUseCase: RegistrarCosechaUseCase,
    private readonly listarCosechasUseCase: ListarCosechasUseCase,
    private readonly obtenerCosechaUseCase: ObtenerCosechaPorIdUseCase,
    private readonly anularCosechaUseCase?: AnularCosechaUseCase,
    private readonly modificarCosechaUseCase?: ModificarCosechaUseCase,
    private readonly registrarCosechaRapidaUseCase?: RegistrarCosechaRapidaUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarCosechaBodySchema.parse(req.body);
    const result = await this.registrarCosechaUseCase.execute(body);

    const responsePayload: any = {
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    };

    if (result.alertaCarencia && result.alertaCarencia.totalAlertasCarencia > 0) {
      responsePayload.meta = {
        advertenciaCarencia: true,
        alertas: result.alertaCarencia.advertencias,
        advertencias: result.alertaCarencia.advertencias,
      };
    }

    return reply.status(201).send(responsePayload);
  }

  public async registrarRapida(req: FastifyRequest, reply: FastifyReply) {
    if (!this.registrarCosechaRapidaUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Caso de uso de cosecha rápida no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const body = RegistrarCosechaRapidaBodySchema.parse(req.body);
    const result = await this.registrarCosechaRapidaUseCase.execute(body);

    const responsePayload: any = {
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    };

    if (result.alertaCarencia && result.alertaCarencia.totalAlertasCarencia > 0) {
      responsePayload.meta = {
        advertenciaCarencia: true,
        alertas: result.alertaCarencia.advertencias,
        advertencias: result.alertaCarencia.advertencias,
      };
    }

    return reply.status(201).send(responsePayload);
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarCosechasQuerySchema.parse(req.query ?? {});
    const result = await this.listarCosechasUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = CosechaIdParamSchema.parse(req.params);
    const result = await this.obtenerCosechaUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async anular(req: FastifyRequest, reply: FastifyReply) {
    if (!this.anularCosechaUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Caso de uso de anulación no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = CosechaIdParamSchema.parse(req.params);
    const body = AnularCosechaBodySchema.parse(req.body);
    const result = await this.anularCosechaUseCase.execute({
      cosechaId: id,
      usuarioId: body.usuarioId,
      motivo: body.motivo,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async modificar(req: FastifyRequest, reply: FastifyReply) {
    if (!this.modificarCosechaUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Caso de uso de modificación no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = CosechaIdParamSchema.parse(req.params);
    const body = ModificarCosechaBodySchema.parse(req.body);
    const result = await this.modificarCosechaUseCase.execute({
      cosechaId: id,
      ...body,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
