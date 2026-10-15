import { describe, it, expect } from 'vitest';
import {
  InsumoCatalogo,
  FichaFitosanitariaInvalidaError,
  InsumoCatalogoInvalidoError,
} from '../../../src/core/domain/entities/insumo-catalogo.entity.js';

describe('Entidad de Dominio: InsumoCatalogo (RF-M4-01, RF-M4-02, RN-14)', () => {
  it('debe crear un insumo no fitosanitario correctamente sin ficha técnica obligatoria', () => {
    const insumo = InsumoCatalogo.crear({
      id: 'ins-001',
      nombreComercial: 'Urea Granulada 46%',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 50kg',
    });

    expect(insumo.id).toBe('ins-001');
    expect(insumo.nombreComercial).toBe('Urea Granulada 46%');
    expect(insumo.categoria).toBe('FERTILIZANTE');
    expect(insumo.unidadMedidaId).toBe('KG');
    expect(insumo.presentacion).toBe('Bolsa 50kg');
    expect(insumo.activo).toBe(true);
    expect(insumo.fichaFitosanitaria).toBeNull();
  });

  it('debe crear un insumo fitosanitario con ficha técnica válida cumpliendo RN-14', () => {
    const insumo = InsumoCatalogo.crear({
      id: 'ins-002',
      nombreComercial: 'Abamectina 1.8 EC',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'LT',
      presentacion: 'Bidón 1L',
      fichaFitosanitaria: {
        principioActivo: 'Abamectina',
        periodoCarenciaDias: 7,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-35412',
        toxicologia: 'Clase II - Moderadamente Peligroso (Banda Amarilla)',
      },
    });

    expect(insumo.categoria).toBe('FITOSANITARIO');
    expect(insumo.fichaFitosanitaria).toBeDefined();
    expect(insumo.fichaFitosanitaria?.principioActivo).toBe('Abamectina');
    expect(insumo.fichaFitosanitaria?.periodoCarenciaDias).toBe(7);
    expect(insumo.fichaFitosanitaria?.periodoReingresoHoras).toBe(24);
    expect(insumo.fichaFitosanitaria?.nroRegistroSenasa).toBe('SENASA-35412');
  });

  it('debe rechazar un insumo fitosanitario sin ficha técnica (RN-14)', () => {
    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-003',
        nombreComercial: 'Glifosato 48%',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'LT',
        presentacion: 'Bidón 20L',
        fichaFitosanitaria: null,
      })
    ).toThrow(FichaFitosanitariaInvalidaError);
  });

  it('debe rechazar carencia negativa o no entera (RN-14)', () => {
    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-004',
        nombreComercial: 'Fungicida Cobre',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa 5kg',
        fichaFitosanitaria: {
          principioActivo: 'Oxicloruro de Cobre',
          periodoCarenciaDias: -1,
          periodoReingresoHoras: 12,
          nroRegistroSenasa: 'SENASA-12345',
        },
      })
    ).toThrow(FichaFitosanitariaInvalidaError);
  });

  it('debe rechazar reingreso negativo o no entero (RN-14)', () => {
    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-005',
        nombreComercial: 'Insecticida Alfa',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'LT',
        presentacion: 'Botella 1L',
        fichaFitosanitaria: {
          principioActivo: 'Cipermetrina',
          periodoCarenciaDias: 14,
          periodoReingresoHoras: -5,
          nroRegistroSenasa: 'SENASA-99887',
        },
      })
    ).toThrow(FichaFitosanitariaInvalidaError);
  });

  it('debe rechazar fitosanitario sin registro SENASA o sin principio activo', () => {
    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-006',
        nombreComercial: 'Insecticida Beta',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'LT',
        presentacion: 'Botella 1L',
        fichaFitosanitaria: {
          principioActivo: '',
          periodoCarenciaDias: 3,
          periodoReingresoHoras: 12,
          nroRegistroSenasa: 'SENASA-11223',
        },
      })
    ).toThrow(FichaFitosanitariaInvalidaError);

    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-007',
        nombreComercial: 'Insecticida Gamma',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'LT',
        presentacion: 'Botella 1L',
        fichaFitosanitaria: {
          principioActivo: 'Deltametrina',
          periodoCarenciaDias: 3,
          periodoReingresoHoras: 12,
          nroRegistroSenasa: '',
        },
      })
    ).toThrow(FichaFitosanitariaInvalidaError);
  });

  it('debe validar que nombre comercial, unidad y presentación no sean vacíos', () => {
    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-008',
        nombreComercial: ' ',
        categoria: 'ENMIENDA',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa',
      })
    ).toThrow(InsumoCatalogoInvalidoError);

    expect(() =>
      InsumoCatalogo.crear({
        id: 'ins-009',
        nombreComercial: 'Compost Orgánico',
        categoria: 'ENMIENDA',
        unidadMedidaId: '',
        presentacion: 'Bolsa',
      })
    ).toThrow(InsumoCatalogoInvalidoError);
  });

  it('debe permitir desactivar un insumo lógicamente', () => {
    const insumo = InsumoCatalogo.crear({
      id: 'ins-010',
      nombreComercial: 'Plantín Frutilla San Andreas',
      categoria: 'SEMILLA_PLANTIN',
      unidadMedidaId: 'UNIDAD',
      presentacion: 'Bandeja 128 celdas',
    });

    expect(insumo.activo).toBe(true);
    insumo.desactivar();
    expect(insumo.activo).toBe(false);
  });
});
