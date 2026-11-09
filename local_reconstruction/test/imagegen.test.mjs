// Geração de imagem por provedor do usuário (API compatível com OpenAI) contra um servidor de mentira: b64_json e url, erros, chave, e o nó Imagem do canvas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-img-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs'); const { generateImage, SIZES } = await import('../src/imagegen.mjs');
if (!media.available()) { console.log('ffmpeg ausente: teste ignorado'); process.exit(0); }
const png = path.join(tmp, 'f.png'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=256x448:rate=1', '-frames:v', '1', png]).status, 0); const pngBuf = fs.readFileSync(png);
let mode = 'b64'; const seen = [];
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    if (req.url === '/img.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(pngBuf); }
    seen.push({ auth: req.headers.authorization, url: req.url, body: JSON.parse(b || '{}') });
    if (mode === 'err') { res.writeHead(401, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'chave inválida' } })); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [mode === 'url' ? { url: 'http://127.0.0.1:5214/img.png' } : { b64_json: pngBuf.toString('base64') }] }));
  });
});
await new Promise((r) => mock.listen(5214, '127.0.0.1', r)); const baseUrl = 'http://127.0.0.1:5214/v1';
// cliente
let buf = await generateImage({ baseUrl, model: 'm', apiKey: 'K', prompt: 'uma maçã', ratio: '16:9' }); assert.ok(buf.equals(pngBuf)); assert.equal(seen[0].auth, 'Bearer K'); assert.equal(seen[0].url, '/v1/images/generations'); assert.equal(seen[0].body.size, SIZES['16:9']); assert.equal(seen[0].body.response_format, 'b64_json'); assert.equal(seen[0].body.n, 1);
mode = 'url'; buf = await generateImage({ baseUrl, model: 'm', prompt: 'uma maçã' }); assert.ok(buf.equals(pngBuf), 'baixa a url retornada');
mode = 'err'; await assert.rejects(generateImage({ baseUrl, model: 'm', prompt: 'x y z' }), /HTTP 401.*chave inválida/); await assert.rejects(generateImage({ baseUrl, prompt: 'x y z' }), /não configurado/); await assert.rejects(generateImage({ baseUrl, model: 'm', prompt: ' ' }), /prompt vazio/);
// nó Imagem do canvas
const PORT = 5215; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const proj = (await post('/api/projects', { type: 'canvas' })).body; const node = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Imagem' })).body;
let g = await post(`/api/projects/${proj.id}/nodes/${node.id}/generate`, { prompt: 'uma maçã vermelha' }); assert.equal(g.status, 409, 'sem provedor continua bloqueado'); assert.equal(g.body.creditsCharged, 0);
assert.equal((await post('/api/image-provider', { baseUrl: 'ftp://x' })).status, 400); mode = 'b64'; await post('/api/image-provider', { baseUrl, model: 'gpt-image-teste', apiKey: 'segredo' });
const st = (await j('/api/image-provider')).body; assert.equal(st.configured, true); assert.equal(st.hasKey, true); assert.ok(!JSON.stringify(st).includes('segredo')); assert.ok(!JSON.stringify((await j('/api/state')).body).includes('segredo'), 'a chave não aparece no estado');
g = await post(`/api/projects/${proj.id}/nodes/${node.id}/generate`, { prompt: 'uma maçã vermelha', ratio: '9:16' }); assert.equal(g.status, 200, JSON.stringify(g.body)); assert.equal(g.body.asset.kind, 'image'); assert.equal(g.body.asset.width, 256); assert.equal(g.body.asset.height, 448); assert.match(g.body.provider, /gpt-image-teste/);
const nd = (await j(`/api/projects/${proj.id}`)).body.canvas.nodes.find((n) => n.id === node.id); assert.equal(nd.assetId, g.body.asset.id); assert.ok(nd.tools.every((t) => t.enabled));
mode = 'err'; g = await post(`/api/projects/${proj.id}/nodes/${node.id}/generate`, { prompt: 'outra imagem' }); assert.equal(g.status, 502); assert.match(g.body.error, /chave inválida/);
assert.equal((await post(`/api/projects/${proj.id}/nodes/${node.id}/generate`, { prompt: ' ' })).status, 400);
console.log('OK imagegen: cliente (b64/url/erros/chave) e nó Imagem com provedor do usuário'); mock.close(); server.close(); process.exit(0);
