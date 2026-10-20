import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { CiclosRepositoryPort } from '../../src/core/ports/ciclos-repository.port.js';

export class InMemoryCiclosRepository implements CiclosRepositoryPort {
  private ciclos: Map<string, CicloProductivo> = new Map();
  private contador = 0;

  public async guardar(ciclo: CicloProductivo): Promise<void> {
    this.ciclos.set(ciclo.id, ciclo);
  }

  public async buscarPorId(id: string): Promise<CicloProductivo | null> {
    const ciclo = this.ciclos.get(id);
    return ciclo ? CicloProductivo.reconstituir(ciclo.toJSON()) : null;
  }

  public async buscarPorCodigo(codigo: string): Promise<CicloProductivo | null> {
    for (const ciclo of this.ciclos.values()) {
      if (ciclo.codigoCiclo.toUpperCase() === codigo.toUpperCase()) {
        return CicloProductivo.reconstituir(ciclo.toJSON());
      }
    }
    return null;
  }

  public async buscarPorLote(loteId: string): Promise<CicloProductivo[]> {
    return Array.from(this.ciclos.values())
      .filter(c => c.loteId === loteId)
      .map(c => CicloProductivo.reconstituir(c.toJSON()));
  }

  public async buscarCicloAbiertoPorLote(loteId: string): Promise<CicloProductivo | null> {
    for (const ciclo of this.ciclos.values()) {
      if (ciclo.loteId === loteId && ciclo.estaAbierto()) {
        return CicloProductivo.reconstituir(ciclo.toJSON());
      }
    }
    return null;
  }

  public async listar(filtros?: { loteId?: string; cultivo?: string; variedad?: string; estado?: any; temporada?: string }): Promise<CicloProductivo[]> {
    let result = Array.from(this.ciclos.values());

    if (filtros?.loteId) {
      result = result.filter(c => c.loteId === filtros.loteId);
    }
    if (filtros?.cultivo) {
      result = result.filter(c => c.cultivo.toLowerCase() === filtros.cultivo!.toLowerCase());
    }
    if (filtros?.variedad) {
      result = result.filter(c => c.variedad?.toLowerCase() === filtros.variedad!.toLowerCase());
    }
    if (filtros?.estado) {
      result = result.filter(c => c.estado === filtros.estado);
    }
    if (filtros?.temporada) {
      result = result.filter(c => c.temporada.toLowerCase() === filtros.temporada!.toLowerCase());
    }

    return result.map(c => CicloProductivo.reconstituir(c.toJSON()));
  }

  public async siguienteCodigo(): Promise<string> {
    this.contador += 1;
    const anio = new Date().getFullYear();
    const secuencial = String(this.contador).padStart(4, '0');
    return `CICLO-${anio}-${secuencial}`;
  }
}
