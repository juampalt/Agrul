import { FastifyInstance } from 'fastify';
import { LotesController } from '../controllers/lotes.controller.js';
import { EventosController } from '../controllers/eventos.controller.js';
import { LinajeController } from '../controllers/linaje.controller.js';
import { FincasController } from '../controllers/fincas.controller.js';
import { CatalogosController } from '../controllers/catalogos.controller.js';
import { ActividadesController } from '../controllers/actividades.controller.js';
import { MonitoreoController } from '../controllers/monitoreo.controller.js';
import { InsumosController } from '../controllers/insumos.controller.js';
import { AplicacionesController } from '../controllers/aplicaciones.controller.js';
import { CosechasController } from '../controllers/cosechas.controller.js';
import { DespachosController } from '../controllers/despachos.controller.js';

export interface ApiRoutesDependencies {
  lotesController: LotesController;
  eventosController: EventosController;
  linajeController: LinajeController;
  fincasController?: FincasController;
  catalogosController?: CatalogosController;
  actividadesController?: ActividadesController;
  monitoreoController?: MonitoreoController;
  insumosController?: InsumosController;
  aplicacionesController?: AplicacionesController;
  cosechasController?: CosechasController;
  despachosController?: DespachosController;
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

      // Actividades Agrícolas / Labores de Campo (Módulo 3 — AGRUL-021, AGRUL-023)
      if (deps.actividadesController) {
        v1.post('/actividades', (req, rep) => deps.actividadesController!.registrarActividad(req, rep));
        v1.get('/actividades', (req, rep) => deps.actividadesController!.listarActividades(req, rep));
        v1.get('/actividades/:id', (req, rep) => deps.actividadesController!.obtenerActividadPorId(req, rep));
        v1.post('/actividades/:id/anular', (req, rep) => deps.actividadesController!.anularActividad(req, rep));
      }

      // Monitoreo de Campo (Módulo 3 — AGRUL-023 / RF-M3-11)
      if (deps.monitoreoController) {
        v1.post('/monitoreo', (req, rep) => deps.monitoreoController!.registrar(req, rep));
        v1.get('/monitoreo', (req, rep) => deps.monitoreoController!.listar(req, rep));
        v1.get('/monitoreo/:id', (req, rep) => deps.monitoreoController!.obtenerPorId(req, rep));
      }

      // Catálogo de Insumos y Fichas Fitosanitarias (Módulo 4 — AGRUL-024 / RF-M4-01, RF-M4-02, RN-14)
      if (deps.insumosController) {
        v1.post('/insumos', (req, rep) => deps.insumosController!.registrar(req, rep));
        v1.get('/insumos', (req, rep) => deps.insumosController!.listar(req, rep));
        v1.get('/insumos/:id', (req, rep) => deps.insumosController!.obtenerPorId(req, rep));
      }

      // Aplicaciones Agrícolas de Campo (Módulo 4 — AGRUL-025 / RF-M4-03 a RF-M4-12)
      if (deps.aplicacionesController) {
        v1.post('/aplicaciones', (req, rep) => deps.aplicacionesController!.registrar(req, rep));
        v1.get('/aplicaciones', (req, rep) => deps.aplicacionesController!.listar(req, rep));
        v1.get('/aplicaciones/:id', (req, rep) => deps.aplicacionesController!.obtenerPorId(req, rep));

        // Validación de Carencia y Reingreso por Lote (Módulo 4 — AGRUL-026 / RF-M4-09, RN-14)
        v1.get('/lotes/:id/carencia', (req, rep) => deps.aplicacionesController!.verificarCarencia(req, rep));
        v1.get('/aplicaciones/carencia/lote/:id', (req, rep) => deps.aplicacionesController!.verificarCarencia(req, rep));

        // Consumo Acumulado de Insumos por Ciclo y Hectárea (Módulo 4 — AGRUL-027 / RF-M4-10)
        v1.get('/ciclos/:id/insumos-acumulados', (req, rep) => deps.aplicacionesController!.calcularConsumoInsumosCiclo(req, rep));
      }

      // Cosechas y Saldo Comercializable (Módulo 5 — AGRUL-028 / RF-M5-01 a RF-M5-06)
      if (deps.cosechasController) {
        v1.post('/cosechas', (req, rep) => deps.cosechasController!.registrar(req, rep));
        v1.get('/cosechas', (req, rep) => deps.cosechasController!.listar(req, rep));
        v1.get('/cosechas/:id', (req, rep) => deps.cosechasController!.obtenerPorId(req, rep));
      }

      // Destinatarios y Despachos (Módulo 5 — AGRUL-029 / RF-M5-07 a RF-M5-10, RN-09)
      if (deps.despachosController) {
        v1.post('/destinatarios', (req, rep) => deps.despachosController!.crearDestinatario(req, rep));
        v1.get('/destinatarios', (req, rep) => deps.despachosController!.listarDestinatarios(req, rep));
        v1.get('/destinatarios/:id', (req, rep) => deps.despachosController!.obtenerDestinatarioPorId(req, rep));

        v1.post('/despachos', (req, rep) => deps.despachosController!.registrarDespacho(req, rep));
        v1.get('/despachos', (req, rep) => deps.despachosController!.listarDespachos(req, rep));
        v1.get('/despachos/:id', (req, rep) => deps.despachosController!.obtenerDespachoPorId(req, rep));

        // Despachos y Saldo por Cosecha (RF-M5-07 / RF-M5-09)
        v1.post('/cosechas/:id/despachos', (req, rep) => deps.despachosController!.registrarDespacho(req, rep));
        v1.get('/cosechas/:id/despachos', (req, rep) => deps.despachosController!.listarDespachosPorCosecha(req, rep));
        v1.get('/cosechas/:id/saldo', (req, rep) => deps.despachosController!.consultarSaldo(req, rep));
      }
    },
    { prefix: '/api/v1' }
  );
}
