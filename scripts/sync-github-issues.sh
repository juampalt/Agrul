#!/usr/bin/env bash
set -e

echo "=== Sincronizador de Tickets de Agrul a GitHub Issues ==="

if ! gh auth status > /dev/null 2>&1; then
  echo "No hay sesión activa en gh. Por favor ejecutá: gh auth login"
  exit 1
fi

REPO="juampalt/Agrul"
echo "Repositorio destino: $REPO"

node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const tickets = JSON.parse(fs.readFileSync('scripts/tickets-data.json', 'utf8'));

let existing = '';
try {
  existing = execSync('gh issue list --repo juampalt/Agrul --limit 200 --json title --jq ".[].title"').toString();
} catch (e) {
  console.log('Error listando issues existentes');
}

for (const t of tickets) {
  const expectedTitle = `${t.id}: ${t.title}`;
  if (existing.includes(expectedTitle)) {
    console.log('[SKIP] Ya existe: ' + expectedTitle);
    continue;
  }
  console.log('Creando: ' + expectedTitle);
  const body = `## ${t.id} — ${t.title}\n\n**Épica:** ${t.epic}\n**Módulo:** ${t.module}\n**Prioridad:** ${t.priority}\n\n### Descripción\n${t.description}\n\n### Criterios de Aceptación\n${t.acceptanceCriteria.map(c => '- [ ] ' + c).join('\\n')}`;
  const labels = t.labels.map(l => `--label "${l}"`).join(' ');
  const tmpFile = '/tmp/issue_body.txt';
  fs.writeFileSync(tmpFile, body);
  execSync(`gh issue create --repo ${REPO} --title "${expectedTitle}" --body-file ${tmpFile} ${labels}`);
}
"
echo "=== Sincronización completada con éxito ==="
