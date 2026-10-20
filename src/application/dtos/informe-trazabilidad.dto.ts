import { TipoFormatoInforme, InformeTrazabilidadLogProps } from '../../core/domain/entities/informe-trazabilidad-log.entity.js';
import { RecorridoTrazabilidadOutputDto } from './recorrido-trazabilidad.dto.js';

export interface EmitirInformeTrazabilidadInputDto {
  identificador: string;
  formato?: TipoFormatoInforme;
  usuarioEmisor?: string;
  rolEmisor?: string | null;
  incluirDatosSensibles?: boolean;
  incluirCostos?: boolean;
}

export interface EmitirInformeTrazabilidadOutputDto {
  codigoInforme: string;
  tipoFormato: TipoFormatoInforme;
  nombreArchivo: string;
  mimeType: string;
  contenido: Buffer;
  tamanoBytes: number;
  log: InformeTrazabilidadLogProps;
  recorrido: RecorridoTrazabilidadOutputDto;
}
