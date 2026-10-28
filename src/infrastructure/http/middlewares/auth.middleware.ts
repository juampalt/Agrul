import { FastifyRequest, FastifyReply } from 'fastify';
import { CryptoAuthService, TokenPayload } from '../../services/crypto-auth.service.js';
import { SessionInactivityService } from '../../services/session-inactivity.service.js';
import { PerfilUsuario } from '../../../core/domain/entities/usuario.entity.js';

declare module 'fastify' {
  interface FastifyInstance {
    validarSesionActual?: (payload: TokenPayload, token: string) => Promise<TokenPayload>;
  }
  interface FastifyRequest {
    usuario?: TokenPayload;
  }
}

/**
 * Middleware para validar el encabezado Authorization con esquema Bearer token y verificar expiración por inactividad.
 */
export async function verificarAutenticacion(request: FastifyRequest, reply: FastifyReply) {
  if (request.usuario) return;
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
  let payload = CryptoAuthService.verifyToken(token);

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

  if (request.server.validarSesionActual) payload = await request.server.validarSesionActual(payload, token);
  // Validación de inactividad de sesión (RF-M8-09)
  const clientHeader = request.headers['x-last-activity'];
  let clientTimeMs: number | undefined;
  if (clientHeader) {
    const parsed = parseInt(String(clientHeader), 10);
    if (!isNaN(parsed)) {
      clientTimeMs = parsed;
    }
  }

  const claveSesion = payload.jti ? `${payload.sub}:${payload.jti}` : payload.sub;
  const expirado = SessionInactivityService.verificarExpiracion(claveSesion, Date.now(), clientTimeMs);
  if (expirado) {
    return reply.status(401).send({
      success: false,
      data: null,
      error: {
        code: 'SESION_EXPIRADA_POR_INACTIVIDAD',
        message: `La sesión ha expirado por inactividad prolongada (> ${Math.round(SessionInactivityService.getTimeoutMs() / 60000)} minutos) conforme a las políticas de seguridad (RF-M8-09).`,
        details: null,
      },
      timestamp,
    });
  }

  reply.header('X-Last-Activity', Date.now().toString());
  reply.header('X-Session-Timeout-Ms', SessionInactivityService.getTimeoutMs().toString());

  request.usuario = payload;
}

/**
 * Middleware que verifica autenticación opcionalmente (si se proporciona token, lo decodifica).
 */
export async function verificarAutenticacionOpcional(request: FastifyRequest, reply: FastifyReply) {
  if (request.headers.authorization) await verificarAutenticacion(request, reply);
}

/**
 * Middleware para forzar el cambio de contraseña inicial en primer ingreso (RF-M8-08 / RF-M8-09).
 * Si debeCambiarPassword es true, restringe el acceso impidiendo cualquier operación operativa
 * excepto cambiar la contraseña o consultar el perfil propio.
 */
export async function verificarPasswordInicial(request: FastifyRequest, reply: FastifyReply) {
  if (!request.usuario) {
    await verificarAutenticacion(request, reply);
    if (reply.sent) return;
  }

  const usuario = request.usuario!;
  if (usuario.debeCambiarPassword === true) {
    const url = request.url.split('?')[0];
    const permitido =
      url.endsWith('/auth/cambiar-password') ||
      url.endsWith('/auth/me') ||
      url.endsWith('/auth/logout');

    if (!permitido) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'PASSWORD_CAMBIO_OBLIGATORIO',
          message: 'Debe cambiar su contraseña inicial antes de continuar operando en el sistema (RF-M8-08 / RF-M8-09).',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
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
 * Factory middleware para aislamiento estricto multi-organización (RNF-16).
 * Regla de negocio:
 * - Valida que el usuario pertenezca a la misma organización solicitada (vía cabecera X-Organizacion-Id, query, param o body).
 * - Los administradores tienen acceso irrestricto transversal.
 */
export function requerirAccesoOrganizacion(
  orgIdExtractor?: (request: FastifyRequest) => string | undefined
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.usuario) {
      await verificarAutenticacion(request, reply);
      if (reply.sent) return;
    }

    const usuario = request.usuario!;
    if (usuario.perfil === 'ADMINISTRADOR') {
      return;
    }

    const organizacionId = orgIdExtractor
      ? orgIdExtractor(request)
      : (request.headers['x-organizacion-id'] as string) ||
        (request.params as Record<string, string>)?.organizacionId ||
        (request.query as Record<string, string>)?.organizacionId ||
        (request.body as Record<string, string>)?.organizacionId;

    if (!organizacionId) {
      return;
    }

    if (usuario.organizacionId && usuario.organizacionId !== organizacionId) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'ACCESO_DENEGADO_ORGANIZACION',
          message: `El usuario no tiene autorización para operar en la organización '${organizacionId}' (RNF-16).`,
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
