import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { CrearLoteUseCase, CodigoLoteDuplicadoError } from '../../../src/application/use-cases/crear-lote.use-case.js';
import { FormatoCodigoLoteInvalidoError } from '../../../src/core/domain/value-objects/codigo-lote.vo.js';

describe('CrearLoteUseCase', () => {
  let lotesRepo: InMemoryLotesRepository;
  let useCase: CrearLoteUseCase;

  beforeEach(() => {
    lotesRepo = new InMemoryLotesRepository();
    useCase = new CrearLoteUseCase(lotesRepo);
  });

  it('debe crear un lote con código explícito válido', async () => {
    const result = await useCase.execute({
      codigoLote: 'LOT-2026-00010',
      producto: 'Uva Red Globe',
      variedad: 'Primera',
      cantidadInicial: 2500,
      unidadMedida: 'KG',
    });

    expect(result.id).toBeDefined();
    expect(result.codigoLote).toBe('LOT-2026-00010');
    expect(result.estadoActual).toBe('CREADO');
    expect(result.cantidadActual).toBe(2500);

    const guardado = await lotesRepo.buscarPorId(result.id);
    expect(guardado).toBeDefined();
  });

  it('debe autogenerar un código de lote si no se envía uno', async () => {
    const result = await useCase.execute({
      producto: 'Manzana Gala',
      cantidadInicial: 800,
      unidadMedida: 'KG',
    });

    expect(result.codigoLote).toMatch(/^LOT-\d{4}-\d{5}$/);
  });

  it('debe rechazar la creación si el código ya existe', async () => {
    await useCase.execute({
      codigoLote: 'LOT-2026-00099',
      producto: 'Pera Williams',
      cantidadInicial: 1000,
      unidadMedida: 'KG',
    });

    await expect(
      useCase.execute({
        codigoLote: 'LOT-2026-00099',
        producto: 'Pera D’Anjou',
        cantidadInicial: 500,
        unidadMedida: 'KG',
      })
    ).rejects.toThrow(CodigoLoteDuplicadoError);
  });

  it('debe rechazar códigos con formato sintáctico inválido', async () => {
    await expect(
      useCase.execute({
        codigoLote: 'INVALIDO_123',
        producto: 'Pera Williams',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
      })
    ).rejects.toThrow(FormatoCodigoLoteInvalidoError);
  });
});
