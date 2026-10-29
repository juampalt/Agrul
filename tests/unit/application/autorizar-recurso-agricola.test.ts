import { describe, expect, it, vi } from 'vitest';
import { AutorizarRecursoAgricolaUseCase, fincasVisiblesAgricolas } from '../../../src/application/use-cases/autorizar-recurso-agricola.use-case.js';
import { AccesoDenegadoFincaError, CredencialesInvalidasError, EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('S1: autorización de recursos agrícolas por finca', () => {
  const actor = { perfil: 'ENCARGADO_CAMPO', fincas: ['finca-a'] };

  it.each(['ciclo', 'lote', 'programada', 'realizada', 'monitoreo'] as const)('permite finca asignada y deniega otra finca para %s', async tipo => {
    const buscarFinca = vi.fn().mockResolvedValue({ fincaId: 'finca-a' });
    const autorizar = new AutorizarRecursoAgricolaUseCase({ buscarFinca });
    await expect(autorizar.execute(actor, tipo, 'id')).resolves.toBeUndefined();
    expect(buscarFinca).toHaveBeenCalledWith(tipo, 'id');
    buscarFinca.mockResolvedValue({ fincaId: 'finca-b' });
    await expect(autorizar.execute(actor, tipo, 'id')).rejects.toBeInstanceOf(AccesoDenegadoFincaError);
  });

  it('no confunde ADMIN_SISTEMA con el administrador de datos', async () => {
    const autorizar = new AutorizarRecursoAgricolaUseCase({ buscarFinca: async () => ({ fincaId: 'finca-a' }) });
    await expect(autorizar.execute({ perfil: 'ADMINISTRADOR', fincas: [] }, 'ciclo', 'id')).resolves.toBeUndefined();
    await expect(autorizar.execute({ perfil: 'ADMIN_SISTEMA', fincas: [] }, 'ciclo', 'id')).rejects.toBeInstanceOf(AccesoDenegadoFincaError);
  });

  it('deniega recursos sin finca y usuarios sin asignaciones', async () => {
    const buscarFinca = vi.fn().mockResolvedValue({ fincaId: null });
    const autorizar = new AutorizarRecursoAgricolaUseCase({ buscarFinca });
    await expect(autorizar.execute(actor, 'ciclo', 'id')).rejects.toBeInstanceOf(AccesoDenegadoFincaError);
    buscarFinca.mockResolvedValue({ fincaId: 'finca-a' });
    await expect(autorizar.execute({ perfil: 'ENCARGADO_CAMPO' }, 'ciclo', 'id')).rejects.toBeInstanceOf(AccesoDenegadoFincaError);
  });

  it('distingue inexistencia y falla antes de consultar sin identidad', async () => {
    const buscarFinca = vi.fn().mockResolvedValue(null);
    const autorizar = new AutorizarRecursoAgricolaUseCase({ buscarFinca });
    await expect(autorizar.execute(actor, 'programada', 'id')).rejects.toBeInstanceOf(EntidadNoEncontradaError);
    buscarFinca.mockClear();
    await expect(autorizar.execute(undefined, 'programada', 'id')).rejects.toBeInstanceOf(CredencialesInvalidasError);
    expect(buscarFinca).not.toHaveBeenCalled();
  });

  it('el alcance solo es global para ADMINISTRADOR; la lista se copia y falta de identidad no abre acceso', () => {
    expect(fincasVisiblesAgricolas({ perfil: 'ADMINISTRADOR' })).toBeUndefined();
    expect(fincasVisiblesAgricolas({ perfil: 'ENCARGADO_CAMPO' })).toEqual([]);
    const copia = fincasVisiblesAgricolas(actor); copia?.push('finca-b');
    expect(actor.fincas).toEqual(['finca-a']);
    expect(() => fincasVisiblesAgricolas(undefined)).toThrow(CredencialesInvalidasError);
  });
});
