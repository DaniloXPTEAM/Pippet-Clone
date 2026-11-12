// Rodada 7 · item 3 (tela) — login no navegador com o adaptador local: tela, sessão, rota protegida e saída.
import assert from 'node:assert/strict';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('auth_ui')) process.exit(0);
const f = await startUiFixture('piperline-auth-ui-'); let browser;
try {
  const api = (p, b, m = 'POST') => fetch(f.base + p, { method: b ? m : 'GET', headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
  await api('/api/auth/password', { password: 'senha-de-teste' }); await api('/api/auth/require', { required: true });
  browser = await launchChromium(); const page = await browser.newPage();
  // rota protegida derruba para a tela de login
  await page.goto(f.base + '/#/home'); await page.locator('#loginPage').waitFor();
  assert.match(await page.locator('#loginPage').innerText(), /Entrar/);
  assert.equal(await page.locator('#loginPage button:has-text("Google")').isDisabled(), true, 'OAuth Google é só contrato (botão desligado)');
  assert.equal(await page.locator('#loginPage button:has-text("TikTok")').isDisabled(), true, 'OAuth TikTok é só contrato (botão desligado)');
  assert.match(await page.locator('#loginPage').innerText(), /falta credencial/);
  // senha errada não entra e a mensagem é honesta
  await page.fill('#loginPass', 'errada'); await page.click('#loginGo'); await page.waitForFunction(() => /senha incorreta/.test(document.querySelector('#loginRes')?.textContent || ''));
  // senha certa entra, cria sessão e volta para a home
  await page.fill('#loginPass', 'senha-de-teste'); await page.click('#loginGo'); await page.waitForFunction(() => location.hash === '#/home'); await page.locator('#prompt').waitFor();
  assert.equal(await page.evaluate(async () => (await fetch('/api/projects')).status), 200, 'cookie de sessão vale para a API');
  // configurações mostram o estado real dos adaptadores e permitem sair
  await page.goto(f.base + '/#/settings/sign_management'); await page.locator('#authSignOut').waitFor();
  const st = await page.locator('#main').innerText(); assert.match(st, /Supabase \(GoTrue\)/); assert.match(st, /fala GoTrue/); assert.match(st, /sessão atual/i);
  await page.click('#authSignOut'); await page.locator('#loginPage').waitFor();
  assert.equal(await page.evaluate(async () => (await fetch('/api/projects')).status), 401, 'depois de sair a rota volta a exigir login');
  // sem exigência de login, a home abre normalmente (como hoje)
  await api('/api/auth/require', { required: false });
  await page.goto(f.base + '/#/home'); await page.locator('#prompt').waitFor();
  console.log('auth_ui: OK');
} finally { if (browser) await browser.close(); await f.close(); }
