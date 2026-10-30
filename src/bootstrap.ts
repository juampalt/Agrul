import { buildApp } from './infrastructure/http/app.js';
import { DrizzleInsumosRepository } from './infrastructure/database/repositories/drizzle-insumos.repository.js';
import { DrizzleInventarioInsumosRepository } from './infrastructure/database/repositories/drizzle-inventario-insumos.repository.js';
import { DrizzleAplicacionesInsumosRepository } from './infrastructure/database/repositories/drizzle-aplicaciones-insumos.repository.js';
import { DrizzleCorreccionesAplicacionesRepository } from './infrastructure/database/repositories/drizzle-correcciones-aplicaciones.repository.js';
import { DrizzleCultivosRepository } from './infrastructure/database/repositories/drizzle-cultivos.repository.js';
import { DrizzleVariedadesRepository } from './infrastructure/database/repositories/drizzle-variedades.repository.js';
import { DrizzlePlantacionesRepository } from './infrastructure/database/repositories/drizzle-plantaciones.repository.js';
import { DrizzleTiposActividadRepository } from './infrastructure/database/repositories/drizzle-tipos-actividad.repository.js';
import { DrizzleActividadesProgramadasRepository } from './infrastructure/database/repositories/drizzle-actividades-programadas.repository.js';
import { DrizzleCosechasProgramadasRepository } from './infrastructure/database/repositories/drizzle-cosechas-programadas.repository.js';
import { DrizzleCosechasRegistroRepository } from './infrastructure/database/repositories/drizzle-cosechas-registro.repository.js';
import { DrizzlePoscosechaRepository } from './infrastructure/database/repositories/drizzle-poscosecha.repository.js';
import { DrizzleAlmacenamientoProduccionRepository } from './infrastructure/database/repositories/drizzle-almacenamiento-produccion.repository.js';
import { DrizzleActividadesRealizadasRepository } from './infrastructure/database/repositories/drizzle-actividades-realizadas.repository.js';
import { DrizzleMonitoreosRepository } from './infrastructure/database/repositories/drizzle-monitoreos.repository.js';
import { DrizzleAccesoRecursosAgricolasRepository } from './infrastructure/database/repositories/drizzle-acceso-recursos-agricolas.repository.js';
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
  const poscosechaRepo = new DrizzlePoscosechaRepository(db);
  const almacenamientoRepo = new DrizzleAlmacenamientoProduccionRepository(db);
  const app = buildApp({
    insumosCanonicosRepo: new DrizzleInsumosRepository(db),
    inventarioInsumosRepo: new DrizzleInventarioInsumosRepository(db),
    aplicacionesInsumosRepo: new DrizzleAplicacionesInsumosRepository(db),
    correccionesAplicacionesRepo: new DrizzleCorreccionesAplicacionesRepository(db),
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
    actividadesProgramadasRepo: new DrizzleActividadesProgramadasRepository(db),
    cosechasProgramadasRepo: new DrizzleCosechasProgramadasRepository(db),
    cosechasRegistroRepo: new DrizzleCosechasRegistroRepository(db),
    clasificacionesRepo: poscosechaRepo,
    poscosechaRepo,
    almacenamientoRepo,
    destinosProduccionRepo: almacenamientoRepo,
    actividadesRealizadasRepo: new DrizzleActividadesRealizadasRepository(db),
    monitoreosRepo: new DrizzleMonitoreosRepository(db),
    accesoRecursosAgricolasRepo: new DrizzleAccesoRecursosAgricolasRepository(db),
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
