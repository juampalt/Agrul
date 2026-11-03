import { EventoClimaticoSGTA } from '../../src/core/domain/entities/evento-climatico-sgta.entity.js';
import {
  EventosClimaticosRepositoryPort,
  FiltrosListadoEventosClimaticos,
} from '../../src/core/ports/eventos-climaticos-repository.port.js';

export class InMemoryEventosClimaticosRepository implements EventosClimaticosRepositoryPort {
  private eventos: EventoClimaticoSGTA[] = [];

  public async guardar(evento: EventoClimaticoSGTA): Promise<void> {
    this.eventos.push(evento);
  }

  public async obtenerPorId(id: string): Promise<EventoClimaticoSGTA | null> {
    const found = this.eventos.find(e => e.id === id);
    return found ?? null;
  }

  public async listar(filtros?: FiltrosListadoEventosClimaticos): Promise<EventoClimaticoSGTA[]> {
    let result = [...this.eventos];

    if (filtros?.fincaId) {
      result = result.filter(e => e.fincaId === filtros.fincaId);
    }

    if (filtros?.loteId) {
      result = result.filter(e => e.lotesAfectados.some(l => l.loteId === filtros.loteId));
    }

    if (filtros?.tipoEvento) {
      result = result.filter(e => e.tipoEvento === filtros.tipoEvento);
    }

    if (filtros?.fechaDesde) {
      result = result.filter(e => e.fecha >= filtros.fechaDesde!);
    }

    if (filtros?.fechaHasta) {
      result = result.filter(e => e.fecha <= filtros.fechaHasta!);
    }

    return result.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  public async obtenerPorLoteYPeriodo(
    loteId: string,
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<EventoClimaticoSGTA[]> {
    return this.listar({ loteId, fechaDesde, fechaHasta });
  }
}
