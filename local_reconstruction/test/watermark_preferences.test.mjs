import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-watermark-pref-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const post = async (body) => {
  const response = await fetch(`${base}/api/preferences`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
};
try {
  let result = await post({ saveWithoutWatermark: true });
  assert.equal(result.status, 200); assert.equal(result.body.saveWithoutWatermark, true);
  let state = await (await fetch(`${base}/api/state`)).json(); assert.equal(state.settings.saveWithoutWatermark, true);
  result = await post({ saveWithoutWatermark: 'true' }); assert.equal(result.status, 400, 'only a boolean local preference is accepted');
  result = await post({ saveWithoutWatermark: false }); assert.equal(result.status, 200); assert.equal(result.body.saveWithoutWatermark, false);
  state = await (await fetch(`${base}/api/state`)).json(); assert.equal(state.settings.saveWithoutWatermark, false);
  const db = fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'); assert.match(db, /"saveWithoutWatermark"\s*:\s*false/); assert.doesNotMatch(db, /apiKey|token|cookie/i);
  console.log('watermark_preferences.test.mjs: local boolean preference persists; export effect remains UNOBSERVED; no secret fields');
} finally {
  await new Promise((resolve) => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true });
}
