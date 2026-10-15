import 'dotenv/config';
import { buildApp } from './infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../tests/mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../tests/mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../tests/mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { Lote } from './core/domain/entities/lote.entity.js';
import { InsumoCatalogo } from './core/domain/entities/insumo-catalogo.entity.js';

async function bootstrap() {
  console.log('🌱 Inicializando Agrul Traceability Engine...');

  // Instancias de repositorio en memoria para entorno de desarrollo local rápido
  const lotesRepo = new InMemoryLotesRepository();
  const eventosRepo = new InMemoryEventosRepository(lotesRepo);
  const genealogiaRepo = new InMemoryGenealogiaRepository();
  const insumosRepo = new InMemoryInsumosCatalogoRepository();

  // Semilla de prueba para demo
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

  const app = buildApp({
    lotesRepo,
    eventosRepo,
    genealogiaRepo,
    insumosRepo,
    logger: true,
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`🚀 Servidor Agrul API escuchando en http://localhost:${port}`);
    console.log(`📋 Lote de prueba disponible en: http://localhost:${port}/api/v1/lotes/${loteDemo.id}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
