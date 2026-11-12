// Item 2 da rodada 6: o agente (planejador), o refinar prompt, as Skills com IA e a Criação Inteligente usam a
// MESMA pilha de texto do roteador — FreeLLMAPI → Omni → NVIDIA → NovAI — por padrão. Ollama local continua opcional.
// Provedores falsos em 127.0.0.1: nenhuma chamada real, nenhuma chave real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-router-llm-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
delete process.env.PIPPIT_LLM; // este teste mede o caminho padrão (roteador), sem desligar o LLM

const calls = [];
const modes = { freellmapi: 'ok', omni: 'ok', nvidia: 'ok', novai: 'ok' };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
// respostas por provedor: nomes de função diferentes para provar qual deles respondeu de fato
// O app pede JSON nas funções que planejam (refinar prompt, skill, ideias, temas); marcamos o provedor no conteúdo
// para provar qual deles respondeu de fato.
const answer = (provider, body) => {
  const text = JSON.stringify(body || {});
  if (/refina prompts/i.test(text)) return JSON.stringify({ prompt: `Prompt refinado por ${provider}: sujeito, ação, ambiente, câmera e luz em duas frases.` });
  if (/skills/i.test(text)) return JSON.stringify({ nome: `Skill ${provider}`, descricao: 'skill criada com IA de teste', instrucoes: `1. instrução do ${provider}\n2. passo dois\n3. passo três\n4. passo quatro\n5. passo cinco` });
  if (/ideias de vídeos curtos/i.test(text)) return JSON.stringify({ ideias: [{ titulo: `Ideia ${provider}`, prompt: `Um vídeo curto criado pelas ideias do ${provider} com detalhes suficientes.` }] });
  if (/temas/i.test(text)) return JSON.stringify({ temas: [`tema-${provider}-1`, `tema-${provider}-2`, `tema-${provider}-3`] });
  return `resposta de ${provider}`;
};
const fake = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString() || 'null'); } catch { body = null; }
    const provider = url.pathname.startsWith('/v1/') ? 'freellmapi' : url.pathname.startsWith('/omni/') ? 'omni' : url.pathname.startsWith('/nim/') ? 'nvidia' : url.pathname.startsWith('/novai/') ? 'novai' : null;
    calls.push({ provider, path: url.pathname, auth: req.headers.authorization || null, model: body?.model || null });
    if (!provider) return json(res, 404, { error: 'rota falsa' });
    if (modes[provider] === 'auth401') return json(res, 401, { error: { message: 'invalid api key' } });
    if (modes[provider] === 'quota429') return json(res, 429, { error: { message: 'quota' } });
    return json(res, 200, { choices: [{ message: { content: answer(provider, body) } }] });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const env = {
  FREELLMAPI_BASE_URL: `${root}/v1`, FREELLMAPI_API_KEY: 'chave-freellmapi-teste',
  OMNIROUTER_BASE_URL: `${root}/omni/v1`, OMNIROUTER_API_KEY: 'chave-omni-teste',
  NVIDIA_BASE_URL: `${root}/nim/v1`, NVIDIA_API_KEY: 'chave-nvidia-teste',
  NOVAI_BASE_URL: `${root}/novai/v1`, NOVAI_API_KEY: 'chave-novai-teste',
};
Object.assign(process.env, env);

const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const res = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const secrets = Object.values(env).filter((v) => v.startsWith('chave-'));
const noSecret = (v) => { const s = JSON.stringify(v); for (const sec of secrets) assert.doesNotMatch(s, new RegExp(sec)); };

try {
  assert.equal((await api('/api/free-router/preset/stack', {})).status, 200);

  // 1) Status: o agente está no roteador, não no Ollama; timeout >= 60 s; a pilha é a pedida.
  const status = (await api('/api/llm/status', undefined, 'GET')).body;
  assert.equal(status.source, 'router', JSON.stringify(status).slice(0, 300));
  assert.equal(status.reachable, true);
  assert.match(status.label, /freellmapi|FreLLMAPI|FreeLLMAPI|auto/i);
  assert.deepEqual(status.router.planned, ['freellmapi/auto', 'omni-router/auto/best-free', 'nvidia-nim/google/gemma-4-31b-it', 'nvidia-nim/minimaxai/minimax-m3.1-flash', 'novai/glm-4.7-flash']);
  assert.ok(status.router.timeoutMs >= 60_000, 'timeout mínimo de 60 s');
  assert.equal(status.ollama.used, false, 'o Ollama local não é usado quando a pilha está disponível');
  noSecret(status);

  // 2) Refinar prompt: responde o primeiro da pilha (FreeLLMAPI), com o modelo auto.
  calls.length = 0;
  const refine = await api('/api/prompt/refine', { text: 'um gato no telhado ao amanhecer' });
  assert.equal(refine.status, 200, JSON.stringify(refine.body).slice(0, 200));
  assert.match(refine.body.prompt, /Prompt refinado por freellmapi/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].provider, 'freellmapi');
  assert.equal(calls[0].model, 'auto');
  assert.equal(calls[0].auth, 'Bearer chave-freellmapi-teste');
  noSecret(refine.body);

  // 3) FreeLLMAPI fora (500) -> Omni assume; a resposta é a do Omni.
  modes.freellmapi = 'auth401';
  calls.length = 0;
  const fallback = await api('/api/prompt/refine', { text: 'uma cidade vista de cima' });
  assert.equal(fallback.status, 200, JSON.stringify(fallback.body).slice(0, 300));
  assert.match(fallback.body.prompt, /Prompt refinado por omni/);
  assert.deepEqual(calls.map((c) => c.provider), ['freellmapi', 'omni']);
  modes.freellmapi = 'ok';

  // 4) Skills com IA e Criação Inteligente passam pelo mesmo cliente.
  calls.length = 0;
  const skill = await api('/api/skills/ai', { brief: 'uma skill que escreve roteiros curtos de produto' });
  assert.equal(skill.status, 200, JSON.stringify(skill.body).slice(0, 600));
  assert.ok(calls.some((c) => c.provider === 'freellmapi'), 'a skill foi criada pela pilha do roteador');
  assert.equal((await api('/api/smart-creation', { authorize: true })).status, 200);
  calls.length = 0;
  const ideas = await api('/api/smart-creation/run', {});
  assert.equal(ideas.status, 200, JSON.stringify(ideas.body).slice(0, 300));
  assert.ok(ideas.body.ideas.length >= 1);
  assert.match(String(ideas.body.ideas[0].source), /LLM .*auto|roteador/i, `fonte das ideias: ${ideas.body.ideas[0].source}`);
  assert.ok(calls.length >= 1, 'a Criação Inteligente chamou a pilha');

  // 5) Agente: mensagem no projeto pede temas ao LLM e recebe os temas do provedor da pilha.
  const proj = (await api('/api/projects', { type: 'chat', title: 'Agente roteador' })).body;
  const chat = (await api(`/api/projects/${proj.id}/chats`, {})).body;
  calls.length = 0;
  const msg = await api(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Crie um vídeo sobre café na praia' });
  assert.equal(msg.status, 200, JSON.stringify(msg.body).slice(0, 300));
  assert.ok(calls.some((c) => c.provider === 'freellmapi'), 'o agente consultou a pilha de texto');

  // 6) Ollama opcional: um modelo definido à mão continua tendo prioridade (mesmo sem Ollama no ar, a fonte muda).
  const manual = await api('/api/llm/config', { model: 'llama3.2:1b', baseUrl: 'http://127.0.0.1:11434/v1' });
  assert.equal(manual.status, 200, JSON.stringify(manual.body).slice(0, 200));
  const manualStatus = (await api('/api/llm/status', undefined, 'GET')).body;
  assert.equal(manualStatus.source, 'manual');
  assert.equal(manualStatus.router.planned.length, 5, 'a pilha continua planejada, só não é a fonte atual');
  assert.equal((await api('/api/llm/config', { model: '', baseUrl: '' })).status, 200);

  // 7) Toda a pilha falhando: mensagem clara com a ordem e o motivo de cada provedor (nada de silêncio).
  for (const k of Object.keys(modes)) modes[k] = 'quota429';
  calls.length = 0;
  const failed = await api('/api/prompt/refine', { text: 'uma ideia qualquer de vídeo' });
  assert.ok([429, 502].includes(failed.status), `status ${failed.status}`);
  assert.match(failed.body.error, /pilha de texto do roteador falhou/i);
  assert.match(failed.body.error, /freellmapi\/auto/);
  assert.match(failed.body.error, /cota/i);
  assert.equal(calls.length, 5, 'as cinco rotas da pilha foram tentadas uma única vez cada');
  noSecret(failed.body);
  // O teste do LLM também devolve o motivo, não um 200 vazio.
  const testFail = await api('/api/llm/test', {});
  assert.ok([429, 502].includes(testFail.status));
  assert.match(testFail.body.error, /roteador|pilha/i);
  for (const k of Object.keys(modes)) modes[k] = 'ok';

  // 8) Sem nenhuma rota utilizável: 503 explicando como configurar (pilha ou Ollama).
  const cleared = { version: 1, paidFallback: false, providers: [], taskPreferences: {} };
  assert.equal((await api('/api/free-router/config', { config: cleared })).status, 200);
  const none = await api('/api/prompt/refine', { text: 'ideia sem provedor' });
  assert.equal(none.status, 503);
  assert.match(none.body.error, /pilha gratuita|Ollama/i);
  noSecret(none.body);

  console.log('router_llm: ok (agente/refinar/skills/criação inteligente na pilha FreeLLMAPI→Omni→NVIDIA→NovAI, timeout >= 60 s, Ollama opcional, erro claro quando todos falham)');
} finally {
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
}
