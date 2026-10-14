import { FastifyReply, FastifyRequest } from 'fastify';
import { CrearLoteUseCase } from '../../../application/use-cases/crear-lote.use-case.js';
import { DividirLoteUseCase } from '../../../application/use-cases/dividir-lote.use-case.js';
import { FusionarLotesUseCase } from '../../../application/use-cases/fusionar-lotes.use-case.js';
import { LotesRepositoryPort } from '../../../core/ports/lotes-repository.port.js';
import { CrearLoteBodySchema, LoteIdParamSchema, ListarLotesQuerySchema } from '../schemas/lotes.schema.js';
import { DividirLoteBodySchema } from '../schemas/split-lote.schema.js';
import { FusionarLotesBodySchema } from '../schemas/merge-lote.schema.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { QRService } from '../../services/qr.service.js';

export class LotesController {
  constructor(
    private readonly crearLoteUseCase: CrearLoteUseCase,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly dividirLoteUseCase?: DividirLoteUseCase,
    private readonly fusionarLotesUseCase?: FusionarLotesUseCase
  ) {}

  async crear(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearLoteBodySchema.parse(req.body);
    const resultado = await this.crearLoteUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const lote = await this.lotesRepo.buscarPorId(id);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', id);
    }

    return reply.status(200).send({
      success: true,
      data: lote.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarLotesQuerySchema.parse(req.query ?? {});
    const lotes = await this.lotesRepo.listarTodos(query);

    return reply.status(200).send({
      success: true,
      data: lotes.map((l) => l.toJSON()),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async dividir(req: FastifyRequest, reply: FastifyReply) {
    if (!this.dividirLoteUseCase) {
      throw new Error('DividirLoteUseCase no ha sido configurado en LotesController.');
    }

    const { id } = LoteIdParamSchema.parse(req.params);
    const body = DividirLoteBodySchema.parse(req.body);

    const resultado = await this.dividirLoteUseCase.execute({
      loteId: id,
      actorId: body.actorId,
      ubicacionId: body.ubicacionId,
      hijos: body.hijos,
      motivo: body.motivo,
      timestampCapturaLocal: body.timestampCapturaLocal,
    });

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async fusionar(req: FastifyRequest, reply: FastifyReply) {
    if (!this.fusionarLotesUseCase) {
      throw new Error('FusionarLotesUseCase no ha sido configurado en LotesController.');
    }

    const body = FusionarLotesBodySchema.parse(req.body);

    const resultado = await this.fusionarLotesUseCase.execute({
      padres: body.padres,
      nuevoLote: body.nuevoLote,
      actorId: body.actorId,
      ubicacionId: body.ubicacionId,
      motivo: body.motivo,
      timestampCapturaLocal: body.timestampCapturaLocal,
    });

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async generarQr(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const lote = await this.lotesRepo.buscarPorId(id);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', id);
    }

    const codigo = lote.codigoLote.value;
    const trackingUrl = `https://agrul.app/lotes/${codigo}`;

    const [qrDataUrl, qrSvg] = await Promise.all([
      QRService.generarDataUrl(codigo),
      QRService.generarSvg(codigo),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        loteId: lote.id,
        codigoLote: codigo,
        producto: lote.producto,
        variedad: lote.variedad,
        cantidadActual: lote.cantidadActual,
        unidadMedida: lote.unidadMedida,
        estadoActual: lote.estadoActual,
        qrDataUrl,
        qrSvg,
        trackingUrl,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async descargarQrImagen(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const lote = await this.lotesRepo.buscarPorId(id);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', id);
    }

    const codigo = lote.codigoLote.value;
    const qrSvg = await QRService.generarSvg(codigo);

    reply.header('Content-Type', 'image/svg+xml');
    reply.header('Content-Disposition', `inline; filename="qr-${codigo}.svg"`);
    return reply.status(200).send(qrSvg);
  }
}

