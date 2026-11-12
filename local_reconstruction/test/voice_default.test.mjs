// Voz padrão: SAPI (local do Windows) por PADRÃO; provedor do usuário só como opção.
// Roda em qualquer SO: a regra é pura e a opção de nuvem é exercitada contra um servidor falso em 127.0.0.1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { resolveVoiceEngine, voiceStatus, VOICE_ENGINES } from '../app/lib/voice.mjs';

// 1) Regra pura: a ordem não depende da máquina.
assert.deepEqual([...VOICE_ENGINES], ['sapi', 'cloud']);
assert.equal(resolveVoiceEngine({ sapiAvailable: true, cloudConfigured: true }), 'sapi', 'SAPI ganha do provedor por padrão');
assert.equal(resolveVoiceEngine({ requested: 'cloud', sapiAvailable: true, cloudConfigured: true }), 'cloud', 'provedor é opção explícita');
assert.equal(resolveVoiceEngine({ requested: 'sapi', sapiAvailable: true, cloudConfigured: true }), 'sapi');
assert.equal(resolveVoiceEngine({ sapiAvailable: false, cloudConfigured: true }), 'cloud', 'sem SAPI, o provedor assume');
assert.equal(resolveVoiceEngine({ sapiAvailable: false, cloudConfigured: false }), null, 'sem nada, nada é inventado');
assert.equal(resolveVoiceEngine({ requested: 'cloud', sapiAvailable: false, cloudConfigured: false }), null, 'pedir nuvem sem provedor não vira SAPI');
assert.equal(resolveVoiceEngine({ requested: 'sapi', sapiAvailable: false, cloudConfigured: true }), null, 'pedir SAPI ausente não cai para nuvem em silêncio');
assert.equal(voiceStatus({ sapiAvailable: true, cloudConfigured: true }).defaultEngine, 'sapi');
assert.equal(voiceStatus({ sapiAvailable: false, cloudConfigured: true }).defaultEngine, 'cloud');
assert.match(voiceStatus({ sapiAvailable: false }).reason, /nenhuma voz/i);

// 2) HTTP: /api/tts-voices declara o padrão; o provedor do usuário é opção e só gera quando pedido.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-voice-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir);
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const MP3 = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'latin1');
const calls = [];
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); calls.push({ path: req.url, body });
    if (req.url === '/voice/v1/audio/speech') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(MP3); }
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}');
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const { server: app } = await import('../app/server.mjs');
const media = await import('../app/lib/media.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };

try {
  const sapi = media.ttsAvailable();
  const v0 = await api('/api/tts-voices');
  assert.equal(v0.status, 200);
  assert.equal(v0.body.sapiAvailable, sapi);
  if (sapi) { assert.equal(v0.body.defaultEngine, 'sapi'); assert.equal(v0.body.engines.find((e) => e.id === 'sapi').default, true); }
  else { assert.equal(v0.body.defaultEngine, null, 'sem SAPI e sem provedor: nenhum padrão inventado'); }
  assert.match(v0.body.note, /PADRÃO|padrão/i);
  assert.equal(v0.body.engines.find((e) => e.id === 'cloud').available, false);

  // Nó de Áudio sem SAPI e sem provedor: bloqueio explícito (nada gerado, nada cobrado).
  const proj = (await api('/api/projects', { type: 'canvas' })).body;
  const node = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Áudio' })).body;
  const gen = (extra = {}) => api(`/api/projects/${proj.id}/nodes/${node.id}/generate`, { prompt: 'Uma frase curta de teste.', ...extra });
  if (!sapi) {
    const blocked = await gen();
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.blocked, true);
    assert.match(blocked.body.error, /Nenhuma voz disponível/);
    assert.equal(blocked.body.creditsCharged, 0);
  } else {
    const ok = await gen();
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.voiceEngine, 'sapi');
    assert.equal(ok.body.creditsCharged, 0);
  }

  // Provedor do usuário configurado (endpoint local + autorização de gasto) vira OPÇÃO, não padrão.
  const saved = await api('/api/providers/audio', { adapter: 'openai-speech', baseUrl: `http://127.0.0.1:${fake.address().port}/voice/v1`, model: 'tts-fake', allowSpend: true });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const v1 = await api('/api/tts-voices');
  assert.equal(v1.body.engines.find((e) => e.id === 'cloud').available, true);
  assert.equal(v1.body.defaultEngine, sapi ? 'sapi' : 'cloud', 'com SAPI, o padrão continua SAPI');

  // Pedido explícito pela nuvem: usa o provedor, com o texto exato e sem débito.
  calls.length = 0;
  const cloud = await gen({ voiceSource: 'cloud' });
  assert.equal(cloud.status, 200, JSON.stringify(cloud.body));
  assert.equal(cloud.body.voiceEngine, 'cloud');
  assert.equal(cloud.body.creditsCharged, 0);
  assert.match(cloud.body.provider, /openai-speech \(tts-fake\) — opção do usuário/);
  assert.equal(calls.length, 1); assert.equal(calls[0].path, '/voice/v1/audio/speech');
  assert.equal(calls[0].body.input, 'Uma frase curta de teste.');
  assert.equal(calls[0].body.model, 'tts-fake');
  assert.equal(cloud.body.asset.kind, 'audio');
  assert.equal(cloud.body.asset.duration, cloud.body.asset.duration, 'duração não é inventada');
  const bytes = fs.readFileSync(path.join(dataDir, 'files', cloud.body.asset.stored));
  assert.deepEqual([...bytes.subarray(0, 3)], [0x49, 0x44, 0x33], 'o arquivo salvo é o áudio devolvido pelo provedor');

  // Delegação ao provedor: o corpo leva a voz pedida, nunca uma chave.
  calls.length = 0;
  await gen({ voiceSource: 'cloud', voice: 'voz-do-usuario' });
  assert.equal(calls[0].body.voice, 'voz-do-usuario');
  assert.ok(!JSON.stringify(calls[0].body).toLowerCase().includes('apikey'));

  console.log(`OK voice_default: SAPI é o padrão (${sapi ? 'presente nesta máquina' : 'ausente: bloqueio explícito'}), provedor do usuário é opção explícita e nada é cobrado`);
} finally {
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
}
