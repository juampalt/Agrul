import { buildApp } from './infrastructure/http/app.js';
import { DrizzleCultivosRepository } from './infrastructure/database/repositories/drizzle-cultivos.repository.js';
import { DrizzleVariedadesRepository } from './infrastructure/database/repositories/drizzle-variedades.repository.js';
import { DrizzlePlantacionesRepository } from './infrastructure/database/repositories/drizzle-plantaciones.repository.js';
import { DrizzleTiposActividadRepository } from './infrastructure/database/repositories/drizzle-tipos-actividad.repository.js';
import { createDatabaseConnection } from './infrastructure/database/connection.js';
import { DrizzleCierreCicloGuard } from './infrastructure/database/cierre-ciclo.guard.js';
import { DrizzleCiclosProductivosRepository } from './infrastructure/database/repositories/drizzle-ciclos-productivos.repository.js';
import { DrizzleUsuariosRepository } from './infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { DrizzleUsuarioFincasRepository } from './infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { DrizzleAuditoriaSeguridadRepository } from './infrastructure/database/repositories/drizzle-auditoria-seguridad.repository.js';
import { DrizzleUsuariosTransaccion } from './infrastructure/database/drizzle-usuarios-transaccion.js';
import { DrizzleSesionesRepository } from './infrastructure/database/repositories/drizzle-sesiones.repository.js';
import { DrizzleFincasRepository } from './infrastructure/database/repositories/drizzle-fincas.repository.js';
import { DrizzleLotesTerritorialesRepository } from './infrastructure/database/repositories/drizzle-lotes-territoriales.repository.js';
import { InMemoryEventosRepository } from '../tests/mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../tests/mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../tests/mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../tests/mocks/in-memory-actividades.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../tests/mocks/in-memory-catalogos-actividades.repository.js';

export interface ServidorProduccionOptions {
  connectionString?: string;
  logger?: boolean;
}

export function crearServidorProduccion(options: ServidorProduccionOptions = {}) {
  const { db, pool } = createDatabaseConnection(options.connectionString);
  const lotesRepo = new DrizzleLotesTerritorialesRepository(db);
  const fincasRepo = new DrizzleFincasRepository(db);
  const cierreCicloGuard = new DrizzleCierreCicloGuard(db);
  const ciclosRepo = new DrizzleCiclosProductivosRepository(db, cierreCicloGuard);
  const app = buildApp({
    usuariosRepo: new DrizzleUsuariosRepository(db),
    usuarioFincasRepo: new DrizzleUsuarioFincasRepository(db),
    auditoriaRepo: new DrizzleAuditoriaSeguridadRepository(db),
    usuariosTransaccion: new DrizzleUsuariosTransaccion(db),
    sesionesRepo: new DrizzleSesionesRepository(db),
    revalidarSesiones: true,
    cultivosRepo: new DrizzleCultivosRepository(db),
    variedadesRepo: new DrizzleVariedadesRepository(db),
    plantacionesRepo: new DrizzlePlantacionesRepository(db),
    ciclosProductivosRepo: ciclosRepo,
    tiposActividadRepo: new DrizzleTiposActividadRepository(db),
    lotesRepo,
    fincasRepo,
    eventosRepo: new InMemoryEventosRepository(),
    genealogiaRepo: new InMemoryGenealogiaRepository(),
    insumosRepo: new InMemoryInsumosCatalogoRepository(),
    catalogosRepo: new InMemoryCatalogosActividadesRepository(),
    actividadesRepo: new InMemoryActividadesRepository(),
    ciclosRepo,
    aplicacionesRepo: new InMemoryAplicacionesRepository(),
    logger: options.logger ?? true,
  });
  app.addHook('onClose', async () => pool.end());
  return { app, cierreCicloGuard };
}
