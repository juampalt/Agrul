import {
  EventoClimaticoSGTA,
  TipoEventoClimaticoSGTA,
} from '../domain/entities/evento-climatico-sgta.entity.js';

export interface FiltrosListadoEventosClimaticos {
  fincaId?: string;
  loteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoEvento?: TipoEventoClimaticoSGTA;
}

export interface EventosClimaticosRepositoryPort {
  guardar(evento: EventoClimaticoSGTA): Promise<void>;
  obtenerPorId(id: string): Promise<EventoClimaticoSGTA | null>;
  listar(filtros?: FiltrosListadoEventosClimaticos): Promise<EventoClimaticoSGTA[]>;
  obtenerPorLoteYPeriodo(
    loteId: string,
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<EventoClimaticoSGTA[]>;
}
