import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import {
  RegistrarInsumoCatalogoUseCase,
  ListarInsumosCatalogoUseCase,
  ObtenerInsumoPorIdUseCase,
  InsumoDuplicadoError,
} from '../../../src/application/use-cases/insumos-catalogo.use-cases.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Catálogo de Insumos Fitosanitarios (AGRUL-024)', () => {
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let registrarUseCase: RegistrarInsumoCatalogoUseCase;
  let listarUseCase: ListarInsumosCatalogoUseCase;
  let obtenerUseCase: ObtenerInsumoPorIdUseCase;

  beforeEach(() => {
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    registrarUseCase = new RegistrarInsumoCatalogoUseCase(insumosRepo);
    listarUseCase = new ListarInsumosCatalogoUseCase(insumosRepo);
    obtenerUseCase = new ObtenerInsumoPorIdUseCase(insumosRepo);
  });

  it('debe registrar un insumo fertilizante exitosamente sin ficha fitosanitaria', async () => {
    const output = await registrarUseCase.execute({
      nombreComercial: 'Nitrato de Calcio',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 25kg',
    });

    expect(output.id).toBeDefined();
    expect(output.nombreComercial).toBe('Nitrato de Calcio');
    expect(output.categoria).toBe('FERTILIZANTE');
    expect(output.fichaFitosanitaria).toBeNull();
    expect(output.activo).toBe(true);

    const guardado = await insumosRepo.buscarPorId(output.id);
    expect(guardado).not.toBeNull();
  });

  it('debe registrar un insumo fitosanitario con ficha técnica respetando RN-14', async () => {
    const output = await registrarUseCase.execute({
      nombreComercial: 'Spinosad 48 SC',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'LT',
      presentacion: 'Botella 1L',
      fichaFitosanitaria: {
        principioActivo: 'Spinosad',
        periodoCarenciaDias: 1,
        periodoReingresoHoras: 4,
        nroRegistroSenasa: 'SENASA-36890',
        toxicologia: 'Clase IV - Productos que normalmente no ofrecen peligro (Banda Verde)',
      },
    });

    expect(output.id).toBeDefined();
    expect(output.nombreComercial).toBe('Spinosad 48 SC');
    expect(output.categoria).toBe('FITOSANITARIO');
    expect(output.fichaFitosanitaria).toBeDefined();
    expect(output.fichaFitosanitaria?.principioActivo).toBe('Spinosad');
    expect(output.fichaFitosanitaria?.periodoCarenciaDias).toBe(1);
    expect(output.fichaFitosanitaria?.periodoReingresoHoras).toBe(4);
    expect(output.fichaFitosanitaria?.nroRegistroSenasa).toBe('SENASA-36890');
  });

  it('debe rechazar el registro de un insumo con nombre comercial duplicado (case-insensitive)', async () => {
    await registrarUseCase.execute({
      nombreComercial: 'Sulfato de Cobre',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 25kg',
    });

    await expect(
      registrarUseCase.execute({
        nombreComercial: 'sulfato de cobre',
        categoria: 'ENMIENDA',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa 10kg',
      })
    ).rejects.toThrow(InsumoDuplicadoError);
  });

  it('debe listar insumos con y sin filtros de categoría y activo', async () => {
    await registrarUseCase.execute({
      nombreComercial: 'Fosfato Monoamónico',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 25kg',
    });

    await registrarUseCase.execute({
      nombreComercial: 'Azoxistrobina 25 SC',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'LT',
      presentacion: 'Bidón 5L',
      fichaFitosanitaria: {
        principioActivo: 'Azoxistrobina',
        periodoCarenciaDias: 3,
        periodoReingresoHoras: 12,
        nroRegistroSenasa: 'SENASA-34500',
      },
    });

    const todos = await listarUseCase.execute();
    expect(todos.length).toBe(2);

    const soloFitosanitarios = await listarUseCase.execute({ categoria: 'FITOSANITARIO' });
    expect(soloFitosanitarios.length).toBe(1);
    expect(soloFitosanitarios[0].nombreComercial).toBe('Azoxistrobina 25 SC');

    const soloFertilizantes = await listarUseCase.execute({ categoria: 'FERTILIZANTE' });
    expect(soloFertilizantes.length).toBe(1);
    expect(soloFertilizantes[0].nombreComercial).toBe('Fosfato Monoamónico');
  });

  it('debe obtener un insumo por id o arrojar EntidadNoEncontradaError', async () => {
    const nuevo = await registrarUseCase.execute({
      nombreComercial: 'Dolomita Agrícola',
      categoria: 'ENMIENDA',
      unidadMedidaId: 'KG',
      presentacion: 'Big bag 1000kg',
    });

    const encontrado = await obtenerUseCase.execute(nuevo.id);
    expect(encontrado.id).toBe(nuevo.id);
    expect(encontrado.nombreComercial).toBe('Dolomita Agrícola');

    await expect(obtenerUseCase.execute('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      EntidadNoEncontradaError
    );
  });
});
