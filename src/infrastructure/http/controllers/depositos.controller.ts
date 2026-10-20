import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CrearDepositoUseCase,
  ListarDepositosUseCase,
  ObtenerDepositoPorIdUseCase,
} from '../../../application/use-cases/depositos.use-cases.js';
import {
  CrearDepositoBodySchema,
  ListarDepositosQuerySchema,
  DepositoIdParamSchema,
} from '../schemas/depositos.schema.js';

export class DepositosController {
  constructor(
    private readonly crearUseCase: CrearDepositoUseCase,
    private readonly listarUseCase: ListarDepositosUseCase,
    private readonly obtenerPorIdUseCase: ObtenerDepositoPorIdUseCase
  ) {}

  public async crear(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearDepositoBodySchema.parse(req.body);
    const result = await this.crearUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarDepositosQuerySchema.parse(req.query ?? {});
    const result = await this.listarUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = DepositoIdParamSchema.parse(req.params);
    const result = await this.obtenerPorIdUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
