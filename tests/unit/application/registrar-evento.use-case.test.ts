import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { RegistrarEventoUseCase } from '../../../src/application/use-cases/registrar-evento.use-case.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';
import { EntidadNoEncontradaError, InvalidStateTransitionError } from '../../../src/core/domain/errors/domain.error.js';

describe('RegistrarEventoUseCase', () => {
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let useCase: RegistrarEventoUseCase;
  let loteExistente: Lote;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    useCase = new RegistrarEventoUseCase(lotesRepo, eventosRepo);

    loteExistente = Lote.crear({
      id: '11111111-1111-1111-1111-111111111111',
      codigoLote: 'LOT-2026-00001',
      producto: 'Cereza Lapins',
      cantidadInicial: 3000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteExistente);
  });

  it('debe registrar un evento de PROCESO y actualizar el estado del lote en la misma unidad transaccional', async () => {
    const result = await useCase.execute({
      loteId: loteExistente.id,
      actorId: '22222222-2222-2222-2222-222222222222',
      ubicacionId: '33333333-3333-3333-3333-333333333333',
      tipoEvento: TipoEventoEnum.PROCESO,
      timestampCapturaLocal: '2026-10-03T19:00:00.000Z',
      payloadEspecifico: { lineaLavado: 2, temperaturaAgua: 3.5 },
    });

    expect(result.id).toBeDefined();
    expect(result.tipoEvento).toBe(TipoEventoEnum.PROCESO);

    // Verificar que el evento se persistió
    const evPersistido = await eventosRepo.buscarPorId(result.id);
    expect(evPersistido).toBeDefined();

    // Verificar que el estado del lote en el repositorio cambió a EN_PROCESO
    const loteActualizado = await lotesRepo.buscarPorId(loteExistente.id);
    expect(loteActualizado?.estadoActual).toBe('EN_PROCESO');
  });

  it('debe lanzar EntidadNoEncontradaError si el lote no existe', async () => {
    await expect(
      useCase.execute({
        loteId: '00000000-0000-0000-0000-000000000000',
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        tipoEvento: TipoEventoEnum.COSECHA,
        payloadEspecifico: {},
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe rechazar eventos sobre lotes cerrados', async () => {
    loteExistente.cerrarLote();
    await lotesRepo.actualizar(loteExistente);

    await expect(
      useCase.execute({
        loteId: loteExistente.id,
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        tipoEvento: TipoEventoEnum.EMBALAJE,
        payloadEspecifico: {},
      })
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('debe validar que el evento referenciado exista para eventos compensatorios', async () => {
    // Si no existe el evento referenciado
    await expect(
      useCase.execute({
        loteId: loteExistente.id,
        actorId: '22222222-2222-2222-2222-222222222222',
        ubicacionId: '33333333-3333-3333-3333-333333333333',
        tipoEvento: TipoEventoEnum.COMPENSACION_AJUSTE,
        eventoReferenciadoId: '88888888-8888-8888-8888-888888888888',
        payloadEspecifico: { motivo: 'Error de pesaje balanza 3' },
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });
});
