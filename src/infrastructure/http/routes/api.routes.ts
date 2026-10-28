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
import { PerdidasCosechaController } from '../controllers/perdidas-cosecha.controller.js';
import { TrazabilidadController } from '../controllers/trazabilidad.controller.js';
import { IndicadoresController } from '../controllers/indicadores.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { UsuariosController } from '../controllers/usuarios.controller.js';
import { AuthController } from '../controllers/auth.controller.js';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { ProveedoresController } from '../controllers/proveedores.controller.js';
import { InsumoEquivalenciasController } from '../controllers/insumo-equivalencias.controller.js';
import { DepositosController } from '../controllers/depositos.controller.js';
import { ComprasStockController } from '../controllers/compras-stock.controller.js';
import { StockMovimientosController } from '../controllers/stock-movimientos.controller.js';
import { ControlVencimientosInventariosController } from '../controllers/control-vencimientos-inventarios.controller.js';
import { ClimaController } from '../controllers/clima.controller.js';
import { TerritorioController } from '../controllers/territorio.controller.js';
import { LocalizacionTucumanService } from '../../../core/domain/services/localizacion-tucuman.service.js';
import { PoliticaRetencionBpaService } from '../../../core/domain/services/politica-retencion-bpa.service.js';
import {
  verificarAutenticacion,
  verificarAutenticacionOpcional,
  requerirRol,
  requerirAccesoFinca,
  requerirPermisoAgronomo,
  verificarPasswordInicial,
} from '../middlewares/auth.middleware.js';

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
  perdidasController?: PerdidasCosechaController;
  trazabilidadController?: TrazabilidadController;
  indicadoresController?: IndicadoresController;
  dashboardController?: DashboardController;
  usuariosController?: UsuariosController;
  authController?: AuthController;
  auditoriaController?: AuditoriaController;
  proveedoresController?: ProveedoresController;
  insumoEquivalenciasController?: InsumoEquivalenciasController;
  depositosController?: DepositosController;
  comprasStockController?: ComprasStockController;
  stockMovimientosController?: StockMovimientosController;
  controlVencimientosInventariosController?: ControlVencimientosInventariosController;
  climaController?: ClimaController;
  territorioController?: TerritorioController;
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

      // Localización Oficial Tucumán y Cumplimiento Normativo (RNF-12 / RNF-06 / RN-05)
      v1.get('/localizacion/config', async () => ({
        success: true,
        data: {
          zonaHoraria: LocalizacionTucumanService.ZONA_HORARIA,
          offsetHoras: LocalizacionTucumanService.OFFSET_HORAS,
          offsetString: LocalizacionTucumanService.OFFSET_STRING,
          formatoFechaVisual: LocalizacionTucumanService.FORMATO_FECHA_VISUAL,
          unidadesMetricasOficiales: LocalizacionTucumanService.UNIDADES_OFICIALES,
          politicaRetencionMinimaAnosBPA: PoliticaRetencionBpaService.ANOS_RETENCION_MINIMA,
          borradoFisicoPermitido: false,
        },
        error: null,
        timestamp: new Date().toISOString(),
      }));

      v1.get('/localizacion/tiempo-actual', async () => ({
        success: true,
        data: LocalizacionTucumanService.descomponer(new Date()),
        error: null,
        timestamp: new Date().toISOString(),
      }));

      // Fincas (Módulo 1)
      if (deps.fincasController) {
        v1.get('/fincas', (req, rep) => deps.fincasController!.listar(req, rep));
        v1.post('/fincas', (req, rep) => deps.fincasController!.crear(req, rep));
        v1.get('/fincas/:id', { preHandler: [verificarAutenticacionOpcional, requerirAccesoFinca()] }, (req, rep) => deps.fincasController!.obtenerPorId(req, rep));
      }

      if (deps.territorioController) {
        v1.get('/finca', (req, rep) => deps.territorioController!.obtenerFinca(req, rep));
        v1.put('/finca', (req, rep) => deps.territorioController!.actualizarFinca(req, rep));
        v1.post('/lotes-territorio', (req, rep) => deps.territorioController!.crearLote(req, rep));
        v1.get('/lotes-territorio', (req, rep) => deps.territorioController!.listarLotes(req, rep));
        v1.put('/lotes-territorio/:id', (req, rep) => deps.territorioController!.actualizarLote(req, rep));
        v1.patch('/lotes-territorio/:id/desactivar', (req, rep) => deps.territorioController!.desactivar(req, rep));
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
        v1.patch('/insumos/:id/stock-minimo', (req, rep) => deps.insumosController!.configurarStockMinimo(req, rep));
        v1.put('/insumos/:id/stock-minimo', (req, rep) => deps.insumosController!.configurarStockMinimo(req, rep));
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

      // Cosechas y Saldo Comercializable (Módulo 5 — AGRUL-028, AGRUL-030, AGRUL-031 / RF-M5-01 a RF-M5-06, RF-M5-11 a RF-M5-14, RN-01, RN-05, RN-06, RN-09, RN-14)
      if (deps.cosechasController) {
        v1.post('/cosechas', (req, rep) => deps.cosechasController!.registrar(req, rep));
        v1.post('/cosechas/rapida', (req, rep) => deps.cosechasController!.registrarRapida(req, rep));
        v1.post('/cosechas/movil', (req, rep) => deps.cosechasController!.registrarRapida(req, rep));
        v1.get('/cosechas', (req, rep) => deps.cosechasController!.listar(req, rep));
        v1.get('/cosechas/:id', (req, rep) => deps.cosechasController!.obtenerPorId(req, rep));
        v1.post('/cosechas/:id/anular', (req, rep) => deps.cosechasController!.anular(req, rep));
        v1.put('/cosechas/:id', (req, rep) => deps.cosechasController!.modificar(req, rep));
        v1.patch('/cosechas/:id', (req, rep) => deps.cosechasController!.modificar(req, rep));
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

      // Registro de Pérdidas e Incidentes Climáticos (Módulo 5 — AGRUL-030 / RF-M5-14)
      if (deps.perdidasController) {
        v1.post('/perdidas', (req, rep) => deps.perdidasController!.registrar(req, rep));
        v1.get('/perdidas', (req, rep) => deps.perdidasController!.listar(req, rep));
        v1.get('/perdidas/:id', (req, rep) => deps.perdidasController!.obtenerPorId(req, rep));

        // Alias canónicos bajo cosechas
        v1.post('/cosechas/perdidas', (req, rep) => deps.perdidasController!.registrar(req, rep));
        v1.get('/cosechas/perdidas', (req, rep) => deps.perdidasController!.listar(req, rep));
        v1.post('/cosechas/:id/perdidas', (req, rep) => deps.perdidasController!.registrar(req, rep));
        v1.get('/cosechas/:id/perdidas', (req, rep) => deps.perdidasController!.listar(req, rep));
      }

      // Motor de Recorrido de Trazabilidad e Informes Oficiales (Módulo 6 — AGRUL-032 / AGRUL-033 / RF-M6-01 a RF-M6-13)
      if (deps.trazabilidadController) {
        v1.get('/trazabilidad/recorrido/:identificador', (req, rep) => deps.trazabilidadController!.obtenerRecorrido(req, rep));
        v1.get('/trazabilidad/cosechas/:identificador/recorrido', (req, rep) => deps.trazabilidadController!.obtenerRecorrido(req, rep));
        v1.get('/cosechas/:identificador/recorrido', (req, rep) => deps.trazabilidadController!.obtenerRecorrido(req, rep));

        // Emisión y descarga en PDF oficial (RF-M6-08 / RF-M6-09 / RN-06)
        v1.get('/trazabilidad/recorrido/:identificador/pdf', (req, rep) => deps.trazabilidadController!.descargarPdf(req, rep));
        v1.get('/trazabilidad/cosechas/:identificador/pdf', (req, rep) => deps.trazabilidadController!.descargarPdf(req, rep));
        v1.get('/cosechas/:identificador/pdf', (req, rep) => deps.trazabilidadController!.descargarPdf(req, rep));

        // Exportación en CSV / Excel UTF-8 con unidades de medida (RF-M6-10 / RNF-11)
        v1.get('/trazabilidad/recorrido/:identificador/csv', (req, rep) => deps.trazabilidadController!.descargarCsv(req, rep));
        v1.get('/trazabilidad/cosechas/:identificador/csv', (req, rep) => deps.trazabilidadController!.descargarCsv(req, rep));
        v1.get('/cosechas/:identificador/csv', (req, rep) => deps.trazabilidadController!.descargarCsv(req, rep));

        // Endpoint unificado de emisión de informes
        v1.get('/trazabilidad/informes/:identificador', (req, rep) => deps.trazabilidadController!.emitirInforme(req, rep));
        v1.post('/trazabilidad/informes/:identificador', (req, rep) => deps.trazabilidadController!.emitirInforme(req, rep));

        // Bitácora inmutable de emisión de informes (RF-M6-13)
        v1.get('/trazabilidad/informes/logs', (req, rep) => deps.trazabilidadController!.listarLogs(req, rep));
        v1.get('/trazabilidad/informes-log', (req, rep) => deps.trazabilidadController!.listarLogs(req, rep));

        // Consulta Inversa de Insumos para Retiro Preventivo / Recall (RF-M6-12 — AGRUL-034)
        v1.get('/trazabilidad/consulta-inversa', (req, rep) => deps.trazabilidadController!.consultaInversa(req, rep));
        v1.get('/trazabilidad/recall-insumo', (req, rep) => deps.trazabilidadController!.consultaInversa(req, rep));
        v1.get('/insumos/consulta-inversa', (req, rep) => deps.trazabilidadController!.consultaInversa(req, rep));
      }

      // Rendimiento, Descarte y Métricas de Producción (Módulo 7 — AGRUL-035 / RF-M7-01, RF-M7-02, RF-M7-07, RF-M7-08, RF-M7-09, RN-09)
      if (deps.indicadoresController) {
        v1.get('/indicadores/produccion', (req, rep) => deps.indicadoresController!.obtenerMetricasProduccion(req, rep));
        v1.get('/indicadores/ciclo/:cicloId', (req, rep) => deps.indicadoresController!.obtenerIndicadoresCiclo(req, rep));
        v1.get('/ciclos/:cicloId/indicadores', (req, rep) => deps.indicadoresController!.obtenerIndicadoresCiclo(req, rep));
        v1.get('/indicadores/lote/:loteId', (req, rep) => deps.indicadoresController!.obtenerIndicadoresLote(req, rep));
        v1.get('/lotes/:loteId/indicadores', (req, rep) => deps.indicadoresController!.obtenerIndicadoresLote(req, rep));

        // Comparador de Campañas, Evolución Histórica y Relación Insumo-Producto (AGRUL-036 / RF-M7-03, RF-M7-04, RF-M7-05, RF-M7-06, RF-M7-10, RF-M7-11)
        v1.get('/indicadores/comparador', (req, rep) => deps.indicadoresController!.compararCampanas(req, rep));
        v1.get('/indicadores/comparativa', (req, rep) => deps.indicadoresController!.compararCampanas(req, rep));
        v1.get('/indicadores/campanas', (req, rep) => deps.indicadoresController!.compararCampanas(req, rep));

        // Relación Insumo-Producto y Eficiencia Agronómica
        v1.get('/indicadores/eficiencia-insumos', (req, rep) => deps.indicadoresController!.obtenerEficienciaInsumos(req, rep));
        v1.get('/indicadores/eficiencia-insumos/:cicloId', (req, rep) => deps.indicadoresController!.obtenerEficienciaInsumos(req, rep));
        v1.get('/indicadores/relacion-insumo-producto', (req, rep) => deps.indicadoresController!.obtenerEficienciaInsumos(req, rep));
        v1.get('/indicadores/relacion-insumo-producto/:cicloId', (req, rep) => deps.indicadoresController!.obtenerEficienciaInsumos(req, rep));
        v1.get('/ciclos/:cicloId/eficiencia-insumos', (req, rep) => deps.indicadoresController!.obtenerEficienciaInsumos(req, rep));
      }

      // Dashboard Operativo y Tablero Ejecutivo (AGRUL-037 / RF-M7-12, RF-M7-13, RF-M7-14)
      if (deps.dashboardController) {
        v1.get('/dashboard/resumen', (req, rep) => deps.dashboardController!.obtenerResumen(req, rep));
        v1.get('/dashboard', (req, rep) => deps.dashboardController!.obtenerResumen(req, rep));
      }

      // Autenticación y Sesión (Módulo 8 — AGRUL-038 / RF-M8-03)
      if (deps.authController) {
        v1.post('/auth/login', (req, rep) => deps.authController!.login(req, rep));
        v1.get('/auth/me', { preHandler: [verificarAutenticacion] }, (req, rep) => deps.authController!.me(req, rep));
        v1.post('/auth/cambiar-password', { preHandler: [verificarAutenticacion] }, (req, rep) => deps.authController!.cambiarPassword(req, rep));
      }

      // Gestión de Usuarios y Permisos RBAC (Módulo 8 — AGRUL-038 / RF-M8-01, RF-M8-02, RF-M8-04, RF-M8-05, RN-16)
      if (deps.usuariosController) {
        v1.post('/usuarios', { preHandler: [requerirRol('ADMIN_SISTEMA'), verificarPasswordInicial] }, (req, rep) => deps.usuariosController!.crear(req, rep));
        v1.get('/usuarios', { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO')] }, (req, rep) => deps.usuariosController!.listar(req, rep));
        v1.get('/usuarios/:id', { preHandler: [verificarAutenticacion] }, (req, rep) => deps.usuariosController!.obtenerPorId(req, rep));
        v1.put('/usuarios/:id', { preHandler: [requerirRol('ADMINISTRADOR')] }, (req, rep) => deps.usuariosController!.actualizar(req, rep));
        v1.post('/usuarios/:id/bloquear', { preHandler: [requerirRol('ADMINISTRADOR')] }, (req, rep) => deps.usuariosController!.bloquear(req, rep));
        v1.post('/usuarios/:id/desbloquear', { preHandler: [requerirRol('ADMINISTRADOR')] }, (req, rep) => deps.usuariosController!.desbloquear(req, rep));

        // Verificación de Acceso y Aislamiento por Finca (RF-M8-05 / RN-16)
        v1.get('/fincas/:id/verificar-acceso', { preHandler: [verificarAutenticacion] }, (req, rep) => deps.usuariosController!.verificarAccesoFinca(req, rep));
      }

      // Bitácora Centralizada de Auditoría y Seguridad de Sesión (Módulo 8 — AGRUL-040 / RF-M8-08, RF-M8-09, RN-06)
      if (deps.auditoriaController) {
        v1.get('/auditoria', { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] }, (req, rep) => deps.auditoriaController!.listar(req, rep));
        v1.get('/auditoria/:id', { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] }, (req, rep) => deps.auditoriaController!.obtenerPorId(req, rep));
        v1.post('/auditoria/simular-inactividad', (req, rep) => deps.auditoriaController!.simularInactividad(req, rep));
      }

      // Catálogo de Proveedores (Módulo 9 — AGRUL-041 / RF-M9-01)
      if (deps.proveedoresController) {
        v1.post('/proveedores', (req, rep) => deps.proveedoresController!.registrar(req, rep));
        v1.get('/proveedores', (req, rep) => deps.proveedoresController!.listar(req, rep));
        v1.get('/proveedores/:id', (req, rep) => deps.proveedoresController!.obtenerPorId(req, rep));
        v1.put('/proveedores/:id', (req, rep) => deps.proveedoresController!.actualizar(req, rep));
      }

      // Equivalencias y Conversión de Unidades de Insumos (Módulo 9 — AGRUL-041 / RF-M9-01, RF-M9-14, RN-12)
      if (deps.insumoEquivalenciasController) {
        v1.post('/insumos/:id/equivalencias', (req, rep) => deps.insumoEquivalenciasController!.registrarEquivalencia(req, rep));
        v1.get('/insumos/:id/equivalencias', (req, rep) => deps.insumoEquivalenciasController!.listarEquivalencias(req, rep));
        v1.post('/insumos/:id/convertir-unidad', (req, rep) => deps.insumoEquivalenciasController!.convertirUnidad(req, rep));
        v1.post('/insumos/:id/convertir', (req, rep) => deps.insumoEquivalenciasController!.convertirUnidad(req, rep));
        v1.post('/insumos/conversiones/convertir', (req, rep) => deps.insumoEquivalenciasController!.convertirUnidad(req, rep));
      }

      // Depósitos de Almacenamiento y Segregación Física BPA (Módulo 9 — AGRUL-042 / RF-M9-19)
      if (deps.depositosController) {
        v1.post('/depositos', (req, rep) => deps.depositosController!.crear(req, rep));
        v1.get('/depositos', (req, rep) => deps.depositosController!.listar(req, rep));
        v1.get('/depositos/:id', (req, rep) => deps.depositosController!.obtenerPorId(req, rep));
      }

      // Ingresos por Compra y Saldo Inicial de Insumos (Módulo 9 — AGRUL-042 / RF-M9-03, RF-M9-05)
      if (deps.comprasStockController) {
        v1.post('/stock/ingresos-compra', (req, rep) => deps.comprasStockController!.registrarIngreso(req, rep));
        v1.get('/stock/ingresos-compra', (req, rep) => deps.comprasStockController!.listarIngresos(req, rep));
        v1.post('/stock/saldo-inicial', (req, rep) => deps.comprasStockController!.cargarStockInicial(req, rep));
        v1.get('/stock/saldo-inicial', (req, rep) => deps.comprasStockController!.listarStockInicial(req, rep));
      }

      // Libro Mayor de Movimientos de Stock y Ledger (Módulo 9 — AGRUL-043 / RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15, RN-10, RN-11)
      if (deps.stockMovimientosController) {
        v1.post('/stock/movimientos', (req, rep) => deps.stockMovimientosController!.registrarMovimiento(req, rep));
        v1.get('/stock/movimientos', (req, rep) => deps.stockMovimientosController!.listarMovimientos(req, rep));
        v1.post('/stock/movimientos/:id/revertir', (req, rep) => deps.stockMovimientosController!.revertirMovimiento(req, rep));
        v1.post('/stock/movimientos/:id/ajustar', (req, rep) => deps.stockMovimientosController!.ajustarMovimiento(req, rep));
        v1.get('/stock/saldos/:insumoId', (req, rep) => deps.stockMovimientosController!.consultarSaldo(req, rep));
        v1.get('/stock/disponibilidad/:insumoId', (req, rep) => deps.stockMovimientosController!.consultarSaldo(req, rep));
      }

      // Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas (Módulo 9 — AGRUL-045 / RF-M9-10, RF-M9-11, RF-M9-12, RF-M9-16, RF-M9-17, RF-M9-20)
      if (deps.controlVencimientosInventariosController) {
        v1.get('/stock/fefo-sugerencia/:insumoId', (req, rep) =>
          deps.controlVencimientosInventariosController!.sugerirFefo(req, rep)
        );
        v1.post('/stock/validar-lote', (req, rep) =>
          deps.controlVencimientosInventariosController!.validarLote(req, rep)
        );
        v1.post(
          '/stock/inventario-fisico',
          { preHandler: [verificarAutenticacionOpcional] },
          (req, rep) => deps.controlVencimientosInventariosController!.registrarInventarioFisico(req, rep)
        );
        v1.get('/stock/inventarios-fisicos', (req, rep) =>
          deps.controlVencimientosInventariosController!.listarInventariosFisicos(req, rep)
        );
        v1.post('/stock/perdidas', (req, rep) =>
          deps.controlVencimientosInventariosController!.registrarPerdida(req, rep)
        );
        v1.get('/stock/reporte-valorizado', (req, rep) =>
          deps.controlVencimientosInventariosController!.reporteValorizado(req, rep)
        );
      }

      // Módulo 10: Información Agro-meteorológica (AGRUL-046 / RF-M10-01, RF-M10-02, RF-M10-04, RF-M10-05, RF-M10-06)
      if (deps.climaController) {
        v1.post(
          '/clima/mediciones',
          { preHandler: [verificarAutenticacionOpcional] },
          (req, rep) => deps.climaController!.registrar(req, rep)
        );
        v1.post(
          '/clima/mediciones/:id/corregir',
          { preHandler: [verificarAutenticacionOpcional] },
          (req, rep) => deps.climaController!.corregir(req, rep)
        );
        v1.post(
          '/clima/importar-csv',
          { preHandler: [verificarAutenticacionOpcional] },
          (req, rep) => deps.climaController!.importarCsv(req, rep)
        );
        v1.get('/clima/mediciones', (req, rep) =>
          deps.climaController!.listar(req, rep)
        );
        v1.get('/clima/mediciones/:id', (req, rep) =>
          deps.climaController!.obtenerPorId(req, rep)
        );
        v1.get('/clima/mediciones/:id/historial', (req, rep) =>
          deps.climaController!.obtenerHistorial(req, rep)
        );

        // AGRUL-048: Contexto Climático en Labores (RF-M10-10)
        v1.get('/fincas/:id/clima-contexto', (req, rep) =>
          deps.climaController!.obtenerContextoFinca(req, rep)
        );
        v1.get('/clima/contexto/:id', (req, rep) =>
          deps.climaController!.obtenerContextoFinca(req, rep)
        );

        // AGRUL-048: Eventos Climáticos Adversos y Siniestros (RF-M10-11)
        v1.post(
          '/clima/eventos-adversos',
          { preHandler: [verificarAutenticacionOpcional] },
          (req, rep) => deps.climaController!.registrarEventoAdverso(req, rep)
        );
        v1.get('/clima/eventos-adversos', (req, rep) =>
          deps.climaController!.listarEventosAdversos(req, rep)
        );
        v1.get('/clima/eventos-adversos/:id', (req, rep) =>
          deps.climaController!.obtenerEventoAdversoPorId(req, rep)
        );

        // AGRUL-048: Resumen Climático de Ciclo y Serie Histórica Integrada (RF-M10-12, RF-M10-07, RF-M10-13)
        v1.get('/clima/lotes/:loteId/resumen-ciclo', (req, rep) =>
          deps.climaController!.obtenerResumenCiclo(req, rep)
        );
        v1.get('/lotes/:loteId/resumen-climatico', (req, rep) =>
          deps.climaController!.obtenerResumenCiclo(req, rep)
        );
        v1.get('/clima/lotes/:loteId/serie-historica', (req, rep) =>
          deps.climaController!.obtenerSerieHistorica(req, rep)
        );
        v1.get('/lotes/:loteId/serie-climatica', (req, rep) =>
          deps.climaController!.obtenerSerieHistorica(req, rep)
        );
      }

    },
    { prefix: '/api/v1' }
  );
}


