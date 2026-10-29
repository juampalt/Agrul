import pg from 'pg';

/** Datos mínimos reales para las pruebas del guard tras incorporar la FK al ciclo. */
export async function sembrarCiclosRn09(pool: pg.Pool, cicloIds: string[]) {
  const finca = 'f0000000-0000-4000-8000-000000000059';
  const lote = 'a0000000-0000-4000-8000-000000000059';
  const cultivo = 'b0000000-0000-4000-8000-000000000059';
  const variedad = 'd0000000-0000-4000-8000-000000000059';
  const plantacion = 'e0000000-0000-4000-8000-000000000059';
  await pool.query("insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil) values ($1,'Responsable','RN09','responsable-rn09@example.test','hash-exclusivo-fixture','salt-fixture','ENCARGADO') on conflict (id) do nothing", [finca]);
  await pool.query("insert into fincas(id,nombre,localidad,departamento,provincia,superficie_total_ha) values ($1,'Finca RN09','San Pablo','Lules','Tucumán',10) on conflict (id) do nothing", [finca]);
  await pool.query("insert into lotes(id,codigo_lote,producto,unidad_medida,finca_id,superficie_ha) values ($1,'LOT-2026-0059','RN09','HA',$2,10) on conflict (id) do nothing", [lote, finca]);
  await pool.query("insert into cultivos(id,nombre,tipo_ciclo_vida) values ($1,'Cultivo RN09','PERENNE') on conflict (id) do nothing", [cultivo]);
  await pool.query("insert into variedades(id,cultivo_id,nombre) values ($1,$2,'Variedad RN09') on conflict (id) do nothing", [variedad, cultivo]);
  await pool.query("insert into plantaciones(id,lote_id,cultivo_id,variedad_id,fecha_plantacion,superficie_ha,cantidad_inicial_plantas) values ($1,$2,$3,$4,'2026-10-01',10,100) on conflict (id) do nothing", [plantacion, lote, cultivo, variedad]);
  for (let i = 0; i < cicloIds.length; i++) {
    // UUID completo en 22 caracteres: único entre suites y dentro de varchar(30).
    const codigo = `RN09-${Buffer.from(cicloIds[i].replaceAll('-', ''), 'hex').toString('base64url')}`;
    await pool.query("insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,responsable_seguimiento_id) values ($1,$2,$3,'2026-10-01','2026-10-27',$4) on conflict (id) do nothing", [cicloIds[i], plantacion, codigo, finca]);
  }
}
