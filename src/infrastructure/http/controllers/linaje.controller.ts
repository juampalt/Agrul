import { FastifyReply, FastifyRequest } from 'fastify';
import { ObtenerLinajeUseCase } from '../../../application/use-cases/obtener-linaje.use-case.js';
import { LoteIdParamSchema } from '../schemas/lotes.schema.js';

export class LinajeController {
  constructor(private readonly obtenerLinajeUseCase: ObtenerLinajeUseCase) {}

  async obtenerLinaje(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const arbol = await this.obtenerLinajeUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: arbol,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
