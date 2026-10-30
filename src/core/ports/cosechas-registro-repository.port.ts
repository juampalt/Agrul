import { ActorCosechas, CosechaRegistrada, RegistrarCosecha } from '../domain/entities/cosecha-registrada.js';

export interface FiltrosCosechasRegistro {
  cicloId?: string;
  loteId?: string;
  origen?: 'PROGRAMADA' | 'NO_PROGRAMADA';
  numeroPasada?: number;
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}
/** Contrato vigente: pesaje separado de clasificación; no reutiliza balances comerciales heredados. */
export interface CosechasRegistroRepositoryPort {
  registrar(datos: RegistrarCosecha, actor: ActorCosechas): Promise<CosechaRegistrada>;
  buscarPorId(id: string, actor: ActorCosechas): Promise<CosechaRegistrada | null>;
  listar(filtros: FiltrosCosechasRegistro, actor: ActorCosechas): Promise<CosechaRegistrada[]>;
}
