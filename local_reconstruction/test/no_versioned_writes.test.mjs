// Rodada 10 · item 4 — nenhum teste escreve em arquivo versionado.
// Regra nova do usuário: os testes não podem alterar arquivos versionados (png, ui-shots); as capturas
// vão para pasta temporária. Este teste cobra a regra em três frentes:
//   1) o helper de capturas grava FORA do repositório (e respeita PIPPIT_UI_SHOTS_DIR);
//   2) nenhum teste monta à mão um caminho para test/ui-shots;
//   3) rodando uma captura de verdade, os arquivos versionados (ui-shots/*.png e o png da marca)
//      ficam byte a byte iguais, e o `git status` desses caminhos continua limpo.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { shotsDir, shotPath } from './support/shots.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const UI_SHOTS = path.join(HERE, 'ui-shots');
const BRAND_PNG = path.join(REPO, 'app', 'public', 'assets', 'brand', 'watermark.png');

// 1) a pasta de capturas fica fora do repositório
const dir = shotsDir();
assert.equal(path.resolve(dir).startsWith(REPO + path.sep), false, `pasta de capturas deveria estar fora do repositório: ${dir}`);
assert.ok(fs.existsSync(dir), 'a pasta de capturas é criada quando alguém grava');
// PIPPIT_UI_SHOTS_DIR manda a pasta (útil para guardar evidência), mas nunca para dentro do repositório
const os = await import('node:os');
const envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-env-'));
const anterior = process.env.PIPPIT_UI_SHOTS_DIR;
process.env.PIPPIT_UI_SHOTS_DIR = envDir;
assert.ok(shotPath('x.png').startsWith(envDir), 'PIPPIT_UI_SHOTS_DIR é respeitado');
assert.ok(shotPath('x.png').endsWith('x.png'));
if (anterior === undefined) delete process.env.PIPPIT_UI_SHOTS_DIR; else process.env.PIPPIT_UI_SHOTS_DIR = anterior;

// 2) nenhum teste aponta para test/ui-shots (o caminho era montado em 11 arquivos até a rodada 9)
const ofensores = [];
for (const f of fs.readdirSync(HERE).filter((n) => n.endsWith('.test.mjs') && n !== 'no_versioned_writes.test.mjs')) {
  const src = fs.readFileSync(path.join(HERE, f), 'utf8');
  if (/['"`]ui-shots/.test(src) || /join\([^)]*'ui-shots'/.test(src)) ofensores.push(f);
}
assert.deepEqual(ofensores, [], `testes ainda gravam em test/ui-shots: ${ofensores.join(', ')}`);

// 3) captura de verdade: os versionados não mudam
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const retrato = () => {
  const out = {};
  if (fs.existsSync(UI_SHOTS)) for (const f of fs.readdirSync(UI_SHOTS).sort()) out[`ui-shots/${f}`] = hash(path.join(UI_SHOTS, f));
  if (fs.existsSync(BRAND_PNG)) out['brand/watermark.png'] = hash(BRAND_PNG);
  return out;
};
const antes = retrato();
assert.ok(Object.keys(antes).length > 0, 'há arquivos versionados para vigiar (ui-shots/png da marca)');

const alvo = shotPath('guarda_versionados.png');
fs.writeFileSync(alvo, Buffer.from('nao e png de verdade; so prova que a captura sai da arvore')); // grava fora do repo
assert.ok(fs.existsSync(alvo), 'a captura foi gravada na pasta temporária');
assert.equal(fs.existsSync(path.join(UI_SHOTS, 'guarda_versionados.png')), false, 'nada apareceu em test/ui-shots');

const depois = retrato();
assert.deepEqual(depois, antes, 'os arquivos versionados ficaram byte a byte iguais depois da captura');

// o git também precisa concordar (quando o repositório está disponível)
const git = spawnSync('git', ['-C', REPO, 'status', '--porcelain', '--', 'local_reconstruction/test/ui-shots', 'local_reconstruction/app/public/assets/brand/watermark.png'], { encoding: 'utf8' });
if (git.status === 0) {
  assert.equal((git.stdout || '').trim(), '', `git status sujo nesses caminhos: ${(git.stdout || '').trim()}`);
}

console.log(`no_versioned_writes.test.mjs: capturas em ${dir}; ${Object.keys(antes).length} arquivo(s) versionado(s) vigiado(s), nenhum alterado`);
