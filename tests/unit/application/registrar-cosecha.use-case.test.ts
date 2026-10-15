import { describe, it, expect, beforeEach } from 'vitest';
import {
  RegistrarCosechaUseCase,
  ListarCosechasUseCase,
  ObtenerCosechaPorIdUseCase,
} from '../../../src/application/use-cases/cosechas.use-cases.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import {
  CicloNoAbiertoError,
  CosechaInvalidaError,
  DesgloseCosechaInvalidoError,
  EntidadNoEncontradaError,
  FechaFuturaInvalidaError,
  InconsistenciaLoteCicloError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: RegistrarCosechaUseCase (AGRUL-028 / RF-M5-01 a RF-M5-06 / RN-07, RN-08, RN-09)', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let eventosRepo: InMemoryEventosRepository;

  let registrarCosechaUseCase: RegistrarCosechaUseCase;
  let listarCosechasUseCase: ListarCosechasUseCase;
  let obtenerCosechaUseCase: ObtenerCosechaPorIdUseCase;

  let loteId: string;
  let cicloId: string;
  const fechaHoyRef = new Date('2026-10-15T12:00:00Z');

  beforeEach(async () => {
    cosechasRepo = new InMemoryCosechasRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);

    registrarCosechaUseCase = new RegistrarCosechaUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      eventosRepo
    );

    listarCosechasUseCase = new ListarCosechasUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo
    );

    obtenerCosechaUseCase = new ObtenerCosechaPorIdUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo
    );

    // 1. Crear Lote base
    loteId = crypto.randomUUID();
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-003',
      producto: 'Cereza Lapins',
      variedad: 'Lapins',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    // 2. Crear Ciclo Productivo en estado ABIERTO
    cicloId = crypto.randomUUID();
    const ciclo = CicloProductivo.crear({
      id: cicloId,
      codigoCiclo: 'CICLO-2026-CER-01',
      loteId,
      cultivo: 'Cereza',
      variedad: 'Lapins',
      estado: 'ABIERTO',
      superficieCultivadaHa: 4.5,
      fechaInicio: '2026-09-01',
    });
    await ciclosRepo.guardar(ciclo);
  });

  it('debe registrar una cosecha exitosa, asignar código de trazabilidad único e incrementar stock del lote (RF-M5-01 / RN-07 / RN-08)', async () => {
    const output = await registrarCosechaUseCase.execute(
      {
        loteId,
        cicloId,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 850,
        cantidadDescarteKg: 150,
        motivoDescarte: 'CALIBRE_CHICO',
        observacionesCalidad: 'Color caoba uniforme, 18 Brix',
        recipientes: [{ tipo: 'BIN', cantidad: 3 }],
        superficieCosechadaHa: 2.0,
      },
      fechaHoyRef
    );

    expect(output.id).toBeDefined();
    expect(output.codigoTrazabilidad).toBe('COS-L03-20260915-01');
    expect(output.loteId).toBe(loteId);
    expect(output.codigoLote).toBe('LOT-2026-003');
    expect(output.cicloId).toBe(cicloId);
    expect(output.codigoCiclo).toBe('CICLO-2026-CER-01');
    expect(output.cantidadCosechadaKg).toBe(1000);
    expect(output.cantidadComercializableKg).toBe(850);
    expect(output.cantidadDescarteKg).toBe(150);
    expect(output.porcentajeComercializable).toBe(85);
    expect(output.porcentajeDescarte).toBe(15);
    expect(output.motivoDescarte).toBe('CALIBRE_CHICO');

    // Verificar que el stock del lote se incrementó con la fruta comercializable (RF-M5-04)
    const loteActualizado = await lotesRepo.buscarPorId(loteId);
    expect(loteActualizado?.cantidadActual).toBe(850);

    // Verificar que se registró el evento de trazabilidad inmutable COSECHA
    const eventosLote = await eventosRepo.listarPorLote(loteId);
    expect(eventosLote).toHaveLength(1);
    expect(eventosLote[0].tipoEvento).toBe('COSECHA');
  });

  it('debe permitir múltiples cosechas sucesivas sin sobrescribir y acumulando saldo con secuencias correlativas (RF-M5-04 / RN-08)', async () => {
    // Cosecha 1 el 2026-09-15
    const c1 = await registrarCosechaUseCase.execute(
      {
        loteId,
        cicloId,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 900,
        cantidadDescarteKg: 100,
        motivoDescarte: 'RAMAS_ROTAS',
      },
      fechaHoyRef
    );
    expect(c1.codigoTrazabilidad).toBe('COS-L03-20260915-01');

    // Cosecha 2 el mismo día 2026-09-15 -> secuencia 02
    const c2 = await registrarCosechaUseCase.execute(
      {
        loteId,
        cicloId,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 800,
        cantidadComercializableKg: 750,
        cantidadDescarteKg: 50,
        motivoDescarte: 'DESCARTE_MANCHA',
      },
      fechaHoyRef
    );
    expect(c2.codigoTrazabilidad).toBe('COS-L03-20260915-02');

    // Cosecha 3 en fecha distinta 2026-09-16 -> secuencia 01 para esa fecha
    const c3 = await registrarCosechaUseCase.execute(
      {
        loteId,
        cicloId,
        fecha: '2026-09-16',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
      },
      fechaHoyRef
    );
    expect(c3.codigoTrazabilidad).toBe('COS-L03-20260916-01');

    // Saldo comercializable acumulado en lote = 900 + 750 + 500 = 2150 kg (RF-M5-04)
    const loteActualizado = await lotesRepo.buscarPorId(loteId);
    expect(loteActualizado?.cantidadActual).toBe(2150);

    // Listar cosechas del lote
    const listado = await listarCosechasUseCase.execute({ loteId });
    expect(listado).toHaveLength(3);
  });

  it('debe fallar con DesgloseCosechaInvalidoError si comercializable + descarte !== total (RN-09)', async () => {
    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId,
          cicloId,
          fecha: '2026-09-15',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 800,
          cantidadDescarteKg: 150, // 800 + 150 = 950 != 1000
          motivoDescarte: 'DESCARTE_VARIO',
        },
        fechaHoyRef
      )
    ).rejects.toThrow(DesgloseCosechaInvalidoError);
  });

  it('debe fallar con CosechaInvalidaError si descarte > 0 sin motivo justificado (RF-M5-02)', async () => {
    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId,
          cicloId,
          fecha: '2026-09-15',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: undefined,
        },
        fechaHoyRef
      )
    ).rejects.toThrow(CosechaInvalidaError);
  });

  it('debe arrojar EntidadNoEncontradaError si el lote o ciclo no existen', async () => {
    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId: crypto.randomUUID(),
          cicloId,
          fecha: '2026-09-15',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        fechaHoyRef
      )
    ).rejects.toThrow(EntidadNoEncontradaError);

    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId,
          cicloId: crypto.randomUUID(),
          fecha: '2026-09-15',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        fechaHoyRef
      )
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe arrojar InconsistenciaLoteCicloError si el ciclo no pertenece al lote (RN-01)', async () => {
    const otroLoteId = crypto.randomUUID();
    const otroLote = Lote.crear({
      id: otroLoteId,
      codigoLote: 'LOT-2026-004',
      producto: 'Manzana Gala',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(otroLote);

    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId: otroLoteId,
          cicloId, // Pertenece a loteId, no a otroLoteId
          fecha: '2026-09-15',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        fechaHoyRef
      )
    ).rejects.toThrow(InconsistenciaLoteCicloError);
  });

  it('debe arrojar CicloNoAbiertoError si el ciclo se encuentra CERRADO (RN-03)', async () => {
    const cicloCerradoId = crypto.randomUUID();
    const cicloCerrado = CicloProductivo.crear({
      id: cicloCerradoId,
      codigoCiclo: 'CICLO-2026-CER-CERRADO',
      loteId,
      cultivo: 'Cereza',
      estado: 'CERRADO',
      superficieCultivadaHa: 4.5,
      fechaInicio: '2026-09-01',
    });
    await ciclosRepo.guardar(cicloCerrado);

    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId,
          cicloId: cicloCerradoId,
          fecha: '2026-09-15',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        fechaHoyRef
      )
    ).rejects.toThrow(CicloNoAbiertoError);
  });

  it('debe arrojar FechaFuturaInvalidaError si la fecha es posterior a la actual (RN-04)', async () => {
    await expect(
      registrarCosechaUseCase.execute(
        {
          loteId,
          cicloId,
          fecha: '2026-11-01',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        fechaHoyRef // 2026-10-15
      )
    ).rejects.toThrow(FechaFuturaInvalidaError);
  });

  it('debe obtener una cosecha por id mediante ObtenerCosechaPorIdUseCase', async () => {
    const creada = await registrarCosechaUseCase.execute(
      {
        loteId,
        cicloId,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 700,
        cantidadComercializableKg: 650,
        cantidadDescarteKg: 50,
        motivoDescarte: 'DESCARTE_CALIBRE',
      },
      fechaHoyRef
    );

    const obtenida = await obtenerCosechaUseCase.execute(creada.id);
    expect(obtenida.id).toBe(creada.id);
    expect(obtenida.codigoTrazabilidad).toBe(creada.codigoTrazabilidad);
    expect(obtenida.cantidadComercializableKg).toBe(650);
  });
});
