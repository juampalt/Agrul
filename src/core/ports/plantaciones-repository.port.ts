import { EstadoPlantacion, Plantacion } from '../domain/entities/plantacion.entity.js';

export interface FiltrosPlantaciones {
  loteId?: string;
  cultivoId?: string;
  variedadId?: string;
  estado?: EstadoPlantacion;
  limit: number;
  offset: number;
}

export interface PlantacionesRepositoryPort {
  /** Valida vínculos y capacidad dentro de la misma transacción que registra la plantación. */
  guardar(plantacion: Plantacion): Promise<void>;
  buscarPorId(id: string): Promise<Plantacion | null>;
  listar(filtros: FiltrosPlantaciones): Promise<Plantacion[]>;
  finalizar(id: string, fecha: string): Promise<Plantacion | null>;
}
