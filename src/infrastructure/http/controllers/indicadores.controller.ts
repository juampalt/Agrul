import { FastifyReply, FastifyRequest } from 'fastify';
import { CalcularMetricasProduccionUseCase } from '../../../application/use-cases/calcular-metricas-produccion.use-case.js';
import { CompararCampanasUseCase } from '../../../application/use-cases/comparar-campanas.use-case.js';
import {
  IndicadoresProduccionQuerySchema,
  IndicadoresCicloParamSchema,
  IndicadoresLoteParamSchema,
  ComparadorCampanasQuerySchema,
  EficienciaInsumosQuerySchema,
} from '../schemas/indicadores.schema.js';

export class IndicadoresController {
  constructor(
    private readonly calcularMetricasUseCase: CalcularMetricasProduccionUseCase,
    private readonly compararCampanasUseCase?: CompararCampanasUseCase,
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

  public async compararCampanas(req: FastifyRequest, reply: FastifyReply) {
    if (!this.compararCampanasUseCase) {
      return reply.status(500).send({
        success: false,
        error: { message: 'CompararCampanasUseCase no configurado' },
        timestamp: new Date().toISOString(),
      });
    }

    const query = ComparadorCampanasQuerySchema.parse(req.query ?? {});
    const data = await this.compararCampanasUseCase.comparar(query);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerEficienciaInsumos(req: FastifyRequest, reply: FastifyReply) {
    if (!this.compararCampanasUseCase) {
      return reply.status(500).send({
        success: false,
        error: { message: 'CompararCampanasUseCase no configurado' },
        timestamp: new Date().toISOString(),
      });
    }

    const params = req.params as { cicloId?: string };
    const query = req.query as { cicloId?: string };
    const cicloId = params?.cicloId ?? query?.cicloId;

    const validated = EficienciaInsumosQuerySchema.parse({ cicloId });
    const data = await this.compararCampanasUseCase.obtenerEficienciaInsumos(validated.cicloId);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}

