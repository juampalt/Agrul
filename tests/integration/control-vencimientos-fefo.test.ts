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
import { InMemoryStockMovimientosRepository } from '../mocks/in-memory-stock-movimientos.repository.js';
import { InMemoryInventariosFisicosRepository } from '../mocks/in-memory-inventarios-fisicos.repository.js';
import { InMemoryUsuariosRepository } from '../mocks/in-memory-usuarios.repository.js';
import { InMemoryAplicacionesRepository } from '../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';
import { InsumoCatalogo } from '../../src/core/domain/entities/insumo-catalogo.entity.js';
import { Proveedor } from '../../src/core/domain/entities/proveedor.entity.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ActividadAgricola } from '../../src/core/domain/entities/actividad-agricola.entity.js';

describe('Integration Tests: Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas (AGRUL-045 / RF-M9-10, RF-M9-11, RF-M9-12, RF-M9-16, RF-M9-20)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let proveedoresRepo: InMemoryProveedoresRepository;
  let depositosRepo: InMemoryDepositosRepository;
  let ingresosCompraRepo: InMemoryIngresosCompraRepository;
  let stockInicialRepo: InMemoryStockInicialRepository;
  let stockMovimientosRepo: InMemoryStockMovimientosRepository;
  let inventariosFisicosRepo: InMemoryInventariosFisicosRepository;
  let usuariosRepo: InMemoryUsuariosRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let ciclosRepo: InMemoryCiclosRepository;

  const insumoFito = InsumoCatalogo.crear({
    id: 'a0000000-0000-4000-8000-000000000001',
    nombreComercial: 'Captan 80 WP',
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

  const proveedor = Proveedor.crear({
    id: 'prov-chem-api',
    razonSocial: 'AgroQuímica del Norte S.R.L.',
    cuit: '30-71234567-8',
  });

  const adminUser = Usuario.crear({
    id: 'usr-admin-http',
    nombre: 'Admin',
    apellido: 'General',
    email: 'admin.http@agrul.com',
    passwordHash: 'hash-password',
    salt: 'salt-password',
    perfil: 'ADMINISTRADOR',
  });

  const operarioUser = Usuario.crear({
    id: 'usr-operario-http',
    nombre: 'Operario',
    apellido: 'Galpón',
    email: 'operario.http@agrul.com',
    passwordHash: 'hash-password',
    salt: 'salt-password',
    perfil: 'OPERARIO',
  });

  let depFitoId: string;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    proveedoresRepo = new InMemoryProveedoresRepository();
    depositosRepo = new InMemoryDepositosRepository();
    ingresosCompraRepo = new InMemoryIngresosCompraRepository();
    stockInicialRepo = new InMemoryStockInicialRepository();
    stockMovimientosRepo = new InMemoryStockMovimientosRepository();
    inventariosFisicosRepo = new InMemoryInventariosFisicosRepository();
    usuariosRepo = new InMemoryUsuariosRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    ciclosRepo = new InMemoryCiclosRepository();

    await insumosRepo.guardar(insumoFito);
    await proveedoresRepo.guardar(proveedor);
    await usuariosRepo.guardar(adminUser);
    await usuariosRepo.guardar(operarioUser);

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      insumosRepo,
      proveedoresRepo,
      depositosRepo,
      ingresosCompraRepo,
      stockInicialRepo,
      stockMovimientosRepo,
      inventariosFisicosRepo,
      usuariosRepo,
      aplicacionesRepo,
      actividadesRepo,
      ciclosRepo,
    });

    await app.ready();

    // Crear depósito autorizado para fitosanitarios
    const depRes = await app.inject({
      method: 'POST',
      url: '/api/v1/depositos',
      payload: {
        fincaId: 'f0000000-0000-0000-0000-000000000001',
        nombre: 'Depósito Fitosanitarios Central',
        tipoPermitido: 'FITOSANITARIOS',
      },
    });
    depFitoId = depRes.json().data.id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/stock/fefo-sugerencia/:insumoId (RF-M9-16 & RF-M9-10)', () => {
    beforeEach(async () => {
      // 1. Ingreso lote que vence pronto (2026-12-15)
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depFitoId,
          cantidad: 40,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-PRONTO-2026',
          fechaVencimiento: '2026-12-15',
          nroFacturaRemito: 'R-01',
          precioUnitarioCompra: 50,
        },
      });

      // 2. Ingreso lote que vence después (2027-08-20)
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depFitoId,
          cantidad: 60,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-LEJOS-2027',
          fechaVencimiento: '2027-08-20',
          nroFacturaRemito: 'R-02',
          precioUnitarioCompra: 55,
        },
      });

      // 3. Ingreso lote YA VENCIDO (2025-01-01) - en depósito zona vencidos
      const depVencRes = await app.inject({
        method: 'POST',
        url: '/api/v1/depositos',
        payload: {
          fincaId: 'f0000000-0000-0000-0000-000000000001',
          nombre: 'Zona de Vencidos BPA',
          tipoPermitido: 'ZONA_VENCIDOS',
        },
      });
      const depVencId = depVencRes.json().data.id;

      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depVencId,
          cantidad: 10,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-EXPIRADO',
          fechaVencimiento: '2025-01-01',
          nroFacturaRemito: 'R-VENC',
          precioUnitarioCompra: 40,
        },
      });
    });

    it('debe devolver sugerencia FEFO con el lote próximo a vencer como prioritario (RF-M9-16)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/fefo-sugerencia/${insumoFito.id}?fechaReferencia=2026-10-23`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.loteSugerido).not.toBeNull();
      expect(body.data.loteSugerido.loteFabricacion).toBe('LOT-PRONTO-2026');
      expect(body.data.lotesDisponibles[0].loteFabricacion).toBe('LOT-PRONTO-2026');
      expect(body.data.lotesDisponibles[1].loteFabricacion).toBe('LOT-LEJOS-2027');

      // Comprobar bloqueo de lote expirado (RF-M9-10)
      expect(body.data.lotesVencidosBloqueados).toHaveLength(1);
      expect(body.data.lotesVencidosBloqueados[0].loteFabricacion).toBe('LOT-EXPIRADO');
      expect(body.data.lotesVencidosBloqueados[0].esVencido).toBe(true);
    });

    it('debe simular consumo de cantidad requerida dividiendo entre lotes en orden FEFO', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/fefo-sugerencia/${insumoFito.id}?cantidadRequerida=55&fechaReferencia=2026-10-23`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.cubiertoTotalmente).toBe(true);
      expect(body.data.coberturaSugerida).toHaveLength(2);
      expect(body.data.coberturaSugerida[0].loteFabricacion).toBe('LOT-PRONTO-2026');
      expect(body.data.coberturaSugerida[0].cantidadASacar).toBe(40); // Agota el primero
      expect(body.data.coberturaSugerida[1].loteFabricacion).toBe('LOT-LEJOS-2027');
      expect(body.data.coberturaSugerida[1].cantidadASacar).toBe(15); // Completa con el segundo
    });
  });

  describe('POST /api/v1/stock/inventario-fisico (RF-M9-11)', () => {
    beforeEach(async () => {
      // Iniciar con 100 kg en el sistema
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          tipoMovimiento: 'SALDO_INICIAL',
          cantidad: 100,
          unidadMedida: 'KG',
          usuarioId: adminUser.id,
          claveIdempotencia: 'init-100-kg',
        },
      });
    });

    it('debe registrar inventario físico y generar AJUSTE_FISICO auditado por Administrador (RF-M9-11)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/inventario-fisico',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          cantidadFisica: 108, // 8 de sobrante
          unidadMedida: 'KG',
          motivo: 'Inventario físico auditado de fin de mes',
          usuarioId: adminUser.id,
          claveIdempotencia: 'idem-inv-sobrante',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.cantidadSistema).toBe(100);
      expect(body.data.cantidadFisica).toBe(108);
      expect(body.data.diferencia).toBe(8);
      expect(body.data.tipoAjuste).toBe('SOBRANTE');
      expect(body.data.movimientoStockId).not.toBeNull();

      // Verificar que el saldo de stock aumentó a 108
      const saldoRes = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/saldos/${insumoFito.id}`,
      });
      expect(saldoRes.json().data.saldo).toBe(108);
    });

    it('debe denegar el registro de inventario físico a perfil OPERARIO con 403 (RF-M9-11)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/inventario-fisico',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          cantidadFisica: 100,
          unidadMedida: 'KG',
          motivo: 'Intento de conteo por operario sin permiso',
          usuarioId: operarioUser.id, // Perfil OPERARIO
          claveIdempotencia: 'idem-inv-operario',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PERMISO_INSUFICIENTE');
    });

    it('GET /api/v1/stock/inventarios-fisicos debe listar los inventarios auditados', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/inventario-fisico',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          cantidadFisica: 100,
          unidadMedida: 'KG',
          motivo: 'Conteo mensual',
          usuarioId: adminUser.id,
          claveIdempotencia: 'idem-list-1',
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/inventarios-fisicos?insumoId=${insumoFito.id}`,
      });

      expect(listRes.statusCode).toBe(200);
      const body = listRes.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].motivo).toBe('Conteo mensual');
    });
  });

  describe('POST /api/v1/stock/perdidas (RF-M9-12)', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/movimientos',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          tipoMovimiento: 'SALDO_INICIAL',
          cantidad: 50,
          unidadMedida: 'KG',
          usuarioId: adminUser.id,
          claveIdempotencia: 'init-50-perdidas',
        },
      });
    });

    it('debe registrar mermas y pérdidas con motivo generando movimiento PERDIDA (RF-M9-12)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/stock/perdidas',
        payload: {
          insumoId: insumoFito.id,
          depositoId: depFitoId,
          cantidad: 6,
          unidadMedida: 'KG',
          tipoPerdida: 'DERRAME',
          motivo: 'Envase perforado accidentalmente por montacargas',
          usuarioId: adminUser.id,
          claveIdempotencia: 'perd-derrame-1',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.tipoPerdida).toBe('DERRAME');
      expect(body.data.cantidad).toBe(6);

      const saldoRes = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/saldos/${insumoFito.id}`,
      });
      expect(saldoRes.json().data.saldo).toBe(44); // 50 - 6
    });
  });

  describe('GET /api/v1/stock/reporte-valorizado (RF-M9-20)', () => {
    it('debe emitir reporte de existencias valorizadas según precio ponderado', async () => {
      // Registrar compras con precios para cálculo de PPP
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depFitoId,
          cantidad: 100,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-VAL-1',
          fechaVencimiento: '2027-10-10',
          nroFacturaRemito: 'R-VAL-1',
          precioUnitarioCompra: 200,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/stock/reporte-valorizado?insumoId=${insumoFito.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.totalExistenciasValorizadas).toBeGreaterThanOrEqual(20000); // 100 * 200
      expect(body.data.items[0].precioPromedioPonderado).toBe(200);
    });
  });

  describe('Bloqueo en POST /api/v1/aplicaciones ante insumo vencido (RF-M9-10)', () => {
    let loteId: string;
    let cicloId: string;
    let actividadId: string;

    beforeEach(async () => {
      const lote = Lote.crear({
        id: 'b0000000-0000-4000-8000-000000000002',
        codigoLote: 'LOT-2026-VENC1',
        producto: 'Frutilla',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
      });
      await lotesRepo.guardar(lote);
      loteId = lote.id;

      const ciclo = CicloProductivo.crear({
        id: 'c0000000-0000-4000-8000-000000000003',
        loteId,
        codigoCiclo: 'CICLO-VENC-2026',
        cultivo: 'Frutilla',
        variedad: 'San Andreas',
        estado: 'ABIERTO',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2026-08-01',
      });
      await ciclosRepo.guardar(ciclo);
      cicloId = ciclo.id;

      const actividad = ActividadAgricola.registrar({
        id: 'd0000000-0000-4000-8000-000000000004',
        codigoActividad: 'ACT-VENC-01',
        tipoActividadId: 'e0000000-0000-4000-8000-000000000005',
        loteId,
        cicloId,
        fechaHecho: '2026-10-20',
        usuarioCargaId: 'usr-admin-http',
        superficieTrabajadaHa: 2.0,
      });
      await actividadesRepo.guardar(actividad);
      actividadId = actividad.id;

      // Registrar lote expirado
      await app.inject({
        method: 'POST',
        url: '/api/v1/stock/ingresos-compra',
        payload: {
          insumoId: insumoFito.id,
          proveedorId: proveedor.id,
          depositoId: depFitoId,
          cantidad: 20,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-CADUCADO-APP',
          fechaVencimiento: '2025-06-01', // Vencido
          nroFacturaRemito: 'R-VENC-APP',
          fechaIngreso: '2025-01-01',
        },
      });
    });

    it('debe rechazar la aplicación con 422 e INSUMO_VENCIDO si se intenta aplicar un lote vencido (RF-M9-10)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId,
          fecha: '2026-10-22',
          metodo: 'FOLIAR',
          motivo: 'Fumigación preventiva',
          equipoAplicacion: 'Pulverizadora arrastrada',
          lineas: [
            {
              insumoId: insumoFito.id,
              cantidadTotal: 5,
              unidadMedidaId: 'KG',
              numeroLote: 'LOT-CADUCADO-APP', // Lote vencido
            },
          ],
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INSUMO_VENCIDO');
      expect(body.error.message).toContain('LOT-CADUCADO-APP');
      expect(body.error.message).toContain('venció el');
    });
  });
});
