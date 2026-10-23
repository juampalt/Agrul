import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarMedicionClimaticaUseCase,
  CorregirMedicionClimaticaUseCase,
  ImportarMedicionesCsvUseCase,
  ConsultarMedicionesClimaticasUseCase,
  ObtenerMedicionClimaticaPorIdUseCase,
  ObtenerHistorialCorreccionesClimaUseCase,
  ObtenerContextoClimaticoLaborUseCase,
  RegistrarEventoClimaticoAdversoUseCase,
  ListarEventosClimaticosAdversosUseCase,
  ObtenerEventoClimaticoAdversoPorIdUseCase,
  CalcularResumenClimaticoCicloUseCase,
  ObtenerSerieHistoricaClimaticaLoteUseCase,
} from '../../../application/use-cases/clima.use-cases.js';
import {
  RegistrarMedicionClimaticaSchema,
  CorregirMedicionClimaticaSchema,
  ImportarCsvClimaSchema,
  ListarMedicionesClimaticasQuerySchema,
  MedicionIdParamSchema,
  ContextoClimaParamSchema,
  ContextoClimaQuerySchema,
  RegistrarEventoAdversoSchema,
  ListarEventosAdversosQuerySchema,
  EventoAdversoIdParamSchema,
  LoteIdClimaParamSchema,
  ResumenCicloClimaQuerySchema,
  SerieHistoricaClimaQuerySchema,
} from '../schemas/clima.schema.js';

export class ClimaController {
  constructor(
    private readonly registrarMedicionUC: RegistrarMedicionClimaticaUseCase,
    private readonly corregirMedicionUC: CorregirMedicionClimaticaUseCase,
    private readonly importarCsvUC: ImportarMedicionesCsvUseCase,
    private readonly consultarMedicionesUC: ConsultarMedicionesClimaticasUseCase,
    private readonly obtenerPorIdUC: ObtenerMedicionClimaticaPorIdUseCase,
    private readonly obtenerHistorialUC: ObtenerHistorialCorreccionesClimaUseCase,
    private readonly obtenerContextoUC?: ObtenerContextoClimaticoLaborUseCase,
    private readonly registrarEventoAdversoUC?: RegistrarEventoClimaticoAdversoUseCase,
    private readonly listarEventosAdversosUC?: ListarEventosClimaticosAdversosUseCase,
    private readonly obtenerEventoAdversoPorIdUC?: ObtenerEventoClimaticoAdversoPorIdUseCase,
    private readonly calcularResumenCicloUC?: CalcularResumenClimaticoCicloUseCase,
    private readonly obtenerSerieHistoricaUC?: ObtenerSerieHistoricaClimaticaLoteUseCase
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

  // ============================================================================
  // AGRUL-048: Contexto Climático, Eventos Adversos y Serie Histórica
  // ============================================================================

  public async obtenerContextoFinca(req: FastifyRequest, reply: FastifyReply) {
    if (!this.obtenerContextoUC) {
      throw new Error('ObtenerContextoClimaticoLaborUseCase no disponible.');
    }
    const { id } = ContextoClimaParamSchema.parse(req.params);
    const query = ContextoClimaQuerySchema.parse(req.query ?? {});

    const result = await this.obtenerContextoUC.execute({
      fincaId: id,
      fecha: query.fecha,
      loteId: query.loteId,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async registrarEventoAdverso(req: FastifyRequest, reply: FastifyReply) {
    if (!this.registrarEventoAdversoUC) {
      throw new Error('RegistrarEventoClimaticoAdversoUseCase no disponible.');
    }
    const body = RegistrarEventoAdversoSchema.parse(req.body);
    const usuarioId = (req as any).user?.id ?? null;

    const result = await this.registrarEventoAdversoUC.execute({
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

  public async listarEventosAdversos(req: FastifyRequest, reply: FastifyReply) {
    if (!this.listarEventosAdversosUC) {
      throw new Error('ListarEventosClimaticosAdversosUseCase no disponible.');
    }
    const query = ListarEventosAdversosQuerySchema.parse(req.query ?? {});

    const result = await this.listarEventosAdversosUC.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerEventoAdversoPorId(req: FastifyRequest, reply: FastifyReply) {
    if (!this.obtenerEventoAdversoPorIdUC) {
      throw new Error('ObtenerEventoClimaticoAdversoPorIdUseCase no disponible.');
    }
    const { id } = EventoAdversoIdParamSchema.parse(req.params);

    const result = await this.obtenerEventoAdversoPorIdUC.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerResumenCiclo(req: FastifyRequest, reply: FastifyReply) {
    if (!this.calcularResumenCicloUC) {
      throw new Error('CalcularResumenClimaticoCicloUseCase no disponible.');
    }
    const { loteId } = LoteIdClimaParamSchema.parse(req.params);
    const query = ResumenCicloClimaQuerySchema.parse(req.query ?? {});

    const result = await this.calcularResumenCicloUC.execute({
      loteId,
      ...query,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerSerieHistorica(req: FastifyRequest, reply: FastifyReply) {
    if (!this.obtenerSerieHistoricaUC) {
      throw new Error('ObtenerSerieHistoricaClimaticaLoteUseCase no disponible.');
    }
    const { loteId } = LoteIdClimaParamSchema.parse(req.params);
    const query = SerieHistoricaClimaQuerySchema.parse(req.query ?? {});

    const result = await this.obtenerSerieHistoricaUC.execute({
      loteId,
      ...query,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
