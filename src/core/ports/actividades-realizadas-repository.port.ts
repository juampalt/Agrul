import { ActividadRealizada, ContextoEjecucionProgramada } from '../domain/entities/actividad-realizada.entity.js';

export interface ActividadesRealizadasRepositoryPort {
  /** Valida bajo bloqueo y persiste la labor y transición en una sola transacción. */
  registrarDesdeProgramada(
    programadaId: string,
    responsableId: string,
    crear: (contexto: ContextoEjecucionProgramada) => ActividadRealizada,
  ): Promise<ActividadRealizada>;
}
