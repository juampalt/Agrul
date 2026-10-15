import { FincasRepositoryPort, ListarFincasFiltros } from '../../../core/ports/fincas-repository.port.js';
import { Finca } from '../../../core/domain/entities/finca.entity.js';

export class InMemoryFincasRepository implements FincasRepositoryPort {
  public fincas: Map<string, Finca> = new Map();

  async guardar(finca: Finca): Promise<void> {
    this.fincas.set(finca.id, finca);
  }

  async buscarPorId(id: string): Promise<Finca | null> {
    return this.fincas.get(id) ?? null;
  }

  async listarTodas(filtro?: ListarFincasFiltros): Promise<Finca[]> {
    let resultado = Array.from(this.fincas.values());

    if (filtro?.provincia) {
      const provBuscada = filtro.provincia.toLowerCase();
      resultado = resultado.filter((f) => f.ubicacion.provincia.toLowerCase().includes(provBuscada));
    }

    if (filtro?.departamento) {
      const deptoBuscado = filtro.departamento.toLowerCase();
      resultado = resultado.filter((f) => f.ubicacion.departamento.toLowerCase().includes(deptoBuscado));
    }

    if (filtro?.nombre) {
      const nomBuscado = filtro.nombre.toLowerCase();
      resultado = resultado.filter((f) => f.nombre.toLowerCase().includes(nomBuscado));
    }

    if (filtro?.offset !== undefined) {
      resultado = resultado.slice(filtro.offset);
    }

    if (filtro?.limit !== undefined) {
      resultado = resultado.slice(0, filtro.limit);
    }

    return resultado;
  }

  async existeNombre(nombre: string): Promise<boolean> {
    const normalizado = nombre.trim().toLowerCase();
    for (const f of this.fincas.values()) {
      if (f.nombre.toLowerCase() === normalizado) return true;
    }
    return false;
  }
}
