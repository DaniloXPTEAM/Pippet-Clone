// Rodada 8 · item 2 — `.env` local: nomes no .env.example, valores só no arquivo ignorado pelo git,
// ambiente do processo sempre tem prioridade e a API mostra apenas presente/ausente.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../..');
// O .env de teste precisa existir ANTES do primeiro import de env-file.mjs (o carregamento
// acontece na avaliação do módulo, de propósito, para rodar antes de qualquer leitura de ambiente).
const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-env-srv-'));
const envFile2 = path.join(tmp2, '.env');
fs.writeFileSync(envFile2, 'NVIDIA_API_KEY=chave-de-mentira-nao-usar\nSUPABASE_URL=http://127.0.0.1:59999\n');
process.env.PIPERLINE_ENV_FILE = envFile2;
delete process.env.NVIDIA_API_KEY;
const AUTH = await import('../app/lib/auth.mjs');
const { parseEnv, loadEnvFile } = await import('../app/lib/env-file.mjs');

// ---------- 1. .env.example: só nomes, nenhum valor
const example = fs.readFileSync(path.join(repo, '.env.example'), 'utf8');
const names = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
for (const n of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FREELLMAPI_API_KEY', 'OMNIROUTER_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'NOVAI_API_KEY', 'NVIDIA_API_KEY', 'HF_TOKEN']) assert.ok(names.includes(n), `nome ${n} está no .env.example`);
assert.ok(names.every((n) => new RegExp(`^${n}=$`, 'm').test(example)), 'toda variável do exemplo está vazia (sem valor)');
assert.match(example, /ignorado pelo git|gitignore/);
assert.ok(!/^[A-Z][A-Z0-9_]*=.+$/m.test(example), 'nenhuma linha do exemplo tem valor preenchido');
assert.ok(fs.readFileSync(path.join(repo, '.gitignore'), 'utf8').split(/\r?\n/).includes('.env'), '.env está ignorado pelo git');

// ---------- 2. parser: comentários, export, aspas, linhas inválidas
const p = parseEnv('# comentário\nexport A=1\nB="dois"\nC=\'três\'\n\nD=com = igual\nnao-e-var\nE=quatro\n');
assert.deepEqual(p.values, { A: '1', B: 'dois', C: 'três', D: 'com = igual', E: 'quatro' });
assert.equal(p.ignored.length, 1, 'linha inválida é ignorada, não quebra');

// ---------- 3. ambiente manda: .env não sobrescreve o que já existe
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-env-'));
const envFile = path.join(tmp, '.env'); fs.writeFileSync(envFile, 'SUPABASE_URL=http://127.0.0.1:9999\nFAKE_TOKEN=do-arquivo\n');
const env = { SUPABASE_URL: 'http://127.0.0.1:1111' };
const r = loadEnvFile({ file: envFile, env });
assert.equal(env.SUPABASE_URL, 'http://127.0.0.1:1111', 'ambiente vence o arquivo');
assert.equal(env.FAKE_TOKEN, 'do-arquivo');
assert.deepEqual(r.loaded, ['FAKE_TOKEN']); assert.deepEqual(r.kept, ['SUPABASE_URL']);
assert.ok(!JSON.stringify(r).includes('do-arquivo'), 'o resumo nunca carrega o valor');
assert.equal(loadEnvFile({ file: path.join(tmp, 'nao-existe'), env }).found, false);
fs.rmSync(tmp, { recursive: true, force: true });

// ---------- 4. servidor: lê o .env no primeiro import e a API só informa presente/ausente
process.env.PIPPIT_LOCAL_DATA = path.join(tmp2, 'data'); process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const { ENV_FILE_STATUS } = await import('../app/lib/env-file.mjs');
  assert.equal(process.env.NVIDIA_API_KEY, 'chave-de-mentira-nao-usar', `servidor carregou o .env no import: ${JSON.stringify({ ...ENV_FILE_STATUS, file: 'x' })}`);
  const ef = await fetch(base + '/api/env-file').then((x) => x.json());
  assert.equal(ef.found, true); assert.ok(ef.loaded.includes('NVIDIA_API_KEY'));
  assert.ok(!JSON.stringify(ef).includes('chave-de-mentira-nao-usar'), 'a rota do .env não devolve valor');
  const cfg = await fetch(base + '/api/free-router/panel').then((x) => x.json());
  const nv = (cfg.providers || []).find((x) => x.id === 'nvidia-nim');
  assert.equal(nv.hasKey, true, 'provedor mostra chave presente');
  assert.ok(!JSON.stringify(cfg).includes('chave-de-mentira-nao-usar'), 'nenhum valor de chave na resposta de provedores');
  // a chave nunca vai para o arquivo de estado local
  await new Promise((rs) => setTimeout(rs, 400));
  const dbFile = path.join(tmp2, 'data', 'db.json');
  if (fs.existsSync(dbFile)) assert.ok(!fs.readFileSync(dbFile, 'utf8').includes('chave-de-mentira-nao-usar'), 'chave não é gravada no estado');
  // SUPABASE_URL do .env chegou ao adaptador (host apenas, sem chave)
  const sup = AUTH.supabaseConfig();
  assert.equal(sup.configured, false, 'sem SUPABASE_ANON_KEY o adaptador continua não configurado');
  console.log('env_file: OK');
} finally {
  server.closeAllConnections?.(); await new Promise((rs) => server.close(rs));
  fs.rmSync(tmp2, { recursive: true, force: true });
}
