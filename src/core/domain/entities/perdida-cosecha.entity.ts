import {
  FechaFuturaInvalidaError,
  PerdidaCosechaInvalidaError,
} from '../errors/domain.error.js';

export const TIPOS_PERDIDA_VALIDOS = [
  'GRANIZO',
  'HELADA',
  'VIENTO',
  'PLAGA',
  'ENFERMEDAD',
  'ROBO',
  'OTRO',
] as const;

export type TipoPerdidaCosecha = typeof TIPOS_PERDIDA_VALIDOS[number];

export interface PerdidaCosechaProps {
  id: string;
  cosechaId?: string | null;
  loteId: string;
  cicloId?: string | null;
  fecha: string;
  tipo: TipoPerdidaCosecha;
  cantidadEstimadaKg: number;
  superficieAfectadaHa?: number | null;
  descripcion: string;
  responsableRegistroId?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPerdidaCosechaParams {
  id: string;
  cosechaId?: string | null;
  loteId: string;
  cicloId?: string | null;
  fecha: string;
  tipo: TipoPerdidaCosecha | string;
  cantidadEstimadaKg: number;
  superficieAfectadaHa?: number | null;
  descripcion: string;
  responsableRegistroId?: string | null;
  fechaReferenciaHoy?: Date;
}

export interface PerdidaCosechaJSON {
  id: string;
  cosechaId: string | null;
  loteId: string;
  cicloId: string | null;
  fecha: string;
  tipo: TipoPerdidaCosecha;
  cantidadEstimadaKg: number;
  superficieAfectadaHa: number | null;
  descripcion: string;
  responsableRegistroId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Entidad de dominio Pérdida e Incidentes Climáticos (RF-M5-14 / AGRUL-030).
 * Registra eventos climáticos, plagas, siniestros y mermas en lote o cosecha.
 */
export class PerdidaCosecha {
  private constructor(private readonly props: PerdidaCosechaProps) {}

  public static crear(params: CrearPerdidaCosechaParams): PerdidaCosecha {
    // 1. Presencia
    if (!params.id || params.id.trim().length === 0) {
      throw new PerdidaCosechaInvalidaError('El identificador de la pérdida es obligatorio.');
    }
    if (!params.loteId || params.loteId.trim().length === 0) {
      throw new PerdidaCosechaInvalidaError('El loteId es obligatorio para registrar una pérdida.');
    }
    if (!params.fecha || params.fecha.trim().length === 0) {
      throw new PerdidaCosechaInvalidaError('La fecha del incidente o pérdida es obligatoria.');
    }

    // 2. Fecha no futura (RN-04)
    const fechaHoy = params.fechaReferenciaHoy ?? new Date();
    const fechaHoyStr = fechaHoy.toISOString().slice(0, 10);
    const fechaPerdidaStr = params.fecha.trim().slice(0, 10);
    if (fechaPerdidaStr > fechaHoyStr) {
      throw new FechaFuturaInvalidaError(params.fecha);
    }

    // 3. Validación de Tipo
    const tipoNormalizado = (params.tipo || '').trim().toUpperCase() as TipoPerdidaCosecha;
    if (!TIPOS_PERDIDA_VALIDOS.includes(tipoNormalizado)) {
      throw new PerdidaCosechaInvalidaError(
        `El tipo de pérdida '${params.tipo}' es inválido. Valores permitidos: ${TIPOS_PERDIDA_VALIDOS.join(', ')}.`
      );
    }

    // 4. Cantidad estimada mayor a cero
    if (params.cantidadEstimadaKg <= 0 || isNaN(params.cantidadEstimadaKg)) {
      throw new PerdidaCosechaInvalidaError('El volumen estimado afectado en kg debe ser mayor a cero.');
    }

    // 5. Superficie afectada si está presente debe ser positiva
    if (params.superficieAfectadaHa !== undefined && params.superficieAfectadaHa !== null) {
      if (params.superficieAfectadaHa <= 0) {
        throw new PerdidaCosechaInvalidaError('La superficie afectada en hectáreas debe ser un valor positivo mayor a cero.');
      }
    }

    // 6. Descripción obligatoria
    if (!params.descripcion || params.descripcion.trim().length === 0) {
      throw new PerdidaCosechaInvalidaError('La descripción detallada del incidente o pérdida es obligatoria.');
    }

    const ahora = new Date().toISOString();

    return new PerdidaCosecha({
      id: params.id,
      cosechaId: params.cosechaId?.trim() ?? null,
      loteId: params.loteId.trim(),
      cicloId: params.cicloId?.trim() ?? null,
      fecha: fechaPerdidaStr,
      tipo: tipoNormalizado,
      cantidadEstimadaKg: Number(params.cantidadEstimadaKg.toFixed(4)),
      superficieAfectadaHa: params.superficieAfectadaHa !== undefined && params.superficieAfectadaHa !== null
        ? Number(params.superficieAfectadaHa.toFixed(2))
        : null,
      descripcion: params.descripcion.trim(),
      responsableRegistroId: params.responsableRegistroId?.trim() ?? null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(json: PerdidaCosechaJSON): PerdidaCosecha {
    return new PerdidaCosecha({
      id: json.id,
      cosechaId: json.cosechaId,
      loteId: json.loteId,
      cicloId: json.cicloId,
      fecha: json.fecha,
      tipo: json.tipo,
      cantidadEstimadaKg: json.cantidadEstimadaKg,
      superficieAfectadaHa: json.superficieAfectadaHa,
      descripcion: json.descripcion,
      responsableRegistroId: json.responsableRegistroId,
      creadoEn: json.creadoEn,
      actualizadoEn: json.actualizadoEn,
    });
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get cosechaId(): string | null { return this.props.cosechaId ?? null; }
  public get loteId(): string { return this.props.loteId; }
  public get cicloId(): string | null { return this.props.cicloId ?? null; }
  public get fecha(): string { return this.props.fecha; }
  public get tipo(): TipoPerdidaCosecha { return this.props.tipo; }
  public get cantidadEstimadaKg(): number { return this.props.cantidadEstimadaKg; }
  public get superficieAfectadaHa(): number | null { return this.props.superficieAfectadaHa ?? null; }
  public get descripcion(): string { return this.props.descripcion; }
  public get responsableRegistroId(): string | null { return this.props.responsableRegistroId ?? null; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public toJSON(): PerdidaCosechaJSON {
    return {
      id: this.props.id,
      cosechaId: this.props.cosechaId ?? null,
      loteId: this.props.loteId,
      cicloId: this.props.cicloId ?? null,
      fecha: this.props.fecha,
      tipo: this.props.tipo,
      cantidadEstimadaKg: this.props.cantidadEstimadaKg,
      superficieAfectadaHa: this.props.superficieAfectadaHa ?? null,
      descripcion: this.props.descripcion,
      responsableRegistroId: this.props.responsableRegistroId ?? null,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
