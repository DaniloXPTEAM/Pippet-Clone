// Auditoria de cobertura (somente leitura): enumera a UI viva do Pippit via CDP e salva em captures/audit/<nome>.json + .png.
// Uso: node notes/audit_live.mjs <nome> <url-ou-rota> [--click "texto"]...  (cliques so em controles de navegacao/abrir; nunca confirmar/enviar/comprar)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const [name, target, ...rest] = process.argv.slice(2);
const OUT = 'C:/w/PiperLine/captures/audit'; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0]; const page = ctx.pages().find((p) => /pippit\.ai/.test(p.url())) || ctx.pages()[0];
if (target && target !== '-') { await page.goto(target.startsWith('http') ? target : 'https://www.pippit.ai/' + target.replace(/^[/]+/, ''), { waitUntil: 'domcontentloaded' }); }
await page.waitForTimeout(3500);
for (let i = 0; i < rest.length; i += 2) if (rest[i] === '--xy') { const [x, y] = rest[i + 1].split(',').map(Number); await page.mouse.click(x, y); await page.waitForTimeout(1500); } else if (rest[i] === '--text') { await page.keyboard.press('Escape'); } else if (rest[i] === '--click') { try { await page.getByText(rest[i + 1], { exact: true }).first().click({ timeout: 4000 }); await page.waitForTimeout(1500); } catch (e) { console.log('click falhou:', rest[i + 1], String(e).slice(0, 80)); } }
const info = await page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const txt = (e) => (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  return {
    url: location.href, title: document.title,
    links: [...document.querySelectorAll('a[href]')].filter(vis).map((a) => [txt(a), a.getAttribute('href')]),
    buttons: [...document.querySelectorAll('button,[role=button],[role=tab],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=combobox]')].filter(vis).map((b) => [b.getAttribute('role') || b.tagName.toLowerCase(), txt(b)]),
    clickables: [...document.querySelectorAll('div,span,li,svg,img')].filter((e) => vis(e) && getComputedStyle(e).cursor === 'pointer' && !e.closest('a[href],button') && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')).map((e) => [e.tagName.toLowerCase(), txt(e) || e.getAttribute('class')?.slice(0, 40) || '']).filter((x, i, a) => a.findIndex((y) => y[1] === x[1]) === i).slice(0, 80),
    inputs: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].filter(vis).map((i) => [i.tagName.toLowerCase(), i.type || '', i.placeholder || i.getAttribute('aria-label') || '']),
    headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(txt),
    dialogs: [...document.querySelectorAll('[role=dialog],[class*=modal],[class*=Modal],[class*=popover]')].filter(vis).map((d) => (d.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 300)),
  };
});
fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(info, null, 1)); await page.screenshot({ path: path.join(OUT, name + '.png') });
console.log(info.url, '| links', info.links.length, 'buttons', info.buttons.length, 'inputs', info.inputs.length, 'dialogs', info.dialogs.length);
await browser.close();
