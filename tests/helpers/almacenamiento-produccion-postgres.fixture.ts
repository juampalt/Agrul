import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { CamaraProduccion, RegistrarCamara, RegistrarDestinoProduccion, RegistrarMovimientoAlmacenamiento } from '../../src/core/domain/entities/almacenamiento-produccion.js';
import { PartidaProduccion } from '../../src/core/domain/entities/poscosecha.js';
import { PoscosechaFixture } from './poscosecha-postgres.fixture.js';

export class AlmacenamientoProduccionFixture extends PoscosechaFixture {
  datosCamara(fincaId = this.fincaId): RegistrarCamara {
    return { operacionId: randomUUID(), fincaId, nombre: `C-${randomUUID()}`, descripcion: null, temperaturaObjetivoC: 2.5 };
  }
  registrarCamara(datos = this.datosCamara(), headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/almacenamiento/camaras', headers, payload: datos });
  }
  async camara(fincaId = this.fincaId, headers = this.campo) {
    const res = await this.registrarCamara(this.datosCamara(fincaId), headers); expect(res.statusCode).toBe(201);
    return res.json<{ data: CamaraProduccion }>().data.id;
  }
  datosMovimiento(partidaProduccionId: string, camaraSectorId: string, cantidadKg = 3, tipoMovimiento: 'INGRESO' | 'SALIDA' = 'INGRESO'): RegistrarMovimientoAlmacenamiento {
    const fechaMovimiento = tipoMovimiento === 'INGRESO' ? '2026-10-17' : '2026-10-18';
    return { operacionId: randomUUID(), partidaProduccionId, camaraSectorId, tipoMovimiento, cantidadKg, fechaMovimiento,
      responsableId: this.campoId, timestampCapturaLocal: `${fechaMovimiento}T10:00:00-03:00` };
  }
  mover(datos: RegistrarMovimientoAlmacenamiento, headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/almacenamiento/movimientos', headers, payload: datos });
  }
  datosDestino(partidaProduccionId: string, cantidadDestinadaKg = 3): RegistrarDestinoProduccion {
    return { operacionId: randomUUID(), partidaProduccionId, fechaDestino: '2026-10-19', tipoDestino: 'MERCADO_FRESCO',
      destinoEspecifico: 'Mercado de prueba', cantidadDestinadaKg, responsableId: this.campoId, timestampCapturaLocal: '2026-10-19T10:00:00-03:00' };
  }
  destinar(datos: RegistrarDestinoProduccion, headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/destinos-produccion', headers, payload: datos });
  }
  async estadoPartida(id: string) {
    const res = await this.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion/${id}`, headers: this.campo });
    expect(res.statusCode).toBe(200); return res.json<{ data: PartidaProduccion }>().data;
  }
}
