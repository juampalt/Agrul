import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CrearDestinatarioUseCase,
  ListarDestinatariosUseCase,
  ObtenerDestinatarioPorIdUseCase,
  RegistrarDespachoUseCase,
  ConsultarSaldoCosechaUseCase,
  ListarDespachosUseCase,
  ObtenerDespachoPorIdUseCase,
} from '../../../application/use-cases/despachos.use-cases.js';
import {
  CrearDestinatarioBodySchema,
  ListarDestinatariosQuerySchema,
  RegistrarDespachoBodySchema,
  RegistrarDespachoParaCosechaBodySchema,
  CosechaIdParamSchema,
  DespachoIdParamSchema,
  DestinatarioIdParamSchema,
  ListarDespachosQuerySchema,
} from '../schemas/despachos.schema.js';
import { DestinatariosFiltros } from '../../../core/ports/destinatarios-repository.port.js';
import { RegistrarDespachoInputDto } from '../../../application/dtos/despachos.dto.js';

export class DespachosController {
  constructor(
    private readonly crearDestinatarioUC: CrearDestinatarioUseCase,
    private readonly listarDestinatariosUC: ListarDestinatariosUseCase,
    private readonly obtenerDestinatarioPorIdUC: ObtenerDestinatarioPorIdUseCase,
    private readonly registrarDespachoUC: RegistrarDespachoUseCase,
    private readonly consultarSaldoUC: ConsultarSaldoCosechaUseCase,
    private readonly listarDespachosUC: ListarDespachosUseCase,
    private readonly obtenerDespachoPorIdUC: ObtenerDespachoPorIdUseCase
  ) {}

  async crearDestinatario(request: FastifyRequest, reply: FastifyReply) {
    const body = CrearDestinatarioBodySchema.parse(request.body);
    const data = await this.crearDestinatarioUC.ejecutar(body);
    return reply.status(201).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarDestinatarios(request: FastifyRequest, reply: FastifyReply) {
    const query = ListarDestinatariosQuerySchema.parse(request.query ?? {});
    const filtros: DestinatariosFiltros = {
      tipo: query.tipo,
      search: query.search,
    };
    if (query.activo !== undefined) {
      filtros.activo = query.activo === 'true';
    }

    const data = await this.listarDestinatariosUC.ejecutar(filtros);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerDestinatarioPorId(request: FastifyRequest, reply: FastifyReply) {
    const { id } = DestinatarioIdParamSchema.parse(request.params);
    const data = await this.obtenerDestinatarioPorIdUC.ejecutar(id);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async registrarDespacho(request: FastifyRequest, reply: FastifyReply) {
    let input: RegistrarDespachoInputDto;

    const params = request.params as { id?: string } | undefined;
    if (params?.id) {
      const { id: cosechaId } = CosechaIdParamSchema.parse(params);
      const body = RegistrarDespachoParaCosechaBodySchema.parse(request.body);
      input = {
        ...body,
        cosechaId,
      };
    } else {
      const body = RegistrarDespachoBodySchema.parse(request.body);
      if (!body.cosechaId) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'cosechaId es obligatorio.',
            details: null,
          },
          timestamp: new Date().toISOString(),
        });
      }
      input = {
        ...body,
        cosechaId: body.cosechaId,
      };
    }

    const data = await this.registrarDespachoUC.ejecutar(input);
    return reply.status(201).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async consultarSaldo(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CosechaIdParamSchema.parse(request.params);
    const data = await this.consultarSaldoUC.ejecutar(id);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarDespachos(request: FastifyRequest, reply: FastifyReply) {
    const query = ListarDespachosQuerySchema.parse(request.query ?? {});
    const data = await this.listarDespachosUC.ejecutar(query);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarDespachosPorCosecha(request: FastifyRequest, reply: FastifyReply) {
    const { id } = CosechaIdParamSchema.parse(request.params);
    const data = await this.consultarSaldoUC.ejecutar(id);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerDespachoPorId(request: FastifyRequest, reply: FastifyReply) {
    const { id } = DespachoIdParamSchema.parse(request.params);
    const data = await this.obtenerDespachoPorIdUC.ejecutar(id);
    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
