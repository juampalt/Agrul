import { FastifyReply, FastifyRequest } from 'fastify';
import {
  VerificarAccesoFincaUseCase,
} from '../../../application/use-cases/usuarios.use-cases.js';
import { RegistrarUsuarioUseCase } from '../../../application/use-cases/registrar-usuario.use-case.js';
import { ConsultarUsuariosUseCase } from '../../../application/use-cases/consultar-usuarios.use-case.js';
import { versionEsperada } from '../if-match.js';
import { ModificarUsuarioUseCase } from '../../../application/use-cases/modificar-usuario.use-case.js';
import {
  CrearUsuarioSchema,
  ActualizarUsuarioSchema,
  ListarUsuariosQuerySchema,
  UsuarioIdParamSchema,
  FincaIdParamSchema,
  BloquearUsuarioSchema,
} from '../schemas/usuarios.schema.js';

export class UsuariosController {
  constructor(
    private readonly crearUsuarioUC: RegistrarUsuarioUseCase,
    private readonly consultarUsuariosUC: ConsultarUsuariosUseCase,
    private readonly modificarUsuarioUC: ModificarUsuarioUseCase,
    private readonly verificarAccesoFincaUC: VerificarAccesoFincaUseCase,
  ) {}

  async crear(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearUsuarioSchema.parse(req.body);
    const resultado = await this.crearUsuarioUC.execute(body, req.usuario?.sub);

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarUsuariosQuerySchema.parse(req.query);
    const resultado = await this.consultarUsuariosUC.execute(query, req.usuario?.sub);
    reply.header('Cache-Control', 'no-store');

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = UsuarioIdParamSchema.parse(req.params);
    const resultado = await this.consultarUsuariosUC.obtener(id, req.usuario?.sub);
    reply.header('Cache-Control', 'no-store').header('ETag', `"${resultado.actualizadoEn}"`);

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async actualizar(req: FastifyRequest, reply: FastifyReply) {
    const { id } = UsuarioIdParamSchema.parse(req.params);
    const body = ActualizarUsuarioSchema.parse(req.body);
    const resultado = await this.modificarUsuarioUC.execute(id, body, req.usuario?.sub, versionEsperada(req));
    reply.header('ETag', `"${resultado.actualizadoEn}"`);

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async bloquear(req: FastifyRequest, reply: FastifyReply) {
    const { id } = UsuarioIdParamSchema.parse(req.params);
    const body = BloquearUsuarioSchema.parse(req.body ?? {});
    const resultado = await this.modificarUsuarioUC.bloquear(id, req.usuario?.sub, body.motivo);

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async desbloquear(req: FastifyRequest, reply: FastifyReply) {
    const { id } = UsuarioIdParamSchema.parse(req.params);
    BloquearUsuarioSchema.parse(req.body ?? {});
    const resultado = await this.modificarUsuarioUC.desbloquear(id, req.usuario?.sub);

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async verificarAccesoFinca(req: FastifyRequest, reply: FastifyReply) {
    const { id: fincaId } = FincaIdParamSchema.parse(req.params);
    const usuarioId = req.usuario?.sub || (req.query as { usuarioId?: string })?.usuarioId;

    if (!usuarioId) {
      return reply.status(400).send({
        success: false,
        data: null,
        error: {
          code: 'USUARIO_REQUERIDO',
          message: 'Se requiere un usuario autenticado o el parámetro usuarioId.',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const resultado = await this.verificarAccesoFincaUC.execute({
      usuarioId,
      fincaId,
    });

    if (!resultado.tieneAcceso) {
      return reply.status(403).send({
        success: false,
        data: resultado,
        error: {
          code: 'ACCESO_DENEGADO_FINCA',
          message: resultado.motivo || 'Acceso denegado a la finca.',
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
