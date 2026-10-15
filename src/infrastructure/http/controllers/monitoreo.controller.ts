import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarObservacionMonitoreoUseCase,
  ListarObservacionesMonitoreoUseCase,
  ObtenerObservacionMonitoreoPorIdUseCase,
} from '../../../application/use-cases/monitoreo.use-cases.js';
import {
  RegistrarObservacionBodySchema,
  ListarObservacionesQuerySchema,
  ObservacionIdParamSchema,
} from '../schemas/monitoreo.schema.js';

export class MonitoreoController {
  constructor(
    private readonly registrarObservacionUseCase: RegistrarObservacionMonitoreoUseCase,
    private readonly listarObservacionesUseCase: ListarObservacionesMonitoreoUseCase,
    private readonly obtenerObservacionUseCase: ObtenerObservacionMonitoreoPorIdUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarObservacionBodySchema.parse(req.body);
    const result = await this.registrarObservacionUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarObservacionesQuerySchema.parse(req.query ?? {});
    const result = await this.listarObservacionesUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = ObservacionIdParamSchema.parse(req.params);
    const result = await this.obtenerObservacionUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
