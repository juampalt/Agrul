import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryProveedoresRepository } from '../mocks/in-memory-proveedores.repository.js';
import { InMemoryInsumoEquivalenciasRepository } from '../mocks/in-memory-insumo-equivalencias.repository.js';
import { InsumoCatalogo } from '../../src/core/domain/entities/insumo-catalogo.entity.js';

describe('Integration Tests: Proveedores, Unidades y Conversiones (AGRUL-041 / RF-M9-01, RF-M9-02, RF-M9-14, RN-12)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let proveedoresRepo: InMemoryProveedoresRepository;
  let insumoEquivalenciasRepo: InMemoryInsumoEquivalenciasRepository;

  const insumoFertilizante = InsumoCatalogo.crear({
    id: 'ins-fert-liq-01',
    nombreComercial: 'Fertilizante Foliar Potásico 20L',
    categoria: 'FERTILIZANTE',
    unidadMedidaId: 'LT',
    presentacion: 'Bidón 20L',
  });

  const insumoFitosanitario = InsumoCatalogo.crear({
    id: 'ins-fito-fung-01',
    nombreComercial: 'Cobre Hidróxido 50 WP',
    categoria: 'FITOSANITARIO',
    unidadMedidaId: 'KG',
    presentacion: 'Bolsa 25kg',
    fichaFitosanitaria: {
      principioActivo: 'Hidróxido de Cobre',
      periodoCarenciaDias: 7,
      periodoReingresoHoras: 24,
      nroRegistroSenasa: 'SENASA-88990',
    },
  });

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    proveedoresRepo = new InMemoryProveedoresRepository();
    insumoEquivalenciasRepo = new InMemoryInsumoEquivalenciasRepository();

    await insumosRepo.guardar(insumoFertilizante);
    await insumosRepo.guardar(insumoFitosanitario);

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      insumosRepo,
      proveedoresRepo,
      insumoEquivalenciasRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Endpoints de Proveedores Comerciales (/api/v1/proveedores)', () => {
    it('POST /proveedores debe registrar un proveedor exitosamente (201)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: {
          razonSocial: 'Agroinsumos del Centro S.A.',
          cuit: '30-71456987-2',
          contacto: 'Ing. Esteban Quito',
          telefono: '+54 261 4455667',
          email: 'contacto@agrocentro.com',
          direccion: 'Acceso Sur Km 15, Godoy Cruz',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.razonSocial).toBe('Agroinsumos del Centro S.A.');
      expect(body.data.cuit).toBe('30-71456987-2');
      expect(body.data.activo).toBe(true);
    });

    it('POST /proveedores con CUIT duplicado debe responder 409 Conflict', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: {
          razonSocial: 'Proveedor Original',
          cuit: '30-99999999-9',
        },
      });

      const dupResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: {
          razonSocial: 'Proveedor Con Mismo CUIT',
          cuit: '30-99999999-9',
        },
      });

      expect(dupResponse.statusCode).toBe(409);
      const body = dupResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PROVEEDOR_DUPLICADO');
    });

    it('POST /proveedores con datos inválidos debe responder 400 Bad Request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: {
          razonSocial: 'A', // Demasiado corto
          email: 'invalido-sin-arroba',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /proveedores debe listar y permitir búsqueda por texto', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: { razonSocial: 'Semillería Andina', cuit: '30-10101010-1' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: { razonSocial: 'Química Patagónica', cuit: '30-20202020-2' },
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/proveedores?busqueda=Andina',
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].razonSocial).toBe('Semillería Andina');
    });

    it('GET /proveedores/:id y PUT /proveedores/:id deben consultar y modificar un proveedor', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/proveedores',
        payload: { razonSocial: 'Fertilizantes San Juan', cuit: '30-55555555-5' },
      });
      const provId = createRes.json().data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/proveedores/${provId}`,
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().data.razonSocial).toBe('Fertilizantes San Juan');

      const putRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/proveedores/${provId}`,
        payload: {
          razonSocial: 'Fertilizantes San Juan S.A.',
          telefono: '+54 264 4220011',
          activo: false,
        },
      });
      expect(putRes.statusCode).toBe(200);
      expect(putRes.json().data.razonSocial).toBe('Fertilizantes San Juan S.A.');
      expect(putRes.json().data.activo).toBe(false);
    });

    it('GET /proveedores/:id con ID inexistente debe responder 404 Not Found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/proveedores/prov-inexistente',
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('Endpoints de Equivalencias y Conversión de Insumos (/api/v1/insumos)', () => {
    it('POST /insumos/:id/equivalencias registra equivalencia de compra/consumo (RF-M9-01)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
          densidadKgL: 1.25,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.unidadCompra).toBe('BIDON_20L');
      expect(body.data.unidadConsumo).toBe('L');
      expect(body.data.factorMultiplicador).toBe(20);
      expect(body.data.densidadKgL).toBe(1.25);
    });

    it('POST /insumos/:id/equivalencias con insumo inexistente debe responder 404', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos/insumo-no-existe/equivalencias',
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('ENTITY_NOT_FOUND');
    });

    it('GET /insumos/:id/equivalencias lista todas las equivalencias del insumo', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
      });

      expect(listRes.statusCode).toBe(200);
      const body = listRes.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].unidadCompra).toBe('BIDON_20L');
    });

    it('POST /insumos/:id/convertir convierte de unidad de compra a consumo (BIDON_20L -> L)', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
          densidadKgL: 1.25,
        },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/convertir`,
        payload: {
          cantidad: 3,
          unidadOrigen: 'BIDON_20L',
          unidadDestino: 'L',
        },
      });

      expect(convRes.statusCode).toBe(200);
      const body = convRes.json();
      expect(body.success).toBe(true);
      expect(body.data.cantidadOriginal).toBe(3);
      expect(body.data.cantidadConvertida).toBe(60);
      expect(body.data.unidadDestino).toBe('L');
    });

    it('POST /insumos/:id/convertir convierte a masa usando la densidad registrada (BIDON_20L -> KG)', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
          densidadKgL: 1.25,
        },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/convertir`,
        payload: {
          cantidad: 2,
          unidadOrigen: 'BIDON_20L',
          unidadDestino: 'KG',
        },
      });

      expect(convRes.statusCode).toBe(200);
      const body = convRes.json();
      expect(body.success).toBe(true);
      // 2 bidones = 40 L; 40 L * 1.25 = 50 KG
      expect(body.data.cantidadConvertida).toBe(50);
      expect(body.data.densidadUtilizada).toBe(1.25);
    });

    it('POST /insumos/:id/convertir prohíbe la conversión automática litros a kg sin densidad registrada (RN-12 / RF-M9-14)', async () => {
      // Insumo sin densidad cargada
      const convRes = await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/convertir`,
        payload: {
          cantidad: 15,
          unidadOrigen: 'L',
          unidadDestino: 'KG',
        },
      });

      expect(convRes.statusCode).toBe(422);
      const body = convRes.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNIDAD_CONVERSION_INVALIDA');
      expect(body.error.message).toContain('RN-12');
    });

    it('POST /insumos/conversiones/convertir funciona pasando insumoId en el payload', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/insumos/${insumoFertilizante.id}/equivalencias`,
        payload: {
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
        },
      });

      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos/conversiones/convertir',
        payload: {
          insumoId: insumoFertilizante.id,
          cantidad: 5,
          unidadOrigen: 'BIDON_20L',
          unidadDestino: 'L',
        },
      });

      expect(convRes.statusCode).toBe(200);
      expect(convRes.json().data.cantidadConvertida).toBe(100);
    });
  });
});
