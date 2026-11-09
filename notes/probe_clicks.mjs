// Clica (um a um, SEM confirmar nada) em botões por aria-label numa aba do Chrome 9222, registra o que aparece (texto novo, menus/diálogos, screenshot) e fecha com Escape. Uso: node probe_clicks.mjs <trecho-url> <saida-dir> "<label1>|<label2>|..."
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const [sel, OUT, labels] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); const FORBID = /generate|organize|delete|remove|publish|send|submit|confirm|buy|subscribe|pay|share/i;
const b = await chromium.connectOverCDP('http://127.0.0.1:9222'); const page = b.contexts()[0].pages().find((p) => p.url().includes(sel)); const res = [];
const grab = () => page.evaluate(() => ({ text: document.body.innerText.split('\n').map((x) => x.trim()).filter(Boolean), layers: [...document.querySelectorAll('[role=menu],[role=dialog],[role=tooltip],[role=listbox],[class*=popover],[class*=Popover],[class*=dropdown],[class*=Dropdown],[class*=modal],[class*=Modal],[class*=tooltip],[class*=Tooltip]')].filter((e) => e.getBoundingClientRect().width > 20).map((e) => ({ role: e.getAttribute('role'), cls: (e.getAttribute('class') || '').slice(0, 60), text: e.innerText.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 60) })) }));
const base = await grab(); const baseSet = new Set(base.text);
for (let label of labels.split('|')) {
  const hoverOnly = label.startsWith('~'); if (hoverOnly) label = label.slice(1);
  if (FORBID.test(label)) { res.push({ label, bloqueado: true }); continue; }
  const loc = page.locator(`[aria-label="${label}"]`).first(); if (!(await loc.count())) { res.push({ label, achou: false }); continue; }
  const tip = await loc.evaluate((e) => e.getAttribute('title')); await loc.hover({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); const hov = await grab();
  if (hoverOnly) { res.push({ label, soHover: true, tooltip: hov.text.filter((t) => !baseSet.has(t)) }); await page.mouse.move(5, 400); continue; }
  await loc.click({ timeout: 5000 }).catch((e) => res.push({ label, erro: String(e).slice(0, 120) })); await page.waitForTimeout(1200); const g = await grab();
  await page.screenshot({ path: `${OUT}/${label.replace(/[^A-Za-z0-9]+/g, '_')}.png` }).catch(() => {});
  res.push({ label, title: tip, tooltipAoPassarMouse: hov.text.filter((t) => !baseSet.has(t)), novoTexto: g.text.filter((t) => !baseSet.has(t)), camadas: g.layers.slice(0, 6) });
  await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(500);
}
fs.writeFileSync(`${OUT}/probe.json`, JSON.stringify({ observadoEm: new Date().toISOString(), url: page.url().replace(/\?.*/, ''), resultados: res }, null, 1)); for (const r of res) console.log(JSON.stringify(r).slice(0, 900));
await b.close().catch(() => {}); process.exit(0);
