import { ActorInventario, IngresoInsumos, MovimientoInventario, MovimientoManual } from '../domain/entities/inventario-insumos.js';

export interface FiltrosInventario {
  fincaId?: string; insumoId?: string; partidaId?: string; limit: number; offset: number;
}
export interface PartidaInventario {
  id: string; fincaId: string | null; insumoId: string; unidadMedida: string | null;
  fechaIngreso: string; fechaVencimiento: string | null; proveedor: string;
  cantidadInicial: string; cantidadDisponible: string;
}
export interface ExistenciaInventario {
  fincaId: string; insumoId: string; codigo: string; nombre: string;
  unidadMedida: string | null; nivelMinimo: string; stockFisico: string;
  stockUtilizable: string; stockVencido: string; alertaStockMinimo: boolean; alertaVencimiento: boolean;
}
export interface InventarioInsumosRepositoryPort {
  ingresar(datos: IngresoInsumos, actor: ActorInventario): Promise<MovimientoInventario>;
  mover(datos: MovimientoManual, actor: ActorInventario): Promise<MovimientoInventario>;
  partidas(filtros: FiltrosInventario, actor: ActorInventario): Promise<PartidaInventario[]>;
  partida(id: string, actor: ActorInventario): Promise<PartidaInventario | null>;
  movimientos(filtros: FiltrosInventario, actor: ActorInventario): Promise<MovimientoInventario[]>;
  movimiento(id: string, actor: ActorInventario): Promise<MovimientoInventario | null>;
  existencias(filtros: FiltrosInventario, actor: ActorInventario, soloAlertas?: boolean): Promise<ExistenciaInventario[]>;
}
