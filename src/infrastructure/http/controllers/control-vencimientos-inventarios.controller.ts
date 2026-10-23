import { FastifyReply, FastifyRequest } from 'fastify';
import {
  SugerirLotesFefoUseCase,
  ValidarLoteInsumoUseCase,
  RegistrarInventarioFisicoUseCase,
  ListarInventariosFisicosUseCase,
  RegistrarPerdidaStockUseCase,
  ReporteExistenciasValorizadasUseCase,
} from '../../../application/use-cases/control-vencimientos-inventarios.use-cases.js';
import {
  sugerirFefoSchema,
  validarLoteSchema,
  registrarInventarioFisicoSchema,
  listarInventariosFisicosSchema,
  registrarPerdidaSchema,
  reporteExistenciasValorizadasSchema,
} from '../schemas/control-vencimientos-inventarios.schema.js';

export class ControlVencimientosInventariosController {
  constructor(
    private readonly sugerirFefoUC: SugerirLotesFefoUseCase,
    private readonly validarLoteUC: ValidarLoteInsumoUseCase,
    private readonly registrarInventarioFisicoUC: RegistrarInventarioFisicoUseCase,
    private readonly listarInventariosFisicosUC: ListarInventariosFisicosUseCase,
    private readonly registrarPerdidaUC: RegistrarPerdidaStockUseCase,
    private readonly reporteValorizadoUC: ReporteExistenciasValorizadasUseCase,
  ) {}

  public async sugerirFefo(req: FastifyRequest, reply: FastifyReply) {
    const params = sugerirFefoSchema.params.parse(req.params);
    const query = sugerirFefoSchema.querystring.parse(req.query);

    const result = await this.sugerirFefoUC.execute({
      insumoId: params.insumoId,
      depositoId: query.depositoId,
      cantidadRequerida: query.cantidadRequerida,
      fechaReferencia: query.fechaReferencia,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async validarLote(req: FastifyRequest, reply: FastifyReply) {
    const body = validarLoteSchema.body.parse(req.body);

    const result = await this.validarLoteUC.execute(body);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async registrarInventarioFisico(req: FastifyRequest, reply: FastifyReply) {
    const body = registrarInventarioFisicoSchema.body.parse(req.body);
    const usuarioAuth = (req as any).usuario;

    if (usuarioAuth && !['ADMINISTRADOR', 'ENCARGADO'].includes(usuarioAuth.perfil)) {
      return reply.status(403).send({
        success: false,
        data: null,
        error: {
          code: 'PERMISO_INSUFICIENTE',
          message: `El perfil '${usuarioAuth.perfil}' no tiene autorización para auditar y registrar inventarios físicos (RF-M9-11).`,
          details: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const usuarioId = body.usuarioId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.registrarInventarioFisicoUC.execute({
      ...body,
      usuarioId,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarInventariosFisicos(req: FastifyRequest, reply: FastifyReply) {
    const query = listarInventariosFisicosSchema.querystring.parse(req.query);

    const result = await this.listarInventariosFisicosUC.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async registrarPerdida(req: FastifyRequest, reply: FastifyReply) {
    const body = registrarPerdidaSchema.body.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioId = body.usuarioId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.registrarPerdidaUC.execute({
      ...body,
      usuarioId,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async reporteValorizado(req: FastifyRequest, reply: FastifyReply) {
    const query = reporteExistenciasValorizadasSchema.querystring.parse(req.query);

    const result = await this.reporteValorizadoUC.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
