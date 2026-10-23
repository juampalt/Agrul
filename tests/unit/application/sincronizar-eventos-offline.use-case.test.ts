import { describe, it, expect, beforeEach } from 'vitest';
import { SincronizarEventosOfflineUseCase } from '../../../src/application/use-cases/sincronizar-eventos-offline.use-case.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';

describe('AGRUL-049: SincronizarEventosOfflineUseCase (RNF-02 / RN-11)', () => {
  let eventosRepo: InMemoryEventosRepository;
  let useCase: SincronizarEventosOfflineUseCase;

  const LOTE_ID = 'e0000000-0000-4000-8000-000000000001';
  const ACTOR_ID = 'a0000000-0000-4000-8000-000000000001';
  const UBICACION_ID = 'u0000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    const lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    useCase = new SincronizarEventosOfflineUseCase(eventosRepo);
  });

  it('debe sincronizar en batch un conjunto de eventos capturados offline', async () => {
    const input = {
      dispositivoId: 'android-tablet-lules-01',
      eventos: [
        {
          idLocalTemporal: 'local-temp-01',
          loteId: LOTE_ID,
          actorId: ACTOR_ID,
          ubicacionId: UBICACION_ID,
          tipoEvento: 'COSECHA',
          timestampCapturaLocal: '2026-10-23T10:00:00.000Z',
          payloadEspecifico: { cantidadKg: 500 },
        },
        {
          idLocalTemporal: 'local-temp-02',
          loteId: LOTE_ID,
          actorId: ACTOR_ID,
          ubicacionId: UBICACION_ID,
          tipoEvento: 'RECEPCION',
          timestampCapturaLocal: '2026-10-23T11:00:00.000Z',
          payloadEspecifico: { bins: 2 },
        },
      ],
    };

    const resultado = await useCase.execute(input);

    expect(resultado.dispositivoId).toBe('android-tablet-lules-01');
    expect(resultado.totalRecibidos).toBe(2);
    expect(resultado.insertados).toBe(2);
    expect(resultado.fallidos).toHaveLength(0);

    const eventosPersistidos = await eventosRepo.listarPorLote(LOTE_ID);
    expect(eventosPersistidos).toHaveLength(2);
    expect(eventosPersistidos[0].estadoSincronizacion).toBe('PENDIENTE_AUDITORIA_OFFLINE');
  });

  it('debe registrar como fallidos eventos con tipo de evento no soportado sin abortar el resto del lote', async () => {
    const input = {
      dispositivoId: 'android-rugged-02',
      eventos: [
        {
          idLocalTemporal: 'temp-valido',
          loteId: LOTE_ID,
          actorId: ACTOR_ID,
          ubicacionId: UBICACION_ID,
          tipoEvento: 'COSECHA',
          timestampCapturaLocal: '2026-10-23T12:00:00.000Z',
          payloadEspecifico: { cantidadKg: 300 },
        },
        {
          idLocalTemporal: 'temp-invalido',
          loteId: LOTE_ID,
          actorId: ACTOR_ID,
          ubicacionId: UBICACION_ID,
          tipoEvento: 'TIPO_INVENTADO_NO_EXISTE',
          timestampCapturaLocal: '2026-10-23T12:05:00.000Z',
          payloadEspecifico: {},
        },
      ],
    };

    const resultado = await useCase.execute(input);

    expect(resultado.totalRecibidos).toBe(2);
    expect(resultado.insertados).toBe(1);
    expect(resultado.fallidos).toContain('temp-invalido');

    const eventosPersistidos = await eventosRepo.listarPorLote(LOTE_ID);
    expect(eventosPersistidos).toHaveLength(1);
  });
});
