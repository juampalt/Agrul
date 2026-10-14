import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../../mocks/in-memory-genealogia.repository.js';
import { FusionarLotesUseCase } from '../../../src/application/use-cases/fusionar-lotes.use-case.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { RelacionGenealogicaInvalidaError } from '../../../src/core/domain/entities/lote-genealogia.entity.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';
import {
  CantidadInsuficienteError,
  EntidadNoEncontradaError,
  InvalidStateTransitionError,
} from '../../../src/core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from '../../../src/application/use-cases/crear-lote.use-case.js';

describe('FusionarLotesUseCase (Merge / Blend N:1)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let useCase: FusionarLotesUseCase;

  let padre1: Lote;
  let padre2: Lote;
  let padre3: Lote;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    useCase = new FusionarLotesUseCase(lotesRepo, eventosRepo, genealogiaRepo);

    padre1 = Lote.crear({
      id: '11111111-1111-1111-1111-111111111111',
      codigoLote: 'LOT-2026-00010',
      producto: 'Uva Malbec',
      variedad: 'Finca Las Paredes',
      cantidadInicial: 3000,
      unidadMedida: 'KG',
    });

    padre2 = Lote.crear({
      id: '22222222-2222-2222-2222-222222222222',
      codigoLote: 'LOT-2026-00020',
      producto: 'Uva Malbec',
      variedad: 'Finca El Retiro',
      cantidadInicial: 2000,
      unidadMedida: 'KG',
    });

    padre3 = Lote.crear({
      id: '33333333-3333-3333-3333-333333333333',
      codigoLote: 'LOT-2026-00030',
      producto: 'Uva Cabernet Franc',
      variedad: 'Finca La Consulta',
      cantidadInicial: 1500,
      unidadMedida: 'KG',
    });

    await lotesRepo.guardar(padre1);
    await lotesRepo.guardar(padre2);
    await lotesRepo.guardar(padre3);
  });

  it('debe fusionar múltiples lotes padres en un nuevo lote hijo (Blend/Merge N:1), descontar stock y registrar linaje y eventos', async () => {
    const res = await useCase.execute({
      padres: [
        { loteId: padre1.id, cantidad: 2000 },
        { loteId: padre2.id, cantidad: 1500 },
        { loteId: padre3.id, cantidad: 500 },
      ],
      nuevoLote: {
        codigoLote: 'LOT-2026-BLEND01',
        producto: 'Vino Tinto Corte Especial',
        variedad: 'Malbec / Cabernet Franc',
        unidadMedida: 'KG',
      },
      actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      motivo: 'Corte en tanque de fermentación 04',
    });

    // 1. Validar lote hijo resultante
    expect(res.loteHijo.codigoLote).toBe('LOT-2026-BLEND01');
    expect(res.loteHijo.producto).toBe('Vino Tinto Corte Especial');
    expect(res.loteHijo.cantidadActual).toBe(4000); // 2000 + 1500 + 500
    expect(res.loteHijo.estadoActual).toBe('EN_PROCESO');

    // 2. Validar actualización de los padres en respuesta
    expect(res.lotesPadres).toHaveLength(3);
    const p1Res = res.lotesPadres.find(p => p.id === padre1.id);
    const p2Res = res.lotesPadres.find(p => p.id === padre2.id);
    const p3Res = res.lotesPadres.find(p => p.id === padre3.id);
    expect(p1Res?.cantidadActual).toBe(1000); // 3000 - 2000
    expect(p2Res?.cantidadActual).toBe(500);  // 2000 - 1500
    expect(p3Res?.cantidadActual).toBe(1000); // 1500 - 500

    // 3. Validar aristas genealógicas
    expect(res.aristasGenealogia).toHaveLength(3);
    for (const arista of res.aristasGenealogia) {
      expect(arista.loteHijoId).toBe(res.loteHijo.id);
      expect(arista.motivoRelacion).toBe('BLEND_MERGE');
    }

    // 4. Validar eventos de trazabilidad
    expect(res.eventosOrigen).toHaveLength(3);
    for (const evt of res.eventosOrigen) {
      expect(evt.tipoEvento).toBe(TipoEventoEnum.FUSION_ORIGEN);
    }
    expect(res.eventoRecepcion.tipoEvento).toBe(TipoEventoEnum.FUSION_RECEPCION);
    expect(res.eventoRecepcion.loteId).toBe(res.loteHijo.id);

    // 5. Validar persistencia real en repositorios
    const hijoEnRepo = await lotesRepo.buscarPorId(res.loteHijo.id);
    expect(hijoEnRepo).toBeDefined();
    expect(hijoEnRepo?.cantidadActual).toBe(4000);

    const p1EnRepo = await lotesRepo.buscarPorId(padre1.id);
    expect(p1EnRepo?.cantidadActual).toBe(1000);

    const padresDelHijo = await genealogiaRepo.buscarPadres(res.loteHijo.id);
    expect(padresDelHijo).toHaveLength(3);
  });

  it('debe lanzar CantidadInsuficienteError si alguno de los padres no tiene stock suficiente (Rollback total)', async () => {
    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 1000 },
          { loteId: padre2.id, cantidad: 2500 }, // Stock disponible: 2000
        ],
        nuevoLote: {
          producto: 'Vino Malbec Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(CantidadInsuficienteError);

    // Verificar que ningún padre fue mutado
    const p1Repo = await lotesRepo.buscarPorId(padre1.id);
    expect(p1Repo?.cantidadActual).toBe(3000);
    const p2Repo = await lotesRepo.buscarPorId(padre2.id);
    expect(p2Repo?.cantidadActual).toBe(2000);
  });

  it('debe lanzar EntidadNoEncontradaError si alguno de los lotes padre no existe', async () => {
    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 1000 },
          { loteId: '99999999-9999-9999-9999-999999999999', cantidad: 500 },
        ],
        nuevoLote: {
          producto: 'Vino Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe lanzar RelacionGenealogicaInvalidaError si se envían menos de 2 padres', async () => {
    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 1000 },
        ],
        nuevoLote: {
          producto: 'Vino Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(RelacionGenealogicaInvalidaError);
  });

  it('debe lanzar RelacionGenealogicaInvalidaError si se envían lotes padres duplicados', async () => {
    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 500 },
          { loteId: padre1.id, cantidad: 500 },
        ],
        nuevoLote: {
          producto: 'Vino Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(RelacionGenealogicaInvalidaError);
  });

  it('debe lanzar CodigoLoteDuplicadoError si el código del nuevo lote ya existe', async () => {
    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 500 },
          { loteId: padre2.id, cantidad: 500 },
        ],
        nuevoLote: {
          codigoLote: 'LOT-2026-00010', // Código ya ocupado por padre1
          producto: 'Vino Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(CodigoLoteDuplicadoError);
  });

  it('debe rechazar fusión si alguno de los padres está en estado CERRADO', async () => {
    padre1.cerrarLote();
    await lotesRepo.actualizar(padre1);

    await expect(
      useCase.execute({
        padres: [
          { loteId: padre1.id, cantidad: 500 },
          { loteId: padre2.id, cantidad: 500 },
        ],
        nuevoLote: {
          producto: 'Vino Mezcla',
          unidadMedida: 'KG',
        },
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        ubicacionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
