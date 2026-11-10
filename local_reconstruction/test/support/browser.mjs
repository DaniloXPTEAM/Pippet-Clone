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

const testable = (candidate) => {
  if (!candidate || !fs.existsSync(candidate)) return false;
  const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 5000 });
  return probe.status === 0;
};

export function browserAvailability() {
  if (!chromium) return { ok: false, reason: `Playwright não carregou: ${loadError}` };
  const explicit = process.env.PIPERLINE_CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROME_PATH;
  if (explicit) return testable(explicit) ? { ok: true, executablePath: explicit } : { ok: false, reason: `Chromium configurado em ${explicit}, mas não executa (faltam dependências/libs ou o binário).` };
  const bundled = chromium.executablePath();
  if (testable(bundled)) return { ok: true, executablePath: bundled };
  const candidates = process.platform === 'win32'
    ? [path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe')]
    : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  const found = candidates.find(testable);
  if (found) return { ok: true, executablePath: found };
  return { ok: false, reason: `Chromium não está executável. Playwright espera ${bundled}; instale-o com “npx playwright install chromium” e as bibliotecas de sistema. ` + (process.platform === 'linux' ? 'Neste sandbox, downloads de cdn.playwright.dev e apt.debian.org são bloqueados; o browser empacotado também requer libnspr4/libnss3.' : '') };
}

export async function launchChromium(options = {}) {
  const available = browserAvailability();
  if (!available.ok) throw new Error(available.reason);
  return chromium.launch({ headless: true, executablePath: available.executablePath, ...(process.platform === 'linux' ? { args: ['--no-sandbox', ...(options.args || [])] } : {}), ...options });
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
