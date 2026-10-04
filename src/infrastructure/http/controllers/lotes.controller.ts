import { FastifyReply, FastifyRequest } from 'fastify';
import { CrearLoteUseCase } from '../../../application/use-cases/crear-lote.use-case.js';
import { DividirLoteUseCase } from '../../../application/use-cases/dividir-lote.use-case.js';
import { LotesRepositoryPort } from '../../../core/ports/lotes-repository.port.js';
import { CrearLoteBodySchema, LoteIdParamSchema } from '../schemas/lotes.schema.js';
import { DividirLoteBodySchema } from '../schemas/split-lote.schema.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';

export class LotesController {
  constructor(
    private readonly crearLoteUseCase: CrearLoteUseCase,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly dividirLoteUseCase?: DividirLoteUseCase
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

  async dividir(req: FastifyRequest, reply: FastifyReply) {
    if (!this.dividirLoteUseCase) {
      throw new Error('DividirLoteUseCase no ha sido configurado en LotesController.');
    }

    const { id } = LoteIdParamSchema.parse(req.params);
    const body = DividirLoteBodySchema.parse(req.body);

    const resultado = await this.dividirLoteUseCase.execute({
      loteId: id,
      actorId: body.actorId,
      ubicacionId: body.ubicacionId,
      hijos: body.hijos,
      motivo: body.motivo,
      timestampCapturaLocal: body.timestampCapturaLocal,
    });

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}

