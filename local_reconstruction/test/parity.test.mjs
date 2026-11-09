// Paridade de rotulos: cada rotulo OBSERVADO no Pippit (captures/auth/cdp/*.txt) deve existir na tela equivalente do app local.
// Mede cobertura de texto, nao equivalencia visual/comportamental. Saida: lista de ausentes + docs/PARITY_REPORT.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-parity-')); process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5195; await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;
const rd = (f) => fs.readFileSync(path.join('C:/w/PiperLine/captures/auth/cdp', f), 'utf8');
// [rota local, rotulos observados no original, fonte]
const CHECKS = [
  ['/home', ['Criativo', 'Estúdio de marketing', 'Estúdio de histórias', 'Tela', 'Ativos', 'Habilidades', 'Criação inteligente', 'Mais', 'Histórico'], 'oauth_redirect/2_pagina_0.txt (sidebar)'],
  ['/analytics', ['Gerador de vídeos', 'Avatares e vozes', 'Análise', 'Vincular conta', 'Por conta', 'Por publicação', 'Agregue e compare'], 'oauth_redirect/2_pagina_0.txt'],
  ['/editor', ['Mídia', 'Legendas', 'Avatares', 'Texto', 'Áudio', 'Elementos', 'Corte', 'Carregar', 'Exportar'], 'editor_right_panel/5_1_Básico.txt'],
];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await fetch(`${base}/api/daily-claim`, { method: 'POST' });
const report = []; let missing = 0, total = 0;
for (const [route, labels, src] of CHECKS) {
  await page.goto(`${base}/#${route}`); await page.waitForTimeout(900); const txt = await page.evaluate(() => document.body.innerText);
  const miss = labels.filter((l) => !txt.includes(l)); total += labels.length; missing += miss.length; report.push({ route, source: src, checked: labels.length, missing: miss });
  console.log(route, `${labels.length - miss.length}/${labels.length}`, miss.length ? 'AUSENTES: ' + miss.join(' | ') : 'ok');
}
// editor: abas do painel direito observadas (aparecem so com clipe selecionado; verificadas no teste ui)
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'parity-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), total, missing, report }, null, 1));
console.log(`paridade de rotulos: ${total - missing}/${total}`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
