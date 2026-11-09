// Menu "…" dos ativos (Baixar, Selecionar, Adicionar personagem, Adicionar produto, Vincular produto existente, Excluir): API de personagens/produtos/vínculos/uso/exclusão.
// Os diálogos de "personagem/produto" do Pippit nunca foram abertos: as regras testadas aqui são as LOCAIS declaradas no código (só imagens, nome ≤60, sem nome repetido).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-am-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); assert.ok(media.available());
const { server } = await import('../app/server.mjs'); const PORT = 5201; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), put = send('PUT'), patch = send('PATCH'), del = send('DELETE');
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return fs.readFileSync(out); };
const up = async (buf, name, type) => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': type, 'x-cat': 'upload' }, body: buf })).body;
const png = (n, c) => mk(['-f', 'lavfi', '-i', `color=c=${c}:s=320x320:d=1`, '-frames:v', '1'], path.join(tmp, n + '.png'));
const gabi = await up(png('gabi', 'red'), 'Gabi.png', 'image/png'), gabi2 = await up(png('gabi2', 'orange'), 'Gabi lado.png', 'image/png'), copo = await up(png('copo', 'blue'), 'Copo.png', 'image/png');
const vid = await up(mk(['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'v.mp4')), 'clipe.mp4', 'video/mp4'); assert.equal(gabi.kind, 'image'); assert.equal(vid.kind, 'video');

// personagem: nome padrão = nome do arquivo sem extensão; reaproveita se o ativo já é personagem; recusa vídeo, nome vazio/repetido, ativo inexistente
let r = await post(`/api/assets/${gabi.id}/character`, {}); assert.equal(r.status, 200); assert.equal(r.body.reused, false); assert.equal(r.body.character.name, 'Gabi'); assert.deepEqual(r.body.character.assetIds, [gabi.id]);
r = await post(`/api/assets/${gabi.id}/character`, { name: 'Outro nome' }); assert.equal(r.body.reused, true); assert.equal(r.body.character.name, 'Gabi', 'não duplica o personagem do mesmo ativo');
r = await post(`/api/assets/${gabi2.id}/character`, { name: 'gabi' }); assert.equal(r.status, 409); assert.match(r.body.error, /Já existe um personagem chamado "gabi"/);
r = await post(`/api/assets/${gabi2.id}/character`, { name: '   ' }); assert.equal(r.status, 400); assert.match(r.body.error, /Digite um nome/);
r = await post(`/api/assets/${vid.id}/character`, { name: 'Vídeo' }); assert.equal(r.status, 400); assert.match(r.body.error, /apenas imagens/);
r = await post('/api/assets/999999999/character', { name: 'X' }); assert.equal(r.status, 404);
r = await post(`/api/assets/${gabi2.id}/character`, { name: 'x'.repeat(100) }); assert.equal(r.status, 200); assert.equal(r.body.character.name.length, 60, 'nome limitado a 60'); await del(`/api/characters/${r.body.character.id}`);
// produto + vincular produto existente
r = await post(`/api/assets/${copo.id}/product`, { name: 'Copo térmico' }); assert.equal(r.status, 200); const prod = r.body.product; assert.deepEqual(prod.assetIds, [copo.id]);
assert.equal((await post(`/api/assets/${gabi2.id}/link-product`, { productId: 'nao-existe' })).status, 404); r = await post(`/api/assets/${gabi2.id}/link-product`, { productId: prod.id }); assert.equal(r.status, 200); assert.equal(r.body.reused, false); assert.deepEqual(r.body.product.assetIds, [copo.id, gabi2.id]);
r = await post(`/api/assets/${gabi2.id}/link-product`, { productId: prod.id }); assert.equal(r.body.reused, true); assert.equal((await j('/api/products')).body[0].assetIds.length, 2, 'vínculo repetido não duplica');
assert.equal((await post(`/api/assets/${vid.id}/link-product`, { productId: prod.id })).status, 400);
const lists = { c: (await j('/api/characters')).body, p: (await j('/api/products')).body }; assert.equal(lists.c.length, 1); assert.equal(lists.p[0].assets.length, 2); assert.equal(lists.p[0].assets[0].name, 'Copo.png');
// uso do ativo: personagem, produto, nó do Canvas e projeto de edição
const cv = (await post('/api/projects', { type: 'canvas' })).body; const node = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Imagem', title: 'Cena' })).body; await patch(`/api/projects/${cv.id}/nodes/${node.id}`, { assetId: gabi.id });
const ed = (await post('/api/editor')).body; await put(`/api/editor/${ed.id}`, { ratio: 'original', clips: [{ assetId: vid.id, in: 0, out: 1 }] });
let u = (await j(`/api/assets/${gabi.id}/usage`)).body; assert.deepEqual(u.characters.map((x) => x.name), ['Gabi']); assert.equal(u.nodes.length, 1); assert.match(u.nodes[0].title, /Cena/); assert.deepEqual(u.products, []);
u = (await j(`/api/assets/${vid.id}/usage`)).body; assert.equal(u.editors.length, 1); assert.equal((await j('/api/assets/999999999/usage')).status, 404);
u = (await j(`/api/assets/${gabi2.id}/usage`)).body; assert.deepEqual(u.products.map((x) => x.name), ['Copo térmico']);
// remover o cadastro NÃO apaga as imagens
const tmpChar = (await post(`/api/assets/${gabi2.id}/character`, { name: 'Temporário' })).body.character; assert.equal((await del(`/api/characters/${tmpChar.id}`)).status, 200); assert.ok((await j('/api/assets')).body.some((a) => a.id === gabi2.id), 'ativo continua'); assert.equal((await del(`/api/characters/${tmpChar.id}`)).status, 404);
// excluir ativo: limpa vínculos; produto com outra imagem sobrevive; personagem sem imagem deixa de existir; arquivo some do disco
const gabiFile = path.join(tmp, 'files', gabi.stored); assert.ok(fs.existsSync(gabiFile)); assert.equal((await del(`/api/assets/${gabi.id}`)).status, 200); assert.ok(!fs.existsSync(gabiFile), 'arquivo removido');
assert.deepEqual((await j('/api/characters')).body, [], 'personagem sem imagem foi removido'); assert.ok((await j('/api/assets')).body.every((a) => a.id !== gabi.id));
assert.equal((await del(`/api/assets/${copo.id}`)).status, 200); let pp = (await j('/api/products')).body; assert.equal(pp.length, 1); assert.deepEqual(pp[0].assetIds, [gabi2.id], 'produto mantém a outra imagem');
assert.equal((await del(`/api/assets/${gabi2.id}`)).status, 200); assert.deepEqual((await j('/api/products')).body, [], 'produto sem imagens some');
// persistência em disco
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')); assert.deepEqual(disk.characters, []); assert.deepEqual(disk.products, []);
console.log('OK assets_menu: personagem/produto/vincular (regras locais), uso do ativo, remover cadastro sem apagar imagens, exclusão limpa vínculos e disco'); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
