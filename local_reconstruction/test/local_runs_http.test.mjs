import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-local-runs-'));
process.env.PIPPIT_LOCAL_DATA = dataDir;
process.env.PIPPIT_LLM = 'off';
let requests = 0; let nimRequests = 0; let slow = false;
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (chunk) => chunks.push(chunk)); req.on('end', () => {
    requests++; if (req.url.startsWith('/nim/')) nimRequests++;
    const respond = () => { if (res.destroyed) return; json(res, 200, { choices: [{ message: { content: 'roteiro planejado pelo modelo falso' } }] }); };
    if (slow) setTimeout(respond, 1200); else respond();
  });
});
await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
const { server: app } = await import('../app/server.mjs');
await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const res = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const waitFor = async (url, predicate, timeout = 3000) => { const end = Date.now() + timeout; while (Date.now() < end) { const r = await api(url, undefined, 'GET'); if (predicate(r.body)) return r.body; await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error(`timeout awaiting ${url}`); };
try {
  const root = `http://127.0.0.1:${fake.address().port}/v1`;
  const config = { version: 1, paidFallback: false, providers: [
    { id: 'ollama', enabled: true, baseUrl: root, dailyLimit: 20, models: [{ id: 'fake-chat', capabilities: ['text'] }] },
    { id: 'nvidia-nim', enabled: true, baseUrl: `${root}/../nim/v1`, freeTierConfirmed: true, dailyLimit: 20, models: [{ id: 'nim-fake', capabilities: ['text'], freeTierConfirmed: true }] },
  ], taskPreferences: { text: ['ollama/fake-chat', 'nvidia-nim/nim-fake'] } };
  assert.equal((await api('/api/free-router/config', { config, secrets: { 'nvidia-nim': 'fake-nim-key' } })).status, 200);
  const created = await api('/api/local-runs', { prompt: 'Crie um roteiro curto sobre uma viagem de trem.' });
  assert.equal(created.status, 202); const id = created.body.run.id;
  const terminal = await waitFor(`/api/local-runs/${id}`, (run) => ['succeeded', 'failed', 'blocked', 'canceled'].includes(run.state));
  assert.equal(terminal.state, 'succeeded'); assert.equal(terminal.result, 'roteiro planejado pelo modelo falso');
  assert.equal(terminal.route.providerId, 'ollama');
  const response = await fetch(`${base}/api/local-runs/${id}/events`); const stream = await response.text();
  assert.match(stream, /event:state/); assert.match(stream, /"state":"succeeded"/);
  const seenStates = [...stream.matchAll(/data:(\{[^\n]+\})/g)].map((match) => JSON.parse(match[1]).state);
  assert.deepEqual(seenStates.slice(-3), ['queued', 'running', 'succeeded'], 'SSE emits ordered lifecycle states and replays them to subscribers');
  const project = await api(`/api/projects/${terminal.projectId}`, undefined, 'GET');
  assert.equal(project.status, 200); assert.equal(project.body.chats[0].messages.length, 2, 'prompt and response are saved to project chat history');
  assert.equal(project.body.canvas.nodes.length, 2, 'source and result are represented on Canvas'); assert.equal(project.body.canvas.edges.length, 1);
  assert.equal(requests, 1);

  slow = true;
  const cancelCreated = await api('/api/local-runs', { prompt: 'Planeje outra ideia e permita cancelamento durante execução.' });
  const cancelId = cancelCreated.body.run.id;
  const deadline = Date.now() + 2000; while (requests < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(requests >= 2, 'fake provider request started');
  const canceled = await api(`/api/local-runs/${cancelId}/cancel`, {});
  assert.equal(canceled.status, 200); assert.equal(canceled.body.run.state, 'canceled');
  await new Promise((resolve) => setTimeout(resolve, 80));
  const finalCancel = await api(`/api/local-runs/${cancelId}`, undefined, 'GET'); assert.equal(finalCancel.body.state, 'canceled'); assert.equal(finalCancel.body.result, null);
  assert.equal(nimRequests, 0, 'an aborted request must not fall back to another free candidate');
  assert.equal((await api(`/api/local-runs/${cancelId}/cancel`, {})).status, 409, 'terminal runs cannot be canceled again');
  assert.equal((await api('/api/free-router/config', { config: { version: 1, paidFallback: false, providers: [], taskPreferences: {} } })).status, 200);
  const blockedCreated = await api('/api/local-runs', { prompt: 'Bloqueie quando não houver modelo gratuito configurado.' });
  const blocked = await waitFor(`/api/local-runs/${blockedCreated.body.run.id}`, (run) => ['blocked', 'failed', 'succeeded', 'canceled'].includes(run.state));
  assert.equal(blocked.state, 'blocked'); assert.match(blocked.error, /Nenhum modelo configurado/);
  const db = fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'); assert.ok(!db.includes('fake-nim-key')); assert.ok(!db.includes('apiKey')); assert.ok(!db.includes('token'));
  console.log('local_runs_http.test.mjs: composer task routed to fake Ollama; SSE replay, Canvas/history persistence, and active cancellation passed');
} finally {
  await new Promise((resolve) => app.close(resolve)); await new Promise((resolve) => fake.close(resolve));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
