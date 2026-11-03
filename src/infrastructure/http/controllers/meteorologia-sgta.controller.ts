import { FastifyReply, FastifyRequest } from 'fastify';
import {
  ConfirmarRegistroMeteorologicoUseCase,
  ConsultarObservacionesMeteorologicasUseCase,
  ConfirmarRegistroEventoUseCase,
  ConsultarEventosClimaticosUseCase,
} from '../../../application/use-cases/meteorologia-sgta.use-cases.js';
import {
  RegistrarObservacionMeteorologicaSchema,
  ListarObservacionesMeteorologicasQuerySchema,
  RegistrarEventoClimaticoSchema,
  ListarEventosClimaticosQuerySchema,
} from '../schemas/meteorologia-sgta.schema.js';

export class MeteorologiaSGTAController {
  constructor(
    private readonly confirmarRegistroMeteorologicoUC: ConfirmarRegistroMeteorologicoUseCase,
    private readonly consultarObservacionesUC: ConsultarObservacionesMeteorologicasUseCase,
    private readonly confirmarRegistroEventoUC: ConfirmarRegistroEventoUseCase,
    private readonly consultarEventosUC: ConsultarEventosClimaticosUseCase
  ) {}

  /**
   * CU67: Confirmar Registro Meteorológico
   * POST /api/v1/meteorologia
   */
  public async confirmarRegistroMeteorologico(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarObservacionMeteorologicaSchema.parse(req.body);
    const usuarioId = (req as any).user?.id ?? null;

    const data = await this.confirmarRegistroMeteorologicoUC.execute({
      ...body,
      responsableId: body.responsableId ?? usuarioId,
    });

    return reply.status(201).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * CU68: Consultar Historial de Observaciones Meteorológicas
   * GET /api/v1/meteorologia
   */
  public async consultarObservaciones(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarObservacionesMeteorologicasQuerySchema.parse(req.query);

    const data = await this.consultarObservacionesUC.execute(query);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * CU69: Confirmar Registro de Evento Climático Adverso Multilote
   * POST /api/v1/eventos-climaticos
   */
  public async confirmarRegistroEvento(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarEventoClimaticoSchema.parse(req.body);
    const usuarioId = (req as any).user?.id ?? null;

    const data = await this.confirmarRegistroEventoUC.execute({
      ...body,
      responsableId: body.responsableId ?? usuarioId,
    });

    return reply.status(201).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * CU70: Consultar Historial de Eventos Adversos y Daños por Lote y Período
   * GET /api/v1/eventos-climaticos
   */
  public async consultarEventos(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarEventosClimaticosQuerySchema.parse(req.query);

    const data = await this.consultarEventosUC.execute(query);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
