// Diagnóstico (somente leitura) do drawer "Avatar video": espera longa, falhas de requisição e erros de console.
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages().find((p) => p.url().includes('pippit.ai/home')) || b.contexts()[0].pages()[0]; const fails = [], cons = [], scripts = [];
page.on('requestfailed', (r) => fails.push(r.url().replace(/\?.*/, '').slice(0, 140) + ' ' + (r.failure()?.errorText || ''))); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) cons.push(m.type() + ': ' + m.text().slice(0, 200)); }); page.on('pageerror', (e) => cons.push('pageerror: ' + String(e).slice(0, 200)));
page.on('response', (r) => { const u = r.url(); if (/\.js(\?|$)/.test(u) && /avatar|digital|drawer|customize/i.test(u)) scripts.push(r.status() + ' ' + u.replace(/\?.*/, '').slice(-110)); });
await page.goto('https://www.pippit.ai/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(15000); await page.getByText('Avatar video', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(50000);
const st = await page.evaluate(() => ({ skeleton: !!document.querySelector('[class*=drawer-skeleton]'), drawerText: (document.querySelector('.lv-drawer-content')?.innerText || '').slice(0, 800), n: document.querySelectorAll('.lv-drawer-content *').length }));
await page.screenshot({ path: 'C:/w/PiperLine/captures/current_670/avatar_modal/modal_50s.png' }); console.log(JSON.stringify(st)); console.log('FALHAS', JSON.stringify(fails.slice(0, 12))); console.log('CONSOLE', JSON.stringify(cons.slice(0, 12))); console.log('SCRIPTS', JSON.stringify(scripts.slice(0, 12)));
await b.close().catch(() => {}); process.exit(0);
