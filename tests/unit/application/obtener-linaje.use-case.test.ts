import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryGenealogiaRepository } from '../../mocks/in-memory-genealogia.repository.js';
import { ObtenerLinajeUseCase } from '../../../src/application/use-cases/obtener-linaje.use-case.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { LoteGenealogia } from '../../../src/core/domain/entities/lote-genealogia.entity.js';

describe('ObtenerLinajeUseCase - Grafo N:M (Ancestros y Descendientes)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let useCase: ObtenerLinajeUseCase;

  let lotePadre1: Lote;
  let lotePadre2: Lote;
  let loteIntermedio: Lote;
  let loteHijoFinal: Lote;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    genealogiaRepo = new InMemoryGenealogiaRepository();
    useCase = new ObtenerLinajeUseCase(lotesRepo, genealogiaRepo);

    // Creamos una cadena de linaje: Padre1 + Padre2 -> Intermedio -> HijoFinal
    lotePadre1 = Lote.crear({
      id: 'p1111111-1111-1111-1111-111111111111',
      codigoLote: 'LOT-2026-00001',
      producto: 'Uva Malbec Parcela Norte',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
    });
    lotePadre2 = Lote.crear({
      id: 'p2222222-2222-2222-2222-222222222222',
      codigoLote: 'LOT-2026-00002',
      producto: 'Uva Malbec Parcela Sur',
      cantidadInicial: 3000,
      unidadMedida: 'KG',
    });
    loteIntermedio = Lote.crear({
      id: 'm3333333-3333-3333-3333-333333333333',
      codigoLote: 'LOT-2026-00003',
      producto: 'Mosto Malbec Blend Tanque 4',
      cantidadInicial: 7500,
      unidadMedida: 'LT',
    });
    loteHijoFinal = Lote.crear({
      id: 'h4444444-4444-4444-4444-444444444444',
      codigoLote: 'LOT-2026-00004',
      producto: 'Vino Malbec Embotellado 750ml',
      cantidadInicial: 5000,
      unidadMedida: 'BOT',
    });

    await lotesRepo.guardar(lotePadre1);
    await lotesRepo.guardar(lotePadre2);
    await lotesRepo.guardar(loteIntermedio);
    await lotesRepo.guardar(loteHijoFinal);

    // Relaciones genealógicas
    await genealogiaRepo.guardarRelaciones([
      LoteGenealogia.crear({
        id: 'g1111111-1111-1111-1111-111111111111',
        lotePadreId: lotePadre1.id,
        loteHijoId: loteIntermedio.id,
        cantidadAportada: 4500,
        unidadMedida: 'KG',
        motivoRelacion: 'BLEND_MERGE',
      }),
      LoteGenealogia.crear({
        id: 'g2222222-2222-2222-2222-222222222222',
        lotePadreId: lotePadre2.id,
        loteHijoId: loteIntermedio.id,
        cantidadAportada: 3000,
        unidadMedida: 'KG',
        motivoRelacion: 'BLEND_MERGE',
      }),
      LoteGenealogia.crear({
        id: 'g3333333-3333-3333-3333-333333333333',
        lotePadreId: loteIntermedio.id,
        loteHijoId: loteHijoFinal.id,
        cantidadAportada: 3750,
        unidadMedida: 'LT',
        motivoRelacion: 'SPLIT',
      }),
    ]);
  });

  it('debe reconstruir tanto ancestros como descendientes para un lote intermedio', async () => {
    const arbol = await useCase.execute(loteIntermedio.id);

    expect(arbol.loteObjetivo.codigoLote).toBe('LOT-2026-00003');
    // Ancestros directos: Padre 1 y Padre 2
    expect(arbol.ancestros).toHaveLength(2);
    const codigosAncestros = arbol.ancestros.map(a => a.codigoLote);
    expect(codigosAncestros).toContain('LOT-2026-00001');
    expect(codigosAncestros).toContain('LOT-2026-00002');

    // Descendientes directos: Hijo Final
    expect(arbol.descendientes).toHaveLength(1);
    expect(arbol.descendientes[0]?.codigoLote).toBe('LOT-2026-00004');
  });

  it('debe reconstruir toda la cadena aguas arriba (trace-back) para el producto final', async () => {
    const arbol = await useCase.execute(loteHijoFinal.id);

    expect(arbol.descendientes).toHaveLength(0); // Es el último eslabón
    // Ancestros recursivos: Tanque 4 + Parcelas Norte y Sur
    expect(arbol.ancestros.length).toBeGreaterThanOrEqual(3);
  });
});
