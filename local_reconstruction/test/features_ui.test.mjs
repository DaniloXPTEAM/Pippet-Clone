// UI: modo escuro e idioma (Configurações), skills (criar manual, favoritos, usar), central de notificações com ponto de não lidas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('features_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-fui-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5198; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
await page.goto(base + '/#/home'); await page.waitForSelector('#side .nav');

// 1) idioma (18 opções) e modo escuro persistente
await page.goto(base + '/#/settings/sign_management'); await page.waitForSelector('#lang');
assert.equal(await page.locator('#lang option').count(), 18); await page.selectOption('#lang', 'ja'); await page.waitForTimeout(300); assert.equal(await page.evaluate(() => document.documentElement.lang), 'ja');
await page.locator('input[name=theme][value=dark]').check(); await page.waitForTimeout(400); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark'); await shot('30_dark_mode');
await page.reload(); await page.waitForSelector('#side .nav'); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark'); assert.equal(await page.evaluate(() => document.documentElement.lang), 'ja');
await page.goto(base + '/#/settings/sign_management'); await page.waitForSelector('#lang'); await page.locator('input[name=theme][value=light]').check(); await page.waitForTimeout(300); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');

// 2) skills: criar manual (validação), favoritar, aba Favoritos, usar
await page.goto(base + '/#/skills'); await page.waitForSelector('#mk'); await page.click('#mk'); await page.getByText('Criar manualmente', { exact: true }).click(); await page.waitForSelector('#sks');
await page.click('#sks'); await page.waitForFunction(() => document.querySelector('#skerr')?.textContent); assert.match(await page.locator('#skerr').innerText(), /Enter a skill name and description before saving/);
await page.fill('#skn', 'Anúncio curto'); await page.fill('#skd', 'Vídeos de 15 s'); await page.fill('#ski', 'Sempre gere 15 s em 9:16.'); await page.click('#sks'); await page.waitForSelector('.skill-card:has-text("Anúncio curto")');
assert.equal(await page.locator('.skill-card', { hasText: 'Anúncio curto' }).count(), 1); await shot('31_skill_custom');
await page.locator('.skill-card', { hasText: 'Anúncio curto' }).locator('[data-d]').click(); await page.getByText('Adicionar aos favoritos', { exact: true }).click(); await page.waitForTimeout(500);
await page.locator('button[data-top="Favoritos"]').click(); await page.waitForSelector('.skill-card'); assert.equal(await page.locator('.skill-card').count(), 1); assert.ok((await page.locator('.skill-card').innerText()).includes('★'));
await page.locator('.skill-card [data-u]').click(); await page.waitForSelector('#skillB'); assert.match(await page.locator('#skillB').innerText(), /Anúncio curto/);

// 3) notificações: uma geração direta falha cria notificação; sino mostra ponto; "Todas lidas" limpa
const pr = (await post('/api/biz/v1/agent/create_creative_project', { user_info: { consumer_uid: 'u' } })).data.project_id; const cv = (await post('/api/biz/v1/asset/batch_generate_asset_id')).data.ids[0];
await post('/api/biz/v1/asset/namespace_create', { namespace_data: [{ FileName: 'canvas.json', PippitAssetID: cv, ProjectID: String(pr) }] });
await post('/api/biz/v1/agent/submit_run', { project_id: pr, message: { content: [{ type: 'data', data: JSON.stringify({ param: JSON.stringify({ prompt: 'red apple', ratio: '9:16', resolution: '768p', model: 'MiniMax-H3-trial', duration_sec: 4 }), extra: '{}', tool_name: 'biz/x_tool_name_video_part' }), sub_type: 'biz/x_data_direct_tool_call_req' }], role: 'user', thread_id: `canvas_thread_${cv}_pippit_video_part_agent`, run_id: 'u1', created_at: 1, message_id: 'm1' }, user_info: {}, agent_name: 'pippit_video_part_agent', concurrency_control: { policy: 1, conflict_key: 'node-u1' }, run_extra: '{}' });
for (let i = 0; i < 50 && !((await (await fetch(base + '/api/notifications')).json()).unread); i++) await page.waitForTimeout(100); await page.goto(base + '/#/home'); await page.reload(); await page.waitForSelector('#bell'); assert.equal(await page.locator('#bell .dot').count(), 1);
await page.click('#bell'); await page.waitForSelector('.note'); assert.match(await page.locator('.note').first().innerText(), /Falha na geração/); await shot('32_notifications');
await page.click('#allread'); await page.waitForTimeout(500); assert.equal(await page.locator('#bell .dot').count(), 0);
// 4) estúdio de marketing: seletores com busca/categorias/Expand/Select (dados observados)
await page.goto(base + '/#/marketing'); await page.waitForSelector('#sty');
await page.click('#sty'); await page.waitForSelector('.mk-card'); assert.equal(await page.locator('.mk-card').count(), 20); assert.equal(await page.locator('#mcats button').count(), 6);
await page.locator('#mcats [data-c="Premium Aesthetics"]').click(); assert.equal(await page.locator('.mk-card').count(), 6); await page.locator('#mcats [data-c="All"]').click();
await page.fill('#mq', 'y2k'); assert.equal(await page.locator('.mk-card').count(), 1); await page.locator('.mk-card [data-ex]').click(); assert.ok(await page.locator('.mk-ex').isVisible()); await shot('33_marketing_style');
await page.locator('.mk-card [data-sel]').click(); await page.waitForSelector('#mkchips [data-x="sty"]'); assert.match(await page.locator('#mkchips').innerText(), /Estilo: Y2K Chrome/);
await page.click('#hook'); await page.waitForSelector('#mcats'); assert.equal(await page.locator('#mcats button').count(), 6); await page.locator('#mcats [data-c="Catchy Sounds"]').click(); assert.match(await page.locator('#mgrid').innerText(), /não foi capturado/); await page.evaluate(() => document.querySelectorAll('.modal-bg').forEach((m) => m.remove()));
await page.click('#fmt'); await page.waitForSelector('.mk-card'); assert.equal(await page.locator('.mk-card').count(), 8); assert.equal(await page.locator('#mcats button').count(), 8); await page.locator('.mk-card', { hasText: 'Secret Shelf Test' }).locator('[data-sel]').click();
assert.match(await page.locator('#mkchips').innerText(), /Formato: Secret Shelf Test/); await page.locator('#mkchips [data-x="sty"]').click(); assert.equal(await page.locator('#mkchips [data-x="sty"]').count(), 0);
assert.deepEqual(errors, []); await browser.close(); server.close(); console.log('OK features_ui: idioma/modo escuro, skills (manual/favoritos/usar), notificações, seletores de marketing'); process.exit(0);
