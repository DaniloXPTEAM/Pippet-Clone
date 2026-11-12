// Feed Inspiration: rota só com os nomes estáticos, tudo UNOBSERVED, nenhuma chamada externa.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-insp-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/inspiration/state'); const s = await res.json();
  assert.equal(res.status, 200); assert.equal(s.ok, true);
  assert.equal(s.feedCaptured, false, 'nenhuma captura de feed existe');
  assert.equal(s.externalCalls, false);
  assert.deepEqual(s.features.map((f) => f.id), ['feed', 'like/mylikes', 'list_related_remix', 'list_published_inspiration', 'feed_challenge', 'challenge_tools']);
  assert.ok(s.features.every((f) => f.status === 'UNOBSERVED'), 'toda função sem captura fica UNOBSERVED');
  // áreas nomeadas pelos endpoints observados nos bundles (só nomes estáticos; comportamento UNOBSERVED)
  assert.deepEqual(Object.keys(s.endpointAreas), ['feed', 'curtir', 'remix', 'publicados', 'atividades']);
  assert.ok(s.endpointAreas.feed.some((e) => e.includes('inspiration/feed')));
  assert.ok(s.endpointAreas.curtir.includes('inspiration/like') && s.endpointAreas.curtir.includes('inspiration/mylikes'));
  assert.ok(s.endpointAreas.remix.includes('inspiration/list_related_remix'));
  assert.ok(s.endpointAreas.publicados.includes('inspiration/list_published_inspiration'));
  assert.ok(s.endpointAreas.atividades.includes('inspiration/list_feed_challenge') && s.endpointAreas.atividades.includes('inspiration/list_inspiration_activity'));
  assert.match(s.source, /PIPPIT_API_CATALOG\.md/);
  assert.ok(!/curtidas:|likes:|feed_items|cards/i.test(JSON.stringify(s)), 'a rota não devolve conteúdo de feed inventado');
  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/inspiration\/state/, 'a tela consome a rota local');
  assert.match(ui, /async function pageInspiration\(\)/, 'a página continua existindo');
  console.log('OK inspiration_route: 6 funções estáticas, todas UNOBSERVED, sem feed e sem chamada externa');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
