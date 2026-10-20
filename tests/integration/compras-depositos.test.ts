import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryProveedoresRepository } from '../mocks/in-memory-proveedores.repository.js';
import { InMemoryDepositosRepository } from '../mocks/in-memory-depositos.repository.js';
import { InMemoryIngresosCompraRepository } from '../mocks/in-memory-ingresos-compra.repository.js';
import { InMemoryStockInicialRepository } from '../mocks/in-memory-stock-inicial.repository.js';
import { InsumoCatalogo } from '../../src/core/domain/entities/insumo-catalogo.entity.js';
import { Proveedor } from '../../src/core/domain/entities/proveedor.entity.js';

describe('Integration Tests: Depósitos BPA, Ingresos por Compra y Saldo Inicial (AGRUL-042 / RF-M9-03, RF-M9-05, RF-M9-19)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let proveedoresRepo: InMemoryProveedoresRepository;
  let depositosRepo: InMemoryDepositosRepository;
  let ingresosCompraRepo: InMemoryIngresosCompraRepository;
  let stockInicialRepo: InMemoryStockInicialRepository;

  const proveedor = Proveedor.crear({
    id: 'prov-bayer-01',
    razonSocial: 'Bayer CropScience S.A.',
    cuit: '30-50123456-9',
  });

  const insumoFito = InsumoCatalogo.crear({
    id: 'ins-fungicida-01',
    nombreComercial: 'Fungicida Captan 80 WP',
    categoria: 'FITOSANITARIO',
    unidadMedidaId: 'KG',
    presentacion: 'Bolsa 25kg',
    fichaFitosanitaria: {
      principioActivo: 'Captan',
      periodoCarenciaDias: 14,
      periodoReingresoHoras: 24,
      nroRegistroSenasa: 'SENASA-2456',
    },
  });

  const insumoFert = InsumoCatalogo.crear({
    id: 'ins-urea-01',
    nombreComercial: 'Urea Perlada 46% N',
    categoria: 'FERTILIZANTE',
    unidadMedidaId: 'KG',
    presentacion: 'Bolsa 50kg',
  });

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    proveedoresRepo = new InMemoryProveedoresRepository();
    depositosRepo = new InMemoryDepositosRepository();
    ingresosCompraRepo = new InMemoryIngresosCompraRepository();
    stockInicialRepo = new InMemoryStockInicialRepository();

    await proveedoresRepo.guardar(proveedor);
    await insumosRepo.guardar(insumoFito);
    await insumosRepo.guardar(insumoFert);

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      insumosRepo,
      proveedoresRepo,
      depositosRepo,
      ingresosCompraRepo,
      stockInicialRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Endpoints de Depósitos de Almacenamiento (/api/v1/depositos)', () => {
    it('POST /depositos debe crear un depósito correctamente con tipo permitido (201)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Fitosanitarios Central',
          tipoPermitido: 'FITOSANITARIOS',
          ubicacionFisica: 'Nave A, Caseta Blindada',
          capacidadMaxima: 10000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.nombre).toBe('Depósito Fitosanitarios Central');
      expect(body.data.tipoPermitido).toBe('FITOSANITARIOS');
      expect(body.data.activo).toBe(true);
    });

    it('POST /depositos con tipo inválido debe responder 400 Bad Request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Mixto Inválido',
          tipoPermitido: 'TIPO_INVENTADO',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it('GET /depositos debe listar los depósitos y filtrar por tipo', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Fito',
          tipoPermitido: 'FITOSANITARIOS',
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Fert',
          tipoPermitido: 'FERTILIZANTES',
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/depositos?tipoPermitido=FITOSANITARIOS',
      });

      expect(listRes.statusCode).toBe(200);
      const body = listRes.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].nombre).toBe('Depósito Fito');
    });

    it('GET /depositos/:id con ID inexistente debe responder 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/depositos/dep-inexistente',
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('Endpoints de Ingreso por Compra (/api/v1/stock/ingresos-compra)', () => {
    let depFitoId: string;
    let depFertId: string;

    beforeEach(async () => {
      const resFito = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Seguro Fitosanitarios',
          tipoPermitido: 'FITOSANITARIOS',
        },
      });
      depFitoId = resFito.json().data.id;

      const resFert = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Galpón Fertilizantes y Minerales',
          tipoPermitido: 'FERTILIZANTES',
        },
      });
      depFertId = resFert.json().data.id;
    });

    it('POST /stock/ingresos-compra registra compra exitosa con lote y vencimiento (RF-M9-03)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depFitoId,
          cantidad: 100,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-FAB-2026-99',
          fechaVencimiento: '2028-10-30',
          nroFacturaRemito: 'REMITO-0005-00012345',
          precioUnitarioCompra: 45.0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.loteFabricacion).toBe('LOT-FAB-2026-99');
      expect(body.data.nroFacturaRemito).toBe('REMITO-0005-00012345');
    });

    it('POST /stock/ingresos-compra PROHIBE almacenar fitosanitarios junto a fertilizantes (RF-M9-19)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id, // Fitosanitario
          proveedorId: proveedor.id,
          depositoId: depFertId, // Depósito de Fertilizantes
          cantidad: 50,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-FAIL',
          fechaVencimiento: '2028-01-01',
          nroFacturaRemito: 'REM-FAIL',
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DEPOSITO_INCOMPATIBLE_BPA');
      expect(body.error.message).toContain('FITOSANITARIO');
    });

    it('GET /stock/ingresos-compra debe listar compras registradas', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFert.id,
          proveedorId: proveedor.id,
          depositoId: depFertId,
          cantidad: 200,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-UREA-01',
          fechaVencimiento: '2029-01-01',
          nroFacturaRemito: 'FAC-001',
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/ingresos-compra',
      });

      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().data).toHaveLength(1);
    });
  });

  describe('Endpoints de Saldo Inicial (/api/v1/stock/saldo-inicial)', () => {
    it('POST /stock/saldo-inicial carga saldo inicial con movimiento auditado (RF-M9-05)', async () => {
      const depFertRes = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Depósito Fertilizantes',
          tipoPermitido: 'FERTILIZANTES',
        },
      });
      const depFertId = depFertRes.json().data.id;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/saldo-inicial',
        payload: {
          insumoId: insumoFert.id,
          depositoId: depFertId,
          cantidad: 1500,
          unidadMedida: 'KG',
          motivo: 'Inventario físico al 01/10/2026',
          usuarioCargaId: 'u0000000-0000-0000-0000-000000000001',
          loteFabricacion: 'LOTE-INICIAL-UREA',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.cantidad).toBe(1500);
      expect(body.data.motivo).toBe('Inventario físico al 01/10/2026');

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldo-inicial',
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().data).toHaveLength(1);
    });
  });
});
