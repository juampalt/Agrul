import { CicloProductivo } from '../domain/entities/ciclo-productivo.entity.js';
import { DatosPlanificacionCiclo, EstadoCicloPlanificado } from '../domain/value-objects/planificacion-ciclo.vo.js';
import { CiclosRepositoryPort } from './ciclos-repository.port.js';

export interface ConsultarCiclosFiltros {
  plantacionId?: string;
  loteId?: string;
  estado?: EstadoCicloPlanificado;
  limit: number;
  offset: number;
}
export interface CiclosProductivosRepositoryPort extends CiclosRepositoryPort {
  registrar(datos: DatosPlanificacionCiclo & { id: string }): Promise<CicloProductivo>;
  consultar(filtros: ConsultarCiclosFiltros): Promise<CicloProductivo[]>;
  iniciar(id: string, fecha: string): Promise<CicloProductivo | null>;
  finalizar(id: string, fecha: string): Promise<CicloProductivo | null>;
}
