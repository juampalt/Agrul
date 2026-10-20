import { FastifyReply, FastifyRequest } from 'fastify';
import { CalcularMetricasProduccionUseCase } from '../../../application/use-cases/calcular-metricas-produccion.use-case.js';
import {
  IndicadoresProduccionQuerySchema,
  IndicadoresCicloParamSchema,
  IndicadoresLoteParamSchema,
} from '../schemas/indicadores.schema.js';

export class IndicadoresController {
  constructor(
    private readonly calcularMetricasUseCase: CalcularMetricasProduccionUseCase,
  ) {}

  public async obtenerMetricasProduccion(req: FastifyRequest, reply: FastifyReply) {
    const query = IndicadoresProduccionQuerySchema.parse(req.query ?? {});
    const data = await this.calcularMetricasUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerIndicadoresCiclo(req: FastifyRequest, reply: FastifyReply) {
    const { cicloId } = IndicadoresCicloParamSchema.parse(req.params);
    const data = await this.calcularMetricasUseCase.obtenerIndicadoresCiclo(cicloId);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerIndicadoresLote(req: FastifyRequest, reply: FastifyReply) {
    const { loteId } = IndicadoresLoteParamSchema.parse(req.params);
    const data = await this.calcularMetricasUseCase.obtenerIndicadoresLote(loteId);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
