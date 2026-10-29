import { RegistrarAplicacionInsumos } from '../domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../domain/entities/inventario-insumos.js';

export interface AplicacionInsumosItem {
  id: string; insumoId: string; partidaInsumoId: string; cantidadAplicada: string; dosis: string; movimientoId: string | null;
}
export interface AplicacionInsumos {
  id: string; actividadRealizadaId: string; superficieTratada: string; metodoAplicacion: string;
  motivoAplicacion: string; responsableId: string; observaciones: string | null;
  registradoEn: string | null; items: AplicacionInsumosItem[];
}
export interface FiltrosAplicacionesInsumos {
  actividadRealizadaId?: string; fincaId?: string; insumoId?: string; limit: number; offset: number;
}
export interface AplicacionesInsumosRepositoryPort {
  registrar(datos: RegistrarAplicacionInsumos, actor: ActorInventario): Promise<AplicacionInsumos>;
  obtener(id: string, actor: ActorInventario): Promise<AplicacionInsumos | null>;
  listar(filtros: FiltrosAplicacionesInsumos, actor: ActorInventario): Promise<AplicacionInsumos[]>;
}
