// Linhas 116/147 do inventário — central de notificações: os 8 anúncios editoriais observados por tema
// (REA ev_72d7b4c2…7b20; jan–abr/2026). Títulos, datas, textos e a divisão tema→anúncio são UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-notifications-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/notifications'); const n = await res.json();
  assert.equal(res.status, 200);
  const ads = n.items.filter((i) => i.kind === 'ad');
  assert.equal(ads.length, 8, 'os 8 anúncios observados');
  assert.equal(n.unread, 8, 'começam não lidos (ponto de não lidas)');
  const themes = ads.map((a) => a.title);
  assert.deepEqual(themes, ['GPT Image 2', '700+ avatares via @', 'Pesquisa de satisfação (pt/es)', 'Descontinuação temporária de Nano Banana Pro/Veo 3.1', 'Descontinuação temporária de Seedream 4.1', 'Seedream 5.0', 'Geração agendada', 'Mais tarefas de crédito'], 'temas na ordem observada do relatório');
  assert.ok(ads.every((a) => /UNOBSERVED/.test(a.body) && a.at === null), 'sem títulos/datas/textos inventados');
  assert.equal(n.editorial.count, 8); assert.equal(n.editorial.period, 'jan–abr/2026');
  assert.equal(n.editorial.titles, 'UNOBSERVED'); assert.equal(n.editorial.dates, 'UNOBSERVED');
  assert.equal(n.editorial.bodies, 'UNOBSERVED'); assert.equal(n.editorial.themeToAdMapping, 'UNOBSERVED');
  assert.equal(n.editorial.externalCalls, false);
  assert.match(n.editorial.source, /ev_72d7b4c2/);
  // eventos locais do app continuam separados e vazios neste db novo
  assert.deepEqual(n.items.filter((i) => i.kind !== 'ad'), []);
  // "Todas lidas" marca os anúncios (comportamento observado junto ao diálogo)
  const all = await fetch(base + '/api/notifications/read-all', { method: 'POST' }); assert.equal(all.status, 200);
  const after = await (await fetch(base + '/api/notifications')).json();
  assert.equal(after.unread, 0); assert.ok(after.items.every((i) => i.read));
  // sem credenciais na resposta
  assert.ok(!/api[_-]?key|access[_-]?token|password/i.test(JSON.stringify(n)), 'nenhuma credencial na resposta');
  console.log('OK notifications_editorial: 8 anúncios por tema (REA), títulos/datas/textos UNOBSERVED, All read zera contador');
} finally { await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true }); }
