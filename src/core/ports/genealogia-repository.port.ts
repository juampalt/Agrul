import { LoteGenealogia } from '../domain/entities/lote-genealogia.entity.js';

export interface GenealogiaRepositoryPort {
  guardarRelacion(relacion: LoteGenealogia): Promise<void>;
  guardarRelaciones(relaciones: LoteGenealogia[]): Promise<void>;
  buscarPadres(loteHijoId: string): Promise<LoteGenealogia[]>;
  buscarHijos(lotePadreId: string): Promise<LoteGenealogia[]>;
  obtenerGrafoAncestros(loteId: string, profundidadMaxima?: number): Promise<LoteGenealogia[]>;
  obtenerGrafoDescendientes(loteId: string, profundidadMaxima?: number): Promise<LoteGenealogia[]>;
}
