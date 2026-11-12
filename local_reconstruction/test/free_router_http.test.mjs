import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-free-router-'));
process.env.PIPPIT_LOCAL_DATA = dataDir;
process.env.PIPPIT_LLM = 'off';
const requests = []; let nim429 = false;
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (chunk) => chunks.push(chunk)); req.on('end', () => {
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); requests.push({ path: req.url, auth: req.headers.authorization, googleKey: req.headers['x-goog-api-key'], body });
    if (req.url === '/ollama/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'resposta-Ollama-fake' } }] });
    if (req.url === '/nim/v1/chat/completions') { if (req.headers.authorization !== 'Bearer fake-nim-key') return json(res, 401, { error: 'auth' }); if (nim429) return json(res, 429, { error: 'quota exceeded' }); return json(res, 200, { choices: [{ message: { content: 'resposta-NIM-fake' } }] }); }
    if (req.url === '/gemini/v1beta/models/gemini-mock:generateContent') { if (req.headers['x-goog-api-key'] !== 'fake-gemini-key') return json(res, 401, { error: 'auth' }); return json(res, 200, { candidates: [{ content: { parts: [{ text: 'resposta-Gemini-fake' }] } }] }); }
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
const { server: app } = await import('../app/server.mjs');
await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
try {
  const root = `http://127.0.0.1:${fake.address().port}`;
  const config = {
    version: 1, paidFallback: false,
    providers: [
      { id: 'ollama', enabled: true, baseUrl: `${root}/ollama/v1`, dailyLimit: 1, priority: 1, models: [{ id: 'ollama-mock', capabilities: ['text'] }] },
      { id: 'nvidia-nim', enabled: true, baseUrl: `${root}/nim/v1`, freeTierConfirmed: true, dailyLimit: 10, priority: 2, models: [{ id: 'nim-mock', capabilities: ['text'], freeTierConfirmed: true }] },
      { id: 'gemini', enabled: true, baseUrl: `${root}/gemini/v1beta`, freeTierConfirmed: true, dailyLimit: 10, priority: 3, models: [{ id: 'gemini-mock', capabilities: ['text'], freeTierConfirmed: true }] },
    ],
    taskPreferences: { text: ['ollama/ollama-mock', 'nvidia-nim/nim-mock', 'gemini/gemini-mock'] },
  };
  const saved = await api('/api/free-router/config', { config, secrets: { 'nvidia-nim': 'fake-nim-key', gemini: 'fake-gemini-key' } });
  assert.equal(saved.status, 200); assert.equal(saved.body.status.config.providers.find((p) => p.id === 'gemini').hasKey, true);
  const first = await api('/api/free-router/execute', { task: 'text', payload: { prompt: 'mock one' } });
  assert.equal(first.status, 200); assert.equal(first.body.text, 'resposta-Ollama-fake'); assert.equal(first.body.route.providerId, 'ollama');
  nim429 = true;
  const fallback = await api('/api/free-router/execute', { task: 'text', payload: { prompt: 'mock fallback' } });
  assert.equal(fallback.status, 200); assert.equal(fallback.body.text, 'resposta-Gemini-fake'); assert.equal(fallback.body.route.providerId, 'gemini');
  const status = await api('/api/free-router/config');
  assert.equal(status.body.config.providers.find((p) => p.id === 'nvidia-nim').quotaBlocked, true, 'HTTP 429 opens local quota gate for the day');
  assert.equal(status.body.config.providers.find((p) => p.id === 'ollama').usedToday, 1, 'local daily attempt limit is counted');
  const rejectedLlm = await api('/api/llm/config', { baseUrl: 'https://api.example.invalid/v1', model: 'paid-model', apiKey: 'must-not-be-accepted' });
  assert.equal(rejectedLlm.status, 403, 'generic cloud LLMs must use the free router');
  const localLlm = await api('/api/llm/config', { baseUrl: `${root}/ollama/v1`, model: 'mock-local', apiKey: 'ephemeral-llm-secret' }); assert.equal(localLlm.status, 200);
  const externalProvider = await api('/api/providers/image', { adapter: 'openai-images', baseUrl: 'https://api.example.invalid/v1', model: 'paid-image', apiKey: 'must-not-be-accepted' }); assert.equal(externalProvider.status, 403);
  const localProvider = await api('/api/providers/image', { adapter: 'openai-images', baseUrl: `${root}/ollama/v1`, model: 'local-image', apiKey: 'ephemeral-provider-secret' }); assert.equal(localProvider.status, 200);
  const db = fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8');
  assert.ok(!db.includes('fake-nim-key')); assert.ok(!db.includes('fake-gemini-key')); assert.ok(!db.includes('ephemeral-llm-secret')); assert.ok(!db.includes('ephemeral-provider-secret')); assert.ok(!db.includes('must-not-be-accepted')); assert.ok(!db.includes('authorization'));
  assert.ok(requests.some((x) => x.path === '/nim/v1/chat/completions' && x.auth === 'Bearer fake-nim-key'));
  assert.ok(requests.some((x) => x.path.includes('/gemini/v1beta/') && x.googleKey === 'fake-gemini-key'));
  const keyless = { version: 1, paidFallback: false, providers: [{ id: 'gemini', enabled: true, baseUrl: `${root}/gemini/v1beta`, freeTierConfirmed: true, dailyLimit: 3, models: [{ id: 'gemini-mock', capabilities: ['text'], freeTierConfirmed: true }] }], taskPreferences: { text: ['gemini/gemini-mock'] } };
  assert.equal((await api('/api/free-router/config', { config: keyless, secrets: { gemini: null } })).status, 200);
  const missingKey = await api('/api/free-router/execute', { task: 'text', payload: { prompt: 'no key' } }); assert.equal(missingKey.status, 503); assert.match(missingKey.body.error, /chave não configurada/); assert.equal(missingKey.body.blocked, true);
  const reset = await api('/api/reset', {}); assert.equal(reset.status, 200);
  const missing = await api('/api/free-router/execute', { task: 'text', payload: { prompt: 'blocked' } });
  assert.equal(missing.status, 503); assert.equal(missing.body.blocked, true);
  console.log('free_router_http.test.mjs: local fake Ollama, NVIDIA NIM and Gemini servers; fallback, quota limit and secret non-persistence passed');
} finally {
  await new Promise((resolve) => app.close(resolve)); await new Promise((resolve) => fake.close(resolve));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
