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
/**
 * Resumen basado solo en registros existentes. Un total es `null` cuando no hay registros que lo respalden,
 * para distinguir «no registrado» de un valor registrado en cero.
 */
export interface ResumenCicloProductivo {
  cicloId: string;
  estado: string;
  actividadesRealizadas: { cantidad: number; superficieTrabajadaHa: number | null };
  monitoreos: { cantidad: number };
  aplicacionesInsumos: { cantidad: number; insumos: { insumoId: string; codigo: string; nombre: string; unidadMedida: string; cantidadTotal: number }[] };
  cosechas: { cantidad: number; totalCosechadoKg: number | null };
}

export interface CiclosProductivosRepositoryPort extends CiclosRepositoryPort {
  resumen(id: string): Promise<ResumenCicloProductivo | null>;
  registrar(datos: DatosPlanificacionCiclo & { id: string }): Promise<CicloProductivo>;
  consultar(filtros: ConsultarCiclosFiltros): Promise<CicloProductivo[]>;
  iniciar(id: string, fecha: string): Promise<CicloProductivo | null>;
  finalizar(id: string, fecha: string): Promise<CicloProductivo | null>;
}
