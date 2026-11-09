// Router de modelos para provedores que oferecem execução local ou cota gratuita.
// Nenhuma chave é recebida, lida ou persistida aqui. Elegibilidade gratuita é confirmada pelo usuário/configuração
// em cada provedor porque quotas, preços e disponibilidade mudam. Paid fallback é sempre recusado.
export const FREE_PROVIDER_CATALOG = Object.freeze([
  { id: 'ollama', name: 'Ollama local', adapter: 'openai-compatible', locality: 'local', requiresKey: false, note: 'Local; modelo/capacidades informados por você.' },
  { id: 'nvidia-nim', name: 'NVIDIA NIM (cota gratuita, se disponível)', adapter: 'openai-compatible', locality: 'cloud', requiresKey: true, note: 'Só usar se o modelo e a cota gratuita estiverem ativos na sua conta.' },
  { id: 'gemini', name: 'Gemini API (free tier, se disponível)', adapter: 'gemini', locality: 'cloud', requiresKey: true, note: 'Só usar se o modelo e a cota gratuita estiverem ativos na sua região/conta.' },
]);

export const ROUTER_TASKS = Object.freeze({
  text: { label: 'Texto/planejamento', requires: ['text'] },
  vision: { label: 'Análise de imagem', requires: ['text', 'vision'] },
  audio_understanding: { label: 'Análise de áudio', requires: ['text', 'audio-input'] },
  image_generation: { label: 'Geração de imagem', requires: ['image-output'] },
  video_generation: { label: 'Geração de vídeo', requires: ['video-output'] },
  speech: { label: 'Fala/voz', requires: ['audio-output'] },
  lip_sync: { label: 'Foto falante/lip-sync', requires: ['image', 'audio-input', 'video-output'] },
});

export const newFreeRouterConfig = () => ({ version: 1, paidFallback: false, providers: [], taskPreferences: {} });
const ref = (p, m) => `${p}/${m}`;
const asSet = (v) => new Set(Array.isArray(v) ? v : []);
const taskLabel = (task) => ROUTER_TASKS[task]?.label || task;

export function planFreeRoute(task, config = newFreeRouterConfig()) {
  const spec = ROUTER_TASKS[task];
  if (!spec) return { ok: false, reason: `Tarefa desconhecida: ${String(task)}` };
  if (config.paidFallback !== false) return { ok: false, reason: 'Fallback pago está proibido nesta reconstrução.' };
  const whitelist = new Map(FREE_PROVIDER_CATALOG.map((p) => [p.id, p]));
  const preferred = config.taskPreferences?.[task] || [];
  const candidates = [];
  for (const provider of config.providers || []) {
    const policy = whitelist.get(provider.id);
    if (!policy || provider.enabled !== true) continue;
    if (policy.locality === 'cloud' && (provider.freeTierConfirmed !== true || provider.quotaAvailable === false)) continue;
    if (policy.locality === 'local' && provider.freeTierConfirmed === false) continue;
    for (const model of provider.models || []) {
      if (!model?.id || model.enabled === false) continue;
      const capabilities = asSet(model.capabilities);
      if (!spec.requires.every((c) => capabilities.has(c))) continue;
      const modelRef = ref(provider.id, model.id); const preference = preferred.indexOf(modelRef);
      candidates.push({ provider, model, policy, modelRef, preference: preference < 0 ? Number.MAX_SAFE_INTEGER : preference });
    }
  }
  candidates.sort((a, b) => a.preference - b.preference || (Number(a.provider.priority) || 0) - (Number(b.provider.priority) || 0) || a.provider.id.localeCompare(b.provider.id) || a.model.id.localeCompare(b.model.id));
  const chosen = candidates[0];
  if (!chosen) return { ok: false, task, taskLabel: taskLabel(task), reason: `Nenhum modelo configurado e confirmado como gratuito suporta ${taskLabel(task)}. Não foi usado fallback pago.` };
  return {
    ok: true,
    task,
    taskLabel: taskLabel(task),
    providerId: chosen.provider.id,
    providerName: chosen.policy.name,
    adapter: chosen.policy.adapter,
    locality: chosen.policy.locality,
    modelId: chosen.model.id,
    baseUrl: chosen.provider.baseUrl || '',
    freeTierConfirmed: chosen.provider.freeTierConfirmed === true,
    quotaAvailable: chosen.provider.quotaAvailable !== false,
    rationale: chosen.preference === Number.MAX_SAFE_INTEGER ? 'Primeiro modelo elegível por prioridade local.' : `Preferência ${chosen.preference + 1} definida para esta tarefa.`,
    secretEnv: chosen.policy.requiresKey ? chosen.provider.secretEnv || null : null,
  };
}

// Elimina material secreto de objetos de configuração antes de retornar/renderizar/logar.
export function publicFreeRouterConfig(config = newFreeRouterConfig()) {
  return {
    version: 1,
    paidFallback: false,
    providers: (config.providers || []).map((p) => ({
      id: p.id,
      enabled: p.enabled === true,
      baseUrl: String(p.baseUrl || ''),
      secretEnv: String(p.secretEnv || ''),
      freeTierConfirmed: p.freeTierConfirmed === true,
      quotaAvailable: p.quotaAvailable !== false,
      priority: Number(p.priority) || 0,
      models: (p.models || []).map((m) => ({ id: String(m.id || ''), capabilities: [...asSet(m.capabilities)], enabled: m.enabled !== false })),
    })),
    taskPreferences: Object.fromEntries(Object.entries(config.taskPreferences || {}).filter(([k]) => k in ROUTER_TASKS).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : []])),
  };
}

export function validateFreeRouterConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['configuração inválida'];
  if (config.paidFallback === true) errors.push('fallback pago é proibido');
  const allowed = new Set(FREE_PROVIDER_CATALOG.map((p) => p.id));
  if (!Array.isArray(config.providers)) errors.push('providers precisa ser uma lista');
  else for (const [i, p] of config.providers.entries()) {
    if (!allowed.has(p.id)) errors.push(`provedor fora da lista gratuita: ${String(p.id)}`);
    if (p.apiKey || p.key || p.token || p.secret) errors.push('não envie nem armazene chaves/tokens; forneça segredo somente no momento de conexão');
    if (p.models != null && !Array.isArray(p.models)) errors.push(`providers[${i}].models precisa ser uma lista`);
    for (const [j, m] of (p.models || []).entries()) {
      if (!String(m.id || '').trim()) errors.push(`providers[${i}].models[${j}].id obrigatório`);
      if (!Array.isArray(m.capabilities) || m.capabilities.some((c) => !['text', 'vision', 'audio-input', 'image', 'image-output', 'video-output', 'audio-output'].includes(c))) errors.push(`providers[${i}].models[${j}].capabilities inválidas`);
    }
  }
  for (const [task, preferred] of Object.entries(config.taskPreferences || {})) if (!(task in ROUTER_TASKS) || !Array.isArray(preferred)) errors.push(`preferência de tarefa inválida: ${task}`);
  return errors;
}

// Adaptador de chat público OpenAI-compatible (Ollama/NVIDIA NIM). Só texto e análise multimodal de entrada.
// Não implementa geração de imagem/vídeo/áudio: esses contratos variam por modelo e precisam de adaptador dedicado.
export function createOpenAICompatibleFreeAdapter(fetchImpl = fetch) {
  return {
    async execute(route, payload, { apiKey } = {}) {
      if (!['text', 'vision', 'audio_understanding'].includes(route.task)) throw new Error(`adaptador OpenAI-compatible não implementa ${route.task}`);
      if (!route.baseUrl || !route.modelId) throw new Error('baseUrl/modelo ausente');
      const response = await fetchImpl(`${route.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ model: route.modelId, messages: payload.messages || [{ role: 'user', content: String(payload.prompt || '') }], ...(payload.options || {}) }),
      });
      if (!response.ok) throw new Error(`provedor ${route.providerId} respondeu HTTP ${response.status}`);
      const data = await response.json(); return { text: data.choices?.[0]?.message?.content ?? null, providerId: route.providerId, modelId: route.modelId };
    },
  };
}

// Adaptador Google Gemini generateContent. Chave recebida apenas como argumento transitório; nunca persistida.
export function createGeminiFreeAdapter(fetchImpl = fetch) {
  return {
    async execute(route, payload, { apiKey } = {}) {
      if (!['text', 'vision', 'audio_understanding'].includes(route.task)) throw new Error(`adaptador Gemini não implementa ${route.task}`);
      if (!apiKey) throw new Error('chave Gemini não fornecida no contexto de execução');
      const url = `${route.baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(route.modelId)}:generateContent`;
      const contents = payload.contents || [{ parts: [{ text: String(payload.prompt || '') }] }];
      const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents, ...(payload.options || {}) }) });
      if (!response.ok) throw new Error(`provedor Gemini respondeu HTTP ${response.status}`);
      const data = await response.json(); return { text: data.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || null, providerId: route.providerId, modelId: route.modelId };
    },
  };
}

// Essa função não recebe configuração persistida com segredo: o adaptador recebe somente credenciais em memória.
export async function executeFreeRoute(route, payload, { adapters, credentials = {} } = {}) {
  if (!route?.ok) throw new Error(route?.reason || 'rota gratuita inválida');
  const policy = FREE_PROVIDER_CATALOG.find((p) => p.id === route.providerId);
  if (!policy || policy.adapter !== route.adapter) throw new Error('provedor/adaptador fora da lista gratuita');
  if (policy.locality === 'cloud' && route.freeTierConfirmed !== true) throw new Error('cota gratuita não confirmada; execução em nuvem bloqueada');
  const adapter = adapters?.[route.adapter]; if (!adapter?.execute) throw new Error(`adaptador indisponível: ${route.adapter}`);
  const apiKey = credentials[route.secretEnv] || undefined;
  return adapter.execute(route, payload, { apiKey });
}
