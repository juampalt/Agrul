import Fastify, { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { errorHandler } from './middlewares/error-handler.js';
import { registerApiRoutes } from './routes/api.routes.js';
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
import { InMemoryUsuariosRepository } from '../../../tests/mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../../tests/mocks/in-memory-usuario-fincas.repository.js';
import { UsuariosController } from './controllers/usuarios.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import {
  CrearUsuarioUseCase,
  AutenticarUsuarioUseCase,
  ListarUsuariosUseCase,
  ObtenerUsuarioPorIdUseCase,
  ActualizarUsuarioUseCase,
  BloquearUsuarioUseCase,
  DesbloquearUsuarioUseCase,
  CambiarPasswordUseCase,
  VerificarAccesoFincaUseCase,
} from '../../application/use-cases/usuarios.use-cases.js';
import { readFileSync, existsSync } from 'node:fs';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BuildAppOptions {
  lotesRepo: LotesRepositoryPort;
  eventosRepo: EventosRepositoryPort;
  genealogiaRepo: GenealogiaRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
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

  // Configuración de validación Zod en Fastify
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Manejo centralizado de errores según contratos de API
  app.setErrorHandler(errorHandler);

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
  if (options.fincasRepo) {
    const registrarFincaUseCase = new RegistrarFincaUseCase(options.fincasRepo);
    const listarFincasUseCase = new ListarFincasUseCase(options.fincasRepo);
    fincasController = new FincasController(registrarFincaUseCase, listarFincasUseCase, options.fincasRepo);
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
      options.insumosRepo
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

  // Módulo 8: Usuarios, Roles, Seguridad y Auditoría (AGRUL-038)
  const usuariosRepo = options.usuariosRepo ?? new InMemoryUsuariosRepository();
  const usuarioFincasRepo = options.usuarioFincasRepo ?? new InMemoryUsuarioFincasRepository();

  const crearUsuarioUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
  const autenticarUsuarioUC = new AutenticarUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
  const listarUsuariosUC = new ListarUsuariosUseCase(usuariosRepo, usuarioFincasRepo);
  const obtenerUsuarioPorIdUC = new ObtenerUsuarioPorIdUseCase(usuariosRepo, usuarioFincasRepo);
  const actualizarUsuarioUC = new ActualizarUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
  const bloquearUsuarioUC = new BloquearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
  const desbloquearUsuarioUC = new DesbloquearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
  const cambiarPasswordUC = new CambiarPasswordUseCase(usuariosRepo);
  const verificarAccesoFincaUC = new VerificarAccesoFincaUseCase(usuariosRepo, usuarioFincasRepo);

  const usuariosController = new UsuariosController(
    crearUsuarioUC,
    listarUsuariosUC,
    obtenerUsuarioPorIdUC,
    actualizarUsuarioUC,
    bloquearUsuarioUC,
    desbloquearUsuarioUC,
    verificarAccesoFincaUC
  );
  const authController = new AuthController(
    autenticarUsuarioUC,
    obtenerUsuarioPorIdUC,
    cambiarPasswordUC
  );

  // Registro de Rutas
  registerApiRoutes(app, {
    lotesController,
    eventosController,
    linajeController,
    fincasController,
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
  });

  return app;
}

