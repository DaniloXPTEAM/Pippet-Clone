// Omni Router (serviço local do usuário em 127.0.0.1:20128) no roteador gratuito.
// Nenhuma chamada real: um servidor falso responde /chat/completions e /images/generations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { planFreeRoutes, omniRouterUnavailable, OMNI_ROUTER_UNAVAILABLE, normalizeLocalBase, sniffImageMime, validateFreeRouterConfig, publicFreeRouterConfig, clearAvailability, availabilitySnapshot } from '../src/free_router.mjs';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-omni-'));
process.env.PIPPIT_LOCAL_DATA = dataDir;
process.env.PIPPIT_LLM = 'off';
process.env.OMNIROUTER_API_KEY = 'fake-omni-key';

// JPEG mínimo (marcadores SOI/EOI) só para o teste de bytes; o roteador não decodifica imagem.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
const requests = [];
let mode = 'ok'; // ok | forbid
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    requests.push({ path: req.url, auth: req.headers.authorization, body });
    if (req.headers.authorization !== 'Bearer fake-omni-key') return json(res, 401, { error: 'missing bearer' });
    if (req.url === '/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto-do-omni-falso' } }] });
    if (req.url === '/v1/images/generations') {
      if (mode === 'forbid') return json(res, 403, { error: 'forbidden' });
      return json(res, 200, { data: [{ b64_json: JPEG.toString('base64') }] });
    }
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
const fakeBase = `http://127.0.0.1:${fake.address().port}/v1`;
process.env.OMNIROUTER_BASE_URL = fakeBase;

const { server: app } = await import('../app/server.mjs');
await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const waitRun = async (id) => {
  for (let i = 0; i < 200; i += 1) {
    const { body } = await api(`/api/local-runs/${id}`);
    if (!['queued', 'running'].includes(body.state)) return body;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('run não terminou');
};

try {
  // 1) Catálogo de modelos mortos: marcados INDISPONÍVEL sem derrubar o roteador e sem inventar dados.
  assert.deepEqual(OMNI_ROUTER_UNAVAILABLE.map((x) => x.modelId), ['nvidia/flux.1-schnell', 'huggingface/FLUX.1-schnell', 'gemini/imagen-4.0', 'huggingface/Kokoro-82M', 'veo-free/veo']);
  assert.equal(omniRouterUnavailable('nvidia/flux.1-schnell', 'image_generation')?.kind, 'timeout');
  assert.equal(omniRouterUnavailable('veo-free/veo', 'video_generation')?.kind, 'timeout');
  assert.equal(omniRouterUnavailable('nvidia/black-forest-labs/flux.2-klein-4b'), null, 'o modelo bom não é marcado');

  // 2) localhost nunca é aceito: normaliza para 127.0.0.1 e a validação recusa a base crua.
  assert.equal(normalizeLocalBase('http://localhost:20128/v1'), 'http://127.0.0.1:20128/v1');
  assert.ok(validateFreeRouterConfig({ paidFallback: false, providers: [{ id: 'omni-router', enabled: true, baseUrl: 'http://localhost:20128/v1', models: [] }] }).some((e) => /localhost/.test(e)));

  // 3) Preset: um clique configura o Omni (base real, texto auto/best-free, imagem flux.2-klein, timeout >= 120 s).
  delete process.env.OMNIROUTER_BASE_URL; // o preset parte do padrão real, não do servidor falso
  const preset = await api('/api/free-router/preset/omni', {});
  assert.equal(preset.status, 200, JSON.stringify(preset.body));
  assert.equal(preset.body.provider.baseUrl, 'http://127.0.0.1:20128/v1');
  assert.deepEqual(preset.body.provider.models.map((m) => m.id), ['auto/best-free', 'nvidia/black-forest-labs/flux.2-klein-4b']);
  assert.ok(preset.body.provider.timeoutMs >= 120_000, 'timeout local precisa ser >= 120 s');
  assert.equal(preset.body.hasKey, true);
  assert.ok(!JSON.stringify(preset.body).includes('fake-omni-key'), 'nenhuma resposta pode conter a chave');
  // A base do preset é a real; para o teste apontamos a configuração salva (e a env) para o servidor falso.
  process.env.OMNIROUTER_BASE_URL = fakeBase;
  const saved = await api('/api/free-router/config', { config: { version: 1, paidFallback: false, providers: [{ ...publicFreeRouterConfig({ providers: [preset.body.provider] }).providers[0], baseUrl: fakeBase }], taskPreferences: {} } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));

  // 4) Texto: /chat/completions com modelo auto/best-free e Bearer da env.
  clearAvailability();
  const text = await api('/api/free-router/execute', { task: 'text', payload: { prompt: 'oi' } });
  assert.equal(text.status, 200, JSON.stringify(text.body));
  assert.equal(text.body.text, 'texto-do-omni-falso');
  assert.equal(text.body.route.providerId, 'omni-router');
  assert.equal(text.body.route.modelId, 'auto/best-free');
  const textReq = requests.find((r) => r.path === '/v1/chat/completions');
  assert.equal(textReq.body.model, 'auto/best-free');
  assert.equal(textReq.auth, 'Bearer fake-omni-key');
  assert.ok(!JSON.stringify(text.body).includes('fake-omni-key'));

  // 5) Imagem no roteador: flux.2-klein, b64_json e mime lido dos bytes (JPEG).
  const img = await api('/api/free-router/execute', { task: 'image_generation', payload: { prompt: 'uma xícara' } });
  assert.equal(img.status, 200, JSON.stringify(img.body));
  assert.equal(img.body.route.modelId, 'nvidia/black-forest-labs/flux.2-klein-4b');
  assert.equal(img.body.mimeType, 'image/jpeg');
  assert.equal(sniffImageMime(JPEG), 'image/jpeg');
  assert.equal(sniffImageMime(Buffer.from('nope')), null);

  // 6) Composer em modo Imagem -> /api/local-runs grava ativo .jpg e nó de Imagem no Canvas.
  const started = await api('/api/local-runs', { prompt: 'uma xícara azul', mode: 'Imagem' });
  assert.equal(started.status, 202, JSON.stringify(started.body));
  assert.equal(started.body.run.task, 'image_generation');
  const done = await waitRun(started.body.run.id);
  assert.equal(done.state, 'succeeded', JSON.stringify(done));
  assert.equal(done.asset.kind, 'image');
  assert.match(done.asset.name, /\.jpg$/);
  const stored = path.join(dataDir, 'files', done.asset.stored);
  assert.deepEqual([...fs.readFileSync(stored).subarray(0, 3)], [0xff, 0xd8, 0xff], 'o arquivo salvo é JPEG de verdade');
  const project = (await fetch(`${base}/api/projects/${done.projectId}`).then((r) => r.json()));
  assert.ok(project.canvas.nodes.some((n) => n.type === 'Imagem' && n.assetId === done.assetId), 'o nó de Imagem aponta para o ativo gerado');

  // 6b) Nó de Imagem do Canvas usa o mesmo adaptador: gera, grava .jpg e habilita o nó.
  const proj = (await api('/api/projects', { type: 'canvas' })).body;
  const inode = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Imagem' })).body;
  assert.equal(inode.panel.kind, 'image');
  const gen = await api(`/api/projects/${proj.id}/nodes/${inode.id}/generate`, { prompt: 'um farol ao entardecer' });
  assert.equal(gen.status, 200, JSON.stringify(gen.body));
  assert.equal(gen.body.providerId, 'omni-router');
  assert.equal(gen.body.creditsCharged, 0);
  assert.match(gen.body.asset.name, /\.jpg$/);
  const genFile = fs.readFileSync(path.join(dataDir, 'files', gen.body.asset.stored));
  assert.deepEqual([...genFile.subarray(0, 3)], [0xff, 0xd8, 0xff], 'nó de Imagem grava JPEG real');
  const after = (await fetch(`${base}/api/projects/${proj.id}`).then((r) => r.json())).canvas.nodes.find((n) => n.id === inode.id);
  assert.equal(after.assetId, gen.body.asset.id);
  assert.ok(after.tools.every((x) => x.enabled));

  // 7) Vídeo segue PENDING (recusado sem gerar nada); voz do Omni segue PENDING, mas a voz LOCAL (SAPI)
  // é o padrão da instalação e pode assumir — em nenhum dos casos o Omni é chamado.
  const before = requests.length;
  const video = await api('/api/local-runs', { prompt: 'teste', mode: 'Vídeo' });
  assert.equal(video.status, 501, JSON.stringify(video.body));
  assert.equal(video.body.pending, true); assert.match(video.body.error, /PENDING/);
  const voiceRun = await api('/api/local-runs', { prompt: 'teste de voz', mode: 'Áudio' });
  assert.equal(voiceRun.status, 202, JSON.stringify(voiceRun.body));
  const voiceDone = await waitRun(voiceRun.body.run.id);
  if (voiceDone.state === 'succeeded') { assert.equal(voiceDone.voiceEngine, 'sapi'); assert.match(voiceDone.route.providerId, /sapi/); }
  else { assert.equal(voiceDone.state, 'blocked'); assert.match(voiceDone.error, /PENDING|SAPI/); assert.equal(voiceDone.assetId, null); }
  assert.equal(requests.length, before, 'vídeo/voz PENDING não pode chamar o Omni');

  // 8) 403 na imagem: falha registrada (auth) e modelo sai de rotação, sem derrubar o roteador.
  mode = 'forbid'; clearAvailability();
  const deny = await api('/api/free-router/execute', { task: 'image_generation', payload: { prompt: 'x' } });
  assert.equal(deny.status, 401, JSON.stringify(deny.body));
  assert.match(String(deny.body.error), /autentica|403/i);
  assert.ok(availabilitySnapshot().some((e) => e.providerId === 'omni-router' && e.kind === 'auth'));
  mode = 'ok';

  // 9) Modelos mortos nunca entram na rota, mesmo se o usuário colar todos na configuração.
  clearAvailability();
  const withDead = { version: 1, paidFallback: false, providers: [{ id: 'omni-router', enabled: true, baseUrl: fakeBase, models: [
    { id: 'nvidia/flux.1-schnell', capabilities: ['image-output'] },
    { id: 'huggingface/FLUX.1-schnell', capabilities: ['image-output'] },
    { id: 'gemini/imagen-4.0', capabilities: ['image-output'] },
    { id: 'nvidia/black-forest-labs/flux.2-klein-4b', capabilities: ['image-output'] },
  ] }], taskPreferences: {} };
  assert.equal(validateFreeRouterConfig(withDead).length, 0);
  const plan = planFreeRoutes('image_generation', withDead);
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.routes.map((r) => r.modelId), ['nvidia/black-forest-labs/flux.2-klein-4b'], 'só o modelo confirmado é roteado');
  console.log('omni_router: ok (texto, imagem, composer, PENDING de vídeo/voz, modelos mortos, 403)');
} finally {
  await new Promise((resolve) => app.close(resolve));
  await new Promise((resolve) => fake.close(resolve));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
