import { ActividadAgricola } from '../../../core/domain/entities/actividad-agricola.entity.js';
import { ActividadesRepositoryPort, ListarActividadesFiltros } from '../../../core/ports/actividades-repository.port.js';

export class InMemoryActividadesRepository implements ActividadesRepositoryPort {
  private actividades: Map<string, ActividadAgricola> = new Map();
  private contador = 0;

  public async guardar(actividad: ActividadAgricola): Promise<void> {
    this.actividades.set(actividad.id, actividad);
  }

  public async buscarPorId(id: string): Promise<ActividadAgricola | null> {
    const act = this.actividades.get(id);
    return act ? ActividadAgricola.reconstituir(act.toJSON()) : null;
  }

  public async buscarPorCodigo(codigo: string): Promise<ActividadAgricola | null> {
    for (const act of this.actividades.values()) {
      if (act.codigoActividad.toUpperCase() === codigo.toUpperCase()) {
        return ActividadAgricola.reconstituir(act.toJSON());
      }
    }
    return null;
  }

  public async listar(filtros?: ListarActividadesFiltros): Promise<ActividadAgricola[]> {
    let result = Array.from(this.actividades.values());

    if (filtros?.loteId) {
      result = result.filter(a => a.loteId === filtros.loteId);
    }
    if (filtros?.cicloId) {
      result = result.filter(a => a.cicloId === filtros.cicloId);
    }
    if (filtros?.tipoActividadId) {
      result = result.filter(a => a.tipoActividadId === filtros.tipoActividadId);
    }
    if (filtros?.estado) {
      result = result.filter(a => a.estado === filtros.estado);
    }
    if (filtros?.desde) {
      result = result.filter(a => a.fechaHecho >= filtros.desde!);
    }
    if (filtros?.hasta) {
      result = result.filter(a => a.fechaHecho <= filtros.hasta!);
    }

    return result.map(a => ActividadAgricola.reconstituir(a.toJSON()));
  }

  public async siguienteCodigo(): Promise<string> {
    this.contador += 1;
    const anio = new Date().getFullYear();
    const secuencial = String(this.contador).padStart(5, '0');
    return `ACT-${anio}-${secuencial}`;
  }
}
