import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { RegistrarEventoInputDTO, TraceEventResponseDTO } from '../dtos/evento.dto.js';
import { esEventoCompensatorio } from '../../core/domain/value-objects/tipo-evento.vo.js';

export class RegistrarEventoUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly eventosRepo: EventosRepositoryPort
  ) {}

  async execute(dto: RegistrarEventoInputDTO): Promise<TraceEventResponseDTO> {
    // 1. Validar existencia del lote objetivo
    const lote = await this.lotesRepo.buscarPorId(dto.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', dto.loteId);
    }

    // 2. Si es compensatorio, validar que el evento referenciado exista
    if (esEventoCompensatorio(dto.tipoEvento)) {
      if (!dto.eventoReferenciadoId) {
        throw new Error('Un evento compensatorio requiere un eventoReferenciadoId.');
      }
      const eventoReferenciado = await this.eventosRepo.buscarPorId(dto.eventoReferenciadoId);
      if (!eventoReferenciado) {
        throw new EntidadNoEncontradaError('TraceEvent (Referenciado)', dto.eventoReferenciadoId);
      }
    }

    // 3. Aplicar transición al agregado Lote (lanza InvalidStateTransitionError si el lote está cerrado)
    lote.aplicarEvento(dto.tipoEvento);

    // 4. Crear entidad inmutable de evento
    const nuevoEvento = TraceEvent.crear({
      id: crypto.randomUUID(),
      loteId: lote.id,
      actorId: dto.actorId,
      ubicacionId: dto.ubicacionId,
      tipoEvento: dto.tipoEvento,
      timestampCapturaLocal: dto.timestampCapturaLocal ?? new Date().toISOString(),
      payloadEspecifico: dto.payloadEspecifico,
      eventoReferenciadoId: dto.eventoReferenciadoId ?? null,
    });

    // 5. Persistencia transaccional indivisible (ACID)
    await this.eventosRepo.guardarConTransaccion(nuevoEvento, lote);

    return {
      id: nuevoEvento.id,
      loteId: nuevoEvento.loteId,
      actorId: nuevoEvento.actorId,
      ubicacionId: nuevoEvento.ubicacionId,
      tipoEvento: nuevoEvento.tipoEvento,
      timestampCapturaLocal: nuevoEvento.timestampCapturaLocal,
      timestampServidor: nuevoEvento.timestampServidor,
      payloadEspecifico: nuevoEvento.payloadEspecifico as Record<string, unknown>,
      eventoReferenciadoId: nuevoEvento.eventoReferenciadoId,
      estadoSincronizacion: nuevoEvento.estadoSincronizacion,
    };
  }
}
