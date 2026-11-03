import { ObservacionMeteorologica } from '../domain/entities/observacion-meteorologica.entity.js';

export interface FiltrosListadoMeteorologia {
  fechaDesde?: string; // ISO string o YYYY-MM-DD
  fechaHasta?: string; // ISO string o YYYY-MM-DD
}

export interface MeteorologiaRepositoryPort {
  guardar(observacion: ObservacionMeteorologica): Promise<void>;
  obtenerPorId(id: string): Promise<ObservacionMeteorologica | null>;
  obtenerPorFincaYFechaHora(fincaId: string, fechaHoraObservacion: string): Promise<ObservacionMeteorologica | null>;
  listarPorFinca(fincaId: string, filtros?: FiltrosListadoMeteorologia): Promise<ObservacionMeteorologica[]>;
}
