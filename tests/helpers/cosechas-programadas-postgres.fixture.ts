import { randomBytes, randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { crearEsquemaPostgresAislado } from './esquema-postgres-aislado.fixture.js';
import { sembrarCiclosRn09 } from './sembrar-ciclos-rn09.js';

export const URL_COSECHAS = 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056';
export const RUTA_JORNADAS = '/api/v1/cosechas-programadas';
export class JornadasPostgresFixture {
  aislado!: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>>;
  servidor!: ReturnType<typeof crearServidorProduccion>;
  cicloId = randomUUID();
  otroCicloId = randomUUID();
  fincaId = 'f0000000-0000-4000-8000-000000000059';
  otraFincaId = randomUUID();
  adminId = randomUUID();
  campoId = randomUUID();
  sinFincasId = randomUUID();
  operarioId = randomUUID();
  sistemaId = randomUUID();
  admin = { authorization: '' };
  campo = { authorization: '' };
  sinFincas = { authorization: '' };
  operario = { authorization: '' };
  sistema = { authorization: '' };
  readonly password = randomBytes(24).toString('base64url') + 'aA1';
  readonly email = `admin-${this.adminId}@example.test`;
  get app() { return this.servidor.app; }
  get pool() { return this.aislado.connection.pool; }
  get asignaciones() { return new DrizzleUsuarioFincasRepository(this.aislado.connection.db); }
  async preparar(url: string) {
    if (url !== URL_COSECHAS) throw new Error('Destino de pruebas AGRUL-056 no autorizado.');
    this.aislado = await crearEsquemaPostgresAislado(url);
    this.servidor = crearServidorProduccion({ connectionString: this.aislado.connectionString, logger: false });
    await this.app.ready();
    const perfiles = [
      [this.adminId, 'ADMINISTRADOR'], [this.campoId, 'ENCARGADO_CAMPO'],
      [this.sinFincasId, 'ENCARGADO_CAMPO'], [this.operarioId, 'OPERARIO'], [this.sistemaId, 'ADMIN_SISTEMA'],
    ];
    const headers = [];
    const { hash, salt } = CryptoAuthService.hashPassword(this.password);
    for (const [id, perfil] of perfiles) {
      const email = id === this.adminId ? this.email : `${id}@example.test`;
      await this.pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil,estado,debe_cambiar_password)
        values($1,'Prueba','Jornadas',$2,$3,$4,$5,'ACTIVO',false)`, [id, email, hash, salt, perfil]);
      const login = await this.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: this.password } });
      expect(login.statusCode).toBe(200);
      headers.push({ authorization: `Bearer ${login.json().data.token}` });
    }
    [this.admin, this.campo, this.sinFincas, this.operario, this.sistema] = headers;
    await sembrarCiclosRn09(this.pool, [this.cicloId, this.otroCicloId]);
    const loteId = randomUUID(), plantacionId = randomUUID();
    await this.pool.query("insert into fincas(id,nombre,localidad,departamento,provincia,superficie_total_ha) values($1,'Otra finca 056','San Pablo','Lules','Tucumán',10)", [this.otraFincaId]);
    await this.pool.query("insert into lotes(id,codigo_lote,producto,unidad_medida,finca_id,superficie_ha) values($1,$2,'Fruta','HA',$3,10)", [loteId, `J-${loteId}`, this.otraFincaId]);
    await this.pool.query(`insert into plantaciones(id,lote_id,cultivo_id,variedad_id,fecha_plantacion,superficie_ha,cantidad_inicial_plantas)
      select $1,$2,cultivo_id,variedad_id,'2026-10-01',10,100 from plantaciones limit 1`, [plantacionId, loteId]);
    await this.pool.query('update ciclos_productivos set plantacion_id=$1 where id=$2', [plantacionId, this.otroCicloId]);
    await this.asignaciones.asignarFincas(this.campoId, [this.fincaId]);
  }
  datos() {
    return { operacionId: randomUUID(), cicloId: this.cicloId, responsableId: this.campoId,
      fechaPrevista: '2026-11-15', sector: 'Norte', cantidadEstimadaKg: 100.25 };
  }
  crear(payload = this.datos(), headers = this.campo) {
    return this.app.inject({ method: 'POST', url: RUTA_JORNADAS, headers, payload });
  }
  async cerrar() {
    try { await this.servidor?.app.close(); } finally { await this.aislado?.cerrar(); }
  }
}
