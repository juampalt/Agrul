import { describe, it, expect } from 'vitest';
import { PoliticaRetencionBpaService } from '../../../src/core/domain/services/politica-retencion-bpa.service.js';

describe('PoliticaRetencionBpaService (AGRUL-050 / RNF-06 / RN-05)', () => {
  it('debe definir la retención mínima obligatoria en 3 años conforme manual BPA', () => {
    expect(PoliticaRetencionBpaService.ANOS_RETENCION_MINIMA).toBe(3);
  });

  describe('validarRetencionMinima', () => {
    it('debe rechazar la eliminación física si el registro tiene menos de 3 años de antigüedad', () => {
      const fechaActual = new Date('2026-10-24T12:00:00Z');
      // Registro de hace 1 año
      const fechaRegistro1Ano = new Date('2025-10-24T12:00:00Z');

      const resultado = PoliticaRetencionBpaService.validarRetencionMinima(fechaRegistro1Ano, fechaActual);

      expect(resultado.permitido).toBe(false);
      expect(resultado.anosTranscurridos).toBeLessThan(3);
      expect(resultado.motivoRechazo).toContain('normativa BPA exige una retención mínima inmutable de 3 años');
      expect(resultado.motivoRechazo).toContain('RNF-06 / RN-05');
    });

    it('debe rechazar la eliminación si el registro tiene 2.9 años de antigüedad', () => {
      const fechaActual = new Date('2026-10-24T12:00:00Z');
      // Registro de hace 1000 días (~2.74 años)
      const fechaRegistro = new Date(fechaActual.getTime() - 1000 * 24 * 60 * 60 * 1000);

      const resultado = PoliticaRetencionBpaService.validarRetencionMinima(fechaRegistro, fechaActual);
      expect(resultado.permitido).toBe(false);
    });

    it('debe permitir la depuración solo si han transcurrido más de 3 años completos', () => {
      const fechaActual = new Date('2026-10-24T12:00:00Z');
      // Registro de hace 3.5 años
      const fechaRegistro = new Date('2023-01-01T12:00:00Z');

      const resultado = PoliticaRetencionBpaService.validarRetencionMinima(fechaRegistro, fechaActual);

      expect(resultado.permitido).toBe(true);
      expect(resultado.anosTranscurridos).toBeGreaterThanOrEqual(3);
      expect(resultado.motivoRechazo).toBeUndefined();
    });
  });

  describe('esRutaProductivaProtegida', () => {
    it('debe identificar todas las rutas productivas protegidas por política de retención BPA', () => {
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/cosechas/123')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/lotes/abc')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/actividades/xyz')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/stock/movimientos/789')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/clima/mediciones/456')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/despachos/999')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/monitoreo/111')).toBe(true);
      expect(PoliticaRetencionBpaService.esRutaProductivaProtegida('/api/v1/fincas/222')).toBe(true);
    });
  });

  describe('construirErrorBorradoProhibido', () => {
    it('debe construir el error estandarizado DELETE_FISICO_PROHIBIDO_BPA con referencia a RN-05', () => {
      const error = PoliticaRetencionBpaService.construirErrorBorradoProhibido('/api/v1/cosechas/123');

      expect(error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
      expect(error.message).toContain('retención mínima de 3 años obligatoria');
      expect(error.message).toContain('RNF-06 / RN-05');
      expect(error.details.retencionMinimaAnos).toBe(3);
      expect(error.details.recurso).toBe('/api/v1/cosechas/123');
    });
  });
});
