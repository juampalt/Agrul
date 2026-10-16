import { Cosecha } from '../../src/core/domain/entities/cosecha.entity.js';
import {
  CosechasRepositoryPort,
  ListarCosechasFiltros,
} from '../../src/core/ports/cosechas-repository.port.js';

export class InMemoryCosechasRepository implements CosechasRepositoryPort {
  private cosechas: Map<string, Cosecha> = new Map();

  public async guardar(cosecha: Cosecha): Promise<void> {
    this.cosechas.set(cosecha.id, cosecha);
  }

  public async buscarPorId(id: string): Promise<Cosecha | null> {
    const item = this.cosechas.get(id);
    return item ? Cosecha.reconstituir(item.toJSON()) : null;
  }

  public async buscarPorCodigo(codigo: string): Promise<Cosecha | null> {
    const item = Array.from(this.cosechas.values()).find(
      c => c.codigoTrazabilidad.value === codigo.trim().toUpperCase()
    );
    return item ? Cosecha.reconstituir(item.toJSON()) : null;
  }

  public async contarPorLoteYFecha(loteId: string, fecha: string): Promise<number> {
    const fechaStr = fecha.trim().slice(0, 10);
    return Array.from(this.cosechas.values()).filter(
      c => c.loteId === loteId && c.fecha === fechaStr
    ).length;
  }

  public async listar(filtros?: ListarCosechasFiltros): Promise<Cosecha[]> {
    let result = Array.from(this.cosechas.values());

    if (filtros?.loteId) {
      result = result.filter(c => c.loteId === filtros.loteId);
    }
    if (filtros?.cicloId) {
      result = result.filter(c => c.cicloId === filtros.cicloId);
    }
    if (filtros?.fechaDesde) {
      result = result.filter(c => c.fecha >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      result = result.filter(c => c.fecha <= filtros.fechaHasta!);
    }
    if (filtros?.estado) {
      result = result.filter(c => c.estado === filtros.estado!.toUpperCase());
    }

    return result.map(c => Cosecha.reconstituir(c.toJSON()));
  }
}
