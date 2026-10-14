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
import { ActividadesController } from './controllers/actividades.controller.js';
import {
  RegistrarActividadEjecutadaUseCase,
  ObtenerActividadPorIdUseCase,
  ListarActividadesUseCase,
} from '../../application/use-cases/actividades-agricolas.use-cases.js';
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
      options.catalogosRepo
    );
    const obtenerActividadUseCase = new ObtenerActividadPorIdUseCase(options.actividadesRepo);
    const listarActividadesUseCase = new ListarActividadesUseCase(options.actividadesRepo);

    actividadesController = new ActividadesController(
      registrarActividadUseCase,
      obtenerActividadUseCase,
      listarActividadesUseCase
    );
  }

  // Registro de Rutas
  registerApiRoutes(app, {
    lotesController,
    eventosController,
    linajeController,
    fincasController,
    catalogosController,
    actividadesController,
  });

  return app;
}

