// Rodada 8 · item 1 (tela) — "Continuar com o Google" só liga quando /auth/v1/settings diz google=true.
// Usa um GoTrue falso em 127.0.0.1 (nada de rede real) e o navegador só para provar o estado do botão.
import assert from 'node:assert/strict';
import http from 'node:http';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('auth_google_ui')) process.exit(0);

let google = false;
const fake = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/auth/v1/settings') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ external: { google, email: true }, mailer_autoconfirm: false }));
  }
  if (url.pathname === '/auth/v1/authorize') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<!doctype html><title>falso</title><p id="fakeAuthorize">authorize</p>');
  }
  res.writeHead(404).end();
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const fakeBase = `http://127.0.0.1:${fake.address().port}`;
process.env.SUPABASE_URL = fakeBase; process.env.SUPABASE_ANON_KEY = 'fake-anon-key-nao-usar';

const f = await startUiFixture('piperline-google-ui-'); let browser;
try {
  const api = (p, b) => fetch(f.base + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
  await api('/api/auth/adapter', { adapter: 'supabase' });
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(f.base + '/#/login'); await page.locator('#loginPage').waitFor();
  const gBtn = page.locator('#loginPage button[data-oauth="google"]');
  assert.equal(await gBtn.isDisabled(), true, 'com google=false no settings o botão fica desligado');
  assert.equal(await gBtn.innerText(), 'Continuar com o Google');
  const txt = await page.locator('#loginPage').innerText();
  assert.match(txt, /google=true/, 'a tela diz por que o botão está desligado');
  assert.match(txt, /Authentication → Providers → Google/);
  assert.equal(await page.locator('#loginPage button[data-oauth="tiktok"]').isDisabled(), true);
  // o botão de criar conta existe no adaptador Supabase
  assert.equal(await page.locator('#loginSignup').count(), 1);
  // o servidor não devolve chave nenhuma para a tela
  const st = await fetch(f.base + '/api/auth/settings').then((r) => r.text());
  assert.ok(!st.includes('fake-anon-key-nao-usar'), 'a chave anônima não vai para a resposta da API');

  // Liga o Google no falso e força nova leitura do cache (60 s no servidor)
  google = true;
  await api('/api/auth/settings?force=1');
  await page.reload(); await page.locator('#loginPage').waitFor(); await page.waitForFunction(() => !document.querySelector('#loginPage button[data-oauth="google"]')?.disabled);
  const g2 = page.locator('#loginPage button[data-oauth="google"]');
  assert.equal(await g2.isDisabled(), false, 'com google=true o botão liga');
  assert.doesNotMatch(await page.locator('#loginPage').innerText(), /google=true/);
  // clicar leva ao GoTrue com PKCE (S256) e retorno em 127.0.0.1
  await g2.click();
  await page.waitForURL(/\/auth\/v1\/authorize/, { timeout: 10000 });
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.match(url.searchParams.get('code_challenge'), /^[\w-]{43}$/);
  assert.equal(url.searchParams.get('redirect_to'), 'http://127.0.0.1:5180/auth/callback');
  console.log('auth_google_ui: OK');
} finally { if (browser) await browser.close(); await f.close(); fake.closeAllConnections?.(); await new Promise((r) => fake.close(r)); }
