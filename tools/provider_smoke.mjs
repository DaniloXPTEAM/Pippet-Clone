#!/usr/bin/env node
// Smoke dos provedores gratuitos com as APIs reais (nenhuma chave é lida de arquivo nem impressa).
//
// Variáveis:
//   NVIDIA:  NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_MODEL, NVIDIA_TIMEOUT_MS   (padrão: google/gemma-4-31b-it, reserva minimaxai/minimax-m3.1-flash)
//   Gemini:  GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODEL, GEMINI_AUTH_MODE    (x-goog-api-key | query | bearer), GEMINI_API
//   Ollama:  OLLAMA_API_KEY (só Cloud), OLLAMA_BASE_URL, OLLAMA_MODEL
//   Omni:    OMNIROUTER_API_KEY, OMNIROUTER_BASE_URL (127.0.0.1:20128/v1), OMNIROUTER_MODEL, OMNIROUTER_IMAGE_MODEL
//   FreeLLMAPI: FREELLMAPI_API_KEY, FREELLMAPI_BASE_URL (127.0.0.1:3001/v1), FREELLMAPI_MODEL (auto)
//   Cloudflare Workers AI: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (só do ambiente), CLOUDFLARE_AI_BASE_URL,
//             CLOUDFLARE_IMAGE_MODEL (flux-1-schnell), CLOUDFLARE_AUDIO_MODEL (melotts), CLOUDFLARE_TIMEOUT_MS
//   NovAI:   NOVAI_API_KEY, NOVAI_BASE_URL (https://aiapi-pro.com/v1), NOVAI_MODEL (glm-4.7-flash),
//             NOVAI_IMAGE_MODEL (cogview-3-flash), NOVAI_VIDEO_MODEL (cogvideox-flash), NOVAI_POLL_MS (12 s),
//             NOVAI_TIMEOUT_MS (>= 180 s). Vídeo é curto (5 s) e a linha mede o tempo até o MP4: até 72 s medidos;
//             o download só é aceito de https em aiapi-pro.com / *.ufileos.com. Teto: 5 vídeos/dia.
//   Nenhum valor de chave ou de conta é impresso: as linhas mostram só "presente/ausente".
//
// Regras: 404 "Function not found" e 410 trocam só o modelo (sem repetir); 401, 429 e timeout marcam o provedor
// como indisponível e o próximo assume — o script nunca aborta por causa de um provedor.
import { pathToFileURL } from 'node:url';
import {
  createFreeRouterAdapters, classifyFreeRouterError, markUnavailable, clearAvailability, availabilitySnapshot,
  defaultModelCandidates, FREE_PROVIDER_DEFAULTS, GEMINI_AUTH_MODES, isValidGeminiKeyShape,
} from '../local_reconstruction/src/free_router.mjs';

const PROMPT = 'Reply with exactly: smoke test ok';
const D = FREE_PROVIDER_DEFAULTS;
const num = (value, fallback) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; };

export const providerSpecs = (env = {}) => {
  const nvidiaModels = defaultModelCandidates('nvidia-nim', env);
  const nvidiaModel = String(env.NVIDIA_MODEL || '').trim();
  const geminiModel = String(env.GEMINI_MODEL || D.gemini.models[0]).trim();
  const ollamaBase = String(env.OLLAMA_BASE_URL || D.ollama.baseUrl).replace(/\/+$/, '');
  const ollamaCloud = /ollama\.com/i.test(ollamaBase) || ['1', 'true', 'yes'].includes(String(env.OLLAMA_CLOUD || '').toLowerCase());
  const ollamaModels = [String(env.OLLAMA_MODEL || D.ollama.models[0]).trim()];
  return [
    {
      id: 'nvidia-nim', label: 'NVIDIA', adapter: 'openai-compatible', keyEnv: 'NVIDIA_API_KEY', requireKey: true,
      baseUrl: String(env.NVIDIA_BASE_URL || D['nvidia-nim'].baseUrl), models: nvidiaModels, model: nvidiaModel || nvidiaModels[0],
      timeoutMs: num(env.NVIDIA_TIMEOUT_MS, 60_000), freeTierConfirmed: true,
    },
    {
      id: 'gemini', label: 'Gemini', adapter: 'gemini', keyEnv: 'GEMINI_API_KEY', requireKey: true,
      baseUrl: String(env.GEMINI_BASE_URL || D.gemini.baseUrl), models: [geminiModel], model: geminiModel,
      authMode: String(env.GEMINI_AUTH_MODE || D.gemini.authMode), api: String(env.GEMINI_API || 'native'),
      timeoutMs: num(env.GEMINI_TIMEOUT_MS, 60_000), freeTierConfirmed: true,
    },
    {
      id: 'ollama', label: ollamaCloud ? 'Ollama Cloud' : 'Ollama', adapter: 'ollama', keyEnv: 'OLLAMA_API_KEY', requireKey: ollamaCloud,
      baseUrl: ollamaBase, models: ollamaModels, model: ollamaModels[0], cloud: ollamaCloud,
      timeoutMs: num(env.OLLAMA_TIMEOUT_MS, 120_000), freeTierConfirmed: true, locality: ollamaCloud ? 'cloud' : 'local',
    },
    // Omni Router do usuário: 127.0.0.1 (nunca localhost), Bearer de OMNIROUTER_API_KEY, texto auto/best-free e imagem flux.2-klein.
    // Timeout local >= 120 s: o texto levou ~21 s e a imagem até 25 s nas medições do usuário.
    {
      id: 'omni-router', label: 'Omni Router', adapter: 'openai-compatible', keyEnv: 'OMNIROUTER_API_KEY', requireKey: true, task: 'text',
      baseUrl: String(env.OMNIROUTER_BASE_URL || D['omni-router'].baseUrl), models: [String(env.OMNIROUTER_MODEL || D['omni-router'].models[0])],
      model: String(env.OMNIROUTER_MODEL || D['omni-router'].models[0]),
      timeoutMs: num(env.OMNIROUTER_TIMEOUT_MS, 120_000), freeTierConfirmed: true, locality: 'local',
    },
    {
      id: 'omni-router', label: 'Omni Router (imagem)', adapter: 'openai-compatible', keyEnv: 'OMNIROUTER_API_KEY', requireKey: true, task: 'image_generation',
      baseUrl: String(env.OMNIROUTER_BASE_URL || D['omni-router'].baseUrl), models: [String(env.OMNIROUTER_IMAGE_MODEL || D['omni-router'].imageModels[0])],
      model: String(env.OMNIROUTER_IMAGE_MODEL || D['omni-router'].imageModels[0]),
      timeoutMs: num(env.OMNIROUTER_IMAGE_TIMEOUT_MS, 120_000), freeTierConfirmed: true, locality: 'local',
    },
    // FreeLLMAPI: texto principal da instalação, 127.0.0.1:3001/v1, modelo "auto" (nunca localhost).
    {
      id: 'freellmapi', label: 'FreeLLMAPI', adapter: 'openai-compatible', keyEnv: 'FREELLMAPI_API_KEY', requireKey: true, task: 'text',
      baseUrl: String(env.FREELLMAPI_BASE_URL || D.freellmapi.baseUrl).replace(/\/+$/, ''),
      models: [String(env.FREELLMAPI_MODEL || D.freellmapi.models[0])], model: String(env.FREELLMAPI_MODEL || D.freellmapi.models[0]),
      timeoutMs: num(env.FREELLMAPI_TIMEOUT_MS, 120_000), freeTierConfirmed: true, locality: 'local',
    },
    // Cloudflare Workers AI: imagem flux-1-schnell (steps 4, ~2,5 s) e voz melotts (WAV, ~1 s).
    // A conta entra por CLOUDFLARE_ACCOUNT_ID e o token por CLOUDFLARE_API_TOKEN — só do ambiente.
    {
      id: 'cloudflare', label: 'Cloudflare (imagem)', adapter: 'cloudflare-workers-ai', keyEnv: 'CLOUDFLARE_API_TOKEN',
      accountEnv: 'CLOUDFLARE_ACCOUNT_ID', requireKey: true, task: 'image_generation',
      baseUrl: String(env.CLOUDFLARE_AI_BASE_URL || D.cloudflare.baseUrl).replace(/\/+$/, ''),
      models: [String(env.CLOUDFLARE_IMAGE_MODEL || D.cloudflare.imageModels[0])],
      model: String(env.CLOUDFLARE_IMAGE_MODEL || D.cloudflare.imageModels[0]),
      prompt: 'smoke test: a small red circle on white',
      timeoutMs: num(env.CLOUDFLARE_TIMEOUT_MS, 60_000), freeTierConfirmed: true, locality: 'cloud',
    },
    // NovAI (aiapi-pro.com): texto glm-4.7-flash, imagem cogview-3-flash e vídeo cogvideox-flash (5 s) — os três
    // últimos da ordem (reserva de texto/imagem; único provedor gratuito de vídeo). Só ambiente, nunca arquivo.
    {
      id: 'novai', label: 'NovAI (texto)', adapter: 'novai', keyEnv: 'NOVAI_API_KEY', requireKey: true, task: 'text',
      baseUrl: String(env.NOVAI_BASE_URL || D.novai.baseUrl).replace(/\/+$/, ''),
      models: [String(env.NOVAI_MODEL || D.novai.models[0])], model: String(env.NOVAI_MODEL || D.novai.models[0]),
      timeoutMs: num(env.NOVAI_TEXT_TIMEOUT_MS, 120_000), freeTierConfirmed: true, locality: 'cloud',
    },
    {
      id: 'novai', label: 'NovAI (imagem)', adapter: 'novai', keyEnv: 'NOVAI_API_KEY', requireKey: true, task: 'image_generation',
      baseUrl: String(env.NOVAI_BASE_URL || D.novai.baseUrl).replace(/\/+$/, ''),
      models: [String(env.NOVAI_IMAGE_MODEL || D.novai.imageModels[0])], model: String(env.NOVAI_IMAGE_MODEL || D.novai.imageModels[0]),
      prompt: 'smoke test: a small red circle on white', timeoutMs: num(env.NOVAI_IMAGE_TIMEOUT_MS, 120_000),
      freeTierConfirmed: true, locality: 'cloud',
    },
    {
      // Vídeo: 5 s, consulta a cada 12 s (NOVAI_POLL_MS) e limite local >= 180 s. Conta como 1 das 5 gerações do dia.
      id: 'novai', label: 'NovAI (vídeo 5 s)', adapter: 'novai', keyEnv: 'NOVAI_API_KEY', requireKey: true, task: 'video_generation',
      baseUrl: String(env.NOVAI_BASE_URL || D.novai.baseUrl).replace(/\/+$/, ''),
      models: [String(env.NOVAI_VIDEO_MODEL || D.novai.videoModels[0])], model: String(env.NOVAI_VIDEO_MODEL || D.novai.videoModels[0]),
      prompt: 'smoke test: a small paper boat floating on a calm river', seconds: D.novai.videoDuration,
      timeoutMs: Math.max(180_000, num(env.NOVAI_TIMEOUT_MS, D.novai.timeoutMs)), freeTierConfirmed: true, locality: 'cloud',
    },
    {
      id: 'cloudflare', label: 'Cloudflare (voz)', adapter: 'cloudflare-workers-ai', keyEnv: 'CLOUDFLARE_API_TOKEN',
      accountEnv: 'CLOUDFLARE_ACCOUNT_ID', requireKey: true, task: 'audio_generation',
      baseUrl: String(env.CLOUDFLARE_AI_BASE_URL || D.cloudflare.baseUrl).replace(/\/+$/, ''),
      models: [String(env.CLOUDFLARE_AUDIO_MODEL || D.cloudflare.audioModels[0])],
      model: String(env.CLOUDFLARE_AUDIO_MODEL || D.cloudflare.audioModels[0]),
      prompt: 'Smoke test ok', lang: 'en',
      timeoutMs: num(env.CLOUDFLARE_TIMEOUT_MS, 60_000), freeTierConfirmed: true, locality: 'cloud',
    },
  ];
};

const cleanPreview = (value, secrets) => {
  let text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  for (const secret of secrets) if (secret) text = text.split(secret).join('[redacted]');
  return Array.from(text).slice(0, 80).join('') || '-';
};
const format = (record) => `provedor=${record.provider} | chave ${record.key} | HTTP=${record.http} | tempo=${record.time}ms | modelo=${record.model} | tentativas=${record.attempts} | resposta=${record.response}`;
const summaryLine = (records) => `resumo: ${records.map((r) => `${r.provider}=${r.state}${r.note ? ` (${r.note})` : ''}`).join(' | ')}`;

export async function runSmoke({ env = process.env, fetchImpl = fetch, write = (line) => console.log(line), clearCache = true, now = () => Date.now() } = {}) {
  if (clearCache) clearAvailability();
  const capture = { http: 'N/A', preview: '' };
  const adapters = createFreeRouterAdapters(async (url, init) => {
    const response = await fetchImpl(url, init);
    capture.http = response.status;
    capture.preview = await response.clone().text().catch(() => '');
    return response;
  });
  const specs = providerSpecs(env);
  const secrets = specs.flatMap((s) => [env[s.keyEnv], s.accountEnv ? env[s.accountEnv] : null]).filter(Boolean);
  const records = [];
  for (const spec of specs) {
    const key = String(env[spec.keyEnv] || '').trim();
    const record = { provider: spec.label, providerId: spec.id, key: key ? 'presente' : 'ausente', http: 'SKIP', time: 0, model: spec.model, attempts: 0, response: '-', state: 'skip', note: '', modelsTried: [] };
    if (spec.requireKey && !key) { record.note = 'sem chave'; records.push(record); write(format(record)); continue; }
    if (spec.accountEnv && !String(env[spec.accountEnv] || '').trim()) { record.note = `sem ${spec.accountEnv}`; records.push(record); write(format(record)); continue; }
    if (spec.id === 'gemini' && key && !isValidGeminiKeyShape(key)) { record.http = 'ERRO'; record.note = 'chave vazia/curta'; record.state = 'erro'; records.push(record); write(format(record)); continue; }
    const started = Date.now();
    let finished = false;
    const candidates = spec.id === 'nvidia-nim' ? spec.models : [spec.model];
    for (const model of candidates) {
      if (finished) break;
      const route = {
        ok: true, task: spec.task || 'text', providerId: spec.id, providerName: spec.label, adapter: spec.adapter,
        locality: spec.locality || 'cloud', modelId: model, baseUrl: spec.baseUrl, timeoutMs: spec.timeoutMs,
        freeTierConfirmed: true, ...(spec.authMode ? { authMode: spec.authMode } : {}), ...(spec.api ? { geminiApi: spec.api } : {}),
      };
      capture.http = 'N/A'; capture.preview = '';
      record.model = model; record.attempts += 1; record.modelsTried.push(model);
      const timeoutSignal = AbortSignal.timeout(spec.timeoutMs || 60_000);
      try {
        const result = await adapters[spec.adapter].execute(
          route,
          { prompt: spec.prompt || PROMPT, ...(spec.lang ? { lang: spec.lang } : {}), ...(spec.seconds ? { seconds: spec.seconds } : {}) },
          { apiKey: key || undefined, signal: timeoutSignal, credentials: spec.accountEnv ? { [spec.accountEnv]: env[spec.accountEnv] } : undefined },
        );
        record.http = String(capture.http); record.state = 'ok'; record.note = record.attempts > 1 ? model : '';
        const blob = result?.image || result?.audio || result?.video;
        record.response = cleanPreview(blob ? `${result.mimeType || 'binário'} ${blob.length} B` : (result?.text ?? capture.preview), secrets);
        finished = true;
      } catch (error) {
        const timeout = timeoutSignal.aborted && !error?.status;
        const failure = timeout ? Object.assign(new Error(`timeout de ${spec.timeoutMs} ms`), { name: 'TimeoutError', timeout: true, timeoutMs: spec.timeoutMs }) : error;
        const verdict = classifyFreeRouterError(failure);
        record.http = capture.http === 'N/A' ? (timeout ? 'TIMEOUT' : 'ERRO') : String(capture.http);
        record.response = cleanPreview(capture.preview || verdict.reason, secrets);
        if (verdict.retry === 'next-model') {
          // 404 "Function not found" / 410: o modelo morre, o provedor não. Marca e passa ao próximo candidato, sem repetir.
          markUnavailable(spec.id, { modelId: model, kind: verdict.kind, reason: verdict.reason, now: now() });
          record.note = `${verdict.reason}; trocando de modelo`;
          record.state = 'modelo-indisponivel';
          continue;
        }
        markUnavailable(spec.id, { kind: verdict.kind, reason: verdict.reason, now: now() });
        record.state = verdict.kind === 'auth' ? 'indisponivel-tipo-de-chave' : verdict.kind === 'quota' ? 'indisponivel-cota' : verdict.kind === 'timeout' ? 'indisponivel-timeout' : 'erro';
        record.note = verdict.reason;
        record.response = cleanPreview(verdict.reason, secrets);
        finished = true;
      }
    }
    record.time = Date.now() - started;
    records.push(record);
    write(format(record));
  }
  write(summaryLine(records));
  return { records, ok: records.some((r) => r.state === 'ok'), availability: availabilitySnapshot() };
}

export { GEMINI_AUTH_MODES };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runSmoke();
  if (!result.ok) process.exitCode = 0; // diagnóstico: relatar, não falhar
}
