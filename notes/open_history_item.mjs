// Abre (SOMENTE LEITURA) um item do Histórico do Pippit pelo texto e salva URL, texto visível, screenshot. Uso: node open_history_item.mjs "<texto>" <saida-dir> [espera-ms]
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const [label, OUT, wait] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages()[0];
await page.goto('https://www.pippit.ai/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
await page.getByText(label, { exact: true }).first().click(); await page.waitForTimeout(Number(wait || 20000));
const texto = await page.evaluate(() => document.body.innerText); await page.screenshot({ path: `${OUT}/pagina.png` });
fs.writeFileSync(`${OUT}/captura.json`, JSON.stringify({ observadoEm: new Date().toISOString(), url: page.url(), texto }, null, 1)); console.log(page.url());
await b.close().catch(() => {}); process.exit(0);
