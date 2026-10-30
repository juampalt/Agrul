import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from './esquema-postgres-aislado.fixture.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { autenticarOperadorPrueba } from './operador-postgres.fixture.js';

export const USUARIO_CICLOS = { sub: 'a0000000-0000-4000-8000-000000000058', email: 'admin@example.test', nombre: 'Admin', apellido: 'Prueba', fincas: [] };
export const OPERADOR_CICLOS = { sub: 'a0000000-0000-4000-8000-000000000158', email: 'operador-ciclos@example.test', nombre: 'Admin', apellido: 'Prueba', fincas: [] };
export let HEADERS_CICLOS = { authorization: '' };
export const INEXISTENTE_CICLO = '00000000-0000-4000-8000-000000000058';

export class CiclosPostgresFixture {
  conexion!: ReturnType<typeof createDatabaseConnection>;
  private aislado?: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>>;
  private estadoPublico: unknown;
  connectionString = '';
  servidor!: ReturnType<typeof crearServidorProduccion>;
  loteId = '';
  plantacionId = '';
  cultivoId = '';
  variedadId = '';
  constructor(private readonly urlBase?: string) {}
  get app() { return this.servidor.app; }
  get datos() { return { plantacionId: this.plantacionId, nombreCodigo: 'CICLO-2026-A', fechaInicioPrevista: '2026-10-10',
    fechaFinPrevista: '2026-10-27', responsableSeguimientoId: USUARIO_CICLOS.sub, observaciones: null }; }

  async preparar() {
    if (!this.urlBase) throw new Error('Se requiere conexión explícita.');
    this.aislado = await crearEsquemaPostgresAislado(this.urlBase);
    this.conexion = this.aislado.connection;
    this.connectionString = this.aislado.connectionString;
    this.estadoPublico = await this.snapshotPublico();
    await this.conexion.pool.query("insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil) values ($1,'Responsable','Prueba','responsable-ciclos@example.test','hash-exclusivo-fixture','salt-fixture','ENCARGADO') on conflict (id) do update set estado='ACTIVO'", [USUARIO_CICLOS.sub]);
    this.servidor = crearServidorProduccion({ connectionString: this.connectionString, logger: false });
    await this.app.ready();
    HEADERS_CICLOS = await autenticarOperadorPrueba(this.conexion.pool, this.app, OPERADOR_CICLOS);
  }
  async sembrar() {
    await this.conexion.pool.query("update usuarios set estado='ACTIVO' where id=$1", [USUARIO_CICLOS.sub]);
    for (const tabla of ['actividades_programadas', 'ciclos_productivos', 'plantaciones', 'variedades', 'cultivos', 'lotes', 'fincas']) {
      await this.conexion.pool.query(`delete from ${tabla}`);
    }
    await new DrizzleFincasRepository(this.conexion.db).guardar(Finca.crear({ id: INEXISTENTE_CICLO, nombre: 'Finca ciclos',
      provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 100 }));
    this.loteId = await this.alta('/lotes-territorio', { codigo: 'LOT-2026-0058', nombre: 'Lote ciclos', superficieHa: 10, ubicacionSector: 'Norte' });
    this.cultivoId = await this.alta('/cultivos', { nombre: 'Arándano', tipoCicloVida: 'PERENNE' });
    this.variedadId = await this.alta('/variedades', { cultivoId: this.cultivoId, nombre: 'Emerald' });
    this.plantacionId = await this.alta('/plantaciones', { loteId: this.loteId, cultivoId: this.cultivoId, variedadId: this.variedadId,
      fechaPlantacion: '2026-10-01', superficieHa: 10, cantidadInicialPlantas: 100 });
  }
  async alta(ruta: string, payload: object) {
    const respuesta = await this.app.inject({ method: 'POST', url: `/api/v1${ruta}`, headers: HEADERS_CICLOS, payload });
    expect(respuesta.statusCode).toBe(201);
    return respuesta.json<{ data: { id: string } }>().data.id;
  }
  async crear(nombreCodigo = 'CICLO-2026-A', periodo: Partial<{ fechaInicioPrevista: string; fechaFinPrevista: string; plantacionId: string }> = {}) {
    return this.alta('/ciclos-productivos', { ...this.datos, nombreCodigo, ...periodo });
  }
  /** Amplía el lote y registra otra plantación activa en él, para tener dos ciclos activos en un mismo lote. */
  async segundaPlantacion() {
    const ampliado = await this.app.inject({ method: 'PUT', url: `/api/v1/lotes-territorio/${this.loteId}`, headers: HEADERS_CICLOS,
      payload: { nombre: 'Lote ciclos', superficieHa: 20, ubicacionSector: 'Norte' } });
    expect(ampliado.statusCode).toBe(200);
    return this.alta('/plantaciones', { loteId: this.loteId, cultivoId: this.cultivoId, variedadId: this.variedadId,
      fechaPlantacion: '2026-10-01', superficieHa: 5, cantidadInicialPlantas: 50 });
  }
  iniciar(id: string, fechaInicioEfectiva = '2026-10-10') {
    return this.app.inject({ method: 'PATCH', url: `/api/v1/ciclos-productivos/${id}/iniciar`, headers: HEADERS_CICLOS, payload: { fechaInicioEfectiva } });
  }
  finalizar(id: string, fechaFinEfectiva = '2026-10-27') {
    return this.app.inject({ method: 'PATCH', url: `/api/v1/ciclos-productivos/${id}/finalizar`, headers: HEADERS_CICLOS, payload: { fechaFinEfectiva } });
  }
  async estadoLote() { return (await this.conexion.pool.query('select estado_territorial from lotes where id=$1', [this.loteId])).rows[0].estado_territorial; }
  private async snapshotPublico() {
    const estados = [];
    for (const tabla of ['actividades_programadas', 'ciclos_productivos', 'plantaciones', 'variedades', 'cultivos', 'lotes', 'fincas']) {
      estados.push((await this.conexion.pool.query(`select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) as estado from public.${tabla} t`)).rows);
    }
    return estados;
  }
  async restaurarOperador() {
    await this.conexion.pool.query("update usuarios set perfil='ADMINISTRADOR',debe_cambiar_password=false where id=$1", [OPERADOR_CICLOS.sub]);
    HEADERS_CICLOS = await autenticarOperadorPrueba(this.conexion.pool, this.app, OPERADOR_CICLOS);
  }
  async cerrar() {
    try {
      await this.servidor?.app.close();
      if (this.aislado) expect(await this.snapshotPublico()).toEqual(this.estadoPublico);
    } finally { await this.aislado?.cerrar(); }
  }
}
