import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarAplicacionUseCase,
  ListarAplicacionesUseCase,
  ObtenerAplicacionPorIdUseCase,
} from '../../../application/use-cases/aplicaciones.use-cases.js';
import {
  RegistrarAplicacionBodySchema,
  ListarAplicacionesQuerySchema,
  AplicacionIdParamSchema,
} from '../schemas/aplicaciones.schema.js';

export class AplicacionesController {
  constructor(
    private readonly registrarAplicacionUseCase: RegistrarAplicacionUseCase,
    private readonly listarAplicacionesUseCase: ListarAplicacionesUseCase,
    private readonly obtenerAplicacionUseCase: ObtenerAplicacionPorIdUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarAplicacionBodySchema.parse(req.body);
    const result = await this.registrarAplicacionUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarAplicacionesQuerySchema.parse(req.query ?? {});
    const result = await this.listarAplicacionesUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = AplicacionIdParamSchema.parse(req.params);
    const result = await this.obtenerAplicacionUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
