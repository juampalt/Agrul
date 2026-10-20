import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryInsumoEquivalenciasRepository } from '../../mocks/in-memory-insumo-equivalencias.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import {
  RegistrarInsumoEquivalenciaUseCase,
  ListarEquivalenciasPorInsumoUseCase,
  ConvertirUnidadInsumoUseCase,
} from '../../../src/application/use-cases/insumo-equivalencias.use-cases.js';
import {
  EntidadNoEncontradaError,
  UnidadConversionInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Equivalencias y Conversión de Unidades de Insumos (AGRUL-041 / RF-M9-01, RF-M9-14, RN-12)', () => {
  let equivRepo: InMemoryInsumoEquivalenciasRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let registrarEquivUseCase: RegistrarInsumoEquivalenciaUseCase;
  let listarEquivUseCase: ListarEquivalenciasPorInsumoUseCase;
  let convertirUseCase: ConvertirUnidadInsumoUseCase;

  const insumoFito = InsumoCatalogo.crear({
    id: 'ins-fungicida-01',
    nombreComercial: 'Fungicida Cobre 50 WP',
    categoria: 'FITOSANITARIO',
    unidadMedidaId: 'KG',
    presentacion: 'Bolsa 25kg',
    fichaFitosanitaria: {
      principioActivo: 'Oxicloruro de Cobre',
      periodoCarenciaDias: 14,
      periodoReingresoHoras: 24,
      nroRegistroSenasa: 'SENASA-12345',
    },
  });

  const insumoFert = InsumoCatalogo.crear({
    id: 'ins-fertilizante-liq',
    nombreComercial: 'Fertilizante Foliar Potasio Líquido',
    categoria: 'FERTILIZANTE',
    unidadMedidaId: 'LT',
    presentacion: 'Bidón 20L',
  });

  beforeEach(async () => {
    equivRepo = new InMemoryInsumoEquivalenciasRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();

    await insumosRepo.guardar(insumoFito);
    await insumosRepo.guardar(insumoFert);

    registrarEquivUseCase = new RegistrarInsumoEquivalenciaUseCase(equivRepo, insumosRepo);
    listarEquivUseCase = new ListarEquivalenciasPorInsumoUseCase(equivRepo, insumosRepo);
    convertirUseCase = new ConvertirUnidadInsumoUseCase(equivRepo, insumosRepo);
  });

  it('debe registrar una equivalencia compra/consumo para un insumo existente (RF-M9-01)', async () => {
    const eq = await registrarEquivUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      unidadCompra: 'BIDON_20L',
      unidadConsumo: 'L',
      factorMultiplicador: 20,
      densidadKgL: 1.3,
    });

    expect(eq.id).toBeDefined();
    expect(eq.insumoId).toBe('ins-fertilizante-liq');
    expect(eq.unidadCompra).toBe('BIDON_20L');
    expect(eq.unidadConsumo).toBe('L');
    expect(eq.factorMultiplicador).toBe(20);
    expect(eq.densidadKgL).toBe(1.3);

    const lista = await listarEquivUseCase.execute('ins-fertilizante-liq');
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(eq.id);
  });

  it('debe arrojar EntidadNoEncontradaError al operar con un insumo inexistente', async () => {
    await expect(
      registrarEquivUseCase.execute({
        insumoId: 'ins-fantasma',
        unidadCompra: 'CAJA',
        unidadConsumo: 'UNIDAD',
        factorMultiplicador: 10,
      })
    ).rejects.toThrow(EntidadNoEncontradaError);

    await expect(listarEquivUseCase.execute('ins-fantasma')).rejects.toThrow(EntidadNoEncontradaError);

    await expect(
      convertirUseCase.execute({
        insumoId: 'ins-fantasma',
        cantidad: 10,
        unidadOrigen: 'L',
        unidadDestino: 'ML',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe convertir usando la equivalencia de compra a consumo (BIDON_20L -> L)', async () => {
    await registrarEquivUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      unidadCompra: 'BIDON_20L',
      unidadConsumo: 'L',
      factorMultiplicador: 20,
      densidadKgL: 1.25,
    });

    const res = await convertirUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      cantidad: 4,
      unidadOrigen: 'BIDON_20L',
      unidadDestino: 'L',
    });

    // 4 bidones * 20 = 80 L
    expect(res.cantidadOriginal).toBe(4);
    expect(res.cantidadConvertida).toBe(80);
    expect(res.unidadDestino).toBe('L');
  });

  it('debe convertir usando la densidad registrada de la equivalencia (BIDON_20L -> KG)', async () => {
    await registrarEquivUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      unidadCompra: 'BIDON_20L',
      unidadConsumo: 'L',
      factorMultiplicador: 20,
      densidadKgL: 1.25,
    });

    const res = await convertirUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      cantidad: 2,
      unidadOrigen: 'BIDON_20L',
      unidadDestino: 'KG',
    });

    // 2 bidones = 40 L; 40 L * 1.25 kg/L = 50 KG
    expect(res.cantidadConvertida).toBe(50);
    expect(res.densidadUtilizada).toBe(1.25);
  });

  it('debe prohibir la conversión automática de litros a kg si el insumo no tiene densidad registrada (RN-12 / RF-M9-14)', async () => {
    // Registramos equivalencia SIN densidad
    await registrarEquivUseCase.execute({
      insumoId: 'ins-fertilizante-liq',
      unidadCompra: 'BIDON_20L',
      unidadConsumo: 'L',
      factorMultiplicador: 20,
      densidadKgL: null,
    });

    await expect(
      convertirUseCase.execute({
        insumoId: 'ins-fertilizante-liq',
        cantidad: 10,
        unidadOrigen: 'L',
        unidadDestino: 'KG',
      })
    ).rejects.toThrow(UnidadConversionInvalidaError);
  });
});
