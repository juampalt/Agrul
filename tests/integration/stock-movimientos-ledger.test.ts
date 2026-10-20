import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryStockMovimientosRepository } from '../mocks/in-memory-stock-movimientos.repository.js';

describe('Integration Tests: Libro Mayor de Stock, Idempotencia y Reversiones ACID (AGRUL-043 / RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15, RN-10, RN-11)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let stockMovimientosRepo: InMemoryStockMovimientosRepository;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    stockMovimientosRepo = new InMemoryStockMovimientosRepository();

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      stockMovimientosRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/stock/movimientos', () => {
    it('debe registrar un movimiento de ingreso y devolver 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-glifosato-01',
          depositoId: 'dep-fito-01',
          tipoMovimiento: 'INGRESO_COMPRA',
          cantidad: 120,
          unidadMedida: 'L',
          claveIdempotencia: 'idem-ingreso-120',
          loteFabricacion: 'LOT-GLIFO-2026',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.cantidad).toBe(120);
      expect(body.data.esSaldoNegativo).toBe(false);
    });

    it('debe proteger contra dobles descuentos mediante clave de idempotencia (RN-11 / RF-M9-06)', async () => {
      const payload = {
        insumoId: 'insumo-urea-01',
        depositoId: 'dep-fert-01',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'KG',
        claveIdempotencia: 'idem-unica-repetida',
      };

      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload,
      });

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload,
      });

      expect(res1.statusCode).toBe(201);
      expect(res2.statusCode).toBe(201);
      expect(res1.json().data.id).toBe(res2.json().data.id);

      const saldoRes = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldos/insumo-urea-01',
      });
      expect(saldoRes.json().data.saldo).toBe(50); // No duplicado a 100
    });

    it('debe rechazar egreso que supere el stock si falta justificación (RF-M9-15)', async () => {
      // Insumo sin stock previo
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-vacio-01',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 10,
          unidadMedida: 'L',
          claveIdempotencia: 'egreso-sin-stock',
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('STOCK_INSUFICIENTE_SIN_JUSTIFICACION');
    });

    it('debe permitir egreso con saldo negativo si tiene justificación explícita (RF-M9-15)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-vacio-02',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 15,
          unidadMedida: 'L',
          claveIdempotencia: 'egreso-con-justif',
          motivoJustificacion: 'Aplicación urgente de rescate por ataque de oruga en lote 4',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.esSaldoNegativo).toBe(true);

      const saldoRes = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldos/insumo-vacio-02',
      });
      expect(saldoRes.json().data.saldo).toBe(-15);
      expect(saldoRes.json().data.esSaldoNegativo).toBe(true);
    });
  });

  describe('GET /api/v1/stock/saldos/:insumoId y envases abiertos (RF-M9-13)', () => {
    it('debe calcular saldo acumulado y computar envases abiertos', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-abierto-01',
          depositoId: 'dep-01',
          tipoMovimiento: 'INGRESO_COMPRA',
          cantidad: 100,
          unidadMedida: 'L',
          claveIdempotencia: 'in-100',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-abierto-01',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 2.5,
          unidadMedida: 'L',
          claveIdempotencia: 'out-2.5-abierto',
          esEnvaseAbierto: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldos/insumo-abierto-01',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json().data;
      expect(data.saldo).toBe(97.5);
      expect(data.envasesAbiertos).toBe(1);
    });
  });

  describe('Reversión y Ajuste de Movimientos (RF-M9-07)', () => {
    it('POST /stock/movimientos/:id/revertir debe restituir stock atómicamente', async () => {
      // 1. Ingreso 50
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-revertible',
          depositoId: 'dep-01',
          tipoMovimiento: 'INGRESO_COMPRA',
          cantidad: 50,
          unidadMedida: 'L',
          claveIdempotencia: 'ing-50',
        },
      });

      // 2. Egreso 20
      const resEgreso = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-revertible',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 20,
          unidadMedida: 'L',
          claveIdempotencia: 'egreso-20',
        },
      });
      const egresoId = resEgreso.json().data.id;

      // 3. Revertir egreso
      const resRevertir = await app.inject({
        method: 'POST',
        url: `/api/v1/stock/movimientos/${egresoId}/revertir`,
        payload: {
          motivo: 'Cancelación de labor agrícola',
          claveIdempotencia: 'rev-key-20',
        },
      });

      expect(resRevertir.statusCode).toBe(200);
      expect(resRevertir.json().data.tipoMovimiento).toBe('REVERSION');
      expect(resRevertir.json().data.movimientoRevertidoId).toBe(egresoId);

      // 4. Saldo debe volver a 50
      const resSaldo = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldos/insumo-revertible',
      });
      expect(resSaldo.json().data.saldo).toBe(50);
    });

    it('POST /stock/movimientos/:id/ajustar debe compensar y crear nuevo movimiento ajustado', async () => {
      // Saldo inicial 100
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-ajustable',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALDO_INICIAL',
          cantidad: 100,
          unidadMedida: 'L',
          claveIdempotencia: 'init-100',
        },
      });

      // Movimiento con dosis errónea 40L
      const resOriginal = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'insumo-ajustable',
          depositoId: 'dep-01',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 40,
          unidadMedida: 'L',
          claveIdempotencia: 'ap-dosis-erronea',
        },
      });
      const originalId = resOriginal.json().data.id;

      // Ajustar a 25L
      const resAjuste = await app.inject({
        method: 'POST',
        url: `/api/v1/stock/movimientos/${originalId}/ajustar`,
        payload: {
          nuevaCantidad: 25,
          claveIdempotencia: 'ap-dosis-corregida',
          motivoJustificacion: 'Ajuste de dosis según calibración de picos',
        },
      });

      expect(resAjuste.statusCode).toBe(200);
      expect(resAjuste.json().data.reversion.tipoMovimiento).toBe('REVERSION');
      expect(resAjuste.json().data.nuevoMovimiento.cantidad).toBe(25);

      const resSaldo = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/saldos/insumo-ajustable',
      });
      expect(resSaldo.json().data.saldo).toBe(75); // 100 - 25 = 75
    });
  });

  describe('GET /api/v1/stock/movimientos', () => {
    it('debe listar movimientos filtrando por insumo', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: 'ins-list-1',
          depositoId: 'dep-01',
          tipoMovimiento: 'INGRESO_COMPRA',
          cantidad: 10,
          unidadMedida: 'KG',
          claveIdempotencia: 'list-key-1',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/stock/movimientos?insumoId=ins-list-1',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveLength(1);
    });
  });
});
