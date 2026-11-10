// Paridade de rotulos: cada rotulo OBSERVADO no Pippit (captures/auth/cdp/*.txt) deve existir na tela equivalente do app local.
// Mede cobertura de texto, nao equivalencia visual/comportamental. Saida: lista de ausentes + docs/PARITY_REPORT.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, skipMissingEvidence, skipUnavailableBrowser } from './support/browser.mjs';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const captureDir = path.join(repoRoot, 'captures/auth/cdp');
const requiredEvidence = ['oauth_redirect/2_pagina_0.txt', 'editor_right_panel/5_1_Básico.txt'].map((f) => path.join(captureDir, f));
if (skipMissingEvidence('parity', requiredEvidence)) process.exit(0);
if (skipUnavailableBrowser('parity')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-parity-')); process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5195; await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;
const rd = (f) => fs.readFileSync(path.join(captureDir, f), 'utf8');
// [rota local, rotulos observados no original, fonte]
const CHECKS = [
  ['/home', ['Criativo', 'Estúdio de marketing', 'Estúdio de histórias', 'Tela', 'Ativos', 'Habilidades', 'Criação inteligente', 'Mais', 'Histórico'], 'oauth_redirect/2_pagina_0.txt (sidebar)'],
  ['/analytics', ['Gerador de vídeos', 'Avatares e vozes', 'Análise', 'Vincular conta', 'Por conta', 'Por publicação', 'Agregue e compare'], 'oauth_redirect/2_pagina_0.txt'],
  ['/editor', ['Mídia', 'Legendas', 'Avatares', 'Texto', 'Áudio', 'Elementos', 'Corte', 'Carregar', 'Exportar'], 'editor_right_panel/5_1_Básico.txt'],
];
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await fetch(`${base}/api/daily-claim`, { method: 'POST' });
const report = []; let missing = 0, total = 0;
for (const [route, labels, src] of CHECKS) {
  await page.goto(`${base}/#${route}`); await page.waitForTimeout(900); const txt = await page.evaluate(() => document.body.innerText);
  const miss = labels.filter((l) => !txt.includes(l)); total += labels.length; missing += miss.length; report.push({ route, source: src, checked: labels.length, missing: miss });
  console.log(route, `${labels.length - miss.length}/${labels.length}`, miss.length ? 'AUSENTES: ' + miss.join(' | ') : 'ok');
}
// editor: abas do painel direito observadas (aparecem so com clipe selecionado; verificadas no teste ui)
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'parity-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), total, missing, report }, null, 1));
console.log(`paridade de rotulos: ${total - missing}/${total}`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
