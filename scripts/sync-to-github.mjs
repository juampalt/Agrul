import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 1. Obtener token de Git Credential Manager
function getGitHubToken() {
  try {
    const creds = execSync('git credential fill', {
      input: 'url=https://github.com\n',
      encoding: 'utf-8'
    });
    const match = creds.match(/password=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (err) {
    console.error('Error obteniendo credenciales de Git:', err.message);
  }
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
}

const token = getGitHubToken();
if (!token) {
  console.error('No se pudo obtener el token de GitHub.');
  process.exit(1);
}

const env = { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token };
const REPO = 'juampalt/Agrul';

console.log(`Conectando con repositorio: ${REPO}...`);

// 2. Definir etiquetas canónicas
const standardLabels = [
  { name: 'ready-for-agent', color: '0e8a16', description: 'Fully specified, ready for an AFK agent' },
  { name: 'priority:P1', color: 'b60205', description: 'Alta prioridad' },
  { name: 'priority:P2', color: 'e99695', description: 'Media prioridad' },
  { name: 'priority:P3', color: 'fef2c0', description: 'Baja prioridad' },
  { name: 'epic:frontend', color: '1d76db', description: 'Dashboard y UI' },
  { name: 'epic:modulo-1-fincas', color: '5319e7', description: 'Gestión de fincas y lotes' },
  { name: 'epic:modulo-2-cultivos', color: '0052cc', description: 'Cultivos y ciclos productivos' },
  { name: 'epic:modulo-3-actividades', color: '006b75', description: 'Registro de actividades' },
  { name: 'epic:modulo-4-insumos', color: '1e7e34', description: 'Insumos y aplicaciones' },
  { name: 'epic:modulo-5-cosecha', color: 'd93f0b', description: 'Cosecha y destino' },
  { name: 'epic:modulo-6-trazabilidad', color: '6f42c1', description: 'Motor de trazabilidad e informes' },
  { name: 'epic:modulo-7-indicadores', color: '0366d6', description: 'Indicadores y estadísticas' },
  { name: 'epic:modulo-8-seguridad', color: '24292e', description: 'Usuarios y seguridad' },
  { name: 'epic:modulo-9-stock', color: 'b08800', description: 'Inventario de insumos' },
  { name: 'epic:modulo-10-clima', color: '0075ca', description: 'Información meteorológica' },
  { name: 'epic:rnf-transversal', color: '6a737d', description: 'Requisitos no funcionales y resiliencia' }
];

console.log('Verificando y creando etiquetas canónicas en GitHub...');
for (const label of standardLabels) {
  try {
    execSync(
      `gh label create "${label.name}" --repo ${REPO} --color "${label.color}" --description "${label.description}" --force`,
      { env, stdio: 'ignore' }
    );
  } catch (e) {
    // Si ya existe o no se puede modificar, continuar
  }
}

// 3. Obtener lista de issues ya existentes
console.log('Consultando issues existentes en GitHub...');
let existingIssues = [];
try {
  const jsonOut = execSync(`gh issue list --repo ${REPO} --state all --limit 200 --json number,title`, {
    env,
    encoding: 'utf-8'
  });
  existingIssues = JSON.parse(jsonOut);
} catch (e) {
  console.warn('No se pudieron consultar issues existentes, continuando con precaución.');
}

function issueAlreadyExists(ticketId) {
  return existingIssues.some(issue => issue.title.includes(`[${ticketId}]`));
}

// 4. Mapear tickets y crear issues faltantes
const ticketsData = JSON.parse(fs.readFileSync('scripts/tickets-data.json', 'utf-8'));

// Mapa de épica a label
function getEpicLabel(epic) {
  if (epic.includes('Módulo 1')) return 'epic:modulo-1-fincas';
  if (epic.includes('Módulo 2')) return 'epic:modulo-2-cultivos';
  if (epic.includes('Módulo 3')) return 'epic:modulo-3-actividades';
  if (epic.includes('Módulo 4')) return 'epic:modulo-4-insumos';
  if (epic.includes('Módulo 5')) return 'epic:modulo-5-cosecha';
  if (epic.includes('Módulo 6')) return 'epic:modulo-6-trazabilidad';
  if (epic.includes('Módulo 7')) return 'epic:modulo-7-indicadores';
  if (epic.includes('Módulo 8')) return 'epic:modulo-8-seguridad';
  if (epic.includes('Módulo 9')) return 'epic:modulo-9-stock';
  if (epic.includes('Módulo 10')) return 'epic:modulo-10-clima';
  if (epic.includes('Épica 6') || epic.includes('Frontend')) return 'epic:frontend';
  return 'epic:rnf-transversal';
}

function getPriorityLabel(priority) {
  if (priority.includes('Alta') || priority.includes('P1')) return 'priority:P1';
  if (priority.includes('Media') || priority.includes('P2')) return 'priority:P2';
  return 'priority:P3';
}

const createdIssues = [];
const skippedIssues = [];

console.log('\n--- Iniciando creación de issues en GitHub ---');

for (const t of ticketsData) {
  const title = `[${t.id}] ${t.title}`;

  if (issueAlreadyExists(t.id)) {
    console.log(`⏩ [SKIP] Ya existe issue para ${t.id}`);
    skippedIssues.push(t.id);
    continue;
  }

  // Si el ticket ya estaba DONE en la fase previa histórica y no se quiere subir, omitir
  // Solo subimos los tickets pendientes del backlog (AGRUL-011 a AGRUL-050)
  if (t.status === 'DONE') {
    console.log(`⏩ [SKIP] Ticket histórico completado: ${t.id}`);
    skippedIssues.push(t.id);
    continue;
  }

  const epicLabel = getEpicLabel(t.epic);
  const priorityLabel = getPriorityLabel(t.priority);
  const labelsToApply = ['ready-for-agent', priorityLabel, epicLabel];

  const bodyContent = `## ${t.id} — ${t.title}

- **Épica:** ${t.epic}
- **Módulo:** ${t.module}
- **Prioridad:** ${t.priority}
- **Status:** \`ready-for-agent\`
${t.rf && t.rf.length ? `- **Requisitos Funcionales:** ${t.rf.join(', ')}\n` : ''}${t.rn && t.rn.length ? `- **Reglas de Negocio:** ${t.rn.join(', ')}\n` : ''}- **Skills Aplicables:** ${t.skills.join(', ')}

---

### Descripción
${t.description}

### Tareas Técnicas
${t.tasks.map((task, idx) => `${idx + 1}. ${task}`).join('\n')}

### Criterios de Aceptación
${t.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

---
*Issue generado automáticamente desde TICKETS.md para Agrul.*
`;

  const tmpFile = path.resolve(`.scratch/tmp_${t.id}.md`);
  fs.writeFileSync(tmpFile, bodyContent, 'utf-8');

  try {
    console.log(`Creando issue: ${title}...`);
    const labelFlags = labelsToApply.map(l => `--label "${l}"`).join(' ');
    const cmd = `gh issue create --repo ${REPO} --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpFile}" ${labelFlags}`;
    const out = execSync(cmd, { env, encoding: 'utf-8' }).trim();
    console.log(`✅ Creado: ${out}`);
    createdIssues.push({ id: t.id, title, url: out });
  } catch (err) {
    console.error(`❌ Error creando issue para ${t.id}:`, err.message);
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }

  // Breve pausa para no saturar rate limits
  execSync('powershell -Command "Start-Sleep -Milliseconds 600"');
}

console.log('\n=============================================');
console.log(`🎉 Proceso finalizado.`);
console.log(`- Issues creados: ${createdIssues.length}`);
console.log(`- Issues omitidos (existentes o completados): ${skippedIssues.length}`);
console.log('=============================================\n');
