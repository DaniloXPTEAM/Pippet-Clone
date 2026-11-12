// Rodada 15 item 1a — o ffmpeg do WinGet é achado por VARREDURA de %LOCALAPPDATA%,
// em qualquer versão (Gyan.FFmpeg_*\*\bin), sem nome de usuário nem versão fixa no código.
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mediaPath = path.join(here, '..', 'app', 'lib', 'media.mjs');
const mediaURL = pathToFileURL(mediaPath).href;

// --- o código não pode trazer nome de usuário nem versão fixa do WinGet ---
const fonte = fs.readFileSync(mediaPath, 'utf8');
assert.ok(!/Users\//.test(fonte), 'media.mjs não pode conter caminho com "Users/" (nome de usuário)');
assert.ok(!/9\.0\.1-full_build/.test(fonte), 'media.mjs não pode conter a versão fixa 9.0.1-full_build');
assert.ok(/Gyan\.FFmpeg_/.test(fonte), 'a varredura é pelo pacote Gyan.FFmpeg_* do WinGet');

// --- monta um LOCALAPPDATA falso com o pacote do WinGet ---
const montar = (versoes) => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'winget-scan-'));
  const pac = path.join(raiz, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe');
  for (const v of versoes) {
    const bin = path.join(pac, `ffmpeg-${v}-full_build`, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    for (const b of ['ffmpeg.exe', 'ffprobe.exe']) fs.writeFileSync(path.join(bin, b), '');
  }
  return raiz;
};

const resolver = (localAppData, extra = {}) => {
  const homeFake = fs.mkdtempSync(path.join(os.tmpdir(), 'winget-home-'));
  const env = { PATH: '/caminho/vazio-sem-ffmpeg', HOME: homeFake, USERPROFILE: homeFake, ...extra }; // isola do PATH e do home reais
  if (localAppData) env.LOCALAPPDATA = localAppData; // caminho sem nome de usuário: só o ambiente
  const codigo = `const m = await import(${JSON.stringify(mediaURL)}); console.log(JSON.stringify({ ffmpeg: m.FFMPEG, ffprobe: m.FFPROBE }));`;
  const r = spawnSync(process.execPath, ['-e', codigo], { encoding: 'utf8', env, timeout: 60000 });
  assert.equal(r.status, 0, `processo filho falhou: ${r.stderr}`);
  fs.rmSync(homeFake, { recursive: true, force: true });
  return JSON.parse(r.stdout.trim().split('\n').pop());
};

// (1) duas versões instaladas: acha a mais nova (9.0.2), não a fixa antiga (9.0.1)
const duas = montar(['9.0.1', '9.0.2']);
const r1 = resolver(duas);
assert.match(r1.ffmpeg, /ffmpeg-9\.0\.2-full_build[/\\]bin[/\\]ffmpeg\.exe$/, `esperava a 9.0.2, veio ${r1.ffmpeg}`);
assert.match(r1.ffprobe, /ffmpeg-9\.0\.2-full_build[/\\]bin[/\\]ffprobe\.exe$/, `esperava a 9.0.2, veio ${r1.ffprobe}`);

// (2) QUALQUER versão: até um número de versão novo e desconhecido é achado
const nova = montar(['10.1.2']);
const r2 = resolver(nova);
assert.match(r2.ffmpeg, /ffmpeg-10\.1\.2-full_build[/\\]bin[/\\]ffmpeg\.exe$/, `esperava a 10.1.2, veio ${r2.ffmpeg}`);
assert.match(r2.ffprobe, /ffmpeg-10\.1\.2-full_build[/\\]bin[/\\]ffprobe\.exe$/, `esperava a 10.1.2, veio ${r2.ffprobe}`);

// (3) sem nenhum pacote: continua devolvendo null (não inventa caminho)
const vazio = montar([]);
const r3 = resolver(vazio);
assert.equal(r3.ffmpeg, null, `sem pacote devia ser null, veio ${r3.ffmpeg}`);
assert.equal(r3.ffprobe, null, `sem pacote devia ser null, veio ${r3.ffprobe}`);

// (4) precedência do ambiente se mantém: PIPPIT_FFMPEG vale mais que a varredura
const r4 = resolver(duas, { PIPPIT_FFMPEG: '/opt/meu-ffmpeg', PIPPIT_FFPROBE: '/opt/meu-ffprobe' });
assert.equal(r4.ffmpeg, '/opt/meu-ffmpeg', 'PIPPIT_FFMPEG tem precedência');
assert.equal(r4.ffprobe, '/opt/meu-ffprobe', 'PIPPIT_FFPROBE tem precedência');

for (const d of [duas, nova, vazio]) fs.rmSync(d, { recursive: true, force: true });
console.log('winget_ffmpeg: ok (varredura Gyan.FFmpeg_* em %LOCALAPPDATA%, qualquer versão, sem nome de usuário nem versão fixa no código)');
