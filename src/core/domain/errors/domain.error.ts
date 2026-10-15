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

export class CicloNoAbiertoError extends DomainError {
  public readonly code = 'CICLO_NO_ABIERTO';

  constructor(mensaje: string = 'El ciclo productivo debe encontrarse en estado ABIERTO para registrar labores ejecutadas (RN-03).') {
    super(mensaje);
  }
}

export class FechaFuturaInvalidaError extends DomainError {
  public readonly code = 'FECHA_FUTURA_INVALIDA';

  constructor(fecha: string) {
    super(`La fecha del hecho '${fecha}' no puede ser posterior a la fecha actual para actividades realizadas (RN-04).`);
  }
}

export class InconsistenciaLoteCicloError extends DomainError {
  public readonly code = 'INCONSISTENCIA_LOTE_CICLO';

  constructor(mensaje: string = 'El ciclo productivo no corresponde al lote especificado (RN-01).') {
    super(mensaje);
  }
}

export class DesgloseCosechaInvalidoError extends DomainError {
  public readonly code = 'DESGLOSE_COSECHA_INVALIDO';

  constructor(cosechada: number, comercializable: number, descarte: number) {
    super(
      `Desglose de cosecha inválido (RN-09): La suma de cantidad comercializable (${comercializable} kg) y cantidad de descarte (${descarte} kg) debe coincidir exactamente con el total cosechado (${cosechada} kg).`
    );
  }
}

export class CosechaInvalidaError extends DomainError {
  public readonly code = 'COSECHA_INVALIDA';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class SaldoComercializableExcedidoError extends DomainError {
  public readonly code = 'SALDO_COMERCIALIZABLE_EXCEDIDO';

  constructor(disponible: number, solicitado: number) {
    super(
      `Saldo comercializable insuficiente (RN-09): Disponible ${disponible} kg, se intentó despachar ${solicitado} kg.`
    );
  }
}

export class DespachoInvalidoError extends DomainError {
  public readonly code = 'DESPACHO_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class DestinatarioInvalidoError extends DomainError {
  public readonly code = 'DESTINATARIO_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

