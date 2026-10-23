import { describe, it, expect, beforeEach } from 'vitest';
import {
  SugerirLotesFefoUseCase,
  ValidarLoteInsumoUseCase,
  RegistrarInventarioFisicoUseCase,
  ListarInventariosFisicosUseCase,
  RegistrarPerdidaStockUseCase,
  ReporteExistenciasValorizadasUseCase,
} from '../../../src/application/use-cases/control-vencimientos-inventarios.use-cases.js';
import { RegistrarAplicacionUseCase } from '../../../src/application/use-cases/aplicaciones.use-cases.js';
import { RegistrarMovimientoStockUseCase } from '../../../src/application/use-cases/stock-movimientos.use-cases.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryIngresosCompraRepository } from '../../mocks/in-memory-ingresos-compra.repository.js';
import { InMemoryStockInicialRepository } from '../../mocks/in-memory-stock-inicial.repository.js';
import { InMemoryStockMovimientosRepository } from '../../mocks/in-memory-stock-movimientos.repository.js';
import { InMemoryInventariosFisicosRepository } from '../../mocks/in-memory-inventarios-fisicos.repository.js';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { IngresoCompraInsumo } from '../../../src/core/domain/entities/ingreso-compra-insumo.entity.js';
import { Usuario } from '../../../src/core/domain/entities/usuario.entity.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import {
  InsumoVencidoError,
  PermisoInsuficienteError,
  EntidadNoEncontradaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Application Use Cases: Control de Vencimientos (FEFO), Inventarios Físicos y Pérdidas (AGRUL-045)', () => {
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let ingresosCompraRepo: InMemoryIngresosCompraRepository;
  let stockInicialRepo: InMemoryStockInicialRepository;
  let stockMovimientosRepo: InMemoryStockMovimientosRepository;
  let inventariosRepo: InMemoryInventariosFisicosRepository;
  let usuariosRepo: InMemoryUsuariosRepository;

  let sugerirFefoUC: SugerirLotesFefoUseCase;
  let validarLoteUC: ValidarLoteInsumoUseCase;
  let registrarInventarioUC: RegistrarInventarioFisicoUseCase;
  let listarInventariosUC: ListarInventariosFisicosUseCase;
  let registrarPerdidaUC: RegistrarPerdidaStockUseCase;
  let reporteValorizadoUC: ReporteExistenciasValorizadasUseCase;
  let registrarMovimientoUC: RegistrarMovimientoStockUseCase;

  const insumoFito = InsumoCatalogo.crear({
    id: 'ins-captan-01',
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

  const usuarioAdmin = Usuario.crear({
    id: 'usr-admin-01',
    nombre: 'Valeria',
    apellido: 'Administradora',
    email: 'admin@agrul.com',
    passwordHash: 'hash-seguro-123',
    salt: 'salt-seguro-123',
    perfil: 'ADMINISTRADOR',
  });

  const usuarioEncargado = Usuario.crear({
    id: 'usr-encargado-01',
    nombre: 'Carlos',
    apellido: 'Encargado',
    email: 'encargado@agrul.com',
    passwordHash: 'hash-seguro-123',
    salt: 'salt-seguro-123',
    perfil: 'ENCARGADO',
  });

  const usuarioOperario = Usuario.crear({
    id: 'usr-operario-01',
    nombre: 'Juan',
    apellido: 'Operario',
    email: 'operario@agrul.com',
    passwordHash: 'hash-seguro-123',
    salt: 'salt-seguro-123',
    perfil: 'OPERARIO',
  });

  const FECHA_REFERENCIA_HOY = '2026-10-23';

  beforeEach(async () => {
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    ingresosCompraRepo = new InMemoryIngresosCompraRepository();
    stockInicialRepo = new InMemoryStockInicialRepository();
    stockMovimientosRepo = new InMemoryStockMovimientosRepository();
    inventariosRepo = new InMemoryInventariosFisicosRepository();
    usuariosRepo = new InMemoryUsuariosRepository();

    await insumosRepo.guardar(insumoFito);
    await usuariosRepo.guardar(usuarioAdmin);
    await usuariosRepo.guardar(usuarioEncargado);
    await usuariosRepo.guardar(usuarioOperario);

    sugerirFefoUC = new SugerirLotesFefoUseCase(
      insumosRepo,
      ingresosCompraRepo,
      stockMovimientosRepo,
      stockInicialRepo
    );
    validarLoteUC = new ValidarLoteInsumoUseCase(
      ingresosCompraRepo,
      stockMovimientosRepo,
      stockInicialRepo
    );
    registrarInventarioUC = new RegistrarInventarioFisicoUseCase(
      inventariosRepo,
      stockMovimientosRepo,
      usuariosRepo
    );
    listarInventariosUC = new ListarInventariosFisicosUseCase(inventariosRepo);
    registrarPerdidaUC = new RegistrarPerdidaStockUseCase(stockMovimientosRepo);
    reporteValorizadoUC = new ReporteExistenciasValorizadasUseCase(
      insumosRepo,
      ingresosCompraRepo,
      stockMovimientosRepo,
      stockInicialRepo
    );
    registrarMovimientoUC = new RegistrarMovimientoStockUseCase(stockMovimientosRepo);
  });

  describe('SugerirLotesFefoUseCase (RF-M9-16 & RF-M9-10)', () => {
    beforeEach(async () => {
      // Lote 1: Vence en 2026-12-01 (Próximo a vencer)
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'compra-1',
          insumoId: insumoFito.id,
          proveedorId: 'prov-01',
          depositoId: 'dep-01',
          cantidad: 30,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-EXP-2026-12',
          fechaVencimiento: '2026-12-01',
          nroFacturaRemito: 'REM-001',
          precioUnitarioCompra: 100,
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-EXP-2026-12',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 30,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-ingreso-lote-1',
        fechaVencimiento: '2026-12-01',
      });

      // Lote 2: Vence en 2027-06-30 (Vence más lejos)
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'compra-2',
          insumoId: insumoFito.id,
          proveedorId: 'prov-01',
          depositoId: 'dep-01',
          cantidad: 50,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-EXP-2027-06',
          fechaVencimiento: '2027-06-30',
          nroFacturaRemito: 'REM-002',
          precioUnitarioCompra: 120,
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-EXP-2027-06',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-ingreso-lote-2',
        fechaVencimiento: '2027-06-30',
      });

      // Lote 3: YA VENCIDO (Venció en 2025-05-10)
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'compra-3',
          insumoId: insumoFito.id,
          proveedorId: 'prov-01',
          depositoId: 'dep-01',
          cantidad: 15,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-VENCIDO-2025',
          fechaVencimiento: '2025-05-10',
          nroFacturaRemito: 'REM-003',
          precioUnitarioCompra: 80,
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-VENCIDO-2025',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 15,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-ingreso-lote-3',
        fechaVencimiento: '2025-05-10',
      });
    });

    it('debe sugerir automáticamente el lote que vence primero (FEFO - RF-M9-16)', async () => {
      const sugerencia = await sugerirFefoUC.execute({
        insumoId: insumoFito.id,
        fechaReferencia: FECHA_REFERENCIA_HOY,
      });

      expect(sugerencia.loteSugerido).not.toBeNull();
      // Entre 2026-12-01 y 2027-06-30, debe sugerir LOT-EXP-2026-12
      expect(sugerencia.loteSugerido!.loteFabricacion).toBe('LOT-EXP-2026-12');
      expect(sugerencia.loteSugerido!.fechaVencimiento).toBe('2026-12-01');
      expect(sugerencia.loteSugerido!.cantidadDisponible).toBe(30);

      // Disponibles deben estar ordenados cronológicamente por vencimiento
      expect(sugerencia.lotesDisponibles).toHaveLength(2);
      expect(sugerencia.lotesDisponibles[0].loteFabricacion).toBe('LOT-EXP-2026-12');
      expect(sugerencia.lotesDisponibles[1].loteFabricacion).toBe('LOT-EXP-2027-06');
    });

    it('debe bloquear y separar los lotes vencidos impidiendo su selección para consumo (RF-M9-10)', async () => {
      const sugerencia = await sugerirFefoUC.execute({
        insumoId: insumoFito.id,
        fechaReferencia: FECHA_REFERENCIA_HOY,
      });

      // El lote vencido en 2025 no debe estar en lotesDisponibles
      expect(sugerencia.lotesDisponibles.some(l => l.loteFabricacion === 'LOT-VENCIDO-2025')).toBe(false);

      // Debe figurar en lotesVencidosBloqueados
      expect(sugerencia.lotesVencidosBloqueados).toHaveLength(1);
      expect(sugerencia.lotesVencidosBloqueados[0].loteFabricacion).toBe('LOT-VENCIDO-2025');
      expect(sugerencia.lotesVencidosBloqueados[0].esVencido).toBe(true);
      expect(sugerencia.lotesVencidosBloqueados[0].estadoVencimiento).toBe('VENCIDO');
      expect(sugerencia.totalStockVencido).toBe(15);
      expect(sugerencia.totalStockDisponible).toBe(80); // 30 + 50
    });

    it('debe simular la cobertura requerida agotando primero los lotes más próximos a vencer', async () => {
      // Necesito 45 kg: debe tomar los 30 kg del primer lote (vence antes) y 15 kg del segundo
      const sugerencia = await sugerirFefoUC.execute({
        insumoId: insumoFito.id,
        cantidadRequerida: 45,
        fechaReferencia: FECHA_REFERENCIA_HOY,
      });

      expect(sugerencia.cubiertoTotalmente).toBe(true);
      expect(sugerencia.cantidadFaltante).toBe(0);
      expect(sugerencia.coberturaSugerida).toHaveLength(2);
      expect(sugerencia.coberturaSugerida![0].loteFabricacion).toBe('LOT-EXP-2026-12');
      expect(sugerencia.coberturaSugerida![0].cantidadASacar).toBe(30);
      expect(sugerencia.coberturaSugerida![1].loteFabricacion).toBe('LOT-EXP-2027-06');
      expect(sugerencia.coberturaSugerida![1].cantidadASacar).toBe(15);
    });

    it('debe indicar falta de stock cuando la cantidad requerida excede el stock no vencido', async () => {
      const sugerencia = await sugerirFefoUC.execute({
        insumoId: insumoFito.id,
        cantidadRequerida: 100, // Stock disponible no vencido = 80
        fechaReferencia: FECHA_REFERENCIA_HOY,
      });

      expect(sugerencia.cubiertoTotalmente).toBe(false);
      expect(sugerencia.cantidadFaltante).toBe(20);
    });
  });

  describe('ValidarLoteInsumoUseCase (RF-M9-10)', () => {
    beforeEach(async () => {
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'compra-vencida',
          insumoId: insumoFito.id,
          proveedorId: 'prov-01',
          depositoId: 'dep-01',
          cantidad: 10,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-VENC-EXACTO',
          fechaVencimiento: '2026-01-01',
          nroFacturaRemito: 'R-VENC',
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-VENC-EXACTO',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 10,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-venc-exacto',
        fechaVencimiento: '2026-01-01',
      });
    });

    it('debe arrojar InsumoVencidoError al validar un lote expirado (RF-M9-10)', async () => {
      await expect(
        validarLoteUC.validarAptitudOArrojar({
          insumoId: insumoFito.id,
          loteFabricacion: 'LOT-VENC-EXACTO',
          fechaReferencia: '2026-10-23',
        })
      ).rejects.toThrow(InsumoVencidoError);
    });

    it('debe retornar aptoParaAplicacion: false si el lote está vencido', async () => {
      const res = await validarLoteUC.execute({
        insumoId: insumoFito.id,
        loteFabricacion: 'LOT-VENC-EXACTO',
        fechaReferencia: '2026-10-23',
      });

      expect(res.esVencido).toBe(true);
      expect(res.aptoParaAplicacion).toBe(false);
      expect(res.estadoVencimiento).toBe('VENCIDO');
    });
  });

  describe('RegistrarInventarioFisicoUseCase (RF-M9-11)', () => {
    beforeEach(async () => {
      // Iniciar con 100 kg en el sistema
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-INV-01',
        tipoMovimiento: 'SALDO_INICIAL',
        cantidad: 100,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'init-inv-100',
      });
    });

    it('debe registrar ajuste positivo (SOBRANTE) si el conteo físico supera el teórico del sistema', async () => {
      const res = await registrarInventarioUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-INV-01',
        cantidadFisica: 110, // 10 de sobrante
        unidadMedida: 'KG',
        motivo: 'Inventario físico trimestral de primavera',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'inv-fisico-sobrante-1',
      });

      expect(res.cantidadSistema).toBe(100);
      expect(res.cantidadFisica).toBe(110);
      expect(res.diferencia).toBe(10);
      expect(res.tipoAjuste).toBe('SOBRANTE');
      expect(res.movimientoStockId).not.toBeNull();

      // Verificar que el saldo en el libro mayor de stock se actualizó a 110
      const saldo = await stockMovimientosRepo.obtenerSaldoActual(insumoFito.id, 'dep-01', 'LOT-INV-01');
      expect(saldo.saldo).toBe(110);
    });

    it('debe registrar ajuste negativo (FALTANTE) si el conteo físico es menor al teórico', async () => {
      const res = await registrarInventarioUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-INV-01',
        cantidadFisica: 92, // 8 de faltante
        unidadMedida: 'KG',
        motivo: 'Inventario con merma por derrame no registrado oportunamente',
        usuarioId: usuarioEncargado.id,
        claveIdempotencia: 'inv-fisico-faltante-1',
      });

      expect(res.cantidadSistema).toBe(100);
      expect(res.cantidadFisica).toBe(92);
      expect(res.diferencia).toBe(-8);
      expect(res.tipoAjuste).toBe('FALTANTE');

      const saldo = await stockMovimientosRepo.obtenerSaldoActual(insumoFito.id, 'dep-01', 'LOT-INV-01');
      expect(saldo.saldo).toBe(92);
    });

    it('no debe generar movimiento de stock si el conteo físico coincide exactamente con el teórico', async () => {
      const res = await registrarInventarioUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-INV-01',
        cantidadFisica: 100, // Coincide exactamente
        unidadMedida: 'KG',
        motivo: 'Recuento sin diferencias',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'inv-fisico-exacto-1',
      });

      expect(res.diferencia).toBe(0);
      expect(res.tipoAjuste).toBe('SIN_DIFERENCIA');
      expect(res.movimientoStockId).toBeNull();

      const movs = await stockMovimientosRepo.listar({ tipoMovimiento: 'AJUSTE_FISICO' });
      expect(movs).toHaveLength(0);
    });

    it('debe rechazar la operación a usuarios con rol OPERARIO arrojando PermisoInsuficienteError (RF-M9-11)', async () => {
      await expect(
        registrarInventarioUC.execute({
          insumoId: insumoFito.id,
          depositoId: 'dep-01',
          cantidadFisica: 100,
          unidadMedida: 'KG',
          motivo: 'Intento no autorizado por operario',
          usuarioId: usuarioOperario.id, // Perfil OPERARIO
          claveIdempotencia: 'inv-fail-permiso',
        })
      ).rejects.toThrow(PermisoInsuficienteError);
    });

    it('debe ser estrictamente idempotente por claveIdempotencia (RN-11 / RF-M9-06)', async () => {
      const primera = await registrarInventarioUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        cantidadFisica: 120,
        unidadMedida: 'KG',
        motivo: 'Ajuste auditado',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'idem-inv-repetido',
      });

      const segunda = await registrarInventarioUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        cantidadFisica: 120,
        unidadMedida: 'KG',
        motivo: 'Ajuste auditado',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'idem-inv-repetido',
      });

      expect(segunda.id).toBe(primera.id);
      const lista = await listarInventariosUC.execute({ insumoId: insumoFito.id });
      expect(lista).toHaveLength(1);
    });
  });

  describe('RegistrarPerdidaStockUseCase (RF-M9-12)', () => {
    beforeEach(async () => {
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-MERMAS',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'init-mermas-50',
      });
    });

    it('debe registrar una pérdida por rotura o derrame con motivo explícito', async () => {
      const res = await registrarPerdidaUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-MERMAS',
        cantidad: 5,
        unidadMedida: 'KG',
        tipoPerdida: 'ROTURA',
        motivo: 'Bolsa rota durante traslado en autoelevador',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'perd-rotura-1',
      });

      expect(res.id).toBeDefined();
      expect(res.tipoPerdida).toBe('ROTURA');
      expect(res.motivo).toContain('autoelevador');

      const saldo = await stockMovimientosRepo.obtenerSaldoActual(insumoFito.id, 'dep-01', 'LOT-MERMAS');
      expect(saldo.saldo).toBe(45); // 50 - 5
    });

    it('debe ser idempotente ante reintentos con la misma clave', async () => {
      const p1 = await registrarPerdidaUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        cantidad: 2,
        unidadMedida: 'KG',
        tipoPerdida: 'DERRAME',
        motivo: 'Válvula defectuosa',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'perd-idem-1',
      });

      const p2 = await registrarPerdidaUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        cantidad: 2,
        unidadMedida: 'KG',
        tipoPerdida: 'DERRAME',
        motivo: 'Válvula defectuosa',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'perd-idem-1',
      });

      expect(p2.id).toBe(p1.id);
      const saldo = await stockMovimientosRepo.obtenerSaldoActual(insumoFito.id, 'dep-01');
      expect(saldo.saldo).toBe(48); // No descontó dos veces
    });
  });

  describe('ReporteExistenciasValorizadasUseCase (RF-M9-20)', () => {
    it('debe calcular el inventario valorizado según Precio Promedio Ponderado (PPP)', async () => {
      // Compra 1: 100 kg a $10/kg = $1000
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'c-1',
          insumoId: insumoFito.id,
          proveedorId: 'p-1',
          depositoId: 'dep-01',
          cantidad: 100,
          unidadMedida: 'KG',
          loteFabricacion: 'L-01',
          fechaVencimiento: '2027-01-01',
          nroFacturaRemito: 'R-1',
          precioUnitarioCompra: 10,
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'L-01',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 100,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-c1',
      });

      // Compra 2: 50 kg a $16/kg = $800
      // PPP = (1000 + 800) / (100 + 50) = 1800 / 150 = $12/kg
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'c-2',
          insumoId: insumoFito.id,
          proveedorId: 'p-1',
          depositoId: 'dep-01',
          cantidad: 50,
          unidadMedida: 'KG',
          loteFabricacion: 'L-02',
          fechaVencimiento: '2027-06-01',
          nroFacturaRemito: 'R-2',
          precioUnitarioCompra: 16,
        })
      );
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        loteFabricacion: 'L-02',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-c2',
      });

      // Se consumieron 30 kg en campo
      await registrarMovimientoUC.execute({
        insumoId: insumoFito.id,
        depositoId: 'dep-01',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 30,
        unidadMedida: 'KG',
        usuarioId: usuarioAdmin.id,
        claveIdempotencia: 'mov-salida-30',
      });

      const reporte = await reporteValorizadoUC.execute();

      expect(reporte.totalInsumos).toBe(1);
      expect(reporte.totalCantidadStock).toBe(120); // 150 - 30 = 120 kg
      const item = reporte.items[0];
      expect(item.precioPromedioPonderado).toBe(12); // $12 por kg
      expect(item.saldoStock).toBe(120);
      expect(item.valorTotal).toBe(1440); // 120 * 12 = $1440
      expect(reporte.totalExistenciasValorizadas).toBe(1440);
    });
  });

  describe('Bloqueo en Aplicación Agrícola (RF-M9-10)', () => {
    let aplicacionesRepo: InMemoryAplicacionesRepository;
    let actividadesRepo: InMemoryActividadesRepository;
    let lotesRepo: InMemoryLotesRepository;
    let ciclosRepo: InMemoryCiclosRepository;
    let registrarAplicacionUC: RegistrarAplicacionUseCase;

    let lote: Lote;
    let ciclo: CicloProductivo;
    let actividad: ActividadAgricola;

    beforeEach(async () => {
      aplicacionesRepo = new InMemoryAplicacionesRepository();
      actividadesRepo = new InMemoryActividadesRepository();
      lotesRepo = new InMemoryLotesRepository();
      ciclosRepo = new InMemoryCiclosRepository();

      registrarAplicacionUC = new RegistrarAplicacionUseCase(
        aplicacionesRepo,
        actividadesRepo,
        lotesRepo,
        ciclosRepo,
        insumosRepo,
        ingresosCompraRepo,
        stockInicialRepo
      );

      lote = Lote.crear({
        id: 'lote-campo-01',
        codigoLote: 'LOT-2026-CAMP1',
        producto: 'Frutilla',
        cantidadInicial: 5000,
        unidadMedida: 'KG',
      });
      await lotesRepo.guardar(lote);

      ciclo = CicloProductivo.crear({
        id: 'ciclo-01',
        loteId: lote.id,
        codigoCiclo: 'CICLO-2026',
        cultivo: 'Frutilla',
        variedad: 'San Andreas',
        estado: 'ABIERTO',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2026-08-01',
      });
      await ciclosRepo.guardar(ciclo);

      actividad = ActividadAgricola.registrar({
        id: 'act-01',
        codigoActividad: 'ACT-PULV-01',
        tipoActividadId: 'tipo-pulv-01',
        loteId: lote.id,
        cicloId: ciclo.id,
        fechaHecho: '2026-10-15',
        usuarioCargaId: 'usr-admin-01',
        superficieTrabajadaHa: 2.0,
      });
      await actividadesRepo.guardar(actividad);

      // Registrar lote expirado en compras
      await ingresosCompraRepo.guardar(
        IngresoCompraInsumo.crear({
          id: 'compra-vencida-app',
          insumoId: insumoFito.id,
          proveedorId: 'prov-01',
          depositoId: 'dep-01',
          cantidad: 100,
          unidadMedida: 'KG',
          loteFabricacion: 'LOT-CADUCADO',
          fechaVencimiento: '2026-01-01', // Venció a principios de año
          nroFacturaRemito: 'R-VENC-APP',
        })
      );
    });

    it('debe arrojar InsumoVencidoError al registrar una aplicación con un insumo vencido (RF-M9-10)', async () => {
      await expect(
        registrarAplicacionUC.execute({
          actividadId: actividad.id,
          loteId: lote.id,
          cicloId: ciclo.id,
          fecha: '2026-10-20',
          metodo: 'FOLIAR',
          motivo: 'Control de botrytis',
          equipoAplicacion: 'Pulverizadora de arrastre 2000L',
          lineas: [
            {
              insumoId: insumoFito.id,
              cantidadTotal: 5,
              unidadMedidaId: 'KG',
              numeroLote: 'LOT-CADUCADO', // Lote vencido
            },
          ],
        })
      ).rejects.toThrow(InsumoVencidoError);
    });
  });
});
