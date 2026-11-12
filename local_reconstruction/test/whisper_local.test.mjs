import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-whisper-local-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const originalFetch = globalThis.fetch; globalThis.fetch = async () => { throw new Error('external network forbidden in Whisper test'); };
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
const json = async (url, body, method = 'POST') => { const response = await originalFetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; };
try {
  const assetResponse = await originalFetch(base + '/api/assets', { method: 'POST', headers: { 'x-file-name': 'local-audio-test.wav', 'content-type': 'audio/wav' }, body: Buffer.from('fake-local-audio-fixture') });
  const asset = await assetResponse.json(); const editor = await json('/api/editor', {}); assert.equal(editor.status, 200);
  await json(`/api/editor/${editor.body.id}`, { clips: [{ assetId: asset.id, in: 0, out: 3 }] }, 'PUT');
  const status = (await json('/api/llm/status', undefined, 'GET')).body;
  assert.equal(status.whisperFilter, media.whisperAvailable()); assert.equal(status.whisperModel, null);
  const result = await json(`/api/editor/${editor.body.id}/captions-auto`, {});
  assert.equal(result.status, 501); assert.equal(result.body.blocked, true); assert.match(result.body.error, /filtro whisper|modelo Whisper/);
  assert.equal((await json('/api/llm/config', { whisperModel: path.join(tmp, 'missing-ggml.bin') })).status, 400);
  assert.ok(!fs.existsSync(path.join(tmp, 'missing-ggml.bin')), 'no model is downloaded automatically');
  assert.ok(!fs.readFileSync(path.join(tmp, 'db.json'), 'utf8').includes('missing-ggml.bin'), 'invalid model path is not saved');
  console.log(`whisper_local.test.mjs: local-only transcription setup; filter=${status.whisperFilter}; explicit HTTP 501 without a local model/runtime; no downloads or network`);
} finally {
  globalThis.fetch = originalFetch; await new Promise((resolve) => server.close(resolve)); fs.rmSync(tmp, { recursive: true, force: true });
}
