import { GenealogiaRepositoryPort } from '../../src/core/ports/genealogia-repository.port.js';
import { LoteGenealogia } from '../../src/core/domain/entities/lote-genealogia.entity.js';

export class InMemoryGenealogiaRepository implements GenealogiaRepositoryPort {
  public relaciones: LoteGenealogia[] = [];

  async guardarRelacion(relacion: LoteGenealogia): Promise<void> {
    this.relaciones.push(relacion);
  }

  async guardarRelaciones(relaciones: LoteGenealogia[]): Promise<void> {
    this.relaciones.push(...relaciones);
  }

  async buscarPadres(loteHijoId: string): Promise<LoteGenealogia[]> {
    return this.relaciones.filter(r => r.loteHijoId === loteHijoId);
  }

  async buscarHijos(lotePadreId: string): Promise<LoteGenealogia[]> {
    return this.relaciones.filter(r => r.lotePadreId === lotePadreId);
  }

  async obtenerGrafoAncestros(loteId: string): Promise<LoteGenealogia[]> {
    const visitados = new Set<string>();
    const resultado: LoteGenealogia[] = [];

    const recorrer = (idActual: string) => {
      const padres = this.relaciones.filter(r => r.loteHijoId === idActual);
      for (const p of padres) {
        if (!visitados.has(p.id)) {
          visitados.add(p.id);
          resultado.push(p);
          recorrer(p.lotePadreId);
        }
      }
    };

    recorrer(loteId);
    return resultado;
  }

  async obtenerGrafoDescendientes(loteId: string): Promise<LoteGenealogia[]> {
    const visitados = new Set<string>();
    const resultado: LoteGenealogia[] = [];

    const recorrer = (idActual: string) => {
      const hijos = this.relaciones.filter(r => r.lotePadreId === idActual);
      for (const h of hijos) {
        if (!visitados.has(h.id)) {
          visitados.add(h.id);
          resultado.push(h);
          recorrer(h.loteHijoId);
        }
      }
    };

    recorrer(loteId);
    return resultado;
  }
}
