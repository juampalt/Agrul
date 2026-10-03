import { FastifyReply, FastifyRequest } from 'fastify';
import { RegistrarEventoUseCase } from '../../../application/use-cases/registrar-evento.use-case.js';
import { EventosRepositoryPort } from '../../../core/ports/eventos-repository.port.js';
import { RegistrarEventoBodySchema } from '../schemas/eventos.schema.js';
import { LoteIdParamSchema } from '../schemas/lotes.schema.js';
import { SincronizarBatchOfflineSchema } from '../schemas/sincronizacion.schema.js';
import { TraceEvent } from '../../../core/domain/entities/trace-event.entity.js';
import { TipoEvento } from '../../../core/domain/value-objects/tipo-evento.vo.js';

export class EventosController {
  constructor(
    private readonly registrarEventoUseCase: RegistrarEventoUseCase,
    private readonly eventosRepo: EventosRepositoryPort
  ) {}

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

    const eventosAInsertar: TraceEvent[] = [];
    const fallidos: string[] = [];

    for (const ev of body.eventos) {
      try {
        const eventoEntidad = TraceEvent.crear({
          id: crypto.randomUUID(),
          loteId: ev.loteId,
          actorId: ev.actorId,
          ubicacionId: ev.ubicacionId,
          tipoEvento: ev.tipoEvento as TipoEvento,
          timestampCapturaLocal: ev.timestampCapturaLocal,
          payloadEspecifico: ev.payloadEspecifico,
          eventoReferenciadoId: ev.eventoReferenciadoId ?? null,
          estadoSincronizacion: 'PENDIENTE_AUDITORIA_OFFLINE',
        });
        eventosAInsertar.push(eventoEntidad);
      } catch (err: unknown) {
        fallidos.push(ev.idLocalTemporal);
      }
    }

    const resultado = await this.eventosRepo.guardarBatchOffline(eventosAInsertar);

    return reply.status(200).send({
      success: true,
      data: {
        dispositivoId: body.dispositivoId,
        totalRecibidos: body.eventos.length,
        insertados: resultado.insertados,
        fallidos: [...fallidos, ...resultado.fallidos],
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
