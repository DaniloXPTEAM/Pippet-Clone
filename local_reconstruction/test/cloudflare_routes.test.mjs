// Cloudflare Workers AI + FreeLLMAPI ligados ao app: pilha gratuita, nó de Imagem, nó de Áudio (voz na nuvem
// opt-in), composer de Imagem/Áudio e reserva Omni. Servidores falsos em 127.0.0.1: nenhuma rede externa,
// nenhuma chave em arquivo e o id da conta/token nunca aparecem em resposta.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ACCOUNT = 'conta-app-987';
const TOKEN = 'token-app-secreto';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
const WAV = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from('WAVEfmt '), Buffer.alloc(24)]);
const calls = [];
let cfMode = 'ok'; // ok | auth401
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    calls.push({ path: url.pathname, auth: req.headers.authorization || null, body });
    if (url.pathname === '/v1/chat/completions') {
      if (req.headers.authorization !== 'Bearer chave-free-llm') return json(res, 401, { error: 'auth' });
      return json(res, 200, { choices: [{ message: { content: 'texto do FreeLLMAPI falso' } }] });
    }
    if (url.pathname === '/omni/v1/images/generations') return json(res, 200, { data: [{ b64_json: JPEG.toString('base64') }] });
    if (url.pathname === '/omni/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto do Omni falso' } }] });
    if (url.pathname.startsWith(`/client/v4/accounts/${ACCOUNT}/ai/run/`)) {
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { success: false, errors: [{ message: 'Invalid token' }] });
      if (cfMode === 'auth401') return json(res, 401, { success: false, errors: [{ message: 'Invalid token' }] });
      if (url.pathname.endsWith('@cf/myshell-ai/melotts')) return json(res, 200, { success: true, result: { audio: WAV.toString('base64') } });
      return json(res, 200, { success: true, result: { image: JPEG.toString('base64') } });
    }
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-cf-'));
process.env.PIPPIT_LOCAL_DATA = dataDir;
process.env.PIPPIT_LLM = 'off';
// Rodada 9, item 3: força ausência de SAPI (no Windows ele existe e o nó de Áudio devolveria 200).
process.env.PIPPIT_TTS = 'off';
process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
process.env.CLOUDFLARE_API_TOKEN = TOKEN;
process.env.CLOUDFLARE_AI_BASE_URL = `${root}/client/v4/accounts/{account}/ai/run`;
process.env.FREELLMAPI_BASE_URL = `${root}/v1`;
process.env.FREELLMAPI_API_KEY = 'chave-free-llm';
process.env.OMNIROUTER_BASE_URL = `${root}/omni/v1`;
process.env.OMNIROUTER_API_KEY = 'chave-omni';
process.env.NVIDIA_API_KEY = 'chave-nvidia';
process.env.NVIDIA_BASE_URL = `${root}/nim/v1`;

const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method) => {
  const res = await fetch(base + url, body === undefined && !method ? {} : { method: method || 'POST', headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json(), text: '' };
};
// Rodada 9, item 3: a flag tem de valer de verdade — sem voz local, senão o 409 do nó de Áudio
// (mais abaixo) viraria 200 no Windows, onde o SAPI existe.
{ const v = await api('/api/tts-voices'); assert.equal(v.body.available, false, 'PIPPIT_TTS=off desliga a voz local SAPI'); }
const waitRun = async (id) => {
  for (let i = 0; i < 300; i += 1) {
    const { body } = await api(`/api/local-runs/${id}`);
    if (!['queued', 'running'].includes(body.state)) return body;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('run não terminou');
};
const noSecret = (value) => {
  const text = JSON.stringify(value);
  assert.ok(!text.includes(TOKEN), 'o token nunca aparece em resposta');
  assert.ok(!text.includes(ACCOUNT), 'o id da conta nunca aparece em resposta');
};

try {
  // 1) Pilha gratuita em um clique: ordem pedida, credenciais só como booleanos.
  const preset = await api('/api/free-router/preset/stack', {});
  assert.equal(preset.status, 200, JSON.stringify(preset.body).slice(0, 300));
  assert.deepEqual(preset.body.providers.map((p) => p.id).sort(), ['cloudflare', 'freellmapi', 'novai', 'nvidia-nim', 'omni-router']);
  assert.deepEqual(preset.body.order.image, ['cloudflare/@cf/black-forest-labs/flux-1-schnell', 'omni-router/nvidia/black-forest-labs/flux.2-klein-4b', 'novai/cogview-3-flash']);
  assert.deepEqual(preset.body.order.text, ['freellmapi/auto', 'omni-router/auto/best-free', 'nvidia-nim/google/gemma-4-31b-it', 'nvidia-nim/minimaxai/minimax-m3.1-flash', 'novai/glm-4.7-flash']);
  assert.deepEqual(preset.body.order.audio, ['cloudflare/@cf/myshell-ai/melotts']);
  assert.equal(preset.body.credentials.cloudflare.hasKey, true);
  assert.equal(preset.body.credentials.cloudflare.hasAccount, true);
  assert.equal(preset.body.credentials.cloudflare.accountEnv, 'CLOUDFLARE_ACCOUNT_ID');
  // A NovAI entra na pilha sem chave neste teste: a falta é reportada pelo NOME da variável, nunca pelo valor.
  assert.deepEqual(preset.body.missing, ['novai: chave ausente']);
  // Vídeo deixou de ser PENDING: a NovAI cogvideox-flash é a rota (fila assíncrona, 5 s, 5/dia).
  assert.equal(preset.body.video.provider, 'novai/cogvideox-flash');
  assert.equal(preset.body.video.seconds, 5);
  assert.equal(preset.body.video.dailyLimit, 5);
  assert.deepEqual(preset.body.order.video, ['novai/cogvideox-flash']);
  noSecret(preset.body);

  const status = await api('/api/free-router/config');
  const cf = status.body.config.providers.find((p) => p.id === 'cloudflare');
  assert.equal(cf.hasAccount, true); assert.equal(cf.hasKey, true);
  assert.match(cf.baseUrl, /\{account\}/, 'a base salva mantém o {account}');
  noSecret(status.body);

  // 2) Nó de Imagem: Cloudflare flux-1-schnell primeiro, steps 4, JPEG em disco.
  const proj = (await api('/api/projects', { type: 'canvas' })).body;
  const inode = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Imagem' })).body;
  calls.length = 0;
  const gen = await api(`/api/projects/${proj.id}/nodes/${inode.id}/generate`, { prompt: 'um farol ao entardecer' });
  assert.equal(gen.status, 200, JSON.stringify(gen.body).slice(0, 300));
  assert.equal(gen.body.providerId, 'cloudflare');
  assert.equal(gen.body.creditsCharged, 0);
  assert.match(gen.body.asset.name, /\.jpg$/);
  assert.deepEqual([...fs.readFileSync(path.join(dataDir, 'files', gen.body.asset.stored)).subarray(0, 3)], [0xff, 0xd8, 0xff]);
  const cfCall = calls.find((c) => c.path.startsWith('/client/v4/'));
  assert.equal(cfCall.path, `/client/v4/accounts/${ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`);
  assert.equal(cfCall.auth, `Bearer ${TOKEN}`);
  assert.deepEqual(cfCall.body, { prompt: 'um farol ao entardecer', steps: 4 });
  noSecret(gen.body);

  // 3) Nó de Texto: FreeLLMAPI (auto) é o principal.
  const tnode = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Texto' })).body;
  calls.length = 0;
  const tgen = await api(`/api/projects/${proj.id}/nodes/${tnode.id}/generate`, { prompt: 'escreva um slogan' });
  assert.equal(tgen.status, 200, JSON.stringify(tgen.body).slice(0, 300));
  assert.equal(tgen.body.providerId, 'freellmapi');
  assert.equal(calls[0].path, '/v1/chat/completions');
  assert.equal(calls[0].body.model, 'auto');
  assert.match(tgen.body.result, /FreeLLMAPI falso/);
  noSecret(tgen.body);

  // 4) Nó de Áudio: voz na nuvem só com voiceSource:\"cloud\" (melotts, WAV).
  const anode = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Áudio' })).body;
  calls.length = 0;
  const agen = await api(`/api/projects/${proj.id}/nodes/${anode.id}/generate`, { prompt: 'olá mundo', voiceSource: 'cloud' });
  assert.equal(agen.status, 200, JSON.stringify(agen.body).slice(0, 300));
  assert.equal(agen.body.voiceEngine, "cloud");
  assert.equal(agen.body.mimeType, 'audio/wav');
  assert.match(agen.body.provider, /Cloudflare/);
  assert.match(agen.body.asset.name, /\.wav$/);
  assert.deepEqual([...fs.readFileSync(path.join(dataDir, 'files', agen.body.asset.stored)).subarray(0, 4)], [...Buffer.from('RIFF')]);
  const melo = calls.find((c) => c.path.endsWith('@cf/myshell-ai/melotts'));
  assert.deepEqual(melo.body, { prompt: 'olá mundo', lang: 'en' }, 'melotts recebe {prompt, lang:\"en\"}');
  noSecret(agen.body);

  // 5) Sem SAPI nesta máquina e sem pedir nuvem: o nó de Áudio bloqueia em vez de usar a Cloudflare em silêncio.
  calls.length = 0;
  const blocked = await api(`/api/projects/${proj.id}/nodes/${anode.id}/generate`, { prompt: 'sem pedir nuvem' });
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body).slice(0, 300));
  assert.equal(blocked.body.blocked, true);
  assert.match(blocked.body.error, /SAPI|nuvem/);
  assert.equal(calls.filter((c) => c.path.endsWith('melotts')).length, 0, 'a Cloudflare não é chamada sem pedido');

  // 6) Composer em modo Imagem -> Cloudflare, ativo .jpg e nó de Imagem no Canvas.
  calls.length = 0;
  const started = await api('/api/local-runs', { prompt: 'uma xícara azul', mode: 'Imagem' });
  assert.equal(started.status, 202, JSON.stringify(started.body).slice(0, 200));
  const done = await waitRun(started.body.run.id);
  assert.equal(done.state, 'succeeded', JSON.stringify(done).slice(0, 400));
  assert.equal(done.route.providerId, 'cloudflare');
  assert.match(done.asset.name, /\.jpg$/);
  const project = await fetch(`${base}/api/projects/${done.projectId}`).then((r) => r.json());
  assert.ok(project.canvas.nodes.some((n) => n.type === 'Imagem' && n.assetId === done.assetId));
  noSecret(done);

  // 7) Composer em modo Áudio: SAPI por padrão (sem SAPI -> bloqueio explicando o opt-in); com voiceSource:\"cloud\" usa a melotts.
  const plainAudio = await api('/api/local-runs', { prompt: 'bom dia', mode: 'Áudio' });
  assert.equal(plainAudio.status, 202);
  const plainDone = await waitRun(plainAudio.body.run.id);
  assert.equal(plainDone.state, 'blocked', JSON.stringify(plainDone).slice(0, 300));
  assert.match(plainDone.error, /SAPI/); assert.equal(plainDone.assetId, null);
  calls.length = 0;
  const cloudAudio = await api('/api/local-runs', { prompt: 'bom dia', mode: 'Áudio', voiceSource: 'cloud' });
  assert.equal(cloudAudio.status, 202, JSON.stringify(cloudAudio.body).slice(0, 200));
  const cloudDone = await waitRun(cloudAudio.body.run.id);
  assert.equal(cloudDone.state, 'succeeded', JSON.stringify(cloudDone).slice(0, 400));
  assert.equal(cloudDone.voiceEngine, 'cloud');
  assert.equal(cloudDone.route.providerId, 'cloudflare');
  assert.equal(cloudDone.asset.mime, 'audio/wav');
  assert.equal(calls.filter((c) => c.path.endsWith('melotts')).length, 1);

  // 8) A rota de estado do composer mostra a opção de nuvem e mantém SAPI como padrão.
  const audioMode = await api('/api/composer/audio-mode');
  assert.equal(audioMode.body.cloudVoice.defaultEngine, 'sapi');
  assert.equal(audioMode.body.cloudVoice.configured, true);
  assert.equal(audioMode.body.cloudVoice.model, '@cf/myshell-ai/melotts');
  noSecret(audioMode.body);

  // 9) Vídeo: com a NovAI na pilha, prompt curto é recusado (sem chamada); sem provedor de vídeo, segue PENDING (501).
  calls.length = 0;
  const shortVideo = await api('/api/local-runs', { prompt: 'um vídeo', mode: 'Vídeo' });
  assert.equal(shortVideo.status, 400);
  assert.match(shortVideo.body.error, /at least 15 characters/);
  assert.equal(calls.length, 0);
  const withoutVideo = await api('/api/free-router/config', { config: { ...status.body.config, providers: status.body.config.providers.filter((x) => x.id !== 'novai') } });
  assert.equal(withoutVideo.status, 200, JSON.stringify(withoutVideo.body).slice(0, 200));
  const video = await api('/api/local-runs', { prompt: 'um vídeo de teste com mais de quinze caracteres', mode: 'Vídeo' });
  assert.equal(video.status, 501);
  assert.equal(video.body.pending, true);
  assert.equal(calls.length, 0);
  // Restaura a pilha completa para o teste seguinte.
  assert.equal((await api('/api/free-router/preset/stack', {})).status, 200);

  // 10) Cloudflare recusa (401): a imagem cai para o Omni flux.2-klein e o provedor sai de rotação.
  cfMode = 'auth401'; calls.length = 0;
  const fallback = await api(`/api/projects/${proj.id}/nodes/${inode.id}/generate`, { prompt: 'outra imagem' });
  assert.equal(fallback.status, 200, JSON.stringify(fallback.body).slice(0, 300));
  assert.equal(fallback.body.providerId, 'omni-router');
  assert.ok(calls.some((c) => c.path === '/omni/v1/images/generations'));
  const after = await api('/api/free-router/config');
  assert.ok(after.body.availability.some((e) => e.providerId === 'cloudflare' && e.kind === 'auth'), 'cache marca a Cloudflare como indisponível');
  cfMode = 'ok';
  console.log('cloudflare_routes: ok (pilha, nó Imagem/Texto/Áudio, composer imagem/áudio opt-in, vídeo PENDING, reserva Omni em 401)');
} finally {
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
