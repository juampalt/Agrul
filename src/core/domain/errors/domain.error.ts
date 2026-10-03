export abstract class DomainError extends Error {
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class InvalidStateTransitionError extends DomainError {
  public readonly code = 'INVALID_STATE_TRANSITION';

  constructor(estadoActual: string, transicionIntentada: string) {
    super(`No es posible realizar la transición '${transicionIntentada}' desde el estado actual '${estadoActual}'.`);
  }
}

export class CantidadInsuficienteError extends DomainError {
  public readonly code = 'CANTIDAD_INSUFICIENTE';

  constructor(codigoLote: string, disponible: number, solicitada: number) {
    super(`El lote '${codigoLote}' no dispone de cantidad suficiente. Disponible: ${disponible}, Solicitada: ${solicitada}.`);
  }
}

export class EntidadNoEncontradaError extends DomainError {
  public readonly code = 'ENTITY_NOT_FOUND';

  constructor(entidad: string, id: string) {
    super(`${entidad} con identificador '${id}' no fue encontrado.`);
  }
}

export class ViolacionInmutabilidadError extends DomainError {
  public readonly code = 'VIOLACION_DE_INMUTABILIDAD';

  constructor(mensaje: string = 'Los eventos históricos de trazabilidad son estrictamente inmutables.') {
    super(mensaje);
  }
}
