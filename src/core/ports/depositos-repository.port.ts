import { DepositoAlmacenamiento, TipoPermitidoDeposito } from '../domain/entities/deposito-almacenamiento.entity.js';

export interface FiltrosListarDepositos {
  fincaId?: string;
  tipoPermitido?: TipoPermitidoDeposito;
  activo?: boolean;
}

export interface DepositosRepositoryPort {
  guardar(deposito: DepositoAlmacenamiento): Promise<void>;
  buscarPorId(id: string): Promise<DepositoAlmacenamiento | null>;
  listarPorFinca(fincaId: string, activo?: boolean): Promise<DepositoAlmacenamiento[]>;
  listar(filtros?: FiltrosListarDepositos): Promise<DepositoAlmacenamiento[]>;
}
