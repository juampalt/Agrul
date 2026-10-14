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
import { FincasRepositoryPort } from '../../../core/ports/fincas-repository.port.js';

export class LotesController {
  constructor(
    private readonly crearLoteUseCase: CrearLoteUseCase,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly dividirLoteUseCase?: DividirLoteUseCase,
    private readonly fusionarLotesUseCase?: FusionarLotesUseCase,
    private readonly fincasRepo?: FincasRepositoryPort
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

  async generarFichaImprimible(req: FastifyRequest, reply: FastifyReply) {
    const { id } = LoteIdParamSchema.parse(req.params);
    const lote = await this.lotesRepo.buscarPorId(id);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', id);
    }

    let finca = null;
    if (lote.fincaId && this.fincasRepo) {
      finca = await this.fincasRepo.buscarPorId(lote.fincaId);
    }

    const codigo = lote.codigoLote.value;
    const [qrDataUrl, qrSvg] = await Promise.all([
      QRService.generarDataUrl(codigo),
      QRService.generarSvg(codigo),
    ]);

    let coordsFormateadas = 'No georreferenciado';
    if (lote.geometria) {
      if (lote.geometria.type === 'Point') {
        const [lng, lat] = lote.geometria.coordinates;
        coordsFormateadas = `GPS: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
      } else if (lote.geometria.type === 'Polygon') {
        const ring = lote.geometria.coordinates[0];
        const [lng, lat] = ring[0];
        coordsFormateadas = `Polígono (${ring.length - 1} vértices) — Vértice 1: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
      }
    }

    const ficha = {
      loteId: lote.id,
      codigoLote: codigo,
      producto: lote.producto,
      variedad: lote.variedad || 'Sin variedad',
      superficieHa: lote.superficieHa ?? null,
      estadoActual: lote.estadoActual,
      cantidadActual: lote.cantidadActual,
      unidadMedida: lote.unidadMedida,
      finca: finca ? {
        id: finca.id,
        nombre: finca.nombre,
        localidad: finca.ubicacion.localidad,
        provincia: finca.ubicacion.provincia,
        renspa: finca.renspa,
      } : null,
      coordenadasFormateadas: coordsFormateadas,
      geometria: lote.geometria ?? null,
      qrSvg,
      qrDataUrl,
      fechaEmision: new Date().toISOString(),
    };

    const query = req.query as { format?: string } | undefined;
    if (query?.format === 'html') {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return reply.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cartel de Cabecera — ${codigo}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; color: #111; }
            .cartel { border: 4px solid #10b981; border-radius: 12px; padding: 2rem; max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 1rem; }
            .code { font-size: 2.2rem; font-weight: 800; color: #047857; letter-spacing: 2px; }
            .details { margin: 1.5rem 0; font-size: 1.1rem; line-height: 1.6; }
            .qr { text-align: center; margin: 1.5rem 0; }
            .qr svg { width: 180px; height: 180px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="cartel">
            <div class="header">
              <h1>AGRUL — CARTEL DE CABECERA DE LOTE</h1>
              <div class="code">${codigo}</div>
            </div>
            <div class="details">
              <p><strong>Especie / Producto:</strong> ${lote.producto}</p>
              <p><strong>Variedad:</strong> ${lote.variedad || '-'}</p>
              <p><strong>Superficie:</strong> ${lote.superficieHa ? `${lote.superficieHa} ha` : 'No especificada'}</p>
              <p><strong>Establecimiento / Finca:</strong> ${finca?.nombre || 'General'}</p>
              <p><strong>Ubicación:</strong> ${coordsFormateadas}</p>
            </div>
            <div class="qr">${qrSvg}</div>
            <button onclick="window.print()">Imprimir Cartel</button>
          </div>
        </body>
        </html>
      `);
    }

    return reply.status(200).send({
      success: true,
      data: ficha,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}

