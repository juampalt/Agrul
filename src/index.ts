import 'dotenv/config';
import { crearServidorProduccion } from './bootstrap.js';

async function bootstrap() {
  console.log('Inicializando Agrul Traceability Engine...');
  const { app } = crearServidorProduccion();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`Servidor Agrul API escuchando en http://localhost:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
