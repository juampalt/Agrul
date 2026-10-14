import { LotesRepositoryPort, ListarLotesFiltros } from '../../src/core/ports/lotes-repository.port.js';
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

  async listarTodos(filtro?: ListarLotesFiltros): Promise<Lote[]> {
    let resultado = Array.from(this.lotes.values());
    if (filtro?.estado) {
      const estadoBuscado = filtro.estado.toUpperCase();
      resultado = resultado.filter((l) => l.estadoActual === estadoBuscado);
    }
    if (filtro?.fincaId) {
      resultado = resultado.filter((l) => l.fincaId === filtro.fincaId);
    }
    if (filtro?.superficieMinHa !== undefined && filtro.superficieMinHa !== null) {
      resultado = resultado.filter((l) => (l.superficieHa ?? 0) >= filtro.superficieMinHa!);
    }
    if (filtro?.superficieMaxHa !== undefined && filtro.superficieMaxHa !== null) {
      resultado = resultado.filter((l) => (l.superficieHa ?? 0) <= filtro.superficieMaxHa!);
    }
    if (filtro?.producto) {
      const prodBuscado = filtro.producto.toLowerCase();
      resultado = resultado.filter((l) => l.producto.toLowerCase().includes(prodBuscado));
    }
    if (filtro?.offset !== undefined) {
      resultado = resultado.slice(filtro.offset);
    }
    if (filtro?.limit !== undefined) {
      resultado = resultado.slice(0, filtro.limit);
    }
    return resultado;
  }
}
