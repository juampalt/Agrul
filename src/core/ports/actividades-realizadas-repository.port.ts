import { ActividadRealizada, ContextoEjecucionDirecta, ContextoEjecucionProgramada } from '../domain/entities/actividad-realizada.entity.js';

export interface ActividadesRealizadasRepositoryPort {
  /** Valida bajo bloqueo y persiste la labor y transición en una sola transacción. */
  registrarDesdeProgramada(
    programadaId: string,
    responsableId: string,
    crear: (contexto: ContextoEjecucionProgramada) => ActividadRealizada,
  ): Promise<ActividadRealizada>;
}

export interface FiltrosActividadesRealizadas {
  cicloId?: string;
  loteId?: string;
  tipoActividadId?: string;
  responsableId?: string;
  origen?: 'PROGRAMADA' | 'NO_PROGRAMADA';
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}

export interface ActividadesRealizadasGestionPort extends ActividadesRealizadasRepositoryPort {
  registrarDirecta(cicloId: string, tipoId: string, responsableId: string,
    crear: (contexto: ContextoEjecucionDirecta) => ActividadRealizada): Promise<ActividadRealizada>;
  buscarPorId(id: string): Promise<ActividadRealizada | null>;
  listar(filtros: FiltrosActividadesRealizadas): Promise<ActividadRealizada[]>;
}
