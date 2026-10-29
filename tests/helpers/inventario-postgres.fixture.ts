import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { IngresoInsumos, MovimientoManual } from '../../src/core/domain/entities/inventario-insumos.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { InsumosPostgresFixture } from './insumos-postgres.fixture.js';
import { autenticarOperadorPrueba } from './operador-postgres.fixture.js';

export class InventarioPostgresFixture extends InsumosPostgresFixture {
  fincaId = '';
  otraFincaId = randomUUID();
  sinAsignaciones = { authorization: '' };
  async preparar(url: string) {
    await super.preparar(url);
    this.fincaId = (await this.pool.query<{ finca_id: string }>('select l.finca_id from actividades_realizadas a join lotes l on l.id=a.lote_id where a.id=$1', [this.actividadId])).rows[0].finca_id;
    await this.pool.query(`insert into fincas(id,nombre,localidad,departamento,provincia,superficie_total_ha)
      values($1,'Finca no autorizada','San Pablo','Lules','Tucumán',10)`, [this.otraFincaId]);
    await new DrizzleUsuarioFincasRepository(this.aislado.connection.db).asignarFincas(this.encargadoId, [this.fincaId]);
    this.sinAsignaciones = await autenticarOperadorPrueba(this.pool, this.app, { sub: randomUUID(), nombre: 'Sin', apellido: 'Asignaciones',
      email: 'sin-asignaciones-055@example.test', perfil: 'ENCARGADO_CAMPO' });
  }
  ingresoDatos(insumoId: string, cambios: Partial<IngresoInsumos> = {}): IngresoInsumos {
    return { operacionId: randomUUID(), fincaId: this.fincaId, insumoId, cantidad: 10, unidadMedida: 'kg',
      fechaIngreso: '2026-10-01', fechaVencimiento: null, proveedor: 'Proveedor', motivo: 'Compra', tipoMovimiento: 'INGRESO', ...cambios };
  }
  ingresar(payload: IngresoInsumos, headers = this.encargado) {
    return this.app.inject({ method: 'POST', url: '/api/v1/inventario/ingresos', headers, payload });
  }
  mover(partidaId: string, cambios: Partial<MovimientoManual> = {}, headers = this.encargado) {
    return this.app.inject({ method: 'POST', url: '/api/v1/inventario/movimientos', headers,
      payload: { operacionId: randomUUID(), partidaId, cantidad: 1, unidadMedida: 'kg', tipoMovimiento: 'PERDIDA',
        fechaMovimiento: '2026-10-20', motivo: 'Pérdida registrada', ...cambios } });
  }
  async alta(cambios: Partial<IngresoInsumos> = {}) {
    const insumoId = cambios.insumoId ?? await this.crear();
    const payload = this.ingresoDatos(insumoId, cambios); const res = await this.ingresar(payload, this.admin);
    expect(res.statusCode).toBe(201);
    return { insumoId, partidaId: res.json().data.partidaId as string, movimientoId: res.json().data.id as string, payload };
  }
  consultar(ruta: string, headers = this.encargado) {
    return this.app.inject({ method: 'GET', url: `/api/v1/inventario/${ruta}`, headers });
  }
  async saldo(partidaId: string) {
    const { rows } = await this.pool.query<{ cantidad_disponible: string }>('select cantidad_disponible from partidas_insumo where id=$1', [partidaId]);
    return rows[0].cantidad_disponible;
  }
}
