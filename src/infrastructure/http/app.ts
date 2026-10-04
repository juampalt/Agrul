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
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';

export interface BuildAppOptions {
  lotesRepo: LotesRepositoryPort;
  eventosRepo: EventosRepositoryPort;
  genealogiaRepo: GenealogiaRepositoryPort;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
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

  // Instanciación de Controladores
  const lotesController = new LotesController(crearLoteUseCase, options.lotesRepo, dividirLoteUseCase);
  const eventosController = new EventosController(registrarEventoUseCase, options.eventosRepo);
  const linajeController = new LinajeController(obtenerLinajeUseCase);

  // Registro de Rutas
  registerApiRoutes(app, {
    lotesController,
    eventosController,
    linajeController,
  });

  return app;
}
