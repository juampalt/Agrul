import { describe, it, expect } from 'vitest';
import { DepositoAlmacenamiento } from '../../../src/core/domain/entities/deposito-almacenamiento.entity.js';
import {
  DepositoInvalidoError,
  DepositoIncompatibleBpaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Entidad de Dominio: DepositoAlmacenamiento y Segregación BPA (AGRUL-042 / RF-M9-19)', () => {
  it('debe instanciar correctamente un depósito con tipo permitido válido', () => {
    const dep = DepositoAlmacenamiento.crear({
      id: 'dep-001',
      fincaId: 'finca-01',
      nombre: 'Galpón Principal Fitosanitarios',
      tipoPermitido: 'FITOSANITARIOS',
      ubicacionFisica: 'Sector Norte, Nave 1',
      capacidadMaxima: 5000,
    });

    expect(dep.id).toBe('dep-001');
    expect(dep.fincaId).toBe('finca-01');
    expect(dep.nombre).toBe('Galpón Principal Fitosanitarios');
    expect(dep.tipoPermitido).toBe('FITOSANITARIOS');
    expect(dep.activo).toBe(true);
  });

  it('debe rechazar la creación si falta el id o el nombre es muy corto', () => {
    expect(() =>
      DepositoAlmacenamiento.crear({
        id: '',
        fincaId: 'finca-01',
        nombre: 'Galpón',
        tipoPermitido: 'FITOSANITARIOS',
      })
    ).toThrow(DepositoInvalidoError);

    expect(() =>
      DepositoAlmacenamiento.crear({
        id: 'dep-002',
        fincaId: 'finca-01',
        nombre: 'A',
        tipoPermitido: 'FERTILIZANTES',
      })
    ).toThrow(DepositoInvalidoError);
  });

  describe('Reglas de Segregación Física BPA (RF-M9-19)', () => {
    const depFito = DepositoAlmacenamiento.crear({
      id: 'dep-fito',
      fincaId: 'finca-01',
      nombre: 'Depósito Químicos / Fitosanitarios',
      tipoPermitido: 'FITOSANITARIOS',
    });

    const depFert = DepositoAlmacenamiento.crear({
      id: 'dep-fert',
      fincaId: 'finca-01',
      nombre: 'Depósito Fertilizantes y Enmiendas',
      tipoPermitido: 'FERTILIZANTES',
    });

    const depGeneral = DepositoAlmacenamiento.crear({
      id: 'dep-gen',
      fincaId: 'finca-01',
      nombre: 'Depósito Insumos Generales y Semillas',
      tipoPermitido: 'INSUMOS_GENERALES',
    });

    const depVencidos = DepositoAlmacenamiento.crear({
      id: 'dep-venc',
      fincaId: 'finca-01',
      nombre: 'Zona de Residuos y Vencidos Cuarentena',
      tipoPermitido: 'ZONA_VENCIDOS',
    });

    it('debe permitir fitosanitarios en depósitos de tipo FITOSANITARIOS', () => {
      expect(() => depFito.validarCompatibilidadBpa('FITOSANITARIO', false)).not.toThrow();
    });

    it('PROHIBIDO almacenar fitosanitarios en depósitos de fertilizantes (RF-M9-19)', () => {
      expect(() => depFert.validarCompatibilidadBpa('FITOSANITARIO', false)).toThrow(
        DepositoIncompatibleBpaError
      );
    });

    it('PROHIBIDO almacenar fitosanitarios en depósitos de insumos generales (RF-M9-19)', () => {
      expect(() => depGeneral.validarCompatibilidadBpa('FITOSANITARIO', false)).toThrow(
        DepositoIncompatibleBpaError
      );
    });

    it('PROHIBIDO almacenar fertilizantes en el depósito exclusivo de fitosanitarios (RF-M9-19)', () => {
      expect(() => depFito.validarCompatibilidadBpa('FERTILIZANTE', false)).toThrow(
        DepositoIncompatibleBpaError
      );
    });

    it('debe permitir fertilizantes en depósitos de FERTILIZANTES o INSUMOS_GENERALES', () => {
      expect(() => depFert.validarCompatibilidadBpa('FERTILIZANTE', false)).not.toThrow();
      expect(() => depGeneral.validarCompatibilidadBpa('FERTILIZANTE', false)).not.toThrow();
    });

    it('debe exigir que insumos vencidos se almacenen exclusivamente en ZONA_VENCIDOS (RF-M9-19)', () => {
      // Intentar almacenar vencido en depósito normal de fitos o ferts
      expect(() => depFito.validarCompatibilidadBpa('FITOSANITARIO', true)).toThrow(
        DepositoIncompatibleBpaError
      );
      expect(() => depFert.validarCompatibilidadBpa('FERTILIZANTE', true)).toThrow(
        DepositoIncompatibleBpaError
      );

      // Almacenar vencido en ZONA_VENCIDOS es válido
      expect(() => depVencidos.validarCompatibilidadBpa('FITOSANITARIO', true)).not.toThrow();
      expect(() => depVencidos.validarCompatibilidadBpa('FERTILIZANTE', true)).not.toThrow();
    });
  });
});
