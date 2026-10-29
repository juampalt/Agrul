import { describe, expect, it } from 'vitest';
import { ContextoMonitoreo, Monitoreo, MonitoreoInvalidoError } from '../../../src/core/domain/entities/monitoreo.entity.js';
import { DomainError } from '../../../src/core/domain/errors/domain.error.js';

describe('CU32/CU33: monitoreo técnico', () => {
  const datos = { cicloId: 'ciclo', responsableId: 'responsable', fechaInspeccion: '2026-10-15',
    etapaFenologica: ' Floración ', estadoGeneralCultivo: ' Bueno ', tipoObservacion: ' Sanitaria ', descripcionHallazgos: ' Sin síntomas ' };
  const contexto = (): ContextoMonitoreo => ({ ciclo: { id: 'ciclo', loteId: 'lote', estado: 'ACTIVO', fechaInicio: '2026-10-01', fechaFin: '2026-10-27' }, responsableActivo: true });
  const hoy = new Date('2026-10-28T15:00:00Z');

  it('normaliza hallazgos y campos opcionales sin exigir una recomendación', () => {
    expect(Monitoreo.registrar('monitoreo', datos, contexto(), hoy).toJSON()).toMatchObject({
      id: 'monitoreo', loteId: 'lote', etapaFenologica: 'Floración', estadoGeneralCultivo: 'Bueno',
      tipoObservacion: 'Sanitaria', descripcionHallazgos: 'Sin síntomas', accionRecomendada: null,
      sectorObservado: null, problemaDetectado: null,
    });
  });

  it('conserva una recomendación técnica como texto', () => {
    expect(Monitoreo.registrar('monitoreo', { ...datos, accionRecomendada: ' Evaluar riego ', problemaDetectado: ' Sequedad ' }, contexto(), hoy).toJSON())
      .toMatchObject({ accionRecomendada: 'Evaluar riego', problemaDetectado: 'Sequedad' });
  });

  it.each(['2026-02-30', '2026-09-30', '2026-10-28', '2099-01-01'])('rechaza fecha inexistente, fuera de ciclo o futura: %s', fechaInspeccion => {
    let error: unknown;
    try { Monitoreo.registrar('m', { ...datos, fechaInspeccion }, contexto(), hoy); }
    catch (capturado) { error = capturado; }
    expect(error).toBeInstanceOf(DomainError);
  });

  it.each(['PLANIFICADO', 'FINALIZADO'])('rechaza ciclo %s', estado => {
    const ctx = contexto(); ctx.ciclo.estado = estado;
    expect(() => Monitoreo.registrar('m', datos, ctx, hoy)).toThrow(MonitoreoInvalidoError);
  });

  it('rechaza responsable inactivo y ciclo inconsistente', () => {
    expect(() => Monitoreo.registrar('m', datos, { ...contexto(), responsableActivo: false }, hoy)).toThrow(MonitoreoInvalidoError);
    expect(() => Monitoreo.registrar('m', { ...datos, cicloId: 'otro' }, contexto(), hoy)).toThrow(MonitoreoInvalidoError);
  });

  it.each(['etapaFenologica', 'estadoGeneralCultivo', 'tipoObservacion', 'descripcionHallazgos'] as const)('exige texto en %s', campo => {
    expect(() => Monitoreo.registrar('m', { ...datos, [campo]: ' ' }, contexto(), hoy)).toThrow(MonitoreoInvalidoError);
  });

  it('rechaza longitudes no representables en SQL', () => {
    expect(() => Monitoreo.registrar('m', { ...datos, etapaFenologica: 'a'.repeat(101) }, contexto(), hoy)).toThrow(MonitoreoInvalidoError);
    expect(() => Monitoreo.registrar('m', { ...datos, sectorObservado: 'a'.repeat(121) }, contexto(), hoy)).toThrow(MonitoreoInvalidoError);
  });

  it('reconstituye e independiza el histórico sin revalidar el ciclo', () => {
    const dto = Monitoreo.registrar('m', datos, contexto(), hoy).toJSON();
    const historico = Monitoreo.reconstituir(dto); dto.descripcionHallazgos = 'Cambio externo';
    expect(historico.toJSON().descripcionHallazgos).toBe('Sin síntomas');
  });
});
