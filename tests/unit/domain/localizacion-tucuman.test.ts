import { describe, it, expect } from 'vitest';
import { LocalizacionTucumanService } from '../../../src/core/domain/services/localizacion-tucuman.service.js';

describe('LocalizacionTucumanService (AGRUL-050 / RNF-12)', () => {
  it('debe tener configurada la zona horaria legal de Tucumán y formato de fecha visual dd/mm/aaaa', () => {
    expect(LocalizacionTucumanService.ZONA_HORARIA).toBe('America/Argentina/Tucuman');
    expect(LocalizacionTucumanService.OFFSET_HORAS).toBe(-3);
    expect(LocalizacionTucumanService.OFFSET_STRING).toBe('-03:00');
    expect(LocalizacionTucumanService.FORMATO_FECHA_VISUAL).toBe('DD/MM/YYYY');
  });

  it('debe contener el catálogo de unidades métricas oficiales obligatorias para el agro', () => {
    const unidades = LocalizacionTucumanService.UNIDADES_OFICIALES;
    expect(unidades.masa).toBe('kg');
    expect(unidades.volumen).toBe('L');
    expect(unidades.superficie).toBe('ha');
    expect(unidades.temperatura).toBe('°C');
    expect(unidades.precipitacion).toBe('mm');
    expect(unidades.velocidadViento).toBe('km/h');
  });

  describe('RNF-12: Preservación de Fecha a las 23:30 hs (Invariante contra corrimiento UTC)', () => {
    it('un evento capturado a las 23:30 hs en Tucumán (02:30Z del día siguiente) debe preservar la fecha original del día', () => {
      // 24 de Octubre de 2026 a las 23:30:00 en Tucumán (UTC-3)
      // En UTC corresponde a: 2026-10-25T02:30:00.000Z
      const timestampTucuman = LocalizacionTucumanService.crearTimestampTucuman(2026, 10, 24, 23, 30, 0);

      // Verificamos que el timestamp UTC efectivamente sea 02:30Z del 25
      expect(timestampTucuman.toISOString()).toBe('2026-10-25T02:30:00.000Z');

      // Invariante RNF-12: La fecha local extraída en Tucumán debe ser 2026-10-24, NO 2026-10-25
      const fechaLocal = LocalizacionTucumanService.extraerFechaLocal(timestampTucuman);
      expect(fechaLocal).toBe('2026-10-24');

      // La hora local extraída debe ser 23:30:00
      const horaLocal = LocalizacionTucumanService.extraerHoraLocal(timestampTucuman);
      expect(horaLocal).toBe('23:30:00');

      // El formato visual oficial argentino debe ser 24/10/2026
      const fechaVisual = LocalizacionTucumanService.formatearFechaVisual(timestampTucuman);
      expect(fechaVisual).toBe('24/10/2026');

      // Formato combinado fecha y hora visual
      const fechaHoraVisual = LocalizacionTucumanService.formatearFechaHoraVisual(timestampTucuman);
      expect(fechaHoraVisual).toBe('24/10/2026 23:30:00');
    });

    it('verificarPreservacionFecha2330 debe validar afirmativamente', () => {
      const preserva = LocalizacionTucumanService.verificarPreservacionFecha2330('2026-10-24');
      expect(preserva).toBe(true);
    });

    it('descomponer debe retornar la estructura integral con fecha, hora, formato visual e ISO con offset -03:00', () => {
      const d = LocalizacionTucumanService.crearTimestampTucuman(2026, 3, 15, 23, 45, 10);
      const info = LocalizacionTucumanService.descomponer(d);

      expect(info.fechaLocal).toBe('2026-03-15');
      expect(info.horaLocal).toBe('23:45:10');
      expect(info.fechaVisual).toBe('15/03/2026');
      expect(info.fechaHoraVisual).toBe('15/03/2026 23:45:10');
      expect(info.isoConOffset).toBe('2026-03-15T23:45:10-03:00');
    });
  });

  describe('Parsing de Cadenas de Fecha en Localización Tucumán', () => {
    it('debe parsear formato YYYY-MM-DD anclado a medianoche de Tucumán', () => {
      const d = LocalizacionTucumanService.parsearCadenaEntrada('2026-10-24');
      expect(LocalizacionTucumanService.extraerFechaLocal(d)).toBe('2026-10-24');
      expect(d.toISOString()).toBe('2026-10-24T03:00:00.000Z');
    });

    it('debe parsear formato visual DD/MM/AAAA correctamente', () => {
      const d = LocalizacionTucumanService.parsearCadenaEntrada('24/10/2026');
      expect(LocalizacionTucumanService.extraerFechaLocal(d)).toBe('2026-10-24');
    });

    it('debe lanzar error ante fechas inválidas', () => {
      expect(() => LocalizacionTucumanService.extraerFechaLocal('fecha-invalida')).toThrow();
      expect(() => LocalizacionTucumanService.parsearCadenaEntrada('formato-erroneo')).toThrow();
    });
  });
});
