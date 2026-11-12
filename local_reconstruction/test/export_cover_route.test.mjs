// Capa do "Export settings": miniatura REAL do primeiro quadro (observado no Pippit), sem seletor livre de capa.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-cover-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const media = await import('../app/lib/media.mjs');
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
const j = async (url, o = {}) => { const r = await fetch(base + url, o); return { status: r.status, type: r.headers.get('content-type'), body: o.raw ? Buffer.from(await r.arrayBuffer()) : await r.json() }; };
try {
  if (!media.available()) { console.log('SKIP export_cover_route: ffmpeg/ffprobe indisponível neste ambiente'); process.exit(0); }
  const src = path.join(tmp, 'clipe.mp4'); media.generateLocalVideo(src, { seconds: 2, ratio: '16:9', color: '3366cc' });
  const asset = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'clipe.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(src) })).body;
  const ed = (await j('/api/editor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).body;
  const timeline = { ratio: '16:9', clips: [{ assetId: asset.id, in: 0, out: 2, start: 0 }], texts: [], captions: [], audio: [], background: { type: 'black' } };
  assert.equal((await j(`/api/editor/${ed.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(timeline) })).status, 200);

  const cover = await j(`/api/editor/${ed.id}/cover`, { raw: true });
  assert.equal(cover.status, 200); assert.equal(cover.type, 'image/png');
  assert.deepEqual([...cover.body.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'a capa é um PNG real do primeiro quadro');
  assert.ok(cover.body.length > 1000, 'PNG não é vazio');
  assert.equal((await j(`/api/editor/${ed.id}/cover`, { raw: true })).body.equals(cover.body), true, 'segunda chamada reaproveita a mesma miniatura');

  const missing = await j('/api/editor/999999/cover'); assert.equal(missing.status, 404);
  const empty = (await j('/api/editor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).body;
  assert.equal((await j(`/api/editor/${empty.id}/cover`)).status, 404, 'timeline vazia não tem capa');

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /id="excover"/, 'o diálogo mostra a miniatura');
  assert.match(ui, /\/api\/editor\/\$\{id\}\/cover/, 'a miniatura vem da rota local');
  assert.match(ui, /não abre seletor/, 'o diálogo registra que o clique não abre seletor (UNOBSERVED)');
  console.log('OK export_cover_route: PNG do primeiro quadro, cache local, 404 sem timeline e comportamento de capa registrado');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
