import { LotesRepositoryPort } from '../../src/core/ports/lotes-repository.port.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { CodigoLote } from '../../src/core/domain/value-objects/codigo-lote.vo.js';

export class InMemoryLotesRepository implements LotesRepositoryPort {
  public lotes: Map<string, Lote> = new Map();

  async guardar(lote: Lote): Promise<void> {
    this.lotes.set(lote.id, lote);
  }

  async buscarPorId(id: string): Promise<Lote | null> {
    return this.lotes.get(id) ?? null;
  }

  async buscarPorCodigo(codigo: CodigoLote | string): Promise<Lote | null> {
    const val = typeof codigo === 'string' ? codigo.toUpperCase() : codigo.value;
    for (const l of this.lotes.values()) {
      if (l.codigoLote.value === val) return l;
    }
    return null;
  }

  async actualizar(lote: Lote): Promise<void> {
    this.lotes.set(lote.id, lote);
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    const l = await this.buscarPorCodigo(codigo);
    return l !== null;
  }
}
