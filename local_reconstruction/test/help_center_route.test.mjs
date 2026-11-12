// Rota da central de ajuda: só o que foi observado na página pública capturada; conteúdo interno e widget seguem UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-help-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/help'); const h = await res.json();
  assert.equal(res.status, 200); assert.equal(h.ok, true);
  assert.equal(h.title, 'Central de Ajuda');
  assert.equal(h.publicUrl, 'https://www.pippit.ai/pt-br/resource/help-center');
  assert.equal(h.source, 'notes/pages/13_resource_help-center.json');
  assert.deepEqual(h.headings, ['Central de Ajuda']);
  assert.deepEqual(h.counts, { links: 124, images: 6, videos: 0, sections: 4 });
  assert.ok(h.unobserved.some((x) => x.includes('kefu-im-i18n')), 'widget externo precisa seguir UNOBSERVED');
  assert.ok(h.unobserved.some((x) => x.includes('botão (?)')), 'efeito do botão precisa seguir UNOBSERVED');
  assert.equal(h.externalCalls, false, 'a rota não pode prometer chamada externa');
  // a rota é estática: nada de credenciais, fetch externo ou dados do usuário
  assert.ok(!JSON.stringify(h).includes('key') && !JSON.stringify(h).includes('token'));

  // /help é rota de SPA: o servidor devolve o index e o app monta a tela
  const page = await fetch(base + '/help'); const html = await page.text();
  assert.equal(page.status, 200); assert.match(html, /<script type="module" src="\/app\.js">/);
  const app = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(app, /async function pageHelp\(\)/, 'tela local da central de ajuda precisa existir');
  assert.match(app, /r\.startsWith\('\/help'\)\) return pageHelp\(\);/, 'rota /help precisa estar ligada');
  assert.match(app, /#helpBtn/, 'botão ? precisa abrir a central');

  console.log('OK help_center_route: /api/help observado, UNOBSERVED preservado e /help ligado');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
