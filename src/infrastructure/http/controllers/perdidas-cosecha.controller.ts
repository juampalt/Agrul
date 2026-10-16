import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarPerdidaCosechaUseCase,
  ListarPerdidasCosechaUseCase,
  ObtenerPerdidaCosechaPorIdUseCase,
} from '../../../application/use-cases/perdidas-cosecha.use-cases.js';
import {
  RegistrarPerdidaCosechaBodySchema,
  ListarPerdidasCosechaQuerySchema,
  PerdidaIdParamSchema,
} from '../schemas/perdidas-cosecha.schema.js';
import { CosechaIdParamSchema } from '../schemas/cosechas.schema.js';

export class PerdidasCosechaController {
  constructor(
    private readonly registrarPerdidaUseCase: RegistrarPerdidaCosechaUseCase,
    private readonly listarPerdidasUseCase: ListarPerdidasCosechaUseCase,
    private readonly obtenerPerdidaUseCase: ObtenerPerdidaCosechaPorIdUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarPerdidaCosechaBodySchema.parse(req.body);

    // Si viene en el path :id (ej. /cosechas/:id/perdidas), asociamos cosechaId
    const params = req.params as Record<string, string> | undefined;
    const cosechaIdFromPath = params?.id ? CosechaIdParamSchema.parse({ id: params.id }).id : undefined;

    const result = await this.registrarPerdidaUseCase.execute({
      ...body,
      cosechaId: cosechaIdFromPath ?? body.cosechaId,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarPerdidasCosechaQuerySchema.parse(req.query ?? {});

    const params = req.params as Record<string, string> | undefined;
    const cosechaIdFromPath = params?.id ? CosechaIdParamSchema.parse({ id: params.id }).id : undefined;

    const result = await this.listarPerdidasUseCase.execute({
      ...query,
      cosechaId: cosechaIdFromPath ?? query.cosechaId,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = PerdidaIdParamSchema.parse(req.params);
    const result = await this.obtenerPerdidaUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
