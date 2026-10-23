import crypto from 'node:crypto';
import {
  MedicionClimaticaInvalidaError,
  FechaFuturaInvalidaError,
} from '../errors/domain.error.js';

export type FuenteDatoClima =
  | 'MEDICION_PROPIA'
  | 'ESTACION_PROPIA'
  | 'SERVICIO_EXTERNO'
  | 'DATO_ZONA';

export const FUENTES_DATO_VALIDAS: FuenteDatoClima[] = [
  'MEDICION_PROPIA',
  'ESTACION_PROPIA',
  'SERVICIO_EXTERNO',
  'DATO_ZONA',
];

export interface MedicionClimaticaProps {
  id?: string;
  fincaId: string;
  fecha: string; // YYYY-MM-DD
  tempMinC?: number | null;
  tempMaxC?: number | null;
  tempMediaC?: number | null;
  precipitacionMm: number;
  humedadRelativaPct?: number | null;
  vientoKmH?: number | null;
  huboHelada?: boolean | null;
  huboGranizo?: boolean | null;
  fuenteDato: FuenteDatoClima;

  observaciones?: string | null;
  esCorreccion?: boolean;
  medicionOriginalId?: string | null;
  motivoCorreccion?: string | null;
  usuarioCargaId?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
  fechaReferenciaHoy?: Date;
}

export class MedicionClimatica {
  public readonly id: string;
  public readonly fincaId: string;
  public readonly fecha: string;
  public readonly tempMinC: number | null;
  public readonly tempMaxC: number | null;
  public readonly tempMediaC: number | null;
  public readonly precipitacionMm: number;
  public readonly humedadRelativaPct: number | null;
  public readonly vientoKmH: number | null;
  public readonly huboHelada: boolean;
  public readonly huboGranizo: boolean;
  public readonly fuenteDato: FuenteDatoClima;
  public readonly observaciones: string | null;
  public readonly esCorreccion: boolean;
  public readonly medicionOriginalId: string | null;
  public readonly motivoCorreccion: string | null;
  public readonly usuarioCargaId: string | null;
  public readonly creadoEn: string;
  public readonly actualizadoEn: string;

  private constructor(props: {
    id: string;
    fincaId: string;
    fecha: string;
    tempMinC: number | null;
    tempMaxC: number | null;
    tempMediaC: number | null;
    precipitacionMm: number;
    humedadRelativaPct: number | null;
    vientoKmH: number | null;
    huboHelada: boolean;
    huboGranizo: boolean;
    fuenteDato: FuenteDatoClima;
    observaciones: string | null;
    esCorreccion: boolean;
    medicionOriginalId: string | null;
    motivoCorreccion: string | null;
    usuarioCargaId: string | null;
    creadoEn: string;
    actualizadoEn: string;
  }) {
    this.id = props.id;
    this.fincaId = props.fincaId;
    this.fecha = props.fecha;
    this.tempMinC = props.tempMinC;
    this.tempMaxC = props.tempMaxC;
    this.tempMediaC = props.tempMediaC;
    this.precipitacionMm = props.precipitacionMm;
    this.humedadRelativaPct = props.humedadRelativaPct;
    this.vientoKmH = props.vientoKmH;
    this.huboHelada = props.huboHelada;
    this.huboGranizo = props.huboGranizo;
    this.fuenteDato = props.fuenteDato;
    this.observaciones = props.observaciones;
    this.esCorreccion = props.esCorreccion;
    this.medicionOriginalId = props.medicionOriginalId;
    this.motivoCorreccion = props.motivoCorreccion;
    this.usuarioCargaId = props.usuarioCargaId;
    this.creadoEn = props.creadoEn;
    this.actualizadoEn = props.actualizadoEn;
  }

  public static crear(props: MedicionClimaticaProps): MedicionClimatica {
    if (!props.fincaId || props.fincaId.trim().length === 0) {
      throw new MedicionClimaticaInvalidaError('El fincaId es obligatorio para registrar la medición.');
    }

    if (!props.fecha || props.fecha.trim().length === 0) {
      throw new MedicionClimaticaInvalidaError('La fecha de la medición meteorológica es obligatoria.');
    }

    const fechaNormalizada = props.fecha.trim().slice(0, 10);
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fechaNormalizada)) {
      throw new MedicionClimaticaInvalidaError(`El formato de la fecha '${props.fecha}' es inválido (esperado: YYYY-MM-DD).`);
    }

    // Regla de Negocio RN-04: La fecha de la medición no puede ser futura
    const hoyRef = props.fechaReferenciaHoy ?? new Date();
    const hoyStr = hoyRef.toISOString().slice(0, 10);
    if (fechaNormalizada > hoyStr) {
      throw new FechaFuturaInvalidaError(props.fecha);
    }

    if (!props.fuenteDato || !FUENTES_DATO_VALIDAS.includes(props.fuenteDato)) {
      throw new MedicionClimaticaInvalidaError(
        `La fuente de datos '${props.fuenteDato}' no es válida (RF-M10-02). Valores permitidos: ${FUENTES_DATO_VALIDAS.join(', ')}.`
      );
    }

    // Validaciones de integridad física (RF-M10-05)
    if (
      typeof props.precipitacionMm !== 'number' ||
      Number.isNaN(props.precipitacionMm) ||
      props.precipitacionMm < 0
    ) {
      throw new MedicionClimaticaInvalidaError(
        'La precipitación acumulada no puede ser negativa (RF-M10-05).'
      );
    }

    if (
      props.humedadRelativaPct !== undefined &&
      props.humedadRelativaPct !== null
    ) {
      if (
        typeof props.humedadRelativaPct !== 'number' ||
        Number.isNaN(props.humedadRelativaPct) ||
        props.humedadRelativaPct < 0 ||
        props.humedadRelativaPct > 100
      ) {
        throw new MedicionClimaticaInvalidaError(
          'La humedad relativa debe estar comprendida entre 0% y 100% (RF-M10-05).'
        );
      }
    }

    if (props.vientoKmH !== undefined && props.vientoKmH !== null) {
      if (
        typeof props.vientoKmH !== 'number' ||
        Number.isNaN(props.vientoKmH) ||
        props.vientoKmH < 0
      ) {
        throw new MedicionClimaticaInvalidaError(
          'La velocidad del viento no puede ser negativa (RF-M10-05).'
        );
      }
    }

    const tempMin = props.tempMinC !== undefined ? props.tempMinC : null;
    const tempMax = props.tempMaxC !== undefined ? props.tempMaxC : null;

    if (tempMin !== null && tempMax !== null) {
      if (tempMin > tempMax) {
        throw new MedicionClimaticaInvalidaError(
          `Inconsistencia térmica física: la temperatura mínima (${tempMin}°C) no puede superar a la máxima (${tempMax}°C) (RF-M10-05).`
        );
      }
    }

    // Cálculo automático de temperatura media si no se envió explícitamente
    let tempMedia: number | null = props.tempMediaC !== undefined ? props.tempMediaC : null;
    if (tempMedia === null && tempMin !== null && tempMax !== null) {
      tempMedia = Number(((tempMin + tempMax) / 2).toFixed(2));
    }

    // Detección automática o explícita de helada
    let huboHelada = props.huboHelada;
    if (huboHelada === undefined || huboHelada === null) {
      huboHelada = tempMin !== null && tempMin <= 0;
    }

    const huboGranizo = Boolean(props.huboGranizo);

    // Regla de Inmutabilidad histórica / Correcciones (RF-M10-06 / RN-06)
    const esCorreccion = Boolean(props.esCorreccion);
    let medicionOriginalId = props.medicionOriginalId ?? null;
    let motivoCorreccion = props.motivoCorreccion?.trim() ?? null;

    if (esCorreccion) {
      if (!medicionOriginalId || medicionOriginalId.trim().length === 0) {
        throw new MedicionClimaticaInvalidaError(
          'Una corrección meteorológica requiere obligatoriamente el identificador de la medición original (RF-M10-06).'
        );
      }
      if (!motivoCorreccion || motivoCorreccion.length < 3) {
        throw new MedicionClimaticaInvalidaError(
          'El motivo de la corrección meteorológica es obligatorio para mantener la trazabilidad histórica (RF-M10-06 / RN-06).'
        );
      }
    } else {
      medicionOriginalId = null;
      motivoCorreccion = null;
    }

    const ahora = new Date().toISOString();

    return new MedicionClimatica({
      id: props.id || crypto.randomUUID(),
      fincaId: props.fincaId,
      fecha: fechaNormalizada,
      tempMinC: tempMin,
      tempMaxC: tempMax,
      tempMediaC: tempMedia,
      precipitacionMm: Number(props.precipitacionMm.toFixed(2)),
      humedadRelativaPct: props.humedadRelativaPct !== undefined && props.humedadRelativaPct !== null ? Number(props.humedadRelativaPct.toFixed(1)) : null,
      vientoKmH: props.vientoKmH !== undefined && props.vientoKmH !== null ? Number(props.vientoKmH.toFixed(1)) : null,
      huboHelada,
      huboGranizo,
      fuenteDato: props.fuenteDato,
      observaciones: props.observaciones?.trim() || null,
      esCorreccion,
      medicionOriginalId,
      motivoCorreccion,
      usuarioCargaId: props.usuarioCargaId || null,
      creadoEn: props.creadoEn || ahora,
      actualizadoEn: props.actualizadoEn || ahora,
    });
  }

  /**
   * Crea una rectificación inmutable de la medición actual (RF-M10-06 / RN-06).
   * La medición anterior no se sobreescribe ni se borra, preservando la trazabilidad.
   */
  public corregir(params: {
    motivoCorreccion: string;
    usuarioCargaId?: string | null;
    tempMinC?: number | null;
    tempMaxC?: number | null;
    tempMediaC?: number | null;
    precipitacionMm?: number | null;
    humedadRelativaPct?: number | null;
    vientoKmH?: number | null;
    huboHelada?: boolean | null;
    huboGranizo?: boolean | null;
    observaciones?: string | null;
    fuenteDato?: FuenteDatoClima | null;
    fechaReferenciaHoy?: Date;
  }): MedicionClimatica {
    return MedicionClimatica.crear({
      id: crypto.randomUUID(),
      fincaId: this.fincaId,
      fecha: this.fecha,
      tempMinC: params.tempMinC !== undefined ? params.tempMinC : this.tempMinC,
      tempMaxC: params.tempMaxC !== undefined ? params.tempMaxC : this.tempMaxC,
      tempMediaC: params.tempMediaC !== undefined ? params.tempMediaC : undefined,
      precipitacionMm: params.precipitacionMm !== undefined && params.precipitacionMm !== null ? params.precipitacionMm : this.precipitacionMm,
      humedadRelativaPct: params.humedadRelativaPct !== undefined ? params.humedadRelativaPct : this.humedadRelativaPct,
      vientoKmH: params.vientoKmH !== undefined ? params.vientoKmH : this.vientoKmH,
      huboHelada: params.huboHelada !== undefined && params.huboHelada !== null ? params.huboHelada : this.huboHelada,
      huboGranizo: params.huboGranizo !== undefined && params.huboGranizo !== null ? params.huboGranizo : this.huboGranizo,
      fuenteDato: params.fuenteDato || this.fuenteDato,
      observaciones: params.observaciones !== undefined ? params.observaciones : this.observaciones,
      esCorreccion: true,
      medicionOriginalId: this.medicionOriginalId ?? this.id, // Preserva la raíz original
      motivoCorreccion: params.motivoCorreccion,
      usuarioCargaId: params.usuarioCargaId ?? this.usuarioCargaId,
      fechaReferenciaHoy: params.fechaReferenciaHoy,
    });
  }

}
