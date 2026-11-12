// Servidor de mentira para o smoke dos provedores: 200, 404 "Function not found", 410, 401
// (ACCESS_TOKEN_TYPE_UNSUPPORTED), 429 e timeout — sem rede externa e sem chave em arquivo.
import assert from 'node:assert/strict';
import http from 'node:http';
import { runSmoke, providerSpecs } from '../../tools/provider_smoke.mjs';

const calls = [];
let nimMode = '404-fallback'; // '404-fallback' | 'ok' | '410' | '401' | '429' | 'slow'
let geminiMode = 'ok'; let geminiStatus = 200; let geminiBody = { error: { code: 401, message: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' } };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1'); const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    calls.push({ path: url.pathname, query: url.search, auth: req.headers.authorization || null, googleKey: req.headers['x-goog-api-key'] || null, model: body.model || null });
    if (url.pathname === '/nim/v1/chat/completions') {
      if (nimMode === 'slow') return; // nunca responde
      if (nimMode === '401') return json(res, 401, { error: 'unauthorized' });
      if (nimMode === '429') return json(res, 429, { error: 'quota exceeded for project' });
      if (nimMode === '410') return json(res, 410, { detail: 'model withdrawn' });
      if (nimMode === 'ok') return json(res, 200, { choices: [{ message: { content: 'resposta NIM ok' } }] });
      if (body.model === 'google/gemma-4-31b-it') return json(res, 404, { detail: 'Function not found: google/gemma-4-31b-it' });
      return json(res, 200, { choices: [{ message: { content: 'resposta NIM reserva ok' } }] });
    }
    if (url.pathname.startsWith('/gemini/v1beta/models/')) {
      if (geminiMode !== 'ok') return json(res, geminiStatus, geminiBody);
      if (req.headers['x-goog-api-key'] !== 'AQ.chave-de-autorizacao' && !url.search.includes('key=AQ.chave-de-autorizacao') && req.headers.authorization !== 'Bearer AQ.chave-de-autorizacao') return json(res, 401, { error: 'auth' });
      return json(res, 200, { candidates: [{ content: { parts: [{ text: 'x'.repeat(200) }] } }] });
    }
    if (url.pathname === '/gemini-openai/v1beta/openai/chat/completions') return json(res, 200, { choices: [{ message: { content: 'gemini openai ok' } }] });
    if (url.pathname === '/ollama/api/chat') return json(res, 200, { message: { role: 'assistant', content: 'resposta Ollama local' } });
    if (url.pathname === '/ollama/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'resposta Ollama v1' } }] });
    if (url.pathname === '/omni/v1/chat/completions') { if (req.headers.authorization !== 'Bearer omni-secret-key') return json(res, 401, { error: 'auth' }); return json(res, 200, { choices: [{ message: { content: 'resposta Omni local' } }] }); }
    if (url.pathname === '/omni/v1/images/generations') { if (req.headers.authorization !== 'Bearer omni-secret-key') return json(res, 401, { error: 'auth' }); return json(res, 200, { data: [{ b64_json: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64') }] }); }
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const envWith = (over = {}) => ({
  NVIDIA_BASE_URL: `${root}/nim/v1`, GEMINI_BASE_URL: `${root}/gemini/v1beta`, OLLAMA_BASE_URL: `${root}/ollama`,
  GEMINI_AUTH_MODE: 'x-goog-api-key', GEMINI_API: 'native',
  NVIDIA_API_KEY: 'nim-secret-key', GEMINI_API_KEY: 'AQ.chave-de-autorizacao', ...over,
});
const reset = (over = {}) => { nimMode = '404-fallback'; geminiMode = 'ok'; geminiStatus = 200; geminiBody = { error: { code: 401, message: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' } }; calls.length = 0; return envWith(over); };

try {
  // 1. Padrões: NVIDIA 404 no modelo titular troca para a reserva; Gemini e Ollama respondem; nada vaza.
  const lines = [];
  const okEnv = reset();
  const first = await runSmoke({ env: okEnv, write: (l) => lines.push(l) });
  assert.equal(first.ok, true);
  assert.deepEqual(calls.map((c) => c.path), ['/nim/v1/chat/completions', '/nim/v1/chat/completions', '/gemini/v1beta/models/gemini-2.5-flash:generateContent', '/ollama/api/chat']);
  assert.deepEqual(calls.map((c) => c.model), ['google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash', null, 'llama3.2:1b'], 'Gemini nativo leva o modelo no caminho, não no corpo');
  assert.match(lines[0], /^provedor=NVIDIA \| chave presente \| HTTP=200 \| tempo=\d+ms \| modelo=minimaxai\/minimax-m3\.1-flash \| tentativas=2 \| resposta=resposta NIM reserva ok/);
  assert.match(lines[1], /^provedor=Gemini \| chave presente \| HTTP=200 \| tempo=\d+ms \| modelo=gemini-2\.5-flash \| tentativas=1 \| resposta=/);
  assert.match(lines[2], /^provedor=Ollama \| chave ausente \| HTTP=200 .* resposta=resposta Ollama local/);
  assert.match(lines.at(-1), /^resumo: NVIDIA=ok \(minimaxai\/minimax-m3\.1-flash\) \| Gemini=ok \| Ollama=ok/);
  const geminiPreview = lines[1].split('resposta=')[1];
  assert.equal(Array.from(geminiPreview).length, 80, 'resposta truncada em 80 caracteres');
  const all = lines.join('\n');
  assert.ok(!all.includes('nim-secret-key') && !all.includes('AQ.chave-de-autorizacao'), 'chave nunca é impressa');
  assert.doesNotMatch(all, /authorization|Bearer|api[-_]?key/i);
  assert.ok(first.availability.some((a) => a.modelId === 'google/gemma-4-31b-it' && a.kind === 'model_unavailable'), 'modelo 404 fica marcado no cache');

  // 2. 410 nos dois modelos: nenhum modelo do NVIDIA serve, mas o provedor não derruba o smoke.
  nimMode = '410'; calls.length = 0; const gone = [];
  const goneRun = await runSmoke({ env: okEnv, write: (l) => gone.push(l) });
  const nvidiaGone = goneRun.records[0];
  assert.equal(nvidiaGone.attempts, 2); assert.equal(nvidiaGone.state, 'modelo-indisponivel');
  assert.match(nvidiaGone.note, /410/);
  assert.equal(goneRun.ok, true, 'Gemini/Ollama seguem: o smoke não aborta');
  assert.equal(calls.filter((c) => c.path.startsWith('/nim/')).length, 2, 'cada modelo é tentado uma única vez');
  assert.match(gone.at(-1), /NVIDIA=modelo-indisponivel/);

  // 3. Gemini 401 ACCESS_TOKEN_TYPE_UNSUPPORTED: marcado como "tipo de chave não aceito" e o Ollama assume.
  const unauthorized = reset(); geminiMode = '401'; geminiStatus = 401; calls.length = 0; const unauth = [];
  const unauthRun = await runSmoke({ env: unauthorized, write: (l) => unauth.push(l) });
  const gem = unauthRun.records[1];
  assert.equal(gem.state, 'indisponivel-tipo-de-chave');
  assert.match(gem.note, /tipo de chave não aceito/);
  assert.equal(unauthRun.records[2].state, 'ok', 'Ollama é executado mesmo com o Gemini fora');
  assert.match(unauth.at(-1), /Gemini=indisponivel-tipo-de-chave \(indisponível \(tipo de chave não aceito\)\)/);
  assert.ok(unauthRun.availability.some((a) => a.providerId === 'gemini' && a.kind === 'auth'));

  // 4. Prefixo "AQ." não é tratado como chave inválida: modos query e bearer também funcionam.
  for (const mode of ['query', 'bearer']) {
    const env = reset({ GEMINI_AUTH_MODE: mode }); geminiMode = 'ok'; calls.length = 0; const out = [];
    const run = await runSmoke({ env, write: (l) => out.push(l) });
    assert.equal(run.records[1].state, 'ok', `modo ${mode} deveria funcionar`);
    const call = calls.find((c) => c.path.startsWith('/gemini/'));
    if (mode === 'query') assert.match(call.query, /[?&]key=AQ\.chave-de-autorizacao/);
    else assert.equal(call.auth, 'Bearer AQ.chave-de-autorizacao');
    assert.equal(call.googleKey, null);
  }
  // Rota OpenAI-compatível do Gemini quando GEMINI_API=openai.
  { const env = reset({ GEMINI_API: 'openai', GEMINI_BASE_URL: `${root}/gemini-openai/v1beta` }); calls.length = 0; const out = [];
    const run = await runSmoke({ env, write: (l) => out.push(l) });
    assert.equal(run.records[1].state, 'ok');
    assert.equal(calls.find((c) => c.path.includes('/openai/')).path, '/gemini-openai/v1beta/openai/chat/completions'); }

  // 5. 429 no NVIDIA: marca cota e continua; o Ollama conclui.
  nimMode = '429'; const quotaEnv = reset(); nimMode = '429'; calls.length = 0; const quota = [];
  const quotaRun = await runSmoke({ env: quotaEnv, write: (l) => quota.push(l) });
  assert.equal(quotaRun.records[0].state, 'indisponivel-cota');
  assert.equal(quotaRun.records[0].http, '429');
  assert.equal(quotaRun.records[2].state, 'ok');
  assert.match(quota.at(-1), /NVIDIA=indisponivel-cota/);

  // 6. Timeout (NVIDIA_TIMEOUT_MS=150, servidor que nunca responde): marca e o Ollama conclui.
  nimMode = 'slow'; const slowEnv = reset({ NVIDIA_TIMEOUT_MS: '150' }); nimMode = 'slow'; calls.length = 0; const slow = [];
  const slowRun = await runSmoke({ env: slowEnv, write: (l) => slow.push(l) });
  assert.equal(slowRun.records[0].state, 'indisponivel-timeout');
  assert.equal(slowRun.records[0].http, 'TIMEOUT');
  assert.match(slowRun.records[0].note, /timeout de 150 ms/);
  assert.equal(slowRun.records[2].state, 'ok');

  // 7. Chaves ausentes: NVIDIA/Gemini saem como SKIP sem nenhuma chamada; Ollama local segue sem chave.
  calls.length = 0; const missing = [];
  const missingRun = await runSmoke({ env: { NVIDIA_BASE_URL: `${root}/nim/v1`, GEMINI_BASE_URL: `${root}/gemini/v1beta`, OLLAMA_BASE_URL: `${root}/ollama` }, write: (l) => missing.push(l) });
  assert.match(missing[0], /chave ausente \| HTTP=SKIP/);
  assert.match(missing[1], /chave ausente \| HTTP=SKIP/);
  assert.match(missing[2], /HTTP=200/);
  assert.deepEqual(calls.map((c) => c.path), ['/ollama/api/chat']);

  // 8. Ollama Cloud sem chave: SKIP sem tocar a rede; com OLLAMA_BASE_URL .../v1 usa /v1/chat/completions.
  calls.length = 0; const cloudSkip = [];
  const cloudRun = await runSmoke({ env: { NVIDIA_API_KEY: '', GEMINI_API_KEY: '', OLLAMA_BASE_URL: 'https://ollama.com' }, write: (l) => cloudSkip.push(l) });
  assert.equal(cloudRun.records[2].state, 'skip');
  assert.match(cloudRun.records[2].provider, /Ollama Cloud/);
  assert.equal(calls.length, 0);
  calls.length = 0; const v1 = [];
  const v1Run = await runSmoke({ env: { NVIDIA_API_KEY: '', GEMINI_API_KEY: '', OLLAMA_BASE_URL: `${root}/ollama/v1`, OLLAMA_MODEL: 'llama3.2:1b' }, write: (l) => v1.push(l) });
  assert.equal(v1Run.records[2].state, 'ok');
  assert.deepEqual(calls.map((c) => c.path), ['/ollama/v1/chat/completions']);

  // 9. Especificação por variáveis: base/modelo/timeout/authMode são exatamente os pedidos.
  const specs = providerSpecs({ NVIDIA_BASE_URL: 'https://exemplo/v1', NVIDIA_MODEL: 'meu/modelo', GEMINI_MODEL: 'gemini-x', GEMINI_AUTH_MODE: 'bearer', OLLAMA_BASE_URL: 'https://ollama.com', OLLAMA_MODEL: 'gpt-oss:120b' });
  assert.equal(specs[0].baseUrl, 'https://exemplo/v1');
  assert.equal(specs[0].models[0], 'meu/modelo');
  assert.ok(specs[0].models.includes('minimaxai/minimax-m3.1-flash'), 'reserva continua na lista de candidatos');
  assert.ok(specs[0].timeoutMs >= 60_000, 'timeout padrão do NVIDIA é >= 60 s');
  assert.equal(specs[1].authMode, 'bearer'); assert.equal(specs[1].model, 'gemini-x');
  assert.equal(specs[2].cloud, true); assert.equal(specs[2].requireKey, true); assert.equal(specs[2].model, 'gpt-oss:120b');

  // 10. Omni Router: texto auto/best-free e imagem flux.2-klein com Bearer de OMNIROUTER_API_KEY, timeout >= 120 s.
  { calls.length = 0; const out = [];
    const run = await runSmoke({ env: { NVIDIA_API_KEY: '', GEMINI_API_KEY: '', OLLAMA_BASE_URL: `${root}/ollama`, OMNIROUTER_API_KEY: 'omni-secret-key', OMNIROUTER_BASE_URL: `${root}/omni/v1` }, write: (l) => out.push(l) });
    assert.equal(run.records[3].provider, 'Omni Router'); assert.equal(run.records[3].state, 'ok', out[3]);
    assert.equal(run.records[3].model, 'auto/best-free');
    assert.equal(run.records[4].provider, 'Omni Router (imagem)'); assert.equal(run.records[4].state, 'ok', out[4]);
    assert.equal(run.records[4].model, 'nvidia/black-forest-labs/flux.2-klein-4b');
    assert.match(run.records[4].response, /^image\/jpeg 4 B$/);
    assert.deepEqual(calls.map((c) => c.path), ['/ollama/api/chat', '/omni/v1/chat/completions', '/omni/v1/images/generations']);
    assert.ok(calls.slice(1).every((c) => c.auth === 'Bearer omni-secret-key'));
    assert.equal(calls[1].model, 'auto/best-free'); assert.equal(calls[2].model, 'nvidia/black-forest-labs/flux.2-klein-4b');
    assert.ok(!out.join('\n').includes('omni-secret-key'), 'a chave do Omni nunca é impressa');
    assert.match(out.at(-1), /Omni Router=ok \| Omni Router \(imagem\)=ok/);
  }
  // Sem chave do Omni: SKIP, sem tocar 127.0.0.1:20128; e a base padrão é 127.0.0.1 (nunca localhost).
  { const specs = providerSpecs({}); const omni = specs.filter((s) => s.id === 'omni-router');
    assert.equal(omni[0].baseUrl, 'http://127.0.0.1:20128/v1');
    assert.ok(omni.every((s) => s.timeoutMs >= 120_000), 'timeout local >= 120 s');
    assert.ok(omni.every((s) => !/localhost/.test(s.baseUrl)));
    assert.equal(omni[0].requireKey, true); assert.equal(omni[0].keyEnv, 'OMNIROUTER_API_KEY');
  }
  // 11. NovAI: três linhas (texto glm-4.7-flash, imagem cogview-3-flash, vídeo cogvideox-flash 5 s) só com chave do ambiente.
  { const specs = providerSpecs({}); const novai = specs.filter((s) => s.id === 'novai');
    assert.deepEqual(novai.map((s) => s.task), ['text', 'image_generation', 'video_generation']);
    assert.equal(novai[0].model, 'glm-4.7-flash');
    assert.equal(novai[1].model, 'cogview-3-flash');
    assert.equal(novai[2].model, 'cogvideox-flash');
    assert.equal(novai[2].baseUrl, 'https://aiapi-pro.com/v1');
    assert.equal(novai[2].seconds, 5, 'o smoke de vídeo pede exatamente 5 s');
    assert.ok(novai[2].timeoutMs >= 180_000, 'timeout do vídeo é >= 180 s');
    assert.ok(novai.every((s) => s.requireKey && s.keyEnv === 'NOVAI_API_KEY'));
    assert.ok(novai.every((s) => !/localhost/.test(s.baseUrl)));
  }
  // Sem NOVAI_API_KEY: as três linhas viram SKIP e nenhuma chamada é feita.
  { calls.length = 0; const out = [];
    const run = await runSmoke({ env: { NVIDIA_API_KEY: '', GEMINI_API_KEY: '', OLLAMA_BASE_URL: `${root}/ollama`, NOVAI_API_KEY: '' }, write: (l) => out.push(l) });
    const novai = run.records.filter((r) => r.providerId === 'novai');
    assert.deepEqual(novai.map((r) => r.state), ['skip', 'skip', 'skip']);
    assert.ok(novai.every((r) => r.note === 'sem chave' && r.key === 'ausente'));
    assert.equal(calls.filter((c) => c.path.startsWith('/novai')).length, 0, 'sem chave, a NovAI não é chamada');
    assert.match(out.at(-1), /NovAI \(texto\)=skip[^|]*\| NovAI \(imagem\)=skip[^|]*\| NovAI \(vídeo 5 s\)=skip/);
  }
  console.log('OK provider_smoke: 200, 404 Function not found, 410, 401 ACCESS_TOKEN_TYPE_UNSUPPORTED, 429 e timeout contra servidor falso; NovAI com três linhas e SKIP sem chave');
} finally {
  await new Promise((r) => fake.close(r));
}
