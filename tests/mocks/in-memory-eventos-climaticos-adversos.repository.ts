import { EventoClimaticoAdverso } from '../../src/core/domain/entities/evento-climatico-adverso.entity.js';
import {
  EventosClimaticosAdversosRepositoryPort,
  FiltrosListadoEventosAdversos,
} from '../../src/core/ports/eventos-climaticos-adversos-repository.port.js';

export class InMemoryEventosClimaticosAdversosRepository implements EventosClimaticosAdversosRepositoryPort {
  private readonly items: Map<string, EventoClimaticoAdverso> = new Map();

  public async guardar(evento: EventoClimaticoAdverso): Promise<void> {
    this.items.set(evento.id, evento);
  }

  public async obtenerPorId(id: string): Promise<EventoClimaticoAdverso | null> {
    const item = this.items.get(id);
    return item ? EventoClimaticoAdverso.reconstituir(item.toJSON()) : null;
  }

  public async listar(filtros?: FiltrosListadoEventosAdversos): Promise<EventoClimaticoAdverso[]> {
    let resultado = Array.from(this.items.values());

    if (filtros?.fincaId) {
      resultado = resultado.filter(e => e.fincaId === filtros.fincaId);
    }

    if (filtros?.loteId) {
      resultado = resultado.filter(e => e.loteId === filtros.loteId);
    }

    if (filtros?.tipoSiniestro) {
      resultado = resultado.filter(e => e.tipoSiniestro === filtros.tipoSiniestro);
    }

    if (filtros?.fechaDesde) {
      resultado = resultado.filter(e => e.fecha >= filtros.fechaDesde!);
    }

    if (filtros?.fechaHasta) {
      resultado = resultado.filter(e => e.fecha <= filtros.fechaHasta!);
    }

    // Orden cronológico por fecha asc
    resultado.sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return a.fecha.localeCompare(b.fecha);
      }
      return a.creadoEn.localeCompare(b.creadoEn);
    });

    return resultado.map(e => EventoClimaticoAdverso.reconstituir(e.toJSON()));
  }

  public async contarPorLote(loteId: string): Promise<number> {
    return Array.from(this.items.values()).filter(e => e.loteId === loteId).length;
  }
}
