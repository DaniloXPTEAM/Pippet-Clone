// Observação SOMENTE LEITURA da Loja de habilidades do Pippit (Chrome 9222 logado): rola a lista até o fim, lê cada cartão e abre o diálogo "Details" de cada skill (nunca clica em Use,
// Favorite, Install, Create ou qualquer ação que altere a conta). Saída: captures/skills_670/skills_observed.json (+ sha256). Uso: node skills_observe.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222'); const ctx = browser.contexts()[0]; const page = ctx.pages().find((p) => /pippit\.ai\/skill/.test(p.url())) || ctx.pages()[0];
if (!/\/skill/.test(page.url())) { await page.goto('https://www.pippit.ai/skill', { waitUntil: 'domcontentloaded' }); }
await page.waitForTimeout(4000);
const cards = async () => page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === 'Details').length);
// rolar até carregar tudo (e clicar "Load more" se existir — é só paginação de leitura)
let prev = -1; for (let i = 0; i < 25; i++) { const n = await cards(); if (n === prev) break; prev = n; await page.evaluate(() => { const sc = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); sc.forEach((e) => (e.scrollTop = e.scrollHeight)); window.scrollTo(0, document.body.scrollHeight); }); const lm = page.getByRole('button', { name: /^Load more$/i }); if (await lm.count()) { await lm.first().click().catch(() => {}); } await page.waitForTimeout(1500); }
const total = await cards(); console.log('cartões com Details:', total);
const tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim()));
const list = await page.evaluate(() => { const isD = (b) => (b.textContent || '').trim() === 'Details'; const ds = [...document.querySelectorAll('button')].filter(isD); return ds.map((b) => { let el = b, best = b; while (el.parentElement) { const n = [...el.parentElement.querySelectorAll('button')].filter(isD).length; if (n !== 1) break; el = el.parentElement; best = el; } return (best.innerText || '').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean).join(String.fromCharCode(10)); }); });
const out = { observadoEm: new Date().toISOString(), url: page.url(), abas: tabs, cartoes: list, detalhes: [] };
for (let i = 0; i < total; i++) {
  await page.evaluate((k) => { const ds = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === 'Details'); ds[k].scrollIntoView({ block: 'center' }); ds[k].click(); }, i);
  await page.waitForTimeout(1800);
  const d = await page.evaluate(() => { const dlg = document.querySelector('[role=dialog]'); if (!dlg) return null; const media = [...dlg.querySelectorAll('video,img,source')].map((m) => ({ tag: m.tagName, src: (m.currentSrc || m.src || '').slice(0, 200), alt: m.alt || '' })); const terms = [...dlg.querySelectorAll('dt')].map((t, k) => [t.innerText, dlg.querySelectorAll('dd')[k]?.innerText]); const btns = [...dlg.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean); return { texto: dlg.innerText, termos: terms, botoes: btns, midia: media }; });
  out.detalhes.push({ indice: i, cartao: list[i]?.split('\n')[0] || null, dialogo: d }); console.log(i, d ? (d.texto || '').split('\n')[0] : 'sem diálogo');
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
}
const json = JSON.stringify(out, null, 1); fs.mkdirSync('C:/w/PiperLine/captures/skills_670', { recursive: true }); fs.writeFileSync('C:/w/PiperLine/captures/skills_670/skills_observed.json', json); console.log('sha256', crypto.createHash('sha256').update(json).digest('hex'));
await browser.close().catch(() => {}); process.exit(0);
