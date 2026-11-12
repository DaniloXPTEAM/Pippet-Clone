// FreeLLMAPI como texto PRINCIPAL do roteador (127.0.0.1:3001/v1, modelo \"auto\"), com Omni e NVIDIA como reservas.
// Servidor falso: 200, 401, 500 e timeout — sem rede externa e sem chave em arquivo.
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  planFreeRoutes, executeFreeRoutes, createFreeRouterAdapters, freeLLMAPIProviderEntry, stackProviderEntries,
  DEFAULT_TASK_PREFERENCES, validateFreeRouterConfig, clearAvailability, availabilitySnapshot, FREELLMAPI_BASE, FREE_PROVIDER_CATALOG,
} from '../src/free_router.mjs';

const KEY = 'chave-freellmapi-teste';
const calls = [];
let mode = 'ok'; // ok | auth401 | error500 | slow
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    calls.push({ path: url.pathname, auth: req.headers.authorization || null, model: body.model });
    if (url.pathname === '/v1/chat/completions') {
      if (req.headers.authorization !== `Bearer ${KEY}`) return json(res, 401, { error: 'auth' });
      if (mode === 'slow') return;
      if (mode === 'auth401') return json(res, 401, { error: 'invalid key' });
      if (mode === 'error500') return json(res, 500, { error: 'boom' });
      return json(res, 200, { choices: [{ message: { content: 'texto do FreeLLMAPI' } }] });
    }
    if (url.pathname === '/omni/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto do Omni reserva' } }] });
    if (url.pathname === '/nim/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto do NVIDIA reserva' } }] });
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const env = {
  FREELLMAPI_BASE_URL: `${root}/v1`, FREELLMAPI_API_KEY: KEY,
  OMNIROUTER_BASE_URL: `${root}/omni/v1`, OMNIROUTER_API_KEY: 'chave-omni',
  NVIDIA_API_KEY: 'chave-nvidia', NVIDIA_BASE_URL: `${root}/nim/v1`,
};
const config = () => ({ version: 1, paidFallback: false, providers: stackProviderEntries(env), taskPreferences: { ...DEFAULT_TASK_PREFERENCES } });
const credentials = { FREELLMAPI_API_KEY: KEY, OMNIROUTER_API_KEY: 'chave-omni', NVIDIA_API_KEY: 'chave-nvidia' };
const run = () => executeFreeRoutes(planFreeRoutes('text', config()).routes, { prompt: 'oi' }, { adapters: createFreeRouterAdapters(), credentials });

try {
  // 1) Padrão do serviço: 127.0.0.1:3001/v1 (nunca localhost), modelo \"auto\", chave por FREELLMAPI_API_KEY.
  const entry = freeLLMAPIProviderEntry({});
  assert.equal(entry.baseUrl, 'http://127.0.0.1:3001/v1');
  assert.equal(FREELLMAPI_BASE, 'http://127.0.0.1:3001/v1');
  assert.deepEqual(entry.models.map((m) => m.id), ['auto']);
  assert.deepEqual(entry.models[0].capabilities, ['text']);
  assert.equal(FREE_PROVIDER_CATALOG.find((p) => p.id === 'freellmapi').secretEnv, 'FREELLMAPI_API_KEY');
  assert.equal(validateFreeRouterConfig(config()).length, 0);

  // 2) Ordem do texto: FreeLLMAPI primeiro; Omni e NVIDIA são reservas.
  assert.deepEqual(planFreeRoutes('text', config()).routes.map((r) => r.providerId), ['freellmapi', 'omni-router', 'nvidia-nim', 'nvidia-nim', 'novai']);
  const route = planFreeRoutes('text', config()).routes[0];
  assert.equal(route.baseUrl, `${root}/v1`);
  assert.equal(route.secretEnv, 'FREELLMAPI_API_KEY');

  // 3) 200: /chat/completions com Bearer e modelo auto.
  clearAvailability(); calls.length = 0;
  const ok = await run();
  assert.equal(ok.text, 'texto do FreeLLMAPI');
  assert.equal(calls[0].path, '/v1/chat/completions');
  assert.equal(calls[0].auth, `Bearer ${KEY}`);
  assert.equal(calls[0].model, 'auto');

  // 4) 401: FreeLLMAPI sai de rotação (auth) e o Omni responde.
  clearAvailability(); calls.length = 0; mode = 'auth401';
  const auth = await run();
  assert.equal(auth.text, 'texto do Omni reserva');
  assert.equal(auth.route.providerId, 'omni-router');
  assert.ok(availabilitySnapshot().some((a) => a.providerId === 'freellmapi' && a.kind === 'auth'));

  // 5) 500: erro do provedor também passa para a reserva.
  clearAvailability(); calls.length = 0; mode = 'error500';
  const broke = await run();
  assert.equal(broke.route.providerId, 'omni-router');

  // 6) Timeout: marcado e a reserva conclui.
  clearAvailability(); calls.length = 0; mode = 'slow';
  const slow = await executeFreeRoutes([{ ...route, timeoutMs: 150 }, ...planFreeRoutes('text', config()).routes.slice(1)], { prompt: 'oi' }, { adapters: createFreeRouterAdapters(), credentials });
  assert.equal(slow.route.providerId, 'omni-router');
  assert.ok(availabilitySnapshot().some((a) => a.providerId === 'freellmapi' && a.kind === 'timeout'));
  mode = 'ok';

  // 7) Sem FREELLMAPI_API_KEY: a rota é pulada com motivo e o Omni assume (nada de chamada sem chave).
  clearAvailability(); calls.length = 0;
  const noKey = await executeFreeRoutes(planFreeRoutes('text', config()).routes, { prompt: 'oi' }, { adapters: createFreeRouterAdapters(), credentials: { OMNIROUTER_API_KEY: 'chave-omni', NVIDIA_API_KEY: 'chave-nvidia' } });
  assert.equal(noKey.route.providerId, 'omni-router');
  assert.ok(!calls.some((c) => c.path === '/v1/chat/completions'), 'sem chave não há chamada ao FreeLLMAPI');

  // 8) Base local: localhost é normalizado e a validação recusa a forma crua.
  assert.equal(freeLLMAPIProviderEntry({ FREELLMAPI_BASE_URL: 'http://localhost:3001/v1' }).baseUrl, 'http://127.0.0.1:3001/v1');
  assert.ok(validateFreeRouterConfig({ ...config(), providers: [{ ...entry, baseUrl: 'http://localhost:3001/v1' }] }).some((e) => /localhost/.test(e)));
  console.log('freellmapi_router: ok (texto principal, auto, 401/500/timeout caem para Omni, sem chave não chama, localhost recusado)');
} finally {
  clearAvailability();
  await new Promise((r) => fake.close(r));
}
