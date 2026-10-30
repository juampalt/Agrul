import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { RegistrarAplicacionInsumos } from '../../src/core/domain/entities/aplicacion-insumos.js';
import { InventarioPostgresFixture } from './inventario-postgres.fixture.js';

export class AplicacionesInsumosPostgresFixture extends InventarioPostgresFixture {
  datosAplicacion(insumoId: string, cambios: Partial<RegistrarAplicacionInsumos> = {}): RegistrarAplicacionInsumos {
    return { operacionId: randomUUID(), actividadRealizadaId: this.actividadId, superficieTratada: 1,
      metodoAplicacion: 'Manual', motivoAplicacion: 'Fertilización', observaciones: null,
      items: [{ insumoId, cantidad: 1, unidadMedida: 'kg', dosis: 1 }], ...cambios };
  }
  registrarAplicacion(payload: RegistrarAplicacionInsumos, headers = this.encargado) {
    return this.app.inject({ method: 'POST', url: '/api/v1/aplicaciones-insumos', headers, payload });
  }
  consultarAplicaciones(ruta = '', headers = this.encargado) {
    return this.app.inject({ method: 'GET', url: `/api/v1/aplicaciones-insumos${ruta}`, headers });
  }
  async conteos(aplicacionId: string) {
    return (await this.pool.query(`select
      (select count(*)::int from aplicaciones_insumo where id=$1) as aplicaciones,
      (select count(*)::int from aplicaciones_insumo_items where aplicacion_id=$1) as items,
      (select count(*)::int from movimientos_inventario where aplicacion_item_id in (select id from aplicaciones_insumo_items where aplicacion_id=$1)) as movimientos,
      (select count(*)::int from eventos_trazabilidad where payload_especifico->>'aplicacionId'=$1::text) as eventos`, [aplicacionId])).rows[0];
  }
  async crearLaborAjena() {
    const lote = randomUUID(); const plantacion = randomUUID(); const ciclo = randomUUID();
    await this.pool.query(`insert into lotes(id,codigo_lote,producto,unidad_medida,finca_id,superficie_ha)
      values($1,$2,'Prueba autorización','HA',$3,1)`, [lote, `AJENA-${lote}`, this.otraFincaId]);
    await this.pool.query(`insert into plantaciones(id,lote_id,cultivo_id,variedad_id,fecha_plantacion,superficie_ha,cantidad_inicial_plantas)
      select $1,$2,p.cultivo_id,p.variedad_id,'2026-10-01',1,100 from plantaciones p
      join ciclos_productivos c on c.plantacion_id=p.id join actividades_realizadas a on a.ciclo_id=c.id where a.id=$3`,
    [plantacion, lote, this.actividadId]);
    await this.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado)
      values($1,$2,$3,'2026-10-01','2026-10-27','2026-10-01',$4,'ACTIVO')`, [ciclo, plantacion, `APP-${ciclo.slice(0, 20)}`, this.adminId]);
    const { rows } = await this.pool.query<{ tipo_actividad_id: string }>('select tipo_actividad_id from actividades_realizadas where id=$1', [this.actividadId]);
    const res = await this.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: this.admin,
      payload: { origen: 'NO_PROGRAMADA', cicloId: ciclo, tipoActividadId: rows[0].tipo_actividad_id,
        responsableId: this.adminId, fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1 } });
    expect(res.statusCode).toBe(201); return res.json().data.id as string;
  }
}
