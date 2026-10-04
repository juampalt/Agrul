import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../../mocks/in-memory-genealogia.repository.js';
import { DividirLoteUseCase } from '../../../src/application/use-cases/dividir-lote.use-case.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';
import {
  CantidadInsuficienteError,
  EntidadNoEncontradaError,
  InvalidStateTransitionError,
} from '../../../src/core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from '../../../src/application/use-cases/crear-lote.use-case.js';

describe('DividirLoteUseCase (Split 1:N)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let useCase: DividirLoteUseCase;
  let lotePadre: Lote;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    useCase = new DividirLoteUseCase(lotesRepo, eventosRepo, genealogiaRepo);

    lotePadre = Lote.crear({
      id: '11111111-1111-1111-1111-111111111111',
      codigoLote: 'LOT-2026-00050',
      producto: 'Arándano Duke',
      variedad: 'Calibre 16+',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lotePadre);
  });

  it('debe fraccionar un lote padre en N hijos, descontar stock y persistir genealogía y auditoría', async () => {
    const res = await useCase.execute({
      loteId: lotePadre.id,
      actorId: '22222222-2222-2222-2222-222222222222',
      ubicacionId: '33333333-3333-3333-3333-333333333333',
      motivo: 'Clasificación por tamaño y empaque exportación',
      hijos: [
        { cantidad: 2000, variedad: 'Calibre Premium', unidadMedida: 'KG' },
        { cantidad: 3000, variedad: 'Calibre Estándar', unidadMedida: 'KG' },
      ],
    });

    // 1. Validar respuesta
    expect(res.lotePadre.cantidadActual).toBe(0);
    expect(res.lotePadre.estadoActual).toBe('EN_PROCESO');
    expect(res.lotesHijos).toHaveLength(2);
    expect(res.aristasGenealogia).toHaveLength(2);
    expect(res.eventoSplit.tipoEvento).toBe(TipoEventoEnum.DIVISION_SPLIT);

    // 2. Validar persistencia en repositorios
    const padreEnRepo = await lotesRepo.buscarPorId(lotePadre.id);
    expect(padreEnRepo?.cantidadActual).toBe(0);
    expect(padreEnRepo?.estadoActual).toBe('EN_PROCESO');

    for (const hijoDto of res.lotesHijos) {
      const hijoEnRepo = await lotesRepo.buscarPorId(hijoDto.id);
      expect(hijoEnRepo).toBeDefined();
      expect(hijoEnRepo?.producto).toBe('Arándano Duke');
    }

    // 3. Validar aristas genealógicas en repositorio
    const aristasHijos = await genealogiaRepo.buscarHijos(lotePadre.id);
    expect(aristasHijos).toHaveLength(2);
    expect(aristasHijos[0].motivoRelacion).toBe('SPLIT');
    expect(aristasHijos[1].motivoRelacion).toBe('SPLIT');

    // 4. Validar evento de auditoría
    const eventos = await eventosRepo.listarPorLote(lotePadre.id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipoEvento).toBe(TipoEventoEnum.DIVISION_SPLIT);
  });

  it('debe permitir split parcial dejando stock remanente en el padre', async () => {
    const res = await useCase.execute({
      loteId: lotePadre.id,
      actorId: '22222222-2222-2222-2222-222222222222',
      ubicacionId: '33333333-3333-3333-3333-333333333333',
      hijos: [
        { cantidad: 1200 },
        { cantidad: 800 },
      ],
    });

    expect(res.lotePadre.cantidadActual).toBe(3000);
    const padreEnRepo = await lotesRepo.buscarPorId(lotePadre.id);
    expect(padreEnRepo?.cantidadActual).toBe(3000);
  });

  it('debe lanzar CantidadInsuficienteError si la suma de los hijos excede el stock del padre', async () => {
    await expect(
      useCase.execute({
        loteId: lotePadre.id,
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        hijos: [
          { cantidad: 3000 },
          { cantidad: 2500 }, // Suma: 5500 > 5000
        ],
      })
    ).rejects.toThrow(CantidadInsuficienteError);
  });

  it('debe lanzar EntidadNoEncontradaError si el lote padre no existe', async () => {
    await expect(
      useCase.execute({
        loteId: '00000000-0000-0000-0000-000000000000',
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        hijos: [{ cantidad: 500 }],
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe lanzar CodigoLoteDuplicadoError si un hijo especifica un código existente', async () => {
    // Crear lote previo con código existente
    const loteExistente = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-99999',
      producto: 'Manzana Gala',
      cantidadInicial: 100,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteExistente);

    await expect(
      useCase.execute({
        loteId: lotePadre.id,
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        hijos: [
          { codigoLote: 'LOT-2026-99999', cantidad: 500 },
        ],
      })
    ).rejects.toThrow(CodigoLoteDuplicadoError);
  });

  it('debe rechazar división si el lote padre está cerrado', async () => {
    lotePadre.cerrarLote();
    await lotesRepo.actualizar(lotePadre);

    await expect(
      useCase.execute({
        loteId: lotePadre.id,
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        hijos: [{ cantidad: 500 }],
      })
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
