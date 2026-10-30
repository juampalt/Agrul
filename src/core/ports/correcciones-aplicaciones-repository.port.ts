import { CorregirAplicacionInsumos } from '../domain/entities/correccion-aplicacion-insumos.js';
import { ActorInventario } from '../domain/entities/inventario-insumos.js';

export interface CorreccionAplicacionInsumos {
  id: string; aplicacionAnteriorId: string; aplicacionNuevaId: string; eventoOriginalId: string;
  motivo: string; responsableId: string; registradoEn: string;
  movimientos: { id: string; partidaId: string | null; cantidad: string; movimientoCompensadoId: string | null }[];
}
export interface CorreccionesAplicacionesRepositoryPort {
  corregir(aplicacionId: string, datos: CorregirAplicacionInsumos, actor: ActorInventario): Promise<CorreccionAplicacionInsumos>;
  listar(aplicacionId: string, actor: ActorInventario): Promise<CorreccionAplicacionInsumos[]>;
}
