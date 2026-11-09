// Sonda extra do drawer Avatar video: limites do campo de roteiro (Edit), e o que "Change caption style" abre (diff do body inteiro). Somente leitura; cancela a edição.
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages().find((p) => p.url().includes('pippit.ai/home')) || b.contexts()[0].pages()[0];
await page.goto('https://www.pippit.ai/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(15000); await page.getByText('Avatar video', { exact: true }).locator('visible=true').first().click();
await page.waitForFunction(() => !document.querySelector('[class*=drawer-skeleton]') && /Choose avatar/.test(document.body.innerText), null, { timeout: 90000 }); await page.waitForTimeout(2000);
const D = page.locator('.lv-drawer-content'); await D.getByText('Edit script', { exact: true }).first().click(); await page.waitForTimeout(1500);
const body = () => page.evaluate(() => document.body.innerText.split('\n').map((x) => x.trim()).filter(Boolean)); const b0 = new Set(await body()); const out = {};
await D.getByText('Edit', { exact: true }).first().click(); await page.waitForTimeout(1200);
out.campos = await page.evaluate(() => [...document.querySelectorAll('.lv-drawer-content textarea, .lv-drawer-content input, .lv-drawer-content [contenteditable=true]')].map((e) => ({ tag: e.tagName, max: e.getAttribute('maxlength'), ph: e.getAttribute('placeholder'), val: (e.value ?? e.innerText ?? '').slice(0, 160), role: e.getAttribute('role') })));
out.contadorEdicao = (await body()).filter((t) => /\d+\s*\/\s*\d+/.test(t) && !b0.has(t)); await D.getByText('Cancel', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(800);
await D.getByText('Change caption style', { exact: true }).first().click(); await page.waitForTimeout(2500); out.estiloLegenda = (await body()).filter((t) => !b0.has(t)).slice(0, 80);
await page.screenshot({ path: `${OUT}/caption_style.png` }); out.switchLegendas = await page.evaluate(() => [...document.querySelectorAll('.lv-drawer-content [role=switch]')].map((e) => ({ checked: e.getAttribute('aria-checked'), cls: (e.getAttribute('class') || '').slice(0, 40) })));
out.player = await page.evaluate(() => [...document.querySelectorAll('.lv-drawer-content video, .lv-drawer-content [aria-label]')].slice(0, 20).map((e) => ({ tag: e.tagName, al: e.getAttribute('aria-label'), src: (e.src || '').replace(/\?.*/, '').slice(-60) })));
fs.writeFileSync(`${OUT}/probe2.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out).slice(0, 2500)); await b.close().catch(() => {}); process.exit(0);
