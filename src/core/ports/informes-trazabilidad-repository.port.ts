import { InformeTrazabilidadLog } from '../domain/entities/informe-trazabilidad-log.entity.js';

export interface FiltrosListarInformesLog {
  cosechaId?: string;
  loteId?: string;
  codigoTrazabilidad?: string;
  usuarioEmisor?: string;
  tipoFormato?: string;
}

export interface InformesTrazabilidadRepositoryPort {
  guardar(log: InformeTrazabilidadLog): Promise<InformeTrazabilidadLog>;
  buscarPorId(id: string): Promise<InformeTrazabilidadLog | null>;
  buscarPorCodigo(codigoInforme: string): Promise<InformeTrazabilidadLog | null>;
  listar(filtros?: FiltrosListarInformesLog): Promise<InformeTrazabilidadLog[]>;
}
