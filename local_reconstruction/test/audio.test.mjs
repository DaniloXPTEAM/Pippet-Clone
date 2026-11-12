// Nó de Áudio com voz sintética local (SAPI, não-IA): só com provider local-ffmpeg; sem provider continua bloqueado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-au-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
if (!media.available() || !media.ttsAvailable()) { console.log('ffmpeg/SAPI ausente: teste ignorado'); process.exit(0); }
const PORT = 5200; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const v = (await j('/api/tts-voices')).body; assert.equal(v.available, true); assert.ok(v.voices.length >= 1);
const proj = (await post('/api/projects', { type: 'canvas' })).body; const an = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Áudio' })).body; assert.ok(an.panel && an.panel.kind === 'audio');
// Voz local (SAPI) é o PADRÃO desta instalação: gera sem precisar escolher provedor em Configurações.
let g = await post(`/api/projects/${proj.id}/nodes/${an.id}/generate`, { prompt: 'Hello from the local voice.' }); assert.equal(g.status, 200, JSON.stringify(g.body)); assert.equal(g.body.voiceEngine, 'sapi', 'SAPI é o padrão'); assert.equal(g.body.creditsCharged, 0);
assert.equal((await post(`/api/projects/${proj.id}/nodes/${an.id}/generate`, { prompt: '   ' })).status, 400);
// A opção explícita pela SAPI continua funcionando com o provider local selecionado.
await post('/api/settings', { provider: 'local-ffmpeg' });
g = await post(`/api/projects/${proj.id}/nodes/${an.id}/generate`, { prompt: 'Hello from the local voice.', voiceSource: 'sapi' }); assert.equal(g.status, 200, JSON.stringify(g.body)); assert.equal(g.body.voiceEngine, 'sapi');
g = await post(`/api/projects/${proj.id}/nodes/${an.id}/generate`, { prompt: 'Hello from the local voice. This is a test.', voice: v.voices[0], rate: 0 }); assert.equal(g.status, 200, JSON.stringify(g.body)); assert.equal(g.body.asset.kind, 'audio'); assert.ok(g.body.asset.duration > 1, 'duração ' + g.body.asset.duration); assert.equal(g.body.creditsCharged, 0);
const st = (await j(`/api/projects/${proj.id}`)).body.canvas.nodes.find((n) => n.id === an.id); assert.equal(st.assetId, g.body.asset.id); assert.ok(st.tools.every((t) => t.enabled));
const slow = await post(`/api/projects/${proj.id}/nodes/${an.id}/generate`, { prompt: 'Hello from the local voice. This is a test.', rate: -6 }); assert.ok(slow.body.asset.duration > g.body.asset.duration, 'rate menor = mais lento');
console.log('OK audio: voz local SAPI (não-IA) como padrão (sem provider), opção explícita, texto vazio e ritmo'); server.close(); process.exit(0);
