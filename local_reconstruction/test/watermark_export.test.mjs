// Rodada 7 · item 2 — marca d'água (estrutura): módulo ÚNICO, desligada por padrão, aplicada na exportação por ffmpeg.
// Prova real: exporta o MESMO projeto com e sem marca e compara os PIXELS do quadro (canto com marca x centro da imagem),
// para imagem (png substituível em assets/brand/watermark.png) e para texto (nome vindo da CONFIGURAÇÃO, nunca do código).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)); // no Windows, new URL(...).pathname dá "/C:/..." (inválido)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-wm-'));
// Rodada 10, itens 1 e 4: teste NÃO escreve em arquivo versionado. A marca é lida/gravada numa cópia
// em pasta temporária (PIPPIT_BRAND_DIR, lida pelo servidor); o png do repositório fica intocado e o
// teste confere isso pelo sha256 no fim. Antes, um caminho inválido no Windows fazia o teste gravar
// por cima do png versionado e não restaurar (628 B → 235 B), com try/catch vazio escondendo o erro.
const REPO_PNG = path.join(HERE, '..', 'app', 'public', 'assets', 'brand', 'watermark.png');
const BRAND_DIR = path.join(tmp, 'brand-public');
const BRAND_PNG = path.join(BRAND_DIR, 'assets', 'brand', 'watermark.png');
assert.ok(fs.existsSync(REPO_PNG), `imagem da marca não encontrada no repositório: ${REPO_PNG}`);
const repoPngBefore = crypto.createHash('sha256').update(fs.readFileSync(REPO_PNG)).digest('hex');
const repoPngBytes = fs.statSync(REPO_PNG).size;
fs.mkdirSync(path.dirname(BRAND_PNG), { recursive: true });
fs.copyFileSync(REPO_PNG, BRAND_PNG);
process.env.PIPPIT_BRAND_DIR = BRAND_DIR;
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_TICK_MS = '3600000';
const media = await import('../app/lib/media.mjs'); assert.ok(media.available());
const WM = await import('../app/lib/watermark.mjs');

// ---------- 1. módulo: padrões e validação
const d = WM.normalizeWatermark({});
assert.equal(d.enabled, false, 'DESLIGADA por padrão (exigência da estrutura)');
assert.deepEqual(Object.keys(d).sort(), ['enabled', 'imagePath', 'kind', 'margin', 'opacity', 'position', 'scale', 'text']);
assert.equal(d.imagePath, 'assets/brand/watermark.png');
assert.equal(d.position, 'bottom-right');
assert.equal(WM.normalizeWatermark(true).enabled, true, 'formato antigo (booleano) ainda é aceito');
for (const bad of [{ position: 'meio' }, { opacity: 2 }, { scale: 0 }, { margin: 0.7 }, { kind: 'video' }, { imagePath: '../etc/passwd' }]) {
  assert.throws(() => WM.normalizeWatermark({ ...bad, enabled: true }), /inválid|escala|opacidade|margem/, JSON.stringify(bad));
}
// decisão única: config + pedido do diálogo + preferência "salvar sem marca d'água" + plano
const on = { enabled: true, kind: 'text' };
assert.equal(WM.effectiveWatermark({ watermark: {} }, { requested: true }).active, false);
assert.equal(WM.effectiveWatermark({ watermark: on, brandName: 'X' }, { requested: true }).active, true);
assert.match(WM.effectiveWatermark({ watermark: on, brandName: 'X' }, { requested: false }).reason, /pedida sem marca/);
assert.match(WM.effectiveWatermark({ watermark: on }, { requested: true }).reason, /nome da marca não configurado/);
assert.match(WM.effectiveWatermark({ watermark: { enabled: true, kind: 'image' } }, { requested: true, imageExists: false }).reason, /imagem da marca não encontrada/);
assert.equal(WM.effectiveWatermark({ watermark: on, brandName: 'X', saveWithoutWatermark: true }, { requested: true, plan: { noWatermark: false } }).active, true, 'plano gratuito não remove');
assert.match(WM.effectiveWatermark({ watermark: on, brandName: 'X', saveWithoutWatermark: true }, { requested: true, plan: { noWatermark: false } }).reason, /preferência ignorada/);
assert.equal(WM.effectiveWatermark({ watermark: on, brandName: 'X', saveWithoutWatermark: true }, { requested: true, plan: { noWatermark: true } }).active, false);
// posição em pixels + filtros
assert.deepEqual(WM.overlayPosition('top-left', { videoW: 100, videoH: 200, markW: 20, markH: 10, margin: 0.05 }), { x: 5, y: 5 });
assert.deepEqual(WM.overlayPosition('bottom-right', { videoW: 100, videoH: 200, markW: 20, markH: 10, margin: 0.05 }), { x: 75, y: 185 });
assert.deepEqual(WM.overlayPosition('center', { videoW: 100, videoH: 200, markW: 20, markH: 10, margin: 0 }), { x: 40, y: 95 });

const { server } = await import('../app/server.mjs'); const PORT = 5201; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), put = send('PUT');
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return fs.readFileSync(out); };
const upload = async (buf, name) => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': name, 'content-type': 'video/mp4' }, body: buf })).body;
const fileOf = (a) => { for (const dd of [path.join(tmp, 'files'), tmp]) { const f = path.join(dd, a.stored); if (fs.existsSync(f)) return f; } throw new Error('arquivo do ativo não achado ' + a.stored); };

// quadro azul liso: qualquer marca clara (texto branco/imagem vermelha) muda o canto e deixa o centro igual
const blue = await upload(mk(['-f', 'lavfi', '-i', 'color=c=blue:s=640x360:r=25:d=2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'azul.mp4')), 'azul.mp4');
const ed = (await post('/api/editor')).body;
assert.equal((await put(`/api/editor/${ed.id}`, { ratio: '16:9', clips: [{ assetId: blue.id, in: 0, out: 2 }], texts: [], captions: [], audio: [] })).status, 200);
const exportIt = async (extra = {}) => { const r = await post(`/api/editor/${ed.id}/export`, { name: 'wm', resolution: '360p', fps: 25, format: 'mp4', quality: 'faster', ...extra }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
// média RGB de uma região do quadro exportado (1 s de vídeo, exportado em 360p → 640x360)
const region = (b, w, h, x, y) => {
  const f = path.join(tmp, `frame-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
  const ex = spawnSync(media.FFMPEG, ['-y', '-v', 'error', '-i', fileOf(b.asset), '-ss', '1', '-frames:v', '1', f], { encoding: 'utf8' }); assert.equal(ex.status, 0, ex.stderr);
  const raw = spawnSync(media.FFMPEG, ['-v', 'error', '-i', f, '-vf', `crop=${w}:${h}:${x}:${y},format=rgb24`, '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 1 << 26 });
  const buf = raw.stdout || Buffer.alloc(0); assert.ok(buf.length >= w * h * 3, 'quadro lido: ' + buf.length);
  const s = [0, 0, 0]; for (let i = 0; i < w * h; i++) { s[0] += buf[i * 3]; s[1] += buf[i * 3 + 1]; s[2] += buf[i * 3 + 2]; } return s.map((v) => v / (w * h));
};

// ---------- 2. estado inicial: estrutura pronta, desligada
let W = (await j('/api/watermark')).body;
assert.equal(W.config.enabled, false); assert.deepEqual(W.positions, WM.WATERMARK_POSITIONS);
assert.match(W.note, /DESLIGADA/); assert.equal(W.effective.active, false);
assert.equal(W.image.exists, true, 'png substitível já existe no pacote'); assert.equal(W.image.url, '/assets/brand/watermark.png');
assert.equal(W.plan.id, 'free'); assert.equal(W.saveWithoutWatermark.allowed, false);
// com a configuração desligada, pedir watermark no diálogo NÃO aplica nada
let out = await exportIt({ watermark: true });
assert.equal(out.info.watermark.applied, false); assert.match(out.info.watermark.reason, /desligada/);
assert.match(out.watermarkNote, /desligada/);
// regiões amostradas (quadro 640x360): faixa inferior direita (texto) e canto inferior esquerdo (imagem), e o centro
const REG_TEXT = [380, 322, 250, 30], REG_IMG = [30, 265, 120, 60], REG_MID = [160, 100, 40, 40];
const sample = (b, reg) => region(b, reg[2], reg[3], reg[0], reg[1]);
const baseText = sample(out, REG_TEXT); assert.ok(baseText[2] > 150 && baseText[0] < 80, 'sem marca a faixa é azul: ' + baseText);
const baseImg = sample(out, REG_IMG); const baseCenter = sample(out, REG_MID);

// ---------- 3. texto com o nome vindo da configuração
assert.equal((await post('/api/watermark', { brandName: 'M'.repeat(41), config: { enabled: true, kind: 'text' } })).status, 400, 'nome longo é recusado');
let r = await post('/api/watermark', { brandName: 'Marca de Teste', config: { enabled: true, kind: 'text', position: 'bottom-right', scale: 0.3, opacity: 1 } });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.brandName, 'Marca de Teste'); assert.equal(r.body.effective.active, true);
assert.equal((await post('/api/watermark', { config: { enabled: true, kind: 'text', position: 'no-meio' } })).status, 400, 'posição inválida recusada');
assert.equal((await post('/api/watermark', { config: { enabled: true, kind: 'text', opacity: 5 } })).status, 400, 'opacidade inválida recusada');
out = await exportIt({ watermark: true });
assert.equal(out.info.watermark.applied, true); assert.equal(out.info.watermark.kind, 'text');
const txtCorner = sample(out, REG_TEXT);
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
assert.ok(lum(txtCorner) > lum(baseText) + 12, `a marca muda os pixels da faixa (${lum(baseText).toFixed(1)} → ${lum(txtCorner).toFixed(1)})`);
const txtCenter = sample(out, REG_MID);
assert.ok(Math.abs(lum(txtCenter) - lum(baseCenter)) < 10, 'o centro do quadro continua igual (marca é localizada)');

// ---------- 4. preferência "salvar sem marca d'água" respeita o plano
assert.equal((await post('/api/preferences', { saveWithoutWatermark: true })).status, 200);
out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, true, 'plano gratuito mantém a marca'); assert.match(out.info.watermark.reason, /preferência ignorada/);
assert.equal((await post('/api/plan', { plan: 'starter' })).status, 200);
W = (await j('/api/watermark')).body; assert.equal(W.saveWithoutWatermark.allowed, true);
out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, false); assert.match(out.info.watermark.reason, /plano atual permite/);
// pedido explícito do diálogo ("sem marca") também vale com plano que permite
await post('/api/plan', { plan: 'free' });
assert.equal((await post('/api/preferences', { saveWithoutWatermark: false })).status, 200);
out = await exportIt({ watermark: false }); assert.equal(out.info.watermark.applied, false); assert.match(out.info.watermark.reason, /pedida sem marca/);
out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, true, 'voltou a aplicar');

// ---------- 5. imagem: upload substitui o arquivo e o overlay usa os pixels dela
const redPng = mk(['-f', 'lavfi', '-i', 'color=c=red:s=120x60', '-frames:v', '1'], path.join(tmp, 'vermelho.png'));
assert.equal((await j('/api/watermark/image', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: Buffer.from('nao e imagem nenhuma, so texto puro aqui '.repeat(6)) })).status, 415);
assert.equal((await j('/api/watermark/image', { method: 'POST', headers: { 'content-type': 'image/png' }, body: Buffer.from('curto') })).status, 400, 'corpo vazio é recusado');
assert.ok(fs.existsSync(BRAND_PNG), `cópia temporária da marca deveria existir antes do upload: ${BRAND_PNG}`);
const marcaAntes = fs.readFileSync(BRAND_PNG);
try {
  r = await j('/api/watermark/image', { method: 'POST', headers: { 'content-type': 'image/png' }, body: redPng }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.format, 'png'); assert.equal(r.body.image.exists, true);
  assert.ok(r.body.image.bytes >= redPng.length - 10, 'arquivo do disco tem o tamanho do upload');
  await post('/api/watermark', { brandName: 'Marca de Teste', config: { enabled: true, kind: 'image', position: 'bottom-left', scale: 0.3, opacity: 1 } });
  out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, true); assert.equal(out.info.watermark.kind, 'image');
  const imgCorner = sample(out, REG_IMG); assert.ok(imgCorner[0] > 120 && imgCorner[2] < 110, 'o canto traz os pixels da imagem enviada: ' + imgCorner);
  assert.ok(imgCorner[0] > baseImg[0] + 40, 'diferença real contra a exportação sem marca');
  // opacidade 0,2 → bem menos vermelho que 1,0
  await post('/api/watermark', { config: { enabled: true, kind: 'image', position: 'bottom-left', scale: 0.3, opacity: 0.2 } });
  const faint = sample(await exportIt({ watermark: true }), REG_IMG); assert.ok(faint[0] < imgCorner[0] - 20, `opacidade muda o pixel (${imgCorner[0].toFixed(0)} → ${faint[0].toFixed(0)})`);
} finally {
  // restaura a cópia temporária; se não conseguir, o teste FALHA aqui (antes o catch vazio escondia)
  try { fs.writeFileSync(BRAND_PNG, marcaAntes); } catch (e) { throw new Error('não foi possível restaurar a marca temporária: ' + e.message); }
  assert.equal(fs.statSync(BRAND_PNG).size, marcaAntes.length, 'a marca temporária voltou ao tamanho original');
}

// ---------- 6. imagem ausente: exporta SEM marca e diz o motivo (nunca inventa marca)
const savePath = path.join(tmp, 'guardado.png'); fs.copyFileSync(BRAND_PNG, savePath);
try { fs.unlinkSync(BRAND_PNG); } catch (e) { throw new Error('não foi possível remover a imagem temporária da marca: ' + e.message); }
assert.equal(fs.existsSync(BRAND_PNG), false, 'a imagem temporária saiu do disco antes de testar "sem imagem"');
await post('/api/watermark', { config: { enabled: true, kind: 'image' } });
W = (await j('/api/watermark')).body; assert.equal(W.image.exists, false); assert.match(W.effective.reason, /imagem da marca não encontrada/);
out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, false); assert.match(out.info.watermark.reason, /não encontrada/); assert.match(out.watermarkNote, /não encontrada/);
assert.equal((await j('/api/watermark/image', { method: 'DELETE' })).status, 200);
fs.copyFileSync(savePath, BRAND_PNG);
assert.ok(fs.existsSync(BRAND_PNG), 'a imagem temporária voltou depois do teste de "sem imagem"');

// ---------- 7. persistência e teste com marca desligada de novo
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8'));
assert.equal(disk.settings.watermark.enabled, true); assert.equal(disk.settings.brandName, 'Marca de Teste'); assert.equal(disk.settings.watermark.kind, 'image');
await post('/api/watermark', { config: { enabled: false } });
out = await exportIt({ watermark: true }); assert.equal(out.info.watermark.applied, false);
// ---------- 6. rodada 9, item 1: filtro drawtext com caminho de fonte do Windows
// O ffmpeg trata ':' como separador de opção; "C:/Windows/..." cru quebra com
// "No option name near .../Windows/Fonts/..." (era o HTTP 500 no Windows). O filtro tem de escapar.
const cfgTexto = { enabled: true, kind: 'text', position: 'top-left', scale: 0.2, opacity: 0.9, margin: 0.05 };
const winFilter = WM.buildWatermarkFilter(cfgTexto, { videoW: 640, videoH: 360, brandName: 'Teste', fontFile: 'C:/Windows/Fonts/arialbd.ttf', fontExists: () => true });
assert.match(winFilter.drawtext, /fontfile='C\\:\/Windows\/Fonts\/arialbd\.ttf'/, 'o ":" do drive letter é escapado: ' + winFilter.drawtext);
assert.ok(!winFilter.drawtext.includes("fontfile='C:/Windows"), 'não sai caminho cru do Windows');
const winBack = WM.buildWatermarkFilter(cfgTexto, { videoW: 640, videoH: 360, brandName: 'Teste', fontFile: 'C:\\Windows\\Fonts\\arialbd.ttf', fontExists: () => true });
assert.match(winBack.drawtext, /fontfile='C\\:\\\\Windows\\\\Fonts\\\\arialbd\.ttf'/, 'barras invertidas também são escapadas: ' + winBack.drawtext);
// o caso Linux continua igual (caminho absoluto sem ":", sem escape acrescentado)
const fonteLinux = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const linFilter = WM.buildWatermarkFilter(cfgTexto, { videoW: 640, videoH: 360, brandName: 'Teste', fontFile: fonteLinux, fontExists: () => true });
assert.match(linFilter.drawtext, /fontfile='\/usr\/share\/fonts\/truetype\/dejavu\/DejaVuSans-Bold\.ttf'/, 'caminho POSIX não muda');
assert.equal(WM.escapeFilterPath('/a/b/c.ttf'), '/a/b/c.ttf');
// sem fonte disponível o filtro não menciona fontfile (ffmpeg usa a fonte padrão dele)
const semFonte = WM.buildWatermarkFilter(cfgTexto, { videoW: 640, videoH: 360, brandName: 'Teste', fontFile: 'C:/Windows/Fonts/arialbd.ttf', fontExists: () => false });
assert.ok(!semFonte.drawtext.includes('fontfile='), 'fonte inexistente não entra no filtro');

// ffmpeg de verdade aceita o filtro escapado. No Linux simulamos o Windows criando um diretório "C:"
// (nome legal no POSIX) com a fonte dentro; no Windows usamos a fonte real do sistema.
let fonteWinTeste, dirC;
if (process.platform === 'win32') {
  fonteWinTeste = fs.existsSync('C:/Windows/Fonts/arialbd.ttf') ? 'C:/Windows/Fonts/arialbd.ttf' : WM.pickFont();
} else {
  dirC = path.join(tmp, 'C:', 'Windows', 'Fonts'); fs.mkdirSync(dirC, { recursive: true });
  fonteWinTeste = path.join(dirC, 'arialbd.ttf'); fs.copyFileSync(WM.pickFont(), fonteWinTeste);
}
assert.ok(fonteWinTeste, 'há uma fonte para o teste do filtro');
const filtroWin = WM.buildWatermarkFilter(cfgTexto, { videoW: 640, videoH: 360, brandName: 'Teste Windows', fontFile: fonteWinTeste, fontExists: () => true });
const pngWin = path.join(tmp, 'wm-win.png');
const runWin = spawnSync(media.FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:d=0.2', '-vf', filtroWin.drawtext, '-frames:v', '1', pngWin], { encoding: 'utf8' });
assert.equal(runWin.status, 0, 'ffmpeg aceitou o caminho com ":" escapado: ' + String(runWin.stderr || '').slice(0, 300));
assert.ok(fs.existsSync(pngWin) && fs.statSync(pngWin).size > 0, 'o PNG com o texto foi gerado');
// contraprova: o MESMO caminho sem escape é rejeitado pelo parser de filtro
const pngRuim = path.join(tmp, 'wm-win-ruim.png');
const runRuim = spawnSync(media.FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=100x100:d=0.1', '-vf', `drawtext=fontfile='${fonteWinTeste}':text='x':x=1:y=1:fontsize=10`, '-frames:v', '1', pngRuim], { encoding: 'utf8' });
assert.notEqual(runRuim.status, 0, 'sem escape o ffmpeg recusa o caminho com ":"');
assert.match(String(runRuim.stderr || ''), /Error parsing filterchain|No option name/, 'o erro é o mesmo do relato no Windows');

// ---------- 8. rodada 10, item 4: nada versionado foi tocado por este teste
const repoPngAfter = crypto.createHash('sha256').update(fs.readFileSync(REPO_PNG)).digest('hex');
assert.equal(fs.statSync(REPO_PNG).size, repoPngBytes, 'o png versionado da marca manteve o tamanho');
assert.equal(repoPngAfter, repoPngBefore, 'o png versionado da marca não foi alterado pelo teste');

console.log('watermark_export: OK');
server.close();
