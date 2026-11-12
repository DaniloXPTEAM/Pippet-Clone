// Cloudflare Workers AI no roteador gratuito: adaptador, ordem imagem (Cloudflare -> Omni flux.2-klein),
// voz melotts (WAV) e texto FreeLLMAPI -> Omni -> NVIDIA. Nenhuma chamada real: um servidor falso em 127.0.0.1
// responde 200, 400 com success:false, 401, 402, 429 e timeout, e confere corpo/URL/Bearer.
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  planFreeRoutes, executeFreeRoutes, createFreeRouterAdapters, createCloudflareFreeAdapter,
  stackProviderEntries, cloudflareProviderEntry, freeLLMAPIProviderEntry, DEFAULT_TASK_PREFERENCES,
  validateFreeRouterConfig, publicFreeRouterConfig, clearAvailability, availabilitySnapshot,
  credentialEnvNames, sniffAudioMime, sniffImageMime, redactSecrets,
  CLOUDFLARE_AI_BASE, CLOUDFLARE_IMAGE_MODEL, CLOUDFLARE_AUDIO_MODEL, CLOUDFLARE_TRANSCRIPTION_MODEL, FREELLMAPI_BASE, FREE_PROVIDER_CATALOG,
} from '../src/free_router.mjs';

const ACCOUNT = 'conta-de-teste-123';
const TOKEN = 'token-cloudflare-de-teste';
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]), Buffer.alloc(8), Buffer.from([0xff, 0xd9])]);
// WAV mínimo: cabeçalho RIFF/WAVE (a melotts devolve WAV, não MP3).
const WAV = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from('WAVEfmt '), Buffer.alloc(24)]);
const b64 = (buf) => buf.toString('base64');
const calls = [];
let mode = 'ok'; // ok | auth401 | payment402 | quota429 | slow | nobytes | failmsg
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString() || 'null'); } catch { body = null; }
    calls.push({ path: url.pathname, auth: req.headers.authorization || null, body });
    if (url.pathname === '/omni/v1/images/generations') return json(res, 200, { data: [{ b64_json: b64(JPEG) }] });
    if (url.pathname === '/omni/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto do omni falso' } }] });
    if (url.pathname === '/v1/chat/completions') {
      if (req.headers.authorization !== 'Bearer chave-do-freellmapi') return json(res, 401, { error: 'auth' });
      return json(res, 200, { choices: [{ message: { content: 'texto do freellmapi falso' } }] });
    }
    if (!url.pathname.startsWith(`/client/v4/accounts/${ACCOUNT}/ai/run/`)) return json(res, 404, { error: 'wrong account path' });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { success: false, errors: [{ message: 'Authentication error' }] });
    if (mode === 'slow') return; // nunca responde: o teste conta com o timeout da rota
    if (mode === 'auth401') return json(res, 401, { success: false, errors: [{ message: 'Invalid API Token' }] });
    if (mode === 'payment402') return json(res, 402, { success: false, errors: [{ message: 'Payment required for this model' }] });
    if (mode === 'quota429') return json(res, 429, { success: false, errors: [{ message: 'rate limit exceeded' }] });
    if (mode === 'failmsg') return json(res, 200, { success: false, errors: [{ message: `no permission for account ${ACCOUNT} with token ${TOKEN}` }] });
    if (mode === 'nobytes') return json(res, 200, { success: true, result: {} });
    if (url.pathname.endsWith(CLOUDFLARE_AUDIO_MODEL)) return json(res, 200, { success: true, result: { audio: b64(WAV) } });
    return json(res, 200, { success: true, result: { image: b64(JPEG) } });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const env = {
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN,
  CLOUDFLARE_AI_BASE_URL: `${root}/client/v4/accounts/{account}/ai/run`,
  FREELLMAPI_BASE_URL: `${root}/v1`, FREELLMAPI_API_KEY: 'chave-do-freellmapi',
  OMNIROUTER_BASE_URL: `${root}/omni/v1`, OMNIROUTER_API_KEY: 'chave-do-omni',
  NVIDIA_BASE_URL: `${root}/nim/v1`, NVIDIA_API_KEY: 'chave-do-nvidia',
};
const credentials = { CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN, FREELLMAPI_API_KEY: env.FREELLMAPI_API_KEY, OMNIROUTER_API_KEY: env.OMNIROUTER_API_KEY };
const config = () => ({ version: 1, paidFallback: false, providers: stackProviderEntries(env), taskPreferences: { ...DEFAULT_TASK_PREFERENCES } });
const routeOf = (task, modelId) => planFreeRoutes(task, config()).routes.find((r) => r.modelId === modelId);
const run = (task, modelId, payload = { prompt: 'teste' }, over = {}) => executeFreeRoutes([routeOf(task, modelId)], payload, { adapters: createFreeRouterAdapters(), credentials, ...over });

try {
  // 1) Catálogo/credenciais: token + conta só pelo ambiente; a rota expõe apenas os NOMES das variáveis.
  assert.equal(FREE_PROVIDER_CATALOG.find((p) => p.id === 'cloudflare').accountEnv, 'CLOUDFLARE_ACCOUNT_ID');
  assert.deepEqual(credentialEnvNames(FREE_PROVIDER_CATALOG.find((p) => p.id === 'cloudflare')), ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);
  const cfRoute = routeOf('image_generation', CLOUDFLARE_IMAGE_MODEL);
  assert.match(cfRoute.baseUrl, /\{account\}/, 'a base guarda o {account}, nunca o id');
  assert.equal(cfRoute.accountEnv, 'CLOUDFLARE_ACCOUNT_ID');
  assert.ok(!JSON.stringify(cfRoute).includes(ACCOUNT), 'nenhum id de conta entra na rota');
  assert.equal(validateFreeRouterConfig(config()).length, 0);

  // 2) Ordem pedida: imagem Cloudflare flux-1-schnell e depois Omni flux.2-klein; texto FreeLLMAPI -> Omni -> NVIDIA.
  assert.deepEqual(planFreeRoutes('image_generation', config()).routes.map((r) => `${r.providerId}/${r.modelId}`), [`cloudflare/${CLOUDFLARE_IMAGE_MODEL}`, 'omni-router/nvidia/black-forest-labs/flux.2-klein-4b', 'novai/cogview-3-flash']);
  assert.deepEqual(planFreeRoutes('text', config()).routes.map((r) => `${r.providerId}/${r.modelId}`), ['freellmapi/auto', 'omni-router/auto/best-free', 'nvidia-nim/google/gemma-4-31b-it', 'nvidia-nim/minimaxai/minimax-m3.1-flash', 'novai/glm-4.7-flash']);
  assert.deepEqual(planFreeRoutes('audio_generation', config()).routes.map((r) => r.modelId), [CLOUDFLARE_AUDIO_MODEL]);
  // Vídeo agora tem a NovAI (cogvideox-flash); a execução dela é assíncrona e mora em test/novai_router.test.mjs.
  assert.deepEqual(planFreeRoutes('video_generation', config()).routes.map((r) => `${r.providerId}/${r.modelId}`), ['novai/cogvideox-flash']);

  // 3) Imagem: URL com a conta da env, Bearer do token, body {prompt, steps:4} e JPEG dos bytes.
  clearAvailability(); calls.length = 0;
  const img = await run('image_generation', CLOUDFLARE_IMAGE_MODEL, { prompt: 'uma xícara' });
  assert.equal(sniffImageMime(img.image), 'image/jpeg');
  assert.equal(img.mimeType, 'image/jpeg');
  assert.equal(calls[0].path, `/client/v4/accounts/${ACCOUNT}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`);
  assert.equal(calls[0].auth, `Bearer ${TOKEN}`);
  assert.deepEqual(calls[0].body, { prompt: 'uma xícara', steps: 4 }, 'steps 4 é o medido do usuário');
  assert.equal(img.providerId, 'cloudflare');

  // 4) Voz: melotts, body {prompt, lang:'en'} e WAV (não MP3) lido dos bytes.
  calls.length = 0;
  const voice = await run('audio_generation', CLOUDFLARE_AUDIO_MODEL, { prompt: 'olá', lang: 'en' });
  assert.equal(calls[0].path, `/client/v4/accounts/${ACCOUNT}/ai/run/${CLOUDFLARE_AUDIO_MODEL}`);
  assert.deepEqual(calls[0].body, { prompt: 'olá', lang: 'en' });
  assert.equal(voice.mimeType, 'audio/wav');
  assert.equal(sniffAudioMime(voice.audio), 'audio/wav');
  assert.deepEqual([...voice.audio.subarray(0, 4)], [...Buffer.from('RIFF')]);
  assert.equal(sniffAudioMime(Buffer.from('nope')), null);

  // 5) Texto: FreeLLMAPI é o primeiro (127.0.0.1:3001/v1 por padrão, modelo \"auto\").
  clearAvailability(); calls.length = 0;
  const text = await run('text', 'auto', { prompt: 'oi' });
  assert.equal(text.text, 'texto do freellmapi falso');
  assert.equal(calls[0].path, '/v1/chat/completions');
  assert.equal(calls[0].auth, 'Bearer chave-do-freellmapi');
  assert.equal(calls[0].body.model, 'auto');
  assert.equal(freeLLMAPIProviderEntry({}).baseUrl, FREELLMAPI_BASE);
  assert.equal(FREELLMAPI_BASE, 'http://127.0.0.1:3001/v1');
  assert.ok(!/localhost/.test(freeLLMAPIProviderEntry({}).baseUrl));
  assert.equal(freeLLMAPIProviderEntry({ FREELLMAPI_BASE_URL: 'http://localhost:3001/v1' }).baseUrl, 'http://127.0.0.1:3001/v1', 'localhost vira 127.0.0.1');
  assert.ok(validateFreeRouterConfig({ ...config(), providers: [{ ...freeLLMAPIProviderEntry({}), baseUrl: 'http://localhost:3001/v1' }] }).some((e) => /localhost/.test(e)));

  // 6) 401: provedor sai de rotação (kind auth) e o Omni assume a imagem.
  clearAvailability(); calls.length = 0; mode = 'auth401';
  const fallback = await executeFreeRoutes(planFreeRoutes('image_generation', config()).routes, { prompt: 'x' }, { adapters: createFreeRouterAdapters(), credentials });
  assert.equal(fallback.route.providerId, 'omni-router', 'o Omni assume a imagem');
  assert.ok(fallback.image.length > 0);
  assert.ok(availabilitySnapshot().some((e) => e.providerId === 'cloudflare' && e.kind === 'auth'));

  // 7) 402: cota/pagamento exigido -> marca cota e o próximo provedor conclui.
  clearAvailability(); calls.length = 0; mode = 'payment402';
  const paid = await executeFreeRoutes(planFreeRoutes('image_generation', config()).routes, { prompt: 'x' }, { adapters: createFreeRouterAdapters(), credentials });
  assert.equal(paid.route.providerId, 'omni-router');
  assert.ok(availabilitySnapshot().some((e) => e.providerId === 'cloudflare' && e.kind === 'quota'));

  // 8) 429: cota esgotada; sem próximo provedor a falha vira 429 com motivo claro.
  clearAvailability(); calls.length = 0; mode = 'quota429';
  await assert.rejects(() => run('audio_generation', CLOUDFLARE_AUDIO_MODEL), (error) => {
    assert.equal(error.status, 429); assert.equal(error.quotaExceeded, true);
    assert.match(error.message, /Cloudflare Workers AI/); return true;
  });

  // 9) Timeout curto na rota: marcado como timeout e o próximo provedor assume (imagem).
  clearAvailability(); calls.length = 0; mode = 'slow';
  const slowRoute = { ...routeOf('image_generation', CLOUDFLARE_IMAGE_MODEL), timeoutMs: 150 };
  const afterSlow = await executeFreeRoutes([slowRoute, routeOf('image_generation', 'nvidia/black-forest-labs/flux.2-klein-4b')], { prompt: 'x' }, { adapters: createFreeRouterAdapters(), credentials });
  assert.equal(afterSlow.route.providerId, 'omni-router');
  assert.ok(availabilitySnapshot().some((e) => e.providerId === 'cloudflare' && e.kind === 'timeout'));
  mode = 'ok';

  // 10) success:false e resposta sem bytes: erro explícito, nada é inventado.
  clearAvailability(); mode = 'nobytes';
  await assert.rejects(() => run('image_generation', CLOUDFLARE_IMAGE_MODEL), /não retornou result\.image/);
  mode = 'ok';

  // 11) Segredos: mensagem do provedor com conta e token sai redigida; nada de chave em erro/log.
  const scrubbed = redactSecrets(`conta ${ACCOUNT} token ${TOKEN}`, [ACCOUNT, TOKEN]);
  assert.equal(scrubbed, 'conta [redacted] token [redacted]');
  clearAvailability(); mode = 'failmsg';
  await assert.rejects(() => run('image_generation', CLOUDFLARE_IMAGE_MODEL), (error) => {
    assert.match(error.message, /Cloudflare recusou/);
    assert.ok(!error.message.includes(ACCOUNT), 'o id da conta não aparece');
    assert.ok(!error.message.includes(TOKEN), 'o token não aparece');
    return true;
  });
  mode = 'ok';

  // 12) Sem conta/sem token: falha de credencial (missingKey), sem tocar a rede e citando só o NOME da variável.
  clearAvailability(); calls.length = 0;
  const adapter = createCloudflareFreeAdapter();
  const cf = routeOf('image_generation', CLOUDFLARE_IMAGE_MODEL);
  await assert.rejects(() => adapter.execute(cf, { prompt: 'x' }, { credentials: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT } }), /CLOUDFLARE_API_TOKEN/);
  await assert.rejects(() => adapter.execute(cf, { prompt: 'x' }, { apiKey: TOKEN, credentials: {} }), /CLOUDFLARE_ACCOUNT_ID/);
  assert.equal(calls.length, 0, 'sem credencial não há chamada');
  assert.equal(cloudflareProviderEntry({}).baseUrl, CLOUDFLARE_AI_BASE);
  assert.deepEqual(cloudflareProviderEntry({}).models.map((m) => m.id), [CLOUDFLARE_IMAGE_MODEL, CLOUDFLARE_AUDIO_MODEL, CLOUDFLARE_TRANSCRIPTION_MODEL]); // item 1 da rodada 6: transcrição whisper no catálogo
  assert.ok(!JSON.stringify(publicFreeRouterConfig(config())).includes(ACCOUNT), 'config pública não guarda a conta');
  assert.ok(!JSON.stringify(publicFreeRouterConfig(config())).includes(TOKEN), 'config pública não guarda o token');
  console.log('cloudflare_router: ok (imagem flux-1-schnell steps 4, voz melotts WAV, ordem FreeLLMAPI/Omni/NVIDIA, 401/402/429/timeout, redação de conta e token)');
} finally {
  clearAvailability();
  await new Promise((r) => fake.close(r));
}
