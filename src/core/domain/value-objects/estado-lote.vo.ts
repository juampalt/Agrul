import { InvalidStateTransitionError } from '../errors/domain.error.js';
import { TipoEvento, TipoEventoEnum } from './tipo-evento.vo.js';

export const EstadoLoteEnum = {
  CREADO: 'CREADO',
  EN_PROCESO: 'EN_PROCESO',
  EMBALADO: 'EMBALADO',
  DESPACHADO: 'DESPACHADO',
  CERRADO: 'CERRADO',
} as const;

export type EstadoLote = typeof EstadoLoteEnum[keyof typeof EstadoLoteEnum];

export class MaquinaEstadosLote {
  /**
   * Determina el próximo estado del lote en base al estado actual y al tipo de evento recibido.
   * Si la transición no es válida según las reglas de negocio, lanza InvalidStateTransitionError.
   */
  public static calcularSiguienteEstado(estadoActual: EstadoLote, tipoEvento: TipoEvento): EstadoLote {
    if (estadoActual === EstadoLoteEnum.CERRADO) {
      throw new InvalidStateTransitionError(estadoActual, tipoEvento);
    }

    if (estadoActual === EstadoLoteEnum.DESPACHADO && tipoEvento !== TipoEventoEnum.COMPENSACION_ANULACION) {
      throw new InvalidStateTransitionError(estadoActual, tipoEvento);
    }

    switch (tipoEvento) {
      case TipoEventoEnum.COSECHA:
      case TipoEventoEnum.RECEPCION:
        return estadoActual; // Permanece en CREADO

      case TipoEventoEnum.CLASIFICACION:
      case TipoEventoEnum.TRATAMIENTO:
      case TipoEventoEnum.PROCESO:
      case TipoEventoEnum.FUSION_RECEPCION:
      case TipoEventoEnum.DIVISION_SPLIT:
        return EstadoLoteEnum.EN_PROCESO;

      case TipoEventoEnum.EMBALAJE:
        return EstadoLoteEnum.EMBALADO;

      case TipoEventoEnum.DESPACHO:
        return EstadoLoteEnum.DESPACHADO;

      case TipoEventoEnum.COMPENSACION_AJUSTE:
      case TipoEventoEnum.COMPENSACION_ANULACION:
      case TipoEventoEnum.FUSION_ORIGEN:
        return estadoActual;

      default:
        return estadoActual;
    }
  }
}
