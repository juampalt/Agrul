import { ActorCosechas } from '../domain/entities/cosecha-registrada.js';
import { AcondicionamientoProduccion, PartidaProduccion, RegistrarAcondicionamiento } from '../domain/entities/poscosecha.js';
import { FiltrosPoscosecha } from './clasificaciones-repository.port.js';
import { CamaraProduccion, MovimientoAlmacenamiento, RegistrarCamara, RegistrarMovimientoAlmacenamiento, SaldoCamaraProduccion } from '../domain/entities/almacenamiento-produccion.js';

export interface PoscosechaAlmacenamientoRepositoryPort {
  registrarAcondicionamiento(datos: RegistrarAcondicionamiento, actor: ActorCosechas): Promise<AcondicionamientoProduccion>;
  listarAcondicionamientos(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<AcondicionamientoProduccion[]>;
  obtenerAcondicionamiento(id: string, actor: ActorCosechas): Promise<AcondicionamientoProduccion | null>;
  listarPartidas(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<PartidaProduccion[]>;
  obtenerPartida(id: string, actor: ActorCosechas): Promise<PartidaProduccion | null>;
}

import { FiltrosOrigenProductivo } from './filtros-origen-productivo.js';

export interface FiltrosAlmacenamiento extends FiltrosOrigenProductivo {
  fincaId?: string; camaraSectorId?: string; partidaProduccionId?: string; cosechaId?: string;
  tipoMovimiento?: 'INGRESO' | 'SALIDA'; desde?: string; hasta?: string; limit: number; offset: number;
}
export interface AlmacenamientoProduccionRepositoryPort {
  registrarCamara(datos: RegistrarCamara, actor: ActorCosechas): Promise<CamaraProduccion>;
  registrarMovimiento(datos: RegistrarMovimientoAlmacenamiento, actor: ActorCosechas): Promise<MovimientoAlmacenamiento>;
  listarCamaras(filtros: FiltrosAlmacenamiento, actor: ActorCosechas): Promise<CamaraProduccion[]>;
  obtenerCamara(id: string, actor: ActorCosechas): Promise<CamaraProduccion | null>;
  listarMovimientos(filtros: FiltrosAlmacenamiento, actor: ActorCosechas): Promise<MovimientoAlmacenamiento[]>;
  obtenerMovimiento(id: string, actor: ActorCosechas): Promise<MovimientoAlmacenamiento | null>;
  consultarSaldos(filtros: FiltrosAlmacenamiento, actor: ActorCosechas): Promise<SaldoCamaraProduccion[]>;
}
