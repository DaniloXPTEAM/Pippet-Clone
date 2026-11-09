// Sequencia somente leitura: para cada alvo (x,y ou texto) clica, registra texto novo + screenshot, fecha com Escape. Uso: node notes/cdp_seq.mjs prefixo "rotulo=x,y" ...
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const [prefix, ...steps] = process.argv.slice(2); const OUT = 'C:/w/PiperLine/captures/audit';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const ctx = b.contexts()[0]; const page = ctx.pages().find((p) => /pippit\.ai/.test(p.url()));
const res = {};
for (const s of steps) { const [lab, xy] = s.split('='); const before = await page.evaluate(() => document.body.innerText);
  if (xy.includes(',')) { const [x, y] = xy.split(',').map(Number); await page.mouse.click(x, y); } else await page.getByText(xy, { exact: true }).first().click({ timeout: 4000 }).catch((e) => console.log('falhou', xy));
  await page.waitForTimeout(1800); const after = await page.evaluate(() => document.body.innerText); res[lab] = { url: page.url(), added: after.split('\n').filter((l) => l.trim() && !before.includes(l)).slice(0, 60) };
  await page.screenshot({ path: `${OUT}/${prefix}_${lab}.png` }); await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
fs.writeFileSync(`${OUT}/${prefix}.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res).slice(0, 3000)); await b.close();
