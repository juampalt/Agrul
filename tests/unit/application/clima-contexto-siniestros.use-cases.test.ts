import { describe, it, expect, beforeEach } from 'vitest';
import {
  ObtenerContextoClimaticoLaborUseCase,
  RegistrarEventoClimaticoAdversoUseCase,
  ListarEventosClimaticosAdversosUseCase,
  ObtenerEventoClimaticoAdversoPorIdUseCase,
  CalcularResumenClimaticoCicloUseCase,
  ObtenerSerieHistoricaClimaticaLoteUseCase,
  RegistrarMedicionClimaticaUseCase,
} from '../../../src/application/use-cases/clima.use-cases.js';
import { InMemoryMedicionesClimaticasRepository } from '../../mocks/in-memory-mediciones-climaticas.repository.js';
import { InMemoryEventosClimaticosAdversosRepository } from '../../mocks/in-memory-eventos-climaticos-adversos.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CodigoLote } from '../../../src/core/domain/value-objects/codigo-lote.vo.js';
import {
  EntidadNoEncontradaError,
  EventoClimaticoAdversoInvalidoError,
  EventoClimaticoNoEncontradoError,
  MedicionClimaticaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';
import { LotesRepositoryPort } from '../../../src/core/ports/lotes-repository.port.js';
import { FincasRepositoryPort } from '../../../src/core/ports/fincas-repository.port.js';

describe('AGRUL-048: Casos de Uso de Contexto Climático, Eventos Adversos y Serie Histórica', () => {
  let climaRepo: InMemoryMedicionesClimaticasRepository;
  let eventosRepo: InMemoryEventosClimaticosAdversosRepository;
  let fincasRepo: FincasRepositoryPort;
  let lotesRepo: LotesRepositoryPort;

  const mockFinca = {
    id: 'finca-lules-1',
    nombre: 'Finca San José de Lules',
    ubicacion: 'Lules, Tucumán',
    superficieTotalHa: 120,
    activo: true,
  };

  const mockLote = Lote.crear({
    id: 'lote-arandanos-1',
    codigoLote: CodigoLote.crear('LOT-2026-001'),
    producto: 'Arándano',
    variedad: 'Emerald',
    cantidadInicial: 5000,
    unidadMedida: 'KG',
    fincaId: 'finca-lules-1',
    superficieHa: 10,
  });

  beforeEach(() => {
    climaRepo = new InMemoryMedicionesClimaticasRepository();
    eventosRepo = new InMemoryEventosClimaticosAdversosRepository();

    fincasRepo = {
      buscarPorId: async (id: string) => (id === mockFinca.id ? (mockFinca as any) : null),
      guardar: async () => {},
      listarTodas: async () => [mockFinca as any],
      existeNombre: async () => false,
    };

    lotesRepo = {
      buscarPorId: async (id: string) => (id === mockLote.id ? mockLote : null),
      guardar: async () => {},
      buscarPorCodigo: async () => null,
      actualizar: async () => {},
      existeCodigo: async () => false,
      listarTodos: async () => [mockLote],
    };
  });

  describe('ObtenerContextoClimaticoLaborUseCase (RF-M10-10)', () => {
    it('debe devolver condiciones óptimas de pulverización con clima moderado y sin lluvia reciente', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      // Medicion de hoy
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-20',
        tempMinC: 12,
        tempMaxC: 22,
        precipitacionMm: 0,
        humedadRelativaPct: 65,
        vientoKmH: 8,
        fuenteDato: 'ESTACION_PROPIA',
      });

      const useCase = new ObtenerContextoClimaticoLaborUseCase(climaRepo, fincasRepo, lotesRepo);
      const contexto = await useCase.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-20',
      });

      expect(contexto.fincaId).toBe(mockFinca.id);
      expect(contexto.fecha).toBe('2026-10-20');
      expect(contexto.lluviaUltimas24hMm).toBe(0);
      expect(contexto.aptoPulverizacion).toBe(true);
      expect(contexto.estadoPulverizacion).toBe('OPTIMO');
      expect(contexto.advertencias).toHaveLength(0);
      expect(contexto.sugerenciaRiego).toContain('Sin precipitaciones significativas');
    });

    it('debe advertir DESFAVORABLE ante viento fuerte (> 20 km/h) por deriva crítica de fitosanitarios', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-21',
        tempMinC: 15,
        tempMaxC: 25,
        precipitacionMm: 0,
        vientoKmH: 26, // Viento excesivo
        humedadRelativaPct: 50,
        fuenteDato: 'ESTACION_PROPIA',
      });

      const useCase = new ObtenerContextoClimaticoLaborUseCase(climaRepo, fincasRepo, lotesRepo);
      const contexto = await useCase.execute({
        loteId: mockLote.id,
        fecha: '2026-10-21',
      });

      expect(contexto.aptoPulverizacion).toBe(false);
      expect(contexto.estadoPulverizacion).toBe('DESFAVORABLE');
      expect(contexto.advertencias.some(a => a.includes('Viento fuerte'))).toBe(true);
    });

    it('debe advertir DESFAVORABLE y sugerir suspender riego tras lluvia abundante en 24h', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      // Ayer llovió 15 mm
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-19',
        precipitacionMm: 15,
        fuenteDato: 'ESTACION_PROPIA',
      });
      // Hoy llueven 10 mm
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-20',
        precipitacionMm: 10,
        fuenteDato: 'ESTACION_PROPIA',
      });

      const useCase = new ObtenerContextoClimaticoLaborUseCase(climaRepo, fincasRepo, lotesRepo);
      const contexto = await useCase.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-20',
      });

      expect(contexto.lluviaUltimas24hMm).toBe(25);
      expect(contexto.aptoPulverizacion).toBe(false);
      expect(contexto.estadoPulverizacion).toBe('DESFAVORABLE');
      expect(contexto.sugerenciaRiego).toContain('suspender el riego programado');
      expect(contexto.advertencias.some(a => a.includes('suelo sin piso'))).toBe(true);
    });

    it('debe advertir riesgo de helada y estrés vegetal en el cultivo', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-18',
        tempMinC: -2,
        tempMaxC: 14,
        precipitacionMm: 0,
        fuenteDato: 'ESTACION_PROPIA',
      });

      const useCase = new ObtenerContextoClimaticoLaborUseCase(climaRepo, fincasRepo, lotesRepo);
      const contexto = await useCase.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-18',
      });

      expect(contexto.advertencias.some(a => a.includes('helada'))).toBe(true);
      expect(contexto.aptoPulverizacion).toBe(false);
    });
  });

  describe('RegistrarEventoClimaticoAdversoUseCase (RF-M10-11)', () => {
    it('debe registrar un evento adverso de granizo exitosamente', async () => {
      const useCase = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);

      const evento = await useCase.execute({
        fincaId: mockFinca.id,
        loteId: mockLote.id,
        fecha: '2026-10-15',
        tipoSiniestro: 'GRANIZO',
        danoEstimadoPct: 25,
        superficieAfectadaHa: 8,
        fotosUrls: ['https://s3.agrul.com/lules/granizo.jpg'],
        descripcion: 'Caída de granizo mediano afectando follaje superior.',
        usuarioId: 'usr-1',
      });

      expect(evento.id).toBeDefined();
      expect(evento.tipoSiniestro).toBe('GRANIZO');
      expect(evento.danoEstimadoPct).toBe(25);
      expect(evento.fotosUrls).toHaveLength(1);

      const guardado = await eventosRepo.obtenerPorId(evento.id);
      expect(guardado).not.toBeNull();
      expect(guardado?.descripcion).toContain('Caída de granizo');
    });

    it('debe rechazar si la finca no existe', async () => {
      const useCase = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);

      await expect(
        useCase.execute({
          fincaId: 'finca-inexistente',
          loteId: mockLote.id,
          fecha: '2026-10-15',
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: 10,
          descripcion: 'Helada',
        })
      ).rejects.toThrow(EntidadNoEncontradaError);
    });

    it('debe rechazar si el lote no pertenece a la finca indicada', async () => {
      const loteOtro = Lote.crear({
        id: 'lote-otra-finca',
        codigoLote: CodigoLote.crear('LOT-2026-999'),
        producto: 'Limón',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
        fincaId: 'otra-finca-distinta',
      });
      (lotesRepo as any).buscarPorId = async (id: string) => (id === loteOtro.id ? loteOtro : null);

      const useCase = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);

      await expect(
        useCase.execute({
          fincaId: mockFinca.id,
          loteId: loteOtro.id,
          fecha: '2026-10-15',
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: 10,
          descripcion: 'Helada',
        })
      ).rejects.toThrow(EventoClimaticoAdversoInvalidoError);
    });
  });

  describe('ListarEventosClimaticosAdversosUseCase y ObtenerPorId', () => {
    it('debe listar eventos filtrando por finca y tipo de siniestro', async () => {
      const registrarUC = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);
      await registrarUC.execute({
        fincaId: mockFinca.id,
        loteId: mockLote.id,
        fecha: '2026-10-10',
        tipoSiniestro: 'HELADA',
        danoEstimadoPct: 15,
        descripcion: 'Helada leve',
      });
      await registrarUC.execute({
        fincaId: mockFinca.id,
        loteId: mockLote.id,
        fecha: '2026-10-12',
        tipoSiniestro: 'GRANIZO',
        danoEstimadoPct: 40,
        descripcion: 'Granizo fuerte',
      });

      const listarUC = new ListarEventosClimaticosAdversosUseCase(eventosRepo);
      const todos = await listarUC.execute({ fincaId: mockFinca.id });
      expect(todos).toHaveLength(2);

      const soloGranizo = await listarUC.execute({ fincaId: mockFinca.id, tipoSiniestro: 'GRANIZO' });
      expect(soloGranizo).toHaveLength(1);
      expect(soloGranizo[0].tipoSiniestro).toBe('GRANIZO');
    });

    it('debe arrojar EventoClimaticoNoEncontradoError al buscar un ID que no existe', async () => {
      const useCase = new ObtenerEventoClimaticoAdversoPorIdUseCase(eventosRepo);
      await expect(useCase.execute('id-inexistente')).rejects.toThrow(EventoClimaticoNoEncontradoError);
    });
  });

  describe('CalcularResumenClimaticoCicloUseCase (RF-M10-12)', () => {
    it('debe calcular acumulado de lluvia, extremos térmicos y siniestros del ciclo', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-01',
        tempMinC: 8,
        tempMaxC: 22,
        precipitacionMm: 12.5,
        fuenteDato: 'ESTACION_PROPIA',
      });
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-05',
        tempMinC: -1, // Helada
        tempMaxC: 18,
        precipitacionMm: 0,
        fuenteDato: 'ESTACION_PROPIA',
      });
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-10',
        tempMinC: 16,
        tempMaxC: 36, // Calor extremo
        precipitacionMm: 8.5,
        fuenteDato: 'ESTACION_PROPIA',
      });

      const registrarEventoUC = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);
      await registrarEventoUC.execute({
        fincaId: mockFinca.id,
        loteId: mockLote.id,
        fecha: '2026-10-05',
        tipoSiniestro: 'HELADA',
        danoEstimadoPct: 30,
        descripcion: 'Helada registrada el 5 de octubre',
      });

      const useCase = new CalcularResumenClimaticoCicloUseCase(lotesRepo, climaRepo, eventosRepo);
      const resumen = await useCase.execute({
        loteId: mockLote.id,
        fechaDesde: '2026-10-01',
        fechaHasta: '2026-10-15',
      });

      expect(resumen.lluviaAcumuladaMm).toBe(21);
      expect(resumen.diasConLluvia).toBe(2);
      expect(resumen.diasHelada).toBe(1);
      expect(resumen.diasCalorExtremo).toBe(1);
      expect(resumen.tempMinimaAbsoluta).toBe(-1);
      expect(resumen.tempMaximaAbsoluta).toBe(36);
      expect(resumen.totalSiniestros).toBe(1);
      expect(resumen.danoAcumuladoPromedioPct).toBe(30);
    });
  });

  describe('ObtenerSerieHistoricaClimaticaLoteUseCase (RF-M10-07 / RF-M10-13)', () => {
    it('debe generar serie continua día por día combinando curva climática con hitos de labores', async () => {
      const registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-01',
        tempMinC: 10,
        tempMaxC: 24,
        precipitacionMm: 10,
        fuenteDato: 'ESTACION_PROPIA',
      });
      await registrarMedicionUC.execute({
        fincaId: mockFinca.id,
        fecha: '2026-10-02',
        tempMinC: 12,
        tempMaxC: 25,
        precipitacionMm: 5,
        fuenteDato: 'ESTACION_PROPIA',
      });

      // Registrar un siniestro en el lote
      const registrarEventoUC = new RegistrarEventoClimaticoAdversoUseCase(eventosRepo, fincasRepo, lotesRepo);
      await registrarEventoUC.execute({
        fincaId: mockFinca.id,
        loteId: mockLote.id,
        fecha: '2026-10-01',
        tipoSiniestro: 'GRANIZO',
        danoEstimadoPct: 15,
        descripcion: 'Granizo leve',
      });

      const mockActividadesRepo: any = {
        listar: async () => [
          {
            id: 'act-1',
            codigoActividad: 'ACT-001',
            fechaHecho: '2026-10-02',
            estado: 'REALIZADA',
            observaciones: 'Riego por goteo 4 horas',
            superficieTrabajadaHa: 10,
          },
        ],
      };

      const useCase = new ObtenerSerieHistoricaClimaticaLoteUseCase(
        lotesRepo,
        climaRepo,
        eventosRepo,
        mockActividadesRepo
      );

      const serie = await useCase.execute({
        loteId: mockLote.id,
        fechaDesde: '2026-10-01',
        fechaHasta: '2026-10-02',
      });

      expect(serie.loteId).toBe(mockLote.id);
      expect(serie.serieDiaria).toHaveLength(2);

      // Día 1
      const dia1 = serie.serieDiaria[0];
      expect(dia1.fecha).toBe('2026-10-01');
      expect(dia1.precipitacionMm).toBe(10);
      expect(dia1.lluviaAcumuladaMm).toBe(10);
      expect(dia1.hitos).toHaveLength(1);
      expect(dia1.hitos[0].tipo).toBe('SINIESTRO');

      // Día 2
      const dia2 = serie.serieDiaria[1];
      expect(dia2.fecha).toBe('2026-10-02');
      expect(dia2.precipitacionMm).toBe(5);
      expect(dia2.lluviaAcumuladaMm).toBe(15);
      expect(dia2.hitos).toHaveLength(1);
      expect(dia2.hitos[0].tipo).toBe('ACTIVIDAD');

      expect(serie.resumen.lluviaAcumuladaMm).toBe(15);
      expect(serie.resumen.totalHitos).toBe(2);
    });

    it('debe rechazar fechas inválidas con fechaDesde posterior a fechaHasta', async () => {
      const useCase = new ObtenerSerieHistoricaClimaticaLoteUseCase(lotesRepo, climaRepo, eventosRepo);

      await expect(
        useCase.execute({
          loteId: mockLote.id,
          fechaDesde: '2026-10-25',
          fechaHasta: '2026-10-10',
        })
      ).rejects.toThrow(MedicionClimaticaInvalidaError);
    });
  });
});
