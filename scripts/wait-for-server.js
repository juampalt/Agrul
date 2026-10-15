import http from 'http';
import 'dotenv/config';

const port = Number(process.env.PORT) || 3001;
const host = '127.0.0.1';
const maxAttempts = 30;
const delayMs = 500;

let attempts = 0;

function check() {
  attempts++;
  const req = http.get(`http://${host}:${port}/api/v1/health`, (res) => {
    if (res.statusCode === 200) {
      console.log(`✅ Servidor verificado y respondiendo en http://${host}:${port}`);
      process.exit(0);
    } else {
      retry();
    }
  });

  req.on('error', () => retry());
  req.setTimeout(1000, () => {
    req.destroy();
    retry();
  });
}

function retry() {
  if (attempts >= maxAttempts) {
    console.warn(`⚠️ Tiempo de espera agotado al conectar con el servidor.`);
    process.exit(1);
  }
  setTimeout(check, delayMs);
}

check();
