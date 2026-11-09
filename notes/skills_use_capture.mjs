// Captura SOMENTE LEITURA do que acontece ao clicar em "Use" em cada skill da loja do Pippit (Chrome 9222 logado). NUNCA envia mensagem nem clica em gerar.
// Para cada skill: URL final, textos do compositor (placeholder/valor/ghost text), chips, tile de upload, botões, modelos, custo, rede (JSON /api/biz sem telemetria) e screenshot.
// Saída em OUT (padrão: pasta temporária) para não alterar o projeto durante a regeneração do manifesto. Uso: node skills_use_capture.mjs <saida>
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const OUT = process.argv[2] || 'C:/w/PiperLine/captures/skills_670/use'; const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; const WAIT = Number(process.env.WAIT || 3500); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222'); const ctx = browser.contexts()[0]; const page = ctx.pages()[0];
const skip = /report|event\/report|log\/|monitor|mon-sg|slardar|clarity|bing|google|telemetry|\.png|\.jpg|\.webp|\.js(\?|$)|\.css|\.woff/i; let net = [];
page.on('response', async (r) => { const u = r.url(); if (skip.test(u) || !/pippit\.ai\/(api|commerce)/.test(u)) return; let body = null; try { const t = await r.text(); body = t.length < 400000 ? t : t.slice(0, 400000); } catch {} net.push({ m: r.request().method(), u: u.replace(/\?.*/, ''), s: r.status(), req: (r.request().postData() || '').slice(0, 2000), body }); });
const cardInfo = async () => page.evaluate(() => { const isD = (b) => (b.textContent || '').trim() === 'Details'; return [...document.querySelectorAll('button')].filter(isD).map((d) => { let el = d, best = d; while (el.parentElement) { const n = [...el.parentElement.querySelectorAll('button')].filter(isD).length; if (n !== 1) break; el = el.parentElement; best = el; } const use = [...best.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Use'); return { text: (best.innerText || '').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean), hasUse: !!use }; }); });
async function toStore() { await page.goto('https://www.pippit.ai/skill', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4500); for (let i = 0; i < 6; i++) { await page.evaluate(() => { [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible').forEach((e) => (e.scrollTop = e.scrollHeight)); }); await page.waitForTimeout(700); } }
await toStore(); const cards = await cardInfo(); console.log('cartões', cards.length, 'com Use:', cards.filter((c) => c.hasUse).length);
const results = [];
for (let i = 0; i < cards.length; i++) {
  if (ONLY && !ONLY.includes(i)) continue; await toStore(); net = [];
  const name = cards[i].text[0]; const before = page.url();
  const clicked = await page.evaluate((k) => { const isD = (b) => (b.textContent || '').trim() === 'Details'; const ds = [...document.querySelectorAll('button')].filter(isD); let el = ds[k], best = ds[k]; while (el.parentElement) { const n = [...el.parentElement.querySelectorAll('button')].filter(isD).length; if (n !== 1) break; el = el.parentElement; best = el; } const use = [...best.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Use'); if (!use) return false; use.scrollIntoView({ block: 'center' }); use.click(); return true; }, i);
  await page.waitForTimeout(WAIT);
  const st = await page.evaluate(() => {
    const att = (el) => ({ tag: el.tagName, ph: el.getAttribute('placeholder'), dph: el.getAttribute('data-placeholder'), aph: el.getAttribute('aria-placeholder'), ce: el.getAttribute('contenteditable'), role: el.getAttribute('role'), value: el.value ?? null, text: (el.innerText || '').slice(0, 1500) });
    const edit = [...document.querySelectorAll('textarea,[contenteditable=true],[contenteditable=""],[role=textbox],input[type=text]')].map(att);
    const phEls = [...document.querySelectorAll('[placeholder],[data-placeholder],[aria-placeholder]')].map((e) => ({ tag: e.tagName, ph: e.getAttribute('placeholder') || e.getAttribute('data-placeholder') || e.getAttribute('aria-placeholder') }));
    const btns = [...document.querySelectorAll('button,[role=button]')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 80);
    const pseudo = [...document.querySelectorAll('*')].map((e) => { const c = getComputedStyle(e, '::before').content; const a = getComputedStyle(e, '::after').content; return [c, a].filter((x) => x && x !== 'none' && x !== 'normal' && x.length > 12).map((x) => x.slice(0, 1500)); }).flat().slice(0, 10);
    const body = document.body.innerText.replace(/\n{2,}/g, String.fromCharCode(10)).slice(0, 6000);
    return { url: location.href, title: document.title, edit, phEls, btns, pseudo, body, dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => d.innerText.slice(0, 2000)) };
  });
  const shot = `${OUT}/use_${String(i).padStart(2, '0')}_${name.replace(/[^A-Za-z0-9]+/g, '_')}.png`; await page.screenshot({ path: shot }).catch(() => {});
  const rec = { indice: i, skill: name, clicouUse: clicked, urlAntes: before, estado: st, rede: net.map((n) => ({ ...n, bodySha256: n.body ? crypto.createHash('sha256').update(n.body).digest('hex') : null })), screenshot: shot };
  results.push(rec); fs.writeFileSync(`${OUT}/skills_use_capture.json`, JSON.stringify({ observadoEm: new Date().toISOString(), parcial: true, cartoes: cards, resultados: results }, null, 1)); console.log(i, name, '→', st.url.replace('https://www.pippit.ai', ''), '| editáveis:', st.edit.length, '| rede:', net.length);
}
const json = JSON.stringify({ observadoEm: new Date().toISOString(), cartoes: cards, resultados: results }, null, 1); fs.writeFileSync(`${OUT}/skills_use_capture.json`, json); console.log('sha256', crypto.createHash('sha256').update(json).digest('hex'));
await toStore(); await browser.close().catch(() => {}); process.exit(0);
