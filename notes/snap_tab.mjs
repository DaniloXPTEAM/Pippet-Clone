// Salva texto visível + screenshot de uma aba aberta do Chrome 9222 (por índice ou trecho de URL). Uso: node snap_tab.mjs <indice|trecho-url> <saida-dir>
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const [sel, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const pages = b.contexts()[0].pages(); const page = /^\d+$/.test(sel) ? pages[Number(sel)] : pages.find((p) => p.url().includes(sel));
const texto = await page.evaluate(() => document.body.innerText); await page.screenshot({ path: `${OUT}/pagina.png` }); fs.writeFileSync(`${OUT}/captura.json`, JSON.stringify({ observadoEm: new Date().toISOString(), url: page.url(), texto }, null, 1)); console.log(page.url()); console.log(JSON.stringify(texto.split('\n').map((x) => x.trim()).filter(Boolean)).slice(0, 2500));
await b.close().catch(() => {}); process.exit(0);
