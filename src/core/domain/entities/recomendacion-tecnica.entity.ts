import { DomainError } from '../errors/domain.error.js';

export class RecomendacionTecnicaInvalidaError extends DomainError {
  public readonly code = 'INVALID_TECHNICAL_RECOMMENDATION';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export interface RecomendacionTecnicaProps {
  agronomoEmisor: string;
  nroMatricula?: string | null;
  documentoUrl?: string | null;
  firmaDigital?: string | null;
  fechaEmision?: string | null;
  observaciones?: string | null;
}

/**
 * Entidad / Value Object que modela la Recomendación Técnica Profesional (RF-M4-08).
 * Permite registrar al agrónomo asesor, matrícula, firma digital o documento PDF adjunto.
 */
export class RecomendacionTecnica {
  private constructor(private readonly props: RecomendacionTecnicaProps) {}

  public static crear(props: RecomendacionTecnicaProps): RecomendacionTecnica {
    if (!props.agronomoEmisor || props.agronomoEmisor.trim().length < 2) {
      throw new RecomendacionTecnicaInvalidaError(
        'El nombre del agrónomo emisor es obligatorio y debe contener al menos 2 caracteres (RF-M4-08).'
      );
    }

    return new RecomendacionTecnica({
      agronomoEmisor: props.agronomoEmisor.trim(),
      nroMatricula: props.nroMatricula ? props.nroMatricula.trim() : null,
      documentoUrl: props.documentoUrl ? props.documentoUrl.trim() : null,
      firmaDigital: props.firmaDigital ? props.firmaDigital.trim() : null,
      fechaEmision: props.fechaEmision ? props.fechaEmision.trim() : null,
      observaciones: props.observaciones ? props.observaciones.trim() : null,
    });
  }

  public get agronomoEmisor(): string {
    return this.props.agronomoEmisor;
  }

  public get nroMatricula(): string | null | undefined {
    return this.props.nroMatricula;
  }

  public get documentoUrl(): string | null | undefined {
    return this.props.documentoUrl;
  }

  public get firmaDigital(): string | null | undefined {
    return this.props.firmaDigital;
  }

  public get fechaEmision(): string | null | undefined {
    return this.props.fechaEmision;
  }

  public get observaciones(): string | null | undefined {
    return this.props.observaciones;
  }

  public toJSON(): RecomendacionTecnicaProps {
    return { ...this.props };
  }
}
