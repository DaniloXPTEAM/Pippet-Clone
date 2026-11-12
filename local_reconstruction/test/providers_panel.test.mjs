// Item 3 da rodada 6: tela única de provedores em Configurações — os 7 provedores do catálogo, a pilha por tipo,
// o estado com motivo e horário de retorno, o botão Testar por provedor (vídeo só com confirmação explícita,
// porque gasta 1 das 5 do dia) e as variáveis de ambiente esperadas. Nenhuma chave aparece na tela nem nas rotas.
// Parte A: rotas (servidor falso). Parte B: UI real no Chromium (mesmo app), com o botão Testar clicado de verdade.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

const SECRETS = {
  FREELMAPI: 'segredo-freellmapi-nao-expor',
};
const key = 'chave-'; // prefixo comum dos valores falsos abaixo
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname.endsWith('/chat/completions')) return json(200, { choices: [{ message: { content: 'ok' } }] });
    // Cloudflare Workers AI: tudo em POST .../ai/run/<modelo> com { result: { image|audio } } em base64.
    if (url.pathname.includes('/ai/run/')) {
      if (url.pathname.endsWith('melotts')) return json(200, { success: true, result: { audio: Buffer.from('RIFF....WAVEfake').toString('base64') } });
      return json(200, { success: true, result: { image: Buffer.from('imagem-falsa').toString('base64') } });
    }
    if (url.pathname.includes('/images/')) return json(200, { data: [{ b64_json: Buffer.from('imagem-falsa').toString('base64') }] });
    if (url.pathname.includes('/audio/')) { res.writeHead(200, { 'content-type': 'audio/wav' }); return res.end(Buffer.from('RIFF....WAVEfake')); }
    return json(404, { error: 'rota falsa' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const env = {
  FREELLMAPI_BASE_URL: `${root}/v1`, FREELLMAPI_API_KEY: 'chave-freellmapi-nao-expor',
  OMNIROUTER_BASE_URL: `${root}/omni/v1`, OMNIROUTER_API_KEY: 'chave-omni-nao-expor',
  NVIDIA_BASE_URL: `${root}/nim/v1`, NVIDIA_API_KEY: 'chave-nvidia-nao-expor',
  NOVAI_BASE_URL: `${root}/novai/v1`, NOVAI_API_KEY: 'chave-novai-nao-expor',
  CLOUDFLARE_API_TOKEN: 'chave-cloudflare-nao-expor', CLOUDFLARE_ACCOUNT_ID: 'conta-cloudflare-nao-expor',
  CLOUDFLARE_AI_BASE_URL: `${root}/client/v4/accounts/{account}/ai/run`,
};
Object.assign(process.env, env);
const allSecrets = Object.values(env).filter((v) => v.startsWith('chave-') || v.startsWith('conta-'));

const f = await startUiFixture('pippet-providers-panel-');
const api = async (url, body, method = 'POST') => { const res = await fetch(f.base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const noSecrets = (value, where) => { const s = typeof value === 'string' ? value : JSON.stringify(value); for (const sec of allSecrets) assert.ok(!s.includes(sec), `${where} não pode conter ${sec.slice(0, 12)}…`); };
let browser;
try {
  assert.equal((await api('/api/free-router/preset/stack', {})).status, 200);

  // A) Rota do painel: os 7 provedores do catálogo, estado com motivo e horário, variáveis esperadas, pilha por tipo.
  const panel = (await api('/api/free-router/panel', undefined, 'GET')).body;
  assert.equal(panel.ok, true);
  assert.equal(panel.providers.length, 7, 'os sete provedores do catálogo');
  assert.deepEqual(panel.providers.map((p) => p.id).sort(), ['cloudflare', 'freellmapi', 'gemini', 'novai', 'nvidia-nim', 'ollama', 'omni-router']);
  noSecrets(panel, 'GET /api/free-router/panel');
  const byId = Object.fromEntries(panel.providers.map((p) => [p.id, p]));
  assert.equal(byId.cloudflare.envNames.key, 'CLOUDFLARE_API_TOKEN');
  assert.equal(byId.cloudflare.envNames.account, 'CLOUDFLARE_ACCOUNT_ID');
  assert.equal(byId.novai.envNames.key, 'NOVAI_API_KEY');
  assert.equal(byId.freellmapi.envNames.base, 'FREELLMAPI_BASE_URL');
  assert.equal(byId.cloudflare.hasKey, true); assert.equal(byId.cloudflare.hasAccount, true);
  assert.equal(byId.cloudflare.state, 'ready');
  assert.equal(byId.gemini.state, 'not-configured', 'Gemini não está na pilha aplicada');
  assert.equal(byId.novai.state, 'ready');
  assert.ok(byId.novai.tasks.some((t) => t.task === 'video_generation'), 'NovAI aparece com vídeo');
  assert.equal(byId.novai.dailyLimit >= 0, true);
  for (const task of ['text', 'image_generation', 'audio_generation', 'video_generation', 'transcription']) assert.ok(panel.stacks[task], `a pilha de ${task} aparece na tela`);
  assert.deepEqual(panel.stacks.text.order.slice(0, 2), ['freellmapi/auto', 'omni-router/auto/best-free']);
  assert.deepEqual(panel.stacks.image_generation.order, ['cloudflare/@cf/black-forest-labs/flux-1-schnell', 'omni-router/nvidia/black-forest-labs/flux.2-klein-4b', 'novai/cogview-3-flash']);
  assert.deepEqual(panel.stacks.audio_generation.order, ['cloudflare/@cf/myshell-ai/melotts']);
  assert.deepEqual(panel.stacks.video_generation.order, ['novai/cogvideox-flash']);
  assert.deepEqual(panel.stacks.transcription.order, ['cloudflare/@cf/openai/whisper']);

  // B) Testar por provedor: uma chamada curta, amostra do resultado, sem chave na resposta.
  const textTest = await api('/api/free-router/test', { providerId: 'freellmapi', task: 'text' });
  assert.equal(textTest.status, 200, JSON.stringify(textTest.body).slice(0, 800));
  assert.equal(textTest.body.providerName, 'FreeLLMAPI (local)');
  assert.equal(textTest.body.usedNow, 1, 'uma chamada, uma unidade de uso');
  assert.match(textTest.body.sample, /ok/);
  noSecrets(textTest.body, 'POST /api/free-router/test (texto)');

  const imageTest = await api('/api/free-router/test', { providerId: 'cloudflare' }); // sem task: escolhe a primeira da pilha
  assert.equal(imageTest.status, 200, JSON.stringify(imageTest.body).slice(0, 400));
  assert.equal(imageTest.body.task, 'image_generation');
  assert.equal(imageTest.body.providerId, 'cloudflare');
  noSecrets(imageTest.body, 'POST /api/free-router/test (imagem)');

  // C) Vídeo exige confirmação explícita e, sem ela, NÃO chama o provedor (não gasta uma das 5 do dia).
  const beforePanel = (await api('/api/free-router/panel', undefined, 'GET')).body;
  const videoNoConfirm = await api('/api/free-router/test', { providerId: 'novai', task: 'video_generation' });
  assert.equal(videoNoConfirm.status, 428);
  assert.equal(videoNoConfirm.body.needsConfirmation, true);
  assert.equal(videoNoConfirm.body.dailyLimit, 5);
  assert.match(videoNoConfirm.body.error, /gasta 1 das 5/i);
  const afterPanel = (await api('/api/free-router/panel', undefined, 'GET')).body;
  assert.equal(afterPanel.providers.find((p) => p.id === 'novai').usedToday, beforePanel.providers.find((p) => p.id === 'novai').usedToday, 'sem confirmação não consome geração');

  // D) Erros explicados, não silenciosos.
  const unknown = await api('/api/free-router/test', { providerId: 'nao-existe' });
  assert.equal(unknown.status, 400);
  assert.match(unknown.body.error, /Provedor desconhecido/);
  const notInStack = await api('/api/free-router/test', { providerId: 'gemini' });
  assert.equal(notInStack.status, 409);
  assert.match(notInStack.body.error, /não está na pilha/);
  noSecrets(notInStack.body, 'POST /api/free-router/test (fora da pilha)');
  // Auth recusada marca o provedor como indisponível, com motivo e horário de retorno no painel.
  const failing = http.createServer((req, res) => { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'invalid api key' } })); });
  await new Promise((r) => failing.listen(0, '127.0.0.1', r));
  const stored = (await api('/api/free-router/config', undefined, 'GET')).body.config;
  const withBase = (baseUrl) => ({ ...stored, providers: stored.providers.map((p) => (p.id === 'nvidia-nim' ? { ...p, baseUrl } : p)) });
  assert.equal((await api('/api/free-router/config', { config: withBase(`http://127.0.0.1:${failing.address().port}/nim/v1`) })).status, 200);
  const authTest = await api('/api/free-router/test', { providerId: 'nvidia-nim', task: 'text' });
  assert.equal(authTest.status, 401, JSON.stringify(authTest.body).slice(0, 300));
  noSecrets(authTest.body, 'POST /api/free-router/test (401)');
  const afterAuth = (await api('/api/free-router/panel', undefined, 'GET')).body;
  const nvidia = afterAuth.providers.find((p) => p.id === 'nvidia-nim');
  assert.equal(nvidia.state, 'unavailable');
  assert.match(nvidia.reason, /auth|chave/i);
  assert.ok(nvidia.unavailable?.until && Date.parse(nvidia.unavailable.until) > Date.now(), 'horário de retorno informado');
  // Fora da rotação, o painel mostra o horário de volta e a UI escreve isso.
  assert.equal((await api('/api/free-router/config', { config: stored })).status, 200);
  await new Promise((r) => failing.close(r));

  // E) UI: a aba de Configurações mostra a tela única (7 linhas, pilha por tipo, nomes de variáveis) e o Testar funciona.
  if (skipUnavailableBrowser('providers_panel')) { console.log('providers_panel: rotas ok; UI pulada (sem Chromium)'); process.exit(0); }
  browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/settings/llm`);
  await page.locator('#prov-panel').waitFor();
  const text = await page.locator('#prov-panel').innerText();
  for (const name of ['Ollama', 'NVIDIA NIM', 'Gemini API', 'Omni Router (local)', 'FreeLLMAPI (local)', 'Cloudflare Workers AI', 'NovAI (aiapi-pro)']) assert.ok(text.includes(name), `a tela lista ${name}`);
  assert.match(text, /CLOUDFLARE_API_TOKEN/);
  assert.match(text, /NOVAI_API_KEY/);
  assert.match(text, /configurado/);
  assert.match(text, /Pilha por tipo de tarefa/);
  assert.match(text, /freellmapi\/auto/);
  noSecrets(text, 'texto da tela de provedores');
  assert.equal(await page.locator('#prov-panel tbody tr').count(), 7, 'sete linhas, uma por provedor');
  // item 2 da rodada 8: a tela diz de onde vêm as credenciais e só mostra presente/ausente.
  await page.waitForFunction(() => /presente\/ausente/i.test(document.querySelector('#envFileNote')?.textContent || '') && !/verificando/.test(document.querySelector('#envFileNote')?.textContent || ''));
  const envNote = await page.locator('#envFileNote').innerText();
  assert.match(envNote, /presente\/ausente/);
  assert.match(envNote, /(\.env<\/code> local encontrado|nenhum \.env local|local encontrado)/, 'a tela diz se existe .env local');
  noSecrets(envNote, 'nota de origem das credenciais');
  // Testar da Cloudflare (imagem) de verdade, pela tela.
  const cfRow = page.locator('#prov-panel tbody tr[data-prov="cloudflare"]');
  await cfRow.locator('button[data-ptask="image_generation"]').click();
  await page.waitForFunction(() => /✅|⛔/.test(document.querySelector('[data-pout="cloudflare"]')?.textContent || ''));
  const out = await cfRow.locator('[data-pout="cloudflare"]').textContent();
  assert.match(out, /✅/);
  assert.match(out, /imagem/);
  // Testar vídeo: o diálogo de confirmação aparece e, ao cancelar, nada é gerado.
  let asked = '';
  page.once('dialog', (d) => { asked = d.message(); d.dismiss(); });
  await page.locator('#prov-panel tbody tr[data-prov="novai"] button[data-pvideo="1"]').click();
  await page.waitForTimeout(200);
  assert.match(asked, /1 das 5/);
  const novaiOut = await page.locator('[data-pout="novai"]').textContent();
  assert.ok(!novaiOut.trim(), 'cancelar a confirmação não chama o provedor');
  noSecrets(await page.content(), 'HTML da tela');
  assert.deepEqual(errors, []);
  console.log('providers_panel: ok (7 provedores com estado/motivo/horário, pilha por tipo, variáveis esperadas, Testar por provedor e vídeo só com confirmação; nenhuma chave na tela ou nas rotas)');
} finally {
  await browser?.close();
  await f.close();
  await new Promise((r) => fake.close(r));
  fs.rmSync(path.join(process.env.PIPPIT_LOCAL_DATA || ''), { recursive: true, force: true });
}
