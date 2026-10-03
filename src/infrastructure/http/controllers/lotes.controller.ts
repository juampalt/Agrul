import { FastifyReply, FastifyRequest } from 'fastify';
import { CrearLoteUseCase } from '../../../application/use-cases/crear-lote.use-case.js';
import { LotesRepositoryPort } from '../../../core/ports/lotes-repository.port.js';
import { CrearLoteBodySchema, LoteIdParamSchema } from '../schemas/lotes.schema.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';

export class LotesController {
  constructor(
    private readonly crearLoteUseCase: CrearLoteUseCase,
    private readonly lotesRepo: LotesRepositoryPort
  ) {}

  async crear(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearLoteBodySchema.parse(req.body);
    const resultado = await this.crearLoteUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const lote = await this.lotesRepo.buscarPorId(id);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', id);
    }

    return reply.status(200).send({
      success: true,
      data: lote.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
