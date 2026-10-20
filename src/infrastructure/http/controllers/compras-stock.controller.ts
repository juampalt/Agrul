import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarIngresoCompraUseCase,
  CargarStockInicialUseCase,
  ListarIngresosCompraUseCase,
  ListarStockInicialUseCase,
} from '../../../application/use-cases/compras-stock.use-cases.js';
import {
  RegistrarIngresoCompraBodySchema,
  CargarStockInicialBodySchema,
  ListarIngresosCompraQuerySchema,
} from '../schemas/compras-stock.schema.js';

export class ComprasStockController {
  constructor(
    private readonly registrarIngresoUseCase: RegistrarIngresoCompraUseCase,
    private readonly cargarStockInicialUseCase: CargarStockInicialUseCase,
    private readonly listarIngresosUseCase: ListarIngresosCompraUseCase,
    private readonly listarStockInicialUseCase: ListarStockInicialUseCase
  ) {}

  public async registrarIngreso(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarIngresoCompraBodySchema.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioCargaId = body.usuarioCargaId ?? usuarioAuth?.id ?? null;

    const result = await this.registrarIngresoUseCase.execute({
      ...body,
      usuarioCargaId,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarIngresos(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarIngresosCompraQuerySchema.parse(req.query ?? {});
    const result = await this.listarIngresosUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async cargarStockInicial(req: FastifyRequest, reply: FastifyReply) {
    const body = CargarStockInicialBodySchema.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioCargaId = body.usuarioCargaId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.cargarStockInicialUseCase.execute({
      ...body,
      usuarioCargaId,
    });

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarStockInicial(req: FastifyRequest, reply: FastifyReply) {
    const query = req.query as { insumoId?: string; depositoId?: string } | undefined;
    const result = await this.listarStockInicialUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
