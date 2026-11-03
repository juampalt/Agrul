import 'dotenv/config';
import { createDatabaseConnection } from '../src/infrastructure/database/connection.js';
import { CryptoAuthService } from '../src/infrastructure/services/crypto-auth.service.js';

async function seed() {
  const { pool } = createDatabaseConnection();

  console.log('🌱 Sembrando datos iniciales en PostgreSQL agrul_db...');

  // 1. Usuarios
  const { hash: hashAdmin, salt: saltAdmin } = CryptoAuthService.hashPassword('admin123');
  const { hash: hashCampo, salt: saltCampo } = CryptoAuthService.hashPassword('campo123');

  const adminId = 'a0000000-0000-4000-8000-000000000001';
  const sistemaId = 'a0000000-0000-4000-8000-000000000002';
  const encargadoId = 'a0000000-0000-4000-8000-000000000003';

  await pool.query(`
    INSERT INTO usuarios (id, nombre, apellido, email, nombre_usuario, password_hash, salt, perfil, estado, debe_cambiar_password, intentos_fallidos)
    VALUES 
      ($1, 'Administrador', 'Agrícola', 'admin@agrul.local', 'admin', $2, $3, 'ADMINISTRADOR', 'ACTIVO', false, 0),
      ($4, 'Administrador', 'Sistema', 'sistema@agrul.local', 'sistema', $2, $3, 'ADMIN_SISTEMA', 'ACTIVO', false, 0),
      ($5, 'Carlos', 'Gómez', 'encargado@agrul.local', 'encargado', $6, $7, 'ENCARGADO_CAMPO', 'ACTIVO', false, 0)
    ON CONFLICT (id) DO UPDATE SET
      perfil = EXCLUDED.perfil,
      password_hash = EXCLUDED.password_hash,
      salt = EXCLUDED.salt,
      estado = 'ACTIVO',
      debe_cambiar_password = false;
  `, [adminId, hashAdmin, saltAdmin, sistemaId, encargadoId, hashCampo, saltCampo]);

  // 2. Finca
  const fincaId = 'f0000000-0000-4000-8000-000000000001';
  await pool.query(`
    INSERT INTO fincas (id, nombre, localidad, departamento, provincia, superficie_total_ha, renspa)
    VALUES ($1, 'Finca La Esperanza', 'Tupungato', 'Tupungato', 'Mendoza', 150, '12.345.6.78901/22')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `, [fincaId]);

  // Asignar fincas a los usuarios
  await pool.query(`
    INSERT INTO usuario_finca_asignacion (id, usuario_id, finca_id, activo)
    VALUES 
      ('af000000-0000-4000-8000-000000000001', $1, $2, true),
      ('af000000-0000-4000-8000-000000000002', $3, $2, true),
      ('af000000-0000-4000-8000-000000000003', $4, $2, true)
    ON CONFLICT (id) DO NOTHING;
  `, [adminId, fincaId, sistemaId, encargadoId]);

  // 3. Lotes
  const lote1Id = 'b1000000-0000-4000-8000-000000000001';
  const lote2Id = 'b1000000-0000-4000-8000-000000000002';
  await pool.query(`
    INSERT INTO lotes (id, finca_id, codigo_lote, producto, variedad, estado_actual, cantidad_actual, unidad_medida, superficie_ha, nombre_territorial, estado_territorial, tipo_suelo, sistema_riego)
    VALUES 
      ($1, $3, 'LOT-2026-00001', 'Cereza Lapins', 'Lapins', 'CREADO', 5000, 'KG', 30, 'Cuadro Norte', 'DISPONIBLE', 'Franco-arenoso', 'Goteo'),
      ($2, $3, 'LOT-2026-00002', 'Vid Malbec', 'Malbec', 'CREADO', 12000, 'KG', 45, 'Cuadro Sur', 'DISPONIBLE', 'Franco-limoso', 'Goteo')
    ON CONFLICT (id) DO NOTHING;
  `, [lote1Id, lote2Id, fincaId]);

  // 4. Cultivos
  const cultivo1Id = 'c1000000-0000-4000-8000-000000000001';
  const cultivo2Id = 'c1000000-0000-4000-8000-000000000002';
  await pool.query(`
    INSERT INTO cultivos (id, nombre, tipo_ciclo_vida, descripcion, estado)
    VALUES 
      ($1, 'Cereza', 'PERENNE', 'Cerezo comercial de exportación', 'ACTIVO'),
      ($2, 'Vid', 'PERENNE', 'Vid para vinificación de alta gama', 'ACTIVO')
    ON CONFLICT (id) DO NOTHING;
  `, [cultivo1Id, cultivo2Id]);

  // 5. Variedades
  const variedad1Id = 'd1000000-0000-4000-8000-000000000001';
  const variedad2Id = 'd1000000-0000-4000-8000-000000000002';
  await pool.query(`
    INSERT INTO variedades (id, cultivo_id, nombre, descripcion, estado)
    VALUES 
      ($1, $2, 'Lapins', 'Variedad autofértil de gran calibre', 'ACTIVO'),
      ($3, $4, 'Malbec', 'Variedad tinta emblemática', 'ACTIVO')
    ON CONFLICT (id) DO NOTHING;
  `, [variedad1Id, cultivo1Id, variedad2Id, cultivo2Id]);

  // 6. Tipos de actividad
  const tipo1Id = 'e1000000-0000-4000-8000-000000000001';
  const tipo2Id = 'e1000000-0000-4000-8000-000000000002';
  await pool.query(`
    INSERT INTO tipos_actividad (id, nombre, categoria, estado)
    VALUES 
      ($1, 'Poda de Formación y Raleo', 'MANTENIMIENTO', 'ACTIVA'),
      ($2, 'Riego Presurizado por Goteo', 'RIEGO', 'ACTIVA')
    ON CONFLICT (id) DO NOTHING;
  `, [tipo1Id, tipo2Id]);

  await pool.query(`
    INSERT INTO tipos_actividad_cultivos (tipo_actividad_id, cultivo_id)
    VALUES ($1, $3), ($2, $3)
    ON CONFLICT (tipo_actividad_id, cultivo_id) DO NOTHING;
  `, [tipo1Id, tipo2Id, cultivo1Id]);

  // 7. Insumos
  const insumo1Id = 'f1000000-0000-4000-8000-000000000001';
  await pool.query(`
    INSERT INTO insumos (id, codigo, nombre, categoria, unidad_medida, nivel_minimo, estado)
    VALUES ($1, 'FERT-01', 'Nitrato de Calcio Soluble', 'FERTILIZANTE', 'KG', 100, 'ACTIVO')
    ON CONFLICT (id) DO NOTHING;
  `, [insumo1Id]);

  // 8. Cámaras
  const camara1Id = 'ca000000-0000-4000-8000-000000000001';
  await pool.query(`
    INSERT INTO camaras_sector (id, finca_id, nombre, temperatura_objetivo_c, creado_por, solicitud)
    VALUES ($1, $2, 'Cámara 01 - Frío Convencional', 1.5, $3, '{}')
    ON CONFLICT (id) DO NOTHING;
  `, [camara1Id, fincaId, adminId]);

  console.log('✅ Datos iniciales sembrados exitosamente.');
  await pool.end();
}

seed().catch(err => {
  console.error('Error sembrando datos:', err);
  process.exit(1);
});
