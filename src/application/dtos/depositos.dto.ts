import { TipoPermitidoDeposito } from '../../core/domain/entities/deposito-almacenamiento.entity.js';

export interface CrearDepositoInputDTO {
  id?: string;
  fincaId: string;
  nombre: string;
  tipoPermitido: TipoPermitidoDeposito;
  ubicacionFisica?: string | null;
  capacidadMaxima?: number | null;
}

export interface DepositoOutputDTO {
  id: string;
  fincaId: string;
  nombre: string;
  tipoPermitido: TipoPermitidoDeposito;
  ubicacionFisica: string | null;
  capacidadMaxima: number | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarDepositosQueryDTO {
  fincaId?: string;
  tipoPermitido?: TipoPermitidoDeposito;
  activo?: boolean;
}
