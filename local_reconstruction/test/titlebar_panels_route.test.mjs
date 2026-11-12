// Linha 31 do inventário — arquitetura TitleBar: metadados estáticos observados dos bundles
// (TitleBarAgentConnect: right/ordem 101/Custom; TitleBarExportTask: ordem 4). Conteúdo,
// condição de render e ações seguem UNOBSERVED — nada é presumido.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-titlebar-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/titlebar/panels'); const b = await res.json();
  assert.equal(res.status, 200); assert.equal(b.ok, true);
  assert.equal(b.panels.length, 2);
  const [agent, task] = b.panels;
  assert.deepEqual(
    { id: agent.id, component: agent.component, position: agent.position, order: agent.order, type: agent.type },
    { id: 'agent-connect', component: 'TitleBarAgentConnect', position: 'right', order: 101, type: 'Custom' },
    'metadados observados do AgentConnect',
  );
  assert.deepEqual({ id: task.id, component: task.component, order: task.order }, { id: 'export-task', component: 'TitleBarExportTask', order: 4 });
  for (const p of b.panels) {
    assert.equal(p.content, 'UNOBSERVED'); assert.equal(p.renderCondition, 'UNOBSERVED'); assert.equal(p.actions, 'UNOBSERVED');
  }
  assert.equal(b.externalCalls, false);
  assert.match(b.source, /auth_bundles/);
  assert.ok(!/api[_-]?key|access[_-]?token|password/i.test(JSON.stringify(b)), 'nenhuma credencial na resposta');
  // a UI lê e mostra os metadados observados nos placeholders
  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /TitleBarAgentConnect/); assert.match(ui, /ordem <b>101<\/b>/); assert.match(ui, /TitleBarExportTask/);
  console.log('OK titlebar_panels: AgentConnect right/101/Custom e ExportTask ordem 4; conteúdo UNOBSERVED');
} finally { await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true }); }
