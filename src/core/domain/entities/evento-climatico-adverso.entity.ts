import { FechaFuturaInvalidaError } from '../errors/domain.error.js';
import { EventoClimaticoAdversoInvalidoError } from '../errors/domain.error.js';

export type TipoSiniestroClimatico =
  | 'HELADA'
  | 'GRANIZO'
  | 'CALOR_EXTREMO'
  | 'INUNDACION'
  | 'VIENTO_FUERTE';

export const TIPOS_SINIESTRO_CLIMATICO: readonly TipoSiniestroClimatico[] = [
  'HELADA',
  'GRANIZO',
  'CALOR_EXTREMO',
  'INUNDACION',
  'VIENTO_FUERTE',
] as const;

export interface EventoClimaticoAdversoProps {
  id: string;
  fincaId: string;
  loteId: string;
  fecha: string;
  tipoSiniestro: TipoSiniestroClimatico;
  danoEstimadoPct: number;
  superficieAfectadaHa?: number | null;
  fotosUrls: string[];
  descripcion: string;
  usuarioId?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearEventoClimaticoAdversoParams {
  id: string;
  fincaId: string;
  loteId: string;
  fecha: string;
  tipoSiniestro: TipoSiniestroClimatico;
  danoEstimadoPct: number;
  superficieAfectadaHa?: number | null;
  fotosUrls?: string[];
  descripcion: string;
  usuarioId?: string | null;
}

export class EventoClimaticoAdverso {
  private constructor(private readonly props: EventoClimaticoAdversoProps) {}

  public static crear(
    params: CrearEventoClimaticoAdversoParams,
    fechaReferenciaHoy?: Date
  ): EventoClimaticoAdverso {
    if (!params.id || params.id.trim().length === 0) {
      throw new EventoClimaticoAdversoInvalidoError('El ID del evento adverso es obligatorio.');
    }
    if (!params.fincaId || params.fincaId.trim().length === 0) {
      throw new EventoClimaticoAdversoInvalidoError('El fincaId es obligatorio.');
    }
    if (!params.loteId || params.loteId.trim().length === 0) {
      throw new EventoClimaticoAdversoInvalidoError('El loteId es obligatorio.');
    }
    if (!params.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) {
      throw new EventoClimaticoAdversoInvalidoError('La fecha del siniestro debe tener formato YYYY-MM-DD (RN-04).');
    }

    // Regla RN-04: Fechas no futuras
    const refDate = fechaReferenciaHoy ?? new Date();
    const hoyStr = refDate.toISOString().split('T')[0];
    if (params.fecha > hoyStr) {
      throw new FechaFuturaInvalidaError(
        `La fecha del siniestro climático (${params.fecha}) no puede ser futura respecto a ${hoyStr} (RN-04).`
      );
    }

    if (!TIPOS_SINIESTRO_CLIMATICO.includes(params.tipoSiniestro)) {
      throw new EventoClimaticoAdversoInvalidoError(
        `El tipo de siniestro '${params.tipoSiniestro}' no es válido. Tipos permitidos: ${TIPOS_SINIESTRO_CLIMATICO.join(', ')}.`
      );
    }

    if (params.danoEstimadoPct === undefined || params.danoEstimadoPct === null || isNaN(params.danoEstimadoPct)) {
      throw new EventoClimaticoAdversoInvalidoError('El porcentaje de daño estimado es obligatorio.');
    }
    if (params.danoEstimadoPct < 0 || params.danoEstimadoPct > 100) {
      throw new EventoClimaticoAdversoInvalidoError(
        `El porcentaje de daño estimado debe estar entre 0% y 100% (recibido: ${params.danoEstimadoPct}%).`
      );
    }

    if (params.superficieAfectadaHa !== undefined && params.superficieAfectadaHa !== null) {
      if (params.superficieAfectadaHa < 0) {
        throw new EventoClimaticoAdversoInvalidoError('La superficie afectada en hectáreas no puede ser negativa.');
      }
    }

    if (!params.descripcion || params.descripcion.trim().length === 0) {
      throw new EventoClimaticoAdversoInvalidoError('La descripción detallada del siniestro es obligatoria (RF-M10-11).');
    }

    const fotos = Array.isArray(params.fotosUrls)
      ? params.fotosUrls.map(f => f.trim()).filter(f => f.length > 0)
      : [];

    const ahora = new Date().toISOString();

    return new EventoClimaticoAdverso({
      id: params.id,
      fincaId: params.fincaId,
      loteId: params.loteId,
      fecha: params.fecha,
      tipoSiniestro: params.tipoSiniestro,
      danoEstimadoPct: Number(params.danoEstimadoPct),
      superficieAfectadaHa:
        params.superficieAfectadaHa !== undefined && params.superficieAfectadaHa !== null
          ? Number(params.superficieAfectadaHa)
          : null,
      fotosUrls: fotos,
      descripcion: params.descripcion.trim(),
      usuarioId: params.usuarioId ?? null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: EventoClimaticoAdversoProps): EventoClimaticoAdverso {
    return new EventoClimaticoAdverso(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get fincaId(): string {
    return this.props.fincaId;
  }

  public get loteId(): string {
    return this.props.loteId;
  }

  public get fecha(): string {
    return this.props.fecha;
  }

  public get tipoSiniestro(): TipoSiniestroClimatico {
    return this.props.tipoSiniestro;
  }

  public get danoEstimadoPct(): number {
    return this.props.danoEstimadoPct;
  }

  public get superficieAfectadaHa(): number | null {
    return this.props.superficieAfectadaHa ?? null;
  }

  public get fotosUrls(): string[] {
    return [...this.props.fotosUrls];
  }

  public get descripcion(): string {
    return this.props.descripcion;
  }

  public get usuarioId(): string | null {
    return this.props.usuarioId ?? null;
  }

  public get creadoEn(): string {
    return this.props.creadoEn;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn;
  }

  public toJSON(): EventoClimaticoAdversoProps {
    return {
      ...this.props,
      fotosUrls: [...this.props.fotosUrls],
    };
  }
}
