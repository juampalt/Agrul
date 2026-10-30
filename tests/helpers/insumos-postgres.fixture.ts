import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { DatosInsumo } from '../../src/core/domain/entities/insumo.entity.js';
import { crearEsquemaPostgresAislado } from './esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba } from './operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from './sembrar-ciclos-rn09.js';

export const URL_INSUMOS = process.env.INSUMOS_TEST_DATABASE_URL === 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
  ? 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
  : 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055';
export class InsumosPostgresFixture {
  aislado!: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>>;
  servidor!: ReturnType<typeof crearServidorProduccion>;
  admin = { authorization: '' };
  encargado = { authorization: '' };
  sistema = { authorization: '' };
  adminId = randomUUID();
  encargadoId = randomUUID();
  sistemaId = randomUUID();
  readonly password = randomUUID() + 'aA1!';
  actividadId = '';
  direccion = '';
  get app() { return this.servidor.app; }
  get pool() { return this.aislado.connection.pool; }
  async preparar(url: string) {
    if (url !== URL_INSUMOS) throw new Error('Solo se permite la base exclusiva AGRUL-055 o la regresión autorizada AGRUL-056.');
    this.aislado = await crearEsquemaPostgresAislado(url);
    this.servidor = crearServidorProduccion({ connectionString: this.aislado.connectionString, logger: false });
    await this.app.ready();
    this.admin = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.adminId, nombre: 'Admin', apellido: 'Insumos', email: 'admin-055@example.test', password: this.password });
    this.encargado = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.encargadoId, nombre: 'Campo', apellido: 'Insumos', email: 'campo-055@example.test', perfil: 'ENCARGADO_CAMPO' });
    this.sistema = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.sistemaId, nombre: 'Sistema', apellido: 'Insumos', email: 'sistema-055@example.test', perfil: 'ADMIN_SISTEMA' });
    const cicloId = randomUUID();
    await sembrarCiclosRn09(this.pool, [cicloId]);
    await this.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_inicio_efectiva='2026-10-01' where id=$1", [cicloId]);
    const tipo = await this.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: this.admin,
      payload: { nombre: 'Fertilización CU34', categoria: 'FERTILIZACION', cultivoIds: ['b0000000-0000-4000-8000-000000000059'] } });
    expect(tipo.statusCode).toBe(201);
    const labor = await this.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: this.admin,
      payload: { origen: 'NO_PROGRAMADA', cicloId, tipoActividadId: tipo.json().data.id, responsableId: this.adminId,
        fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1, descripcionTrabajo: 'Labor de prueba' } });
    expect(labor.statusCode).toBe(201); this.actividadId = labor.json().data.id;
    this.direccion = await this.app.listen({ host: '127.0.0.1', port: 0 });
  }
  datos(codigo = randomUUID().slice(0, 15)): DatosInsumo {
    return { codigo, nombre: 'Fertilizante prueba', categoria: 'FERTILIZANTE' as const, unidadMedida: 'kg',
      tipoProducto: null, fabricanteMarca: null, nivelMinimo: 10.25 };
  }
  async crear(datos = this.datos()) {
    const res = await this.app.inject({ method: 'POST', url: '/api/v1/insumos', headers: this.admin, payload: datos });
    expect(res.statusCode).toBe(201); return res.json().data.id as string;
  }
  async partida(insumoId: string) {
    const { rows } = await this.pool.query<{ finca_id: string }>('select l.finca_id from actividades_realizadas a join lotes l on l.id=a.lote_id where a.id=$1', [this.actividadId]);
    const ingreso = await this.app.inject({ method: 'POST', url: '/api/v1/inventario/ingresos', headers: this.admin,
      payload: { operacionId: randomUUID(), fincaId: rows[0].finca_id, insumoId, fechaIngreso: '2026-10-01',
        cantidad: 10, unidadMedida: 'kg', proveedor: 'Proveedor de prueba', tipoMovimiento: 'INGRESO', motivo: 'Fixture' } });
    expect(ingreso.statusCode).toBe(201);
    return ingreso.json().data.partidaId as string;
  }
  async aplicacion() {
    const id = randomUUID();
    await this.pool.query(`insert into aplicaciones_insumo(id,actividad_realizada_id,superficie_tratada,metodo_aplicacion,motivo_aplicacion,responsable_id)
      values($1,$2,1,'Manual','Prueba RN-15',$3)`, [id, this.actividadId, this.adminId]);
    return id;
  }
  async aplicar(insumoId: string) {
    const partidaId = await this.partida(insumoId); const aplicacionId = await this.aplicacion();
    await this.pool.query(`insert into aplicaciones_insumo_items(aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis)
      values($1,$2,$3,1,1)`, [aplicacionId, insumoId, partidaId]);
    return { partidaId, aplicacionId };
  }
  async cerrar() {
    try { await this.servidor?.app.close(); } finally { await this.aislado?.cerrar(); }
  }
}
