import { FastifyInstance } from 'fastify';
import { LotesController } from '../controllers/lotes.controller.js';
import { EventosController } from '../controllers/eventos.controller.js';
import { LinajeController } from '../controllers/linaje.controller.js';

export interface ApiRoutesDependencies {
  lotesController: LotesController;
  eventosController: EventosController;
  linajeController: LinajeController;
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

      // Lotes
      v1.post('/lotes', (req, rep) => deps.lotesController.crear(req, rep));
      v1.get('/lotes/:id', (req, rep) => deps.lotesController.obtenerPorId(req, rep));

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
