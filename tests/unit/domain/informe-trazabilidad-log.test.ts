import { describe, it, expect } from 'vitest';
import {
  InformeTrazabilidadLog,
  InformeTrazabilidadInvalidoError,
} from '../../../src/core/domain/entities/informe-trazabilidad-log.entity.js';

describe('Entidad de Dominio: InformeTrazabilidadLog (RF-M6-13 / RN-06)', () => {
  const validProps = {
    id: '00000000-0000-0000-0000-000000000001',
    codigoInforme: 'INF-TRZ-20261020-0001',
    cosechaId: '00000000-0000-0000-0000-000000000010',
    loteId: '00000000-0000-0000-0000-000000000100',
    codigoTrazabilidad: 'COS-L12-20260915-01',
    tipoFormato: 'PDF' as const,
    usuarioEmisor: 'Auditor SENASA / Juan Pérez',
    rolEmisor: 'Auditor Externo',
    filtrosAplicados: {
      incluirDatosSensibles: false,
      incluirCostos: false,
    },
  };

  it('debe crear un log de informe válido con todos sus atributos requeridos', () => {
    const log = InformeTrazabilidadLog.crear(validProps);

    expect(log.id).toBe(validProps.id);
    expect(log.codigoInforme).toBe(validProps.codigoInforme);
    expect(log.cosechaId).toBe(validProps.cosechaId);
    expect(log.loteId).toBe(validProps.loteId);
    expect(log.codigoTrazabilidad).toBe(validProps.codigoTrazabilidad);
    expect(log.tipoFormato).toBe('PDF');
    expect(log.usuarioEmisor).toBe(validProps.usuarioEmisor);
    expect(log.rolEmisor).toBe('Auditor Externo');
    expect(log.filtrosAplicados.incluirDatosSensibles).toBe(false);
    expect(log.emitidoEn).toBeDefined();

    const json = log.toJSON();
    expect(json.codigoInforme).toBe(validProps.codigoInforme);
  });

  it('debe rechazar la creación si falta el usuario emisor (RF-M6-13)', () => {
    expect(() =>
      InformeTrazabilidadLog.crear({
        ...validProps,
        usuarioEmisor: '',
      })
    ).toThrow(InformeTrazabilidadInvalidoError);
  });

  it('debe rechazar formatos no soportados', () => {
    expect(() =>
      InformeTrazabilidadLog.crear({
        ...validProps,
        tipoFormato: 'DOCX' as any,
      })
    ).toThrow(InformeTrazabilidadInvalidoError);
  });

  it('debe rechazar código de informe vacío', () => {
    expect(() =>
      InformeTrazabilidadLog.crear({
        ...validProps,
        codigoInforme: '   ',
      })
    ).toThrow(InformeTrazabilidadInvalidoError);
  });
});
