import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { CorregirAplicacionInsumos } from '../../src/core/domain/entities/correccion-aplicacion-insumos.js';
import { AplicacionInsumos } from '../../src/core/ports/aplicaciones-insumos-repository.port.js';
import { AplicacionesInsumosPostgresFixture } from './aplicaciones-insumos-postgres.fixture.js';

export class CorreccionesAplicacionesPostgresFixture extends AplicacionesInsumosPostgresFixture {
  datosCorreccion(insumoId: string, cantidad = 1, cambios: Partial<CorregirAplicacionInsumos> = {}): CorregirAplicacionInsumos {
    const { operacionId: _registro, ...nuevaAplicacion } = this.datosAplicacion(insumoId,
      { items: [{ insumoId, cantidad, unidadMedida: 'kg', dosis: cantidad }] });
    return { operacionId: randomUUID(), motivoCorreccion: 'Rectificación verificada de cantidad', nuevaAplicacion, ...cambios };
  }
  corregir(id: string, payload: CorregirAplicacionInsumos, headers = this.encargado) {
    return this.app.inject({ method: 'POST', url: `/api/v1/aplicaciones-insumos/${id}/correcciones`, headers, payload });
  }
  async original(cantidad = 4, stock = 10) {
    const alta = await this.alta({ cantidad: stock });
    const datos = this.datosAplicacion(alta.insumoId, { items: [{ insumoId: alta.insumoId, cantidad, unidadMedida: 'kg', dosis: cantidad }] });
    const res = await this.registrarAplicacion(datos); expect(res.statusCode).toBe(201);
    return { ...alta, aplicacion: res.json<{ data: AplicacionInsumos }>().data };
  }
  async hechos(id: string) {
    return (await this.pool.query(`select
      (select to_jsonb(a) from aplicaciones_insumo a where a.id=$1) as aplicacion,
      (select jsonb_agg(to_jsonb(i) order by i.id) from aplicaciones_insumo_items i where i.aplicacion_id=$1) as items,
      (select jsonb_agg(to_jsonb(m) order by m.id) from movimientos_inventario m where m.aplicacion_item_id in
        (select id from aplicaciones_insumo_items where aplicacion_id=$1)) as movimientos,
      (select jsonb_agg(to_jsonb(e) order by e.id) from eventos_trazabilidad e where e.payload_especifico->>'aplicacionId'=$1::text) as eventos`, [id])).rows;
  }
}
