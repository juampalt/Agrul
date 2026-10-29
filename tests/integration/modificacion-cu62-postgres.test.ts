import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { UsuariosCu62Fixture, FINCA_CU62, INEXISTENTE_CU62, SISTEMA_CU62, USUARIO_CU62 } from '../helpers/usuarios-cu62.fixture.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;

describe.skipIf(!connectionString)('AGRUL-053 CU62: modificación y auditoría transaccionales en PostgreSQL', () => {
  const f = new UsuariosCu62Fixture(connectionString);
  beforeEach(async () => { await f.preparar(); await f.sembrar(); }, 60000);
  afterEach(async () => { await f.cerrar(); });

  it('persiste los datos, rol, estado y fincas junto con los deltas, fecha y responsable real', async () => {
    const res = await f.modificar({ nombre: ' Ana María ', apellido: ' Pérez ', nombreUsuario: ' ANA.NUEVA ',
      email: ' ANA.NUEVA@EXAMPLE.TEST ', perfil: 'ADMINISTRADOR', estado: 'INACTIVO', fincaIds: [FINCA_CU62] });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ nombre: 'Ana María', apellido: 'Pérez', nombreUsuario: 'ana.nueva',
      email: 'ana.nueva@example.test', perfil: 'ADMINISTRADOR', estado: 'INACTIVO', fincasAsignadas: [FINCA_CU62] });
    const { rows } = await f.cambios();
    expect(rows).toHaveLength(7);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ dato_modificado: 'nombre', valor_anterior: 'Ana', valor_nuevo: 'Ana María' }),
      expect.objectContaining({ dato_modificado: 'perfil', valor_anterior: 'ENCARGADO_CAMPO', valor_nuevo: 'ADMINISTRADOR' }),
      expect.objectContaining({ dato_modificado: 'fincas', valor_anterior: [], valor_nuevo: [FINCA_CU62] }),
    ]));
    for (const delta of rows) {
      expect(delta.usuario_id).toBe(SISTEMA_CU62);
      expect(delta.usuario_afectado_id).toBe(USUARIO_CU62);
      expect(delta.fecha_hora).toBeInstanceOf(Date);
    }
    const consulta = await f.app.inject({ url: `/api/v1/auditoria?entidadId=${USUARIO_CU62}&accion=EDITAR`,
      headers: { authorization: `Bearer ${f.token}` } });
    expect(consulta.statusCode).toBe(200);
    const logs = consulta.json().data.logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ usuarioId: SISTEMA_CU62, entidadId: USUARIO_CU62,
      valorPrevioJson: { email: 'ana@example.test' }, valorNuevoJson: { email: 'ana.nueva@example.test' } });
    expect(JSON.stringify(logs)).not.toContain(f.password);
    expect(JSON.stringify(logs)).not.toContain(f.hash);
    expect(JSON.stringify(logs)).not.toContain('salt');
    const detalle = await f.app.inject({ url: `/api/v1/auditoria/${logs[0].id}`, headers: { authorization: `Bearer ${f.token}` } });
    expect(detalle.statusCode).toBe(200);
    expect(detalle.headers['cache-control']).toBe('no-store');
  });

  it('conserva las asignaciones y el historial al abrir otra instancia y desasigna sin borrar el vínculo', async () => {
    expect((await f.modificar({ fincaIds: [FINCA_CU62, FINCA_CU62] })).statusCode).toBe(200);
    const otra = crearServidorProduccion({ connectionString: f.connectionString, logger: false });
    try {
      const res = await otra.app.inject({ url: `/api/v1/usuarios/${USUARIO_CU62}`, headers: { authorization: `Bearer ${f.token}` } });
      expect(res.json().data.fincasAsignadas).toEqual([FINCA_CU62]);
      const historial = await otra.app.inject({ url: `/api/v1/auditoria?entidadId=${USUARIO_CU62}`, headers: { authorization: `Bearer ${f.token}` } });
      expect(historial.json().data.total).toBe(1);
    } finally { await otra.app.close(); }
    expect((await f.modificar({ fincaIds: [] })).statusCode).toBe(200);
    const { rows } = await f.conexion.pool.query('select activo from usuario_finca_asignacion where usuario_id=$1', [USUARIO_CU62]);
    expect(rows).toEqual([{ activo: false }]);
  });

  it('revierte usuario, asignaciones, bitácora y deltas si falla la escritura del historial', async () => {
    await f.conexion.pool.query(`CREATE FUNCTION cu62_fallar_delta() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'fallo-controlado-cu62'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER cu62_fallo BEFORE INSERT ON registro_modificaciones FOR EACH ROW EXECUTE FUNCTION cu62_fallar_delta();`);
    try {
      const res = await f.modificar({ nombre: 'No guardar', fincaIds: [FINCA_CU62] });
      expect(res.statusCode).toBe(500);
      expect(res.body).not.toContain('fallo-controlado-cu62');
      expect((await f.repo.buscarPorId(USUARIO_CU62))?.nombre).toBe('Ana');
      expect((await f.cambios()).rows).toEqual([]);
      expect(await f.cantidadLogs()).toBe(0);
      expect((await f.conexion.pool.query('select * from usuario_finca_asignacion')).rows).toEqual([]);
    } finally { await f.conexion.pool.query('DROP TRIGGER cu62_fallo ON registro_modificaciones; DROP FUNCTION cu62_fallar_delta();'); }
  });

  it('revierte el alta y su auditoría si la asignación de finca no puede completarse', async () => {
    const res = await f.app.inject({ method: 'POST', url: '/api/v1/usuarios', headers: { authorization: `Bearer ${f.token}` },
      payload: { nombre: 'Nuevo', apellido: 'Usuario', nombreUsuario: 'nuevo', email: 'nuevo@example.test',
        password: f.password, perfil: 'ENCARGADO_CAMPO', fincaIds: [INEXISTENTE_CU62] } });
    expect(res.statusCode).toBe(404);
    expect(await f.repo.buscarPorNombreUsuario('nuevo')).toBeNull();
    expect((await f.conexion.pool.query("select * from auditoria_seguridad_log where accion='CREAR'")).rows).toEqual([]);
  });

  it.each([
    'UPDATE auditoria_seguridad_log SET accion=accion', 'DELETE FROM auditoria_seguridad_log', 'TRUNCATE auditoria_seguridad_log',
    'UPDATE registro_modificaciones SET dato_modificado=dato_modificado', 'DELETE FROM registro_modificaciones', 'TRUNCATE registro_modificaciones',
  ])('el motor impide mutar el historial: %s', async consulta => {
    expect((await f.modificar({ nombre: 'Auditado' })).statusCode).toBe(200);
    await expect(f.conexion.pool.query(consulta)).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    expect((await f.cambios()).rows).toHaveLength(1);
    expect(await f.cantidadLogs()).toBe(1);
  });

  it('serializa modificaciones concurrentes y conserva la secuencia real de valores previos', async () => {
    const respuestas = await Promise.all([f.modificar({ nombre: 'Primero' }), f.modificar({ nombre: 'Segundo' })]);
    expect(respuestas.map(res => res.statusCode)).toEqual([200, 200]);
    const { rows } = await f.cambios();
    expect(rows).toHaveLength(2);
    const inicial = rows.find(delta => delta.valor_anterior === 'Ana')!;
    const siguiente = rows.find(delta => delta !== inicial)!;
    expect(siguiente.valor_anterior).toBe(inicial.valor_nuevo);
    expect((await f.repo.buscarPorId(USUARIO_CU62))?.nombre).toBe(siguiente.valor_nuevo);
  });

  it('evita deltas ficticios cuando el contenido no cambia', async () => {
    expect((await f.modificar({ nombre: ' Ana ', fincaIds: [] })).statusCode).toBe(200);
    expect((await f.cambios()).rows).toEqual([]);
    expect(await f.cantidadLogs()).toBe(0);
  });

  it.each([{ nombreUsuario: ' SISTEMA ' }, { email: ' SISTEMA@EXAMPLE.TEST ' }])('rechaza duplicados sin cambios parciales: %j', async cambio => {
    expect((await f.modificar({ nombre: 'No guardar', ...cambio })).statusCode).toBe(409);
    expect((await f.repo.buscarPorId(USUARIO_CU62))?.nombre).toBe('Ana');
    expect((await f.cambios()).rows).toEqual([]);
  });

  it.each(['ADMINISTRADOR', 'ENCARGADO_CAMPO', 'ENCARGADO', 'OPERARIO', 'ASESOR_AGRONOMO'])(
    'rechaza la administración de cuentas por %s', async perfil => {
      await f.conexion.pool.query('update usuarios set perfil=$1 where id=$2', [perfil, SISTEMA_CU62]);
      const token = await f.login();
      expect((await f.modificar({ nombre: 'No guardar' }, USUARIO_CU62, token)).statusCode).toBe(403);
      for (const accion of ['bloquear', 'desbloquear']) {
        expect((await f.app.inject({ method: 'POST', url: `/api/v1/usuarios/${USUARIO_CU62}/${accion}`,
          headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(403);
      }
      expect((await f.cambios()).rows).toEqual([]);
    });

  it.each(["estado='INACTIVO'", "estado='BLOQUEADO'", "perfil='ADMINISTRADOR'", 'debe_cambiar_password=true'])(
    'revalida al responsable dentro de la transacción con un JWT anterior: %s', async cambio => {
      await f.conexion.pool.query(`update usuarios set ${cambio} where id=$1`, [SISTEMA_CU62]);
      expect((await f.modificar({ nombre: 'No guardar' })).statusCode).toBe(403);
      expect((await f.repo.buscarPorId(USUARIO_CU62))?.nombre).toBe('Ana');
      expect((await f.cambios()).rows).toEqual([]);
    });

  it('exige autenticación y devuelve 404 para un usuario inexistente solo después de autorizar', async () => {
    expect((await f.modificar({ nombre: 'Cambio' }, USUARIO_CU62, null)).statusCode).toBe(401);
    expect((await f.modificar({ nombre: 'Cambio' }, INEXISTENTE_CU62)).statusCode).toBe(404);
    expect((await f.modificar({ nombre: 'Cambio' }, 'no-uuid')).statusCode).toBe(400);
  });

  it.each([{}, { nombre: ' ' }, { apellido: ' ' }, { nombreUsuario: '' }, { nombreUsuario: 'con espacios' },
    { email: 'invalido' }, { perfil: 'OPERARIO' }, { perfil: 'SUPERUSUARIO' }, { estado: 'OTRO' },
    { password: 'NuevaClave123' }, { passwordHash: 'inyectado' }, { usuarioId: SISTEMA_CU62 },
    { fincaIds: ['no-uuid'] }, { timestamp: '2026-01-01T00:00:00Z' }])('valida el contrato estricto: %j', async input => {
    expect((await f.modificar(input)).statusCode).toBe(400);
    expect((await f.cambios()).rows).toEqual([]);
  });

  it.each(['ADMINISTRADOR', 'ENCARGADO_CAMPO', 'ADMIN_SISTEMA'])('admite el perfil canónico %s', async perfil => {
    expect((await f.modificar({ perfil })).statusCode).toBe(200);
    expect((await f.repo.buscarPorId(USUARIO_CU62))?.perfil).toBe(perfil);
  });

  it('desbloquea, reinicia intentos y conserva ambos deltas antes de permitir el login', async () => {
    await f.conexion.pool.query("update usuarios set estado='BLOQUEADO',intentos_fallidos=5 where id=$1", [USUARIO_CU62]);
    const res = await f.app.inject({ method: 'POST', url: `/api/v1/usuarios/${USUARIO_CU62}/desbloquear`, headers: { authorization: `Bearer ${f.token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ estado: 'ACTIVO', intentosFallidos: 0 });
    expect((await f.cambios()).rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ dato_modificado: 'estado', valor_anterior: 'BLOQUEADO', valor_nuevo: 'ACTIVO' }),
      expect.objectContaining({ dato_modificado: 'intentosFallidos', valor_anterior: 5, valor_nuevo: 0 }),
    ]));
    expect(await f.login('ana.campo')).toBeTruthy();
  });

  it.each(['usuarioId=no-uuid', 'desconocido=valor', 'limit=201'])('valida las consultas de auditoría persistente: %s', async query => {
    const res = await f.app.inject({ url: `/api/v1/auditoria?${query}`, headers: { authorization: `Bearer ${f.token}` } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});
