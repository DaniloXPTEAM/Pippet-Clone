// Linha 132 do inventário — modo Áudio do composer: o que foi observado, o que a instalação faz
// (voz local SAPI como padrão) e o que continua UNOBSERVED. Sem rede externa e sem chave.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-audio-mode-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server: app } = await import('../app/server.mjs');
const media = await import('../app/lib/media.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const waitRun = async (id) => { for (let i = 0; i < 200; i += 1) { const { body } = await api(`/api/local-runs/${id}`); if (!['queued', 'running'].includes(body.state)) return body; await new Promise((r) => setTimeout(r, 25)); } throw new Error('run não terminou'); };

try {
  const sapi = media.ttsAvailable();
  const st = await api('/api/composer/audio-mode');
  assert.equal(st.status, 200);
  assert.equal(st.body.menu.observedText, 'Choose an audio model and generate directly.');
  assert.deepEqual(st.body.menu.modeOptions, ['Agente', 'Vídeo', 'Imagem', 'Áudio']);
  assert.equal(st.body.local.implemented, true);
  assert.match(st.body.local.action, /mode: "audio"/);
  assert.equal(st.body.local.voice.defaultEngine, sapi ? 'sapi' : null, 'sem SAPI e sem provedor não há padrão inventado');
  assert.equal(st.body.observed.models.length, 2, 'dois modelos observados (adendo r19)'); assert.ok(st.body.observed.models.some((m) => m.name === 'Seed Audio 1.0')); assert.ok(st.body.observed.models.some((m) => m.name === 'Standard voice generation')); assert.ok(st.body.observed.models.every((m) => /reference audio for voice|crisp delivery/.test(m.description)), 'descricoes observadas'); assert.deepEqual(st.body.observed.sampleRatesHz, [8000, 16000, 24000, 32000, 44100, 48000]); assert.equal(st.body.observed.defaultSampleRateHz, 44100); assert.equal(st.body.observed.cost.credits, 17); assert.equal(st.body.observed.cost.listCredits, 34); assert.ok(st.body.observed.skillsButton.includes('oculto')); assert.deepEqual(st.body.unobserved, ['corpo da requisição de geração', 'SSE ao vivo']);
  assert.equal(st.body.externalCalls, 0); assert.equal(st.body.simulated, false);
  assert.equal(st.body.freeLocalProvider.enabled, true, 'r20: gerador gratuito LIGADO por padrão'); assert.equal(st.body.freeLocalProvider.reason, null);
  assert.match(st.body.note, /UNOBSERVED|nunca foram capturados/);

  const started = await api('/api/local-runs', { prompt: 'Bem-vindo ao teste do modo áudio.', mode: 'audio' });
  assert.equal(started.status, 202, JSON.stringify(started.body));
  assert.equal(started.body.run.task, 'audio_generation');
  const done = await waitRun(started.body.run.id);
  if (sapi) {
    assert.equal(done.state, 'succeeded', JSON.stringify(done));
    assert.equal(done.voiceEngine, 'sapi');
    assert.equal(done.asset.kind, 'audio');
    assert.match(done.asset.name, /\.wav$/);
    assert.ok(fs.statSync(path.join(dataDir, 'files', done.asset.stored)).size > 1000, 'o WAV tem conteúdo');
    const project = await fetch(`${base}/api/projects/${done.projectId}`).then((r) => r.json());
    assert.ok(project.canvas.nodes.some((n) => n.type === 'Áudio' && n.assetId === done.assetId), 'handoff: nó de Áudio no Canvas');
    assert.match(done.route.providerName, /SAPI/);
  } else {
    assert.equal(done.state, 'blocked', JSON.stringify(done));
    assert.match(done.error, /SAPI/); assert.match(done.error, /PENDING/);
    assert.equal(done.assetId, null, 'nada é salvo quando não há voz');
  }
  // r20: provedor FALSO (PIPPIT_TTS=fake) gera áudio determinístico em qualquer máquina
  process.env.PIPPIT_TTS = 'fake';
  const fake = await api('/api/local-runs', { prompt: 'Locução com provedor falso.', mode: 'audio' });
  assert.equal(fake.status, 202, JSON.stringify(fake.body));
  const fakeDone = await waitRun(fake.body.run.id);
  assert.equal(fakeDone.state, 'succeeded', JSON.stringify(fakeDone));
  assert.equal(fakeDone.asset.kind, 'audio');
  delete process.env.PIPPIT_TTS;
  // Vídeo continua PENDING e não cria tarefa.
  const before = (await api('/api/local-runs')).body.length;
  const vid = await api('/api/local-runs', { prompt: 'um vídeo', mode: 'video' });
  assert.equal(vid.status, 501); assert.equal(vid.body.pending, true);
  assert.equal((await api('/api/local-runs')).body.length, before);
  console.log(`OK composer_audio_mode: menu observado, voz ${sapi ? 'SAPI gera WAV e cria o nó no Canvas' : 'SAPI ausente bloqueia com motivo (sem asset)'}, custo/presets UNOBSERVED, vídeo PENDING`);
} finally { await new Promise((r) => app.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); }
