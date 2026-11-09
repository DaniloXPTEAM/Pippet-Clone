// Deixa o drawer Avatar video com o filtro Gender=Female aplicado (somente leitura) para o REA inspecionar passivamente.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages().find((p) => p.url().includes('pippit.ai/home')) || b.contexts()[0].pages()[0];
await page.goto('https://www.pippit.ai/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(15000); await page.getByText('Avatar video', { exact: true }).locator('visible=true').first().click();
await page.waitForFunction(() => !document.querySelector('[class*=drawer-skeleton]') && /Choose avatar/.test(document.body.innerText), null, { timeout: 240000 }); await page.waitForTimeout(4000);
const D = page.locator('.lv-drawer-content'); await D.getByText('Gender', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(800); await D.locator('label.lv-checkbox').getByText('Female', { exact: true }).first().click(); await page.waitForTimeout(3500);
console.log('ok'); await b.close().catch(() => {}); process.exit(0);
