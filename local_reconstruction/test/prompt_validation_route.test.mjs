// Validação de prompt de vídeo no servidor: mensagem observada em fail_reason (notes/protocol_contracts.md, run real de 22/10).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-prompt-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const MESSAGE = 'Your prompt must contain at least 15 characters. Please provide a more detailed description.';
const fake = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ operation: { id: 'op-mock' } })); }); });
await new Promise((x) => fake.listen(0, '127.0.0.1', x));
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
const post = async (url, body) => { const r = await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
try {
  const project = (await post('/api/projects', { type: 'canvas', title: 'prompt validation' })).body;
  const node = (await post(`/api/projects/${project.id}/nodes`, { type: 'Vídeo' })).body;
  const config = { version: 1, paidFallback: false, providers: [{ id: 'ollama', enabled: true, baseUrl: `http://127.0.0.1:${fake.address().port}`, dailyLimit: 3, models: [{ id: 'mock', capabilities: ['video-output'] }] }], taskPreferences: { video_generation: ['ollama/mock'] } };
  assert.equal((await post('/api/free-router/config', { config })).status, 200);

  const short = await post(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'video', prompt: '   curto   ' });
  assert.equal(short.status, 400);
  assert.equal(short.body.error, MESSAGE, 'mensagem precisa ser a observada no servidor');
  assert.equal(short.body.creditsCharged ?? 0, 0);

  const empty = await post(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'video', prompt: '   ' });
  assert.equal(empty.status, 400);

  const ok = await post(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'video', prompt: 'Um produto girando lentamente sobre fundo claro' });
  assert.notEqual(ok.status, 400, 'prompt com 15+ caracteres passa da validação');
  assert.notEqual(ok.body.error, MESSAGE);
  console.log('OK prompt_validation_route: 400 com a mensagem observada e 15+ caracteres liberados');
} finally {
  await new Promise((x) => server.close(x)); await new Promise((x) => fake.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
