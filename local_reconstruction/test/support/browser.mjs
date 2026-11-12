// Portable Playwright/Chromium resolution shared by browser-driven UI tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
let loadError = '';
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  loadError = String(error?.message || error);
}

// Rodada 12, item 2: o SKIP de 14–19 s que apareceu no Windows vinha daqui, não do app. `testable()` dava
// 5 s para o binário responder `--version`; num PC carregado (523 MB de RAM livre, antivírus) um Chrome
// frio pode passar disso, e aí TODOS os candidatos "não executam" e o teste é PULADO sem dizer o motivo
// real. Além disso a checagem rodava duas vezes por teste (skipUnavailableBrowser + launchChromium),
// repetindo as sondagens — no Windows são até 3 candidatos × 5 s × 2.
// Agora: uma sondagem por processo (cache), prazo maior e motivo SEMPRE com o que foi tentado e por quê.
let cache = null;
const timeoutDaSondagem = () => (Number(process.env.PIPERLINE_BROWSER_PROBE_MS) > 0 ? Number(process.env.PIPERLINE_BROWSER_PROBE_MS) : 20000);

const probe = (candidate) => {
  const t0 = Date.now();
  let r;
  try {
    r = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: timeoutDaSondagem(), windowsHide: true });
  } catch (error) {
    return { ok: false, ms: Date.now() - t0, motivo: `não foi possível executar (${String(error?.message || error).slice(0, 80)})` };
  }
  const ms = Date.now() - t0;
  if (r.status === 0) return { ok: true, ms };
  if (r.error?.code === 'ETIMEDOUT' || (r.status === null && r.error)) return { ok: false, ms, motivo: `não respondeu em ${timeoutDaSondagem()} ms (binário lento ou travado; aumente PIPERLINE_BROWSER_PROBE_MS)` };
  if (r.status === null) return { ok: false, ms, motivo: 'não respondeu (processo sem código de saída)' };
  return { ok: false, ms, motivo: `saiu com código ${r.status} em ${ms} ms${r.stderr ? `: ${String(r.stderr).trim().split('\n')[0].slice(0, 120)}` : ' (faltam bibliotecas ou o binário não é um navegador)'}` };
};

export function browserAvailability() {
  if (cache) return cache;
  if (!chromium) return (cache = { ok: false, reason: `Playwright não carregou: ${loadError}` });
  const explicit = process.env.PIPERLINE_CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROME_PATH;
  const bundled = (() => { try { return chromium.executablePath(); } catch (error) { return `(indisponível: ${String(error?.message || error).slice(0, 80)})`; } })();
  const candidatos = explicit
    ? [['PIPERLINE_CHROMIUM_EXECUTABLE', explicit]]
    : [['chromium do Playwright', bundled],
      ...(process.platform === 'win32'
        ? [['Chrome (Program Files)', path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe')],
          ['Chrome (Program Files x86)', path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe')]]
        : process.platform === 'darwin'
          ? [['Chrome (Applications)', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']]
          : [['chromium', '/usr/bin/chromium'], ['chromium-browser', '/usr/bin/chromium-browser'], ['google-chrome', '/usr/bin/google-chrome']])];
  const tentativas = [];
  for (const [rotulo, caminho] of candidatos) {
    if (!caminho || !fs.existsSync(caminho)) { tentativas.push(`${rotulo} em ${caminho || '(vazio)'}: não existe`); continue; }
    const r = probe(caminho);
    if (r.ok) return (cache = { ok: true, executablePath: caminho, probeMs: r.ms, origem: rotulo });
    tentativas.push(`${rotulo} em ${caminho}: ${r.motivo}`);
  }
  const dica = process.platform === 'linux' ? ' Neste sandbox, downloads de cdn.playwright.dev e apt.debian.org são bloqueados; o browser empacotado também requer libnspr4/libnss3.' : '';
  return (cache = { ok: false, reason: `nenhum Chromium executável (${tentativas.join(' | ') || 'nenhum candidato'}). Defina PIPERLINE_CHROMIUM_EXECUTABLE com o caminho do navegador.${dica}` });
}

export async function launchChromium(options = {}) {
  const available = browserAvailability();
  if (!available.ok) throw new Error(available.reason);
  return chromium.launch({ headless: true, executablePath: available.executablePath, ...(process.platform === 'linux' ? { args: ['--no-sandbox', ...(options.args || [])] } : {}), ...options });
}

// Deixa o navegador N vezes mais lento (throttle de CPU do CDP). Serve para reproduzir em Linux o timing
// de um PC modesto: foi sob lentidão que a instabilidade apareceu no Windows (rodada 10) e é sob lentidão
// que dá para descobrir QUAL espera estoura (rodada 12). Use PIPERLINE_TEST_CPU_RATE=8.
export async function applyCpuThrottle(page, rate = Number(process.env.PIPERLINE_TEST_CPU_RATE || 0)) {
  if (!(rate > 1)) return 0;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return rate;
}

export function skipUnavailableBrowser(testName) {
  const available = browserAvailability();
  if (available.ok) return false;
  console.log(`SKIP ${testName}: ${available.reason}`);
  return true;
}

export function skipMissingEvidence(testName, files) {
  const absent = files.filter((file) => !fs.existsSync(file));
  if (!absent.length) return false;
  console.log(`SKIP ${testName}: evidência local não incluída neste checkout: ${absent.join(', ')}`);
  return true;
}
