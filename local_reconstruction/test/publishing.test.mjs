// Publicação (estrutura preservada para APIs oficiais): módulo src/publishing.mjs, rotas locais, formatos observados do Pippit e página Publicador.
// Garante que NADA sai do computador: fetch/http/https para fora do servidor local são interceptados e contados (devem ser 0). Contas nunca são vinculadas; nada é publicado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('publishing')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-pub-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const PORT = 5246; const base = `http://127.0.0.1:${PORT}`; const outbound = [];
const realFetch = globalThis.fetch; globalThis.fetch = (u, o) => { const s = String(u?.url || u); if (!s.startsWith(base)) outbound.push('fetch ' + s); return realFetch(u, o); };
for (const [n, mod] of [['http', http], ['https', https]]) { const rq = mod.request; mod.request = function (...a) { const h = typeof a[0] === 'string' ? a[0] : a[0]?.href || a[0]?.hostname || ''; if (!/^(http:\/\/)?(127\.0\.0\.1|localhost)/.test(String(h)) && !/^(127\.0\.0\.1|localhost)$/.test(String(a[0]?.hostname || ''))) outbound.push(n + ' ' + h); return rq.apply(this, a); }; }
const P = await import('../src/publishing.mjs'); const media = await import('../app/lib/media.mjs'); const { server } = await import('../app/server.mjs'); await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), del = send('DELETE');

// ---- módulo puro
assert.deepEqual(Object.keys(P.PLATFORM_CODES).map(Number).sort((a, b) => a - b), [1, 3, 101, 201, 301, 311, 401]);
assert.deepEqual(Object.entries(P.PLATFORM_CODES).filter(([, v]) => v.publisher).map(([k]) => Number(k)), [1, 301, 311]);
assert.ok(Object.values(P.PLATFORM_CODES).filter((v) => v.publisher).every((v) => v.mapa === 'inferido'), 'o mapa código→plataforma é inferência, não observação');
assert.ok(Object.values(P.OFFICIAL_ADAPTERS).every((a) => a.status === 'nao_conectado'), 'adaptadores oficiais planejados, nenhum conectado');
const assets = [{ id: '1', kind: 'video' }, { id: '2', kind: 'image' }]; const now = Date.parse('2026-10-22T12:00:00Z');
assert.match(P.normalizeDraft({ assetId: '9', platforms: [1] }, { assets, now }).error, /ativo inexistente/);
assert.match(P.normalizeDraft({ assetId: '2', platforms: [1] }, { assets, now }).error, /apenas vídeos/);
assert.match(P.normalizeDraft({ assetId: '1', platforms: [] }, { assets, now }).error, /ao menos uma plataforma/);
assert.match(P.normalizeDraft({ assetId: '1', platforms: [3] }, { assets, now }).error, /não faz parte do Publisher/);
assert.match(P.normalizeDraft({ assetId: '1', platforms: [1], caption: 'x'.repeat(2201) }, { assets, now }).error, /2201\/2200/);
assert.match(P.normalizeDraft({ assetId: '1', platforms: [1], scheduledAt: '2026-10-22T11:00:00Z' }, { assets, now }).error, /futuro/);
assert.match(P.normalizeDraft({ assetId: '1', platforms: [1], scheduledAt: 'abc' }, { assets, now }).error, /inválida/);
const ok = P.normalizeDraft({ assetId: '1', platforms: ['301', 1, 1], caption: ' oi ', scheduledAt: '2026-10-23T09:00:00Z', hashtags: '#a, b #c' }, { assets, now }).draft;
assert.deepEqual(ok.platforms, [301, 1]); assert.equal(ok.caption, 'oi'); assert.equal(ok.status, 'rascunho_local'); assert.deepEqual(ok.hashtags, ['a', 'b', 'c']);
assert.deepEqual(P.bindAccountList({}, {}).data.platform_user_info, { 1: [], 301: [], 311: [], 3: [], 101: [], 201: [], 401: [] });
assert.deepEqual(P.listScheduleTask([], { status_list: [1, 2, 3, 4, 6] }, 5), { ret: '0', errmsg: '', svr_time: 5, data: [] });

// ---- rotas locais
const f = path.join(tmp, 'v.mp4'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', f]).status, 0);
const vid = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'clipe.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(f) })).body;
let r = await j('/api/social/structure'); assert.equal(r.status, 200); assert.equal(r.body.limits.caption, 2200); assert.ok(r.body.adapters.tiktok);
assert.equal((await post('/api/social/connect', { platform: 'TikTok' })).status, 501); assert.equal((await post('/api/social/publish', {})).status, 409);
assert.equal((await post('/api/social/drafts', { assetId: vid.id, platforms: [] })).status, 400);
const t1 = new Date(Date.now() + 86400000).toISOString();
r = await post('/api/social/drafts', { assetId: vid.id, caption: 'Teste', platforms: [1, 311], scheduledAt: t1 }); assert.equal(r.status, 200); assert.equal(r.body.draft.status, 'rascunho_local'); assert.match(r.body.note, /nada foi enviado/); const did = r.body.draft.id;
assert.equal((await j('/api/social/drafts')).body.drafts.length, 1);
assert.deepEqual((await post('/api/account/v1/get_bind_account_list', {})).body.data.platform_user_info['1'], [], 'nenhuma conta vinculada');
let ls = (await post('/api/biz/v1/publish/list_schedule_task', { start_time: 0, end_time: Date.now() + 9e9, status_list: [1, 2, 3, 4, 6], platform_user_ids: { 1: [], 301: [], 311: [] } })).body; assert.deepEqual(ls.data, [], 'status observados do Pippit não incluem rascunho local'); assert.equal(ls.ret, '0');
ls = (await post('/api/biz/v1/publish/list_schedule_task', { start_time: 0, end_time: Date.now() + 9e9, status_list: [0] })).body; assert.equal(ls.data.length, 1); assert.equal(ls.data[0].local_only, true);
// persistência em disco
assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')).social.drafts.length, 1); assert.deepEqual((await j('/api/state')).body.social.accounts, {});

// ---- UI: Publicador no menu Mais, sem Editor (estrutura atual), rascunho local pela página
const browser = await launchChromium(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + '/#/schedule'); await page.waitForSelector('#pubdrafts'); assert.match(await page.locator('#main h1').innerText(), /Gerencie suas publicações/); await page.click('#pubdrafts summary');
const side = await page.locator('.sub').allInnerTexts(); assert.deepEqual(side.map((s) => s.trim()), ['Gerador de vídeos', 'Avatares e vozes', 'Análise', 'Publicador']);
const body = await page.locator('#main').innerText(); assert.match(body, /Vincular conta/); assert.match(body, /Publique mais, cresça mais/); assert.match(body, /extensão do PiperLine/); assert.match(body, /Rascunhos locais/); assert.match(body, /Nada é enviado nem agendado/); assert.match(body, /rascunho_local/);
await page.fill('#pdcap', 'Legenda de teste'); assert.equal((await page.locator('#pdcount').innerText()).trim(), '16/2200');
await page.click('#pdsave'); await page.waitForTimeout(400); assert.match(await page.locator('#toast').innerText(), /ao menos uma plataforma/);
await page.check('.pdplat[value="301"]'); await page.click('#pdsave'); await page.waitForFunction(() => document.querySelectorAll('#pdlist [data-d]').length === 2, null, { timeout: 5000 });
await page.locator('[data-del]').first().click(); await page.waitForFunction(() => document.querySelectorAll('#pdlist [data-d]').length === 1, null, { timeout: 5000 });
await page.click('#vc'); await page.locator('.menu a', { hasText: 'TikTok' }).click(); await page.waitForTimeout(400); assert.match(await page.locator('#toast').innerText(), /OAuth/);
assert.deepEqual(errors, [], 'sem erros de página'); assert.deepEqual(outbound, [], 'nenhuma chamada de rede para fora do servidor local');
console.log('OK publishing: códigos/validações/formatos observados, rotas locais (conectar 501, publicar 409, rascunhos), Publicador no menu Mais (sem Editor, estrutura atual), 0 chamadas externas'); await browser.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
