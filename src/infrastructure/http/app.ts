import Fastify, { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { errorHandler } from './middlewares/error-handler.js';
import { registerApiRoutes } from './routes/api.routes.js';
import { registrarRutasCultivos } from './routes/cultivos.routes.js';
import { registrarRutasVariedades } from './routes/variedades.routes.js';
import { registrarRutasPlantaciones } from './routes/plantaciones.routes.js';
import { registrarRutasCiclosProductivos } from './routes/ciclos-productivos.routes.js';
import { registrarRutasTiposActividad } from './routes/tipos-actividad.routes.js';
import { registrarRutasActividadesProgramadas } from './routes/actividades-programadas.routes.js';
import { registrarRutasActividadesRealizadas } from './routes/actividades-realizadas.routes.js';
import { ActividadesRealizadasGestionPort } from '../../core/ports/actividades-realizadas-repository.port.js';
import { ActividadesProgramadasRepositoryPort } from '../../core/ports/actividades-programadas-repository.port.js';
import { TiposActividadRepositoryPort } from '../../core/ports/tipos-actividad-repository.port.js';
import { CiclosProductivosRepositoryPort } from '../../core/ports/ciclos-productivos-repository.port.js';
import { PlantacionesRepositoryPort } from '../../core/ports/plantaciones-repository.port.js';
import { VariedadesRepositoryPort } from '../../core/ports/variedades-repository.port.js';
import { CultivosRepositoryPort } from '../../core/ports/cultivos-repository.port.js';
import { PoliticaRetencionBpaService } from '../../core/domain/services/politica-retencion-bpa.service.js';
import { LocalizacionTucumanService } from '../../core/domain/services/localizacion-tucuman.service.js';
import { LotesController } from './controllers/lotes.controller.js';
import { EventosController } from './controllers/eventos.controller.js';
import { LinajeController } from './controllers/linaje.controller.js';
import { CrearLoteUseCase } from '../../application/use-cases/crear-lote.use-case.js';
import { RegistrarEventoUseCase } from '../../application/use-cases/registrar-evento.use-case.js';
import { ObtenerLinajeUseCase } from '../../application/use-cases/obtener-linaje.use-case.js';
import { DividirLoteUseCase } from '../../application/use-cases/dividir-lote.use-case.js';
import { FusionarLotesUseCase } from '../../application/use-cases/fusionar-lotes.use-case.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { FincasController } from './controllers/fincas.controller.js';
import { RegistrarFincaUseCase } from '../../application/use-cases/registrar-finca.use-case.js';
import { ListarFincasUseCase } from '../../application/use-cases/listar-fincas.use-case.js';
import { CatalogosActividadesRepositoryPort } from '../../core/ports/catalogos-actividades-repository.port.js';
import { CatalogosController } from './controllers/catalogos.controller.js';
import {
  CrearTipoActividadUseCase,
  ListarTiposActividadUseCase,
  CrearPersonalCuadrillaUseCase,
  ListarPersonalCuadrillaUseCase,
  CrearMaquinariaUseCase,
  ListarMaquinariaUseCase,
} from '../../application/use-cases/catalogos-actividades.use-cases.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { ObservacionesMonitoreoRepositoryPort } from '../../core/ports/observaciones-monitoreo-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { ActividadesController } from './controllers/actividades.controller.js';
import { MonitoreoController } from './controllers/monitoreo.controller.js';
import { InsumosController } from './controllers/insumos.controller.js';
import {
  RegistrarActividadEjecutadaUseCase,
  ObtenerActividadPorIdUseCase,
  ListarActividadesUseCase,
  AnularActividadUseCase,
} from '../../application/use-cases/actividades-agricolas.use-cases.js';
import {
  RegistrarObservacionMonitoreoUseCase,
  ListarObservacionesMonitoreoUseCase,
  ObtenerObservacionMonitoreoPorIdUseCase,
} from '../../application/use-cases/monitoreo.use-cases.js';
import {
  RegistrarInsumoCatalogoUseCase,
  ListarInsumosCatalogoUseCase,
  ObtenerInsumoPorIdUseCase,
} from '../../application/use-cases/insumos-catalogo.use-cases.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { AplicacionesController } from './controllers/aplicaciones.controller.js';
import {
  RegistrarAplicacionUseCase,
  ListarAplicacionesUseCase,
  ObtenerAplicacionPorIdUseCase,
} from '../../application/use-cases/aplicaciones.use-cases.js';
import { VerificarCarenciaLoteUseCase } from '../../application/use-cases/verificar-carencia.use-case.js';
import { CalcularConsumoInsumosCicloUseCase } from '../../application/use-cases/consumo-insumos.use-cases.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { CosechasController } from './controllers/cosechas.controller.js';
import {
  RegistrarCosechaUseCase,
  RegistrarCosechaRapidaUseCase,
  ListarCosechasUseCase,
  ObtenerCosechaPorIdUseCase,
  AnularCosechaUseCase,
  ModificarCosechaUseCase,
} from '../../application/use-cases/cosechas.use-cases.js';
import { DestinatariosRepositoryPort } from '../../core/ports/destinatarios-repository.port.js';
import { DespachosRepositoryPort } from '../../core/ports/despachos-repository.port.js';
import { DespachosController } from './controllers/despachos.controller.js';
import {
  CrearDestinatarioUseCase,
  ListarDestinatariosUseCase,
  ObtenerDestinatarioPorIdUseCase,
  RegistrarDespachoUseCase,
  ConsultarSaldoCosechaUseCase,
  ListarDespachosUseCase,
  ObtenerDespachoPorIdUseCase,
} from '../../application/use-cases/despachos.use-cases.js';
import { PerdidasCosechaRepositoryPort } from '../../core/ports/perdidas-cosecha-repository.port.js';
import { PerdidasCosechaController } from './controllers/perdidas-cosecha.controller.js';
import {
  RegistrarPerdidaCosechaUseCase,
  ListarPerdidasCosechaUseCase,
  ObtenerPerdidaCosechaPorIdUseCase,
} from '../../application/use-cases/perdidas-cosecha.use-cases.js';
import { TrazabilidadController } from './controllers/trazabilidad.controller.js';
import { ObtenerRecorridoTrazabilidadUseCase } from '../../application/use-cases/recorrido-trazabilidad.use-case.js';
import { EmitirInformeTrazabilidadUseCase } from '../../application/use-cases/emitir-informe-trazabilidad.use-case.js';
import { ListarInformesTrazabilidadLogUseCase } from '../../application/use-cases/listar-informes-trazabilidad-log.use-case.js';
import { ConsultaInversaInsumoUseCase } from '../../application/use-cases/consulta-inversa-insumo.use-case.js';
import { InformesTrazabilidadRepositoryPort } from '../../core/ports/informes-trazabilidad-repository.port.js';
import { InMemoryInformesTrazabilidadRepository } from '../../../tests/mocks/in-memory-informes-trazabilidad.repository.js';
import { IndicadoresController } from './controllers/indicadores.controller.js';
import { CalcularMetricasProduccionUseCase } from '../../application/use-cases/calcular-metricas-produccion.use-case.js';
import { CompararCampanasUseCase } from '../../application/use-cases/comparar-campanas.use-case.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { ObtenerDashboardResumenUseCase } from '../../application/use-cases/obtener-dashboard-resumen.use-case.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { UsuarioFincasRepositoryPort } from '../../core/ports/usuario-fincas-repository.port.js';
import { AuditoriaSeguridadRepositoryPort } from '../../core/ports/auditoria-seguridad-repository.port.js';
import { InMemoryUsuariosRepository } from '../../../tests/mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../../tests/mocks/in-memory-usuario-fincas.repository.js';
import { InMemoryAuditoriaSeguridadRepository } from '../../../tests/mocks/in-memory-auditoria-seguridad.repository.js';
import { UsuariosController } from './controllers/usuarios.controller.js';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case.js';
import { ConsultarUsuariosUseCase } from '../../application/use-cases/consultar-usuarios.use-case.js';
import { ModificarUsuarioUseCase } from '../../application/use-cases/modificar-usuario.use-case.js';
import { ConsultarAuditoriaSeguraUseCase } from '../../application/use-cases/consultar-auditoria-segura.use-case.js';
import { UsuariosTransaccionPort } from '../../core/ports/usuarios-transaccion.port.js';
import { SesionesRepositoryPort } from '../../core/ports/sesiones-repository.port.js';
import { InMemorySesionesRepository } from '../../../tests/mocks/in-memory-sesiones.repository.js';
import { ValidacionSesionService } from '../services/validacion-sesion.service.js';
import { CerrarSesionUseCase } from '../../application/use-cases/cerrar-sesion.use-case.js';
import { verificarAutenticacion } from './middlewares/auth.middleware.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuditoriaController } from './controllers/auditoria.controller.js';
import {
  CrearUsuarioUseCase,
  AutenticarUsuarioUseCase,
  ListarUsuariosUseCase,
  ObtenerUsuarioPorIdUseCase,
  CambiarPasswordUseCase,
  VerificarAccesoFincaUseCase,
} from '../../application/use-cases/usuarios.use-cases.js';
import {
  RegistrarAuditoriaSeguridadUseCase,
  ConsultarAuditoriaSeguridadUseCase,
  ObtenerAuditoriaPorIdUseCase,
} from '../../application/use-cases/auditoria.use-cases.js';
import { ProveedoresRepositoryPort } from '../../core/ports/proveedores-repository.port.js';
import { InsumoEquivalenciasRepositoryPort } from '../../core/ports/insumo-equivalencias-repository.port.js';
import { InMemoryProveedoresRepository } from '../../../tests/mocks/in-memory-proveedores.repository.js';
import { InMemoryInsumoEquivalenciasRepository } from '../../../tests/mocks/in-memory-insumo-equivalencias.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { ProveedoresController } from './controllers/proveedores.controller.js';
import { InsumoEquivalenciasController } from './controllers/insumo-equivalencias.controller.js';
import {
  RegistrarProveedorUseCase,
  ListarProveedoresUseCase,
  ObtenerProveedorPorIdUseCase,
  ActualizarProveedorUseCase,
} from '../../application/use-cases/proveedores.use-cases.js';
import {
  RegistrarInsumoEquivalenciaUseCase,
  ListarEquivalenciasPorInsumoUseCase,
  ConvertirUnidadInsumoUseCase,
} from '../../application/use-cases/insumo-equivalencias.use-cases.js';
import { DepositosRepositoryPort } from '../../core/ports/depositos-repository.port.js';
import { IngresosCompraRepositoryPort } from '../../core/ports/ingresos-compra-repository.port.js';
import { StockInicialRepositoryPort } from '../../core/ports/stock-inicial-repository.port.js';
import { InMemoryDepositosRepository } from '../../../tests/mocks/in-memory-depositos.repository.js';
import { InMemoryIngresosCompraRepository } from '../../../tests/mocks/in-memory-ingresos-compra.repository.js';
import { InMemoryStockInicialRepository } from '../../../tests/mocks/in-memory-stock-inicial.repository.js';
import { DepositosController } from './controllers/depositos.controller.js';
import { ComprasStockController } from './controllers/compras-stock.controller.js';
import {
  CrearDepositoUseCase,
  ListarDepositosUseCase,
  ObtenerDepositoPorIdUseCase,
} from '../../application/use-cases/depositos.use-cases.js';
import {
  RegistrarIngresoCompraUseCase,
  CargarStockInicialUseCase,
  ListarIngresosCompraUseCase,
  ListarStockInicialUseCase,
} from '../../application/use-cases/compras-stock.use-cases.js';
import { StockMovimientosRepositoryPort } from '../../core/ports/stock-movimientos-repository.port.js';
import { InMemoryStockMovimientosRepository } from '../../../tests/mocks/in-memory-stock-movimientos.repository.js';
import { StockMovimientosController } from './controllers/stock-movimientos.controller.js';
import {
  RegistrarMovimientoStockUseCase,
  RevertirMovimientoStockUseCase,
  AjustarMovimientoAplicacionUseCase,
  ConsultarSaldoInsumoUseCase,
  ListarMovimientosStockUseCase,
} from '../../application/use-cases/stock-movimientos.use-cases.js';
import { InventariosFisicosRepositoryPort } from '../../core/ports/inventarios-fisicos-repository.port.js';
import { InMemoryInventariosFisicosRepository } from '../../../tests/mocks/in-memory-inventarios-fisicos.repository.js';
import { ControlVencimientosInventariosController } from './controllers/control-vencimientos-inventarios.controller.js';
import {
  SugerirLotesFefoUseCase,
  ValidarLoteInsumoUseCase,
  RegistrarInventarioFisicoUseCase,
  ListarInventariosFisicosUseCase,
  RegistrarPerdidaStockUseCase,
  ReporteExistenciasValorizadasUseCase,
} from '../../application/use-cases/control-vencimientos-inventarios.use-cases.js';
import { MedicionesClimaticasRepositoryPort } from '../../core/ports/mediciones-climaticas-repository.port.js';
import { InMemoryMedicionesClimaticasRepository } from '../../../tests/mocks/in-memory-mediciones-climaticas.repository.js';
import { EventosClimaticosAdversosRepositoryPort } from '../../core/ports/eventos-climaticos-adversos-repository.port.js';
import { InMemoryEventosClimaticosAdversosRepository } from '../../../tests/mocks/in-memory-eventos-climaticos-adversos.repository.js';
import { ClimaController } from './controllers/clima.controller.js';
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
} from '../../application/use-cases/clima.use-cases.js';
import { readFileSync, existsSync } from 'node:fs';
import { TerritorioController } from './controllers/territorio.controller.js';
import { ConsultarFincaUseCase, ModificarFincaUseCase } from '../../application/use-cases/finca-territorial.use-cases.js';
import {
  ConsultarLotesTerritorialesUseCase,
  DesactivarLoteTerritorialUseCase,
  ModificarLoteTerritorialUseCase,
  RegistrarLoteTerritorialUseCase,
} from '../../application/use-cases/lotes-territoriales.use-cases.js';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BuildAppOptions {
  lotesRepo: LotesRepositoryPort;
  eventosRepo: EventosRepositoryPort;
  genealogiaRepo: GenealogiaRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
  cultivosRepo?: CultivosRepositoryPort;
  variedadesRepo?: VariedadesRepositoryPort;
  plantacionesRepo?: PlantacionesRepositoryPort;
  ciclosProductivosRepo?: CiclosProductivosRepositoryPort;
  tiposActividadRepo?: TiposActividadRepositoryPort;
  actividadesProgramadasRepo?: ActividadesProgramadasRepositoryPort;
  actividadesRealizadasRepo?: ActividadesRealizadasGestionPort;
  catalogosRepo?: CatalogosActividadesRepositoryPort;
  actividadesRepo?: ActividadesRepositoryPort;
  ciclosRepo?: CiclosRepositoryPort;
  observacionesRepo?: ObservacionesMonitoreoRepositoryPort;
  insumosRepo?: InsumosCatalogoRepository;
  aplicacionesRepo?: AplicacionesRepositoryPort;
  cosechasRepo?: CosechasRepositoryPort;
  destinatariosRepo?: DestinatariosRepositoryPort;
  despachosRepo?: DespachosRepositoryPort;
  perdidasRepo?: PerdidasCosechaRepositoryPort;
  informesRepo?: InformesTrazabilidadRepositoryPort;
  usuariosRepo?: UsuariosRepositoryPort;
  usuarioFincasRepo?: UsuarioFincasRepositoryPort;
  auditoriaRepo?: AuditoriaSeguridadRepositoryPort;
  usuariosTransaccion?: UsuariosTransaccionPort;
  sesionesRepo?: SesionesRepositoryPort;
  revalidarSesiones?: boolean;
  proveedoresRepo?: ProveedoresRepositoryPort;
  insumoEquivalenciasRepo?: InsumoEquivalenciasRepositoryPort;
  depositosRepo?: DepositosRepositoryPort;
  ingresosCompraRepo?: IngresosCompraRepositoryPort;
  stockInicialRepo?: StockInicialRepositoryPort;
  stockMovimientosRepo?: StockMovimientosRepositoryPort;
  inventariosFisicosRepo?: InventariosFisicosRepositoryPort;
  medicionesClimaticasRepo?: MedicionesClimaticasRepositoryPort;
  eventosClimaticosAdversosRepo?: EventosClimaticosAdversosRepositoryPort;
  logger?: boolean;
}


export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  // Configuración de archivos estáticos para el Dashboard Web
  const publicPath = fileURLToPath(new URL('../../../public', import.meta.url));

  app.get('/', async (_req, reply) => {
    const indexPath = resolve(publicPath, 'index.html');
    if (existsSync(indexPath)) {
      return reply.type('text/html; charset=utf-8').send(readFileSync(indexPath, 'utf-8'));
    }
    return reply.status(404).send('Not Found');
  });

  app.get('/dashboard', async (_req, reply) => {
    const indexPath = resolve(publicPath, 'index.html');
    if (existsSync(indexPath)) {
      return reply.type('text/html; charset=utf-8').send(readFileSync(indexPath, 'utf-8'));
    }
    return reply.status(404).send('Not Found');
  });

  app.get('/app.css', async (_req, reply) => {
    const cssPath = resolve(publicPath, 'app.css');
    if (existsSync(cssPath)) {
      return reply.type('text/css; charset=utf-8').send(readFileSync(cssPath, 'utf-8'));
    }
    return reply.status(404).send('Not Found');
  });

  app.get('/app.js', async (_req, reply) => {
    const jsPath = resolve(publicPath, 'app.js');
    if (existsSync(jsPath)) {
      return reply.type('application/javascript; charset=utf-8').send(readFileSync(jsPath, 'utf-8'));
    }
    return reply.status(404).send('Not Found');
  });

  app.get('/offline-manager.js', async (_req, reply) => {
    const jsPath = resolve(publicPath, 'offline-manager.js');
    if (existsSync(jsPath)) {
      return reply.type('application/javascript; charset=utf-8').send(readFileSync(jsPath, 'utf-8'));
    }
    return reply.status(404).send('Not Found');
  });

  // Configuración de validación Zod en Fastify
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Manejo centralizado de errores según contratos de API
  app.setErrorHandler(errorHandler);

  // RNF-06 / RN-05: Bloqueo irrestricto de eliminación física (DELETE) sobre datos productivos históricos por política BPA de 3 años
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'DELETE' && request.url.startsWith('/api/v1')) {
      const errorPayload = PoliticaRetencionBpaService.construirErrorBorradoProhibido(request.url);
      return reply.status(405).send({
        success: false,
        data: null,
        error: errorPayload,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // RNF-12: Inyección de encabezados oficiales de localización y zona horaria legal (Tucumán UTC-3)
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Timezone', LocalizacionTucumanService.ZONA_HORARIA);
    reply.header('X-Timezone-Offset', LocalizacionTucumanService.OFFSET_STRING);
    reply.header('X-Date-Format', LocalizacionTucumanService.FORMATO_FECHA_VISUAL);
    return payload;
  });

  // Instanciación de Casos de Uso
  const crearLoteUseCase = new CrearLoteUseCase(options.lotesRepo);
  const registrarEventoUseCase = new RegistrarEventoUseCase(options.lotesRepo, options.eventosRepo);
  const obtenerLinajeUseCase = new ObtenerLinajeUseCase(options.lotesRepo, options.genealogiaRepo);
  const dividirLoteUseCase = new DividirLoteUseCase(
    options.lotesRepo,
    options.eventosRepo,
    options.genealogiaRepo
  );
  const fusionarLotesUseCase = new FusionarLotesUseCase(
    options.lotesRepo,
    options.eventosRepo,
    options.genealogiaRepo
  );

  // Instanciación de Controladores
  const lotesController = new LotesController(
    crearLoteUseCase,
    options.lotesRepo,
    dividirLoteUseCase,
    fusionarLotesUseCase,
    options.fincasRepo
  );
  const eventosController = new EventosController(registrarEventoUseCase, options.eventosRepo);
  const linajeController = new LinajeController(obtenerLinajeUseCase);

  let fincasController: FincasController | undefined;
  let territorioController: TerritorioController | undefined;
  if (options.fincasRepo) {
    const registrarFincaUseCase = new RegistrarFincaUseCase(options.fincasRepo);
    const listarFincasUseCase = new ListarFincasUseCase(options.fincasRepo);
    fincasController = new FincasController(registrarFincaUseCase, listarFincasUseCase, options.fincasRepo);
    territorioController = new TerritorioController(
      new ConsultarFincaUseCase(options.fincasRepo),
      new ModificarFincaUseCase(options.fincasRepo, options.lotesRepo),
      new RegistrarLoteTerritorialUseCase(options.lotesRepo, options.fincasRepo),
      new ConsultarLotesTerritorialesUseCase(options.lotesRepo),
      new ModificarLoteTerritorialUseCase(options.lotesRepo, options.fincasRepo),
      new DesactivarLoteTerritorialUseCase(options.lotesRepo, options.ciclosRepo)
    );
  }

  let catalogosController: CatalogosController | undefined;
  if (options.catalogosRepo) {
    const crearTipoActividadUseCase = new CrearTipoActividadUseCase(options.catalogosRepo);
    const listarTiposActividadUseCase = new ListarTiposActividadUseCase(options.catalogosRepo);
    const crearPersonalUseCase = new CrearPersonalCuadrillaUseCase(options.catalogosRepo);
    const listarPersonalUseCase = new ListarPersonalCuadrillaUseCase(options.catalogosRepo);
    const crearMaquinariaUseCase = new CrearMaquinariaUseCase(options.catalogosRepo);
    const listarMaquinariaUseCase = new ListarMaquinariaUseCase(options.catalogosRepo);

    catalogosController = new CatalogosController(
      crearTipoActividadUseCase,
      listarTiposActividadUseCase,
      crearPersonalUseCase,
      listarPersonalUseCase,
      crearMaquinariaUseCase,
      listarMaquinariaUseCase,
      options.catalogosRepo
    );
  }

  let actividadesController: ActividadesController | undefined;
  if (options.actividadesRepo && options.ciclosRepo && options.catalogosRepo) {
    const registrarActividadUseCase = new RegistrarActividadEjecutadaUseCase(
      options.actividadesRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.catalogosRepo,
      options.observacionesRepo
    );
    const obtenerActividadUseCase = new ObtenerActividadPorIdUseCase(options.actividadesRepo);
    const listarActividadesUseCase = new ListarActividadesUseCase(options.actividadesRepo);
    const anularActividadUseCase = new AnularActividadUseCase(options.actividadesRepo);

    actividadesController = new ActividadesController(
      registrarActividadUseCase,
      obtenerActividadUseCase,
      listarActividadesUseCase,
      anularActividadUseCase
    );
  }

  let monitoreoController: MonitoreoController | undefined;
  if (options.observacionesRepo && options.ciclosRepo) {
    const registrarObservacionUseCase = new RegistrarObservacionMonitoreoUseCase(
      options.observacionesRepo,
      options.lotesRepo,
      options.ciclosRepo
    );
    const listarObservacionesUseCase = new ListarObservacionesMonitoreoUseCase(options.observacionesRepo);
    const obtenerObservacionUseCase = new ObtenerObservacionMonitoreoPorIdUseCase(options.observacionesRepo);

    monitoreoController = new MonitoreoController(
      registrarObservacionUseCase,
      listarObservacionesUseCase,
      obtenerObservacionUseCase
    );
  }

  let insumosController: InsumosController | undefined;
  if (options.insumosRepo) {
    const registrarInsumoUseCase = new RegistrarInsumoCatalogoUseCase(options.insumosRepo);
    const listarInsumosUseCase = new ListarInsumosCatalogoUseCase(options.insumosRepo);
    const obtenerInsumoUseCase = new ObtenerInsumoPorIdUseCase(options.insumosRepo);

    insumosController = new InsumosController(
      registrarInsumoUseCase,
      listarInsumosUseCase,
      obtenerInsumoUseCase
    );
  }

  let aplicacionesController: AplicacionesController | undefined;
  if (options.aplicacionesRepo && options.actividadesRepo && options.ciclosRepo && options.insumosRepo) {
    const registrarAplicacionUseCase = new RegistrarAplicacionUseCase(
      options.aplicacionesRepo,
      options.actividadesRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.insumosRepo,
      options.ingresosCompraRepo,
      options.stockInicialRepo
    );
    const listarAplicacionesUseCase = new ListarAplicacionesUseCase(
      options.aplicacionesRepo,
      options.insumosRepo
    );
    const obtenerAplicacionUseCase = new ObtenerAplicacionPorIdUseCase(
      options.aplicacionesRepo,
      options.insumosRepo
    );
    const verificarCarenciaUseCase = new VerificarCarenciaLoteUseCase(
      options.aplicacionesRepo,
      options.insumosRepo,
      options.lotesRepo
    );
    const calcularConsumoInsumosCicloUseCase = new CalcularConsumoInsumosCicloUseCase(
      options.ciclosRepo,
      options.aplicacionesRepo,
      options.insumosRepo
    );

    aplicacionesController = new AplicacionesController(
      registrarAplicacionUseCase,
      listarAplicacionesUseCase,
      obtenerAplicacionUseCase,
      verificarCarenciaUseCase,
      calcularConsumoInsumosCicloUseCase
    );
  }

  let cosechasController: CosechasController | undefined;
  if (options.cosechasRepo && options.ciclosRepo) {
    const registrarCosechaUseCase = new RegistrarCosechaUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.eventosRepo,
      options.aplicacionesRepo,
      options.insumosRepo
    );
    const listarCosechasUseCase = new ListarCosechasUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo
    );
    const obtenerCosechaUseCase = new ObtenerCosechaPorIdUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo
    );
    const anularCosechaUseCase = new AnularCosechaUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.eventosRepo
    );
    const modificarCosechaUseCase = new ModificarCosechaUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.eventosRepo
    );
    const registrarCosechaRapidaUseCase = new RegistrarCosechaRapidaUseCase(
      options.cosechasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.eventosRepo,
      options.aplicacionesRepo,
      options.insumosRepo
    );

    cosechasController = new CosechasController(
      registrarCosechaUseCase,
      listarCosechasUseCase,
      obtenerCosechaUseCase,
      anularCosechaUseCase,
      modificarCosechaUseCase,
      registrarCosechaRapidaUseCase
    );
  }

  let despachosController: DespachosController | undefined;
  if (options.destinatariosRepo && options.despachosRepo && options.cosechasRepo) {
    const crearDestinatarioUC = new CrearDestinatarioUseCase(options.destinatariosRepo);
    const listarDestinatariosUC = new ListarDestinatariosUseCase(options.destinatariosRepo);
    const obtenerDestinatarioUC = new ObtenerDestinatarioPorIdUseCase(options.destinatariosRepo);
    const registrarDespachoUC = new RegistrarDespachoUseCase(
      options.cosechasRepo,
      options.destinatariosRepo,
      options.despachosRepo,
      options.lotesRepo,
      options.eventosRepo
    );
    const consultarSaldoUC = new ConsultarSaldoCosechaUseCase(
      options.cosechasRepo,
      options.despachosRepo,
      options.destinatariosRepo
    );
    const listarDespachosUC = new ListarDespachosUseCase(options.despachosRepo, options.destinatariosRepo);
    const obtenerDespachoUC = new ObtenerDespachoPorIdUseCase(options.despachosRepo, options.destinatariosRepo);

    despachosController = new DespachosController(
      crearDestinatarioUC,
      listarDestinatariosUC,
      obtenerDestinatarioUC,
      registrarDespachoUC,
      consultarSaldoUC,
      listarDespachosUC,
      obtenerDespachoUC
    );
  }

  let perdidasController: PerdidasCosechaController | undefined;
  if (options.perdidasRepo) {
    const registrarPerdidaUC = new RegistrarPerdidaCosechaUseCase(
      options.perdidasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.cosechasRepo
    );
    const listarPerdidasUC = new ListarPerdidasCosechaUseCase(
      options.perdidasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.cosechasRepo
    );
    const obtenerPerdidaUC = new ObtenerPerdidaCosechaPorIdUseCase(
      options.perdidasRepo,
      options.lotesRepo,
      options.ciclosRepo,
      options.cosechasRepo
    );

    perdidasController = new PerdidasCosechaController(
      registrarPerdidaUC,
      listarPerdidasUC,
      obtenerPerdidaUC
    );
  }

  let trazabilidadController: TrazabilidadController | undefined;
  if (options.cosechasRepo) {
    const obtenerRecorridoUC = new ObtenerRecorridoTrazabilidadUseCase({
      cosechasRepo: options.cosechasRepo,
      lotesRepo: options.lotesRepo,
      ciclosRepo: options.ciclosRepo,
      actividadesRepo: options.actividadesRepo,
      aplicacionesRepo: options.aplicacionesRepo,
      despachosRepo: options.despachosRepo,
      destinatariosRepo: options.destinatariosRepo,
      fincasRepo: options.fincasRepo,
      insumosRepo: options.insumosRepo,
    });
    const informesRepo = options.informesRepo ?? new InMemoryInformesTrazabilidadRepository();
    const emitirInformeUC = new EmitirInformeTrazabilidadUseCase({
      obtenerRecorridoUseCase: obtenerRecorridoUC,
      informesRepo,
    });
    const listarLogsUC = new ListarInformesTrazabilidadLogUseCase(informesRepo);

    let consultaInversaUC: ConsultaInversaInsumoUseCase | undefined;
    if (options.insumosRepo && options.aplicacionesRepo && options.despachosRepo) {
      consultaInversaUC = new ConsultaInversaInsumoUseCase({
        insumosRepo: options.insumosRepo,
        aplicacionesRepo: options.aplicacionesRepo,
        lotesRepo: options.lotesRepo,
        cosechasRepo: options.cosechasRepo,
        despachosRepo: options.despachosRepo,
        fincasRepo: options.fincasRepo,
        destinatariosRepo: options.destinatariosRepo,
        genealogiaRepo: options.genealogiaRepo,
      });
    }

    trazabilidadController = new TrazabilidadController(
      obtenerRecorridoUC,
      emitirInformeUC,
      listarLogsUC,
      consultaInversaUC
    );
  }

  let indicadoresController: IndicadoresController | undefined;
  if (options.ciclosRepo && options.cosechasRepo) {
    const calcularMetricasUC = new CalcularMetricasProduccionUseCase({
      lotesRepo: options.lotesRepo,
      ciclosRepo: options.ciclosRepo,
      cosechasRepo: options.cosechasRepo,
      actividadesRepo: options.actividadesRepo,
      catalogosRepo: options.catalogosRepo,
      fincasRepo: options.fincasRepo,
    });

    let compararCampanasUC: CompararCampanasUseCase | undefined;
    if (options.aplicacionesRepo && options.insumosRepo) {
      compararCampanasUC = new CompararCampanasUseCase({
        ciclosRepo: options.ciclosRepo,
        lotesRepo: options.lotesRepo,
        cosechasRepo: options.cosechasRepo,
        aplicacionesRepo: options.aplicacionesRepo,
        insumosRepo: options.insumosRepo,
        fincasRepo: options.fincasRepo,
      });
    }

    indicadoresController = new IndicadoresController(calcularMetricasUC, compararCampanasUC);
  }

  let dashboardController: DashboardController | undefined;
  if (
    options.ciclosRepo &&
    options.cosechasRepo &&
    options.insumosRepo &&
    options.aplicacionesRepo &&
    options.actividadesRepo
  ) {
    const obtenerDashboardResumenUC = new ObtenerDashboardResumenUseCase({
      lotesRepo: options.lotesRepo,
      ciclosRepo: options.ciclosRepo,
      cosechasRepo: options.cosechasRepo,
      insumosRepo: options.insumosRepo,
      aplicacionesRepo: options.aplicacionesRepo,
      actividadesRepo: options.actividadesRepo,
      fincasRepo: options.fincasRepo,
      catalogosActividadesRepo: options.catalogosRepo,
    });
    dashboardController = new DashboardController(obtenerDashboardResumenUC);
  }

  // Módulo 8: Usuarios, Roles, Seguridad y Auditoría (AGRUL-038 / AGRUL-040)
  const usuariosRepo = options.usuariosRepo ?? new InMemoryUsuariosRepository();
  const usuarioFincasRepo = options.usuarioFincasRepo ?? new InMemoryUsuarioFincasRepository();
  const auditoriaRepo = options.auditoriaRepo ?? new InMemoryAuditoriaSeguridadRepository();
  const sesionesRepo = options.sesionesRepo ?? new InMemorySesionesRepository();
  const validacionSesion = new ValidacionSesionService(usuariosRepo, usuarioFincasRepo, sesionesRepo, options.revalidarSesiones ?? false);
  app.decorate('validarSesionActual', validacionSesion.validar.bind(validacionSesion));
  if (options.revalidarSesiones) app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/api/v1/') && req.headers.authorization && req.url.split('?')[0] !== '/api/v1/auth/login') {
      await verificarAutenticacion(req, reply);
    }
  });

  const crearUsuarioUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
  const autenticarUsuarioUC = new AutenticarUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo, sesionesRepo, options.usuariosTransaccion);
  const listarUsuariosUC = new ListarUsuariosUseCase(usuariosRepo, usuarioFincasRepo);
  const obtenerUsuarioPorIdUC = new ObtenerUsuarioPorIdUseCase(usuariosRepo, usuarioFincasRepo);
  const cambiarPasswordUC = new CambiarPasswordUseCase(usuariosRepo, auditoriaRepo, options.usuariosTransaccion);
  const verificarAccesoFincaUC = new VerificarAccesoFincaUseCase(usuariosRepo, usuarioFincasRepo);

  const consultarAuditoriaUC = new ConsultarAuditoriaSeguridadUseCase(auditoriaRepo);
  const obtenerAuditoriaPorIdUC = new ObtenerAuditoriaPorIdUseCase(auditoriaRepo);

  const usuariosController = new UsuariosController(
    new RegistrarUsuarioUseCase(usuariosRepo, crearUsuarioUC, options.usuariosTransaccion),
    new ConsultarUsuariosUseCase(usuariosRepo, listarUsuariosUC, obtenerUsuarioPorIdUC),
    new ModificarUsuarioUseCase({ usuariosRepo, usuarioFincasRepo, auditoriaRepo }, options.usuariosTransaccion),
    verificarAccesoFincaUC
  );
  const authController = new AuthController(
    autenticarUsuarioUC,
    obtenerUsuarioPorIdUC,
    cambiarPasswordUC,
    new CerrarSesionUseCase(sesionesRepo, auditoriaRepo, options.usuariosTransaccion)
  );
  const auditoriaController = new AuditoriaController(
    new ConsultarAuditoriaSeguraUseCase(usuariosRepo, consultarAuditoriaUC, obtenerAuditoriaPorIdUC), sesionesRepo
  );

  // Módulo 9: Inventario de Insumos y Stock (AGRUL-041)
  const proveedoresRepo = options.proveedoresRepo ?? new InMemoryProveedoresRepository();
  const registrarProveedorUC = new RegistrarProveedorUseCase(proveedoresRepo);
  const listarProveedoresUC = new ListarProveedoresUseCase(proveedoresRepo);
  const obtenerProveedorPorIdUC = new ObtenerProveedorPorIdUseCase(proveedoresRepo);
  const actualizarProveedorUC = new ActualizarProveedorUseCase(proveedoresRepo);

  const proveedoresController = new ProveedoresController(
    registrarProveedorUC,
    listarProveedoresUC,
    obtenerProveedorPorIdUC,
    actualizarProveedorUC
  );

  const insumoEquivalenciasRepo = options.insumoEquivalenciasRepo ?? new InMemoryInsumoEquivalenciasRepository();
  const insumosCatalogoRepo = options.insumosRepo ?? new InMemoryInsumosCatalogoRepository();

  const registrarEquivalenciaUC = new RegistrarInsumoEquivalenciaUseCase(insumoEquivalenciasRepo, insumosCatalogoRepo);
  const listarEquivalenciasUC = new ListarEquivalenciasPorInsumoUseCase(insumoEquivalenciasRepo, insumosCatalogoRepo);
  const convertirUnidadUC = new ConvertirUnidadInsumoUseCase(insumoEquivalenciasRepo, insumosCatalogoRepo);

  const insumoEquivalenciasController = new InsumoEquivalenciasController(
    registrarEquivalenciaUC,
    listarEquivalenciasUC,
    convertirUnidadUC
  );

  // Módulo 9: Depósitos de Almacenamiento y Segregación BPA (AGRUL-042 / RF-M9-19)
  const depositosRepo = options.depositosRepo ?? new InMemoryDepositosRepository();
  const crearDepositoUC = new CrearDepositoUseCase(depositosRepo, options.fincasRepo);
  const listarDepositosUC = new ListarDepositosUseCase(depositosRepo);
  const obtenerDepositoPorIdUC = new ObtenerDepositoPorIdUseCase(depositosRepo);

  const depositosController = new DepositosController(
    crearDepositoUC,
    listarDepositosUC,
    obtenerDepositoPorIdUC
  );

  // Módulo 9: Ingresos por Compra y Saldo Inicial (AGRUL-042 / RF-M9-03, RF-M9-05)
  const ingresosCompraRepo = options.ingresosCompraRepo ?? new InMemoryIngresosCompraRepository();
  const stockInicialRepo = options.stockInicialRepo ?? new InMemoryStockInicialRepository();

  const registrarIngresoCompraUC = new RegistrarIngresoCompraUseCase(
    ingresosCompraRepo,
    insumosCatalogoRepo,
    proveedoresRepo,
    depositosRepo
  );
  const cargarStockInicialUC = new CargarStockInicialUseCase(
    stockInicialRepo,
    insumosCatalogoRepo,
    depositosRepo
  );
  const listarIngresosCompraUC = new ListarIngresosCompraUseCase(ingresosCompraRepo);
  const listarStockInicialUC = new ListarStockInicialUseCase(stockInicialRepo);

  const comprasStockController = new ComprasStockController(
    registrarIngresoCompraUC,
    cargarStockInicialUC,
    listarIngresosCompraUC,
    listarStockInicialUC
  );

  // Módulo 9: Libro Mayor de Movimientos de Stock y Ledger (AGRUL-043 / RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15)
  const stockMovimientosRepo = options.stockMovimientosRepo ?? new InMemoryStockMovimientosRepository();
  const registrarMovimientoStockUC = new RegistrarMovimientoStockUseCase(stockMovimientosRepo);
  const revertirMovimientoStockUC = new RevertirMovimientoStockUseCase(stockMovimientosRepo);
  const ajustarMovimientoAplicacionUC = new AjustarMovimientoAplicacionUseCase(
    stockMovimientosRepo,
    revertirMovimientoStockUC,
    registrarMovimientoStockUC
  );
  const consultarSaldoInsumoUC = new ConsultarSaldoInsumoUseCase(stockMovimientosRepo);
  const listarMovimientosStockUC = new ListarMovimientosStockUseCase(stockMovimientosRepo);

  const stockMovimientosController = new StockMovimientosController(
    registrarMovimientoStockUC,
    revertirMovimientoStockUC,
    ajustarMovimientoAplicacionUC,
    consultarSaldoInsumoUC,
    listarMovimientosStockUC
  );

  // Módulo 9: Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas (AGRUL-045 / RF-M9-10, RF-M9-11, RF-M9-12, RF-M9-16, RF-M9-17, RF-M9-20)
  const inventariosFisicosRepo = options.inventariosFisicosRepo ?? new InMemoryInventariosFisicosRepository();
  const sugerirFefoUC = new SugerirLotesFefoUseCase(
    insumosCatalogoRepo,
    ingresosCompraRepo,
    stockMovimientosRepo,
    stockInicialRepo
  );
  const validarLoteUC = new ValidarLoteInsumoUseCase(
    ingresosCompraRepo,
    stockMovimientosRepo,
    stockInicialRepo
  );
  const registrarInventarioFisicoUC = new RegistrarInventarioFisicoUseCase(
    inventariosFisicosRepo,
    stockMovimientosRepo,
    usuariosRepo
  );
  const listarInventariosFisicosUC = new ListarInventariosFisicosUseCase(inventariosFisicosRepo);
  const registrarPerdidaUC = new RegistrarPerdidaStockUseCase(stockMovimientosRepo);
  const reporteValorizadoUC = new ReporteExistenciasValorizadasUseCase(
    insumosCatalogoRepo,
    ingresosCompraRepo,
    stockMovimientosRepo,
    stockInicialRepo
  );

  const controlVencimientosInventariosController = new ControlVencimientosInventariosController(
    sugerirFefoUC,
    validarLoteUC,
    registrarInventarioFisicoUC,
    listarInventariosFisicosUC,
    registrarPerdidaUC,
    reporteValorizadoUC
  );

  // Módulo 10: Información Agro-meteorológica (AGRUL-046 & AGRUL-048)
  const climaRepo = options.medicionesClimaticasRepo ?? new InMemoryMedicionesClimaticasRepository();
  const eventosAdversosRepo = options.eventosClimaticosAdversosRepo ?? new InMemoryEventosClimaticosAdversosRepository();

  const registrarMedicionClimaUC = new RegistrarMedicionClimaticaUseCase(climaRepo, options.fincasRepo);
  const corregirMedicionClimaUC = new CorregirMedicionClimaticaUseCase(climaRepo);
  const importarCsvClimaUC = new ImportarMedicionesCsvUseCase(climaRepo, options.fincasRepo);
  const consultarMedicionesClimaUC = new ConsultarMedicionesClimaticasUseCase(climaRepo);
  const obtenerMedicionClimaPorIdUC = new ObtenerMedicionClimaticaPorIdUseCase(climaRepo);
  const obtenerHistorialClimaUC = new ObtenerHistorialCorreccionesClimaUseCase(climaRepo);

  // AGRUL-048 use cases
  const obtenerContextoClimaUC = options.fincasRepo
    ? new ObtenerContextoClimaticoLaborUseCase(climaRepo, options.fincasRepo, options.lotesRepo)
    : undefined;
  const registrarEventoAdversoUC = options.fincasRepo
    ? new RegistrarEventoClimaticoAdversoUseCase(eventosAdversosRepo, options.fincasRepo, options.lotesRepo)
    : undefined;
  const listarEventosAdversosUC = new ListarEventosClimaticosAdversosUseCase(eventosAdversosRepo);
  const obtenerEventoAdversoPorIdUC = new ObtenerEventoClimaticoAdversoPorIdUseCase(eventosAdversosRepo);
  const calcularResumenCicloUC = new CalcularResumenClimaticoCicloUseCase(
    options.lotesRepo,
    climaRepo,
    eventosAdversosRepo,
    options.ciclosRepo
  );
  const obtenerSerieHistoricaUC = new ObtenerSerieHistoricaClimaticaLoteUseCase(
    options.lotesRepo,
    climaRepo,
    eventosAdversosRepo,
    options.actividadesRepo,
    options.aplicacionesRepo,
    options.cosechasRepo
  );

  const climaController = new ClimaController(
    registrarMedicionClimaUC,
    corregirMedicionClimaUC,
    importarCsvClimaUC,
    consultarMedicionesClimaUC,
    obtenerMedicionClimaPorIdUC,
    obtenerHistorialClimaUC,
    obtenerContextoClimaUC,
    registrarEventoAdversoUC,
    listarEventosAdversosUC,
    obtenerEventoAdversoPorIdUC,
    calcularResumenCicloUC,
    obtenerSerieHistoricaUC
  );


  // Registro de Rutas
  if (options.cultivosRepo) registrarRutasCultivos(app, options.cultivosRepo);
  if (options.plantacionesRepo) registrarRutasPlantaciones(app, options.plantacionesRepo);
  if (options.ciclosProductivosRepo) registrarRutasCiclosProductivos(app, options.ciclosProductivosRepo);
  if (options.tiposActividadRepo) {
    registrarRutasTiposActividad(app, options.tiposActividadRepo, options.cultivosRepo);
  }
  if (options.actividadesRealizadasRepo) registrarRutasActividadesRealizadas(app, options.actividadesRealizadasRepo);
  if (
    options.actividadesProgramadasRepo &&
    options.ciclosProductivosRepo &&
    options.tiposActividadRepo &&
    options.usuariosRepo
  ) {
    registrarRutasActividadesProgramadas(
      app,
      options.actividadesProgramadasRepo,
      options.ciclosProductivosRepo,
      options.tiposActividadRepo,
      options.usuariosRepo
    );
  }
  if (options.variedadesRepo && options.cultivosRepo) {
    registrarRutasVariedades(app, options.variedadesRepo, options.cultivosRepo);
  }
  registerApiRoutes(app, {
    lotesController,
    eventosController,
    linajeController,
    fincasController,
    territorioController,
    catalogosController,
    actividadesController,
    monitoreoController,
    insumosController,
    aplicacionesController,
    cosechasController,
    despachosController,
    perdidasController,
    trazabilidadController,
    indicadoresController,
    dashboardController,
    usuariosController,
    authController,
    auditoriaController,
    proveedoresController,
    insumoEquivalenciasController,
    depositosController,
    comprasStockController,
    stockMovimientosController,
    controlVencimientosInventariosController,
    climaController,
  });

  return app;
}

