import { StockInicialInsumo } from '../domain/entities/stock-inicial-insumo.entity.js';

export interface FiltrosListarStockInicial {
  insumoId?: string;
  depositoId?: string;
}

export interface StockInicialRepositoryPort {
  guardar(saldoInicial: StockInicialInsumo): Promise<void>;
  buscarPorId(id: string): Promise<StockInicialInsumo | null>;
  listar(filtros?: FiltrosListarStockInicial): Promise<StockInicialInsumo[]>;
}
