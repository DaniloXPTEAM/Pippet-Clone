// Linha #19 — widget de ajuda local: botão, painel e conversa (interface genérica do widget de terceiros
// observado — kefu-im), respostas LOCAIS, sem token de terceiro. O conteúdo real do widget de suporte é
// UNOBSERVED e a interface local nunca mente sobre isso.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { shotsDir } from './support/shots.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-hw-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

try {
  // ---------- API: contrato local, sem terceiro ----------
  const cfg = await api('/api/help-widget/config', undefined, 'GET');
  assert.equal(cfg.status, 200); assert.equal(cfg.body.source, 'local');
  assert.equal(cfg.body.thirdParty, null); assert.equal(cfg.body.thirdPartyToken, null);
  assert.equal(cfg.body.externalCalls, false);
  assert.equal(cfg.body.buttonLabel, 'Ajuda'); assert.equal(cfg.body.panelTitle, 'Como podemos ajudar?');
  assert.match(cfg.body.note, /kefu-im/); assert.match(cfg.body.note, /UNOBSERVED/);

  const c1 = await api('/api/help-widget/chat', { message: 'Como recebo créditos de bônus?' });
  assert.equal(c1.status, 200); assert.equal(c1.body.confidence, 'local');
  assert.match(c1.body.reply, /200 cr(é|e)ditos/); assert.equal(c1.body.kbId, 'creditos-bonus');

  const c2 = await api('/api/help-widget/chat', { message: 'Qual a capital da Austrália?' });
  assert.equal(c2.body.confidence, 'unobserved'); assert.match(c2.body.reply, /UNOBSERVED/);
  const vazio = await api('/api/help-widget/chat', { message: '  ' });
  assert.equal(vazio.status, 400);

  // ---------- UI: botão → painel → conversa ----------
  if (skipUnavailableBrowser('help_widget_ui')) { console.log('SKIP help_widget_ui: navegador indisponível'); process.exit(0); }
  const SHOTS = shotsDir();
  const browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/#/home'); await page.waitForSelector('#helpWidgetBtn');
  assert.ok(await page.locator('#helpWidgetBtn').isVisible(), 'botão flutuante visível');
  await page.click('#helpWidgetBtn'); await page.waitForSelector('#helpWidgetPanel:not([hidden])');
  assert.ok(await page.locator('#helpWidgetMsgs').isVisible(), 'painel com conversa');
  await page.fill('#hwInput', 'Quanto custa o plano Pro?'); await page.click('#hwSend');
  await page.waitForFunction(() => document.querySelectorAll('#helpWidgetMsgs .hw-msg.bot').length >= 1);
  const msgs = await page.locator('#helpWidgetMsgs').innerText();
  assert.match(msgs, /R\$ 199/, 'resposta local sobre planos');
  await page.fill('#hwInput', 'Como funciona o reembolso?'); await page.click('#hwSend');
  await page.waitForFunction(() => document.querySelectorAll('#helpWidgetMsgs .hw-msg.bot').length >= 2);
  const msgs2 = await page.locator('#helpWidgetMsgs').innerText();
  assert.match(msgs2, /UNOBSERVED/, 'pergunta sem base local responde UNOBSERVED');
  await page.screenshot({ path: path.join(SHOTS, '34_help_widget.png') });
  assert.deepEqual(errors, [], 'sem erro de página');
  await browser.close();
  console.log('ok (test/help_widget_ui.test.mjs)');
} finally {
  await new Promise((r) => server.close(r));
}
