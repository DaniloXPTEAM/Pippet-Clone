// UI do lote 3 (navegador real): painel direito do editor com trilho de 6 abas e estado vazio observado, Velocidade (Normal/Curvo, Velocidade↔Duração, Tom, Câmera lenta suave, redefinir),
// Animação/Ferramentas inteligentes/Modificador de voz identificados como não reproduzidos (nada falso é ativado), Proporção dentro de Plano de fundo e o tour de 2 passos (uma vez).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-l3-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); const { server } = await import('../app/server.mjs'); const PORT = 5204; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const put = (p, b) => j(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const f = path.join(tmp, 'v.mp4'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-shortest', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac', f]).status, 0);
const asset = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'v.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(f) })).body;
const ed = (await post('/api/editor')).body; await put(`/api/editor/${ed.id}`, { ratio: 'original', clips: [{ assetId: asset.id, in: 0, out: 3 }] }); const clipOf = async () => (await j(`/api/projects/${ed.id}`)).body.timeline.clips[0];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(String(e))); const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });

// ---- tour de balões (primeira visita): passo 1/2 observado, passo 2 só com título; não volta depois de concluído
await page.goto(base + '/#/editor/' + ed.id); await page.waitForSelector('#etour'); let t = await page.locator('#etour').innerText(); assert.match(t, /Recursos materiais/); assert.match(t, /Você pode carregar a sua própria mídia ou usar os materiais que fornecemos\./); assert.match(t, /1\/2/); assert.equal((await page.locator('#tournext').innerText()).trim(), 'Avançar'); await shot('80_tour_passo1');
await page.click('#tournext'); await page.waitForFunction(() => /Alterar barra lateral/.test(document.querySelector('#etour')?.textContent || '')); assert.match(await page.locator('#etour').innerText(), /2\/2/); await page.click('#tournext'); await page.waitForFunction(() => !document.querySelector('#etour'));
await page.reload(); await page.waitForSelector('#rightcol'); assert.equal(await page.locator('#etour').count(), 0, 'o tour não volta');

// ---- painel direito: estado vazio, trilho com 6 abas
assert.match(await page.locator('#rpempty').innerText(), /Selecione um item para fazer ajustes/); assert.deepEqual(await page.locator('#rail [data-rt]').evaluateAll((els) => els.map((e) => e.title)), ['Básico', 'Plano de fundo', 'Ferramentas inteligentes', 'Áudio', 'Animação', 'Velocidade']); await shot('81_painel_vazio');
await page.locator('#tl .clip').first().click(); await page.waitForSelector('[data-in="0"]'); assert.ok(await page.locator('#tl .clip.sel').count());

// ---- Velocidade
await page.locator('[data-rt="Velocidade"]').click(); await page.waitForSelector('[data-sp]'); assert.equal(await page.locator('[data-sm="Normal"]').count(), 1); assert.ok(await page.locator('button', { hasText: 'Curvo' }).isDisabled(), 'Curvo: conteúdo não capturado, desabilitado');
assert.equal(await page.inputValue('[data-sp]'), '1'); assert.equal(await page.inputValue('[data-dur]'), '3.0'); await shot('82_velocidade');
await page.fill('[data-sp]', '2'); await page.dispatchEvent('[data-sp]', 'change'); await page.waitForFunction(() => document.querySelector('[data-dur]')?.value === '1.5'); assert.equal((await clipOf()).speed, 2, 'Velocidade 2x → Duração 1.5 s');
for (let k = 0; k < 4; k++) { await page.fill('[data-dur]', '6'); await page.dispatchEvent('[data-dur]', 'change'); const t0 = Date.now(); while (Date.now() - t0 < 5000 && (await clipOf()).speed !== 0.5) await page.waitForTimeout(150); if ((await clipOf()).speed === 0.5) break; } /* repete se o evento caiu num elemento já substituído pelo re-render */ await page.waitForFunction(() => document.querySelector('[data-sp]')?.value === '0.5'); assert.equal((await clipOf()).speed, 0.5, 'Duração 6 s → Velocidade 0,5x');
await page.locator('[data-cp="pitch"]').check(); await page.waitForFunction(() => document.querySelector('[data-cp="pitch"]')?.checked); await page.locator('[data-cp="smoothSlow"]').check(); await page.waitForFunction(() => document.querySelector('[data-cp="smoothSlow"]')?.checked); let c = await clipOf(); assert.equal(c.pitch, true); assert.equal(c.smoothSlow, true);
await page.fill('[data-sp]', '50'); await page.dispatchEvent('[data-sp]', 'change'); await page.waitForFunction(() => document.querySelector('[data-sp]')?.value === '10'); assert.equal((await clipOf()).speed, 10, 'limite local 10x');
await page.click('#spreset'); await page.waitForFunction(() => document.querySelector('[data-sp]')?.value === '1'); c = await clipOf(); assert.equal(c.speed, 1); assert.equal(!!c.pitch, false); assert.equal(!!c.smoothSlow, false);

// ---- Animação: só "Nenhum" ativo; abas Entrada/Saída/Combinação
await page.locator('[data-rt="Animação"]').click(); await page.waitForSelector('.anigrid'); assert.deepEqual(await page.locator('#anitabs button').allInnerTexts(), ['Entrada', 'Saída', 'Combinação']); await page.locator('[data-at="Saída"]').click(); await page.waitForFunction(() => document.querySelector('[data-at="Saída"]')?.classList.contains('on'));
assert.equal(await page.locator('.aniitem:not([disabled])').count(), 1); assert.equal((await page.locator('.aniitem:not([disabled])').innerText()).trim(), 'Nenhum'); assert.ok((await page.locator('.aniitem[disabled]').count()) >= 10); assert.match(await page.locator('#rpanel .blocked').innerText(), /não foram reproduzidos/); await shot('83_animacao');
// ---- Ferramentas inteligentes e Modificador de voz: bloqueados e identificados
await page.locator('[data-rt="Ferramentas inteligentes"]').click(); await page.waitForSelector('.smart-item'); assert.deepEqual(await page.locator('.smart-item').allInnerTexts(), ['Reenquadramento automático', 'Retoque', 'Remover plano de fundo', 'Rastreio de câmera']); assert.equal(await page.locator('.smart-item:not([disabled])').count(), 0);
await page.locator('[data-rt="Áudio"]').click(); await page.waitForSelector('[data-cp="volumeDb"]'); assert.ok(await page.locator('button', { hasText: 'Modificador de voz' }).isDisabled());
// ---- Plano de fundo: Proporção dentro da aba (mesmo seletor observado) e tipo de fundo
await page.locator('[data-rt="Plano de fundo"]').click(); await page.waitForSelector('#rratio'); await page.click('#rratio'); await page.waitForSelector('.menu'); assert.equal(await page.locator('.menu a').count(), 7); await page.locator('.menu a', { hasText: '1:1' }).click(); await page.waitForFunction(() => /Proporção: 1:1/.test(document.querySelector('#rratio')?.textContent || '')); assert.equal((await j(`/api/projects/${ed.id}`)).body.timeline.ratio, '1:1');
// fechar painel volta ao estado vazio
await page.click('#rpclose'); await page.waitForSelector('#rpempty');
assert.deepEqual(errors, [], 'sem erros de página');
console.log('OK lote3_ui: tour (2 passos, uma vez), painel direito (estado vazio, trilho de 6 abas), Velocidade (↔ Duração, Tom, Câmera lenta suave, redefinir, limite), Animação/Ferramentas inteligentes/Modificador de voz bloqueados e identificados, Proporção em Plano de fundo'); await browser.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
