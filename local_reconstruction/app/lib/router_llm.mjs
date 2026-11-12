// Cliente de LLM com a MESMA interface de `LLM` (src/llm.mjs), mas servido pela pilha de texto do roteador
// gratuito: FreeLLMAPI → Omni Router → NVIDIA NIM → NovAI (glm-4.7-flash), na ordem configurada.
// Assim o planejador do agente, o refinamento de prompt, as Skills com IA e a Criação Inteligente deixam de
// depender do Ollama local (que continua funcionando como opção quando configurado pelo usuário).
// Timeout mínimo de 60 s por provedor: planejamento com modelos gratuitos em nuvem pode demorar.
import { parseJson } from '../../src/llm.mjs';
import { planFreeRoutes, executeFreeRoutes, createFreeRouterAdapters } from '../../src/free_router.mjs';

export const ROUTER_LLM_MIN_TIMEOUT_MS = 60_000;

// Converte as mensagens de chat no que os adaptadores entendem: `prompt` (texto único) e `messages` (quando o
// adaptador fala OpenAI). O Ollama nativo não entra aqui: o roteador só usa HTTP compatível/Gemini/Cloudflare/NovAI.
export function messagesToPrompt(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.map((m) => {
    const role = String(m?.role || 'user');
    const label = role === 'system' ? 'Instruções' : role === 'assistant' ? 'Assistente' : 'Usuário';
    return `${label}: ${String(m?.content ?? '')}`;
  }).join('\n\n').slice(0, 24_000);
}

// Credenciais disponíveis para as rotas planejadas (sem nunca expor valores).
export function routesWithCredential(routes, credentials = {}) {
  return (routes || []).filter((route) => {
    if (!route?.secretEnv) return true; // provedor local sem chave (Omni/FreeLLMAPI usam chave na prática, mas não é obrigatória no catálogo)
    return Boolean(credentials[route.secretEnv]);
  });
}

export class RouterLLM {
  constructor({ routes = [], credentials = {}, adapters = null, timeoutMs = null, label = 'roteador gratuito' } = {}) {
    this.routes = routes.filter((r) => r?.ok !== false).map((r) => ({ ...r, timeoutMs: Math.max(ROUTER_LLM_MIN_TIMEOUT_MS, Number(r.timeoutMs) || 0) }));
    if (!this.routes.length) throw new Error('nenhuma rota de texto configurada');
    this.credentials = credentials || {};
    this.adapters = adapters || createFreeRouterAdapters();
    this.timeoutMs = Math.max(ROUTER_LLM_MIN_TIMEOUT_MS, Number(timeoutMs) || this.routes[0].timeoutMs || ROUTER_LLM_MIN_TIMEOUT_MS);
    this.name = label;
    this.model = this.routes[0].modelId;
    this.baseUrl = this.routes[0].baseUrl || '';
    this.native = false; this.keepAlive = null; this.options = {};
    this.stats = { calls: 0, errors: 0, totalMs: 0, last: null, cached: false };
  }
  get label() { return `${this.model} @ ${this.name}`; }
  get routeIds() { return this.routes.map((r) => `${r.providerId}/${r.modelId}`); }
  async chat(messages, opts = {}) {
    const { json = false, maxTokens = 600, temperature = 0.7, signal } = opts;
    const prompt = messagesToPrompt(messages);
    const t0 = Date.now(); this.stats.calls += 1;
    try {
      const result = await executeFreeRoutes(this.routes, {
        prompt, messages, json,
        options: { max_tokens: maxTokens, temperature, ...(json ? { response_format: { type: 'json_object' } } : {}) },
      }, {
        adapters: this.adapters, credentials: this.credentials, signal,
        // Sem cache de disponibilidade no agente: uma tentativa de planejamento não deve "envenenar" a próxima.
        useAvailabilityCache: false,
        defaultTimeoutMs: this.timeoutMs,
      });
      const text = String(result?.text ?? '').trim();
      if (!text) throw Object.assign(new Error(`o provedor ${result?.route?.providerName || ''} respondeu sem texto`), { status: 0 });
      return text;
    } catch (error) {
      this.stats.errors += 1;
      const detail = error?.failures?.length ? error.failures.join(' | ') : String(error?.message || error);
      throw Object.assign(new Error(`Pilha de texto do roteador falhou (${this.routeIds.join(' → ')}): ${detail}`), { cause: error, attempts: error?.attempts || null, status: error?.status || 0 });
    } finally {
      const ms = Date.now() - t0; this.stats.totalMs += ms; this.stats.last = { ms, path: 'router' };
    }
  }
  async json(messages, opts = {}) { return parseJson(await this.chat(messages, { ...opts, json: true })); }
  async models() { return this.routeIds; }
}

// Cria o cliente a partir da configuração do roteador. Devolve null quando não há rota de texto utilizável.
export function createRouterLLM({ config, credentials = {}, adapters = null, timeoutMs = null, quotaUsage = {} } = {}) {
  if (!config) return null;
  const plan = planFreeRoutes('text', config, { quotaUsage });
  if (!plan.ok) return null;
  const routes = routesWithCredential(plan.routes, credentials);
  if (!routes.length) return null;
  return new RouterLLM({ routes, credentials, adapters, timeoutMs });
}
