import { DomainError } from '../errors/domain.error.js';

export type MotivoRelacionGenealogica = 'SPLIT' | 'BLEND_MERGE' | 'REPROCESO';

export interface LoteGenealogiaProps {
  id: string;
  lotePadreId: string;
  loteHijoId: string;
  cantidadAportada: number;
  unidadMedida: string;
  motivoRelacion: MotivoRelacionGenealogica;
  fechaUtc: string;
}

export class RelacionGenealogicaInvalidaError extends DomainError {
  public readonly code = 'INVALID_GENEALOGY_RELATION';
  constructor(motivo: string) {
    super(`Relación genealógica inválida: ${motivo}`);
  }
}

/**
 * Representa una arista orientada en el Grafo de Linaje de Trazabilidad (N:M).
 * Conecta un lote origen (padre) con un lote resultante (hijo).
 */
export class LoteGenealogia {
  private constructor(private readonly props: Readonly<LoteGenealogiaProps>) {}

  public static crear(props: Omit<LoteGenealogiaProps, 'fechaUtc'> & { fechaUtc?: string }): LoteGenealogia {
    if (!props.lotePadreId || !props.loteHijoId) {
      throw new RelacionGenealogicaInvalidaError('Los IDs de lote padre e hijo son obligatorios.');
    }
    if (props.lotePadreId === props.loteHijoId) {
      throw new RelacionGenealogicaInvalidaError('Un lote no puede ser padre de sí mismo (ciclo prohibido).');
    }
    if (props.cantidadAportada <= 0) {
      throw new RelacionGenealogicaInvalidaError('La cantidad aportada debe ser estrictamente mayor a cero.');
    }

    return new LoteGenealogia(Object.freeze({
      ...props,
      fechaUtc: props.fechaUtc ?? new Date().toISOString(),
    }));
  }

  public get id(): string { return this.props.id; }
  public get lotePadreId(): string { return this.props.lotePadreId; }
  public get loteHijoId(): string { return this.props.loteHijoId; }
  public get cantidadAportada(): number { return this.props.cantidadAportada; }
  public get unidadMedida(): string { return this.props.unidadMedida; }
  public get motivoRelacion(): MotivoRelacionGenealogica { return this.props.motivoRelacion; }
  public get fechaUtc(): string { return this.props.fechaUtc; }

  public toJSON(): Readonly<LoteGenealogiaProps> {
    return { ...this.props };
  }
}
