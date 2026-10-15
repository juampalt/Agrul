import type { IncomingMessage, ServerResponse } from 'node:http';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../tests/mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../tests/mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../tests/mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../tests/mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../tests/mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../tests/mocks/in-memory-ciclos.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../tests/mocks/in-memory-catalogos-actividades.repository.js';
import { Lote } from '../src/core/domain/entities/lote.entity.js';
import { InsumoCatalogo } from '../src/core/domain/entities/insumo-catalogo.entity.js';

let appInstance: FastifyInstance | null = null;

async function initApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    const lotesRepo = new InMemoryLotesRepository();
    const eventosRepo = new InMemoryEventosRepository(lotesRepo);
    const genealogiaRepo = new InMemoryGenealogiaRepository();
    const insumosRepo = new InMemoryInsumosCatalogoRepository();
    const catalogosRepo = new InMemoryCatalogosActividadesRepository();
    const actividadesRepo = new InMemoryActividadesRepository();
    const ciclosRepo = new InMemoryCiclosRepository();
    const aplicacionesRepo = new InMemoryAplicacionesRepository();

    // Semillas de prueba para la demo en Vercel
    const loteDemo = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-00001',
      producto: 'Arándano Emerald Orgánico',
      variedad: 'Primera Selección',
      cantidadInicial: 10000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteDemo);

    const insumoDemo = InsumoCatalogo.crear({
      id: crypto.randomUUID(),
      nombreComercial: 'Captan 80 WG',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 5kg',
      fichaFitosanitaria: {
        principioActivo: 'Captan',
        periodoCarenciaDias: 14,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-28941',
        toxicologia: 'Clase III - Banda Azul',
      },
    });
    await insumosRepo.guardar(insumoDemo);

    appInstance = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      insumosRepo,
      catalogosRepo,
      actividadesRepo,
      ciclosRepo,
      aplicacionesRepo,
      logger: false,
    });

    await appInstance.ready();
  }

  return appInstance;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await initApp();
  app.server.emit('request', req, res);
}
