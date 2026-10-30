import { ActorCosechas } from '../domain/entities/cosecha-registrada.js';
import { DestinoProduccion, RegistrarDestinoProduccion } from '../domain/entities/almacenamiento-produccion.js';
import { FiltrosAlmacenamiento } from './poscosecha-almacenamiento-repository.port.js';

export interface FiltrosDestinosProduccion extends Omit<FiltrosAlmacenamiento, 'tipoMovimiento' | 'camaraSectorId'> {
  tipoDestino?: 'MERCADO_FRESCO' | 'INDUSTRIA' | 'OTRO';
}
export interface DestinosRepositoryPort {
  registrarDestino(datos: RegistrarDestinoProduccion, actor: ActorCosechas): Promise<DestinoProduccion>;
  listarDestinos(filtros: FiltrosDestinosProduccion, actor: ActorCosechas): Promise<DestinoProduccion[]>;
  obtenerDestino(id: string, actor: ActorCosechas): Promise<DestinoProduccion | null>;
}
