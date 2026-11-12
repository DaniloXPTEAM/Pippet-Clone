// Histórico de chats do canvas: o painel Chat history lê project.chats; vazio = "No history yet", sem inventar chats.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-chathist-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
const j = async (url, o = {}) => { const r = await fetch(base + url, o); return { status: r.status, body: await r.json() }; };
const post = (url, body) => j(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
try {
  const project = (await post('/api/projects', { type: 'canvas', title: 'histórico' })).body;
  const empty = await j(`/api/projects/${project.id}`);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.chats, [], 'projeto novo não tem histórico (base do texto "No history yet")');

  const first = (await post(`/api/projects/${project.id}/chats`)).body;
  assert.equal(first.title, 'Novo chat'); assert.deepEqual(first.messages, []);
  const second = (await post(`/api/projects/${project.id}/chats`)).body;
  const after = (await j(`/api/projects/${project.id}`)).body;
  assert.equal(after.chats.length, 2, 'os dois chats locais aparecem no histórico');
  assert.deepEqual(after.chats.map((c) => c.id), [first.id, second.id], 'ordem preservada');
  assert.ok(after.chats.every((c) => Array.isArray(c.messages) && c.messages.length === 0));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /No history yet/, 'texto observado permanece na UI');
  assert.match(ui, /chatHistory|Chat history/i, 'painel Chat history precisa existir');
  console.log('OK chat_history_route: histórico vazio, dois chats locais e texto observado preservado');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
