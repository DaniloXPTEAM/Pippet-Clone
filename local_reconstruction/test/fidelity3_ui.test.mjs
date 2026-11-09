// Lote 3 de fidelidade: (a) catálogo e filtros REAIS do drawer Avatar video (metadados vindos da varredura de rede do Pippit, sem deduzir por nome), semântica OU dentro do campo / E entre campos
// (conferida contra as respostas observadas), favoritos locais; (b) atalhos do Canvas (Organize Alt+Shift+F, Add node Tab, desfazer/refazer Ctrl+Z/Y). Nenhuma chamada externa; nenhum crédito.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')); const CAT = JSON.parse(fs.readFileSync(path.join(here, '../app/lib/avatar_catalog.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-f3-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5248; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const patch = (p, b) => j(p, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });

// ---- integridade do catálogo derivado da varredura
const A = CAT.avatares; assert.ok(A.length >= 300); assert.equal(new Set(A.map((a) => a.id)).size, A.length); assert.equal(CAT.semNome, 0); assert.ok(A.every((a) => a.name && Array.isArray(a.tags)));
const has = (a, t) => a.tags.includes(t); const fem = A.filter((a) => has(a, 'gender/female')), mal = A.filter((a) => has(a, 'gender/male')); assert.equal(fem.length + mal.length, A.length, 'todo avatar tem exatamente um gênero'); assert.equal(fem.filter((a) => has(a, 'gender/male')).length, 0);
for (const f of CAT.filtros) for (const o of f.opcoes) if (o.disponivel) assert.equal(A.filter((a) => has(a, o.tag)).length, o.noCatalogo, `${f.campo}=${o.label}`);
// a semântica observada no Pippit (consultas combinadas) é reproduzida pelos metadados locais
const sem = CAT.semantica; assert.equal(sem['Female+Male'].total, A.length, 'OU dentro do campo: Female+Male = todos'); const femYoung = fem.filter((a) => has(a, 'age/young')).length; assert.equal(sem['Female+Young'].total, femYoung, 'E entre campos: Female+Young');
assert.match(sem['Female+Male'].dsl, /gender\/female.*gender\/male/); assert.match(sem['Female+Young'].dsl, /age\/young/);
const campos = Object.fromEntries(CAT.filtros.map((f) => [f.campo, f])); assert.deepEqual(Object.keys(campos), ['Gender', 'Age', 'Figure', 'Name', 'Industry', 'Scene', 'Pose', 'Outfit style']);
const indisp = CAT.filtros.flatMap((f) => f.opcoes.filter((o) => !o.disponivel).map((o) => `${f.campo}:${o.label}`)); console.log('opções sem dados completos:', indisp.join(', ') || '(nenhuma)');
let r = await j('/api/avatar-drawer'); assert.equal(r.body.catalogo.total, CAT.total); assert.equal((await j('/api/avatar-favorites')).body.favorites.length, 0);

// ---- UI do drawer: filtragem real
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const errors = [], ext = [];
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } }); const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(String(e))); page.on('request', (q) => { if (!q.url().startsWith(base) && !q.url().startsWith('data:') && !q.url().startsWith('blob:')) ext.push(q.url()); });
const extra = A.some((a) => a.name === 'Victor in the kitchen') ? 0 : 1; const countTxt = async () => Number((await page.locator('#avdcount').innerText()).match(/(\d+)/)[1]);
await page.goto(`${base}/#/home`); await page.waitForSelector('.skill[data-s=video-de-avatar]'); await page.click('.skill[data-s=video-de-avatar]'); await page.waitForSelector('#avdrawer #avdgrid');
assert.equal(await countTxt(), A.length + extra, 'lista completa = catálogo + avatar em destaque (só aparece sem filtro)'); assert.equal(await page.locator('#avdgrid [data-av]').count(), 50, 'primeira página de 50'); await page.click('#avmore2'); assert.equal(await page.locator('#avdgrid [data-av]').count(), 100);
// Gender = Female (caixa de seleção; o botão passa a mostrar a opção escolhida)
await page.click('[data-f="Gender"]'); assert.equal(await page.locator('.avd-menu input[type=checkbox]').count(), 2); await page.locator('.avd-menu label', { hasText: 'Feminino' }).click(); assert.equal(await countTxt(), fem.length); assert.match(await page.locator('[data-f="Gender"]').innerText(), /Feminino/); assert.match(await page.locator('.avd-reset').innerText(), /Redefinir \(1\)/);
await page.locator('.avd-menu label', { hasText: 'Masculino' }).click(); assert.equal(await countTxt(), A.length, 'OU dentro do campo'); assert.match(await page.locator('[data-f="Gender"]').innerText(), /Feminino \+1/); await page.locator('.avd-menu label', { hasText: 'Masculino' }).click(); assert.equal(await countTxt(), fem.length);
// E entre campos (Gender + Age)
await page.click('.avd-head h2'); await page.click('[data-f="Age"]'); const young = campos.Age.opcoes.find((o) => o.label === 'Young'); assert.ok(young.disponivel); await page.locator('.avd-menu label', { hasText: 'Jovem' }).click(); assert.equal(await countTxt(), femYoung, 'E entre campos'); assert.equal(await page.locator('#avdmiss').count(), 0, 'filtros com dados não mostram aviso');
// Redefinir
await page.click('.avd-reset'); assert.equal(await countTxt(), fem.length); await page.click('.avd-head h2'); await page.click('[data-f="Gender"]'); await page.click('.avd-reset'); assert.equal(await countTxt(), A.length + extra);
// um filtro de outro campo (Scene) confere com os metadados
await page.click('.avd-head h2'); const sc = campos.Scene.opcoes.find((o) => o.disponivel && o.noCatalogo > 0); await page.click('[data-f="Scene"]'); const scLabel = await page.locator('.avd-menu label').filter({ hasText: new RegExp('.') }).nth(campos.Scene.opcoes.indexOf(sc)).innerText(); await page.locator('.avd-menu label').nth(campos.Scene.opcoes.indexOf(sc)).click(); assert.equal(await countTxt(), sc.noCatalogo, scLabel); await page.click('.avd-reset');
// opção sem dados completos: não filtra e avisa (só se existir alguma)
if (indisp.length) { const [F, O] = indisp[0].split(':'); await page.click('.avd-head h2'); await page.click(`[data-f="${F}"]`); const idx = campos[F].opcoes.findIndex((o) => o.label === O); await page.locator('.avd-menu label').nth(idx).click(); assert.equal(await countTxt(), A.length + extra, 'sem dados: não filtra'); assert.match(await page.locator('#avdmiss').innerText(), /Sem dados do serviço/); await page.click('.avd-reset'); }
// ---- favoritos (ícone ao passar o mouse; aba Favorites com estado vazio observado)
await page.click('.avd-head h2'); const t1 = page.locator('#avdgrid [data-av]').nth(2); const nome = await t1.getAttribute('data-av'); await t1.hover(); await t1.locator('[data-fav]').click(); assert.deepEqual((await j('/api/avatar-favorites')).body.favorites, [nome]); await page.click('[data-sub="fav"]'); assert.equal(await page.locator('#avdrawer [data-av]').count(), 1); assert.equal(await page.locator('#avdrawer [data-av]').getAttribute('data-av'), nome);
await page.locator('#avdrawer [data-av]').hover(); await page.locator('#avdrawer [data-fav]').click(); assert.match(await page.locator('#avdrawer').innerText(), /Nenhum avatar favorito ainda/); assert.deepEqual((await j('/api/avatar-favorites')).body.favorites, []);
assert.equal((await post('/api/avatar-favorites', { name: '' })).status, 400); await page.click('#avclose');

// ---- Canvas: atalhos
const proj = (await post('/api/projects', { type: 'canvas', title: 'Atalhos' })).body; const ids = []; for (const [k, t] of [['a', 'Imagem'], ['b', 'Texto'], ['c', 'Vídeo']]) { const n = (await post(`/api/projects/${proj.id}/nodes`, { type: t, title: k })).body; ids.push(n.id); await patch(`/api/projects/${proj.id}/nodes/${n.id}`, { x: 700 + ids.length * 17, y: 500 + ids.length * 9 }); }
const pos = async () => (await j(`/api/projects/${proj.id}`)).body.canvas.nodes.map((n) => `${n.x},${n.y}`).join('|'); const p0 = await pos();
await page.goto(`${base}/#/project/${proj.id}`); await page.waitForSelector('.node'); await page.waitForTimeout(400);
await page.keyboard.press('Alt+Shift+F'); await page.waitForTimeout(800); const p1 = await pos(); assert.notEqual(p1, p0, 'Organize altera posições'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800); assert.equal(await pos(), p0, 'Ctrl+Z desfaz'); await page.keyboard.press('Control+y'); await page.waitForTimeout(800); assert.equal(await pos(), p1, 'Ctrl+Y refaz');
await page.keyboard.press('Tab'); await page.waitForSelector('.menu'); assert.match(await page.locator('.menu').innerText(), /Adicionar nó/); await page.keyboard.press('Escape'); await page.mouse.click(600, 200);
// ---- Biblioteca de estilos (nomes/categorias observados; miniaturas são conteúdo do serviço)
const SL = (await j('/api/style-library')).body; assert.equal(SL.todos.length, 94); assert.equal(SL.categorias['Live-action'].length + SL.categorias['2D'].length + SL.categorias['3D'].length, 94); assert.equal(SL.categorias['3D'].filter((x) => x === '3D Cartoon').length, 2, 'o original repete "3D Cartoon"'); assert.ok(SL.categorias['3D'].includes('UE5 Realistic'));
await page.goto(`${base}/#/project/${proj.id}`); await page.waitForSelector('#stylelib'); await page.click('#stylelib'); await page.waitForSelector('#stylepanel .sp-card'); assert.equal(await page.locator('#stylepanel .sp-card').count(), 94 + 2); assert.match(await page.locator('#stylepanel .sp-card.on').innerText(), /Nenhum/);
await page.locator('#stylepanel [data-c="3D"]').click(); assert.equal(await page.locator('#stylepanel .sp-card[data-s]').count() - 1, 30); await page.locator('#stylepanel [data-c="All"]').click(); await page.click('#spsearch'); await page.fill('#spq', 'cinema'); assert.ok((await page.locator('#stylepanel .sp-card[data-s]').count()) - 1 >= 5); await page.fill('#spq', ''); await page.locator('#stylepanel .sp-card', { hasText: 'Cyberpunk' }).click();
assert.equal((await j(`/api/projects/${proj.id}`)).body.style, 'Cyberpunk'); assert.match(await page.locator('#stylelib').innerText(), /Cyberpunk/); assert.equal((await patch(`/api/projects/${proj.id}`, { style: 'Estilo inventado' })).status, 400);
await page.reload(); await page.waitForSelector('#stylelib'); assert.match(await page.locator('#stylelib').innerText(), /Cyberpunk/); await page.click('#stylelib'); await page.locator('#stylepanel [data-s=""]').click(); assert.equal((await j(`/api/projects/${proj.id}`)).body.style, null);
assert.deepEqual(errors, [], 'sem erros de página'); assert.deepEqual(ext, [], 'nenhuma requisição externa');
console.log(`OK fidelity3_ui: catálogo real (${A.length} avatares, ${CAT.filtros.reduce((n, f) => n + f.opcoes.filter((o) => o.disponivel).length, 0)} opções com dados), filtros OU/E conferidos com as respostas observadas, favoritos locais, atalhos do Canvas, Biblioteca de estilos`); await browser.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
