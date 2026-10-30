import { EstadoPlantacion, Plantacion } from '../domain/entities/plantacion.entity.js';

export interface FiltrosPlantaciones {
  loteId?: string;
  cultivoId?: string;
  variedadId?: string;
  estado?: EstadoPlantacion;
  limit: number;
  offset: number;
}

export interface DetallePlantacion {
  fincaId: string | null;
  lote: { id: string; codigoLote: string; estadoTerritorial: string; superficieHa: number; superficieOcupadaHa: number; superficieDisponibleHa: number };
  ciclos: { id: string; nombreCodigo: string; estado: string; fechaInicioPrevista: string; fechaFinPrevista: string;
    fechaInicioEfectiva: string | null; fechaFinEfectiva: string | null }[];
}

export interface PlantacionesRepositoryPort {
  /** CU16: finca, lote (con superficie ocupada y disponible) y ciclos productivos asociados. */
  detalle(id: string): Promise<DetallePlantacion | null>;
  /** Valida vínculos y capacidad dentro de la misma transacción que registra la plantación. */
  guardar(plantacion: Plantacion): Promise<void>;
  buscarPorId(id: string): Promise<Plantacion | null>;
  listar(filtros: FiltrosPlantaciones): Promise<Plantacion[]>;
  finalizar(id: string, fecha: string): Promise<Plantacion | null>;
}
