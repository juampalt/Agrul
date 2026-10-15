import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { FastifyInstance } from 'fastify';
import { buildApp } from './infrastructure/http/app.js';
import {
  InMemoryLotesRepository,
  InMemoryEventosRepository,
  InMemoryGenealogiaRepository,
  InMemoryInsumosCatalogoRepository,
  InMemoryAplicacionesRepository,
  InMemoryActividadesRepository,
  InMemoryCiclosRepository,
  InMemoryCatalogosActividadesRepository,
} from './infrastructure/repositories/in-memory/index.js';
import { Lote } from './core/domain/entities/lote.entity.js';
import { InsumoCatalogo } from './core/domain/entities/insumo-catalogo.entity.js';

let appInstance: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    const lotesRepo = new InMemoryLotesRepository();
    const eventosRepo = new InMemoryEventosRepository(lotesRepo);
    const genealogiaRepo = new InMemoryGenealogiaRepository();
    const insumosRepo = new InMemoryInsumosCatalogoRepository();
    const catalogosRepo = new InMemoryCatalogosActividadesRepository();
    const actividadesRepo = new InMemoryActividadesRepository();
    const ciclosRepo = new InMemoryCiclosRepository();
    const aplicacionesRepo = new InMemoryAplicacionesRepository();

    // Semillas de prueba para demo
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
      logger: process.env.NODE_ENV !== 'production' && !process.env.VERCEL,
    });

    await appInstance.ready();
  }

  return appInstance;
}

// Iniciar servidor HTTP en entorno local (cuando no corre como serverless en Vercel)
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  getApp().then(async (app) => {
    try {
      await app.listen({ port, host });
      console.log(`🚀 Servidor Agrul API escuchando en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

// Handler exportado por defecto para despliegue Serverless en Vercel
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit('request', req, res);
}
