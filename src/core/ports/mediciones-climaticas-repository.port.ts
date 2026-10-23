import { MedicionClimatica } from '../domain/entities/medicion-climatica.entity.js';

export interface FiltrosListadoClima {
  fechaDesde?: string;
  fechaHasta?: string;
  soloVigentes?: boolean;
}

export interface MedicionesClimaticasRepositoryPort {
  guardar(medicion: MedicionClimatica): Promise<void>;
  guardarBatch(mediciones: MedicionClimatica[]): Promise<void>;
  obtenerPorId(id: string): Promise<MedicionClimatica | null>;
  obtenerVigentePorFechaYFinca(fincaId: string, fecha: string): Promise<MedicionClimatica | null>;
  listarPorFinca(fincaId: string, filtros?: FiltrosListadoClima): Promise<MedicionClimatica[]>;
  obtenerHistorialCorrecciones(medicionOriginalId: string): Promise<MedicionClimatica[]>;
}
