// Gerador de vídeos / ferramentas populares (linha 79): nomes e detalhes observados; telas e chips UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-gentools-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/generator/tools'); const g = await res.json();
  assert.equal(res.status, 200); assert.equal(g.ok, true);
  assert.equal(g.page.id, 'ai-video-generator-v2');
  assert.equal(g.page.screenCaptured, false, 'a tela do gerador não foi capturada');
  assert.deepEqual(g.tools.map((x) => x.label), ['Avatar video', 'AI talking photo', 'Remove background', 'Quick cut', 'Video editor']);
  const tp = g.tools.find((x) => x.id === 'ai-talking-photo');
  assert.deepEqual(tp.steps, ['Upload photo', 'Add voiceover', 'Export'], 'os 3 passos observados');
  assert.match(tp.input, /256×256/, 'limite de imagem observado');
  assert.match(tp.examples, /~20/);
  assert.match(g.tools.find((x) => x.id === 'remove-background').detail, /Upload video/);
  assert.match(g.tools.find((x) => x.id === 'quick-cut').detail, /transcrição automática/);
  assert.equal(g.tools.find((x) => x.id === 'avatar-video').detail, 'UNOBSERVED');
  assert.deepEqual(g.presets.map((x) => x.label), ['Tough guy sweet style', 'News link to video', 'Santa shop showcase']);
  assert.ok(g.presets.every((x) => x.preview === 'UNOBSERVED'), 'prévias dos presets seguem UNOBSERVED');
  assert.equal(g.chiplist.observed, false, 'a lista de chips não foi capturada');
  assert.equal(g.externalCalls, false, 'nenhuma chamada ao serviço original');
  assert.match(g.source, /linha 79/);
  assert.ok(!/api[_-]?key|token|secret/i.test(JSON.stringify(g)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/generator\/tools/, 'a página do gerador lê a rota local');
  assert.match(ui, /id="genToolsNote"/, 'a página do gerador tem o aviso na tela');
  assert.match(ui, /lista de chips original/, 'o aviso nomeia o que falta');
  console.log('OK generator_tools_route: 5 ferramentas com detalhes observados, chips e prévias UNOBSERVED');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
