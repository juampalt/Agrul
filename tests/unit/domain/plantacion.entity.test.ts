import { describe, expect, it } from 'vitest';
import { Plantacion, PlantacionInvalidaError } from '../../../src/core/domain/entities/plantacion.entity.js';
import { InvalidStateTransitionError } from '../../../src/core/domain/errors/domain.error.js';

const hoy = new Date('2026-10-28T02:30:00Z'); // 27/10, 23:30 en Tucumán.
const datos = { id: 'plantacion', loteId: 'lote', cultivoId: 'cultivo', variedadId: 'variedad',
  fechaPlantacion: '2026-10-01', superficieHa: 0.1, cantidadInicialPlantas: 100, procedencia: null };
const asignacion = { loteActivo: true, superficieLoteHa: 0.3, superficieOcupadaHa: 0.2,
  cultivoActivo: true, variedadActiva: true, cultivoDeVariedadId: 'cultivo' };

describe('Plantación (AGRUL-052)', () => {
  it('nace activa, sin finalización y con datos protegidos de mutación externa', () => {
    const plantacion = Plantacion.crear(datos, hoy);
    const json = plantacion.toJSON();
    expect(json).toMatchObject({ ...datos, estado: 'ACTIVA', fechaFinalizacion: null });
    json.estado = 'FINALIZADA';
    expect(plantacion.toJSON().estado).toBe('ACTIVA');
  });

  it('admite ocupar exactamente 0.3 ha con 0.1 y 0.2 sin error de redondeo', () => {
    expect(() => Plantacion.crear(datos, hoy).validarAsignacion(asignacion)).not.toThrow();
  });

  it.each([0, -1, 0.001, NaN, Infinity, 1000000])('rechaza superficie inválida %s', (superficieHa) => {
    expect(() => Plantacion.crear({ ...datos, superficieHa }, hoy)).toThrow(PlantacionInvalidaError);
  });

  it.each([0, -1, 1.5, NaN, 2147483648])('rechaza cantidad inicial inválida %s', (cantidadInicialPlantas) => {
    expect(() => Plantacion.crear({ ...datos, cantidadInicialPlantas }, hoy)).toThrow(PlantacionInvalidaError);
  });

  it.each(['2026-02-30', 'no-fecha', '2026-10-28'])('rechaza fecha inválida o futura en Tucumán %s', (fechaPlantacion) => {
    expect(() => Plantacion.crear({ ...datos, fechaPlantacion }, hoy)).toThrow(PlantacionInvalidaError);
  });

  it.each([
    { loteActivo: false }, { cultivoActivo: false }, { variedadActiva: false },
    { cultivoDeVariedadId: 'otro' }, { superficieLoteHa: 0 }, { superficieOcupadaHa: 0.21 },
  ])('rechaza asignación inconsistente %j', (contexto) => {
    expect(() => Plantacion.crear(datos, hoy).validarAsignacion({ ...asignacion, ...contexto }))
      .toThrow(PlantacionInvalidaError);
  });

  it('finaliza con fecha local sin modificar el registro original', () => {
    const plantacion = Plantacion.crear(datos, hoy);
    const finalizada = plantacion.finalizar('2026-10-27', hoy);
    expect(finalizada.toJSON()).toEqual({ ...datos, observaciones: null, estado: 'FINALIZADA', fechaFinalizacion: '2026-10-27' });
    expect(plantacion.toJSON().estado).toBe('ACTIVA');
    expect(() => finalizada.finalizar('2026-10-27', hoy)).toThrow(InvalidStateTransitionError);
  });

  it.each(['2026-09-30', '2026-10-28', '2026-02-30'])('rechaza finalización inválida %s', (fecha) => {
    expect(() => Plantacion.crear(datos, hoy).finalizar(fecha, hoy)).toThrow(PlantacionInvalidaError);
  });
});
