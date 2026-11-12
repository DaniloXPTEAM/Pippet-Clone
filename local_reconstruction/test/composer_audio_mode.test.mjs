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
  assert.equal(st.body.menu.observedText, 'Choose an audio model and generate directly');
  assert.deepEqual(st.body.menu.modeOptions, ['Agente', 'Vídeo', 'Imagem', 'Áudio']);
  assert.equal(st.body.local.implemented, true);
  assert.match(st.body.local.action, /mode: "audio"/);
  assert.equal(st.body.local.voice.defaultEngine, sapi ? 'sapi' : null, 'sem SAPI e sem provedor não há padrão inventado');
  assert.ok(st.body.unobserved.some((x) => /presets/i.test(x)) && st.body.unobserved.some((x) => /custo/i.test(x)) && st.body.unobserved.some((x) => /565447/.test(x)));
  assert.equal(st.body.externalCalls, 0); assert.equal(st.body.simulated, false);
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
  // Vídeo continua PENDING e não cria tarefa.
  const before = (await api('/api/local-runs')).body.length;
  const vid = await api('/api/local-runs', { prompt: 'um vídeo', mode: 'video' });
  assert.equal(vid.status, 501); assert.equal(vid.body.pending, true);
  assert.equal((await api('/api/local-runs')).body.length, before);
  console.log(`OK composer_audio_mode: menu observado, voz ${sapi ? 'SAPI gera WAV e cria o nó no Canvas' : 'SAPI ausente bloqueia com motivo (sem asset)'}, custo/presets UNOBSERVED, vídeo PENDING`);
} finally { await new Promise((r) => app.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); }
