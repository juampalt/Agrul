import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { ClasificacionProduccion, RegistrarAcondicionamiento, RegistrarClasificacion } from '../../src/core/domain/entities/poscosecha.js';
import { CosechaRegistrada } from '../../src/core/domain/entities/cosecha-registrada.js';
import { CosechasRegistroFixture } from './cosechas-registro-postgres.fixture.js';

export class PoscosechaFixture extends CosechasRegistroFixture {
  async cosecha(cantidad = 10) {
    const res = await this.registrar({ ...this.datosCosecha(), cantidadCosechadaKg: cantidad });
    expect(res.statusCode).toBe(201); return res.json<{ data: CosechaRegistrada }>().data.id;
  }
  datosClasificacion(cosechaId: string): RegistrarClasificacion {
    return { operacionId: randomUUID(), cosechaId, fechaClasificacion: '2026-10-16', cantidadRecibidaKg: 10,
      kgFresco: 6, kgIndustria: 3, kgDescarte: 1, motivosDescarte: ['Daño de fruta'], responsableId: this.campoId,
      timestampCapturaLocal: '2026-10-16T11:00:00-03:00' };
  }
  clasificar(datos: RegistrarClasificacion, headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/clasificaciones', headers, payload: datos });
  }
  async partida(cantidad = 10) {
    const cosechaId = await this.cosecha(cantidad);
    const res = await this.clasificar({ ...this.datosClasificacion(cosechaId), cantidadRecibidaKg: cantidad,
      kgFresco: cantidad, kgIndustria: 0, kgDescarte: 0, motivosDescarte: [] });
    expect(res.statusCode).toBe(201);
    return res.json<{ data: ClasificacionProduccion }>().data.partidas[0].id;
  }
  datosAcondicionamiento(partidaProduccionId: string, cantidadKg = 3): RegistrarAcondicionamiento {
    return { operacionId: randomUUID(), partidaProduccionId, fechaAcondicionamiento: '2026-10-17',
      tipoAcondicionamiento: 'Empaque manual', tipoEnvase: 'Bandeja', cantidadKg, cantidadEnvases: 2,
      responsableId: this.campoId, timestampCapturaLocal: '2026-10-17T09:00:00-03:00' };
  }
  acondicionar(datos: RegistrarAcondicionamiento, headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/acondicionamientos', headers, payload: datos });
  }
}
