import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarInsumoCatalogoUseCase,
  ListarInsumosCatalogoUseCase,
  ObtenerInsumoPorIdUseCase,
  ConfigurarStockMinimoInsumoUseCase,
} from '../../../application/use-cases/insumos-catalogo.use-cases.js';
import {
  RegistrarInsumoBodySchema,
  ConfigurarStockMinimoBodySchema,
  ListarInsumosQuerySchema,
  InsumoIdParamSchema,
} from '../schemas/insumos.schema.js';

export class InsumosController {
  constructor(
    private readonly registrarInsumoUseCase: RegistrarInsumoCatalogoUseCase,
    private readonly listarInsumosUseCase: ListarInsumosCatalogoUseCase,
    private readonly obtenerInsumoUseCase: ObtenerInsumoPorIdUseCase,
    private readonly configurarStockMinimoUseCase?: ConfigurarStockMinimoInsumoUseCase,
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarInsumoBodySchema.parse(req.body);
    const result = await this.registrarInsumoUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarInsumosQuerySchema.parse(req.query ?? {});
    const result = await this.listarInsumosUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = InsumoIdParamSchema.parse(req.params);
    const result = await this.obtenerInsumoUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async configurarStockMinimo(req: FastifyRequest, reply: FastifyReply) {
    const { id } = InsumoIdParamSchema.parse(req.params);
    const body = ConfigurarStockMinimoBodySchema.parse(req.body);

    if (!this.configurarStockMinimoUseCase) {
      throw new Error('ConfigurarStockMinimoInsumoUseCase no está inyectado.');
    }

    const result = await this.configurarStockMinimoUseCase.execute(id, body.stockMinimo);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
