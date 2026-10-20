import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  DomainError,
  EntidadNoEncontradaError,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
  UsuarioDuplicadoError,
  AccesoDenegadoFincaError,
  PermisoInsuficienteError,
} from '../../../core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from '../../../application/use-cases/crear-lote.use-case.js';
import { InsumoDuplicadoError } from '../../../application/use-cases/insumos-catalogo.use-cases.js';

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

  // 2. Credenciales inválidas / Autenticación fallida (401 Unauthorized)
  if (error instanceof CredencialesInvalidasError) {
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

  // 3. Permisos insuficientes, cuentas bloqueadas o acceso a finca no autorizado (403 Forbidden)
  if (
    error instanceof UsuarioBloqueadoError ||
    error instanceof UsuarioInactivoError ||
    error instanceof AccesoDenegadoFincaError ||
    error instanceof PermisoInsuficienteError
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
    error instanceof InsumoDuplicadoError ||
    error instanceof UsuarioDuplicadoError
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
  request.log.error(error);
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
