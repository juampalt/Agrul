import { buildApp } from './infrastructure/http/app.js';
import { createDatabaseConnection } from './infrastructure/database/connection.js';
import { DrizzleFincasRepository } from './infrastructure/database/repositories/drizzle-fincas.repository.js';
import { DrizzleLotesTerritorialesRepository } from './infrastructure/database/repositories/drizzle-lotes-territoriales.repository.js';
import { InMemoryEventosRepository } from '../tests/mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../tests/mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../tests/mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../tests/mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../tests/mocks/in-memory-ciclos.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../tests/mocks/in-memory-catalogos-actividades.repository.js';

export interface ServidorProduccionOptions {
  connectionString?: string;
  logger?: boolean;
}

export function crearServidorProduccion(options: ServidorProduccionOptions = {}) {
  const { db, pool } = createDatabaseConnection(options.connectionString);
  const lotesRepo = new DrizzleLotesTerritorialesRepository(db);
  const fincasRepo = new DrizzleFincasRepository(db);
  const app = buildApp({
    lotesRepo,
    fincasRepo,
    eventosRepo: new InMemoryEventosRepository(),
    genealogiaRepo: new InMemoryGenealogiaRepository(),
    insumosRepo: new InMemoryInsumosCatalogoRepository(),
    catalogosRepo: new InMemoryCatalogosActividadesRepository(),
    actividadesRepo: new InMemoryActividadesRepository(),
    ciclosRepo: new InMemoryCiclosRepository(),
    aplicacionesRepo: new InMemoryAplicacionesRepository(),
    logger: options.logger ?? true,
  });
  app.addHook('onClose', async () => pool.end());
  return { app };
}
