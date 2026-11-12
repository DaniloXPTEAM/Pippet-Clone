// Linha #3 — chat legado SOMENTE LEITURA: leitor do formato conhecido (agent-chat: id/role/content/timestamp).
// Nenhum conteúdo real foi capturado: campos ausentes viram UNOBSERVED e nada é inventado nem alterado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-lc-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
const LC = await import('../app/lib/legacy_chat.mjs');
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

try {
  // ---------- contrato ----------
  const c = await api('/api/legacy-chat', undefined, 'GET');
  assert.equal(c.status, 200); assert.equal(c.body.name, 'agent-chat'); assert.equal(c.body.readOnly, true);
  assert.match(c.body.version, /UNOBSERVED/); assert.match(c.body.note, /UNOBSERVED/);

  // ---------- unidade: formatos e UNOBSERVED ----------
  const full = LC.parseConversation([{ id: 'a1', role: 'user', content: 'olá', created_at: '2023-01-02T10:00:00Z' }]);
  assert.equal(full.ok, true); assert.equal(full.messages[0].content, 'olá');
  assert.match(full.messages[0].observed, /não verificado/);
  const wrapped = LC.parseConversation({ messages: [{ role: 'assistant', text: 'oi!', ts: 1700000000 }] });
  assert.equal(wrapped.messages[0].content, 'oi!'); assert.ok(wrapped.messages[0].at.startsWith('2023-'));
  const faltando = LC.parseConversation([{ role: 'user' }, { content: 'sem papel' }]);
  assert.equal(faltando.messages[0].content, 'UNOBSERVED');
  assert.equal(faltando.messages[1].role, 'UNOBSERVED');
  assert.ok(faltando.warnings.length >= 2, 'avisos marcam o que falta');
  const jsonl = LC.parseConversation('{"role":"user","content":"linha 1"}\n{"role":"assistant","content":"linha 2"}');
  assert.equal(jsonl.messages.length, 2);
  assert.equal(LC.parseConversation('').ok, false);
  const texto = LC.parseConversation('nada disso');
  assert.equal(texto.messages.length, 1, 'texto puro vira linha interpretada, nunca descartado em silêncio');
  assert.equal(texto.messages[0].role, 'UNOBSERVED');

  // ---------- rota de leitura (não altera nada) ----------
  const r1 = await api('/api/legacy-chat/read', { data: [{ id: 'x', role: 'user', content: 'pergunta', created_at: '2023-05-01T00:00:00Z' }, { role: 'assistant' }] });
  assert.equal(r1.status, 200); assert.equal(r1.body.readOnly, true);
  assert.equal(r1.body.messages.length, 2); assert.equal(r1.body.messages[1].content, 'UNOBSERVED');
  assert.match(r1.body.note, /nada foi alterado/);
  const r2 = await api('/api/legacy-chat/read', { data: '' });
  assert.equal(r2.status, 400);

  // ---------- UI somente leitura ----------
  if (skipUnavailableBrowser('legacy_chat_ui')) { console.log('SKIP legacy_chat_ui: navegador indisponível'); process.exit(0); }
  const browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/#/legacy-chat'); await page.waitForSelector('#lcText');
  await page.fill('#lcText', '[{"role":"user","content":"olá legado","created_at":"2023-01-02T10:00:00Z"},{"role":"assistant"}]');
  await page.click('#lcRead'); await page.waitForFunction(() => document.querySelectorAll('#lcOut .card').length >= 2);
  const out = await page.locator('#lcOut').innerText();
  assert.match(out, /olá legado/); assert.match(out, /UNOBSERVED/);
  assert.deepEqual(errors, [], 'sem erro de página');
  await browser.close();
  console.log('ok (test/legacy_chat.test.mjs)');
} finally {
  await new Promise((r) => server.close(r));
}
