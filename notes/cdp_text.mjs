// Salva o texto visivel completo de uma pagina (somente leitura). Uso: node notes/cdp_text.mjs nome rota [--scroll]
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const [name, route, scroll] = process.argv.slice(2);
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const ctx = b.contexts()[0]; const page = ctx.pages().find((p) => /pippit\.ai/.test(p.url()));
await page.goto('https://www.pippit.ai/' + route.replace(/^[/]+/, ''), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
if (scroll) for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(500); }
const t = await page.evaluate(() => document.body.innerText); fs.writeFileSync(`C:/w/PiperLine/captures/audit/${name}.txt`, t, 'utf8'); console.log(page.url(), t.length, 'chars'); await b.close();
