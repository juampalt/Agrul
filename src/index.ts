import 'dotenv/config';
import { crearServidorProduccion } from './bootstrap.js';
import { crearServidorDemo } from './demo-server.js';
import { createDatabaseConnection } from './infrastructure/database/connection.js';

async function bootstrap() {
  console.log('Inicializando Agrul Traceability Engine...');
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  let app;
  let isDemo = false;

  // Verificar si la base de datos PostgreSQL responde
  try {
    const { pool } = createDatabaseConnection();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar a PostgreSQL')), 1500)
    );
    await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
    console.log('✅ Conexión con PostgreSQL establecida.');
    const servidor = crearServidorProduccion();
    app = servidor.app;
  } catch (err: any) {
    console.warn(`⚠️ PostgreSQL no disponible (${err?.message || 'Error'}).`);
    console.log('🚀 Iniciando Agrul en modo de demostración/memoria con datos semilla y usuarios precargados...');
    const servidor = await crearServidorDemo({ logger: false });
    app = servidor.app;
    isDemo = true;
  }

  try {
    await app.listen({ port, host });
    console.log(`\n=================================================================`);
    console.log(`  🌱 Servidor Agrul API escuchando en: http://localhost:${port}`);
    if (isDemo) {
      console.log(`  🔐 MODO DEMO ACTIVO:`);
      console.log(`     - Administrador: usuario "admin"     | clave "admin123"`);
      console.log(`     - Encargado:     usuario "encargado" | clave "campo123"`);
    }
    console.log(`=================================================================\n`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
