import { FastifyRequest, FastifyReply } from 'fastify';
import { CryptoAuthService, TokenPayload } from '../../services/crypto-auth.service.js';
import { PerfilUsuario } from '../../../core/domain/entities/usuario.entity.js';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: TokenPayload;
  }
}

/**
 * Middleware para validar el encabezado Authorization con esquema Bearer token.
 */
export async function verificarAutenticacion(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const timestamp = new Date().toISOString();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      data: null,
      error: {
        code: 'TOKEN_REQUERIDO',
        message: 'Se requiere token de autenticación Bearer en el encabezado Authorization (RF-M8-03).',
        details: null,
      },
      timestamp,
    });
  }

  const token = authHeader.substring(7).trim();
  const payload = CryptoAuthService.verifyToken(token);

  if (!payload) {
    return reply.status(401).send({
      success: false,
      data: null,
      error: {
        code: 'TOKEN_INVALIDO',
        message: 'El token de autenticación es inválido o ha expirado.',
        details: null,
      },
      timestamp,
    });
  }

  request.usuario = payload;
}

/**
 * Middleware que verifica autenticación opcionalmente (si se proporciona token, lo decodifica).
 */
export async function verificarAutenticacionOpcional(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = CryptoAuthService.verifyToken(token);
    if (payload) {
      request.usuario = payload;
    }
  }
}

/**
 * Factory middleware para exigir roles específicos en un endpoint (RBAC - RF-M8-04).
 */
export function requerirRol(...rolesPermitidos: PerfilUsuario[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.usuario) {
      await verificarAutenticacion(request, reply);
      if (reply.sent) return;
    }

    const usuario = request.usuario!;
    if (!rolesPermitidos.includes(usuario.perfil)) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'PERMISO_INSUFICIENTE',
          message: `El perfil '${usuario.perfil}' no tiene autorización para esta operación. Perfiles requeridos: ${rolesPermitidos.join(', ')} (RF-M8-04).`,
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Factory middleware para exigir acceso a la finca solicitada (RF-M8-05 / RN-16).
 * Regla de negocio:
 * - ADMINISTRADOR: Acceso global transversal a todas las fincas.
 * - OTROS ROLES (ENCARGADO, OPERARIO, ASESOR_AGRONOMO): Deben tener la finca expresamente asignada.
 */
export function requerirAccesoFinca(
  fincaIdExtractor?: (request: FastifyRequest) => string | undefined
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.usuario) {
      await verificarAutenticacion(request, reply);
      if (reply.sent) return;
    }

    const usuario = request.usuario!;

    // Si es Administrador, tiene acceso irrestricto (RN-16)
    if (usuario.perfil === 'ADMINISTRADOR') {
      return;
    }

    const fincaId = fincaIdExtractor
      ? fincaIdExtractor(request)
      : (request.params as Record<string, string>)?.id ||
        (request.params as Record<string, string>)?.fincaId ||
        (request.query as Record<string, string>)?.fincaId ||
        (request.body as Record<string, string>)?.fincaId;

    if (!fincaId) {
      return; // No hay finca asociada al request para validar
    }

    const fincasAsignadas = usuario.fincas || [];
    if (!fincasAsignadas.includes(fincaId)) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'ACCESO_DENEGADO_FINCA',
          message: `El usuario no tiene autorización para operar o consultar la finca '${fincaId}' (RF-M8-05 / RN-16).`,
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware para auditar y restringir acciones del perfil ASESOR_AGRONOMO (RF-M8-10):
 * Solo puede realizar lecturas (GET) o emitir recomendaciones técnicas (POST /recomendaciones).
 */
export async function requerirPermisoAgronomo(request: FastifyRequest, reply: FastifyReply) {
  if (!request.usuario) {
    await verificarAutenticacion(request, reply);
    if (reply.sent) return;
  }

  const usuario = request.usuario!;
  if (usuario.perfil === 'ASESOR_AGRONOMO') {
    const esLectura = request.method === 'GET';
    const esRecomendacion = request.url.includes('/recomendaciones');

    if (!esLectura && !esRecomendacion) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'PERMISO_INSUFICIENTE',
          message: 'El perfil ASESOR_AGRONOMO solo tiene permisos de lectura y carga de recomendaciones técnicas (RF-M8-10).',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
