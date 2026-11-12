// FAQ de preços (linha 78): 6 perguntas preservadas; respostas, avaliações e seções de recursos UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-faq-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/pricing/faq'); const q = await res.json();
  assert.equal(res.status, 200); assert.equal(q.ok, true);
  assert.equal(q.questions.length, 6, 'seis perguntas preservadas');
  assert.match(q.questions[0], /testes gratuitos/);
  assert.match(q.questions[5], /sem créditos antes do final do mês/);
  assert.equal(q.answersPreserved, false);
  assert.equal(q.answers, 'UNOBSERVED', 'respostas completas não preservadas');
  assert.equal(q.ratings, 'UNOBSERVED', 'textos das avaliações não preservados');
  assert.equal(q.ratingsNavigation.reviews, 5, 'carrossel de 5 revisões observado');
  assert.deepEqual(q.ratingsNavigation.controls.slice(0, 2), ['Previous review', 'Next review']);
  assert.deepEqual(q.featureSections.slice(0, 2), ['Detalhes do plano', 'Créditos'], 'títulos de seções observados');
  assert.equal(q.featureSectionsContent, 'UNOBSERVED', 'conteúdo das seções não preservado');
  assert.equal(q.planComparison, 'local', 'a comparação de planos é local');
  assert.equal(q.externalCalls, false);
  assert.match(q.source, /linha 78/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(q)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/pricing\/faq/, 'a página de preços lê a rota local');
  assert.match(ui, /id="faqEvidence"/, 'a página declara o que falta');
  console.log('OK pricing_faq_route: 6 perguntas, respostas/avaliações/seções UNOBSERVED, comparação local');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
