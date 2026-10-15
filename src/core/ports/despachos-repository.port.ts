import { DespachoDestino } from '../domain/entities/despacho-destino.entity.js';

export interface DespachosFiltros {
  cosechaId?: string;
  destinatarioId?: string;
  tipoDestino?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface DespachosRepositoryPort {
  guardar(despacho: DespachoDestino): Promise<void>;
  buscarPorId(id: string): Promise<DespachoDestino | null>;
  listarPorCosecha(cosechaId: string): Promise<DespachoDestino[]>;
  sumarCantidadPorCosecha(cosechaId: string): Promise<number>;
  listar(filtros?: DespachosFiltros): Promise<DespachoDestino[]>;
}
