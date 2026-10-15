import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryDestinatariosRepository } from '../../mocks/in-memory-destinatarios.repository.js';
import { InMemoryDespachosRepository } from '../../mocks/in-memory-despachos.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import {
  CrearDestinatarioUseCase,
  RegistrarDespachoUseCase,
  ConsultarSaldoCosechaUseCase,
  ListarDespachosUseCase,
  ObtenerDespachoPorIdUseCase,
} from '../../../src/application/use-cases/despachos.use-cases.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import {
  EntidadNoEncontradaError,
  SaldoComercializableExcedidoError,
  DespachoInvalidoError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Despachos, Destinos y Saldo Comercializable (AGRUL-029)', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let destinatariosRepo: InMemoryDestinatariosRepository;
  let despachosRepo: InMemoryDespachosRepository;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;

  let crearDestinatarioUC: CrearDestinatarioUseCase;
  let registrarDespachoUC: RegistrarDespachoUseCase;
  let consultarSaldoUC: ConsultarSaldoCosechaUseCase;
  let listarDespachosUC: ListarDespachosUseCase;
  let obtenerDespachoPorIdUC: ObtenerDespachoPorIdUseCase;

  const loteId = 'lote-manzana-01';
  const cicloId = 'ciclo-manzana-01';
  const cosechaId = 'cosecha-001';
  let destinatarioId: string;

  beforeEach(async () => {
    cosechasRepo = new InMemoryCosechasRepository();
    destinatariosRepo = new InMemoryDestinatariosRepository();
    despachosRepo = new InMemoryDespachosRepository();
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);

    crearDestinatarioUC = new CrearDestinatarioUseCase(destinatariosRepo);
    registrarDespachoUC = new RegistrarDespachoUseCase(
      cosechasRepo,
      destinatariosRepo,
      despachosRepo,
      lotesRepo,
      eventosRepo
    );
    consultarSaldoUC = new ConsultarSaldoCosechaUseCase(
      cosechasRepo,
      despachosRepo,
      destinatariosRepo
    );
    listarDespachosUC = new ListarDespachosUseCase(despachosRepo, destinatariosRepo);
    obtenerDespachoPorIdUC = new ObtenerDespachoPorIdUseCase(despachosRepo, destinatariosRepo);

    // 1. Guardar Lote
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-00010',
      producto: 'Manzana Gala',
      variedad: 'Royal Gala',
      cantidadInicial: 10000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    // 2. Guardar Cosecha (2000 kg total, 1750 kg comercializable, 250 kg descarte)
    const cosecha = Cosecha.crear({
      id: cosechaId,
      codigoTrazabilidad: 'COS-L10-20260920-01',
      loteId,
      cicloId,
      fecha: '2026-09-20',
      cantidadCosechadaKg: 2000,
      cantidadComercializableKg: 1750,
      cantidadDescarteKg: 250,
      motivoDescarte: 'CALIBRE_CHICO',
    });
    await cosechasRepo.guardar(cosecha);

    // 3. Crear Destinatario
    const dest = await crearDestinatarioUC.ejecutar({
      nombre: 'Frutas del Sur Embalajes S.A.',
      tipo: 'EMPAQUE',
      cuit: '30-99887766-5',
      direccion: 'Ruta 151 Km 5',
      localidad: 'Fernández Oro',
      provincia: 'Río Negro',
    });
    destinatarioId = dest.id;
  });

  it('debe registrar un despacho exitoso con cálculo inmediato del saldo remanente (RF-M5-07 / RF-M5-09)', async () => {
    const res = await registrarDespachoUC.ejecutar({
      cosechaId,
      destinatarioId,
      tipoDestino: 'EMPAQUE' as any,
      cantidadEnviadaKg: 750,
      fecha: '2026-09-21',
      nroGuiaRemito: 'REM-0001-00055441',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Frutícola Patagónica S.R.L.',
      precinto: 'PREC-88991',
    });

    expect(res.despacho.id).toBeDefined();
    expect(res.despacho.cosechaId).toBe(cosechaId);
    expect(res.despacho.cantidadEnviadaKg).toBe(750);
    expect(res.despacho.destinatarioNombre).toBe('Frutas del Sur Embalajes S.A.');
    expect(res.despacho.nroGuiaRemito).toBe('REM-0001-00055441');

    // Validación inmediata del saldo (RF-M5-09)
    // Comercializable: 1750. Despachado: 750. Saldo remanente: 1000.
    expect(res.saldo.cantidadComercializableKg).toBe(1750);
    expect(res.saldo.totalDespachadoKg).toBe(750);
    expect(res.saldo.saldoRemanenteKg).toBe(1000);
    expect(res.saldo.porcentajeDespachado).toBe(42.86);

    // Debe haber registrado evento de trazabilidad inmutable
    const eventos = await eventosRepo.listarPorLote(loteId);
    const evDespacho = eventos.find(e => e.tipoEvento === 'DESPACHO');
    expect(evDespacho).toBeDefined();
    expect(evDespacho?.payloadEspecifico.cantidadEnviadaKg).toBe(750);
    expect(evDespacho?.payloadEspecifico.saldoRemanenteKg).toBe(1000);
  });

  it('debe permitir múltiples despachos sucesivos deduciendo correctamente el saldo', async () => {
    // Primer envío: 1000 kg -> remanente 750 kg
    await registrarDespachoUC.ejecutar({
      cosechaId,
      destinatarioId,
      tipoDestino: 'INDUSTRIA',
      cantidadEnviadaKg: 1000,
      fecha: '2026-09-21',
      nroGuiaRemito: 'REM-0001-00055442',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Frutícola Patagónica S.R.L.',
    });

    // Segundo envío: 750 kg -> remanente 0 kg (100% despachado)
    const res2 = await registrarDespachoUC.ejecutar({
      cosechaId,
      destinatarioId,
      tipoDestino: 'VENTA_DIRECTA',
      cantidadEnviadaKg: 750,
      fecha: '2026-09-22',
      nroGuiaRemito: 'REM-0001-00055443',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Frutícola Patagónica S.R.L.',
    });

    expect(res2.saldo.totalDespachadoKg).toBe(1750);
    expect(res2.saldo.saldoRemanenteKg).toBe(0);
    expect(res2.saldo.porcentajeDespachado).toBe(100);
  });

  it('debe rechazar con SaldoComercializableExcedidoError si el envío supera el saldo comercializable disponible (RN-09)', async () => {
    // Primer envío: 1200 kg -> queda 550 kg
    await registrarDespachoUC.ejecutar({
      cosechaId,
      destinatarioId,
      tipoDestino: 'MERCADO_FRESCO',
      cantidadEnviadaKg: 1200,
      fecha: '2026-09-21',
      nroGuiaRemito: 'REM-0001-00055444',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Frutícola Patagónica S.R.L.',
    });

    // Intento de despachar 600 kg cuando solo quedan 550 kg
    await expect(
      registrarDespachoUC.ejecutar({
        cosechaId,
        destinatarioId,
        tipoDestino: 'MERCADO_FRESCO',
        cantidadEnviadaKg: 600,
        fecha: '2026-09-22',
        nroGuiaRemito: 'REM-0001-00055445',
        renspaFinca: '16.023.0.00142/00',
        productor: 'Frutícola Patagónica S.R.L.',
      })
    ).rejects.toThrow(SaldoComercializableExcedidoError);
  });

  it('debe lanzar EntidadNoEncontradaError si la cosecha no existe', async () => {
    await expect(
      registrarDespachoUC.ejecutar({
        cosechaId: 'cosecha-inexistente',
        destinatarioId,
        tipoDestino: 'MERCADO_FRESCO',
        cantidadEnviadaKg: 100,
        fecha: '2026-09-21',
        nroGuiaRemito: 'REM-0001-00055446',
        renspaFinca: '16.023.0.00142/00',
        productor: 'Frutícola Patagónica S.R.L.',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe lanzar EntidadNoEncontradaError si el destinatario no existe', async () => {
    await expect(
      registrarDespachoUC.ejecutar({
        cosechaId,
        destinatarioId: 'destinatario-inexistente',
        tipoDestino: 'MERCADO_FRESCO',
        cantidadEnviadaKg: 100,
        fecha: '2026-09-21',
        nroGuiaRemito: 'REM-0001-00055447',
        renspaFinca: '16.023.0.00142/00',
        productor: 'Frutícola Patagónica S.R.L.',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe rechazar el despacho si el destinatario está inactivo', async () => {
    const destInactivo = await crearDestinatarioUC.ejecutar({
      nombre: 'Destinatario Clausurado',
      tipo: 'OTRO',
    });
    const entDest = await destinatariosRepo.buscarPorId(destInactivo.id);
    entDest?.desactivar();
    await destinatariosRepo.guardar(entDest!);

    await expect(
      registrarDespachoUC.ejecutar({
        cosechaId,
        destinatarioId: destInactivo.id,
        tipoDestino: 'OTRO',
        cantidadEnviadaKg: 100,
        fecha: '2026-09-21',
        nroGuiaRemito: 'REM-0001-00055448',
        renspaFinca: '16.023.0.00142/00',
        productor: 'Frutícola Patagónica S.R.L.',
      })
    ).rejects.toThrow(DespachoInvalidoError);
  });

  it('debe consultar el saldo y listado de despachos en tiempo real (RF-M5-09)', async () => {
    await registrarDespachoUC.ejecutar({
      cosechaId,
      destinatarioId,
      tipoDestino: 'EXPORTACION',
      cantidadEnviadaKg: 500,
      fecha: '2026-09-21',
      nroGuiaRemito: 'REM-0001-00055449',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Frutícola Patagónica S.R.L.',
    });

    const saldo = await consultarSaldoUC.ejecutar(cosechaId);
    expect(saldo.cosechaId).toBe(cosechaId);
    expect(saldo.codigoTrazabilidad).toBe('COS-L10-20260920-01');
    expect(saldo.cantidadComercializableKg).toBe(1750);
    expect(saldo.totalDespachadoKg).toBe(500);
    expect(saldo.saldoRemanenteKg).toBe(1250);
    expect(saldo.despachos).toHaveLength(1);
    expect(saldo.despachos[0].destinatarioNombre).toBe('Frutas del Sur Embalajes S.A.');
  });
});
