// Tenta UM filtro do drawer Avatar video e salva screenshots antes/depois (somente leitura). Uso: node filter_try.mjs <Filtro> <Opção> <saida-dir>
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const [F, O, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages().find((p) => p.url().includes('pippit.ai/home')) || b.contexts()[0].pages()[0]; const net = [];
page.on('request', (r) => { if (/pippit\.ai\/api/.test(r.url()) && r.method() === 'POST' && /digital|avatar/.test(r.url())) net.push(r.url().replace(/\?.*/, '') + ' ' + (r.postData() || '').slice(0, 300)); });
await page.goto('https://www.pippit.ai/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(15000); await page.getByText('Avatar video', { exact: true }).locator('visible=true').first().click();
await page.waitForFunction(() => !document.querySelector('[class*=drawer-skeleton]') && /Choose avatar/.test(document.body.innerText), null, { timeout: 240000 }); await page.waitForTimeout(3000);
const D = page.locator('.lv-drawer-content'); const count = () => page.evaluate(() => document.querySelectorAll('.lv-drawer-content [class*=avatar],.lv-drawer-content [class*=Avatar]').length);
await D.getByText(F, { exact: true }).first().click(); await page.waitForTimeout(1000); await page.screenshot({ path: `${OUT}/a_open.png` });
const info = await page.evaluate((o) => [...document.querySelectorAll('.lv-drawer-content *')].filter((e) => (e.innerText || '').trim() === o).map((e) => ({ tag: e.tagName, cls: (e.getAttribute('class') || '').slice(0, 60), kids: e.children.length, role: e.getAttribute('role') })), O); console.log('candidatos', JSON.stringify(info));
const el = D.getByText(O, { exact: true }).last(); await el.click({ timeout: 5000 }); await page.waitForTimeout(3500); await page.screenshot({ path: `${OUT}/b_after.png` });
console.log('rede', JSON.stringify(net)); console.log('texto', JSON.stringify((await page.evaluate(() => document.querySelector('.lv-drawer-content').innerText.split('\n').map((x) => x.trim()).filter(Boolean))).slice(8, 30)));
await b.close().catch(() => {}); process.exit(0);
