import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarMedicionClimaticaUseCase,
  CorregirMedicionClimaticaUseCase,
  ImportarMedicionesCsvUseCase,
  ConsultarMedicionesClimaticasUseCase,
  ObtenerMedicionClimaticaPorIdUseCase,
  ObtenerHistorialCorreccionesClimaUseCase,
} from '../../../application/use-cases/clima.use-cases.js';
import {
  RegistrarMedicionClimaticaSchema,
  CorregirMedicionClimaticaSchema,
  ImportarCsvClimaSchema,
  ListarMedicionesClimaticasQuerySchema,
  MedicionIdParamSchema,
} from '../schemas/clima.schema.js';

export class ClimaController {
  constructor(
    private readonly registrarMedicionUC: RegistrarMedicionClimaticaUseCase,
    private readonly corregirMedicionUC: CorregirMedicionClimaticaUseCase,
    private readonly importarCsvUC: ImportarMedicionesCsvUseCase,
    private readonly consultarMedicionesUC: ConsultarMedicionesClimaticasUseCase,
    private readonly obtenerPorIdUC: ObtenerMedicionClimaticaPorIdUseCase,
    private readonly obtenerHistorialUC: ObtenerHistorialCorreccionesClimaUseCase
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarMedicionClimaticaSchema.parse(req.body);
    const usuarioCargaId = (req as any).user?.id ?? null;

    const result = await this.registrarMedicionUC.execute({
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

  public async corregir(req: FastifyRequest, reply: FastifyReply) {
    const { id } = MedicionIdParamSchema.parse(req.params);
    const body = CorregirMedicionClimaticaSchema.parse(req.body);
    const usuarioCargaId = (req as any).user?.id ?? null;

    const result = await this.corregirMedicionUC.execute({
      id,
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

  public async importarCsv(req: FastifyRequest, reply: FastifyReply) {
    const body = ImportarCsvClimaSchema.parse(req.body);
    const usuarioCargaId = (req as any).user?.id ?? null;

    const result = await this.importarCsvUC.execute({
      ...body,
      usuarioCargaId,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarMedicionesClimaticasQuerySchema.parse(req.query ?? {});
    const result = await this.consultarMedicionesUC.execute({
      fincaId: query.fincaId,
      fechaDesde: query.fechaDesde,
      fechaHasta: query.fechaHasta,
      soloVigentes: query.soloVigentes,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = MedicionIdParamSchema.parse(req.params);
    const result = await this.obtenerPorIdUC.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerHistorial(req: FastifyRequest, reply: FastifyReply) {
    const { id } = MedicionIdParamSchema.parse(req.params);
    const result = await this.obtenerHistorialUC.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
