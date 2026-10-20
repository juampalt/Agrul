import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStockMovimientosRepository } from '../../mocks/in-memory-stock-movimientos.repository.js';
import {
  RegistrarMovimientoStockUseCase,
  RevertirMovimientoStockUseCase,
  AjustarMovimientoAplicacionUseCase,
  ConsultarSaldoInsumoUseCase,
  ListarMovimientosStockUseCase,
} from '../../../src/application/use-cases/stock-movimientos.use-cases.js';
import {
  StockInsuficienteSinJustificacionError,
  MovimientoYaRevertidoError,
  EntidadNoEncontradaError,
} from '../../../src/core/domain/index.js';

describe('Application Use Cases: Stock Movimientos & Ledger (AGRUL-043 / RF-M9-04, RF-M9-06, RF-M9-07, RF-M9-13, RF-M9-15, RN-10, RN-11)', () => {
  let repo: InMemoryStockMovimientosRepository;
  let registrarUC: RegistrarMovimientoStockUseCase;
  let revertirUC: RevertirMovimientoStockUseCase;
  let ajustarUC: AjustarMovimientoAplicacionUseCase;
  let consultarSaldoUC: ConsultarSaldoInsumoUseCase;
  let listarUC: ListarMovimientosStockUseCase;

  beforeEach(() => {
    repo = new InMemoryStockMovimientosRepository();
    registrarUC = new RegistrarMovimientoStockUseCase(repo);
    revertirUC = new RevertirMovimientoStockUseCase(repo);
    ajustarUC = new AjustarMovimientoAplicacionUseCase(repo, revertirUC, registrarUC);
    consultarSaldoUC = new ConsultarSaldoInsumoUseCase(repo);
    listarUC = new ListarMovimientosStockUseCase(repo);
  });

  describe('RegistrarMovimientoStockUseCase', () => {
    it('debe registrar un movimiento de ingreso y actualizar el saldo', async () => {
      const result = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 100,
        unidadMedida: 'KG',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'key-ingreso-1',
      });

      expect(result.id).toBeDefined();
      expect(result.cantidad).toBe(100);

      const saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.saldo).toBe(100);
      expect(saldo.totalIngresos).toBe(100);
      expect(saldo.totalEgresos).toBe(0);
      expect(saldo.esSaldoNegativo).toBe(false);
    });

    it('debe ser estrictamente idempotente sin duplicar movimientos (RN-11 / RF-M9-06)', async () => {
      const primerResultado = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'misma-clave-unica',
      });

      // Segundo envío con misma clave de idempotencia (ej. timeout o doble click)
      const segundoResultado = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'misma-clave-unica',
      });

      expect(segundoResultado.id).toBe(primerResultado.id);

      const saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.saldo).toBe(50); // No se duplicó a 100
      const lista = await listarUC.execute({ insumoId: 'ins-001' });
      expect(lista).toHaveLength(1);
    });

    it('debe rechazar egreso que supere el stock si no se proporciona justificación (RF-M9-15)', async () => {
      // Insumo arranca en 10
      await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALDO_INICIAL',
        cantidad: 10,
        unidadMedida: 'KG',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'init-1',
      });

      // Intento de egreso de 15 sin motivo
      await expect(
        registrarUC.execute({
          insumoId: 'ins-001',
          depositoId: 'dep-001',
          tipoMovimiento: 'SALIDA_CONSUMO',
          cantidad: 15,
          unidadMedida: 'KG',
          usuarioId: 'usr-admin',
          claveIdempotencia: 'salida-sin-justif',
        })
      ).rejects.toThrow(StockInsuficienteSinJustificacionError);
    });

    it('debe permitir egreso con saldo negativo si se especifica justificación explícita (RF-M9-15)', async () => {
      await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALDO_INICIAL',
        cantidad: 10,
        unidadMedida: 'KG',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'init-1',
      });

      const egresoConJustif = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 25,
        unidadMedida: 'KG',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'salida-con-justif',
        motivoJustificacion: 'Urgencia fitosanitaria, se utilizó stock físico recibido pendiente de carga en sistema',
      });

      expect(egresoConJustif.esSaldoNegativo).toBe(true);
      expect(egresoConJustif.motivoJustificacion).toContain('Urgencia fitosanitaria');

      const saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.saldo).toBe(-15);
      expect(saldo.esSaldoNegativo).toBe(true);
    });
  });

  describe('RevertirMovimientoStockUseCase (RF-M9-07)', () => {
    it('debe revertir atómicamente un movimiento creando el movimiento compensatorio', async () => {
      // 1. Ingreso de 100
      await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 100,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'ing-1',
      });

      // 2. Egreso por aplicación de 30
      const consumo = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 30,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'app-30',
        referenciaTipo: 'APLICACION_CAMPO',
        referenciaId: 'app-uuid-1',
      });

      let saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.saldo).toBe(70);

      // 3. Reversión de la aplicación
      const reversion = await revertirUC.execute({
        movimientoId: consumo.id,
        usuarioId: 'usr-supervisor',
        motivo: 'Cancelación de labor por tormenta súbita',
        claveIdempotencia: 'rev-key-1',
      });

      expect(reversion.tipoMovimiento).toBe('REVERSION');
      expect(reversion.movimientoRevertidoId).toBe(consumo.id);
      expect(reversion.cantidad).toBe(30);

      saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.saldo).toBe(100); // Se restituyó el saldo original
    });

    it('debe rechazar revertir dos veces el mismo movimiento (RF-M9-07)', async () => {
      const consumo = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 10,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'consumo-test',
        motivoJustificacion: 'Prueba',
      });

      await revertirUC.execute({
        movimientoId: consumo.id,
        usuarioId: 'usr-admin',
        motivo: 'Primera reversión',
        claveIdempotencia: 'rev-key-1',
      });

      await expect(
        revertirUC.execute({
          movimientoId: consumo.id,
          usuarioId: 'usr-admin',
          motivo: 'Segunda reversión',
          claveIdempotencia: 'rev-key-2',
        })
      ).rejects.toThrow(MovimientoYaRevertidoError);
    });

    it('debe arrojar EntityNotFoundError si el movimiento no existe', async () => {
      await expect(
        revertirUC.execute({
          movimientoId: 'inexistente-id',
          usuarioId: 'usr-admin',
          motivo: 'Reversión fallida',
          claveIdempotencia: 'rev-fail',
        })
      ).rejects.toThrow(EntidadNoEncontradaError);
    });
  });

  describe('AjustarMovimientoAplicacionUseCase (RF-M9-07)', () => {
    it('debe revertir el movimiento previo e insertar el ajustado', async () => {
      // Stock inicial 50L
      await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALDO_INICIAL',
        cantidad: 50,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'init-50',
      });

      // Aplicación registrada originalmente con 20L
      const original = await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 20,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        referenciaTipo: 'APLICACION_CAMPO',
        referenciaId: 'app-99',
        claveIdempotencia: 'app-99-dosis-inicial',
      });

      expect((await consultarSaldoUC.execute('ins-001')).saldo).toBe(30);

      // Ajuste de dosis a 15L (sobraron 5L)
      const ajuste = await ajustarUC.execute({
        movimientoAnteriorId: original.id,
        nuevaCantidad: 15,
        usuarioId: 'usr-admin',
        claveIdempotencia: 'app-99-dosis-ajustada',
        motivoJustificacion: 'Sobró caldo en pulverizadora, corrección de dosis real',
      });

      expect(ajuste.reversion.tipoMovimiento).toBe('REVERSION');
      expect(ajuste.nuevoMovimiento.cantidad).toBe(15);

      const saldoFinal = await consultarSaldoUC.execute('ins-001');
      expect(saldoFinal.saldo).toBe(35); // 50 - 15 = 35
    });
  });

  describe('Manejo de envases abiertos (RF-M9-13)', () => {
    it('debe computar envases parcialmente abiertos en unidad de consumo', async () => {
      await registrarUC.execute({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        tipoMovimiento: 'SALIDA_CONSUMO',
        cantidad: 1.5,
        unidadMedida: 'L',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'env-1',
        esEnvaseAbierto: true,
        motivoJustificacion: 'Uso parcial',
      });

      const saldo = await consultarSaldoUC.execute('ins-001');
      expect(saldo.envasesAbiertos).toBe(1);
    });
  });
});
