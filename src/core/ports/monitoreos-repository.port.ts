import { ContextoMonitoreo, Monitoreo } from '../domain/entities/monitoreo.entity.js';

export interface FiltrosMonitoreos {
  /** Alcance interno derivado de la sesión; no forma parte del contrato HTTP. */
  fincaIds?: readonly string[];
  cicloId?: string;
  loteId?: string;
  responsableId?: string;
  etapaFenologica?: string;
  estadoGeneralCultivo?: string;
  tipoObservacion?: string;
  /** true: solo con problema detectado; false: solo inspecciones sin problema. */
  conProblema?: boolean;
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}

export interface MonitoreosRepositoryPort {
  registrar(cicloId: string, responsableId: string, crear: (contexto: ContextoMonitoreo) => Monitoreo): Promise<Monitoreo>;
  buscarPorId(id: string): Promise<Monitoreo | null>;
  listar(filtros: FiltrosMonitoreos): Promise<Monitoreo[]>;
  /** CU33: labores y aplicaciones de insumos expresamente vinculadas al monitoreo. */
  vinculados?(id: string): Promise<VinculadosMonitoreo>;
}

export interface VinculadosMonitoreo {
  actividadesRealizadas: { id: string; fechaEjecucion: string; tipoActividadId: string; tipoActividad: string; responsableId: string; superficieTrabajadaHa: number | null }[];
  aplicacionesInsumos: { id: string; actividadRealizadaId: string; superficieTratada: number; metodoAplicacion: string; motivoAplicacion: string }[];
}
