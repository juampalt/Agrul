import { FastifyReply, FastifyRequest } from 'fastify';
import { ObtenerRecorridoTrazabilidadUseCase } from '../../../application/use-cases/recorrido-trazabilidad.use-case.js';
import { RecorridoTrazabilidadParamSchema } from '../schemas/recorrido-trazabilidad.schema.js';

export class TrazabilidadController {
  constructor(private readonly obtenerRecorridoUseCase: ObtenerRecorridoTrazabilidadUseCase) {}

  public async obtenerRecorrido(req: FastifyRequest, reply: FastifyReply) {
    const { identificador } = RecorridoTrazabilidadParamSchema.parse(req.params);
    const resultado = await this.obtenerRecorridoUseCase.execute({ identificador });

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
