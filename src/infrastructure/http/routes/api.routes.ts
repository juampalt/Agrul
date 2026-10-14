import { FastifyInstance } from 'fastify';
import { LotesController } from '../controllers/lotes.controller.js';
import { EventosController } from '../controllers/eventos.controller.js';
import { LinajeController } from '../controllers/linaje.controller.js';
import { FincasController } from '../controllers/fincas.controller.js';
import { CatalogosController } from '../controllers/catalogos.controller.js';

export interface ApiRoutesDependencies {
  lotesController: LotesController;
  eventosController: EventosController;
  linajeController: LinajeController;
  fincasController?: FincasController;
  catalogosController?: CatalogosController;
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

      // Catálogos Agrícolas (Módulo 3 — AGRUL-020)
      if (deps.catalogosController) {
        // Tipos de Actividad
        v1.get('/catalogos/tipos-actividad', (req, rep) => deps.catalogosController!.listarTiposActividad(req, rep));
        v1.post('/catalogos/tipos-actividad', (req, rep) => deps.catalogosController!.crearTipoActividad(req, rep));
        v1.get('/catalogos/tipos-actividad/:id', (req, rep) => deps.catalogosController!.obtenerTipoActividadPorId(req, rep));

        // Personal y Cuadrillas
        v1.get('/catalogos/personal', (req, rep) => deps.catalogosController!.listarPersonal(req, rep));
        v1.post('/catalogos/personal', (req, rep) => deps.catalogosController!.crearPersonal(req, rep));
        v1.get('/catalogos/personal/:id', (req, rep) => deps.catalogosController!.obtenerPersonalPorId(req, rep));

        // Maquinaria Agrícola
        v1.get('/catalogos/maquinaria', (req, rep) => deps.catalogosController!.listarMaquinaria(req, rep));
        v1.post('/catalogos/maquinaria', (req, rep) => deps.catalogosController!.crearMaquinaria(req, rep));
        v1.get('/catalogos/maquinaria/:id', (req, rep) => deps.catalogosController!.obtenerMaquinariaPorId(req, rep));
      }
    },
    { prefix: '/api/v1' }
  );
}
