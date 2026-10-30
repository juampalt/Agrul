import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { RegistrarCosecha } from '../../src/core/domain/entities/cosecha-registrada.js';
import { JornadasPostgresFixture } from './cosechas-programadas-postgres.fixture.js';

export class CosechasRegistroFixture extends JornadasPostgresFixture {
  private pasada = 0;
  override async preparar(url: string) {
    await super.preparar(url);
    await this.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_inicio_efectiva='2026-10-01' where id=any($1::uuid[])", [[this.cicloId, this.otroCicloId]]);
  }
  datosCosecha(): RegistrarCosecha & { origen: 'NO_PROGRAMADA' } {
    return { operacionId: randomUUID(), origen: 'NO_PROGRAMADA', cicloId: this.cicloId,
      numeroPasada: ++this.pasada, fechaEfectiva: '2026-10-15', cantidadCosechadaKg: 10.25,
      sector: 'Norte real', responsableId: this.campoId, timestampCapturaLocal: '2026-10-15T10:30:00-03:00' };
  }
  async datosProgramada(): Promise<RegistrarCosecha & { origen: 'PROGRAMADA' }> {
    const jornada = await this.crear(); expect(jornada.statusCode).toBe(201);
    const { cicloId: _cicloId, ...pesaje } = this.datosCosecha();
    return { ...pesaje, origen: 'PROGRAMADA', cosechaProgramadaId: jornada.json().data.id, versionProgramacion: 1 };
  }
  registrar(payload: RegistrarCosecha = this.datosCosecha(), headers = this.campo) {
    return this.app.inject({ method: 'POST', url: '/api/v1/cosechas', headers, payload });
  }
}
