import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { DatosInsumo } from '../../src/core/domain/entities/insumo.entity.js';
import { crearEsquemaPostgresAislado } from './esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba } from './operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from './sembrar-ciclos-rn09.js';

export const URL_INSUMOS = 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055';
export class InsumosPostgresFixture {
  aislado!: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>>;
  servidor!: ReturnType<typeof crearServidorProduccion>;
  admin = { authorization: '' };
  encargado = { authorization: '' };
  sistema = { authorization: '' };
  adminId = randomUUID();
  encargadoId = randomUUID();
  sistemaId = randomUUID();
  actividadId = '';
  direccion = '';
  get app() { return this.servidor.app; }
  get pool() { return this.aislado.connection.pool; }
  async preparar(url: string) {
    if (url !== URL_INSUMOS) throw new Error('Solo se permite la base exclusiva AGRUL-055.');
    this.aislado = await crearEsquemaPostgresAislado(url);
    this.servidor = crearServidorProduccion({ connectionString: this.aislado.connectionString, logger: false });
    await this.app.ready();
    this.admin = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.adminId, nombre: 'Admin', apellido: 'Insumos', email: 'admin-055@example.test' });
    this.encargado = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.encargadoId, nombre: 'Campo', apellido: 'Insumos', email: 'campo-055@example.test', perfil: 'ENCARGADO_CAMPO' });
    this.sistema = await autenticarOperadorPrueba(this.pool, this.app,
      { sub: this.sistemaId, nombre: 'Sistema', apellido: 'Insumos', email: 'sistema-055@example.test', perfil: 'ADMIN_SISTEMA' });
    const cicloId = randomUUID();
    await sembrarCiclosRn09(this.pool, [cicloId]);
    await this.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_inicio_efectiva='2026-10-01' where id=$1", [cicloId]);
    const tipo = await this.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: this.admin,
      payload: { nombre: 'Fertilización CU34', categoria: 'FERTILIZACION' } });
    expect(tipo.statusCode).toBe(201);
    const labor = await this.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: this.admin,
      payload: { origen: 'NO_PROGRAMADA', cicloId, tipoActividadId: tipo.json().data.id, responsableId: this.adminId,
        fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1 } });
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
    const id = randomUUID();
    await this.pool.query(`insert into partidas_insumo(id,insumo_id,fecha_ingreso,cantidad_inicial,cantidad_disponible,proveedor)
      values($1,$2,'2026-10-01',10,10,'Proveedor de prueba')`, [id, insumoId]);
    return id;
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
