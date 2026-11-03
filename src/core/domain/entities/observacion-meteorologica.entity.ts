import crypto from 'node:crypto';
import {
  ObservacionMeteorologicaInvalidaError,
  FechaFuturaInvalidaError,
} from '../errors/domain.error.js';

export interface ObservacionMeteorologicaProps {
  id: string;
  fincaId: string;
  fechaHoraObservacion: string; // ISO 8601
  temperaturaC: number;
  humedadRelativa: number;
  precipitacionesMm: number;
  observaciones?: string | null;
  responsableId?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearObservacionMeteorologicaParams {
  id?: string;
  fincaId: string;
  fechaHoraObservacion: string;
  temperaturaC: number;
  humedadRelativa: number;
  precipitacionesMm: number;
  observaciones?: string | null;
  responsableId?: string | null;
}

export class ObservacionMeteorologica {
  public readonly id: string;
  public readonly fincaId: string;
  public readonly fechaHoraObservacion: string;
  public readonly temperaturaC: number;
  public readonly humedadRelativa: number;
  public readonly precipitacionesMm: number;
  public readonly observaciones: string | null;
  public readonly responsableId: string | null;
  public readonly creadoEn: string;
  public readonly actualizadoEn: string;

  private constructor(props: ObservacionMeteorologicaProps) {
    this.id = props.id;
    this.fincaId = props.fincaId;
    this.fechaHoraObservacion = props.fechaHoraObservacion;
    this.temperaturaC = props.temperaturaC;
    this.humedadRelativa = props.humedadRelativa;
    this.precipitacionesMm = props.precipitacionesMm;
    this.observaciones = props.observaciones ?? null;
    this.responsableId = props.responsableId ?? null;
    this.creadoEn = props.creadoEn;
    this.actualizadoEn = props.actualizadoEn;
  }

  public static reconstituir(props: ObservacionMeteorologicaProps): ObservacionMeteorologica {
    return new ObservacionMeteorologica(props);
  }

  public static crear(
    params: CrearObservacionMeteorologicaParams,
    fechaReferenciaHoy?: Date
  ): ObservacionMeteorologica {
    const id = params.id ?? crypto.randomUUID();

    if (!params.fincaId || params.fincaId.trim().length === 0) {
      throw new ObservacionMeteorologicaInvalidaError('El identificador de finca (fincaId) es obligatorio.');
    }

    if (!params.fechaHoraObservacion || isNaN(Date.parse(params.fechaHoraObservacion))) {
      throw new ObservacionMeteorologicaInvalidaError('La fecha y hora de observación debe ser una fecha ISO válida.');
    }

    // Validación de fecha no futura (tolerancia de 5 minutos para sincronizaciones)
    const fechaObs = new Date(params.fechaHoraObservacion);
    const ahora = fechaReferenciaHoy ?? new Date();
    const toleranciaMs = 5 * 60 * 1000;
    if (fechaObs.getTime() > ahora.getTime() + toleranciaMs) {
      throw new FechaFuturaInvalidaError(
        'La fecha y hora de la observación no puede ser futura respecto al momento de registro.'
      );
    }

    // Regla de Negocio RN-28: Validación estricta de rangos físicos
    if (typeof params.temperaturaC !== 'number' || isNaN(params.temperaturaC)) {
      throw new ObservacionMeteorologicaInvalidaError('La temperatura (°C) debe ser un valor numérico.');
    }
    if (params.temperaturaC < -50 || params.temperaturaC > 65) {
      throw new ObservacionMeteorologicaInvalidaError(
        `La temperatura (${params.temperaturaC} °C) excede los rangos meteorológicos físicos plausibles (-50°C a 65°C).`
      );
    }

    if (typeof params.humedadRelativa !== 'number' || isNaN(params.humedadRelativa)) {
      throw new ObservacionMeteorologicaInvalidaError('La humedad relativa (%) debe ser un valor numérico.');
    }
    if (params.humedadRelativa < 0 || params.humedadRelativa > 100) {
      throw new ObservacionMeteorologicaInvalidaError(
        `La humedad relativa (${params.humedadRelativa}%) es físicamente inválida (debe estar entre 0% y 100%, RN-28).`
      );
    }

    if (typeof params.precipitacionesMm !== 'number' || isNaN(params.precipitacionesMm)) {
      throw new ObservacionMeteorologicaInvalidaError('Las precipitaciones (mm) deben ser un valor numérico.');
    }
    if (params.precipitacionesMm < 0) {
      throw new ObservacionMeteorologicaInvalidaError(
        `La precipitación (${params.precipitacionesMm} mm) no puede ser negativa (RN-28).`
      );
    }

    const ahoraIso = ahora.toISOString();

    return new ObservacionMeteorologica({
      id,
      fincaId: params.fincaId,
      fechaHoraObservacion: fechaObs.toISOString(),
      temperaturaC: Number(params.temperaturaC.toFixed(1)),
      humedadRelativa: Number(params.humedadRelativa.toFixed(2)),
      precipitacionesMm: Number(params.precipitacionesMm.toFixed(1)),
      observaciones: params.observaciones ?? null,
      responsableId: params.responsableId ?? null,
      creadoEn: ahoraIso,
      actualizadoEn: ahoraIso,
    });
  }
}
