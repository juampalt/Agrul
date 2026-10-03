import { EventosRepositoryPort } from '../../src/core/ports/eventos-repository.port.js';
import { TraceEvent } from '../../src/core/domain/entities/trace-event.entity.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { InMemoryLotesRepository } from './in-memory-lotes.repository.js';

export class InMemoryEventosRepository implements EventosRepositoryPort {
  public eventos: TraceEvent[] = [];

  constructor(private readonly lotesRepo?: InMemoryLotesRepository) {}

  async guardarConTransaccion(evento: TraceEvent, loteActualizado: Lote): Promise<void> {
    // Simula atomicidad en memoria
    this.eventos.push(evento);
    if (this.lotesRepo) {
      await this.lotesRepo.actualizar(loteActualizado);
    }
  }

  async buscarPorId(id: string): Promise<TraceEvent | null> {
    const ev = this.eventos.find(e => e.id === id);
    return ev ?? null;
  }

  async listarPorLote(loteId: string): Promise<TraceEvent[]> {
    return this.eventos.filter(e => e.loteId === loteId);
  }

  async guardarBatchOffline(eventos: TraceEvent[]): Promise<{ insertados: number; fallidos: string[] }> {
    for (const ev of eventos) {
      this.eventos.push(ev);
    }
    return { insertados: eventos.length, fallidos: [] };
  }
}
