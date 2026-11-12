// UI do lote 2 em navegador real: menu "…" dos ativos (6 itens observados, personagem/produto/vincular, selecionar, excluir com confirmação), filtros/ordem/visualização,
// seletor "Ratio" do editor (7 opções observadas, persiste), Canvas -> Editor (botão no nó de vídeo, origem visível, recusa sem vídeo) e as 3 bolsas no diálogo de créditos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('lote2_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-l2-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); const { server } = await import('../app/server.mjs'); const PORT = 5202; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
import { shotsDir } from './support/shots.mjs'; const SHOTS = shotsDir(); // rodada 10: capturas fora da árvore versionada
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const patch = (p, b) => j(p, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return fs.readFileSync(out); };
const up = async (buf, name, type) => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': type, 'x-cat': 'upload' }, body: buf })).body;
const img1 = await up(mk(['-f', 'lavfi', '-i', 'color=c=red:s=320x320:d=1', '-frames:v', '1'], path.join(tmp, 'a.png')), 'Gabi.png', 'image/png'); const img2 = await up(mk(['-f', 'lavfi', '-i', 'color=c=blue:s=320x320:d=1', '-frames:v', '1'], path.join(tmp, 'b.png')), 'Copo.png', 'image/png');
const vid = await up(mk(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'v.mp4')), 'clipe.mp4', 'video/mp4');
const browser = await launchChromium(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') }); const menuLabels = async () => (await page.locator('.menu a').allInnerTexts()).map((x) => x.trim());

// ---- ativos
await page.goto(base + '/#/assets'); await page.waitForSelector('.tabs'); await page.click('.tabs button[data-t="Carregar histórico"]'); await page.waitForSelector('.asset');
assert.deepEqual((await page.locator('#afilters .chip').allInnerTexts()), ['Tudo', 'Imagens', 'Vídeos', 'Áudio'], 'filtros observados'); assert.equal(await page.locator('.asset').count(), 3);
await page.click('#afilters [data-f="video"]'); await page.waitForFunction(() => document.querySelectorAll('.asset').length === 1); await page.click('#afilters [data-f="all"]'); await page.waitForFunction(() => document.querySelectorAll('.asset').length === 3);
await page.click('#asort'); await page.waitForFunction(() => /Ascendente/.test(document.querySelector('#asort')?.textContent || '')); await page.click('#aview'); await page.waitForFunction(() => /Pequeno/.test(document.querySelector('#aview')?.textContent || '')); await page.click('#aview'); await page.waitForFunction(() => /Grande/.test(document.querySelector('#aview')?.textContent || ''));
const card = (name) => page.locator('.asset', { hasText: name }); await card('Gabi.png').locator('[data-m]').click(); await page.waitForSelector('.menu');
assert.deepEqual(await menuLabels(), ['Baixar', 'Selecionar', 'Adicionar personagem', 'Adicionar produto', 'Vincular produto existente', 'Excluir'], 'os 6 itens observados, na ordem'); assert.ok(await page.locator('.menu a.danger', { hasText: 'Excluir' }).count()); await shot('70_ativos_menu');
// adicionar personagem
await page.locator('.menu a', { hasText: 'Adicionar personagem' }).click(); await page.waitForSelector('#nm'); assert.equal(await page.inputValue('#nm'), 'Gabi'); await page.fill('#nm', ''); await page.click('#cyes'); assert.match(await page.locator('#nme').innerText(), /Digite um nome/); await page.fill('#nm', 'Gabi Heroína'); await page.click('#cyes');
await page.waitForFunction(() => /Personagem “Gabi Heroína” adicionado/.test(document.querySelector('#toast')?.textContent || '')); await page.click('.tabs button[data-t="Personagem"]'); await page.waitForSelector('.ent'); assert.match(await page.locator('.ent').first().innerText(), /Gabi Heroína[\s\S]*1 imagem/); await shot('71_personagem');
// produto + vincular produto existente
await page.click('.tabs button[data-t="Carregar histórico"]'); await page.waitForSelector('.asset'); await card('Copo.png').locator('[data-m]').click(); await page.locator('.menu a', { hasText: 'Adicionar produto' }).click(); await page.fill('#nm', 'Copo térmico'); await page.click('#cyes'); await page.waitForFunction(() => /Produto “Copo térmico” adicionado/.test(document.querySelector('#toast')?.textContent || ''));
await card('Gabi.png').locator('[data-m]').click(); await page.locator('.menu a', { hasText: 'Vincular produto existente' }).click(); await page.waitForSelector('input[name=pp]'); await page.check('input[name=pp]'); await page.click('#cyes'); await page.waitForFunction(() => /Vinculado ao produto “Copo térmico”/.test(document.querySelector('#toast')?.textContent || ''));
assert.equal((await j('/api/products')).body[0].assetIds.length, 2);
// vídeo não vira personagem (mensagem honesta)
await card('clipe.mp4').locator('[data-m]').click(); await page.locator('.menu a', { hasText: 'Adicionar personagem' }).click(); await page.waitForFunction(() => /Apenas imagens/.test(document.querySelector('#toast')?.textContent || ''));
// excluir exige confirmação e mostra o uso; cancelar mantém
await card('Gabi.png').locator('[data-m]').click(); await page.locator('.menu a.danger').click(); await page.waitForSelector('#cyes'); const txt = await page.locator('.modal').innerText(); assert.match(txt, /Excluir “Gabi.png”\?/); assert.match(txt, /personagem “Gabi Heroína”/); assert.match(txt, /produto “Copo térmico”/); assert.match(txt, /não pode ser desfeita/); await shot('72_confirmar_exclusao');
await page.click('#cno'); assert.equal(await card('Gabi.png').count(), 1, 'cancelar mantém o ativo'); assert.ok((await j('/api/assets')).body.some((a) => a.id === img1.id));
await card('Gabi.png').locator('[data-m]').click(); await page.locator('.menu a.danger').click(); await page.click('#cyes'); await page.waitForFunction(() => document.querySelectorAll('.asset').length === 2); assert.ok(!(await j('/api/assets')).body.some((a) => a.id === img1.id)); assert.deepEqual((await j('/api/characters')).body, []);
// selecionar: modo de seleção, contagem, cancelar
await card('Copo.png').locator('[data-m]').click(); await page.locator('.menu a', { hasText: 'Selecionar' }).click(); await page.waitForSelector('#selbar'); assert.match(await page.locator('#selbar').innerText(), /1 selecionado/); await page.locator('.asset', { hasText: 'clipe.mp4' }).locator('[data-sel]').check(); await page.waitForFunction(() => /2 selecionado/.test(document.querySelector('#selbar')?.textContent || '')); await page.click('#selX'); await page.waitForFunction(() => !document.querySelector('#selbar'));

// ---- editor: seletor Ratio
const ed = (await post('/api/editor')).body; await j(`/api/editor/${ed.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ratio: 'original', clips: [{ assetId: vid.id, in: 0, out: 2 }] }) });
await page.goto(base + '/#/editor/' + ed.id); await page.waitForSelector('#eratio'); assert.match(await page.locator('#eratio').innerText(), /Ratio: Original aspect ratio/); assert.match(await page.locator('#prev').getAttribute('style'), /aspect-ratio:\s*640 \/ 360/, 'Original = proporção do clipe');
await page.click('#eratio'); await page.waitForSelector('.menu'); const rl = await menuLabels(); assert.equal(rl.length, 7); assert.match(rl[0], /✓ Original aspect ratio/); assert.ok(rl[1].includes('16:9 — YouTube ads') && rl[2].includes('4:3 — LinkedIn ads, Facebook videos') && rl[3].trim() === '2:1' && rl[4].includes('9:16 — TikTok, TikTok ads, Instagram stories') && rl[5].includes('1:1 — Instagram posts') && rl[6].trim() === '3:4'); assert.equal(await page.locator('.menu hr').count(), 2, 'dois divisores como no Pippit'); await shot('73_editor_ratio');
await page.locator('.menu a', { hasText: '9:16' }).click(); await page.waitForFunction(() => /Ratio: 9:16/.test(document.querySelector('#eratio')?.textContent || '')); assert.match(await page.locator('#prev').getAttribute('style'), /aspect-ratio:\s*9 \/ 16/); assert.equal((await j(`/api/projects/${ed.id}`)).body.timeline.ratio, '9:16');
await page.reload(); await page.waitForSelector('#eratio'); assert.match(await page.locator('#eratio').innerText(), /Ratio: 9:16/, 'persistiu ao reabrir');

// ---- Canvas -> Editor
const cv = (await post('/api/projects', { type: 'canvas', title: 'Meu canvas' })).body; const vn = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'Cena 1' })).body; const empty = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'Vazio' })).body; await patch(`/api/projects/${cv.id}/nodes/${vn.id}`, { assetId: vid.id });
await page.goto(base + '/#/project/' + cv.id); await page.waitForSelector('.node'); await page.locator('.node', { hasText: 'Vazio' }).dispatchEvent('click'); await page.waitForSelector('[data-edit]');
await page.locator('[data-edit]').dispatchEvent('click'); await page.waitForFunction(() => /ainda não tem vídeo/.test(document.querySelector('#toast')?.textContent || '')); assert.match(page.url(), /#\/project\//, 'não navegou');
await page.locator('.node', { hasText: 'Cena 1' }).dispatchEvent('click'); await page.waitForFunction(() => document.querySelector('.node.sel [data-edit], .node-bar [data-edit]') && /Cena 1/.test(document.querySelector('.node-bar [data-edit]').closest('.node')?.textContent || '')); await page.locator('[data-edit]').dispatchEvent('click'); await page.waitForSelector('#eorigin'); assert.match(page.url(), /#\/editor\//); assert.match(await page.locator('#eorigin').innerText(), /Veio do Canvas «Meu canvas»/); assert.equal(await page.locator('#tl .clip').count(), 1); assert.match(await page.locator('#tl .clip').innerText(), /clipe\.mp4/); await shot('74_canvas_para_editor');
const edId = page.url().split('/').pop(); const ex = await post(`/api/editor/${edId}/export`, { name: 'cena-final' }); assert.equal(ex.status, 200); assert.ok(ex.body.linked);
await page.click('#eorigin a'); await page.waitForSelector('.node'); assert.ok(await page.locator('.node', { hasText: 'cena-final (editado)' }).count(), 'o resultado voltou ao Canvas'); await page.locator('.node', { hasText: 'Cena 1' }).first().dispatchEvent('click'); await page.waitForSelector('.node-bar a[href^="#/editor/"]');

// ---- créditos: três bolsas
await page.click('#credits'); await page.waitForSelector('#pouches'); const pv = await page.locator('#pouches [data-pouch]').allInnerTexts(); assert.equal(pv.length, 3); assert.match(pv[1], /Gratuitos e bônus \(gift\)\s*200/); assert.match(pv[0], /\b0\b/); assert.match(pv[2], /\b0\b/); await shot('75_creditos_bolsas');
assert.deepEqual(errors, [], 'sem erros de página');
console.log('OK lote2_ui: menu de ativos (6 itens, personagem/produto/vincular, confirmação com uso, selecionar), filtros, Ratio do editor (7 opções, persiste), Canvas→Editor (origem, retorno, recusa), bolsas de créditos'); await browser.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
