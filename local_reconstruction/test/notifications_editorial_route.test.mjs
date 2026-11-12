// Linhas 116/147 do inventário — central de notificações: os 8 anúncios editoriais observados por tema
// (REA ev_72d7b4c2…7b20; jan–abr/2026). Títulos, datas, textos e a divisão tema→anúncio são UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-notifications-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
// r17 item 1: db semeado com 4 eventos REAIS fora de ordem (datas decrescentes + empate) para provar que a
// rota devolve ordem determinística: eventos primeiro (data desc, empate por id) e os 8 anúncios por último.
// reset() materializa um db fresh (memória + disco); os eventos entram por cima no objeto do store.
const S = await import('../app/lib/store.mjs');
const d = S.reset();
d.notifications = [
  { id: 'ev-a', title: 'Evento antigo', body: 'x', kind: 'info', at: '2026-11-10T10:00:00.000Z', read: true },
  { id: 'ev-c2', title: 'Falha na geração', body: 'y', kind: 'error', at: '2026-11-12T10:00:00.000Z', read: false },
  { id: 'ev-c1', title: 'Empatado', body: 'w', kind: 'info', at: '2026-11-12T10:00:00.000Z', read: true },
  { id: 'ev-b', title: 'Evento médio', body: 'z', kind: 'success', at: '2026-11-11T10:00:00.000Z', read: false },
];
S.save();
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/notifications'); const n = await res.json();
  assert.equal(res.status, 200);
  const ads = n.items.filter((i) => i.kind === 'ad');
  assert.equal(ads.length, 8, 'os 8 anúncios observados');
  assert.equal(n.unread, 10, '8 anúncios + 2 eventos reais começam não lidos');
  const events = n.items.filter((i) => i.kind !== 'ad');
  assert.deepEqual(events.map((e) => e.id), ['ev-c1', 'ev-c2', 'ev-b', 'ev-a'], 'eventos em ordem de data desc (empate por id)');
  assert.ok(n.items.indexOf(events.at(-1)) < n.items.indexOf(ads[0]), 'todo evento vem antes de qualquer anúncio');
  assert.ok(n.items.slice(-8).every((i) => i.kind === 'ad'), 'os 8 anúncios (sem data) ficam por último, em ordem editorial');
  const themes = ads.map((a) => a.title);
  assert.deepEqual(themes, ['GPT Image 2', '700+ avatares via @', 'Pesquisa de satisfação (pt/es)', 'Descontinuação temporária de Nano Banana Pro/Veo 3.1', 'Descontinuação temporária de Seedream 4.1', 'Seedream 5.0', 'Geração agendada', 'Mais tarefas de crédito'], 'temas na ordem observada do relatório');
  assert.ok(ads.every((a) => /UNOBSERVED/.test(a.body) && a.at === null), 'sem títulos/datas/textos inventados');
  assert.equal(n.editorial.count, 8); assert.equal(n.editorial.period, 'jan–abr/2026');
  assert.equal(n.editorial.titles, 'UNOBSERVED'); assert.equal(n.editorial.dates, 'UNOBSERVED');
  assert.equal(n.editorial.bodies, 'UNOBSERVED'); assert.equal(n.editorial.themeToAdMapping, 'UNOBSERVED');
  assert.equal(n.editorial.externalCalls, false);
  assert.match(n.editorial.source, /ev_72d7b4c2/);
  // (os eventos locais agora são semeados acima — a ordem é coberta nas asserções de cima)
  // "Todas lidas" marca os anúncios (comportamento observado junto ao diálogo)
  const all = await fetch(base + '/api/notifications/read-all', { method: 'POST' }); assert.equal(all.status, 200);
  const after = await (await fetch(base + '/api/notifications')).json();
  assert.equal(after.unread, 0); assert.ok(after.items.every((i) => i.read));
  // sem credenciais na resposta
  assert.ok(!/api[_-]?key|access[_-]?token|password/i.test(JSON.stringify(n)), 'nenhuma credencial na resposta');
  console.log('OK notifications_editorial: 8 anúncios por tema (REA), títulos/datas/textos UNOBSERVED, All read zera contador');
} finally { await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true }); }
