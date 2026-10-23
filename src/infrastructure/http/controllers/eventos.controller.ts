import { FastifyReply, FastifyRequest } from 'fastify';
import { RegistrarEventoUseCase } from '../../../application/use-cases/registrar-evento.use-case.js';
import { SincronizarEventosOfflineUseCase } from '../../../application/use-cases/sincronizar-eventos-offline.use-case.js';
import { EventosRepositoryPort } from '../../../core/ports/eventos-repository.port.js';
import { RegistrarEventoBodySchema } from '../schemas/eventos.schema.js';
import { LoteIdParamSchema } from '../schemas/lotes.schema.js';
import { SincronizarBatchOfflineSchema } from '../schemas/sincronizacion.schema.js';

export class EventosController {
  private readonly sincronizarOfflineUseCase: SincronizarEventosOfflineUseCase;

  constructor(
    private readonly registrarEventoUseCase: RegistrarEventoUseCase,
    private readonly eventosRepo: EventosRepositoryPort,
    sincronizarOfflineUseCase?: SincronizarEventosOfflineUseCase,
  ) {
    this.sincronizarOfflineUseCase =
      sincronizarOfflineUseCase ?? new SincronizarEventosOfflineUseCase(this.eventosRepo);
  }

  async registrar(req: FastifyRequest, reply: FastifyReply) {
    const { id: loteId } = LoteIdParamSchema.parse(req.params);
    const body = RegistrarEventoBodySchema.parse(req.body);

    const resultado = await this.registrarEventoUseCase.execute({
      loteId,
      actorId: body.actorId,
      ubicacionId: body.ubicacionId,
      tipoEvento: body.tipoEvento,
      timestampCapturaLocal: body.timestampCapturaLocal,
      payloadEspecifico: body.payloadEspecifico,
      eventoReferenciadoId: body.eventoReferenciadoId ?? null,
    });

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarPorLote(req: FastifyRequest, reply: FastifyReply) {
    const { id: loteId } = LoteIdParamSchema.parse(req.params);
    const eventos = await this.eventosRepo.listarPorLote(loteId);

    return reply.status(200).send({
      success: true,
      data: {
        total: eventos.length,
        items: eventos.map(e => e.toJSON()),
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async sincronizarBatchOffline(req: FastifyRequest, reply: FastifyReply) {
    const body = SincronizarBatchOfflineSchema.parse(req.body);
    const data = await this.sincronizarOfflineUseCase.execute(body);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
