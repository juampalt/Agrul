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

export class PerdidaCosechaInvalidaError extends DomainError {
  public readonly code = 'PERDIDA_COSECHA_INVALIDA';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class CredencialesInvalidasError extends DomainError {
  public readonly code = 'CREDENCIALES_INVALIDAS';

  constructor(mensaje: string = 'Email o contraseña incorrectos.') {
    super(mensaje);
  }
}

export class UsuarioBloqueadoError extends DomainError {
  public readonly code = 'USUARIO_BLOQUEADO';

  constructor(mensaje: string = 'La cuenta se encuentra bloqueada por exceder el número máximo de intentos fallidos o por decisión administrativa (RF-M8-03).') {
    super(mensaje);
  }
}

export class UsuarioInactivoError extends DomainError {
  public readonly code = 'USUARIO_INACTIVO';

  constructor(mensaje: string = 'El usuario se encuentra inactivo y no puede iniciar sesión en la plataforma.') {
    super(mensaje);
  }
}

export class UsuarioDuplicadoError extends DomainError {
  public readonly code = 'USUARIO_DUPLICADO';

  constructor(email: string) {
    super(`Ya existe un usuario registrado con el correo electrónico '${email}'.`);
  }
}

export class AccesoDenegadoFincaError extends DomainError {
  public readonly code = 'ACCESO_DENEGADO_FINCA';

  constructor(fincaId: string) {
    super(`El usuario no tiene autorización para operar o consultar la finca '${fincaId}' (RF-M8-05 / RN-16).`);
  }
}

export class PermisoInsuficienteError extends DomainError {
  public readonly code = 'PERMISO_INSUFICIENTE';

  constructor(mensaje: string = 'No cuenta con los privilegios requeridos para ejecutar esta operación (RF-M8-04).') {
    super(mensaje);
  }
}

export class PasswordInseguraError extends DomainError {
  public readonly code = 'PASSWORD_INSEGURA';

  constructor(mensaje: string = 'La contraseña no cumple con los requisitos mínimos de seguridad (mínimo 8 caracteres, al menos una letra y un número) (RNF-04).') {
    super(mensaje);
  }
}

export class SesionExpiradaInactividadError extends DomainError {
  public readonly code = 'SESION_EXPIRADA_POR_INACTIVIDAD';

  constructor(mensaje: string = 'La sesión ha expirado por inactividad prolongada conforme a las políticas de seguridad (RF-M8-09).') {
    super(mensaje);
  }
}

export class PasswordCambioObligatorioError extends DomainError {
  public readonly code = 'PASSWORD_CAMBIO_OBLIGATORIO';

  constructor(mensaje: string = 'Debe cambiar su contraseña inicial antes de continuar operando en el sistema (RF-M8-08 / RF-M8-09).') {
    super(mensaje);
  }
}

export class AuditoriaInvalidaError extends DomainError {
  public readonly code = 'AUDITORIA_INVALIDA';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class UnidadConversionInvalidaError extends DomainError {
  public readonly code = 'UNIDAD_CONVERSION_INVALIDA';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class ProveedorInvalidoError extends DomainError {
  public readonly code = 'PROVEEDOR_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class ProveedorDuplicadoError extends DomainError {
  public readonly code = 'PROVEEDOR_DUPLICADO';

  constructor(cuit: string) {
    super(`Ya existe un proveedor registrado con el CUIT '${cuit}'.`);
  }
}

export class InsumoEquivalenciaInvalidaError extends DomainError {
  public readonly code = 'INSUMO_EQUIVALENCIA_INVALIDA';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class DepositoInvalidoError extends DomainError {
  public readonly code = 'DEPOSITO_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class DepositoIncompatibleBpaError extends DomainError {
  public readonly code = 'DEPOSITO_INCOMPATIBLE_BPA';

  constructor(mensaje: string = 'Violación de Buenas Prácticas Agrícolas (BPA): Prohibido almacenar fitosanitarios junto con fertilizantes o en depósitos incompatibles (RF-M9-19).') {
    super(mensaje);
  }
}

export class IngresoCompraInvalidoError extends DomainError {
  public readonly code = 'INGRESO_COMPRA_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class StockInicialInvalidoError extends DomainError {
  public readonly code = 'STOCK_INICIAL_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class MovimientoStockInvalidoError extends DomainError {
  public readonly code = 'MOVIMIENTO_STOCK_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class StockInsuficienteSinJustificacionError extends DomainError {
  public readonly code = 'STOCK_INSUFICIENTE_SIN_JUSTIFICACION';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class ClaveIdempotenciaDuplicadaError extends DomainError {
  public readonly code = 'CLAVE_IDEMPOTENCIA_DUPLICADA';

  constructor(clave: string) {
    super(`Ya existe una operación registrada con la clave de idempotencia '${clave}' (RN-11 / RF-M9-06).`);
  }
}

export class MovimientoYaRevertidoError extends DomainError {
  public readonly code = 'MOVIMIENTO_YA_REVERTIDO';

  constructor(id: string) {
    super(`El movimiento de stock '${id}' ya fue revertido previamente (RF-M9-07).`);
  }
}



