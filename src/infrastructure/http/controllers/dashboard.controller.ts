import { FastifyReply, FastifyRequest } from 'fastify';
import { ObtenerDashboardResumenUseCase } from '../../../application/use-cases/obtener-dashboard-resumen.use-case.js';
import { DashboardResumenQuerySchema } from '../schemas/dashboard.schema.js';

export class DashboardController {
  constructor(private readonly obtenerDashboardResumenUseCase: ObtenerDashboardResumenUseCase) {}

  public async obtenerResumen(req: FastifyRequest, reply: FastifyReply) {
    const query = DashboardResumenQuerySchema.parse(req.query ?? {});
    const data = await this.obtenerDashboardResumenUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
