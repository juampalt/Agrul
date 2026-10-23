import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { TipoEvento } from '../../core/domain/value-objects/tipo-evento.vo.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import {
  SincronizarBatchOfflineInputDto,
  SincronizarBatchOfflineOutputDto,
} from '../dtos/sincronizacion.dto.js';

/**
 * Caso de Uso: SincronizarEventosOfflineUseCase (AGRUL-049 / RNF-02 / RN-11)
 * Ingesta resiliente de eventos capturados sin conexión en campo mediante dispositivos móviles.
 */
export class SincronizarEventosOfflineUseCase {
  constructor(private readonly eventosRepo: EventosRepositoryPort) {}

  public async execute(
    input: SincronizarBatchOfflineInputDto
  ): Promise<SincronizarBatchOfflineOutputDto> {
    const eventosAInsertar: TraceEvent[] = [];
    const fallidos: string[] = [];

    for (const ev of input.eventos) {
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

    return {
      dispositivoId: input.dispositivoId,
      totalRecibidos: input.eventos.length,
      insertados: resultado.insertados,
      fallidos: [...fallidos, ...resultado.fallidos],
    };
  }
}
