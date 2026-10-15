import { describe, it, expect } from 'vitest';
import {
  AplicacionAgricola,
  AplicacionInvalidaError,
} from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { FechaFuturaInvalidaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Entidad de Dominio: AplicacionAgricola (AGRUL-025)', () => {
  const hoyFijo = new Date('2026-10-15T12:00:00Z');

  const payloadValido = {
    id: crypto.randomUUID(),
    actividadId: crypto.randomUUID(),
    loteId: crypto.randomUUID(),
    cicloId: crypto.randomUUID(),
    fecha: '2026-10-14',
    responsableId: crypto.randomUUID(),
    metodo: 'FOLIAR',
    motivo: 'Control preventivo de oídio y aporte de microelementos',
    equipoAplicacion: 'Pulverizadora de arrastre 2000L con turbina',
    condicionesClima: {
      vientoKmH: 8.5,
      tempC: 22.0,
      lluviaMm: 0,
      observaciones: 'Cielo despejado, sin probabilidad de lluvia',
    },
    lineas: [
      {
        insumoId: crypto.randomUUID(),
        cantidadTotal: 5.0,
        unidadMedidaId: 'L',
        dosisPorSuperficie: 2.5, // 2.5 L/ha
        dosisPorPlanta: null,
        concentracion: '250 cc/100L',
      },
    ],
    fechaReferenciaHoy: hoyFijo,
  };

  it('RF-M4-03 / RF-M4-04: debe instanciar una aplicación válida con dosis diferenciadas', () => {
    const aplicacion = AplicacionAgricola.crear(payloadValido);

    expect(aplicacion.id).toBe(payloadValido.id);
    expect(aplicacion.actividadId).toBe(payloadValido.actividadId);
    expect(aplicacion.loteId).toBe(payloadValido.loteId);
    expect(aplicacion.cicloId).toBe(payloadValido.cicloId);
    expect(aplicacion.fecha).toBe('2026-10-14');
    expect(aplicacion.metodo).toBe('FOLIAR');
    expect(aplicacion.equipoAplicacion).toBe('Pulverizadora de arrastre 2000L con turbina');
    expect(aplicacion.condicionesClima?.vientoKmH).toBe(8.5);
    expect(aplicacion.condicionesClima?.tempC).toBe(22.0);
    expect(aplicacion.lineas).toHaveLength(1);
    expect(aplicacion.lineas[0].cantidadTotal).toBe(5.0);
    expect(aplicacion.lineas[0].dosisPorSuperficie).toBe(2.5);
    expect(aplicacion.lineas[0].concentracion).toBe('250 cc/100L');
    expect(aplicacion.esMezcla()).toBe(false);
  });

  it('RF-M4-06: debe admitir mezclas (caldo) con múltiples insumos diferenciados', () => {
    const aplicacion = AplicacionAgricola.crear({
      ...payloadValido,
      id: crypto.randomUUID(),
      lineas: [
        {
          insumoId: crypto.randomUUID(),
          cantidadTotal: 4.0,
          unidadMedidaId: 'L',
          dosisPorSuperficie: 2.0,
          dosisPorPlanta: null,
          concentracion: '200 cc/100L',
        },
        {
          insumoId: crypto.randomUUID(),
          cantidadTotal: 10.0,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 5.0,
          dosisPorPlanta: 2.5,
          concentracion: '500 g/100L',
        },
      ],
    });

    expect(aplicacion.lineas).toHaveLength(2);
    expect(aplicacion.esMezcla()).toBe(true);
    expect(aplicacion.lineas[1].dosisPorPlanta).toBe(2.5);
  });

  it('RN-04: debe rechazar fechas de aplicación futuras respecto a la fecha actual', () => {
    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        fecha: '2026-10-20',
        fechaReferenciaHoy: hoyFijo,
      });
    }).toThrow(FechaFuturaInvalidaError);
  });

  it('RF-M4-03 / RF-M4-05: debe arrojar error si faltan actividadId, loteId o cicloId', () => {
    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        actividadId: '',
      });
    }).toThrow(AplicacionInvalidaError);

    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        loteId: '',
      });
    }).toThrow(AplicacionInvalidaError);

    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        cicloId: '',
      });
    }).toThrow(AplicacionInvalidaError);
  });

  it('RF-M4-11: debe requerir el equipo de aplicación utilizado', () => {
    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        equipoAplicacion: '',
      });
    }).toThrow(AplicacionInvalidaError);
  });

  it('RF-M4-04: debe requerir que la cantidad total de cada insumo sea mayor a cero', () => {
    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        lineas: [
          {
            insumoId: crypto.randomUUID(),
            cantidadTotal: 0,
            unidadMedidaId: 'L',
          },
        ],
      });
    }).toThrow(AplicacionInvalidaError);
  });

  it('RF-M4-12: debe validar que valores climáticos negativos sean rechazados', () => {
    expect(() => {
      AplicacionAgricola.crear({
        ...payloadValido,
        id: crypto.randomUUID(),
        condicionesClima: {
          vientoKmH: -5,
        },
      });
    }).toThrow(AplicacionInvalidaError);
  });

  it('debe reconstituir y serializar a JSON correctamente', () => {
    const aplicacion = AplicacionAgricola.crear(payloadValido);
    const json = aplicacion.toJSON();

    const reconstituida = AplicacionAgricola.reconstituir(json);
    expect(reconstituida.id).toBe(aplicacion.id);
    expect(reconstituida.lineas).toEqual(aplicacion.lineas);
    expect(reconstituida.condicionesClima).toEqual(aplicacion.condicionesClima);
  });
});
