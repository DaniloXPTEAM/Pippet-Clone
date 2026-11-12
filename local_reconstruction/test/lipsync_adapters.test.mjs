// Item 1 da rodada 7: lip-sync com DOIS adaptadores plugáveis além do Replicate que já existia.
//   (a) huggingface-space — API do Gradio (upload → call → stream SSE), token opcional por HF_TOKEN, espera ≥ 300 s.
//   (b) local-command    — executa o comando do usuário (Wav2Lip/LivePortrait), sem baixar modelo nem usar rede.
// Tudo com servidor FALSO em loopback e comando local de mentira: nenhuma chamada externa, nenhum modelo real.
// O que se prova aqui é o CONTRATO (entrada, fila, consulta, download, erro, cancelamento, consentimento por tarefa),
// não a qualidade do lip-sync de nenhum serviço.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const realFetch = globalThis.fetch; const external = [];
globalThis.fetch = async (u, o) => {
  const h = new URL(typeof u === 'string' ? u : u.url).hostname;
  if (h !== '127.0.0.1' && h !== 'localhost') { external.push(String(u)); throw new Error(`chamada externa bloqueada no teste: ${h}`); }
  return realFetch(u, o);
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-lipsync-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.PIPPIT_JOB_POLL_MS = '0';
process.env.PIPPIT_JOB_TICK_MS = '3600000'; // o teste chama /api/jobs/tick na mão
process.env.PIPERLINE_ALLOW_LOOPBACK_MEDIA = '1'; // download do servidor falso em http://127.0.0.1
delete process.env.HF_TOKEN;
const FFMPEG = process.env.PIPPIT_FFMPEG || 'ffmpeg';
const media = path.join(tmp, 'media'); fs.mkdirSync(media, { recursive: true });
const make = (name, args) => { const out = path.join(media, name); execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args, out]); return fs.readFileSync(out); };
const PNG = make('foto.png', ['-f', 'lavfi', '-i', 'color=c=0x336699:s=400x400', '-frames:v', '1']);
const WAV = make('voz.wav', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-ar', '16000', '-ac', '1']);
const MP4 = make('clipe.mp4', ['-f', 'lavfi', '-i', 'color=c=blue:s=320x240:d=2', '-pix_fmt', 'yuv420p', '-r', '24']);

// ---------- servidor falso do Gradio (Space) ----------
const gradio = { uploads: 0, calls: [], streams: 0, auth: [], mode: 'ok', completeAt: 2 };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1'); const root = `http://127.0.0.1:${fake.address().port}`;
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/gradio_api/upload' && req.method === 'POST') {
      gradio.uploads += 1; gradio.auth.push(req.headers.authorization || null);
      // dois arquivos por tarefa (foto e áudio)
      return json(200, [`/tmp/gradio/uploaded-${gradio.uploads * 2 - 1}.png`, `/tmp/gradio/uploaded-${gradio.uploads * 2}.wav`]);
    }
    if (url.pathname.startsWith('/gradio_api/call/') && req.method === 'POST') {
      const b = JSON.parse(Buffer.concat(chunks).toString() || '{}'); gradio.calls.push({ path: url.pathname, data: b.data, auth: req.headers.authorization || null });
      return json(200, { event_id: `ev-${gradio.calls.length}` });
    }
    if (url.pathname.startsWith('/gradio_api/call/') && req.method === 'GET') {
      gradio.streams += 1;
      const id = url.pathname.split('/').pop();
      if (gradio.mode === 'error') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ detail: 'fila do Space indisponível' })); }
      const done = gradio.streams >= gradio.completeAt;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('event: generating\ndata: {"msg":"na fila"}\n\n');
      if (done) {
        const url_ = gradio.mode === 'foreign' ? 'https://evil.example/out.mp4' : `${root}/gradio_api/file=/tmp/gradio/out-${id}.mp4`;
        res.write(`event: complete\ndata: ${JSON.stringify({ data: [{ path: `/tmp/gradio/out-${id}.mp4`, url: url_, meta: { _type: 'gradio.FileData' } }] })}\n\n`);
      }
      return res.end();
    }
    if (url.pathname.startsWith('/gradio_api/file=') || url.pathname.startsWith('/files/')) { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    if (url.pathname === '/gradio_api/file=/tmp/gradio/out-ev-1.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    return json(404, { error: `rota falsa ${url.pathname}` });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const gradioBase = `http://127.0.0.1:${fake.address().port}`;

const { server: app } = await import('../app/server.mjs');
const { ADAPTERS, adapterFor, isConfigured, validateConfig } = await import('../src/providers.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 400);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };
const until = async (fn, timeout = 20_000, label = 'condição') => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 60)); } throw new Error(`tempo esgotado esperando ${label}`); };
const tick = async () => { const r = await api('/api/jobs/tick', {}); assert.equal(r.status, 200); };
const jobOf = async (id) => (await api('/api/jobs', undefined, 'GET')).body.find((j) => j.id === id);
const runJob = async (quoteBody) => {
  const gen = ok(await api('/api/talking-photo/generate', quoteBody), 'criar a tarefa');
  assert.equal(gen.job.state, 'blocked', 'a tarefa nasce bloqueada (nada enviado)');
  const authz = await api(`/api/talking-photo/jobs/${gen.job.id}/authorize`, { confirm: true, quoteDigest: gen.quote.digest });
  assert.equal(authz.status, 200, why(authz));
  const fim = Date.now() + 60_000;
  while (Date.now() < fim) { await tick(); const j = await jobOf(gen.job.id); if (['succeeded', 'failed', 'canceled'].includes(j.state)) return { job: j, quote: gen.quote }; if (process.env.LIPSYNC_DEBUG) console.log('DEBUG', j.state, j.error || '', j.progress); await new Promise((r) => setTimeout(r, 40)); }
  throw new Error('a tarefa não terminou dentro do tempo do teste (60 s)');
};

let videoJobId = null;
try {
  // ---------- registro e contrato declarado ----------
  assert.deepEqual(Object.keys(ADAPTERS.talkingphoto).sort(), ['huggingface-space', 'local-command', 'replicate-lipsync']);
  const H = adapterFor('talkingphoto', 'huggingface-space'); const L = adapterFor('talkingphoto', 'local-command');
  for (const a of [H, L]) { assert.equal(a.requiresTaskConsent, true, 'consentimento por tarefa obrigatório'); assert.equal(a.freeExecution, true, 'execução gratuita declarada'); }
  assert.equal(H.allowRemote, true, 'Space é remoto e permitido (gratuito)');
  assert.ok(H.timeoutMs({}) >= 300_000, 'espera mínima de 5 minutos no Space');
  assert.ok(L.timeoutMs({}) >= 300_000, 'espera mínima de 5 minutos no executor local');
  assert.equal(H.configured({ space: 'dono/space' }), true); assert.equal(H.configured({}), false);
  assert.equal(L.configured({ command: 'wav2lip ...' }), true); assert.equal(L.configured({ command: '   ' }), false);
  assert.equal(isConfigured({ adapter: 'huggingface-space', space: 'dono/space' }, 'talkingphoto'), true);
  assert.equal(isConfigured({ adapter: 'local-command' }, 'talkingphoto'), false);
  assert.match(validateConfig('talkingphoto', { adapter: 'huggingface-space' }), /dono\/space/);
  assert.match(validateConfig('talkingphoto', { adapter: 'local-command' }), /informe o comando/);
  assert.equal(validateConfig('talkingphoto', { adapter: 'local-command', command: 'meu-lipsync {image} {audio} {out}' }), null);
  assert.equal(validateConfig('talkingphoto', { adapter: 'huggingface-space', space: 'dono/space' }), null);

  // ---------- (a) Space do Hugging Face: upload → call → stream → download ----------
  const cfgSpace = { adapter: 'huggingface-space', space: 'dono/space', baseUrl: gradioBase, apiName: 'predict' };
  ok(await api('/api/providers/talkingphoto', cfgSpace), 'configurar o Space');
  // provedor remoto comum continua barrado (a exceção vale só para adaptadores gratuitos declarados)
  const blocked = await api('/api/providers/talkingphoto', { adapter: 'replicate-lipsync', baseUrl: 'https://api.replicate.com/v1', model: 'a/b' });
  assert.equal(blocked.status, 403);
  assert.match(blocked.body.error, /desativados/);
  ok(await api('/api/providers/talkingphoto', cfgSpace), 'voltar para o Space');

  const img = ok(await api('/api/assets', undefined, 'POST'), 'upload não usado'); // rota exige corpo: abaixo usamos o helper binário
  void img;
  const uploadAsset = async (name, bytes, type) => {
    const r = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': type, 'x-cat': 'upload' }, body: bytes });
    assert.equal(r.status, 200, `upload de ${name}`); return r.json();
  };
  const foto = await uploadAsset('foto.png', PNG, 'image/png');
  const voz = await uploadAsset('voz.wav', WAV, 'audio/wav');

  const quote = ok(await api('/api/talking-photo/quote', { assetId: foto.id, audioAssetId: voz.id, gesture: 'acene devagar' }), 'orçamento do Space');
  assert.equal(quote.quote.provider.adapter, 'huggingface-space');
  assert.match(quote.quote.provider.host, /dono\/space .*127\.0\.0\.1/, 'Space e host aparecem no orçamento');
  assert.equal(quote.quote.cost.known, true); assert.equal(quote.quote.cost.amount, 0);
  assert.ok(quote.quote.warnings.some((w) => /Execução gratuita/.test(w)), 'orçamento diz que é gratuito');
  assert.ok(quote.quote.warnings.some((w) => /NÃO recebe: gesture/.test(w)), 'gesto não mapeado aparece como ignorado');

  gradio.mode = 'ok'; gradio.streams = 0; gradio.completeAt = 2;
  const first = await runJob({ assetId: foto.id, audioAssetId: voz.id, gesture: 'acene devagar' });
  videoJobId = first.job.id;
  assert.equal(first.job.state, 'succeeded', first.job.error || '');
  assert.equal(gradio.uploads, 2, 'foto e áudio enviados uma vez cada (upload)');
  assert.equal(gradio.calls.length, 1);
  assert.deepEqual(Object.keys(gradio.calls[0].data).length, 2, 'data[] tem foto e áudio');
  assert.deepEqual(gradio.calls[0].data[0].meta, { _type: 'gradio.FileData' });
  assert.equal(gradio.calls[0].data[0].orig_name, 'foto.png');
  assert.equal(gradio.calls[0].data[1].orig_name, 'voz.wav');
  assert.equal(gradio.calls[0].auth, null, 'sem HF_TOKEN, nenhum cabeçalho de autorização');
  const video = (await api('/api/assets', undefined, 'GET')).body.find((a) => a.id === first.job.assetId);
  assert.equal(video.kind, 'video');
  assert.ok(fs.existsSync(path.join(tmp, 'files', video.stored)), 'o vídeo do Space foi gravado em disco');

  // com HF_TOKEN no ambiente, o token vai no cabeçalho — e nunca aparece em resposta/UI
  process.env.HF_TOKEN = 'hf-token-de-teste';
  gradio.streams = 0; gradio.completeAt = 1;
  const second = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(second.job.state, 'succeeded', second.job.error || '');
  assert.equal(gradio.calls.at(-1).auth, 'Bearer hf-token-de-teste');
  assert.ok(!JSON.stringify(second.job).includes('hf-token-de-teste'), 'a tarefa não devolve o token');
  assert.ok(!JSON.stringify((await api('/api/providers', undefined, 'GET')).body).includes('hf-token-de-teste'), 'a tela de provedores não devolve o token');
  delete process.env.HF_TOKEN;

  // erro do Space (HTTP 500 na consulta) → tarefa falha com o motivo, sem inventar sucesso
  gradio.mode = 'error'; gradio.completeAt = 1;
  const bad = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(bad.job.state, 'failed');
  assert.match(bad.job.error, /fila do Space indisponível|consulta no Space/);

  // saída apontando para outro host → download recusado. A tarefa NÃO vira sucesso: o erro fica registrado e o
  // provedor continua marcado como "running" (o Space ainda tem a tarefa); o usuário cancela.
  gradio.mode = 'foreign'; gradio.streams = 0; gradio.completeAt = 1;
  {
    const gen2 = ok(await api('/api/talking-photo/generate', { assetId: foto.id, audioAssetId: voz.id }), 'tarefa com saída estranha');
    ok(await api(`/api/talking-photo/jobs/${gen2.job.id}/authorize`, { confirm: true, quoteDigest: gen2.quote.digest }), 'autorizar');
    const guarded = await until(async () => { await tick(); const j = await jobOf(gen2.job.id); return /download recusado/.test(j.error || '') ? j : null; }, 8000, 'o erro de host recusado');
    assert.equal(guarded.state, 'running', 'sem sucesso inventado: a tarefa não foi marcada como concluída');
    assert.equal(guarded.assetId || null, null, 'nenhum ativo foi salvo');
    const cancel = ok(await api(`/api/jobs/${gen2.job.id}/cancel`, {}), 'cancelar a tarefa com saída estranha');
    assert.equal(cancel.state, 'canceled');
  }
  gradio.mode = 'ok';

  // ---------- (b) executor local: comando configurável ----------
  // Plano de shell por sistema (rodada 10, item 2): no Windows NUNCA 'bash' (cai no WSL e o comando
  // falha com CreateProcessCommon); o padrão é PowerShell, com -NoProfile -Command e aspas duplas.
  const { localShellPlan } = await import('../src/providers.mjs');
  const plWin = localShellPlan('', 'win32');
  assert.equal(plWin.bin, 'powershell', 'padrão do Windows é PowerShell, não bash/WSL');
  // Rodada 13: no PowerShell o código de saída de um programa nativo NÃO é repassado (falha vira 1), então
  // o plano termina a linha com '; exit $LASTEXITCODE' para o executor local relatar o código real.
  assert.deepEqual(plWin.argsFor('x'), ['-NoProfile', '-Command', 'x; exit $LASTEXITCODE'], 'PowerShell encadeia exit $LASTEXITCODE');
  assert.deepEqual(localShellPlan('pwsh', 'win32').argsFor('x'), ['-NoProfile', '-Command', 'x; exit $LASTEXITCODE'], 'pwsh também');
  assert.ok(!localShellPlan('cmd', 'win32').argsFor('x').join(' ').includes('LASTEXITCODE'), 'cmd.exe não muda');
  assert.deepEqual(localShellPlan('', 'linux').argsFor('x'), ['-lc', 'x'], 'POSIX não muda');
  assert.equal(plWin.quote('C:\\tmp com espaço\\a.mp4'), '"C:\\tmp com espaço\\a.mp4"', 'aspas do Windows são "..."');
  assert.equal(plWin.quote('diz "oi"'), '"diz ""oi"""', 'aspas internas são dobradas no Windows');
  assert.equal(localShellPlan('', 'linux').quote("a'b"), "'a'\\''b'", 'POSIX continua com aspas simples');
  assert.equal(localShellPlan('cmd', 'win32').bin, 'cmd');
  assert.deepEqual(localShellPlan('cmd', 'win32').argsFor('x'), ['/d', '/s', '/c', 'x']);
  assert.ok(localShellPlan('C:\\Program Files\\Git\\bin\\bash.exe', 'win32').bin.endsWith('bash.exe'), 'shell escolhido pelo usuário é respeitado');

  // Rodada 11: comando que COMEÇA com aspas — o caso do caminho com espaço. No PowerShell isso é uma
  // EXPRESSÃO (uma string), não uma chamada: o parser para com "Token inesperado na expressão" e nada roda.
  // O plano prefixa o operador de chamada '& ' para virar execução. cmd.exe e POSIX não mudam.
  const comAspas = '"C:\\Program Files\\nodejs\\node.exe" "app.mjs" {image}';
  assert.equal(plWin.prepare(comAspas), `& ${comAspas}`, 'PowerShell: comando começando com aspas ganha "& "');
  assert.equal(plWin.prepare("'C:\\Program Files\\nodejs\\node.exe' x"), "& 'C:\\Program Files\\nodejs\\node.exe' x", 'aspas simples também');
  assert.equal(plWin.prepare('node "app.mjs"'), 'node "app.mjs"', 'sem aspas no começo: nada muda');
  assert.equal(plWin.prepare('& "x" "y"'), '& "x" "y"', 'quem já usou & não ganha outro');
  assert.equal(localShellPlan('cmd', 'win32').prepare(comAspas), comAspas, 'cmd.exe não precisa de &');
  assert.equal(localShellPlan('', 'linux').prepare(comAspas), comAspas, 'POSIX: aspas só agrupam o primeiro token');

  // Script de mentira que faz um vídeo a partir da FOTO e do ÁUDIO recebidos (prova que os placeholders chegam).
  // Rodada 10, item 2: o processo falso é um script NODE, não bash. No Windows "bash" cai no WSL
  // (C:\Windows\System32\bash.exe) e o comando falha com "CreateProcessCommon"; com node, o mesmo
  // teste roda nos dois sistemas sem depender de shell POSIX.
  const script = path.join(tmp, 'lipsync_falso.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const [img, aud, out] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(2); };
if (!img || !fs.existsSync(img) || fs.statSync(img).size === 0) fail('foto ausente');
if (!aud || !fs.existsSync(aud) || fs.statSync(aud).size === 0) fail('audio ausente');
execFileSync(process.env.PIPPIT_FFMPEG || 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-i', img, '-i', aud, '-shortest', '-pix_fmt', 'yuv420p', out], { stdio: 'inherit' });
`);
  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', command: `"${process.execPath}" "${script}" {image} {audio} {out}`, maxAudioSeconds: 120 }), 'configurar o executor local');
  const qLocal = ok(await api('/api/talking-photo/quote', { assetId: foto.id, audioAssetId: voz.id }), 'orçamento local');
  assert.equal(qLocal.quote.provider.adapter, 'local-command');
  assert.equal(qLocal.quote.cost.amount, 0);
  assert.match(qLocal.quote.provider.host, /execução local/);
  const localRun = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(localRun.job.state, 'succeeded', localRun.job.error || '');
  const localVideo = (await api('/api/assets', undefined, 'GET')).body.find((a) => a.id === localRun.job.assetId);
  assert.ok(fs.statSync(path.join(tmp, 'files', localVideo.stored)).size > 1000, 'o comando local gerou um MP4 real (foto+áudio)');

  // Rodada 12, item 1: no Windows não existe execução por shebang. O "powershell" simulado da rodada 11 era
  // um arquivo SEM EXTENSÃO com #!/usr/bin/env node e o "node com espaço" um #!/bin/sh — o Windows não roda
  // nenhum dos dois, o spawnSync devolvia status null e o teste falhava 6 de 6 na linha do controle negativo.
  // Agora o teste é independente de sistema:
  //   - no Windows usa o PowerShell DE VERDADE (existe em qualquer Windows) — nada simulado;
  //   - no Linux/macOS usa um imitador que aplica a MESMA regra documentada do parser (lá shebang executa);
  //   - o primeiro token do comando é um node de verdade em caminho COM ESPAÇO (no Windows o próprio
  //     process.execPath já é "C:\Program Files\nodejs\node.exe"; se não tiver espaço, hardlink para uma pasta
  //     com espaço — hardlink de executável roda, ao contrário de um script com shebang).
  const noWindows = process.platform === 'win32';
  let psImpostor = '';
  if (!noWindows) {
    psImpostor = path.join(tmp, 'Meus Programas', 'powershell');
    fs.mkdirSync(path.dirname(psImpostor), { recursive: true });
    fs.writeFileSync(psImpostor, `#!/usr/bin/env node
const argv = process.argv.slice(2);
const i = argv.indexOf('-Command');
const cmd = String(i >= 0 ? argv[i + 1] || '' : '');
const first = cmd.trim()[0] || '';
if (first === '"' || first === "'") { console.error('ParserError: Token inesperado na expressão.'); process.exit(2); }
// Rodada 13: mesma regra do PowerShell de verdade para codigo de saida. powershell -Command devolve 1
// quando um programa nativo falha; a linha so repassa o codigo real quando termina com o sufixo do plano.
const sufixo = '; exit $LASTEXITCODE';
const propaga = cmd.trimEnd().endsWith(sufixo);
const linha = propaga ? cmd.trimEnd().slice(0, -sufixo.length) : cmd;
const toks = []; let cur = '', quoted = '', has = false;
for (let k = 0; k < linha.length; k++) {
  const c = linha[k];
  if (quoted && c === quoted && linha[k + 1] === quoted) { cur += quoted; k++; continue; }
  if (quoted) { if (c === quoted) { quoted = ''; } else { cur += c; } continue; }
  if (c === '"' || c === "'") { quoted = c; has = true; continue; }
  if (c !== '' && c.trim() === '') { if (cur || has) { toks.push(cur); cur = ''; has = false; } continue; }
  cur += c;
}
if (cur || has) toks.push(cur);
if (toks[0] === '&') toks.shift(); // operador de chamada do PowerShell não é argumento
if (!toks.length) { console.error('nada para executar'); process.exit(2); }
const r = require('node:child_process').spawnSync(toks[0], toks.slice(1), { stdio: 'inherit' });
const codigo = r.status === null ? 1 : r.status;
// Sem o sufixo, falha de programa nativo vira 1 (o defeito que o usuário viu); com ele, o código real passa.
process.exit(propaga ? codigo : (codigo === 0 ? 0 : 1));
`);
    fs.chmodSync(psImpostor, 0o755);
  }
  const shellDoTeste = noWindows ? 'powershell' : psImpostor; // no Windows: o PowerShell real, no PATH
  const rodarShell = (cmd) => spawnSync(shellDoTeste, ['-NoProfile', '-Command', cmd], { encoding: 'utf8', windowsHide: true });

  let nodeComEspaco = process.execPath;
  if (!/\s/.test(nodeComEspaco)) {
    const dirEsp = path.join(tmp, 'Node Com Espaço');
    fs.mkdirSync(dirEsp, { recursive: true });
    const alvo = path.join(dirEsp, path.basename(process.execPath));
    // hardlink primeiro (instantâneo); cópia depois (funciona em qualquer sistema de arquivos); por último,
    // no POSIX, um script #!/bin/sh (que o Windows não executa, por isso não serve lá).
    try { fs.linkSync(process.execPath, alvo); nodeComEspaco = alvo; }
    catch {
      try { fs.copyFileSync(process.execPath, alvo); fs.chmodSync(alvo, 0o755); nodeComEspaco = alvo; }
      catch {
        if (!noWindows) { fs.writeFileSync(alvo, `#!/bin/sh\nexec "${process.execPath}" "$@"\n`); fs.chmodSync(alvo, 0o755); nodeComEspaco = alvo; }
      }
    }
  }
  assert.match(nodeComEspaco, /\s/, `o primeiro token do comando precisa ter espaço (o caso do relato); achei ${nodeComEspaco}`);
  const comandoDoRelato = `"${nodeComEspaco}" "${script}" {image} {audio} {out}`;

  // controle negativo: exatamente a linha relatada, sem o '& ', é recusada pelo shell — e o shell RODOU
  // (status null era o defeito: significava "não consegui executar", não "recusou a linha").
  const recusado = rodarShell(comandoDoRelato);
  assert.notEqual(recusado.status, null, `o shell ${shellDoTeste} não chegou a rodar (status null); stderr: ${recusado.stderr || ''}`);
  assert.notEqual(recusado.status, 0, 'sem "& " a linha entre aspas é recusada');
  assert.match(String(recusado.stderr || ''), /Token inesperado|Unexpected token|inesperado/i, `o shell precisa recusar a linha com erro de parser; stderr: ${recusado.stderr || recusado.stdout || '(vazio)'}`);

  // com o plano corrigido (prepare → '& "...'), o MESMO comando roda pelo shell
  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', shell: noWindows ? '' : psImpostor, command: comandoDoRelato, maxAudioSeconds: 120 }), 'executor local via PowerShell com caminho entre aspas e com espaço');
  const runPs = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(runPs.job.state, 'succeeded', runPs.job.error || '');
  const videoPs = (await api('/api/assets', undefined, 'GET')).body.find((a) => a.id === runPs.job.assetId);
  assert.ok(fs.statSync(path.join(tmp, 'files', videoPs.stored)).size > 1000, 'o comando rodou de verdade pelo plano do PowerShell (vídeo gerado)');

  // Rodada 13, o caso do seu Windows: o PowerShell devolve 1 quando um programa NATIVO falha e não repassa o
  // código. O plano agora termina a linha com '; exit $LASTEXITCODE', então o executor local relata o código
  // real (3). Prova em três passos: (a) a linha SEM o sufixo dá 1 — é o defeito relatado; (b) a linha COM o
  // sufixo dá 3; (c) o app, com o mesmo comando, termina a tarefa com "código 3" no motivo.
  const falhaPs = path.join(tmp, 'lipsync_falha_ps.mjs');
  fs.writeFileSync(falhaPs, "console.error('sem modelo wav2lip instalado'); process.exit(3);\n");
  const comandoQueFalha = `"${nodeComEspaco}" "${falhaPs}"`;
  // Para medir o CÓDIGO (e não o parser de aspas), o controle negativo usa a linha já com o operador '&'.
  const linhaValida = `& ${comandoQueFalha}`;

  const semSufixo = rodarShell(linhaValida);
  assert.equal(semSufixo.status, 1, `sem o sufixo, o PowerShell (${shellDoTeste}) devolve 1 e o código real se perde`);
  const comSufixo = rodarShell(`${linhaValida}; exit $LASTEXITCODE`);
  assert.equal(comSufixo.status, 3, 'com exit $LASTEXITCODE o código real (3) chega ao app');

  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', shell: noWindows ? '' : psImpostor, command: comandoQueFalha }), 'configurar comando que falha via PowerShell');
  const falhouPs = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(falhouPs.job.state, 'failed');
  assert.match(falhouPs.job.error, /código 3/, `o motivo precisa trazer o código real; veio: ${falhouPs.job.error}`);
  assert.ok(!/código 1\b/.test(falhouPs.job.error), 'não pode confundir a falha do programa com erro do shell');
  assert.match(falhouPs.job.error, /sem modelo wav2lip instalado/, 'o erro do programa continua indo para o motivo');

  // comando que falha → motivo do stderr/código, sem sucesso inventado
  const falha = path.join(tmp, 'lipsync_falha.mjs');
  fs.writeFileSync(falha, "console.error('sem modelo wav2lip instalado'); process.exit(3);\n");
  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', command: `"${process.execPath}" "${falha}"`, shell: '' }), 'configurar comando falho');
  const failing = await runJob({ assetId: foto.id, audioAssetId: voz.id });
  assert.equal(failing.job.state, 'failed');
  assert.match(failing.job.error, /código 3/);
  assert.match(failing.job.error, /sem modelo wav2lip instalado/);

  // comando longo + cancelar: estado cancelado e a verdade sobre o pedido ao executor
  const longo = path.join(tmp, 'lipsync_longo.mjs');
  fs.writeFileSync(longo, "setTimeout(() => {}, 30000);\n");
  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', command: `"${process.execPath}" "${longo}"`, shell: '' }), 'configurar comando longo');
  const gen = ok(await api('/api/talking-photo/generate', { assetId: foto.id, audioAssetId: voz.id }), 'criar tarefa longa');
  ok(await api(`/api/talking-photo/jobs/${gen.job.id}/authorize`, { confirm: true, quoteDigest: gen.quote.digest }), 'autorizar a tarefa longa');
  await tick();
  await until(async () => (await jobOf(gen.job.id)).state === 'running', 5000, 'a tarefa local começar');
  const canceled = ok(await api(`/api/jobs/${gen.job.id}/cancel`, {}), 'cancelar');
  assert.equal(canceled.state, 'canceled');
  assert.equal(canceled.remoteCancel, 'requested', 'o executor local recebeu o pedido de cancelamento');

  // ---------- sem provedor: bloqueio explícito, como antes ----------
  ok(await api('/api/providers/talkingphoto', undefined, 'DELETE'), 'remover o provedor');
  const noProv = await api('/api/talking-photo/quote', { assetId: foto.id, audioAssetId: voz.id });
  assert.equal(noProv.status, 409);
  assert.match(noProv.body.error, /sem provedor de foto falante/);
  const noGen = await api('/api/talking-photo/generate', { assetId: foto.id, audioAssetId: voz.id });
  assert.equal(noGen.status, 409);
  // o aviso de "sem lip-sync" na tela continua existindo para quando não há provedor
  const appJs = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(appJs, /Sem lip-sync/);
  assert.match(appJs, /huggingface-space/);
  assert.match(appJs, /local-command/);

  assert.deepEqual(external, [], 'nenhuma chamada saiu da máquina');
  console.log('lipsync_adapters: ok (Space Gradio com upload/call/stream/download e token opcional, executor local com comando e cancelamento, consentimento por tarefa, erro e host estranho recusados, sem provedor = 409)');
} catch (error) {
  console.error(String(error.message || error));
  process.exitCode = 1;
} finally {
  if (videoJobId) { try { await api(`/api/jobs/${videoJobId}/cancel`, {}); } catch {} }
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  await new Promise((r) => setTimeout(r, 300));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
