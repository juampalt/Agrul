import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMedicionesClimaticasRepository } from '../../mocks/in-memory-mediciones-climaticas.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import {
  RegistrarMedicionClimaticaUseCase,
  CorregirMedicionClimaticaUseCase,
  ImportarMedicionesCsvUseCase,
  ConsultarMedicionesClimaticasUseCase,
  ObtenerMedicionClimaticaPorIdUseCase,
  ObtenerHistorialCorreccionesClimaUseCase,
} from '../../../src/application/use-cases/clima.use-cases.js';
import {
  MedicionClimaticaInvalidaError,
  MedicionClimaticaNoEncontradaError,
  ImportacionCsvClimaInvalidaError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Application Use Cases: Mediciones Meteorológicas y Clima (AGRUL-046 / Módulo 10)', () => {
  let climaRepo: InMemoryMedicionesClimaticasRepository;
  let fincasRepo: InMemoryFincasRepository;

  let registrarMedicionUC: RegistrarMedicionClimaticaUseCase;
  let corregirMedicionUC: CorregirMedicionClimaticaUseCase;
  let importarCsvUC: ImportarMedicionesCsvUseCase;
  let consultarMedicionesUC: ConsultarMedicionesClimaticasUseCase;
  let obtenerPorIdUC: ObtenerMedicionClimaticaPorIdUseCase;
  let obtenerHistorialUC: ObtenerHistorialCorreccionesClimaUseCase;

  const FINCA_ID = 'f0000000-0000-4000-8000-000000000001';
  const FECHA_REFERENCIA = new Date('2026-10-23T12:00:00Z');

  beforeEach(async () => {
    climaRepo = new InMemoryMedicionesClimaticasRepository();
    fincasRepo = new InMemoryFincasRepository();

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca Lules Citrícola',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
        renspa: '23.001.0.00123/00',
      })
    );

    registrarMedicionUC = new RegistrarMedicionClimaticaUseCase(climaRepo, fincasRepo);
    corregirMedicionUC = new CorregirMedicionClimaticaUseCase(climaRepo);
    importarCsvUC = new ImportarMedicionesCsvUseCase(climaRepo, fincasRepo);
    consultarMedicionesUC = new ConsultarMedicionesClimaticasUseCase(climaRepo);
    obtenerPorIdUC = new ObtenerMedicionClimaticaPorIdUseCase(climaRepo);
    obtenerHistorialUC = new ObtenerHistorialCorreccionesClimaUseCase(climaRepo);
  });

  describe('RegistrarMedicionClimaticaUseCase (RF-M10-01, RF-M10-02, RF-M10-05)', () => {
    it('debe registrar una medición meteorológica manual diaria correctamente', async () => {
      const output = await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-20',
        tempMinC: 14.0,
        tempMaxC: 28.5,
        precipitacionMm: 25.0,
        humedadRelativaPct: 82.0,
        vientoKmH: 18.5,
        huboGranizo: false,
        fuenteDato: 'MEDICION_PROPIA',
        observaciones: 'Tormenta vespertina',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      expect(output.id).toBeDefined();
      expect(output.fincaId).toBe(FINCA_ID);
      expect(output.fecha).toBe('2026-10-20');
      expect(output.precipitacionMm).toBe(25.0);
      expect(output.tempMediaC).toBe(21.25);
      expect(output.huboHelada).toBe(false);
      expect(output.esCorreccion).toBe(false);

      const persistida = await climaRepo.obtenerPorId(output.id);
      expect(persistida).not.toBeNull();
    });

    it('debe rechazar registro duplicado para la misma finca y fecha según inmutabilidad histórica (RF-M10-06)', async () => {
      await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-21',
        precipitacionMm: 10.0,
        fuenteDato: 'ESTACION_PROPIA',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      await expect(
        registrarMedicionUC.execute({
          fincaId: FINCA_ID,
          fecha: '2026-10-21',
          precipitacionMm: 12.0,
          fuenteDato: 'ESTACION_PROPIA',
          fechaReferenciaHoy: FECHA_REFERENCIA,
        })
      ).rejects.toThrow(MedicionClimaticaInvalidaError);
    });
  });

  describe('CorregirMedicionClimaticaUseCase (RF-M10-06 / RN-06)', () => {
    it('debe crear un nuevo registro de corrección con motivo explícito sin alterar el original', async () => {
      const original = await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-18',
        precipitacionMm: 0,
        tempMinC: 15.0,
        tempMaxC: 26.0,
        fuenteDato: 'MEDICION_PROPIA',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      const correccion = await corregirMedicionUC.execute({
        id: original.id,
        motivoCorreccion: 'Corrección de lluvia: pluviómetro manual registró 8.5mm omitidos inicialmente',
        precipitacionMm: 8.5,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      expect(correccion.id).not.toBe(original.id);
      expect(correccion.esCorreccion).toBe(true);
      expect(correccion.medicionOriginalId).toBe(original.id);
      expect(correccion.precipitacionMm).toBe(8.5);
      expect(correccion.tempMinC).toBe(15.0); // Conserva los valores anteriores

      // Verificar que la medición original permanece inmutable
      const originalEnRepo = await climaRepo.obtenerPorId(original.id);
      expect(originalEnRepo?.precipitacionMm).toBe(0);

      // La versión vigente para esa fecha debe ser la corrección
      const vigente = await climaRepo.obtenerVigentePorFechaYFinca(FINCA_ID, '2026-10-18');
      expect(vigente?.id).toBe(correccion.id);
      expect(vigente?.precipitacionMm).toBe(8.5);
    });

    it('debe arrojar error si la medición original no existe', async () => {
      await expect(
        corregirMedicionUC.execute({
          id: '00000000-0000-0000-0000-000000000000',
          motivoCorreccion: 'Rectificación de prueba',
          precipitacionMm: 10,
        })
      ).rejects.toThrow(MedicionClimaticaNoEncontradaError);
    });
  });

  describe('ImportarMedicionesCsvUseCase (RF-M10-04, RF-M10-05, RF-M10-06)', () => {
    it('debe importar un lote CSV delimitado por comas con encabezados estándar', async () => {
      const csv = `fecha,temp_min,temp_max,precipitacion,humedad,viento,helada,granizo,fuente,observaciones
2026-10-01,11.2,24.0,0.0,60,12.5,false,false,ESTACION_PROPIA,Despejado
2026-10-02,12.0,22.5,18.0,85,22.0,false,false,ESTACION_PROPIA,Lluvia constante
2026-10-03,-1.5,16.0,0.0,45,8.0,true,false,ESTACION_PROPIA,Helada matinal suave`;

      const resultado = await importarCsvUC.execute({
        fincaId: FINCA_ID,
        contenidoCsv: csv,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      expect(resultado.totalFilas).toBe(3);
      expect(resultado.filasImportadas).toBe(3);
      expect(resultado.filasFallidas).toBe(0);
      expect(resultado.mediciones).toHaveLength(3);

      const med3 = resultado.mediciones.find(m => m.fecha === '2026-10-03');
      expect(med3?.tempMinC).toBe(-1.5);
      expect(med3?.huboHelada).toBe(true);
    });

    it('debe soportar delimitador punto y coma (;) y formato de coma decimal europeo/latino', async () => {
      const csv = `fecha;tempMin;tempMax;precipitacion_mm;humedad_relativa;velocidad_viento
2026-10-05;13,5;26,0;0,0;55;10,5
2026-10-06;14,0;25,2;35,5;90;28,0`;

      const resultado = await importarCsvUC.execute({
        fincaId: FINCA_ID,
        contenidoCsv: csv,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      expect(resultado.totalFilas).toBe(2);
      expect(resultado.filasImportadas).toBe(2);
      expect(resultado.mediciones[0].tempMinC).toBe(13.5);
      expect(resultado.mediciones[1].precipitacionMm).toBe(35.5);
    });

    it('debe registrar errores por fila ante datos físicamente inválidos sin abortar las filas válidas (RF-M10-05)', async () => {
      const csv = `fecha,temp_min,temp_max,precipitacion,humedad
2026-10-10,12.0,24.0,5.0,70
2026-10-11,25.0,15.0,0.0,60
2026-10-12,10.0,20.0,-4.5,80
2026-10-13,11.0,22.0,0.0,150`;

      const resultado = await importarCsvUC.execute({
        fincaId: FINCA_ID,
        contenidoCsv: csv,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      expect(resultado.totalFilas).toBe(4);
      expect(resultado.filasImportadas).toBe(1); // Solo 2026-10-10 es válida
      expect(resultado.filasFallidas).toBe(3);
      expect(resultado.errores).toHaveLength(3);

      // Fila 2 (tempMin > tempMax)
      expect(resultado.errores[0].fila).toBe(3);
      expect(resultado.errores[0].error).toContain('Inconsistencia térmica');

      // Fila 3 (lluvia negativa)
      expect(resultado.errores[1].fila).toBe(4);
      expect(resultado.errores[1].error).toContain('precipitación');

      // Fila 4 (humedad > 100%)
      expect(resultado.errores[2].fila).toBe(5);
      expect(resultado.errores[2].error).toContain('humedad');
    });

    it('debe arrojar ImportacionCsvClimaInvalidaError si el archivo está vacío o sin encabezados', async () => {
      await expect(
        importarCsvUC.execute({
          fincaId: FINCA_ID,
          contenidoCsv: '   ',
          fechaReferenciaHoy: FECHA_REFERENCIA,
        })
      ).rejects.toThrow(ImportacionCsvClimaInvalidaError);
    });
  });

  describe('Consultas e Historial de Correcciones (RF-M10-06 / RN-06)', () => {
    it('debe listar mediciones filtrando por rango de fechas y retornando solo vigentes', async () => {
      // Registrar medición original del 15
      const orig15 = await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-15',
        precipitacionMm: 0,
        fuenteDato: 'ESTACION_PROPIA',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      // Corregir la del 15
      await corregirMedicionUC.execute({
        id: orig15.id,
        motivoCorreccion: 'Calibración sensor',
        precipitacionMm: 5.0,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      // Registrar medición del 16
      await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-16',
        precipitacionMm: 12.0,
        fuenteDato: 'ESTACION_PROPIA',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      const listadoVigente = await consultarMedicionesUC.execute({
        fincaId: FINCA_ID,
        soloVigentes: true,
      });

      expect(listadoVigente).toHaveLength(2);
      const del15 = listadoVigente.find(m => m.fecha === '2026-10-15');
      expect(del15?.precipitacionMm).toBe(5.0); // Versión corregida activa
      expect(del15?.esCorreccion).toBe(true);
    });

    it('debe obtener el historial completo de rectificaciones de una medición', async () => {
      const orig = await registrarMedicionUC.execute({
        fincaId: FINCA_ID,
        fecha: '2026-10-14',
        precipitacionMm: 0,
        fuenteDato: 'MEDICION_PROPIA',
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      const corr1 = await corregirMedicionUC.execute({
        id: orig.id,
        motivoCorreccion: 'Primer ajuste por pluviómetro',
        precipitacionMm: 2.0,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      const corr2 = await corregirMedicionUC.execute({
        id: corr1.id,
        motivoCorreccion: 'Segundo ajuste por lectura de testigo',
        precipitacionMm: 2.5,
        fechaReferenciaHoy: FECHA_REFERENCIA,
      });

      const historial = await obtenerHistorialUC.execute(orig.id);
      expect(historial).toHaveLength(3);
      expect(historial[0].id).toBe(orig.id);
      expect(historial[1].id).toBe(corr1.id);
      expect(historial[2].id).toBe(corr2.id);
    });
  });
});
