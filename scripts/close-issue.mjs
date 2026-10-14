import { execSync } from 'node:child_process';

const issueNumber = process.argv[2] || '2';
const comment = process.argv[3] || 'Implementación completada con éxito. Cierre formal de AGRUL-008 (Fusión de Lotes N:1).';

let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  try {
    const creds = execSync('git credential fill', {
      input: 'url=https://github.com\n',
      encoding: 'utf-8'
    });
    const match = creds.match(/password=(.+)/);
    if (match) {
      token = match[1].trim();
    }
  } catch (err) {
    console.error('No se pudo obtener el token de git credentials:', err);
  }
}

if (!token) {
  console.error('Error: Token de GitHub no encontrado.');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'Agrul-Issue-Closer',
  'X-GitHub-Api-Version': '2022-11-28',
};

// 1. Agregar comentario de cierre
if (comment) {
  try {
    const commentRes = await fetch(`https://api.github.com/repos/juampalt/Agrul/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: comment }),
    });
    if (!commentRes.ok) {
      console.warn(`Aviso al comentar en issue #${issueNumber}:`, await commentRes.text());
    } else {
      console.log(`Comentario añadido al issue #${issueNumber}`);
    }
  } catch (err) {
    console.warn('Error en la llamada de comentario:', err);
  }
}

// 2. Cerrar el issue vía REST API
const closeRes = await fetch(`https://api.github.com/repos/juampalt/Agrul/issues/${issueNumber}`, {
  method: 'PATCH',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
});

if (!closeRes.ok) {
  console.error(`Error al cerrar issue #${issueNumber}:`, await closeRes.text());
  process.exit(1);
} else {
  const issue = await closeRes.json();
  console.log(`✅ Issue #${issue.number} cerrado exitosamente en GitHub: "${issue.title}"`);
}
