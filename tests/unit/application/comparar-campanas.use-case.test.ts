import { describe, it, expect, beforeEach } from 'vitest';
import { CompararCampanasUseCase } from '../../../src/application/use-cases/comparar-campanas.use-case.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { CodigoTrazabilidadCosecha } from '../../../src/core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: CompararCampanasUseCase (AGRUL-036 / RF-M7-03, RF-M7-04, RF-M7-05, RF-M7-06, RF-M7-10, RF-M7-11)', () => {
  let ciclosRepo: InMemoryCiclosRepository;
  let lotesRepo: InMemoryLotesRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let fincasRepo: InMemoryFincasRepository;
  let useCase: CompararCampanasUseCase;

  let finca1: Finca;
  let loteA: Lote;
  let loteB: Lote;
  let insumoFertilizante: InsumoCatalogo;
  let insumoFitosanitario: InsumoCatalogo;

  beforeEach(async () => {
    ciclosRepo = new InMemoryCiclosRepository();
    lotesRepo = new InMemoryLotesRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    fincasRepo = new InMemoryFincasRepository();

    useCase = new CompararCampanasUseCase({
      ciclosRepo,
      lotesRepo,
      cosechasRepo,
      aplicacionesRepo,
      insumosRepo,
      fincasRepo,
    });

    // Finca
    finca1 = Finca.crear({
      id: 'finca-1',
      nombre: 'Finca Los Andes',
      localidad: 'Tupungato',
      departamento: 'Tupungato',
      provincia: 'Mendoza',
      superficieTotalHa: 10,
    });
    await fincasRepo.guardar(finca1);

    // Lotes
    loteA = Lote.crear({
      id: 'lote-a',
      codigoLote: 'LOT-2025-00001',
      fincaId: finca1.id,
      superficieHa: 2.0,
      producto: 'Uva',
      variedad: 'Malbec',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteA);

    loteB = Lote.crear({
      id: 'lote-b',
      codigoLote: 'LOT-2025-00002',
      fincaId: finca1.id,
      superficieHa: 2.0,
      producto: 'Uva',
      variedad: 'Malbec',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteB);

    // Insumos
    insumoFertilizante = InsumoCatalogo.crear({
      id: 'ins-urea',
      nombreComercial: 'Urea Granulada 46%',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 50kg',
    });
    await insumosRepo.guardar(insumoFertilizante);

    insumoFitosanitario = InsumoCatalogo.crear({
      id: 'ins-cobre',
      nombreComercial: 'Oxicloruro de Cobre',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'LITRO',
      presentacion: 'Bidón 5L',
      fichaFitosanitaria: {
        principioActivo: 'Oxicloruro de cobre',
        periodoCarenciaDias: 7,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-12345',
      },
    });
    await insumosRepo.guardar(insumoFitosanitario);
  });

  describe('RF-M7-03 & RF-M7-06: Comparador Intercampaña Lote y Cálculo de Deltas', () => {
    it('debe comparar múltiples campañas del mismo lote calculando rendimientos, descarte y deltas vs campaña anterior', async () => {
      // Campaña 1 (2024): 4,000 kg total, 3,600 comercializable, 400 descarte (10%). Ciclo cerrado.
      const ciclo2024 = CicloProductivo.crear({
        id: 'ciclo-2024',
        codigoCiclo: 'CICLO-2024-MALBEC',
        loteId: loteA.id,
        cultivo: 'Vid',
        variedad: 'Malbec',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2024-09-01',
        temporada: '2024/2025',
      });
      ciclo2024.cerrar('2025-03-30');
      await ciclosRepo.guardar(ciclo2024);

      const cos2024 = Cosecha.crear({
        id: 'cos-2024',
        codigoTrazabilidad: CodigoTrazabilidadCosecha.generar(loteA.codigoLote.value, '2025-03-10', 1),
        loteId: loteA.id,
        cicloId: ciclo2024.id,
        fecha: '2025-03-10',
        cantidadCosechadaKg: 4000,
        cantidadComercializableKg: 3600,
        cantidadDescarteKg: 400,
        motivoDescarte: 'DESCARTE_TAMANO',
        superficieCosechadaHa: 2.0,
      });
      await cosechasRepo.guardar(cos2024);

      // Campaña 2 (2025): 5,000 kg total, 4,600 comercializable, 400 descarte (8%). Ciclo cerrado.
      const ciclo2025 = CicloProductivo.crear({
        id: 'ciclo-2025',
        codigoCiclo: 'CICLO-2025-MALBEC',
        loteId: loteA.id,
        cultivo: 'Vid',
        variedad: 'Malbec',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2025-09-01',
        temporada: '2025/2026',
      });
      ciclo2025.cerrar('2026-03-30');
      await ciclosRepo.guardar(ciclo2025);

      const cos2025 = Cosecha.crear({
        id: 'cos-2025',
        codigoTrazabilidad: CodigoTrazabilidadCosecha.generar(loteA.codigoLote.value, '2026-03-15', 1),
        loteId: loteA.id,
        cicloId: ciclo2025.id,
        fecha: '2026-03-15',
        cantidadCosechadaKg: 5000,
        cantidadComercializableKg: 4600,
        cantidadDescarteKg: 400,
        motivoDescarte: 'DESCARTE_TAMANO',
        superficieCosechadaHa: 2.0,
      });
      await cosechasRepo.guardar(cos2025);

      const res = await useCase.comparar({ loteId: loteA.id, modo: 'INTERCAMPANA_LOTE' });

      expect(res.modo).toBe('INTERCAMPANA_LOTE');
      expect(res.items).toHaveLength(2);

      // Verificación orden cronológico
      expect(res.items[0].cicloId).toBe('ciclo-2024');
      expect(res.items[1].cicloId).toBe('ciclo-2025');

      // Campaña 1 (Base): Rendimiento bruto 4000 / 2 = 2000 kg/ha. Descarte 10%. Deltas null.
      const item1 = res.items[0];
      expect(item1.rendimientoBrutoKgHa).toBe(2000);
      expect(item1.rendimientoComercialKgHa).toBe(1800);
      expect(item1.porcentajeDescarte).toBe(10);
      expect(item1.deltas.deltaRendimientoBrutoPorcentaje).toBeNull();
      expect(item1.deltas.deltaDescartePuntosPorcentuales).toBeNull();

      // Campaña 2: Rendimiento bruto 5000 / 2 = 2500 kg/ha. Descarte 8%.
      // Delta rendimiento bruto: (2500 - 2000) / 2000 = +25%
      // Delta rendimiento comercial: (2300 - 1800) / 1800 = +27.78%
      // Delta descarte: 8 - 10 = -2 puntos porcentuales
      const item2 = res.items[1];
      expect(item2.rendimientoBrutoKgHa).toBe(2500);
      expect(item2.rendimientoComercialKgHa).toBe(2300);
      expect(item2.porcentajeDescarte).toBe(8);
      expect(item2.deltas.deltaRendimientoBrutoPorcentaje).toBe(25);
      expect(item2.deltas.deltaRendimientoComercialPorcentaje).toBe(27.78);
      expect(item2.deltas.deltaDescartePuntosPorcentuales).toBe(-2);

      // Tendencia y resumen
      expect(res.resumen.tendenciaRendimiento).toBe('ASCENDENTE');
      expect(res.resumen.totalCiclosComparados).toBe(2);
      expect(res.resumen.mejorRendimientoCicloId).toBe('ciclo-2025');
    });
  });

  describe('RF-M7-04 & RF-M7-06: Comparador Interlote Campaña (Ranking y variación vs media)', () => {
    it('debe comparar múltiples lotes en la misma temporada ordenados por rendimiento con variación vs media', async () => {
      // Ciclo Lote A: 6,000 kg en 2 ha = 3,000 kg/ha, descarte 10%
      const cicloA = CicloProductivo.crear({
        id: 'ciclo-temp-a',
        codigoCiclo: 'CICLO-TEMP-A',
        loteId: loteA.id,
        cultivo: 'Vid',
        variedad: 'Malbec',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2025-09-01',
        temporada: '2025/2026',
      });
      cicloA.cerrar('2026-03-30');
      await ciclosRepo.guardar(cicloA);

      const cosA = Cosecha.crear({
        id: 'cos-temp-a',
        codigoTrazabilidad: CodigoTrazabilidadCosecha.generar(loteA.codigoLote.value, '2026-03-10', 1),
        loteId: loteA.id,
        cicloId: cicloA.id,
        fecha: '2026-03-10',
        cantidadCosechadaKg: 6000,
        cantidadComercializableKg: 5400,
        cantidadDescarteKg: 600,
        motivoDescarte: 'DESCARTE_DEFECTO',
      });
      await cosechasRepo.guardar(cosA);

      // Ciclo Lote B: 2,000 kg en 2 ha = 1,000 kg/ha, descarte 20%
      const cicloB = CicloProductivo.crear({
        id: 'ciclo-temp-b',
        codigoCiclo: 'CICLO-TEMP-B',
        loteId: loteB.id,
        cultivo: 'Vid',
        variedad: 'Malbec',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2025-09-10',
        temporada: '2025/2026',
      });
      cicloB.cerrar('2026-03-30');
      await ciclosRepo.guardar(cicloB);

      const cosB = Cosecha.crear({
        id: 'cos-temp-b',
        codigoTrazabilidad: CodigoTrazabilidadCosecha.generar(loteB.codigoLote.value, '2026-03-12', 1),
        loteId: loteB.id,
        cicloId: cicloB.id,
        fecha: '2026-03-12',
        cantidadCosechadaKg: 2000,
        cantidadComercializableKg: 1600,
        cantidadDescarteKg: 400,
        motivoDescarte: 'DESCARTE_DEFECTO',
      });
      await cosechasRepo.guardar(cosB);

      const res = await useCase.comparar({ temporada: '2025/2026', modo: 'INTERLOTE_CAMPANA' });

      expect(res.modo).toBe('INTERLOTE_CAMPANA');
      expect(res.items).toHaveLength(2);

      // Ranking: Lote A primero (3000 kg/ha), Lote B segundo (1000 kg/ha)
      expect(res.items[0].cicloId).toBe('ciclo-temp-a');
      expect(res.items[1].cicloId).toBe('ciclo-temp-b');

      // Promedio general: (6000 + 2000) / 4 ha = 2000 kg/ha. Descarte promedio: 1000 / 8000 = 12.5%
      expect(res.resumen.promedioRendimientoBrutoKgHa).toBe(2000);
      expect(res.resumen.promedioPorcentajeDescarte).toBe(12.5);

      // Variación vs media para Lote A: (3000 - 2000) / 2000 = +50%
      expect(res.items[0].deltas.variacionVsMediaCampanaRendimientoPorcentaje).toBe(50);
      // Variación vs media descarte Lote A: 10 - 12.5 = -2.5 puntos porcentuales
      expect(res.items[0].deltas.variacionVsMediaCampanaDescartePuntos).toBe(-2.5);

      // Variación vs media para Lote B: (1000 - 2000) / 2000 = -50%
      expect(res.items[1].deltas.variacionVsMediaCampanaRendimientoPorcentaje).toBe(-50);
      // Variación vs media descarte Lote B: 20 - 12.5 = +7.5 puntos porcentuales
      expect(res.items[1].deltas.variacionVsMediaCampanaDescartePuntos).toBe(7.5);
    });
  });

  describe('RF-M7-05: Relación Insumo-Producto y Eficiencia Agronómica', () => {
    it('debe calcular la eficiencia agronómica global, por fertilizantes y fitosanitarios, e intensidad de uso', async () => {
      const ciclo = CicloProductivo.crear({
        id: 'ciclo-eficiencia',
        codigoCiclo: 'CICLO-EFICIENCIA-01',
        loteId: loteA.id,
        cultivo: 'Vid',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2025-09-01',
        temporada: '2025/2026',
      });
      await ciclosRepo.guardar(ciclo);

      // Cosecha: 10,000 kg (10 toneladas)
      const cos = Cosecha.crear({
        id: 'cos-eficiencia',
        codigoTrazabilidad: CodigoTrazabilidadCosecha.generar(loteA.codigoLote.value, '2026-03-20', 1),
        loteId: loteA.id,
        cicloId: ciclo.id,
        fecha: '2026-03-20',
        cantidadCosechadaKg: 10000,
        cantidadComercializableKg: 9500,
        cantidadDescarteKg: 500,
        motivoDescarte: 'DESCARTE_TAMANO',
      });
      await cosechasRepo.guardar(cos);

      // Aplicación 1: Fertilizante 200 kg
      const app1 = AplicacionAgricola.crear({
        id: 'app-1',
        actividadId: 'act-1',
        loteId: loteA.id,
        cicloId: ciclo.id,
        fecha: '2025-10-10',
        metodo: 'FERTIRRIEGO',
        motivo: 'Fertilización nitrogenada inicial',
        equipoAplicacion: 'Equipo de Fertirriego',
        lineas: [{
          insumoId: insumoFertilizante.id,
          cantidadTotal: 200,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 100,
        }],
      });
      await aplicacionesRepo.guardar(app1);

      // Aplicación 2: Fitosanitario 50 L
      const app2 = AplicacionAgricola.crear({
        id: 'app-2',
        actividadId: 'act-2',
        loteId: loteA.id,
        cicloId: ciclo.id,
        fecha: '2025-11-15',
        metodo: 'FOLIAR',
        motivo: 'Control preventivo de mildiu',
        equipoAplicacion: 'Pulverizadora',
        lineas: [{
          insumoId: insumoFitosanitario.id,
          cantidadTotal: 50,
          unidadMedidaId: 'LITRO',
          dosisPorSuperficie: 25,
        }],
      });
      await aplicacionesRepo.guardar(app2);

      const detalleEficiencia = await useCase.obtenerEficienciaInsumos(ciclo.id);

      expect(detalleEficiencia.cicloId).toBe(ciclo.id);
      expect(detalleEficiencia.kilosCosechados).toBe(10000);

      const ef = detalleEficiencia.eficiencia;
      // Insumos totales: 200 + 50 = 250 unidades
      expect(ef.totalVolumenInsumos).toBe(250);
      expect(ef.totalFertilizantesKg).toBe(200);
      expect(ef.totalFitosanitariosLitros).toBe(50);

      // Eficiencia global: 10,000 kg / 250 unidades = 40 kg cosecha / unidad insumo
      expect(ef.eficienciaGlobalKgPorUnidad).toBe(40);
      // Eficiencia fertilizante: 10,000 kg / 200 kg = 50 kg cosecha / kg fertilizante
      expect(ef.eficienciaFertilizanteKgPorKg).toBe(50);
      // Eficiencia fitosanitario: 10,000 kg / 50 L = 200 kg cosecha / L fitosanitario
      expect(ef.eficienciaFitosanitarioKgPorLitro).toBe(200);

      // Intensidad de uso: 250 / 2 ha = 125 unidades/ha
      expect(ef.intensidadAplicacionUnidadesPorHa).toBe(125);
      // Intensidad por tonelada cosechada: 250 / 10 ton = 25 unidades/tonelada
      expect(ef.intensidadAplicacionUnidadesPorTonelada).toBe(25);

      // Desglose por insumo
      expect(ef.desglosePorInsumo).toHaveLength(2);
      const desgloseUrea = ef.desglosePorInsumo.find(d => d.insumoId === insumoFertilizante.id);
      expect(desgloseUrea).toBeDefined();
      expect(desgloseUrea?.cantidadTotalAplicada).toBe(200);
      expect(desgloseUrea?.dosisPorHectarea).toBe(100);
      expect(desgloseUrea?.dosisPorToneladaCosechada).toBe(20);
      expect(desgloseUrea?.eficienciaKgPorUnidad).toBe(50);
    });
  });

  describe('RF-M7-11: Distinción de Ciclos Provisionales (En curso) vs Definitivos (Cerrados)', () => {
    it('debe marcar esProvisional=true y advertenciaEstadoParcial para ciclos abiertos o planificados', async () => {
      const cicloAbierto = CicloProductivo.crear({
        id: 'ciclo-abierto',
        codigoCiclo: 'CICLO-ABIERTO-01',
        loteId: loteA.id,
        cultivo: 'Vid',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2026-01-01',
        temporada: '2026/2027',
      });
      await ciclosRepo.guardar(cicloAbierto);

      const res = await useCase.comparar({ cicloIds: [cicloAbierto.id] });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.esProvisional).toBe(true);
      expect(item.advertenciaEstadoParcial).toContain('Métricas provisionales');
    });

    it('debe marcar esProvisional=false y advertenciaEstadoParcial=null para ciclos cerrados', async () => {
      const cicloCerrado = CicloProductivo.crear({
        id: 'ciclo-cerrado',
        codigoCiclo: 'CICLO-CERRADO-01',
        loteId: loteA.id,
        cultivo: 'Vid',
        superficieCultivadaHa: 2.0,
        fechaInicio: '2025-01-01',
        temporada: '2025/2026',
      });
      cicloCerrado.cerrar('2025-06-01');
      await ciclosRepo.guardar(cicloCerrado);

      const res = await useCase.comparar({ cicloIds: [cicloCerrado.id] });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.esProvisional).toBe(false);
      expect(item.advertenciaEstadoParcial).toBeNull();
    });
  });

  describe('Casos Borde y Manejo Robusto', () => {
    it('debe manejar ciclos sin cosechas y sin insumos sin generar NaN ni divisiones por cero', async () => {
      const cicloVacio = CicloProductivo.crear({
        id: 'ciclo-vacio',
        codigoCiclo: 'CICLO-VACIO-01',
        loteId: loteA.id,
        cultivo: 'Vid',
        superficieCultivadaHa: 1.0,
        fechaInicio: '2025-01-01',
      });
      await ciclosRepo.guardar(cicloVacio);

      const res = await useCase.comparar({ cicloIds: [cicloVacio.id] });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.kilosBrutos).toBe(0);
      expect(item.rendimientoBrutoKgHa).toBe(0);
      expect(item.porcentajeDescarte).toBe(0);
      expect(item.eficienciaInsumos.totalVolumenInsumos).toBe(0);
      expect(item.eficienciaInsumos.eficienciaGlobalKgPorUnidad).toBe(0);
    });

    it('debe lanzar EntidadNoEncontradaError al consultar eficiencia de insumos de un ciclo inexistente', async () => {
      await expect(useCase.obtenerEficienciaInsumos('inexistente')).rejects.toThrow(EntidadNoEncontradaError);
    });
  });
});
