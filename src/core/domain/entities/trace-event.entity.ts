import { TipoEvento, esEventoCompensatorio } from '../value-objects/tipo-evento.vo.js';
import { DomainError } from '../errors/domain.error.js';

export interface TraceEventProps {
  id: string;
  loteId: string;
  actorId: string;
  ubicacionId: string;
  tipoEvento: TipoEvento;
  timestampCapturaLocal: string; // ISO 8601 UTC
  timestampServidor?: string;    // ISO 8601 UTC
  payloadEspecifico: Record<string, unknown>;
  eventoReferenciadoId?: string | null;
  estadoSincronizacion?: 'SINCRONIZADO' | 'PENDIENTE_AUDITORIA_OFFLINE';
}

export class TraceEventInvalidoError extends DomainError {
  public readonly code = 'INVALID_TRACE_EVENT';
  constructor(motivo: string) {
    super(`Evento de trazabilidad inválido: ${motivo}`);
  }
}

/**
 * Entidad inmutable que representa un hecho histórico en la cadena de custodia.
 * No posee ningún método setter ni modificador de estado.
 */
export class TraceEvent {
  private constructor(private readonly props: Readonly<TraceEventProps>) {}

  public static crear(props: Omit<TraceEventProps, 'timestampServidor'> & { timestampServidor?: string }): TraceEvent {
    if (!props.loteId) throw new TraceEventInvalidoError('loteId es obligatorio.');
    if (!props.actorId) throw new TraceEventInvalidoError('actorId es obligatorio.');
    if (!props.ubicacionId) throw new TraceEventInvalidoError('ubicacionId es obligatorio.');
    if (!props.tipoEvento) throw new TraceEventInvalidoError('tipoEvento es obligatorio.');
    if (!props.timestampCapturaLocal) throw new TraceEventInvalidoError('timestampCapturaLocal es obligatorio.');

    if (esEventoCompensatorio(props.tipoEvento) && !props.eventoReferenciadoId) {
      throw new TraceEventInvalidoError('Un evento compensatorio debe referenciar obligatoriamente al evento original (eventoReferenciadoId).');
    }

    const timestampServidor = props.timestampServidor ?? new Date().toISOString();

    return new TraceEvent(Object.freeze({
      ...props,
      timestampServidor,
      eventoReferenciadoId: props.eventoReferenciadoId ?? null,
      estadoSincronizacion: props.estadoSincronizacion ?? 'SINCRONIZADO',
    }));
  }

  public get id(): string { return this.props.id; }
  public get loteId(): string { return this.props.loteId; }
  public get actorId(): string { return this.props.actorId; }
  public get ubicacionId(): string { return this.props.ubicacionId; }
  public get tipoEvento(): TipoEvento { return this.props.tipoEvento; }
  public get timestampCapturaLocal(): string { return this.props.timestampCapturaLocal; }
  public get timestampServidor(): string { return this.props.timestampServidor!; }
  public get payloadEspecifico(): Readonly<Record<string, unknown>> { return this.props.payloadEspecifico; }
  public get eventoReferenciadoId(): string | null { return this.props.eventoReferenciadoId ?? null; }
  public get estadoSincronizacion(): string { return this.props.estadoSincronizacion ?? 'SINCRONIZADO'; }

  public toJSON(): Readonly<TraceEventProps> {
    return { ...this.props };
  }
}
