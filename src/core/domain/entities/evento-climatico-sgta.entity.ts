import crypto from 'node:crypto';
import {
  EventoClimaticoAdversoInvalidoError,
  FechaFuturaInvalidaError,
} from '../errors/domain.error.js';

export type TipoEventoClimaticoSGTA =
  | 'HELADA'
  | 'GRANIZO'
  | 'LLUVIA_INTENSA'
  | 'VIENTO_FUERTE'
  | 'OTRO';

export const TIPOS_EVENTO_CLIMATICO_SGTA: readonly TipoEventoClimaticoSGTA[] = [
  'HELADA',
  'GRANIZO',
  'LLUVIA_INTENSA',
  'VIENTO_FUERTE',
  'OTRO',
] as const;

export interface LoteAfectadoEventoClimatico {
  loteId: string;
  descripcionDano: string;
  superficieAfectadaHa?: number | null;
  porcentajeDano?: number | null;
}

export interface EventoClimaticoSGTAProps {
  id: string;
  fincaId: string;
  tipoEvento: TipoEventoClimaticoSGTA;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  responsableId?: string | null;
  lotesAfectados: LoteAfectadoEventoClimatico[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearEventoClimaticoSGTAParams {
  id?: string;
  fincaId: string;
  tipoEvento: TipoEventoClimaticoSGTA;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  responsableId?: string | null;
  lotesAfectados: LoteAfectadoEventoClimatico[];
}

export class EventoClimaticoSGTA {
  public readonly id: string;
  public readonly fincaId: string;
  public readonly tipoEvento: TipoEventoClimaticoSGTA;
  public readonly fecha: string;
  public readonly descripcion: string;
  public readonly responsableId: string | null;
  public readonly lotesAfectados: readonly LoteAfectadoEventoClimatico[];
  public readonly creadoEn: string;
  public readonly actualizadoEn: string;

  private constructor(props: EventoClimaticoSGTAProps) {
    this.id = props.id;
    this.fincaId = props.fincaId;
    this.tipoEvento = props.tipoEvento;
    this.fecha = props.fecha;
    this.descripcion = props.descripcion;
    this.responsableId = props.responsableId ?? null;
    this.lotesAfectados = Object.freeze([...props.lotesAfectados]);
    this.creadoEn = props.creadoEn;
    this.actualizadoEn = props.actualizadoEn;
  }

  public static reconstituir(props: EventoClimaticoSGTAProps): EventoClimaticoSGTA {
    return new EventoClimaticoSGTA(props);
  }

  public static crear(
    params: CrearEventoClimaticoSGTAParams,
    fechaReferenciaHoy?: Date
  ): EventoClimaticoSGTA {
    const id = params.id ?? crypto.randomUUID();

    if (!params.fincaId || params.fincaId.trim().length === 0) {
      throw new EventoClimaticoAdversoInvalidoError('El identificador de finca (fincaId) es obligatorio.');
    }

    if (!TIPOS_EVENTO_CLIMATICO_SGTA.includes(params.tipoEvento)) {
      throw new EventoClimaticoAdversoInvalidoError(
        `Tipo de evento adverso no válido: ${params.tipoEvento}. Tipos válidos: ${TIPOS_EVENTO_CLIMATICO_SGTA.join(', ')}.`
      );
    }

    if (!params.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) {
      throw new EventoClimaticoAdversoInvalidoError(
        'La fecha del evento debe tener formato YYYY-MM-DD conforme a ISO 8601.'
      );
    }

    const refDate = fechaReferenciaHoy ?? new Date();
    const hoyStr = refDate.toISOString().split('T')[0];
    if (params.fecha > hoyStr) {
      throw new FechaFuturaInvalidaError('La fecha del evento climático adverso no puede ser futura.');
    }

    if (!params.descripcion || params.descripcion.trim().length < 5) {
      throw new EventoClimaticoAdversoInvalidoError(
        'La descripción del evento climático adverso debe contener al menos 5 caracteres.'
      );
    }

    if (!params.lotesAfectados || !Array.isArray(params.lotesAfectados) || params.lotesAfectados.length === 0) {
      throw new EventoClimaticoAdversoInvalidoError(
        'Debe asociar al menos un lote afectado por el evento climático adverso (CU69).'
      );
    }

    const lotesValidados: LoteAfectadoEventoClimatico[] = [];
    const lotesSet = new Set<string>();

    for (const item of params.lotesAfectados) {
      if (!item.loteId || item.loteId.trim().length === 0) {
        throw new EventoClimaticoAdversoInvalidoError('Cada lote afectado debe poseer un loteId válido.');
      }
      if (lotesSet.has(item.loteId)) {
        throw new EventoClimaticoAdversoInvalidoError(
          `El lote con ID ${item.loteId} no puede repetirse en el mismo reporte de siniestro.`
        );
      }
      lotesSet.add(item.loteId);

      if (!item.descripcionDano || item.descripcionDano.trim().length < 3) {
        throw new EventoClimaticoAdversoInvalidoError(
          `La descripción del daño para el lote ${item.loteId} debe contener al menos 3 caracteres.`
        );
      }

      if (item.porcentajeDano !== undefined && item.porcentajeDano !== null) {
        if (typeof item.porcentajeDano !== 'number' || isNaN(item.porcentajeDano)) {
          throw new EventoClimaticoAdversoInvalidoError('El porcentaje de daño debe ser un valor numérico.');
        }
        if (item.porcentajeDano < 0 || item.porcentajeDano > 100) {
          throw new EventoClimaticoAdversoInvalidoError(
            `El porcentaje de daño (${item.porcentajeDano}%) para el lote ${item.loteId} debe situarse entre 0% y 100%.`
          );
        }
      }

      if (item.superficieAfectadaHa !== undefined && item.superficieAfectadaHa !== null) {
        if (typeof item.superficieAfectadaHa !== 'number' || isNaN(item.superficieAfectadaHa)) {
          throw new EventoClimaticoAdversoInvalidoError('La superficie afectada (ha) debe ser un valor numérico.');
        }
        if (item.superficieAfectadaHa <= 0) {
          throw new EventoClimaticoAdversoInvalidoError(
            `La superficie afectada (${item.superficieAfectadaHa} ha) para el lote ${item.loteId} debe ser mayor a cero.`
          );
        }
      }

      lotesValidados.push({
        loteId: item.loteId,
        descripcionDano: item.descripcionDano.trim(),
        superficieAfectadaHa: item.superficieAfectadaHa ? Number(item.superficieAfectadaHa.toFixed(2)) : null,
        porcentajeDano: item.porcentajeDano ? Number(item.porcentajeDano.toFixed(2)) : null,
      });
    }

    const ahoraIso = refDate.toISOString();

    return new EventoClimaticoSGTA({
      id,
      fincaId: params.fincaId,
      tipoEvento: params.tipoEvento,
      fecha: params.fecha,
      descripcion: params.descripcion.trim(),
      responsableId: params.responsableId ?? null,
      lotesAfectados: lotesValidados,
      creadoEn: ahoraIso,
      actualizadoEn: ahoraIso,
    });
  }
}
