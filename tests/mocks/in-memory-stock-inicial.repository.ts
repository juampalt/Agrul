import { StockInicialInsumo } from '../../src/core/domain/entities/stock-inicial-insumo.entity.js';
import {
  StockInicialRepositoryPort,
  FiltrosListarStockInicial,
} from '../../src/core/ports/stock-inicial-repository.port.js';

export class InMemoryStockInicialRepository implements StockInicialRepositoryPort {
  private items: Map<string, StockInicialInsumo> = new Map();

  async guardar(saldoInicial: StockInicialInsumo): Promise<void> {
    this.items.set(saldoInicial.id, saldoInicial);
  }

  async buscarPorId(id: string): Promise<StockInicialInsumo | null> {
    return this.items.get(id) ?? null;
  }

  async listar(filtros?: FiltrosListarStockInicial): Promise<StockInicialInsumo[]> {
    let list = Array.from(this.items.values());

    if (filtros) {
      if (filtros.insumoId) {
        list = list.filter((s) => s.insumoId === filtros.insumoId);
      }
      if (filtros.depositoId) {
        list = list.filter((s) => s.depositoId === filtros.depositoId);
      }
    }

    return list;
  }
}
