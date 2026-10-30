import { describe, expect, it } from 'vitest';
import { RegistrarCamara, RegistrarDestinoProduccion, RegistrarMovimientoAlmacenamiento,
  validarCamara, validarDestinoProduccion, validarMovimientoAlmacenamiento } from '../../../src/core/domain/entities/almacenamiento-produccion.js';

const hoy = new Date('2026-10-30T12:00:00Z');
const camara: RegistrarCamara = { operacionId: 'operacion', fincaId: 'finca', nombre: ' Frío ', descripcion: null, temperaturaObjetivoC: null };
const movimiento: RegistrarMovimientoAlmacenamiento = { operacionId: 'operacion', partidaProduccionId: 'partida', camaraSectorId: 'camara',
  tipoMovimiento: 'INGRESO', cantidadKg: 0.29, fechaMovimiento: '2026-10-17', responsableId: 'responsable' };
const destino: RegistrarDestinoProduccion = { operacionId: 'operacion', partidaProduccionId: 'partida', fechaDestino: '2026-10-19',
  tipoDestino: 'OTRO', destinoEspecifico: ' Donación ', cantidadDestinadaKg: 0.29, responsableId: 'responsable' };
describe('Almacenamiento y destinos: cantidades y contratos de dominio', () => {
  it('conserva temperatura desconocida distinta de cero y normaliza el nombre', () => {
    expect(validarCamara(camara)).toEqual({ ...camara, nombre: 'Frío' });
    expect(validarCamara({ ...camara, temperaturaObjetivoC: 0 }).temperaturaObjetivoC).toBe(0);
  });
  it.each([-999.99, -1.25, 0, 2.5, 999.99])('conserva temperatura representable %s', temperaturaObjetivoC => {
    expect(validarCamara({ ...camara, temperaturaObjetivoC }).temperaturaObjetivoC).toBe(temperaturaObjetivoC);
  });
  it.each([0.001, 1000, Infinity, NaN])('rechaza temperatura no representable %s', temperaturaObjetivoC => {
    expect(() => validarCamara({ ...camara, temperaturaObjetivoC })).toThrow();
  });
  it.each([0, -1, 0.001, 0.1 + 0.2, 100000000, Infinity])('rechaza %s kg tanto en movimiento como en destino', cantidad => {
    expect(() => validarMovimientoAlmacenamiento({ ...movimiento, cantidadKg: cantidad }, hoy)).toThrow();
    expect(() => validarDestinoProduccion({ ...destino, cantidadDestinadaKg: cantidad }, hoy)).toThrow();
  });
  it.each([0.01, 0.29, 99999999.99])('conserva exactamente %s kg', cantidad => {
    expect(validarMovimientoAlmacenamiento({ ...movimiento, cantidadKg: cantidad }, hoy).cantidadKg).toBe(cantidad);
    expect(validarDestinoProduccion({ ...destino, cantidadDestinadaKg: cantidad }, hoy).cantidadDestinadaKg).toBe(cantidad);
  });
  it.each(['2026-02-30', '9999-01-01'])('rechaza fecha inválida o futura %s', fecha => {
    expect(() => validarMovimientoAlmacenamiento({ ...movimiento, fechaMovimiento: fecha }, hoy)).toThrow();
    expect(() => validarDestinoProduccion({ ...destino, fechaDestino: fecha }, hoy)).toThrow();
  });
  it('requiere partida, cámara, destinatario y responsable sin completar datos desconocidos', () => {
    expect(() => validarMovimientoAlmacenamiento({ ...movimiento, camaraSectorId: '' }, hoy)).toThrow();
    expect(() => validarDestinoProduccion({ ...destino, destinoEspecifico: ' ' }, hoy)).toThrow();
    expect(() => validarDestinoProduccion({ ...destino, responsableId: '' }, hoy)).toThrow();
    expect(validarDestinoProduccion(destino, hoy).destinoEspecifico).toBe('Donación');
  });
});
