// Free-only model router. Provider metadata is safe to persist; credentials are passed transiently at execution time.
// Cloud eligibility is user-confirmed per model/task because free tiers and quotas are account/region dependent.
export const FREE_PROVIDER_CATALOG = Object.freeze([
  { id: 'ollama', name: 'Ollama', adapter: 'openai-compatible', adapters: ['openai-compatible', 'ollama'], locality: 'local', secretEnv: null, optionalSecretEnv: 'OLLAMA_API_KEY', timeoutMs: 120_000 },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', adapter: 'openai-compatible', adapters: ['openai-compatible'], locality: 'cloud', secretEnv: 'NVIDIA_API_KEY', timeoutMs: 60_000 },
  { id: 'gemini', name: 'Gemini API', adapter: 'gemini', adapters: ['gemini', 'openai-compatible'], locality: 'cloud', secretEnv: 'GEMINI_API_KEY', timeoutMs: 60_000 },
  // Omni Router: roteador do próprio usuário, em 127.0.0.1. Nunca "localhost" (trava por IPv6).
  { id: 'omni-router', name: 'Omni Router (local)', adapter: 'openai-compatible', adapters: ['openai-compatible'], locality: 'local', secretEnv: 'OMNIROUTER_API_KEY', timeoutMs: 180_000 },
  // FreeLLMAPI: serviço do próprio usuário em 127.0.0.1:3001 — texto principal (modelo "auto").
  { id: 'freellmapi', name: 'FreeLLMAPI (local)', adapter: 'openai-compatible', adapters: ['openai-compatible'], locality: 'local', secretEnv: 'FREELLMAPI_API_KEY', timeoutMs: 120_000 },
  // Cloudflare Workers AI: token + conta vêm só do ambiente. `accountEnv` é a conta (nunca gravada em config/log).
  { id: 'cloudflare', name: 'Cloudflare Workers AI', adapter: 'cloudflare-workers-ai', adapters: ['cloudflare-workers-ai'], locality: 'cloud', secretEnv: 'CLOUDFLARE_API_TOKEN', accountEnv: 'CLOUDFLARE_ACCOUNT_ID', timeoutMs: 60_000 },
  // NovAI (aiapi-pro.com): vídeo assíncrono (submit + poll a cada 12 s), imagem e texto de reserva. Bearer só do ambiente.
  { id: 'novai', name: 'NovAI (aiapi-pro)', adapter: 'novai', adapters: ['novai'], locality: 'cloud', secretEnv: 'NOVAI_API_KEY', timeoutMs: 240_000 },
]);
// Bases, modelos candidatos e modos de autenticação observados nas APIs reais. Tudo sobrescrevível por variável de ambiente
// e por configuração do provedor: nada aqui é chave, e o valor padrão nunca é o único caminho.
export const FREE_PROVIDER_DEFAULTS = Object.freeze({
  'nvidia-nim': Object.freeze({
    baseUrl: 'https://integrate.api.nvidia.com/v1', route: '/chat/completions',
    models: Object.freeze(['google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash']),
    timeoutMs: 60_000, env: Object.freeze({ base: 'NVIDIA_BASE_URL', model: 'NVIDIA_MODEL', key: 'NVIDIA_API_KEY' }),
  }),
  gemini: Object.freeze({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta', route: '/models/{model}:generateContent',
    models: Object.freeze(['gemini-2.5-flash']), timeoutMs: 60_000, authMode: 'x-goog-api-key',
    env: Object.freeze({ base: 'GEMINI_BASE_URL', model: 'GEMINI_MODEL', key: 'GEMINI_API_KEY', authMode: 'GEMINI_AUTH_MODE' }),
  }),
  'omni-router': Object.freeze({
    baseUrl: 'http://127.0.0.1:20128/v1', route: '/chat/completions', imageRoute: '/images/generations', localOnly: true,
    models: Object.freeze(['auto/best-free']), imageModels: Object.freeze(['nvidia/black-forest-labs/flux.2-klein-4b']),
    timeoutMs: 180_000, imageTimeoutMs: 180_000,
    env: Object.freeze({ base: 'OMNIROUTER_BASE_URL', model: 'OMNIROUTER_MODEL', key: 'OMNIROUTER_API_KEY', imageModel: 'OMNIROUTER_IMAGE_MODEL' }),
  }),
  // FreeLLMAPI (serviço do usuário): 127.0.0.1 e não "localhost" — a resolução para ::1 trava a chamada.
  freellmapi: Object.freeze({
    baseUrl: 'http://127.0.0.1:3001/v1', route: '/chat/completions', localOnly: true,
    models: Object.freeze(['auto']), timeoutMs: 120_000,
    env: Object.freeze({ base: 'FREELLMAPI_BASE_URL', model: 'FREELLMAPI_MODEL', key: 'FREELLMAPI_API_KEY' }),
  }),
  // NovAI (aiapi-pro). Vídeo: POST /video/generations (cogvideox-flash, duration 5) -> {id, status:'queued'};
  // consulta GET /video/generations/{id}?model=cogvideox-flash a cada 12 s até SUCCESS/COMPLETED (medido: 72 s, H.264,
  // 1792x1024, 1,5 MB). O MP4 vem em video_result[0].url ou video_url e só é baixado de https em aiapi-pro.com/ufileos.com.
  novai: Object.freeze({
    baseUrl: 'https://aiapi-pro.com/v1',
    textRoute: '/chat/completions', imageRoute: '/images/generations', videoRoute: '/video/generations',
    models: Object.freeze(['glm-4.7-flash']), imageModels: Object.freeze(['cogview-3-flash']), videoModels: Object.freeze(['cogvideox-flash']),
    videoDuration: 5, pollMs: 12_000, timeoutMs: 240_000, imageTimeoutMs: 120_000,
    measuredMs: Object.freeze({ image_generation: 12_000, video_generation: 72_000 }),
    assetHosts: Object.freeze(['aiapi-pro.com', 'ufileos.com']),
    env: Object.freeze({
      base: 'NOVAI_BASE_URL', key: 'NOVAI_API_KEY', model: 'NOVAI_MODEL', imageModel: 'NOVAI_IMAGE_MODEL',
      videoModel: 'NOVAI_VIDEO_MODEL', pollMs: 'NOVAI_POLL_MS', dailyLimit: 'NOVAI_DAILY_LIMIT',
    }),
  }),
  // Cloudflare Workers AI. A conta entra por {account} na base; sessão exposta nunca contém o id nem o token.
  // Medições do usuário: imagem ~2,5 s (flux-1-schnell, steps 4) e voz ~1 s (melotts).
  cloudflare: Object.freeze({
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account}/ai/run',
    imageModels: Object.freeze(['@cf/black-forest-labs/flux-1-schnell']), audioModels: Object.freeze(['@cf/myshell-ai/melotts']),
    // Transcrição: @cf/openai/whisper recebe os BYTES do áudio e devolve result.text (+ result.words quando houver).
    transcriptionModels: Object.freeze(['@cf/openai/whisper']),
    models: Object.freeze([]), imageSteps: 4, measuredMs: Object.freeze({ image_generation: 2_500, audio_generation: 1_000 }),
    // A duração máxima aceita por requisição de transcrição NÃO foi medida: 25 s por trecho é escolha local.
    transcriptionMaxChunkMs: 25_000, timeoutMs: 60_000,
    env: Object.freeze({ base: 'CLOUDFLARE_AI_BASE_URL', key: 'CLOUDFLARE_API_TOKEN', account: 'CLOUDFLARE_ACCOUNT_ID', imageModel: 'CLOUDFLARE_IMAGE_MODEL', audioModel: 'CLOUDFLARE_AUDIO_MODEL', transcriptionModel: 'CLOUDFLARE_TRANSCRIPTION_MODEL', dailyLimit: 'CLOUDFLARE_DAILY_LIMIT' }),
  }),
  ollama: Object.freeze({
    baseUrl: 'http://127.0.0.1:11434', cloudBaseUrl: 'https://ollama.com', route: '/api/chat',
    models: Object.freeze(['llama3.2:1b']), timeoutMs: 120_000,
    env: Object.freeze({ base: 'OLLAMA_BASE_URL', model: 'OLLAMA_MODEL', key: 'OLLAMA_API_KEY' }),
  }),
});
export const OLLAMA_CLOUD_BASE = 'https://ollama.com';
// Omni Router (serviço local do usuário). 127.0.0.1 e não "localhost": a resolução para ::1 trava a chamada.
export const OMNI_ROUTER_BASE = 'http://127.0.0.1:20128/v1';
export const OMNI_ROUTER_TEXT_MODEL = 'auto/best-free';
export const OMNI_ROUTER_IMAGE_MODEL = 'nvidia/black-forest-labs/flux.2-klein-4b';
// FreeLLMAPI: texto principal da instalação (modelo "auto" resolve o melhor modelo gratuito do serviço).
export const FREELLMAPI_BASE = 'http://127.0.0.1:3001/v1';
export const FREELLMAPI_MODEL = 'auto';
// Cloudflare Workers AI: imagem flux-1-schnell (steps 4) e voz melotts (WAV). O {account} é substituído em execução.
export const CLOUDFLARE_AI_BASE = 'https://api.cloudflare.com/client/v4/accounts/{account}/ai/run';
export const CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
export const CLOUDFLARE_AUDIO_MODEL = '@cf/myshell-ai/melotts';
export const CLOUDFLARE_TRANSCRIPTION_MODEL = '@cf/openai/whisper';
export const CLOUDFLARE_IMAGE_STEPS = 4;
// NovAI (aiapi-pro.com): vídeo cogvideox-flash (5 s), imagem cogview-3-flash e texto glm-4.7-flash.
export const NOVAI_BASE = 'https://aiapi-pro.com/v1';
export const NOVAI_VIDEO_MODEL = 'cogvideox-flash';
export const NOVAI_IMAGE_MODEL = 'cogview-3-flash';
export const NOVAI_TEXT_MODEL = 'glm-4.7-flash';
export const NOVAI_VIDEO_DURATION = 5;
export const NOVAI_POLL_MS = 12_000;
// O MP4 só é baixado de https e destes hosts (aiapi-pro.com ou qualquer *.ufileos.com).
export const NOVAI_ASSET_HOSTS = Object.freeze(['aiapi-pro.com', 'ufileos.com']);
export const NOVAI_VIDEO_DAILY_LIMIT = 5;
// Modelos já testados e marcados INDISPONÍVEL pelo usuário. Ficam fora da rotação, mas não derrubam o roteador:
// o próximo modelo/provedor assume, e o motivo aparece no relatório.
export const OMNI_ROUTER_UNAVAILABLE = Object.freeze([
  Object.freeze({ modelId: 'nvidia/flux.1-schnell', task: 'image_generation', kind: 'timeout', reason: 'INDISPONÍVEL: timeout' }),
  Object.freeze({ modelId: 'huggingface/FLUX.1-schnell', task: 'image_generation', kind: 'auth', reason: 'INDISPONÍVEL: HTTP 403' }),
  Object.freeze({ modelId: 'gemini/imagen-4.0', task: 'image_generation', kind: 'error', reason: 'INDISPONÍVEL: erro do provedor' }),
  Object.freeze({ modelId: 'huggingface/Kokoro-82M', task: 'audio_generation', kind: 'error', reason: 'INDISPONÍVEL: HTTP 500' }),
  Object.freeze({ modelId: 'veo-free/veo', task: 'video_generation', kind: 'timeout', reason: 'INDISPONÍVEL: timeout de 150 s' }),
]);
export const omniRouterUnavailable = (modelId, task = null) => OMNI_ROUTER_UNAVAILABLE.find((x) => x.modelId === String(modelId) && (!task || x.task === task)) || null;
// "localhost" nunca é aceito nas bases locais: normaliza para 127.0.0.1.
export const normalizeLocalBase = (url) => {
  const raw = String(url || '').trim(); if (!raw) return raw;
  if (!/^https?:\/\//i.test(raw)) throw Object.assign(new Error(`base inválida (use http://127.0.0.1:porta): ${raw}`), { status: 0 });
  return raw.replace(/\/\/localhost(?=[/:]|$)/i, '//127.0.0.1');
};
// Toda credencial de um provedor: o segredo (Bearer) e, quando existe, a conta (Cloudflare).
// Nada disso é impresso: o servidor só publica booleanos (hasKey/hasAccount).
export const credentialEnvNames = (policy = {}) => [policy.secretEnv, policy.optionalSecretEnv, policy.accountEnv].filter(Boolean);
// Entrada do FreeLLMAPI: 127.0.0.1:3001, modelo "auto", texto.
export const freeLLMAPIProviderEntry = (env = {}) => ({
  id: 'freellmapi', enabled: true,
  baseUrl: normalizeLocalBase(env.FREELLMAPI_BASE_URL || FREELLMAPI_BASE),
  priority: 0, quotaAvailable: true, dailyLimit: 0,
  timeoutMs: Math.max(60_000, Number(env.FREELLMAPI_TIMEOUT_MS) || FREE_PROVIDER_DEFAULTS.freellmapi.timeoutMs),
  models: [{ id: String(env.FREELLMAPI_MODEL || FREELLMAPI_MODEL), capabilities: ['text'], enabled: true }],
});
// Entrada da Cloudflare Workers AI: imagem flux-1-schnell e voz melotts. `{account}` fica na base até a execução.
export const cloudflareProviderEntry = (env = {}) => ({
  id: 'cloudflare', enabled: true, freeTierConfirmed: true, quotaAvailable: true,
  baseUrl: String(env.CLOUDFLARE_AI_BASE_URL || CLOUDFLARE_AI_BASE).replace(/\/+$/, ''),
  priority: 1, dailyLimit: Math.max(1, Number(env.CLOUDFLARE_DAILY_LIMIT) || 50),
  timeoutMs: Math.max(15_000, Number(env.CLOUDFLARE_TIMEOUT_MS) || FREE_PROVIDER_DEFAULTS.cloudflare.timeoutMs),
  models: [
    { id: String(env.CLOUDFLARE_IMAGE_MODEL || CLOUDFLARE_IMAGE_MODEL), capabilities: ['image-output'], enabled: true, freeTierConfirmed: true },
    { id: String(env.CLOUDFLARE_AUDIO_MODEL || CLOUDFLARE_AUDIO_MODEL), capabilities: ['audio-output'], enabled: true, freeTierConfirmed: true },
    { id: String(env.CLOUDFLARE_TRANSCRIPTION_MODEL || CLOUDFLARE_TRANSCRIPTION_MODEL), capabilities: ['transcription'], enabled: true, freeTierConfirmed: true },
  ],
});
// Entrada da NovAI: vídeo (cogvideox-flash, 5 s), imagem (cogview-3-flash) e texto (glm-4.7-flash), com cap local de 5 vídeos/dia.
export const novaiProviderEntry = (env = {}) => ({
  id: 'novai', enabled: true, freeTierConfirmed: true, quotaAvailable: true,
  baseUrl: String(env.NOVAI_BASE_URL || NOVAI_BASE).replace(/\/+$/, ''),
  priority: 3, dailyLimit: Math.max(1, Number(env.NOVAI_DAILY_LIMIT) || NOVAI_VIDEO_DAILY_LIMIT),
  // Timeout >= 180 s: o vídeo medido levou 72 s e a consulta é a cada 12 s.
  timeoutMs: Math.max(180_000, Number(env.NOVAI_TIMEOUT_MS) || FREE_PROVIDER_DEFAULTS.novai.timeoutMs),
  models: [
    { id: String(env.NOVAI_VIDEO_MODEL || NOVAI_VIDEO_MODEL), capabilities: ['video-output'], enabled: true, freeTierConfirmed: true },
    { id: String(env.NOVAI_IMAGE_MODEL || NOVAI_IMAGE_MODEL), capabilities: ['image-output'], enabled: true, freeTierConfirmed: true },
    { id: String(env.NOVAI_MODEL || NOVAI_TEXT_MODEL), capabilities: ['text'], enabled: true, freeTierConfirmed: true },
  ],
});
// NVIDIA como reserva de texto: dois modelos gratuitos observados (titular + reserva).
export const nvidiaProviderEntry = (env = {}) => ({
  id: 'nvidia-nim', enabled: true, freeTierConfirmed: true, quotaAvailable: true,
  baseUrl: String(env.NVIDIA_BASE_URL || FREE_PROVIDER_DEFAULTS['nvidia-nim'].baseUrl).replace(/\/+$/, ''),
  priority: 2, dailyLimit: Math.max(1, Number(env.NVIDIA_DAILY_LIMIT) || 50),
  timeoutMs: Math.max(15_000, Number(env.NVIDIA_TIMEOUT_MS) || 60_000),
  models: ['google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash'].map((id) => ({ id, capabilities: ['text'], enabled: true, freeTierConfirmed: true })),
});
// Ordem pedida: texto FreeLLMAPI -> Omni -> NVIDIA; imagem Cloudflare flux-1-schnell -> Omni flux.2-klein.
// Voz: SAPI é o padrão e não passa pelo roteador; a Cloudflare (melotts) só entra com voiceSource:"cloud". Vídeo segue PENDING.
export const DEFAULT_TASK_PREFERENCES = Object.freeze({
  text: Object.freeze([`freellmapi/${FREELLMAPI_MODEL}`, `omni-router/${OMNI_ROUTER_TEXT_MODEL}`, 'nvidia-nim/google/gemma-4-31b-it', 'nvidia-nim/minimaxai/minimax-m3.1-flash', `novai/${NOVAI_TEXT_MODEL}`]),
  image_generation: Object.freeze([`cloudflare/${CLOUDFLARE_IMAGE_MODEL}`, `omni-router/${OMNI_ROUTER_IMAGE_MODEL}`, `novai/${NOVAI_IMAGE_MODEL}`]),
  audio_generation: Object.freeze([`cloudflare/${CLOUDFLARE_AUDIO_MODEL}`]),
  // Vídeo: NovAI é o único provedor gratuito confirmado (cogvideox-flash, 5 s, fila assíncrona).
  video_generation: Object.freeze([`novai/${NOVAI_VIDEO_MODEL}`]),
  // Transcrição: só a Cloudflare Workers AI (@cf/openai/whisper) está confirmada como gratuita.
  transcription: Object.freeze([`cloudflare/${CLOUDFLARE_TRANSCRIPTION_MODEL}`]),
});
// Semeia a pilha sem pedir JSON: mantém provedores que o usuário já tenha e sobrescreve os quatro da pilha.
export const stackProviderEntries = (env = {}, existing = []) => {
  const seed = [freeLLMAPIProviderEntry(env), nvidiaProviderEntry(env), omniRouterProviderEntry(env), cloudflareProviderEntry(env), novaiProviderEntry(env)];
  const kept = (existing || []).filter((p) => !seed.some((s) => s.id === p.id));
  return [...seed, ...kept];
};
// Entrada pronta para colar/semear na configuração do roteador: só o Omni, com texto e imagem.
export const omniRouterProviderEntry = (env = {}) => ({
  id: 'omni-router', enabled: true,
  baseUrl: normalizeLocalBase(env.OMNIROUTER_BASE_URL || OMNI_ROUTER_BASE),
  priority: 0, quotaAvailable: true, dailyLimit: 0,
  timeoutMs: Math.max(120_000, Number(env.OMNIROUTER_TIMEOUT_MS) || FREE_PROVIDER_DEFAULTS['omni-router'].timeoutMs),
  models: [
    { id: String(env.OMNIROUTER_MODEL || OMNI_ROUTER_TEXT_MODEL), capabilities: ['text'], enabled: true },
    { id: String(env.OMNIROUTER_IMAGE_MODEL || OMNI_ROUTER_IMAGE_MODEL), capabilities: ['image-output'], enabled: true },
  ],
});
// O Omni devolve JPEG em b64_json mesmo quando o pedido não informa formato: o mime vem dos bytes, não do palpite.
export const sniffImageMime = (buffer) => {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
};
// O mime do áudio também vem dos bytes: a melotts devolve WAV (RIFF/WAVE), não MP3.
export const sniffAudioMime = (buffer) => {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE') return 'audio/wav';
  if (b.length >= 3 && b.subarray(0, 3).toString('latin1') === 'ID3') return 'audio/mpeg';
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  if (b.length >= 4 && b.subarray(0, 4).toString('latin1') === 'OggS') return 'audio/ogg';
  if (b.length >= 4 && b.subarray(0, 4).toString('latin1') === 'fLaC') return 'audio/flac';
  return null;
};
export const isLoopbackUrl = (url) => /^https?:\/\/(127\.0\.0\.1|\[::1\])(?=[/:]|$)/i.test(String(url || ''));
// Com o endpoint nativo do Ollama Cloud, a base é https://ollama.com e a rota /api/chat (ou /v1/chat/completions).
export const GEMINI_AUTH_MODES = Object.freeze(['x-goog-api-key', 'query', 'bearer']);
// A chave do AI Studio emitida desde 28/05/2026 começa com "AQ." e é uma chave de autorização: o prefixo não é erro.
export const isValidGeminiKeyShape = (key) => typeof key === 'string' && key.trim().length >= 8;
export const defaultModelCandidates = (providerId, env = {}, task = 'text') => {
  const spec = FREE_PROVIDER_DEFAULTS[providerId]; if (!spec) return [];
  const pool = task === 'image_generation' && spec.imageModels ? spec.imageModels
    : task === 'video_generation' && spec.videoModels ? spec.videoModels
    : task === 'audio_generation' && spec.audioModels ? spec.audioModels : (spec.models || []);
  const envName = task === 'image_generation' && spec.env.imageModel ? spec.env.imageModel
    : task === 'video_generation' && spec.env.videoModel ? spec.env.videoModel
    : task === 'audio_generation' && spec.env.audioModel ? spec.env.audioModel : spec.env.model;
  const chosen = String(env[envName] || '').trim();
  return chosen ? [chosen, ...pool.filter((m) => m !== chosen)] : [...pool];
};
// Cache de disponibilidade: uma falha de autenticação/cota/timeout tira o provedor (ou o modelo) de rotação por um tempo.
const AVAILABILITY = new Map();
export const AVAILABILITY_COOLDOWN_MS = Object.freeze({ auth: 10 * 60_000, quota: 60 * 60_000, timeout: 60_000, model_unavailable: 24 * 60 * 60_000, other: 60_000 });
export const availabilityKey = (providerId, modelId = null) => (modelId ? `${providerId}/${modelId}` : String(providerId));
export function markUnavailable(providerId, { modelId = null, kind = 'other', reason = '', now = Date.now(), cooldownMs } = {}) {
  const key = availabilityKey(providerId, modelId); const ttl = Number(cooldownMs) || AVAILABILITY_COOLDOWN_MS[kind] || AVAILABILITY_COOLDOWN_MS.other;
  const entry = { providerId, modelId, kind, reason: String(reason || '').slice(0, 200), until: now + ttl };
  AVAILABILITY.set(key, entry); return entry;
}
export function availabilityOf(providerId, modelId = null, now = Date.now()) {
  const entry = AVAILABILITY.get(availabilityKey(providerId, modelId)); if (!entry) return null;
  if (entry.until <= now) { AVAILABILITY.delete(availabilityKey(providerId, modelId)); return null; }
  return { ...entry, remainingMs: entry.until - now };
}
export function clearAvailability(providerId = null) {
  if (providerId == null) { AVAILABILITY.clear(); return; }
  for (const key of [...AVAILABILITY.keys()]) if (key === providerId || key.startsWith(providerId + '/')) AVAILABILITY.delete(key);
}
export const availabilitySnapshot = (now = Date.now()) => [...AVAILABILITY.values()].filter((e) => e.until > now).map((e) => ({ ...e, remainingMs: e.until - now }));
// Classificação usada pelo roteador: 404 "Function not found" e 410 são modelo indisponível (troca de modelo);
// 401/403, 429 e timeout tiram o provedor de rotação por um tempo e passam para o próximo.
export function classifyFreeRouterError(error) {
  const status = Number(error?.status) || 0;
  const text = String(error?.body || error?.message || '');
  if (error?.name === 'TimeoutError' || error?.timeout === true) return { kind: 'timeout', retry: 'next-provider', reason: `timeout de ${error?.timeoutMs || '?'} ms` };
  if (error?.missingKey === true || error?.disabled === true) return { kind: 'auth', retry: 'next-provider', reason: String(error?.message || 'chave ausente/desabilitado').slice(0, 200) };
  if (status === 404 && /function not found/i.test(text)) return { kind: 'model_unavailable', retry: 'next-model', reason: 'modelo indisponível (HTTP 404 Function not found)' };
  if (status === 410) return { kind: 'model_unavailable', retry: 'next-model', reason: 'modelo indisponível (HTTP 410)' };
  if (/ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(text)) return { kind: 'auth', retry: 'next-provider', reason: 'indisponível (tipo de chave não aceito)', code: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' };
  if (status === 401 || status === 403) return { kind: 'auth', retry: 'next-provider', reason: `falha de autenticação (HTTP ${status})` };
  // 402 = o provedor exigiu pagamento: é cota gratuita esgotada, não erro genérico.
  if (status === 402) return { kind: 'quota', retry: 'next-provider', reason: 'cota gratuita esgotada (HTTP 402)' };
  if (status === 429 || error?.quotaExceeded === true) return { kind: 'quota', retry: 'next-provider', reason: 'cota esgotada (HTTP 429)' };
  // A Cloudflare responde 400 com "No such model" quando o modelo não existe na conta: troca só o modelo.
  if ((status === 404 || status === 400) && /no such model|model not found|unknown model/i.test(text)) return { kind: 'model_unavailable', retry: 'next-model', reason: 'modelo indisponível no provedor' };
  return { kind: 'other', retry: 'next-provider', reason: String(error?.message || error).slice(0, 200) };
}
// `transcription` = áudio de entrada → texto com tempos (Whisper); separado de `audio-input` (entender áudio num chat).
const CAPS = Object.freeze(['text', 'vision', 'audio-input', 'image-output', 'audio-output', 'video-output', 'transcription']);
export const ROUTER_TASKS = Object.freeze({
  text: { label: 'Texto/planejamento', requires: ['text'] },
  vision: { label: 'Multimodal/imagem de entrada', requires: ['text', 'vision'] },
  audio_understanding: { label: 'Multimodal/áudio de entrada', requires: ['text', 'audio-input'] },
  image_generation: { label: 'Geração de imagem', requires: ['image-output'] },
  audio_generation: { label: 'Geração de áudio', requires: ['audio-output'] },
  video_generation: { label: 'Geração de vídeo', requires: ['video-output'] },
  transcription: { label: 'Transcrição (áudio → texto)', requires: ['transcription'] },
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
      if (policy.id === 'omni-router' && omniRouterUnavailable(model.id, task)) continue; // INDISPONÍVEL conhecido
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
const publicRoute = (task, chosen) => {
  const spec = FREE_PROVIDER_DEFAULTS[chosen.policy.id] || {};
  return {
  ok: true, task, taskLabel: ROUTER_TASKS[task].label,
  providerId: chosen.provider.id, providerName: chosen.policy.name, adapter: chosen.policy.adapter,
  locality: chosen.policy.locality, modelId: chosen.model.id,
  // Bases locais (Omni, FreeLLMAPI) sempre em 127.0.0.1, com piso de 120 s: a resolução para ::1 trava a chamada.
  baseUrl: spec.localOnly ? normalizeLocalBase(chosen.provider.baseUrl || spec.baseUrl) : (chosen.provider.baseUrl || ''),
  timeoutMs: spec.localOnly ? Math.max(120_000, Number(chosen.provider.timeoutMs) || spec.timeoutMs) : (Number(chosen.provider.timeoutMs) || chosen.policy.timeoutMs || null),
  freeTierConfirmed: chosen.policy.locality === 'local' || (chosen.provider.freeTierConfirmed === true && chosen.model.freeTierConfirmed === true),
  quotaAvailable: chosen.provider.quotaAvailable !== false,
  dailyLimit: Math.max(0, Number(chosen.provider.dailyLimit) || 0),
  taskEndpoints: chosen.provider.taskEndpoints || {},
  rationale: chosen.preference === Number.MAX_SAFE_INTEGER ? 'Primeiro modelo elegível por prioridade local.' : `Preferência ${chosen.preference + 1} definida para esta tarefa.`,
  // Só os NOMES das variáveis: nenhum valor de chave/conta entra na rota.
  secretEnv: chosen.policy.secretEnv, accountEnv: chosen.policy.accountEnv || null,
  };
};
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
      timeoutMs: Number(p.timeoutMs) > 0 ? Number(p.timeoutMs) : null,
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
    const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === p.id);
    if (policy?.locality === 'cloud' && p.enabled === true && !(Number(p.dailyLimit) > 0)) errors.push(`providers[${i}].dailyLimit precisa ser maior que zero para limitar chamadas cloud gratuitas`);
    // Bases locais (Omni, FreeLLMAPI e qualquer endpoint do usuário) nunca podem usar localhost: trava por IPv6.
    if (p.baseUrl && /\/\/localhost(?=[/:]|$)/i.test(String(p.baseUrl))) errors.push(`providers[${i}].baseUrl não pode usar localhost (trava por IPv6); use 127.0.0.1`);
    for (const [task, endpoint] of Object.entries(p.taskEndpoints || {})) if (!(task in ROUTER_TASKS) || typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//')) errors.push(`providers[${i}].taskEndpoints.${task} precisa ser um caminho relativo iniciado por /`);
  }
  for (const [task, preferred] of Object.entries(config.taskPreferences || {})) if (!(task in ROUTER_TASKS) || !Array.isArray(preferred)) errors.push(`preferência de tarefa inválida: ${task}`);
  return errors;
}
// Remove segredos (token, conta) de qualquer texto que possa virar mensagem, log ou relatório.
export const redactSecrets = (text, secrets = []) => {
  let out = String(text ?? '');
  for (const secret of secrets) { const value = String(secret || '').trim(); if (value.length >= 4) out = out.split(value).join('[redacted]'); }
  return out;
};
const responseError = async (response, providerId, { redact = [] } = {}) => {
  if (response.ok) return null;
  const body = redactSecrets(await response.text().catch(() => ''), redact);
  const error = new Error(`provedor ${providerId} respondeu HTTP ${response.status}`);
  error.status = response.status; error.body = body.slice(0, 2000);
  error.code = /ACCESS_TOKEN_TYPE_UNSUPPORTED/.exec(body)?.[0] || null;
  error.quotaExceeded = response.status === 429 || /quota|rate.?limit|resource.?exhausted/i.test(body);
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
      const image = item?.b64_json ? b64(item.b64_json) : null;
      return { image, mimeType: image ? (sniffImageMime(image) || 'image/png') : null, url: item?.url || null, providerId: route.providerId, modelId: route.modelId };
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
// A chave é enviada como o usuário escolher: cabeçalho x-goog-api-key (padrão), ?key= na URL ou Bearer.
// Nenhuma checagem de prefixo acontece aqui: a chave "AQ." do AI Studio é uma chave de autorização válida.
const geminiAuth = (route, apiKey, url) => {
  const mode = String(route.authMode || FREE_PROVIDER_DEFAULTS.gemini.authMode || 'x-goog-api-key').toLowerCase();
  if (!GEMINI_AUTH_MODES.includes(mode)) throw Object.assign(new Error(`GEMINI_AUTH_MODE inválido: ${mode}`), { status: 0 });
  if (mode === 'query') return { url: `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`, headers: {} };
  if (mode === 'bearer') return { url, headers: { authorization: `Bearer ${apiKey}` } };
  return { url, headers: { 'x-goog-api-key': apiKey } };
};
const geminiAdapter = (fetchImpl = fetch) => ({
  async execute(route, payload, { apiKey, signal } = {}) {
    if (!apiKey) throw Object.assign(new Error('chave Gemini não configurada; execução bloqueada'), { status: 0, missingKey: true });
    if (!route.baseUrl || !route.modelId) throw new Error('baseUrl/modelo ausente');
    const base = route.baseUrl.replace(/\/+$/, ''); const modelPath = `models/${encodeURIComponent(route.modelId)}`;
    // Rota OpenAI-compatível do Gemini (base + /openai/chat/completions) quando pedida explicitamente.
    if (route.geminiApi === 'openai') {
      const openai = openAIAdapter(fetchImpl);
      return openai.execute({ ...route, adapter: 'openai-compatible', baseUrl: `${base}/openai`, authMode: 'bearer' }, payload, { apiKey, signal });
    }
    if (['text', 'vision', 'audio_understanding', 'image_generation', 'audio_generation'].includes(route.task)) {
      const contents = payload.contents || [{ parts: [{ text: String(payload.prompt || payload.text || '') }] }];
      const call = geminiAuth(route, apiKey, `${base}/${modelPath}:generateContent`);
      const response = await fetchImpl(call.url, { method: 'POST', headers: { 'content-type': 'application/json', ...call.headers }, signal, body: JSON.stringify({ contents, ...(payload.options || {}) }) });
      await responseError(response, route.providerId); const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((part) => part.text || '').filter(Boolean).join('') || null;
      const blobs = parts.filter((part) => part.inlineData?.data).map((part) => ({ mimeType: part.inlineData.mimeType || 'application/octet-stream', data: b64(part.inlineData.data) }));
      if (route.task === 'image_generation') return { images: blobs, text, providerId: route.providerId, modelId: route.modelId };
      if (route.task === 'audio_generation') return { audio: blobs[0]?.data || null, mimeType: blobs[0]?.mimeType || null, text, providerId: route.providerId, modelId: route.modelId };
      return { text, providerId: route.providerId, modelId: route.modelId };
    }
    if (route.task === 'video_generation') {
      const call = geminiAuth(route, apiKey, `${base}/${modelPath}:predictLongRunning`);
      const response = await fetchImpl(call.url, { method: 'POST', headers: { 'content-type': 'application/json', ...call.headers }, signal, body: JSON.stringify({ instances: [{ prompt: String(payload.prompt || '') }], ...(payload.options || {}) }) });
      await responseError(response, route.providerId); return { operation: await response.json(), providerId: route.providerId, modelId: route.modelId };
    }
    throw new Error(`adaptador Gemini não implementa ${route.task}`);
  },
});
// Ollama: local (127.0.0.1:11434, sem chave) e Ollama Cloud (https://ollama.com, OLLAMA_API_KEY).
// Endpoint nativo /api/chat por padrão; /v1/chat/completions quando a base termina em /v1 ou apiPath pede.
const ollamaAdapter = (fetchImpl = fetch) => ({
  async execute(route, payload, { apiKey, signal } = {}) {
    if (!route.baseUrl || !route.modelId) throw new Error('baseUrl/modelo ausente');
    const root = route.baseUrl.replace(/\/+$/, '');
    const cloud = /(^|\/\/)ollama\.com/i.test(root);
    if (cloud && !apiKey) throw Object.assign(new Error('Ollama Cloud exige OLLAMA_API_KEY'), { status: 401, disabled: true });
    const explicit = route.apiPath || route.ollamaApi;
    const native = explicit ? !/v1/.test(String(explicit)) : !/\/v1$/.test(root);
    const headers = { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) };
    const messages = payload.messages || [{ role: 'user', content: String(payload.prompt || '') }];
    const url = native ? `${root}/api/chat` : `${root}/chat/completions`;
    const body = native ? { model: route.modelId, messages, stream: false, ...(payload.options || {}) } : { model: route.modelId, messages, ...(payload.options || {}) };
    const response = await fetchImpl(url, { method: 'POST', headers, signal, body: JSON.stringify(body) });
    await responseError(response, route.providerId);
    const data = await response.json();
    const text = native ? data.message?.content ?? null : (data.choices?.[0]?.message?.content ?? null);
    return { text: typeof text === 'string' ? text : null, providerId: route.providerId, modelId: route.modelId, api: native ? '/api/chat' : '/v1/chat/completions' };
  },
});
export const createOllamaFreeAdapter = (fetchImpl = fetch) => ollamaAdapter(fetchImpl);
// Cloudflare Workers AI.
// Base: https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/<modelo>; Authorization: Bearer <token>.
// A conta (CLOUDFLARE_ACCOUNT_ID) e o token (CLOUDFLARE_API_TOKEN) vêm SÓ de variável de ambiente: o {account}
// fica na base até a execução, então nada de conta/chave é gravado em db.json, log, relatório ou Drive.
// Imagem: @cf/black-forest-labs/flux-1-schnell, body {prompt, steps:4}, resposta result.image (JPEG base64) ~2,5 s.
// Voz: @cf/myshell-ai/melotts, body {prompt, lang:'en'}, resposta result.audio (WAV base64) ~1 s.
// Qualquer texto de erro passa por redactSecrets: nem a conta nem o token aparecem.
const cloudflareAdapter = (fetchImpl = fetch) => ({
  async execute(route, payload, { apiKey, signal, credentials } = {}) {
    if (!apiKey) throw Object.assign(new Error('token Cloudflare (CLOUDFLARE_API_TOKEN) não configurado; execução bloqueada'), { status: 0, missingKey: true });
    const account = String(credentials?.CLOUDFLARE_ACCOUNT_ID || '').trim();
    if (!account) throw Object.assign(new Error('conta Cloudflare (CLOUDFLARE_ACCOUNT_ID) não configurada; execução bloqueada'), { status: 0, missingKey: true });
    if (!route.modelId) throw new Error('modelo ausente');
    const spec = FREE_PROVIDER_DEFAULTS.cloudflare;
    const base = String(route.baseUrl || spec.baseUrl).replace(/\/+$/, '').replaceAll('{account}', encodeURIComponent(account));
    const secrets = [account, apiKey];
    let body;
    if (route.task === 'image_generation') {
      const steps = Number(payload.options?.steps ?? payload.steps);
      body = { prompt: String(payload.prompt || ''), steps: Number.isFinite(steps) && steps > 0 ? Math.min(8, Math.round(steps)) : spec.imageSteps };
    } else if (route.task === 'audio_generation') {
      body = { prompt: String(payload.prompt || payload.text || ''), lang: String(payload.lang || payload.options?.lang || 'en').slice(0, 16) };
    } else if (route.task === 'transcription') {
      // Whisper: o corpo é o próprio áudio (bytes). Nada de base64/JSON para não inflar o payload.
      const audio = payload.audio;
      if (!audio || !audio.length) throw new Error('transcrição sem áudio: envie os bytes (WAV/MP3) do trecho');
      const response = await fetchImpl(`${base}/${route.modelId}`, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/octet-stream', authorization: `Bearer ${apiKey}` },
        body: audio,
      });
      await responseError(response, route.providerId, { redact: secrets });
      const data = await response.json().catch(() => ({}));
      if (data.success === false) {
        const message = (data.errors || []).map((e) => e?.message).filter(Boolean).join('; ') || 'resposta sem sucesso';
        throw Object.assign(new Error(redactSecrets(`Cloudflare recusou a transcrição: ${message}`, secrets)), { status: 0 });
      }
      const result = data.result || {};
      const text = typeof result.text === 'string' ? result.text.trim() : '';
      if (!text) throw new Error('Cloudflare não retornou result.text (transcrição vazia)');
      const words = Array.isArray(result.words)
        ? result.words.map((w) => ({ word: String(w?.word ?? w?.text ?? '').trim(), start: Number(w?.start), end: Number(w?.end) })).filter((w) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end))
        : [];
      return { text, words, providerId: route.providerId, modelId: route.modelId, api: 'cloudflare-workers-ai' };
    } else {
      throw new Error(`adaptador Cloudflare não implementa ${route.task}`);
    }
    const response = await fetchImpl(`${base}/${route.modelId}`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    await responseError(response, route.providerId, { redact: secrets });
    const data = await response.json().catch(() => ({}));
    if (data.success === false) {
      const message = (data.errors || []).map((e) => e?.message).filter(Boolean).join('; ') || 'resposta sem sucesso';
      throw Object.assign(new Error(redactSecrets(`Cloudflare recusou: ${message}`, secrets)), { status: 0 });
    }
    const result = data.result || {};
    if (route.task === 'audio_generation') {
      const audio = b64(result.audio);
      if (!audio) throw new Error('Cloudflare não retornou result.audio (base64)');
      return { audio, mimeType: sniffAudioMime(audio) || 'audio/wav', providerId: route.providerId, modelId: route.modelId, api: 'cloudflare-workers-ai' };
    }
    const image = b64(result.image);
    if (!image) throw new Error('Cloudflare não retornou result.image (base64)');
    return { image, mimeType: sniffImageMime(image) || 'image/jpeg', providerId: route.providerId, modelId: route.modelId, api: 'cloudflare-workers-ai' };
  },
});
// URL de mídia da NovAI: só https e só em aiapi-pro.com ou *.[ufileos.com].
// `allowInsecure` existe APENAS para testes com servidor falso em 127.0.0.1 (NOVAI_ALLOW_INSECURE_ASSETS=1);
// o padrão nunca aceita http nem host de terceiros.
export const isAllowedAssetUrl = (url, { hosts = NOVAI_ASSET_HOSTS, allowInsecure = false } = {}) => {
  let parsed; try { parsed = new URL(String(url || '')); } catch { return false; }
  const secure = parsed.protocol === 'https:' || (allowInsecure && parsed.protocol === 'http:');
  if (!secure) return false;
  const host = parsed.hostname.toLowerCase();
  return hosts.some((allowed) => { const a = String(allowed).toLowerCase(); return host === a || host.endsWith('.' + a); });
};
// Estados do vídeo: SUCCESS/COMPLETED terminam; PROCESSING/QUEUED/PENDING/RUNNING continuam; FAILED/ERROR encerram com erro.
export const novaiVideoState = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'SUCCEEDED'].includes(raw)) return 'done';
  if (['PROCESSING', 'QUEUED', 'PENDING', 'RUNNING', 'IN_PROGRESS'].includes(raw)) return 'running';
  if (['FAILED', 'ERROR', 'CANCELED', 'CANCELLED', 'REJECTED', 'MODERATION', 'TIMEOUT'].includes(raw)) return 'failed';
  return 'unknown';
};
// NovAI (aiapi-pro.com). Bearer de NOVAI_API_KEY (só do ambiente) e regras medidas pelo usuário:
// vídeo assíncrono com consulta a cada 12 s, imagem cogview-3-flash (~12 s, data[0].url) e texto glm-4.7-flash.
const novaiAdapter = (fetchImpl = fetch) => {
  const spec = FREE_PROVIDER_DEFAULTS.novai;
  const root = (route) => String(route.baseUrl || spec.baseUrl).replace(/\/+$/, '');
  const auth = (apiKey) => { if (!apiKey) throw Object.assign(new Error('chave NovAI (NOVAI_API_KEY) não configurada; execução bloqueada'), { status: 0, missingKey: true }); return { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }; };
  const assetOptions = () => ({
    hosts: process.env.NOVAI_ASSET_HOSTS ? [...NOVAI_ASSET_HOSTS, ...String(process.env.NOVAI_ASSET_HOSTS).split(',').map((x) => x.trim()).filter(Boolean)] : NOVAI_ASSET_HOSTS,
    allowInsecure: process.env.NOVAI_ALLOW_INSECURE_ASSETS === '1',
  });
  // Baixa a mídia só de URL permitida — antes e depois de redirecionamentos (response.url é o destino final).
  const fetchAsset = async (url, { signal } = {}) => {
    const opts = assetOptions();
    if (!isAllowedAssetUrl(url, opts)) throw Object.assign(new Error(`URL de mídia fora da lista permitida (https em aiapi-pro.com ou *.ufileos.com): ${String(url).slice(0, 120)}`), { status: 0, blockedUrl: true });
    const response = await fetchImpl(url, { method: 'GET', signal, redirect: 'follow' });
    if (!response.ok) throw Object.assign(new Error(`download da mídia respondeu HTTP ${response.status}`), { status: response.status });
    if (response.url && !isAllowedAssetUrl(response.url, opts)) throw Object.assign(new Error('o redirecionamento do download saiu dos hosts permitidos; arquivo descartado'), { status: 0, blockedUrl: true });
    return Buffer.from(await response.arrayBuffer());
  };
  const submitVideo = async (route, payload, { apiKey, signal } = {}) => {
    const headers = auth(apiKey);
    const duration = Number(payload.seconds ?? payload.options?.duration) || spec.videoDuration;
    const response = await fetchImpl(`${root(route)}${spec.videoRoute}`, {
      method: 'POST', headers, signal,
      body: JSON.stringify({ model: route.modelId || NOVAI_VIDEO_MODEL, prompt: String(payload.prompt || ''), duration }),
    });
    await responseError(response, route.providerId);
    const data = await response.json();
    const id = data?.id || data?.task_id || data?.data?.id;
    if (!id) throw new Error('NovAI não retornou o id da tarefa de vídeo');
    return { id: String(id), status: data?.status || data?.task_status || 'queued' };
  };
  const pollVideo = async (route, id, { apiKey, signal } = {}) => {
    const headers = auth(apiKey);
    const model = route.modelId || NOVAI_VIDEO_MODEL;
    const url = `${root(route)}${spec.videoRoute}/${encodeURIComponent(id)}?model=${encodeURIComponent(model)}`;
    const response = await fetchImpl(url, { method: 'GET', headers, signal });
    await responseError(response, route.providerId);
    const data = await response.json();
    const status = data?.status || data?.task_status || data?.data?.status || null;
    const state = novaiVideoState(status);
    const result = data?.data && (data.data.video_result || data.data.video_url) ? data.data : data;
    const url2 = result?.video_result?.[0]?.url || result?.video_url || null;
    return { id, status: status ? String(status) : null, state, url: url2 ? String(url2) : null, raw: data };
  };
  return {
    fetchAsset, submitVideo, pollVideo,
    async execute(route, payload, { apiKey, signal } = {}) {
      const headers = auth(apiKey);
      if (['text', 'vision'].includes(route.task)) {
        const response = await fetchImpl(`${root(route)}${spec.textRoute}`, {
          method: 'POST', headers, signal,
          body: JSON.stringify({ model: route.modelId || NOVAI_TEXT_MODEL, messages: payload.messages || [{ role: 'user', content: String(payload.prompt || '') }] }),
        });
        await responseError(response, route.providerId); const data = await response.json();
        return { text: data.choices?.[0]?.message?.content ?? null, providerId: route.providerId, modelId: route.modelId };
      }
      if (route.task === 'image_generation') {
        const response = await fetchImpl(`${root(route)}${spec.imageRoute}`, {
          method: 'POST', headers, signal,
          body: JSON.stringify({ model: route.modelId || NOVAI_IMAGE_MODEL, prompt: String(payload.prompt || ''), n: 1 }),
        });
        await responseError(response, route.providerId); const data = await response.json();
        const first = data?.data?.[0] || {};
        const image = first.url ? await fetchAsset(first.url, { signal }) : b64(first.b64_json);
        if (!image) throw new Error('NovAI não retornou a imagem (data[0].url)');
        return { image, mimeType: sniffImageMime(image) || 'image/jpeg', providerId: route.providerId, modelId: route.modelId };
      }
      if (route.task === 'video_generation') {
        const submitted = await submitVideo(route, payload, { apiKey, signal });
        const pollMs = Math.max(10, Number(payload.pollMs || process.env[spec.env.pollMs]) || spec.pollMs);
        // Limite >= 180 s (vídeo medido: 72 s). Só o servidor falso dos testes (NOVAI_ALLOW_INSECURE_ASSETS=1) fura o piso.
        const timeoutFloor = process.env.NOVAI_ALLOW_INSECURE_ASSETS === '1' ? 500 : 180_000;
        const budgetMs = Math.max(timeoutFloor, Number(process.env.NOVAI_TIMEOUT_MS) || Number(route.timeoutMs) || spec.timeoutMs);
        const startedAt = Date.now();
        for (;;) {
          if (Date.now() - startedAt > budgetMs) throw Object.assign(new Error(`NovAI: vídeo não ficou pronto em ${Math.round((Date.now() - startedAt) / 1000)} s (limite local de ${Math.round(budgetMs / 1000)} s)`), { name: 'TimeoutError', timeout: true, timeoutMs: budgetMs });
          await new Promise((resolve, reject) => { const timer = setTimeout(resolve, pollMs); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason || Object.assign(new Error('tarefa cancelada'), { name: 'AbortError' })); }, { once: true }); });
          const status = await pollVideo(route, submitted.id, { apiKey, signal });
          if (status.state === 'done') {
            if (!status.url) throw new Error('NovAI: vídeo concluído sem video_result[0].url/video_url');
            const video = await fetchAsset(status.url, { signal });
            return { video, mimeType: 'video/mp4', url: status.url, remoteId: submitted.id, providerId: route.providerId, modelId: route.modelId };
          }
          if (status.state === 'failed') throw Object.assign(new Error(`NovAI: vídeo terminou com status ${status.status || 'desconhecido'}`), { status: 0, videoStatus: status.status });
          if (status.state === 'unknown') throw Object.assign(new Error(`NovAI: status de vídeo inesperado (${status.status || 'vazio'})`), { status: 0, videoStatus: status.status });
        }
      }
      throw new Error(`adaptador NovAI não implementa ${route.task}`);
    },
  };
};
export const createNovaiFreeAdapter = (fetchImpl = fetch) => novaiAdapter(fetchImpl);
export const createCloudflareFreeAdapter = (fetchImpl = fetch) => cloudflareAdapter(fetchImpl);
export function createFreeRouterAdapters(fetchImpl = fetch) { return { 'openai-compatible': openAIAdapter(fetchImpl), gemini: geminiAdapter(fetchImpl), ollama: ollamaAdapter(fetchImpl), 'cloudflare-workers-ai': cloudflareAdapter(fetchImpl), novai: novaiAdapter(fetchImpl) }; }
export const createOpenAICompatibleFreeAdapter = (fetchImpl = fetch) => openAIAdapter(fetchImpl);
export const createGeminiFreeAdapter = (fetchImpl = fetch) => geminiAdapter(fetchImpl);

// Laço de execução: um provedor que falha (auth, cota, timeout) sai de rotação por um tempo e o próximo assume.
// Modelo indisponível (404 "Function not found" / 410) troca só o modelo, sem repetir o mesmo id.
// A tarefa só falha quando nenhuma rota gratuita elegível concluiu.
export async function executeFreeRoutes(routes, payload, { adapters = createFreeRouterAdapters(), credentials = {}, onAttempt = () => {}, onQuota = () => {}, onUnavailable = () => {}, signal, now = () => Date.now(), useAvailabilityCache = true, defaultTimeoutMs = 60_000 } = {}) {
  const catalogEntry = (route) => FREE_PROVIDER_CATALOG.find((p) => p.id === route?.providerId && (p.adapters || [p.adapter]).includes(route.adapter));
  const all = (routes || []).filter((r) => r?.ok && catalogEntry(r));
  if (!all.length) throw new Error(routes?.reason || 'nenhuma rota gratuita elegível');
  const cached = useAvailabilityCache ? all.filter((r) => !availabilityOf(r.providerId, r.modelId, now()) && !availabilityOf(r.providerId, null, now())) : all;
  // O cache nunca deve bloquear a tarefa inteira: se tudo estiver marcado, tentamos mesmo assim.
  const eligible = cached.length ? cached : all;
  const skipped = all.length - eligible.length;
  const failures = []; const attempts = []; let quotaHit = false; let authHit = false;
  for (const route of eligible) {
    const policy = FREE_PROVIDER_CATALOG.find((p) => p.id === route.providerId);
    if (policy.locality === 'cloud' && route.freeTierConfirmed !== true) throw new Error('cota gratuita não confirmada; execução em nuvem bloqueada');
    // Ollama local não tem chave obrigatória; o Cloud usa OLLAMA_API_KEY quando existir (optionalSecretEnv).
    const keyEnv = policy.secretEnv || policy.optionalSecretEnv;
    const apiKey = keyEnv ? credentials[keyEnv] : undefined;
    if (policy.secretEnv && !apiKey) { failures.push(`${route.providerName}: chave não configurada`); continue; }
    if (signal?.aborted) throw signal.reason || new Error('tarefa cancelada');
    const timeoutMs = Math.max(1, Number(route.timeoutMs) || Number(policy.timeoutMs) || defaultTimeoutMs);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const attemptSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    onAttempt(route);
    try {
      const result = await adapters[route.adapter].execute(route, payload, { apiKey, signal: attemptSignal, credentials });
      attempts.push({ providerId: route.providerId, modelId: route.modelId, ok: true });
      return { ...result, route, attempts: [...attempts, ...(skipped ? [{ skippedByAvailabilityCache: skipped }] : [])] };
    } catch (error) {
      if (signal?.aborted) throw signal.reason || error;
      let failure = error;
      if (timeoutSignal.aborted && !error?.status) failure = Object.assign(new Error(`timeout de ${timeoutMs} ms em ${route.providerName}`), { name: 'TimeoutError', timeout: true, timeoutMs });
      const verdict = classifyFreeRouterError(failure);
      if (verdict.kind === 'quota' || failure?.quotaExceeded || failure?.status === 429) { quotaHit = true; onQuota(route); }
      if (verdict.kind === 'auth') authHit = true;
      const entry = markUnavailable(route.providerId, { modelId: verdict.retry === 'next-model' ? route.modelId : null, kind: verdict.kind, reason: verdict.reason, now: now() });
      onUnavailable({ route, kind: verdict.kind, retry: verdict.retry, reason: verdict.reason, until: entry.until, code: verdict.code || null });
      attempts.push({ providerId: route.providerId, modelId: route.modelId, ok: false, kind: verdict.kind, reason: verdict.reason });
      failures.push(`${route.providerName}${verdict.retry === 'next-model' ? ` (${route.modelId})` : ''}: ${verdict.reason}`);
    }
  }
  const failed = new Error(`Nenhum provedor gratuito concluiu a tarefa. ${failures.join(' | ') || 'Sem rota configurada.'} Fallback pago não foi usado.`);
  failed.failures = failures; failed.attempts = attempts;
  if (quotaHit) { failed.status = 429; failed.quotaExceeded = true; }
  else if (authHit) { failed.status = 401; failed.authFailed = true; }
  throw failed;
}
export async function executeFreeRoute(route, payload, options = {}) { if (!route?.ok) throw new Error(route?.reason || 'nenhuma rota gratuita elegível'); return executeFreeRoutes([route], payload, options); }
