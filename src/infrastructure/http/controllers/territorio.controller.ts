import { FastifyReply, FastifyRequest } from 'fastify';
import { ConsultarFincaUseCase, ModificarFincaUseCase } from '../../../application/use-cases/finca-territorial.use-cases.js';
import {
  ConsultarLotesTerritorialesUseCase,
  DesactivarLoteTerritorialUseCase,
  ModificarLoteTerritorialUseCase,
  RegistrarLoteTerritorialUseCase,
} from '../../../application/use-cases/lotes-territoriales.use-cases.js';
import {
  ConsultarLotesTerritorialesQuerySchema,
  LoteTerritorialIdParamSchema,
  ModificarFincaUnicaBodySchema,
  ModificarLoteTerritorialBodySchema,
  RegistrarLoteTerritorialBodySchema,
} from '../schemas/territorio.schema.js';

export class TerritorioController {
  constructor(
    private consultarFinca: ConsultarFincaUseCase,
    private modificarFinca: ModificarFincaUseCase,
    private registrarLote: RegistrarLoteTerritorialUseCase,
    private consultarLotes: ConsultarLotesTerritorialesUseCase,
    private modificarLote: ModificarLoteTerritorialUseCase,
    private desactivarLote: DesactivarLoteTerritorialUseCase
  ) {}

  private responder(reply: FastifyReply, status: number, data: unknown) {
    return reply.status(status).send({ success: true, data, error: null, timestamp: new Date().toISOString() });
  }

  async obtenerFinca(_req: FastifyRequest, reply: FastifyReply) {
    return this.responder(reply, 200, await this.consultarFinca.execute());
  }

  async actualizarFinca(req: FastifyRequest, reply: FastifyReply) {
    const body = ModificarFincaUnicaBodySchema.parse(req.body);
    return this.responder(reply, 200, await this.modificarFinca.execute(body));
  }

  async crearLote(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarLoteTerritorialBodySchema.parse(req.body);
    return this.responder(reply, 201, await this.registrarLote.execute(body));
  }

  async listarLotes(req: FastifyRequest, reply: FastifyReply) {
    const query = ConsultarLotesTerritorialesQuerySchema.parse(req.query ?? {});
    const { estado, ...filtros } = query;
    return this.responder(reply, 200, await this.consultarLotes.execute({ ...filtros, estadoTerritorial: estado }));
  }

  async actualizarLote(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteTerritorialIdParamSchema.parse(req.params);
    const body = ModificarLoteTerritorialBodySchema.parse(req.body);
    return this.responder(reply, 200, await this.modificarLote.execute(id, body));
  }

  async desactivar(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteTerritorialIdParamSchema.parse(req.params);
    return this.responder(reply, 200, await this.desactivarLote.execute(id));
  }
}
