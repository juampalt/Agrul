import { describe, it, expect, beforeEach } from 'vitest';
import {
  RegistrarAplicacionUseCase,
  ListarAplicacionesUseCase,
  ObtenerAplicacionPorIdUseCase,
} from '../../../src/application/use-cases/aplicaciones.use-cases.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CicloNoAbiertoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Aplicaciones Agrícolas (AGRUL-025)', () => {
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;

  let registrarUseCase: RegistrarAplicacionUseCase;
  let listarUseCase: ListarAplicacionesUseCase;
  let obtenerPorIdUseCase: ObtenerAplicacionPorIdUseCase;

  let loteId: string;
  let cicloAbiertoId: string;
  let actividadId: string;
  let insumoFitoId: string;
  let insumoFertId: string;

  const hoyFijo = new Date('2026-10-15T12:00:00Z');

  beforeEach(async () => {
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();

    registrarUseCase = new RegistrarAplicacionUseCase(
      aplicacionesRepo,
      actividadesRepo,
      lotesRepo,
      ciclosRepo,
      insumosRepo,
    );
    listarUseCase = new ListarAplicacionesUseCase(aplicacionesRepo, insumosRepo);
    obtenerPorIdUseCase = new ObtenerAplicacionPorIdUseCase(aplicacionesRepo, insumosRepo);

    // 1. Crear Lote
    loteId = crypto.randomUUID();
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-APL01',
      producto: 'Frutilla San Andreas',
      cantidadInicial: 10000,
      unidadMedida: 'KG',
      superficieHa: 5.0,
    });
    await lotesRepo.guardar(lote);

    // 2. Crear Ciclo Productivo ABIERTO
    cicloAbiertoId = crypto.randomUUID();
    const ciclo = CicloProductivo.crear({
      id: cicloAbiertoId,
      codigoCiclo: 'CICLO-2026-APL-01',
      loteId,
      cultivo: 'Frutilla',
      variedad: 'San Andreas',
      estado: 'ABIERTO',
      superficieCultivadaHa: 5.0,
      fechaInicio: '2026-03-01',
    });
    await ciclosRepo.guardar(ciclo);

    // 3. Crear Actividad Agrícola vinculada
    actividadId = crypto.randomUUID();
    const actividad = ActividadAgricola.registrar({
      id: actividadId,
      codigoActividad: 'ACT-2026-APL-001',
      tipoActividadId: crypto.randomUUID(),
      loteId,
      cicloId: cicloAbiertoId,
      fechaHecho: '2026-10-14',
      usuarioCargaId: crypto.randomUUID(),
      superficieTrabajadaHa: 5.0,
      fechaReferenciaHoy: hoyFijo,
    });
    await actividadesRepo.guardar(actividad);

    // 4. Crear Insumos en Catálogo
    insumoFitoId = crypto.randomUUID();
    const fito = InsumoCatalogo.crear({
      id: insumoFitoId,
      nombreComercial: 'Captan 80 WG',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 5 kg',
      fichaFitosanitaria: {
        principioActivo: 'Captan',
        periodoCarenciaDias: 7,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-35412',
      },
    });
    await insumosRepo.guardar(fito);

    insumoFertId = crypto.randomUUID();
    const fert = InsumoCatalogo.crear({
      id: insumoFertId,
      nombreComercial: 'Nitrato de Calcio Soluble',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 25 kg',
    });
    await insumosRepo.guardar(fert);
  });

  it('RF-M4-03 / RF-M4-04: debe registrar una aplicación monoproducto con dosis diferenciadas y equipo de campo', async () => {
    const output = await registrarUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Control preventivo de botrytis',
        equipoAplicacion: 'Pulverizadora de arrastre 2000L con agitación hidráulica',
        condicionesClima: {
          vientoKmH: 7.2,
          tempC: 21.5,
          lluviaMm: 0,
        },
        lineas: [
          {
            insumoId: insumoFitoId,
            cantidadTotal: 6.0,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 1.2, // 1.2 kg/ha
            dosisPorPlanta: 0.02,   // 20 g/planta
            concentracion: '150 g/100L',
          },
        ],
      },
      hoyFijo,
    );

    expect(output.id).toBeDefined();
    expect(output.actividadId).toBe(actividadId);
    expect(output.loteId).toBe(loteId);
    expect(output.cicloId).toBe(cicloAbiertoId);
    expect(output.equipoAplicacion).toContain('Pulverizadora de arrastre');
    expect(output.condicionesClima?.tempC).toBe(21.5);
    expect(output.esMezcla).toBe(false);
    expect(output.lineas).toHaveLength(1);
    expect(output.lineas[0].nombreComercial).toBe('Captan 80 WG');
    expect(output.lineas[0].categoriaInsumo).toBe('FITOSANITARIO');
    expect(output.lineas[0].dosisPorSuperficie).toBe(1.2);
    expect(output.lineas[0].concentracion).toBe('150 g/100L');
  });

  it('RF-M4-06: debe admitir mezclas de múltiples insumos (caldo) registrando cada uno independientemente', async () => {
    const output = await registrarUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Aplicación conjunta de fungicida y fertilizante foliar',
        equipoAplicacion: 'Mochila a explosión con boquilla de cono hueco',
        condicionesClima: {
          vientoKmH: 5.0,
          tempC: 20.0,
          lluviaMm: 0,
        },
        lineas: [
          {
            insumoId: insumoFitoId,
            cantidadTotal: 5.0,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 1.0,
            concentracion: '125 g/100L',
          },
          {
            insumoId: insumoFertId,
            cantidadTotal: 15.0,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 3.0,
            concentracion: '375 g/100L',
          },
        ],
      },
      hoyFijo,
    );

    expect(output.esMezcla).toBe(true);
    expect(output.lineas).toHaveLength(2);
    expect(output.lineas[0].insumoId).toBe(insumoFitoId);
    expect(output.lineas[0].nombreComercial).toBe('Captan 80 WG');
    expect(output.lineas[1].insumoId).toBe(insumoFertId);
    expect(output.lineas[1].nombreComercial).toBe('Nitrato de Calcio Soluble');
  });

  it('RN-01: debe rechazar la aplicación si el ciclo no corresponde al lote', async () => {
    const otroLoteId = crypto.randomUUID();
    const otroLote = Lote.crear({
      id: otroLoteId,
      codigoLote: 'LOT-2026-OTRO',
      producto: 'Frutilla',
      cantidadInicial: 1000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(otroLote);

    await expect(
      registrarUseCase.execute({
        actividadId,
        loteId: otroLoteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Test',
        equipoAplicacion: 'Mochila',
        lineas: [{ insumoId: insumoFitoId, cantidadTotal: 2, unidadMedidaId: 'KG' }],
      }),
    ).rejects.toThrow(InconsistenciaLoteCicloError);
  });

  it('RF-M4-05 / RN-03: debe rechazar la aplicación si el ciclo se encuentra CERRADO', async () => {
    const cicloCerradoId = crypto.randomUUID();
    const cicloCerrado = CicloProductivo.crear({
      id: cicloCerradoId,
      codigoCiclo: 'CICLO-CERRADO-01',
      loteId,
      cultivo: 'Frutilla',
      estado: 'CERRADO',
      superficieCultivadaHa: 5.0,
      fechaInicio: '2026-01-01',
      fechaFin: '2026-06-01',
    });
    await ciclosRepo.guardar(cicloCerrado);

    await expect(
      registrarUseCase.execute({
        actividadId,
        loteId,
        cicloId: cicloCerradoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Test en ciclo cerrado',
        equipoAplicacion: 'Mochila',
        lineas: [{ insumoId: insumoFitoId, cantidadTotal: 2, unidadMedidaId: 'KG' }],
      }),
    ).rejects.toThrow(CicloNoAbiertoError);
  });

  it('RN-04: debe rechazar aplicaciones con fecha posterior a hoy', async () => {
    await expect(
      registrarUseCase.execute(
        {
          actividadId,
          loteId,
          cicloId: cicloAbiertoId,
          fecha: '2026-10-25',
          metodo: 'FOLIAR',
          motivo: 'Test fecha futura',
          equipoAplicacion: 'Mochila',
          lineas: [{ insumoId: insumoFitoId, cantidadTotal: 2, unidadMedidaId: 'KG' }],
        },
        hoyFijo,
      ),
    ).rejects.toThrow(FechaFuturaInvalidaError);
  });

  it('RF-M4-01 / RF-M4-06: debe arrojar EntidadNoEncontradaError si un insumo no existe en catálogo', async () => {
    const insumoInexistente = crypto.randomUUID();

    await expect(
      registrarUseCase.execute({
        actividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Insumo inexistente',
        equipoAplicacion: 'Mochila',
        lineas: [{ insumoId: insumoInexistente, cantidadTotal: 2, unidadMedidaId: 'KG' }],
      }),
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe listar y consultar aplicaciones por id con enriquecimiento de insumos', async () => {
    const creada = await registrarUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Listado test',
        equipoAplicacion: 'Tractor',
        lineas: [{ insumoId: insumoFitoId, cantidadTotal: 5, unidadMedidaId: 'KG' }],
      },
      hoyFijo,
    );

    const lista = await listarUseCase.execute({ loteId });
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(creada.id);

    const porId = await obtenerPorIdUseCase.execute(creada.id);
    expect(porId.id).toBe(creada.id);
    expect(porId.lineas[0].nombreComercial).toBe('Captan 80 WG');
  });

  it('debe registrar y recuperar aplicación con recomendación técnica adjunta (RF-M4-08)', async () => {
    const creada = await registrarUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fecha: '2026-10-14',
        metodo: 'FOLIAR',
        motivo: 'Control fúngico bajo receta agronómica',
        equipoAplicacion: 'Pulverizador Martignani 2000L',
        lineas: [{ insumoId: insumoFitoId, cantidadTotal: 4, unidadMedidaId: 'KG' }],
        recomendacionTecnica: {
          agronomoEmisor: 'Ing. Agr. Roberto Silva',
          nroMatricula: 'MP-1249-CPIA',
          documentoUrl: 'https://storage.agrul.app/recetas/receta-2026-10-14.pdf',
          observaciones: 'Respetar período de carencia de 14 días.',
        },
      },
      hoyFijo,
    );

    expect(creada.recomendacionTecnica).toBeDefined();
    expect(creada.recomendacionTecnica?.agronomoEmisor).toBe('Ing. Agr. Roberto Silva');
    expect(creada.recomendacionTecnica?.nroMatricula).toBe('MP-1249-CPIA');
    expect(creada.recomendacionTecnica?.documentoUrl).toBe('https://storage.agrul.app/recetas/receta-2026-10-14.pdf');

    const porId = await obtenerPorIdUseCase.execute(creada.id);
    expect(porId.recomendacionTecnica?.agronomoEmisor).toBe('Ing. Agr. Roberto Silva');
  });
});
