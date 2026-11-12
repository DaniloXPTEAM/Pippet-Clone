// Linha 47 do inventário — atalhos do canvas e "Compartilhar tela": referência do Pippit x o que funciona aqui.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-canvas-keys-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;

try {
  const res = await fetch(`${base}/api/canvas/shortcuts`); const b = await res.json();
  assert.equal(res.status, 200);
  assert.equal(b.openButton, '⌨ Atalhos');
  assert.equal(b.shortcutsObservedOnPippit, false, 'nenhum atalho do Pippit foi observado em captura');
  assert.deepEqual(b.groups.map((g) => g.group), ['Criar', 'Zoom', 'Mover', 'Geral']);
  const rows = b.groups.flatMap((g) => g.rows);
  // O que realmente funciona na reconstrução (verificado no handler do canvas).
  for (const keys of ['Tab', 'Ctrl +', 'Ctrl -', 'Ctrl 0', 'Ctrl + rolar', 'Deslizar', 'Alt Shift F', 'V', 'H', 'Ctrl Z', 'Ctrl Y']) assert.ok(b.implemented.includes(keys), `implementado: ${keys}`);
  // Rodada 15: os 9 atalhos restantes da referência agora funcionam como extensões locais
  // (Ctrl G agrupa com persistência de grupo, Ctrl A seleciona, Delete exclui, etc.).
  for (const keys of ['Ctrl G', 'Ctrl Shift G', 'Ctrl Enter', 'Alt + arrastar', 'Ctrl Alt + arrastar', 'Espaço + arrastar', 'Ctrl F', 'Ctrl A', 'Delete']) assert.ok(b.implemented.includes(keys), `implementado (extensão local): ${keys}`);
  // Só a pinça de trackpad segue sem implementação local (depende de gesto do hardware).
  assert.deepEqual(b.documentedNotImplemented, ['Pinça'], 'só a pinça segue não implementada');
  assert.equal(b.implemented.length + b.documentedNotImplemented.length, rows.length, 'toda linha é classificada uma única vez');
  assert.equal(b.implemented.filter((k) => b.documentedNotImplemented.includes(k)).length, 0, 'nada é local e não-local ao mesmo tempo');
  assert.ok(rows.every((row) => row.state === (row.implemented ? 'extensão local funcionando' : 'referência do Pippit: não implementado localmente')));
  // Compartilhar tela: contrato do serviço UNOBSERVED, comportamento local declarado.
  assert.equal(b.share.contractState, 'UNOBSERVED');
  assert.match(b.share.contractNote, /Nenhuma captura/);
  assert.match(b.share.local, /copia o link/);
  assert.equal(b.share.implemented, true);
  assert.equal(b.externalCalls, 0);
  assert.match(b.note, /não observada/);
  console.log('OK canvas_shortcuts: 20 atalhos classificados (19 locais, só Pinça não implementada), compartilhar tela UNOBSERVED com comportamento local declarado');
} finally { await new Promise((r) => app.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); }
