// Cliente de LLM por API compatível com OpenAI (/v1/chat/completions), usado pelo planejador do agente, pela criação de skills com IA,
// pelo refinamento de prompts e pela Criação Inteligente. Provedores suportados na prática: Ollama local (padrão, http://127.0.0.1:11434/v1),
// qualquer servidor compatível (llama.cpp, LM Studio, vLLM) ou serviço com chave fornecida pelo usuário. NÃO é o LLM do Pippit (o prompt/modelo internos são desconhecidos).
import { createHash } from 'node:crypto';
export const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/v1';

// remove blocos de raciocínio <think>…</think>, cercas ``` e extrai o primeiro objeto/array JSON equilibrado
export function parseJson(text) {
  let s = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  const start = s.search(/[\[{]/); if (start < 0) throw new Error('resposta sem JSON');
  const open = s[start], close = open === '{' ? '}' : ']'; let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === open) depth++; else if (c === close && --depth === 0) return JSON.parse(s.slice(start, i + 1));
  }
  throw new Error('JSON incompleto na resposta');
}

// Medições do benchmark local (notes/llm_bench.mjs, Qwen3-4B Q4_K_M, i7-8550U): a geração de tokens (~3–4 tok/s) é o gargalo; processar o prompt (~460 tok/s) e
// iniciar a requisição são desprezíveis; o carregamento a frio custa 15–36 s e é evitado com keep_alive. Por isso: caminho nativo do Ollama (/api/chat) com
// keep_alive, think:false e opções do usuário, cache por entrada, deduplicação de chamadas simultâneas e estatísticas por etapa.
const hash = (o) => createHash('sha1').update(JSON.stringify(o)).digest('hex');
export class LLM {
  // native: true|false|undefined(auto: porta 11434 = Ollama). options: num_thread/num_gpu/num_ctx… (só caminho nativo). cache: {get(k), set(k,v)} opcional.
  constructor({ baseUrl = DEFAULT_BASE_URL, model, apiKey = '', timeoutMs = 240000, fetchImpl = globalThis.fetch, native, keepAlive = '30m', options = {}, cache = null } = {}) {
    if (!model) throw new Error('modelo não configurado'); this.baseUrl = baseUrl.replace(/\/+$/, ''); this.model = model; this.apiKey = apiKey; this.timeoutMs = timeoutMs; this.fetch = fetchImpl;
    this.native = native ?? (new URL(this.baseUrl).port === '11434'); this.keepAlive = keepAlive; this.options = options || {}; this.cache = cache; this.inflight = new Map();
    this.stats = { calls: 0, cacheHits: 0, deduped: 0, errors: 0, totalMs: 0, loadMs: 0, promptMs: 0, genMs: 0, promptTokens: 0, genTokens: 0, last: null };
  }
  get label() { return `${this.model} @ ${new URL(this.baseUrl).host}`; }
  get root() { return this.baseUrl.replace(/\/v1$/, ''); }
  headers() { return { 'content-type': 'application/json', ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }; }
  // Carrega o modelo na memória (sem gerar texto) para que a primeira chamada real não pague o carregamento a frio.
  async warmup() { if (!this.native) return false; const r = await this.fetch(`${this.root}/api/generate`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ model: this.model, keep_alive: this.keepAlive }) }); return r.ok; }
  // Cache por entrada + deduplicação de chamadas idênticas em andamento. fresh:true ignora o cache (ex.: "gerar outras opções").
  async chat(messages, opts = {}) {
    const { fresh = false, cacheable = true, ...rest } = opts; const key = hash({ m: this.model, messages, o: rest, op: this.native ? this.options : null });
    if (cacheable && !fresh && this.cache) { const hit = this.cache.get(key); if (typeof hit === 'string') { this.stats.cacheHits++; return hit; } }
    if (cacheable && !fresh && this.inflight.has(key)) { this.stats.deduped++; return this.inflight.get(key); }
    const p = this.raw(messages, rest).then((t) => { if (cacheable && this.cache) this.cache.set(key, t); return t; }).finally(() => this.inflight.delete(key)); this.inflight.set(key, p); return p;
  }
  async raw(messages, { json = false, maxTokens = 600, temperature = 0.7 } = {}) {
    if (this.native) return this.nativeChat(messages, { json, maxTokens, temperature });
    this.stats.calls++; const t0 = Date.now();
    try { return await this.openaiChat(messages, { json, maxTokens, temperature }); } catch (e) { this.stats.errors++; throw e; } finally { const ms = Date.now() - t0; this.stats.totalMs += ms; this.stats.last = { ms, path: 'openai' }; }
  }
  async nativeChat(messages, { json, maxTokens, temperature }) {
    this.stats.calls++; const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), this.timeoutMs); const t0 = Date.now();
    try {
      const r = await this.fetch(`${this.root}/api/chat`, { method: 'POST', headers: this.headers(), signal: ac.signal, body: JSON.stringify({ model: this.model, messages, stream: false, think: false, keep_alive: this.keepAlive, ...(json ? { format: 'json' } : {}), options: { num_predict: maxTokens, temperature, ...this.options } }) });
      const body = await r.json().catch(() => null); if (!r.ok) throw new Error(`LLM HTTP ${r.status}: ${body?.error?.message || body?.error || 'erro'}`);
      const text = body?.message?.content; if (typeof text !== 'string') throw new Error('resposta do LLM sem conteúdo');
      const ms = (ns) => Math.round((ns || 0) / 1e6); const s = this.stats; const rec = { path: 'ollama-native', ms: Date.now() - t0, loadMs: ms(body.load_duration), promptTokens: body.prompt_eval_count || 0, promptMs: ms(body.prompt_eval_duration), genTokens: body.eval_count || 0, genMs: ms(body.eval_duration) };
      s.totalMs += rec.ms; s.loadMs += rec.loadMs; s.promptMs += rec.promptMs; s.genMs += rec.genMs; s.promptTokens += rec.promptTokens; s.genTokens += rec.genTokens; s.last = rec; return text;
    } catch (e) { this.stats.errors++; throw e.name === 'AbortError' ? new Error(`LLM excedeu ${Math.round(this.timeoutMs / 1000)} s`) : e; } finally { clearTimeout(timer); }
  }
  async openaiChat(messages, { json = false, maxTokens = 600, temperature = 0.7 } = {}) {
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      // "/no_think" desliga o modo de raciocínio de modelos Qwen3 (ignorado pelos demais)
      const msgs = messages.map((m, i) => (i === 0 && m.role === 'system' ? { ...m, content: `/no_think ${m.content}` } : m));
      const r = await this.fetch(`${this.baseUrl}/chat/completions`, { method: 'POST', headers: this.headers(), signal: ac.signal, body: JSON.stringify({ model: this.model, messages: msgs, stream: false, max_tokens: maxTokens, temperature, ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
      const body = await r.json().catch(() => null); if (!r.ok) throw new Error(`LLM HTTP ${r.status}: ${body?.error?.message || body?.error || 'erro'}`);
      const text = body?.choices?.[0]?.message?.content; if (typeof text !== 'string') throw new Error('resposta do LLM sem conteúdo'); return text;
    } catch (e) { throw e.name === 'AbortError' ? new Error(`LLM excedeu ${Math.round(this.timeoutMs / 1000)} s`) : e; } finally { clearTimeout(timer); }
  }
  async json(messages, opts = {}) { return parseJson(await this.chat(messages, { ...opts, json: true })); }
  async models() { // lista modelos: /models (OpenAI) com fallback para /api/tags (Ollama)
    try { const r = await this.fetch(`${this.baseUrl}/models`, { headers: this.headers() }); if (r.ok) return ((await r.json()).data || []).map((m) => m.id); } catch {}
    const root = this.baseUrl.replace(/\/v1$/, ''); const r2 = await this.fetch(`${root}/api/tags`); if (!r2.ok) throw new Error('sem lista de modelos'); return ((await r2.json()).models || []).map((m) => m.name);
  }
}

// Planejador do agente com LLM: devolve opções de tema, design e storyboard por segmento. Entradas curtas e saída JSON pequena (modelos locais são lentos).
// trecho do prompt com a skill escolhida pelo usuário (instruções do SKILL.md dele; nas nativas, só a descrição pública)
const skillBlock = (skill) => (skill?.instructions ? `\nHabilidade escolhida pelo usuário "${String(skill.name).slice(0, 60)}" — siga estas instruções:\n${String(skill.instructions).slice(0, 1200)}\n` : '');
export async function llmThemeOptions(llm, text, skill = null) {
  const j = await llm.json([{ role: 'system', content: 'Você é um roteirista de vídeos curtos. Responda somente JSON.' }, { role: 'user', content: `Pedido do usuário: "${String(text).slice(0, 600)}"${skillBlock(skill)}\nProponha 3 temas distintos e curtos (uma frase cada, em português do Brasil) para o vídeo. Formato: {"temas":["...","...","..."]}` }], { maxTokens: 350 });
  const t = (j.temas || j.themes || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 3); if (t.length < 2) throw new Error('temas insuficientes'); return t;
}
export async function llmStoryboard(llm, { theme, request, segs, skill = null }) {
  const j = await llm.json([{ role: 'system', content: 'Você é um diretor de vídeos curtos. Responda somente JSON.' }, { role: 'user', content: `Tema: ${theme}\nPedido: "${String(request).slice(0, 500)}"${skillBlock(skill)}\nCrie um storyboard com exatamente ${segs.length} segmentos (durações em segundos: ${segs.map((s) => s.seconds).join(', ')}). Para cada um: "titulo" (até 6 palavras), "descricao" (1–2 frases visuais) e "fala" (narração curta ou vazio). Formato: {"estilo":"...","segmentos":[{"titulo":"...","descricao":"...","fala":"..."}]}` }], { maxTokens: 700 });
  const sg = (j.segmentos || j.segments || []); if (sg.length !== segs.length) throw new Error(`storyboard com ${sg.length} segmentos (esperado ${segs.length})`);
  return { estilo: String(j.estilo || j.style || ''), segmentos: sg.map((s) => ({ titulo: String(s.titulo || s.title || '').slice(0, 80), descricao: String(s.descricao || s.description || '').slice(0, 400), fala: String(s.fala || s.voiceover || '').slice(0, 300) })) };
}
export async function llmCreateSkill(llm, brief) {
  const j = await llm.json([{ role: 'system', content: 'Você cria "skills" (instruções reutilizáveis) para um agente de criação de vídeo. Responda somente JSON.' }, { role: 'user', content: `Descrição do usuário: "${String(brief).slice(0, 600)}"\nCrie uma skill. Formato: {"nome":"até 40 caracteres","descricao":"uma frase","instrucoes":"5 a 8 linhas de instruções claras para o agente, em português"}` }], { maxTokens: 500 });
  const name = String(j.nome || j.name || '').trim(), instructions = String(j.instrucoes || j.instructions || '').trim(); if (!name || !instructions) throw new Error('skill incompleta');
  return { name: name.slice(0, 60), description: String(j.descricao || j.description || '').slice(0, 300), instructions };
}
export async function llmRefinePrompt(llm, text, kind = 'vídeo') {
  const j = await llm.json([{ role: 'system', content: 'Você refina prompts de geração de mídia. Responda somente JSON.' }, { role: 'user', content: `Ideia do usuário: "${String(text).slice(0, 500)}"\nEscreva um prompt refinado para gerar um ${kind} (mínimo de 15 caracteres, 2–3 frases em português: sujeito, ação, ambiente, câmera e luz). Formato: {"prompt":"..."}` }], { maxTokens: 300 });
  const p = String(j.prompt || '').trim(); if (p.length < 15) throw new Error('prompt refinado muito curto'); return p;
}
export async function llmSmartIdeas(llm, history) {
  const j = await llm.json([{ role: 'system', content: 'Você sugere ideias de vídeos curtos a partir do histórico do usuário. Responda somente JSON.' }, { role: 'user', content: `Histórico recente de pedidos:\n${history.slice(0, 8).map((h) => `- ${String(h).slice(0, 120)}`).join('\n') || '- (vazio)'}\nSugira 3 ideias novas de vídeos de 15 s. Formato: {"ideias":[{"titulo":"...","prompt":"..."}]}` }], { maxTokens: 450 });
  const ideas = (j.ideias || j.ideas || []).map((i) => ({ title: String(i.titulo || i.title || '').slice(0, 80), prompt: String(i.prompt || '').slice(0, 400) })).filter((i) => i.title && i.prompt.length >= 15); if (!ideas.length) throw new Error('sem ideias válidas'); return ideas.slice(0, 3);
}
