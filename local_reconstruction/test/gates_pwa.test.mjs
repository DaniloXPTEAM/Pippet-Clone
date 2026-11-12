// Linha #27 — portas de idade, aviso US, instalador PWA (manifest + service worker) e painel dev,
// TUDO ativado por configuração. Desligado = nada muda (403 nas rotas privadas). Textos das telas
// originais UNOBSERVED; nenhum valor de credencial aparece no painel dev.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { shotsDir } from './support/shots.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-gates-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.TIKTOK_CLIENT_KEY = 'segredo-fake-123'; // para provar que o painel dev NUNCA vaza valor
delete process.env.PIPIT_AGE_GATE; delete process.env.PIPIT_US_NOTICE; delete process.env.PIPIT_PWA; delete process.env.PIPIT_DEV_PANEL;

const { server } = await import('../app/server.mjs');
const GATES = await import('../app/lib/gates.mjs');
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
process.env.PIPERLINE_PUBLIC_ORIGIN = base;
const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

try {
  // ---------- 1) desligado por padrão ----------
  const g0 = await api('/api/gates', undefined, 'GET');
  assert.equal(g0.status, 200);
  assert.equal(g0.body.ageGate.enabled, false); assert.equal(g0.body.usNotice.enabled, false);
  assert.equal(g0.body.pwa.enabled, false); assert.equal(g0.body.devPanel.enabled, false);
  assert.equal((await api('/api/gates/age/verify', { birthDate: '1990-01-01' })).status, 403);
  assert.equal((await api('/api/dev-panel', undefined, 'GET')).status, 403);

  // ---------- 2) PWA: manifest + service worker sempre servidos; ícones existem ----------
  const mf = await fetch(base + '/manifest.webmanifest');
  assert.equal(mf.status, 200); assert.match(mf.headers.get('content-type'), /manifest\+json/);
  const man = await mf.json();
  assert.equal(man.display, 'standalone'); assert.equal(man.start_url, '/#/home');
  assert.ok(man.icons.length >= 2);
  for (const ic of man.icons) assert.ok(fs.existsSync(path.join(import.meta.dirname, '../app/public', path.basename(ic.src))), `ícone ${ic.src} existe`);
  const sw = await fetch(base + '/sw.js');
  assert.equal(sw.status, 200); assert.match(sw.headers.get('content-type'), /javascript/);
  assert.match(await sw.text(), /service worker|CACHE/);

  // ---------- 3) unidade: verifyAge (limites) ----------
  const today = new Date();
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dezoitoAnos = iso(today.getFullYear() - 18, today.getMonth() + 1, today.getDate());
  assert.equal(GATES.verifyAge(dezoitoAnos, { minAge: 18 }).allowed, true, 'faz 18 hoje: passa');
  assert.equal(GATES.verifyAge(iso(today.getFullYear() - 18, today.getMonth() + 1, today.getDate() + 1), { minAge: 18 }).allowed, false, 'faz 18 amanhã: não passa');
  assert.equal(GATES.verifyAge('2015-05-05').allowed, false, 'menor: não passa');
  assert.equal(GATES.verifyAge('banana').allowed, false);
  assert.equal(GATES.verifyAge('2999-01-01').allowed, false, 'data futura: não passa');

  // ---------- 4) ligado por configuração ----------
  process.env.PIPIT_AGE_GATE = 'on'; process.env.PIPIT_US_NOTICE = 'on'; process.env.PIPIT_PWA = 'on'; process.env.PIPIT_DEV_PANEL = 'on';
  const g1 = await api('/api/gates', undefined, 'GET');
  assert.equal(g1.body.ageGate.enabled, true); assert.equal(g1.body.usNotice.enabled, true);
  assert.equal(g1.body.pwa.enabled, true); assert.equal(g1.body.devPanel.enabled, true);
  assert.match(g1.body.age.text, /UNOBSERVED/); assert.match(g1.body.usNotice.text, /UNOBSERVED/);

  const menor = await api('/api/gates/age/verify', { birthDate: '2015-05-05' });
  assert.equal(menor.body.allowed, false); assert.match(menor.body.reason, /18/);
  const maior = await api('/api/gates/age/verify', { birthDate: '1990-01-01' });
  assert.equal(maior.body.allowed, true); assert.ok(maior.body.acceptedAt);

  const dp = await api('/api/dev-panel', undefined, 'GET');
  assert.equal(dp.status, 200);
  assert.equal(dp.body.node, process.version);
  assert.ok(dp.body.counts && typeof dp.body.counts.assets === 'number');
  assert.equal(dp.body.envPresence.TIKTOK_CLIENT_KEY, true, 'presença marcada');
  assert.ok(!JSON.stringify(dp.body).includes('segredo-fake-123'), 'o VALOR da credencial nunca aparece');

  // ---------- 5) UI (navegador): porta de idade, aviso US, PWA e painel dev ----------
  if (skipUnavailableBrowser('gates_pwa_ui')) { console.log('SKIP gates_pwa_ui: navegador indisponível'); process.exit(0); }
  const SHOTS = shotsDir();
  const browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/#/home'); await page.waitForSelector('#ageGate');
  assert.ok(await page.locator('#ageGate').isVisible(), 'porta de idade bloqueia a entrada');
  await page.fill('#ageBirth', '2015-05-05'); await page.click('#ageOk'); await page.waitForSelector('#ageErr:not(:empty)');
  assert.match(await page.locator('#ageErr').innerText(), /18/);
  await page.fill('#ageBirth', '1990-01-01'); await page.click('#ageOk');
  await page.waitForSelector('#ageGate', { state: 'detached' });
  await page.screenshot({ path: path.join(SHOTS, '35_age_gate.png') });
  assert.ok(await page.locator('#usNotice').isVisible(), 'aviso US visível');
  assert.match(await page.locator('#usNotice').innerText(), /UNOBSERVED/);
  const manifestLink = await page.evaluate(() => !!document.querySelector('link[rel="manifest"]'));
  assert.equal(manifestLink, true, 'manifest ligado no head');
  const swCount = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  assert.ok(swCount >= 1, 'service worker registrado');
  await page.reload(); await page.waitForSelector('#side .nav'); await page.waitForTimeout(600);
  assert.equal(await page.locator('#ageGate').count(), 0, 'porta aceita não volta (persistência local)');
  await page.goto(base + '/#/dev'); await page.waitForSelector('#devJson');
  assert.match(await page.locator('#devJson').innerText(), /"node"/, 'painel dev renderiza');
  await page.screenshot({ path: path.join(SHOTS, '36_dev_panel.png') });
  assert.deepEqual(errors, [], 'sem erro de página');
  await browser.close();
  console.log('ok (test/gates_pwa.test.mjs)');
} finally {
  await new Promise((r) => server.close(r));
}
