import 'dotenv/config';
import { crearServidorProduccion } from './bootstrap.js';

async function bootstrap() {
  console.log('Inicializando Agrul Traceability Engine...');
  const { app } = crearServidorProduccion();
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`\n=================================================================`);
    console.log(`  🌱 Servidor Agrul API escuchando en: http://localhost:${port}`);
    console.log(`  🔐 USUARIOS DISPONIBLES:`);
    console.log(`     - Administrador Agrícola: usuario "admin"     | clave "admin123"`);
    console.log(`     - Administrador Sistema:  usuario "sistema"   | clave "admin123"`);
    console.log(`     - Encargado de Campo:     usuario "encargado" | clave "campo123"`);
    console.log(`=================================================================\n`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
