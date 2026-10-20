import { InsumoUnidadEquivalencia } from '../../src/core/domain/entities/insumo-unidad-equivalencia.entity.js';
import { InsumoEquivalenciasRepositoryPort } from '../../src/core/ports/insumo-equivalencias-repository.port.js';

export class InMemoryInsumoEquivalenciasRepository implements InsumoEquivalenciasRepositoryPort {
  private equivalencias: Map<string, InsumoUnidadEquivalencia> = new Map();

  async guardar(equivalencia: InsumoUnidadEquivalencia): Promise<void> {
    this.equivalencias.set(equivalencia.id, equivalencia);
  }

  async buscarPorId(id: string): Promise<InsumoUnidadEquivalencia | null> {
    return this.equivalencias.get(id) ?? null;
  }

  async listarPorInsumo(insumoId: string): Promise<InsumoUnidadEquivalencia[]> {
    return Array.from(this.equivalencias.values()).filter((eq) => eq.insumoId === insumoId);
  }

  async buscarEquivalencia(
    insumoId: string,
    unidadCompra: string,
    unidadConsumo: string
  ): Promise<InsumoUnidadEquivalencia | null> {
    const uc = unidadCompra.trim().toUpperCase();
    const ucons = unidadConsumo.trim().toUpperCase();

    for (const eq of this.equivalencias.values()) {
      if (
        eq.insumoId === insumoId &&
        eq.unidadCompra.toUpperCase() === uc &&
        eq.unidadConsumo.toUpperCase() === ucons
      ) {
        return eq;
      }
    }
    return null;
  }

  async eliminar(id: string): Promise<void> {
    this.equivalencias.delete(id);
  }
}
