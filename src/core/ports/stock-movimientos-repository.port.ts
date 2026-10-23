import { StockMovimiento, TipoMovimientoStock } from '../domain/entities/stock-movimiento.entity.js';

export interface FiltrosStockMovimientos {
  insumoId?: string;
  depositoId?: string;
  tipoMovimiento?: TipoMovimientoStock;
  referenciaTipo?: string;
  referenciaId?: string;
  loteFabricacion?: string;
  desde?: string;
  hasta?: string;
}

export interface SaldoInsumoCalculado {
  insumoId: string;
  depositoId?: string;
  loteFabricacion?: string;
  saldo: number;
  unidadMedida: string;
  envasesAbiertos: number;
  totalIngresos: number;
  totalEgresos: number;
}

export interface StockMovimientosRepositoryPort {
  guardar(movimiento: StockMovimiento): Promise<StockMovimiento>;
  buscarPorId(id: string): Promise<StockMovimiento | null>;
  buscarPorClaveIdempotencia(clave: string): Promise<StockMovimiento | null>;
  buscarPorMovimientoRevertidoId(movimientoRevertidoId: string): Promise<StockMovimiento | null>;
  obtenerSaldoActual(insumoId: string, depositoId?: string, loteFabricacion?: string): Promise<SaldoInsumoCalculado>;
  listar(filtros?: FiltrosStockMovimientos): Promise<StockMovimiento[]>;
}
