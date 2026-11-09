// Sonda somente leitura: clica em coordenadas/texto na aba pippit atual e lista abas, URL e texto visivel novo. Uso: node notes/cdp_probe.mjs nome x,y
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const [name, xy] = process.argv.slice(2); const OUT = 'C:/w/PiperLine/captures/audit';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const ctx = b.contexts()[0]; const page = ctx.pages().find((p) => /pippit\.ai/.test(p.url()));
const before = await page.evaluate(() => document.body.innerText); const nPages = ctx.pages().length;
const [x, y] = xy.split(',').map(Number); await page.mouse.click(x, y); await page.waitForTimeout(6000);
const after = await page.evaluate(() => document.body.innerText); const pages = ctx.pages().map((p) => p.url());
const added = after.split('\n').filter((l) => l.trim() && !before.includes(l));
fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ pagesBefore: nPages, pages, added, url: page.url() }, null, 1)); await page.screenshot({ path: `${OUT}/${name}.png` });
console.log(JSON.stringify({ pagesBefore: nPages, pages, added: added.slice(0, 30) })); await b.close();
