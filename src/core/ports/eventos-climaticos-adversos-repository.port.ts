import { EventoClimaticoAdverso, TipoSiniestroClimatico } from '../domain/entities/evento-climatico-adverso.entity.js';

export interface FiltrosListadoEventosAdversos {
  fincaId?: string;
  loteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoSiniestro?: TipoSiniestroClimatico;
}

export interface EventosClimaticosAdversosRepositoryPort {
  guardar(evento: EventoClimaticoAdverso): Promise<void>;
  obtenerPorId(id: string): Promise<EventoClimaticoAdverso | null>;
  listar(filtros?: FiltrosListadoEventosAdversos): Promise<EventoClimaticoAdverso[]>;
  contarPorLote(loteId: string): Promise<number>;
}
