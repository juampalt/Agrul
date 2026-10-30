import { ActorCosechas } from '../domain/entities/cosecha-registrada.js';
import { AcondicionamientoProduccion, PartidaProduccion, RegistrarAcondicionamiento } from '../domain/entities/poscosecha.js';
import { FiltrosPoscosecha } from './clasificaciones-repository.port.js';

export interface PoscosechaAlmacenamientoRepositoryPort {
  registrarAcondicionamiento(datos: RegistrarAcondicionamiento, actor: ActorCosechas): Promise<AcondicionamientoProduccion>;
  listarAcondicionamientos(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<AcondicionamientoProduccion[]>;
  obtenerAcondicionamiento(id: string, actor: ActorCosechas): Promise<AcondicionamientoProduccion | null>;
  listarPartidas(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<PartidaProduccion[]>;
  obtenerPartida(id: string, actor: ActorCosechas): Promise<PartidaProduccion | null>;
}
