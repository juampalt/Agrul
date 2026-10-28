import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { autenticarOperadorPrueba } from './operador-postgres.fixture.js';

export const USUARIO_CICLOS = { sub: 'a0000000-0000-4000-8000-000000000058', email: 'admin@example.test', nombre: 'Admin', apellido: 'Prueba', fincas: [] };
export const OPERADOR_CICLOS = { sub: 'a0000000-0000-4000-8000-000000000158', email: 'operador-ciclos@example.test', nombre: 'Admin', apellido: 'Prueba', fincas: [] };
export let HEADERS_CICLOS = { authorization: '' };
export const INEXISTENTE_CICLO = '00000000-0000-4000-8000-000000000058';

export class CiclosPostgresFixture {
  readonly conexion;
  servidor!: ReturnType<typeof crearServidorProduccion>;
  loteId = '';
  plantacionId = '';
  cultivoId = '';
  variedadId = '';
  constructor(readonly connectionString?: string) { this.conexion = createDatabaseConnection(connectionString); }
  get app() { return this.servidor.app; }
  get datos() { return { plantacionId: this.plantacionId, nombreCodigo: 'CICLO-2026-A', fechaInicioPrevista: '2026-10-10',
    fechaFinPrevista: '2026-10-27', responsableSeguimientoId: USUARIO_CICLOS.sub, observaciones: null }; }

  async preparar() {
    const { rows } = await this.conexion.pool.query<{ nombre: string }>('select current_database() as nombre');
    if (rows[0]?.nombre !== 'agrul_test_agrul_052_etapa4') throw new Error('Esta suite solo puede modificar agrul_test_agrul_052_etapa4.');
    await runMigrations(this.connectionString);
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
    this.loteId = await this.alta('/lotes-territorio', { codigo: 'LOT-2026-0058', nombre: 'Lote ciclos', superficieHa: 10 });
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
  async crear(nombreCodigo = 'CICLO-2026-A') { return this.alta('/ciclos-productivos', { ...this.datos, nombreCodigo }); }
  iniciar(id: string, fechaInicioEfectiva = '2026-10-10') {
    return this.app.inject({ method: 'PATCH', url: `/api/v1/ciclos-productivos/${id}/iniciar`, headers: HEADERS_CICLOS, payload: { fechaInicioEfectiva } });
  }
  finalizar(id: string, fechaFinEfectiva = '2026-10-27') {
    return this.app.inject({ method: 'PATCH', url: `/api/v1/ciclos-productivos/${id}/finalizar`, headers: HEADERS_CICLOS, payload: { fechaFinEfectiva } });
  }
  async estadoLote() { return (await this.conexion.pool.query('select estado_territorial from lotes where id=$1', [this.loteId])).rows[0].estado_territorial; }
  async cerrar() { await this.servidor?.app.close(); await this.conexion.pool.end(); }
}
