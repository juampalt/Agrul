import { describe, expect, it } from 'vitest';
import { CicloConActividadesPendientesError, VerificarCierreCicloUseCase } from '../../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';

describe('RN-09: verificación de cierre', () => {
  it('rechaza el cierre cuando la fuente informa pendientes', async () => {
    const verificar = new VerificarCierreCicloUseCase({ tienePendientes: async () => true });
    await expect(verificar.execute('ciclo')).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
  });

  it('solo aprueba después de confirmar la ausencia de pendientes para el ciclo solicitado', async () => {
    const verificar = new VerificarCierreCicloUseCase({ tienePendientes: async (id) => {
      expect(id).toBe('ciclo-consultado');
      return false;
    } });
    await expect(verificar.execute('ciclo-consultado')).resolves.toBeUndefined();
  });

  it('propaga una fuente indisponible en lugar de interpretarla como cero pendientes', async () => {
    const error = new Error('Fuente de actividades indisponible');
    const verificar = new VerificarCierreCicloUseCase({ tienePendientes: async () => { throw error; } });
    await expect(verificar.execute('ciclo')).rejects.toBe(error);
  });
});
