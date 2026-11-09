// UI da geracao direta (Auto Route): composer -> canvas com no de video; falha de validacao, falha sem provedor e sucesso com renderizador local (nao-IA).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-dui-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
const PORT = 5196; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
await fetch(base + '/api/daily-claim', { method: 'POST' });
const balance = async () => (await (await fetch(base + '/api/state')).json()).balance;
const bal0 = await balance();
const compose = async (text) => {
  await page.goto(base + '/#/home'); await page.waitForSelector('#prompt'); await page.waitForTimeout(500);
  await page.click('#modeB'); await page.getByText('Vídeo', { exact: true }).first().click(); await page.waitForTimeout(300);
  await page.click('#modelB'); await page.getByText('Auto Route', { exact: true }).first().click(); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('.modal,.overlay,[class*=modal]').forEach((m) => m.remove()));
  assert.match(await page.locator('#modelB').innerText(), /Auto Route.*9:16.*768P.*12/);
  await page.fill('#prompt', text); await page.dispatchEvent('#prompt', 'input'); await page.click('#send');
};
// 1) prompt curto -> o no mostra a falha generica; detalhe tecnico no title
await compose('red apple'); await page.waitForSelector('#dnode b', { timeout: 15000 });
assert.match(await page.locator('#dnode').innerText(), /Não foi possível gerar/); assert.match(await page.locator('#dnode b').getAttribute('title'), /at least 15 characters/); await shot('20_direct_fail_short');
// 2) prompt valido, sem provedor -> falha explicita, sem video ficticio e sem debito
await compose('a red apple rotating on a white table'); await page.waitForSelector('#dnode b', { timeout: 15000 });
assert.match(await page.locator('#dnode b').getAttribute('title'), /No local generation provider/); assert.equal(await page.locator('#dnode video').count(), 0); await shot('21_direct_fail_noprovider');
assert.equal(await balance(), bal0);
// 3) renderizador local (ffmpeg, nao-IA) -> video no no, 272x476
if (media.available()) {
  await fetch(base + '/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'local-ffmpeg' }) });
  await compose('a red apple rotating on a white table'); await page.waitForSelector('#dnode video', { timeout: 30000 });
  const box = await page.locator('#dnode').boundingBox(); assert.ok(Math.abs(box.width - 272) < 3 && Math.abs(box.height - 476) < 3, JSON.stringify(box)); await shot('22_direct_success');
  // historico: o projeto direto aparece na barra lateral e abre o canvas /direct/...; tarefas listam as geracoes
  await page.goto(base + '/#/home'); await page.waitForSelector('#side .hist-i'); await page.locator('#side .hist-i', { hasText: 'a red video part' }).first().click(); await page.waitForSelector('#dnode video', { timeout: 20000 });
  assert.match(page.url(), /#\/direct\/\d+\/\d+\/[\w-]+$/); await shot('23_direct_from_history');
  await page.goto(base + '/#/tasks'); await page.waitForSelector('.run-task'); const rows = await page.locator('.run-task').allInnerTexts(); assert.ok(rows.length >= 3); assert.ok(rows.some((t) => /Concluída/.test(t)) && rows.some((t) => /Falhou/.test(t))); await shot('24_tasks_runs');
}
// 4) plano Free: modelo pago (video ou imagem) abre o modal de assinatura antes de qualquer requisicao (observado no original)
const calls = []; page.on('request', (r) => { if (/submit_run|create_creative_project/.test(r.url())) calls.push(r.url()); });
await page.goto(base + '/#/home'); await page.waitForSelector('#prompt'); await page.click('#modeB'); await page.getByText('Vídeo', { exact: true }).first().click(); await page.click('#modelB');
await page.locator('#overlay [data-id="seedance-2.5"], .modal [data-id="seedance-2.5"]').first().click(); await page.evaluate(() => document.querySelectorAll('.modal-bg').forEach((m) => m.remove()));
await page.fill('#prompt', 'a cinematic shot of a red apple on a wooden table'); await page.dispatchEvent('#prompt', 'input'); await page.click('#send');
await page.waitForSelector('.modal h2'); assert.match(await page.locator('.modal h2').first().innerText(), /Assine o Starter agora para uso ilimitado de Dreamina Seedance 2\.5/); assert.deepEqual(calls, [], 'sem requisicao antes do paywall'); await shot('25_paywall_model');
assert.deepEqual(errors, []); await browser.close(); server.close(); console.log('OK directgen_ui: composer Auto Route, falha de validacao, falha sem provedor, sucesso local'); process.exit(0);
