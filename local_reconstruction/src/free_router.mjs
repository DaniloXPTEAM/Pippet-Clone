// Free-only model router. Provider metadata is safe to persist; credentials are passed transiently at execution time.
// Cloud eligibility is user-confirmed per model/task because free tiers and quotas are account/region dependent.
export const FREE_PROVIDER_CATALOG = Object.freeze([
  { id: 'ollama', name: 'Ollama local', adapter: 'openai-compatible', locality: 'local', secretEnv: null },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', adapter: 'openai-compatible', locality: 'cloud', secretEnv: 'NVIDIA_API_KEY' },
  { id: 'gemini', name: 'Gemini API', adapter: 'gemini', locality: 'cloud', secretEnv: 'GEMINI_API_KEY' },
]);
const CAPS = Object.freeze(['text', 'vision', 'audio-input', 'image-output', 'audio-output', 'video-output']);
export const ROUTER_TASKS = Object.freeze({
  text: { label: 'Texto/planejamento', requires: ['text'] },
  vision: { label: 'Multimodal/imagem de entrada', requires: ['text', 'vision'] },
  audio_understanding: { label: 'Multimodal/áudio de entrada', requires: ['text', 'audio-input'] },
  image_generation: { label: 'Geração de imagem', requires: ['image-output'] },
  audio_generation: { label: 'Geração de áudio', requires: ['audio-output'] },
  video_generation: { label: 'Geração de vídeo', requires: ['video-output'] },
});
export const newFreeRouterConfig = () => ({ version: 1, paidFallback: false, providers: [], taskPreferences: {} });
const asSet = (v) => new Set(Array.isArray(v) ? v : []);
const routeCandidates = (task, config = newFreeRouterConfig(), { quotaUsage = {} } = {}) => {
  const spec = ROUTER_TASKS[task];
  if (!spec) return { error: { ok: false, reason: `Tarefa desconhecida: ${String(task)}` }, candidates: [] };
  if (config.paidFallback !== false) return { error: { ok: false, reason: 'Fallback pago está proibido nesta reconstrução.' }, candidates: [] };
  const whitelist = new Map(FREE_PROVIDER_CATALOG.map((p) => [p.id, p]));
  const preferred = config.taskPreferences?.[task] || [];
  const candidates = [];
  for (const provider of config.providers || []) {
    const policy = whitelist.get(provider.id);
    if (!policy || provider.enabled !== true) continue;
    if (policy.locality === 'cloud' && (provider.freeTierConfirmed !== true || !(Number(provider.dailyLimit) > 0))) continue;
    if (provider.quotaAvailable === false || (quotaUsage[provider.id]?.blocked === true)) continue;
    const limit = Number(provider.dailyLimit) || 0;
    if (limit > 0 && (Number(quotaUsage[provider.id]?.count) || 0) >= limit) continue;
    for (const model of provider.models || []) {
      if (!model?.id || model.enabled === false) continue;
      if (policy.locality === 'cloud' && model.freeTierConfirmed !== true) continue;
      if (!spec.requires.every((capability) => asSet(model.capabilities).has(capability))) continue;
      const modelRef = `${provider.id}/${model.id}`;
      const preference = preferred.indexOf(modelRef);
      candidates.push({ provider, model, policy, modelRef, preference: preference < 0 ? Number.MAX_SAFE_INTEGER : preference });
    }
  }
  candidates.sort((a, b) => a.preference - b.preference || (Number(a.provider.priority) || 0) - (Number(b.provider.priority) || 0) || a.provider.id.localeCompare(b.provider.id) || a.model.id.localeCompare(b.model.id));
  return { candidates, error: null };
};
const publicRoute = (task, chosen) => ({
  ok: true, task, taskLabel: ROUTER_TASKS[task].label,
  providerId: chosen.provider.id, providerName: chosen.policy.name, adapter: chosen.policy.adapter,
  locality: chosen.policy.locality, modelId: chosen.model.id, baseUrl: chosen.provider.baseUrl || '',
  freeTierConfirmed: chosen.policy.locality === 'local' || (chosen.provider.freeTierConfirmed === true && chosen.model.freeTierConfirmed === true),
  quotaAvailable: chosen.provider.quotaAvailable !== false,
  dailyLimit: Math.max(0, Number(chosen.provider.dailyLimit) || 0),
  taskEndpoints: chosen.provider.taskEndpoints || {},
  rationale: chosen.preference === Number.MAX_SAFE_INTEGER ? 'Primeiro modelo elegível por prioridade local.' : `Preferência ${chosen.preference + 1} definida para esta tarefa.`,
  secretEnv: chosen.policy.secretEnv,
});
export function planFreeRoutes(task, config = newFreeRouterConfig(), options = {}) {
  const { candidates, error } = routeCandidates(task, config, options);
  if (error) return { ok: false, routes: [], reason: error.reason };
  return { ok: candidates.length > 0, routes: candidates.map((candidate) => publicRoute(task, candidate)), reason: candidates.length ? null : `Nenhum modelo configurado e confirmado como gratuito suporta ${ROUTER_TASKS[task]?.label || task}. Não foi usado fallback pago.` };
}
export function planFreeRoute(task, config = newFreeRouterConfig(), options = {}) {
  const result = planFreeRoutes(task, config, options);
  return result.routes[0] || { ok: false, task, taskLabel: ROUTER_TASKS[task]?.label || task, reason: result.reason };
}

// Credentials are always stripped from persisted/public configuration. The optional `apiKey` properties are rejected.
export function publicFreeRouterConfig(config = newFreeRouterConfig()) {
  return {
    version: 1, paidFallback: false,
    providers: (config.providers || []).map((p) => ({
      id: p.id, enabled: p.enabled === true, baseUrl: String(p.baseUrl || ''),
      freeTierConfirmed: p.freeTierConfirmed === true, quotaAvailable: p.quotaAvailable !== false,
      dailyLimit: Math.max(0, Number(p.dailyLimit) || 0), priority: Number(p.priority) || 0,
      models: (p.models || []).map((m) => ({ id: String(m.id || ''), capabilities: [...asSet(m.capabilities)], enabled: m.enabled !== false, freeTierConfirmed: m.freeTierConfirmed === true })),
      taskEndpoints: p.taskEndpoints && typeof p.taskEndpoints === 'object' ? structuredClone(p.taskEndpoints) : {},
    })),
    taskPreferences: Object.fromEntries(Object.entries(config.taskPreferences || {}).filter(([k]) => k in ROUTER_TASKS).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : []])),
  };
}
export function validateFreeRouterConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['configuração inválida'];
  if (config.paidFallback !== false) errors.push('fallback pago é proibido');
  const allowed = new Set(FREE_PROVIDER_CATALOG.map((p) => p.id));
  if (!Array.isArray(config.providers)) errors.push('providers precisa ser uma lista');
  else for (const [i, p] of config.providers.entries()) {
    if (!allowed.has(p.id)) errors.push(`provedor fora da lista gratuita: ${String(p.id)}`);
    if (p.apiKey || p.key || p.token || p.secret) errors.push('não envie nem armazene chaves/tokens; forneça segredo somente no momento de conexão');
    if (p.baseUrl && !/^https?:\/\/[^\s]+$/i.test(String(p.baseUrl))) errors.push(`providers[${i}].baseUrl inválida`);
    if (p.models != null && !Array.isArray(p.models)) errors.push(`providers[${i}].models precisa ser uma lista`);
    for (const [j, model] of (p.models || []).entries()) {
      if (!String(model.id || '').trim()) errors.push(`providers[${i}].models[${j}].id obrigatório`);
      if (!Array.isArray(model.capabilities) || model.capabilities.some((c) => !CAPS.includes(c))) errors.push(`providers[${i}].models[${j}].capabilities inválidas`);
    }
    if (p.dailyLimit != null && (!Number.isInteger(Number(p.dailyLimit)) || Number(p.dailyLimit) < 0 || Number(p.dailyLimit) > 100000)) errors.push(`providers[${i}].dailyLimit inválido`);
    if (p.id !== 'ollama' && p.enabled === true && !(Number(p.dailyLimit) > 0)) errors.push(`providers[${i}].dailyLimit precisa ser maior que zero para limitar chamadas cloud gratuitas`);
    for (const [task, endpoint] of Object.entries(p.taskEndpoints || {})) if (!(task in ROUTER_TASKS) || typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//')) errors.push(`providers[${i}].taskEndpoints.${task} precisa ser um caminho relativo iniciado por /`);
  }
  for (const [task, preferred] of Object.entries(config.taskPreferences || {})) if (!(task in ROUTER_TASKS) || !Array.isArray(preferred)) errors.push(`preferência de tarefa inválida: ${task}`);
  return errors;
}
const responseError = async (response, providerId) => {
  if (response.ok) return null;
  const body = await response.text().catch(() => '');
  const error = new Error(`provedor ${providerId} respondeu HTTP ${response.status}`);
  error.status = response.status; error.quotaExceeded = response.status === 429 || /quota|rate.?limit|resource.?exhausted/i.test(body);
  throw error;
};
const b64 = (data) => data ? Buffer.from(data, 'base64') : null;
const openAIAdapter = (fetchImpl = fetch) => ({
  async execute(route, payload, { apiKey, signal } = {}) {
    if (!route.baseUrl || !route.modelId) throw new Error('baseUrl/modelo ausente');
    const root = route.baseUrl.replace(/\/+$/, '');
    const headers = { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) };
    let response;
    if (['text', 'vision', 'audio_understanding'].includes(route.task)) {
      response = await fetchImpl(`${root}/chat/completions`, { method: 'POST', headers, signal, body: JSON.stringify({ model: route.modelId, messages: payload.messages || [{ role: 'user', content: String(payload.prompt || '') }], ...(payload.options || {}) }) });
      await responseError(response, route.providerId);
      const data = await response.json(); const choice = data.choices?.[0]?.message;
      return { text: typeof choice?.content === 'string' ? choice.content : choice?.content || null, providerId: route.providerId, modelId: route.modelId };
    }
    if (route.task === 'image_generation') {
      response = await fetchImpl(`${root}/images/generations`, { method: 'POST', headers, signal, body: JSON.stringify({ model: route.modelId, prompt: String(payload.prompt || ''), n: 1, ...(payload.options || {}) }) });
      await responseError(response, route.providerId); const data = await response.json(); const item = data.data?.[0];
      return { image: item?.b64_json ? b64(item.b64_json) : null, url: item?.url || null, providerId: route.providerId, modelId: route.modelId };
    }
    if (route.task === 'audio_generation') {
      response = await fetchImpl(`${root}/audio/speech`, { method: 'POST', headers, signal, body: JSON.stringify({ model: route.modelId, input: String(payload.prompt || payload.text || ''), voice: payload.voice || 'alloy', response_format: payload.response_format || 'mp3', ...(payload.options || {}) }) });
      await responseError(response, route.providerId); return { audio: Buffer.from(await response.arrayBuffer()), providerId: route.providerId, modelId: route.modelId };
    }
    if (route.task === 'video_generation' && route.taskEndpoints?.video_generation) {
      response = await fetchImpl(`${root}${route.taskEndpoints.video_generation}`, { method: 'POST', headers, signal, body: JSON.stringify({ model: route.modelId, prompt: String(payload.prompt || ''), ...(payload.options || {}) }) });
      await responseError(response, route.providerId); return { operation: await response.json(), providerId: route.providerId, modelId: route.modelId };
    }
    throw new Error(`adaptador OpenAI-compatible não implementa ${route.task} para este endpoint`);
  },
});
const geminiAdapter = (fetchImpl = fetch) => ({
  async execute(route, payload, { apiKey, signal } = {}) {
    if (!apiKey) throw new Error('chave Gemini não configurada; execução bloqueada');
    if (!route.baseUrl || !route.modelId) throw new Error('baseUrl/modelo ausente');
    const base = route.baseUrl.replace(/\/+$/, ''); const modelPath = `models/${encodeURIComponent(route.modelId)}`;
    const headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };
    if (['text', 'vision', 'audio_understanding', 'image_generation', 'audio_generation'].includes(route.task)) {
      const contents = payload.contents || [{ parts: [{ text: String(payload.prompt || payload.text || '') }] }];
      const response = await fetchImpl(`${base}/${modelPath}:generateContent`, { method: 'POST', headers, signal, body: JSON.stringify({ contents, ...(payload.options || {}) }) });
      await responseError(response, route.providerId); const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((part) => part.text || '').filter(Boolean).join('') || null;
      const blobs = parts.filter((part) => part.inlineData?.data).map((part) => ({ mimeType: part.inlineData.mimeType || 'application/octet-stream', data: b64(part.inlineData.data) }));
      if (route.task === 'image_generation') return { images: blobs, text, providerId: route.providerId, modelId: route.modelId };
      if (route.task === 'audio_generation') return { audio: blobs[0]?.data || null, mimeType: blobs[0]?.mimeType || null, text, providerId: route.providerId, modelId: route.modelId };
      return { text, providerId: route.providerId, modelId: route.modelId };
    }
    if (route.task === 'video_generation') {
      const response = await fetchImpl(`${base}/${modelPath}:predictLongRunning`, { method: 'POST', headers, signal, body: JSON.stringify({ instances: [{ prompt: String(payload.prompt || '') }], ...(payload.options || {}) }) });
      await responseError(response, route.providerId); return { operation: await response.json(), providerId: route.providerId, modelId: route.modelId };
    }
    throw new Error(`adaptador Gemini não implementa ${route.task}`);
  },
});
export function createFreeRouterAdapters(fetchImpl = fetch) { return { 'openai-compatible': openAIAdapter(fetchImpl), gemini: geminiAdapter(fetchImpl) }; }
export const createOpenAICompatibleFreeAdapter = (fetchImpl = fetch) => openAIAdapter(fetchImpl);
export const createGeminiFreeAdapter = (fetchImpl = fetch) => geminiAdapter(fetchImpl);

// Run candidates in order; a failed free provider may fall back only to another eligible free provider.
export async function executeFreeRoutes(routes, payload, { adapters = createFreeRouterAdapters(), credentials = {}, onAttempt = () => {}, onQuota = () => {}, signal } = {}) {
  const eligible = (routes || []).filter((r) => r?.ok && FREE_PROVIDER_CATALOG.some((p) => p.id === r.providerId && p.adapter === r.adapter));
  if (!eligible.length) throw new Error(routes?.reason || 'nenhuma rota gratuita elegível');
  const failures = []; let quotaHit = false;
  for (const route of eligible) {
    const policy = FREE_PROVIDER_CATALOG.find((p) => p.id === route.providerId);
    if (policy.locality === 'cloud' && route.freeTierConfirmed !== true) throw new Error('cota gratuita não confirmada; execução em nuvem bloqueada');
    const apiKey = policy.secretEnv ? credentials[route.secretEnv] : undefined;
    if (policy.secretEnv && !apiKey) { failures.push(`${route.providerName}: chave não configurada`); continue; }
    if (signal?.aborted) throw signal.reason || new Error('tarefa cancelada');
    onAttempt(route);
    try { const result = await adapters[route.adapter].execute(route, payload, { apiKey, signal }); return { ...result, route }; }
    catch (error) { if (signal?.aborted) throw signal.reason || error; if (error.quotaExceeded || error.status === 429) { quotaHit = true; onQuota(route); } failures.push(`${route.providerName}: ${String(error.message || error).slice(0, 260)}`); }
  }
  const failed = new Error(`Nenhum provedor gratuito concluiu a tarefa. ${failures.join(' | ') || 'Sem rota configurada.'} Fallback pago não foi usado.`); if (quotaHit) { failed.status = 429; failed.quotaExceeded = true; } throw failed;
}
export async function executeFreeRoute(route, payload, options = {}) { if (!route?.ok) throw new Error(route?.reason || 'nenhuma rota gratuita elegível'); return executeFreeRoutes([route], payload, options); }
