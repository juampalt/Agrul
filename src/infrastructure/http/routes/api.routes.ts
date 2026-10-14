import { FastifyInstance } from 'fastify';
import { LotesController } from '../controllers/lotes.controller.js';
import { EventosController } from '../controllers/eventos.controller.js';
import { LinajeController } from '../controllers/linaje.controller.js';
import { FincasController } from '../controllers/fincas.controller.js';

export interface ApiRoutesDependencies {
  lotesController: LotesController;
  eventosController: EventosController;
  linajeController: LinajeController;
  fincasController?: FincasController;
}

export function registerApiRoutes(fastify: FastifyInstance, deps: ApiRoutesDependencies) {
  fastify.register(
    async (v1) => {
      // Healthcheck
      v1.get('/health', async () => ({
        success: true,
        data: { status: 'healthy', service: 'agrul-api', version: '0.1.0' },
        error: null,
        timestamp: new Date().toISOString(),
      }));

      // Fincas (Módulo 1)
      if (deps.fincasController) {
        v1.get('/fincas', (req, rep) => deps.fincasController!.listar(req, rep));
        v1.post('/fincas', (req, rep) => deps.fincasController!.crear(req, rep));
        v1.get('/fincas/:id', (req, rep) => deps.fincasController!.obtenerPorId(req, rep));
      }

      // Lotes
      v1.get('/lotes', (req, rep) => deps.lotesController.listar(req, rep));
      v1.post('/lotes', (req, rep) => deps.lotesController.crear(req, rep));
      v1.post('/lotes/merge', (req, rep) => deps.lotesController.fusionar(req, rep));
      v1.get('/lotes/:id', (req, rep) => deps.lotesController.obtenerPorId(req, rep));
      v1.post('/lotes/:id/split', (req, rep) => deps.lotesController.dividir(req, rep));
      v1.get('/lotes/:id/qr', (req, rep) => deps.lotesController.generarQr(req, rep));
      v1.get('/lotes/:id/qr/image', (req, rep) => deps.lotesController.descargarQrImagen(req, rep));
      v1.get('/lotes/:id/ficha-imprimible', (req, rep) => deps.lotesController.generarFichaImprimible(req, rep));

      // Eventos de un Lote
      v1.post('/lotes/:id/eventos', (req, rep) => deps.eventosController.registrar(req, rep));
      v1.get('/lotes/:id/eventos', (req, rep) => deps.eventosController.listarPorLote(req, rep));

      // Linaje y Trazabilidad (N:M)
      v1.get('/lotes/:id/linaje', (req, rep) => deps.linajeController.obtenerLinaje(req, rep));

      // Sincronización Batch Offline
      v1.post('/eventos/sincronizar', (req, rep) => deps.eventosController.sincronizarBatchOffline(req, rep));
    },
    { prefix: '/api/v1' }
  );
}
