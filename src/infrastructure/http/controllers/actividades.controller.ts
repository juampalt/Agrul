import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarActividadEjecutadaUseCase,
  ObtenerActividadPorIdUseCase,
  ListarActividadesUseCase,
  AnularActividadUseCase,
} from '../../../application/use-cases/actividades-agricolas.use-cases.js';
import {
  RegistrarActividadBodySchema,
  ListarActividadesQuerySchema,
  ActividadIdParamSchema,
  AnularActividadBodySchema,
} from '../schemas/actividades.schema.js';

export class ActividadesController {
  constructor(
    private readonly registrarActividadUseCase: RegistrarActividadEjecutadaUseCase,
    private readonly obtenerActividadUseCase: ObtenerActividadPorIdUseCase,
    private readonly listarActividadesUseCase: ListarActividadesUseCase,
    private readonly anularActividadUseCase?: AnularActividadUseCase,
  ) {}

  public async anularActividad(req: FastifyRequest, reply: FastifyReply) {
    const { id } = ActividadIdParamSchema.parse(req.params);
    const body = AnularActividadBodySchema.parse(req.body);

    if (!this.anularActividadUseCase) {
      throw new Error('AnularActividadUseCase no inyectado en ActividadesController.');
    }

    const result = await this.anularActividadUseCase.execute({
      id,
      motivo: body.motivo,
      usuarioId: body.usuarioId ?? 'usr-sistema-audit',
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async registrarActividad(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarActividadBodySchema.parse(req.body);
    const result = await this.registrarActividadUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerActividadPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = ActividadIdParamSchema.parse(req.params);
    const result = await this.obtenerActividadUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarActividades(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarActividadesQuerySchema.parse(req.query ?? {});
    const result = await this.listarActividadesUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
