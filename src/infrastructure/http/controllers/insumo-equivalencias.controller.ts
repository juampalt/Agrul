import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarInsumoEquivalenciaUseCase,
  ListarEquivalenciasPorInsumoUseCase,
  ConvertirUnidadInsumoUseCase,
} from '../../../application/use-cases/insumo-equivalencias.use-cases.js';
import {
  RegistrarInsumoEquivalenciaBodySchema,
  ConvertirUnidadInsumoBodySchema,
  InsumoIdParamSchema,
} from '../schemas/insumo-equivalencias.schema.js';

export class InsumoEquivalenciasController {
  constructor(
    private readonly registrarEquivUseCase: RegistrarInsumoEquivalenciaUseCase,
    private readonly listarEquivUseCase: ListarEquivalenciasPorInsumoUseCase,
    private readonly convertirUseCase: ConvertirUnidadInsumoUseCase
  ) {}

  public async registrarEquivalencia(req: FastifyRequest, reply: FastifyReply) {
    const { id: insumoId } = InsumoIdParamSchema.parse(req.params);
    const body = RegistrarInsumoEquivalenciaBodySchema.parse(req.body);

    const result = await this.registrarEquivUseCase.execute({
      insumoId,
      ...body,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarEquivalencias(req: FastifyRequest, reply: FastifyReply) {
    const { id: insumoId } = InsumoIdParamSchema.parse(req.params);
    const result = await this.listarEquivUseCase.execute(insumoId);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async convertirUnidad(req: FastifyRequest, reply: FastifyReply) {
    const params = req.params as { id?: string } | undefined;
    const body = ConvertirUnidadInsumoBodySchema.parse(req.body);

    const insumoId = params?.id ?? body.insumoId;
    if (!insumoId) {
      return reply.status(400).send({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El identificador del insumo (insumoId) es requerido en la ruta o en el cuerpo.',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await this.convertirUseCase.execute({
      insumoId,
      cantidad: body.cantidad,
      unidadOrigen: body.unidadOrigen,
      unidadDestino: body.unidadDestino,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
