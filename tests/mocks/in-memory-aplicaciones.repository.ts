import { AplicacionAgricola } from '../../src/core/domain/entities/aplicacion-agricola.entity.js';
import {
  AplicacionesRepositoryPort,
  ListarAplicacionesFiltros,
} from '../../src/core/ports/aplicaciones-repository.port.js';

export class InMemoryAplicacionesRepository implements AplicacionesRepositoryPort {
  private aplicaciones: Map<string, AplicacionAgricola> = new Map();

  public async guardar(aplicacion: AplicacionAgricola): Promise<void> {
    this.aplicaciones.set(aplicacion.id, aplicacion);
  }

  public async buscarPorId(id: string): Promise<AplicacionAgricola | null> {
    const item = this.aplicaciones.get(id);
    return item ? AplicacionAgricola.reconstituir(item.toJSON()) : null;
  }

  public async listar(filtros?: ListarAplicacionesFiltros): Promise<AplicacionAgricola[]> {
    let result = Array.from(this.aplicaciones.values());

    if (filtros?.loteId) {
      result = result.filter(a => a.loteId === filtros.loteId);
    }
    if (filtros?.cicloId) {
      result = result.filter(a => a.cicloId === filtros.cicloId);
    }
    if (filtros?.actividadId) {
      result = result.filter(a => a.actividadId === filtros.actividadId);
    }
    if (filtros?.insumoId) {
      result = result.filter(a => a.lineas.some(l => l.insumoId === filtros.insumoId));
    }
    if (filtros?.fechaDesde) {
      result = result.filter(a => a.fecha >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      result = result.filter(a => a.fecha <= filtros.fechaHasta!);
    }

    return result.map(a => AplicacionAgricola.reconstituir(a.toJSON()));
  }
}
