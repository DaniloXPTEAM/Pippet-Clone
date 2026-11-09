// Deixa uma tela do Pippit num estado aberto (SOMENTE LEITURA) para o REA inspecionar passivamente. Uso: node hold_state.mjs publisher-link | story-addnode
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const which = process.argv[2]; const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const pages = b.contexts()[0].pages();
if (which === 'publisher-link') { const page = pages.find((p) => p.url().includes('pippit.ai/home')) || pages[0]; await page.goto('https://www.pippit.ai/schedule-publish', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000); await page.getByText('Link account', { exact: true }).first().click(); await page.waitForTimeout(1200); }
if (which === 'story-addnode') { const page = pages.find((p) => p.url().includes('story-studio/detail')); await page.locator('[aria-label="Add node"]').first().click(); await page.waitForTimeout(1200); }
if (which === 'style-3d') { const page = pages.find((p) => p.url().includes('story-studio/detail')); const open = await page.evaluate(() => /Customize/.test(document.body.innerText)); if (!open) { await page.getByText('Style library', { exact: true }).first().click(); await page.waitForTimeout(1500); } await page.getByText('3D', { exact: true }).locator('visible=true').last().click(); await page.waitForTimeout(1200); }
console.log('ok', which); await b.close().catch(() => {}); process.exit(0);
