import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarCosechaUseCase,
  ListarCosechasUseCase,
  ObtenerCosechaPorIdUseCase,
} from '../../../application/use-cases/cosechas.use-cases.js';
import {
  RegistrarCosechaBodySchema,
  ListarCosechasQuerySchema,
  CosechaIdParamSchema,
} from '../schemas/cosechas.schema.js';

export class CosechasController {
  constructor(
    private readonly registrarCosechaUseCase: RegistrarCosechaUseCase,
    private readonly listarCosechasUseCase: ListarCosechasUseCase,
    private readonly obtenerCosechaUseCase: ObtenerCosechaPorIdUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarCosechaBodySchema.parse(req.body);
    const result = await this.registrarCosechaUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
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
}
