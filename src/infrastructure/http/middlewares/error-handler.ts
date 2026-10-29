import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { CodigoInsumoDuplicadoError } from '../../../core/domain/entities/insumo.entity.js';
import { OperacionInventarioDuplicadaError } from '../../../core/domain/entities/inventario-insumos.js';
import { AplicacionInsumosDuplicadaError } from '../../../core/domain/entities/aplicacion-insumos.js';
import { ConflictoCorreccionAplicacionError } from '../../../core/domain/entities/correccion-aplicacion-insumos.js';
import {
  DomainError,
  EntidadNoEncontradaError,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
  UsuarioDuplicadoError,
  AccesoDenegadoFincaError,
  PermisoInsuficienteError,
  SesionExpiradaInactividadError,
  PasswordCambioObligatorioError,
  ProveedorDuplicadoError,
} from '../../../core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from '../../../application/use-cases/crear-lote.use-case.js';
import { InsumoDuplicadoError } from '../../../application/use-cases/insumos-catalogo.use-cases.js';
import { CultivoDuplicadoError } from '../../../core/domain/entities/cultivo.entity.js';
import { VariedadDuplicadaError } from '../../../core/domain/entities/variedad.entity.js';
import { CodigoCicloDuplicadoError } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { TipoActividadDuplicadoError } from '../../../core/domain/entities/tipo-actividad-canonico.entity.js';
import { ConflictoActividadProgramadaError } from '../../../core/domain/entities/actividad-programada.entity.js';

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  const timestamp = new Date().toISOString();

  // 1. Error de validación Zod (400 Bad Request)
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no superaron la validación sintáctica.',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      timestamp,
    });
  }

  // 2. Credenciales inválidas / Autenticación fallida o expiración por inactividad (401 Unauthorized)
  if (error instanceof CredencialesInvalidasError || error instanceof SesionExpiradaInactividadError) {
    return reply.status(401).send({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: null,
      },
      timestamp,
    });
  }

  // 3. Permisos insuficientes, cuentas bloqueadas, cambio obligatorio de password o acceso a finca no autorizado (403 Forbidden)
  if (
    error instanceof UsuarioBloqueadoError ||
    error instanceof UsuarioInactivoError ||
    error instanceof AccesoDenegadoFincaError ||
    error instanceof PermisoInsuficienteError ||
    error instanceof PasswordCambioObligatorioError
  ) {
    return reply.status(403).send({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: null,
      },
      timestamp,
    });
  }

  // 4. Entidad no encontrada (404 Not Found)
  if (error instanceof EntidadNoEncontradaError) {
    return reply.status(404).send({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: null,
      },
      timestamp,
    });
  }

  // 5. Conflicto de unicidad (409 Conflict)
  if (
    error instanceof CodigoLoteDuplicadoError ||
    error instanceof CodigoInsumoDuplicadoError ||
    error instanceof OperacionInventarioDuplicadaError ||
    error instanceof AplicacionInsumosDuplicadaError ||
    error instanceof ConflictoCorreccionAplicacionError ||
    error instanceof InsumoDuplicadoError ||
    error instanceof UsuarioDuplicadoError ||
    error instanceof ProveedorDuplicadoError ||
    error instanceof CultivoDuplicadoError ||
    error instanceof VariedadDuplicadaError ||
    error instanceof CodigoCicloDuplicadoError ||
    error instanceof TipoActividadDuplicadoError ||
    error instanceof ConflictoActividadProgramadaError
  ) {
    return reply.status(409).send({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: null,
      },
      timestamp,
    });
  }

  // 4. Reglas de negocio de Dominio (422 Unprocessable Entity)
  if (error instanceof DomainError) {
    return reply.status(422).send({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: null,
      },
      timestamp,
    });
  }

  // 5. Error no controlado (500 Internal Server Error)
  // Los errores de persistencia pueden incluir consultas, parámetros o filas con credenciales.
  request.log.error({ errorType: error instanceof Error ? error.constructor.name : 'UnknownError', requestId: request.id },
    'Error interno del servidor');
  return reply.status(500).send({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno en el servidor.',
      details: null,
    },
    timestamp,
  });
}
