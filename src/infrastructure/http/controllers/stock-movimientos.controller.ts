import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarMovimientoStockUseCase,
  RevertirMovimientoStockUseCase,
  AjustarMovimientoAplicacionUseCase,
  ConsultarSaldoInsumoUseCase,
  ListarMovimientosStockUseCase,
} from '../../../application/use-cases/stock-movimientos.use-cases.js';
import {
  RegistrarMovimientoStockBodySchema,
  RevertirMovimientoStockBodySchema,
  AjustarMovimientoAplicacionBodySchema,
  ListarMovimientosStockQuerySchema,
} from '../schemas/stock-movimientos.schema.js';

export class StockMovimientosController {
  constructor(
    private readonly registrarMovimientoUC: RegistrarMovimientoStockUseCase,
    private readonly revertirMovimientoUC: RevertirMovimientoStockUseCase,
    private readonly ajustarMovimientoUC: AjustarMovimientoAplicacionUseCase,
    private readonly consultarSaldoUC: ConsultarSaldoInsumoUseCase,
    private readonly listarMovimientosUC: ListarMovimientosStockUseCase
  ) {}

  public async registrarMovimiento(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarMovimientoStockBodySchema.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioId = body.usuarioId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.registrarMovimientoUC.execute({
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

  public async revertirMovimiento(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const body = RevertirMovimientoStockBodySchema.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioId = body.usuarioId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.revertirMovimientoUC.execute({
      movimientoId: id,
      usuarioId,
      motivo: body.motivo,
      claveIdempotencia: body.claveIdempotencia,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async ajustarMovimiento(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const body = AjustarMovimientoAplicacionBodySchema.parse(req.body);
    const usuarioAuth = (req as any).usuario;
    const usuarioId = body.usuarioId ?? usuarioAuth?.id ?? '00000000-0000-0000-0000-000000000000';

    const result = await this.ajustarMovimientoUC.execute({
      movimientoAnteriorId: id,
      nuevaCantidad: body.nuevaCantidad,
      usuarioId,
      claveIdempotencia: body.claveIdempotencia,
      motivoJustificacion: body.motivoJustificacion,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async consultarSaldo(req: FastifyRequest, reply: FastifyReply) {
    const { insumoId } = req.params as { insumoId: string };
    const query = req.query as { depositoId?: string } | undefined;

    const result = await this.consultarSaldoUC.execute(insumoId, query?.depositoId);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarMovimientos(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarMovimientosStockQuerySchema.parse(req.query ?? {});
    const result = await this.listarMovimientosUC.execute(query as any);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
