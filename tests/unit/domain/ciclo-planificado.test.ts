import { describe, expect, it } from 'vitest';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InvalidStateTransitionError } from '../../../src/core/domain/errors/domain.error.js';
import { CicloProductivoInvalidoError } from '../../../src/core/domain/value-objects/planificacion-ciclo.vo.js';

const contexto = { loteId: 'lote', cultivo: 'Arándano', variedad: 'Emerald', superficieHa: 5,
  fechaPlantacion: '2026-10-01', cantidadInicialPlantas: 100 };
const datos = { id: 'ciclo', plantacionId: 'plantacion', nombreCodigo: ' Ciclo 2026 ', fechaInicioPrevista: '2026-10-10',
  fechaFinPrevista: '2026-10-27', responsableSeguimientoId: 'responsable', observaciones: null };
const hoy = new Date('2026-10-28T02:30:00Z');

describe('Ciclo productivo planificado (AGRUL-052)', () => {
  it('nace PLANIFICADO y permite fechas previstas futuras', () => {
    const ciclo = CicloProductivo.planificar({ ...datos, fechaInicioPrevista: '2999-01-01', fechaFinPrevista: '2999-12-31' }, contexto);
    expect(ciclo.toPlanificacionJSON()).toMatchObject({ plantacionId: 'plantacion', nombreCodigo: 'Ciclo 2026',
      estado: 'PLANIFICADO', fechaInicioEfectiva: null, fechaFinEfectiva: null });
    expect(ciclo.estaAbierto()).toBe(false);
  });

  it('transiciona PLANIFICADO -> ACTIVO -> FINALIZADO sin alterar las previsiones', () => {
    const ciclo = CicloProductivo.planificar(datos, contexto);
    ciclo.iniciar('2026-10-09', contexto.fechaPlantacion, hoy);
    expect(ciclo.estaAbierto()).toBe(true);
    expect(ciclo.fechaInicio).toBe('2026-10-09');
    ciclo.finalizar('2026-10-27', hoy);
    expect(ciclo.esCerrado()).toBe(true);
    expect(ciclo.esProvisional()).toBe(false);
    expect(ciclo.toPlanificacionJSON()).toMatchObject({ estado: 'FINALIZADO', fechaInicioPrevista: '2026-10-10',
      fechaInicioEfectiva: '2026-10-09', fechaFinEfectiva: '2026-10-27' });
    const copia = ciclo.toJSON();
    if (copia.planificacion) copia.planificacion.nombreCodigo = 'Alterado';
    expect(ciclo.toPlanificacionJSON().nombreCodigo).toBe('Ciclo 2026');
  });

  it('impide saltear estados, reiniciar y volver a finalizar', () => {
    const ciclo = CicloProductivo.planificar(datos, contexto);
    expect(() => ciclo.finalizar('2026-10-27', hoy)).toThrow(InvalidStateTransitionError);
    ciclo.iniciar('2026-10-10', contexto.fechaPlantacion, hoy);
    expect(() => ciclo.iniciar('2026-10-11', contexto.fechaPlantacion, hoy)).toThrow(InvalidStateTransitionError);
    ciclo.finalizar('2026-10-27', hoy);
    expect(() => ciclo.finalizar('2026-10-27', hoy)).toThrow(InvalidStateTransitionError);
  });

  it.each([{ nombreCodigo: ' ' }, { nombreCodigo: 'x'.repeat(31) }, { responsableSeguimientoId: '' },
    { fechaInicioPrevista: '2026-02-30' }, { fechaInicioPrevista: '2026-09-30' }, { fechaFinPrevista: '2026-10-09' }])(
    'rechaza planificación inválida: %j', (extra) => {
      expect(() => CicloProductivo.planificar({ ...datos, ...extra }, contexto)).toThrow(CicloProductivoInvalidoError);
    });

  it.each(['2026-09-30', '2026-02-30', '2026-10-28'])('rechaza inicio efectivo inválido %s', (fecha) => {
    expect(() => CicloProductivo.planificar(datos, contexto).iniciar(fecha, contexto.fechaPlantacion, hoy))
      .toThrow(CicloProductivoInvalidoError);
  });

  it.each(['2026-10-09', '2026-02-30', '2026-10-28'])('rechaza fin efectivo inválido %s', (fecha) => {
    const ciclo = CicloProductivo.planificar(datos, contexto);
    ciclo.iniciar('2026-10-10', contexto.fechaPlantacion, hoy);
    expect(() => ciclo.finalizar(fecha, hoy)).toThrow(CicloProductivoInvalidoError);
  });
});
