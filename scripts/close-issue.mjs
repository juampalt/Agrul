import { execSync } from 'node:child_process';

const issueNumber = process.argv[2] || '5';
const comment = process.argv[3] || 'Implementación completada con éxito. Cierre formal de AGRUL-011.';

const creds = execSync('git credential fill', {
  input: 'url=https://github.com\n',
  encoding: 'utf-8'
});
const token = creds.match(/password=(.+)/)[1].trim();
const env = { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token };

const cmd = `gh issue close ${issueNumber} --repo juampalt/Agrul --comment "${comment}"`;
const out = execSync(cmd, { env, encoding: 'utf-8' });
console.log(out);
