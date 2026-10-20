import { describe, it, expect } from 'vitest';
import { Proveedor } from '../../../src/core/domain/entities/proveedor.entity.js';
import { ProveedorInvalidoError } from '../../../src/core/domain/errors/domain.error.js';

describe('Entidad de Dominio: Proveedor (AGRUL-041 / RF-M9-01)', () => {
  it('debe instanciar correctamente un proveedor con datos completos', () => {
    const proveedor = Proveedor.crear({
      id: 'prov-001',
      razonSocial: 'Agroquímica del Valle S.A.',
      cuit: '30-71234567-8',
      contacto: 'Ing. Carlos Pérez',
      telefono: '+54 261 4567890',
      email: 'ventas@agroquimicadelvalle.com',
      direccion: 'Ruta 40 Km 35, Mendoza',
    });

    expect(proveedor.id).toBe('prov-001');
    expect(proveedor.razonSocial).toBe('Agroquímica del Valle S.A.');
    expect(proveedor.cuit).toBe('30-71234567-8');
    expect(proveedor.contacto).toBe('Ing. Carlos Pérez');
    expect(proveedor.telefono).toBe('+54 261 4567890');
    expect(proveedor.email).toBe('ventas@agroquimicadelvalle.com');
    expect(proveedor.direccion).toBe('Ruta 40 Km 35, Mendoza');
    expect(proveedor.activo).toBe(true);
    expect(proveedor.creadoEn).toBeDefined();
    expect(proveedor.actualizadoEn).toBeDefined();
  });

  it('debe rechazar proveedor sin id o con id en blanco', () => {
    expect(() =>
      Proveedor.crear({
        id: '  ',
        razonSocial: 'Semillas Norte SRL',
      })
    ).toThrow(ProveedorInvalidoError);
  });

  it('debe rechazar proveedor con razón social corta o vacía', () => {
    expect(() =>
      Proveedor.crear({
        id: 'prov-002',
        razonSocial: 'A',
      })
    ).toThrow(ProveedorInvalidoError);
  });

  it('debe rechazar proveedor con formato de email inválido', () => {
    expect(() =>
      Proveedor.crear({
        id: 'prov-003',
        razonSocial: 'Fertilizantes Cuyo',
        email: 'email-sin-arroba.com',
      })
    ).toThrow(ProveedorInvalidoError);
  });

  it('debe permitir actualizar datos y modificar el timestamp', () => {
    const proveedor = Proveedor.crear({
      id: 'prov-004',
      razonSocial: 'Insumos Agrícolas San Juan',
      telefono: '111',
    });

    proveedor.actualizarDatos({
      telefono: '+54 264 9998888',
      contacto: 'Mariana Gómez',
    });

    expect(proveedor.telefono).toBe('+54 264 9998888');
    expect(proveedor.contacto).toBe('Mariana Gómez');
  });

  it('debe poder activar y desactivar un proveedor', () => {
    const proveedor = Proveedor.crear({
      id: 'prov-005',
      razonSocial: 'Cooperativa Agrícola',
    });

    expect(proveedor.activo).toBe(true);
    proveedor.desactivar();
    expect(proveedor.activo).toBe(false);
    proveedor.activar();
    expect(proveedor.activo).toBe(true);
  });
});
