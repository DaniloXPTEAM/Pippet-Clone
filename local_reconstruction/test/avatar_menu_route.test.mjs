// Menu do avatar (linha 56): "Aplicar" confirmado; menu "…" e prévia de áudio seguem UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-avmenu-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/avatar/menu'); const m = await res.json();
  assert.equal(res.status, 200); assert.equal(m.ok, true);
  assert.deepEqual(m.items.map((x) => x.id), ['apply', 'more', 'audio_preview']);
  assert.deepEqual(m.items.map((x) => x.status), ['CONFIRMED', 'UNOBSERVED', 'UNOBSERVED']);
  assert.match(m.items[0].local, /@menção/, 'Aplicar é implementado como @menção');
  assert.match(m.items[1].local, /não altera o avatar/, 'o menu "…" só informa a lacuna');
  assert.equal(m.ownAvatarMenu, 'UNOBSERVED');
  assert.match(m.exampleAvatarMenu, /não existe/);
  assert.equal(m.humanObservation, 'PENDING', 'conteúdo original depende de observação humana');
  assert.equal(m.externalCalls, false);
  assert.match(m.source, /linha 56/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(m)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/avatar\/menu/, 'a tela de avatares lê a rota local');
  assert.match(ui, /nenhuma ação de renomear\/excluir foi presumida/, 'o aviso existente continua na tela');
  console.log('OK avatar_menu_route: Aplicar confirmado, menu e prévia de áudio UNOBSERVED, observação humana PENDING');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
