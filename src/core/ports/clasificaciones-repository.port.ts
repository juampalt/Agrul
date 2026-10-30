import { ActorCosechas } from '../domain/entities/cosecha-registrada.js';
import { ClasificacionProduccion, RegistrarClasificacion } from '../domain/entities/poscosecha.js';

import { FiltrosOrigenProductivo } from './filtros-origen-productivo.js';

export interface FiltrosPoscosecha extends FiltrosOrigenProductivo {
  cosechaId?: string; clasificacionId?: string; partidaProduccionId?: string;
  categoria?: 'FRESCO' | 'INDUSTRIA'; desde?: string; hasta?: string; limit: number; offset: number;
}
export interface ClasificacionesRepositoryPort {
  registrarClasificacion(datos: RegistrarClasificacion, actor: ActorCosechas): Promise<ClasificacionProduccion>;
  listarClasificaciones(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<ClasificacionProduccion[]>;
  obtenerClasificacion(id: string, actor: ActorCosechas): Promise<ClasificacionProduccion | null>;
  totalesClasificaciones(filtros: FiltrosPoscosecha, actor: ActorCosechas): Promise<{ cantidadClasificaciones: number; clasificadoKg: number; aprovechableKg: number; frescoKg: number; industriaKg: number; descarteKg: number }>;
}
