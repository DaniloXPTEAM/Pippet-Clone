// Adaptadores de provedores de MÍDIA configuráveis pelo usuário (imagem, vídeo, áudio). Nada embutido: URL, modelo e chave são do usuário e ficam só neste computador.
// NÃO usam credenciais, endpoints privados nem planos do Pippit. Nenhuma chamada é feita sem o usuário configurar e pedir a geração (chamadas podem ser PAGAS no provedor dele).
// Formatos das APIs conforme a documentação pública conhecida; adaptadores marcados "não testado contra o serviço real" só foram exercitados contra servidores de mentira com o mesmo formato.
import { generateImage } from './imagegen.mjs';

const j = async (r) => r.json().catch(() => null);
const hdrs = (cfg, extra = {}) => ({ ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}), ...extra });
const root = (u) => String(u || '').replace(/\/+$/, '');
const need = (cfg, ...keys) => { for (const k of keys) if (!cfg?.[k]) throw new Error(`provedor não configurado: falta ${k}`); };
const errOf = async (r, what) => { const b = await j(r.clone ? r.clone() : r); return new Error(`${what} HTTP ${r.status}: ${b?.error?.message || b?.detail || b?.error || b?.message || 'erro'}`); };

// ---------------- vídeo ----------------
// Contrato: submit → { jobId }, poll → { state: queued|running|succeeded|failed|canceled, progress?, error?, result? }, download → { bytes, ext }, cancel (opcional)
export const OPENAI_VIDEO_SIZES = { '9:16': '720x1280', '16:9': '1280x720', '1:1': null, '3:4': null, '4:3': null, '21:9': null };
const openaiVideos = {
  label: 'OpenAI Vídeos (POST /v1/videos, ex.: sora-2) — não testado contra o serviço real',
  async submit(cfg, { prompt, seconds, ratio, reference, fetchImpl }) {
    need(cfg, 'baseUrl', 'model'); const size = cfg.size || OPENAI_VIDEO_SIZES[ratio]; if (!size) throw new Error(`proporção ${ratio} não suportada por este provedor (use 9:16 ou 16:9 ou defina "size")`);
    const secs = [4, 8, 12].reduce((a, b) => (Math.abs(b - seconds) < Math.abs(a - seconds) ? b : a)); // durações aceitas: 4, 8, 12
    const fd = new FormData(); fd.set('model', cfg.model); fd.set('prompt', String(prompt).slice(0, 4000)); fd.set('seconds', String(secs)); fd.set('size', size);
    if (reference) fd.set('input_reference', new Blob([reference.bytes], { type: reference.mime || 'image/png' }), reference.name || 'ref.png');
    const r = await fetchImpl(`${root(cfg.baseUrl)}/videos`, { method: 'POST', headers: hdrs(cfg), body: fd }); if (!r.ok) throw await errOf(r, 'vídeo'); const b = await j(r); if (!b?.id) throw new Error('resposta sem id do vídeo'); return { jobId: b.id, seconds: secs };
  },
  async poll(cfg, { jobId, fetchImpl }) {
    const r = await fetchImpl(`${root(cfg.baseUrl)}/videos/${encodeURIComponent(jobId)}`, { headers: hdrs(cfg) }); if (!r.ok) throw await errOf(r, 'consulta do vídeo'); const b = await j(r);
    const map = { queued: 'queued', in_progress: 'running', completed: 'succeeded', failed: 'failed' }; return { state: map[b?.status] || 'running', progress: Number(b?.progress) || 0, error: b?.error?.message || (b?.status === 'failed' ? 'falha no provedor' : null) };
  },
  async download(cfg, { jobId, fetchImpl }) { const r = await fetchImpl(`${root(cfg.baseUrl)}/videos/${encodeURIComponent(jobId)}/content`, { headers: hdrs(cfg) }); if (!r.ok) throw await errOf(r, 'download do vídeo'); return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'mp4' }; },
};
const REPLICATE_DEFAULT_MAP = { prompt: 'prompt', seconds: 'duration', ratio: 'aspect_ratio', image: 'image' };
const replicate = {
  label: 'Replicate (POST /v1/models/{modelo}/predictions) — não testado contra o serviço real',
  async submit(cfg, { prompt, seconds, ratio, reference, fetchImpl }) {
    need(cfg, 'baseUrl', 'model'); const map = { ...REPLICATE_DEFAULT_MAP, ...(cfg.inputMap || {}) }; const input = { ...(cfg.extraInput || {}) };
    if (map.prompt) input[map.prompt] = String(prompt).slice(0, 4000); if (map.seconds) input[map.seconds] = seconds; if (map.ratio) input[map.ratio] = ratio;
    if (reference && map.image) input[map.image] = `data:${reference.mime || 'image/png'};base64,${Buffer.from(reference.bytes).toString('base64')}`;
    const url = /^[\w.-]+\/[\w.-]+$/.test(cfg.model) ? `${root(cfg.baseUrl)}/models/${cfg.model}/predictions` : `${root(cfg.baseUrl)}/predictions`; const body = /^[\w.-]+\/[\w.-]+$/.test(cfg.model) ? { input } : { version: cfg.model, input };
    const r = await fetchImpl(url, { method: 'POST', headers: hdrs(cfg, { 'content-type': 'application/json' }), body: JSON.stringify(body) }); if (!r.ok) throw await errOf(r, 'predição'); const b = await j(r); if (!b?.id) throw new Error('resposta sem id da predição'); return { jobId: b.id, seconds };
  },
  async poll(cfg, { jobId, fetchImpl }) {
    const r = await fetchImpl(`${root(cfg.baseUrl)}/predictions/${encodeURIComponent(jobId)}`, { headers: hdrs(cfg) }); if (!r.ok) throw await errOf(r, 'consulta da predição'); const b = await j(r);
    const map = { starting: 'queued', processing: 'running', succeeded: 'succeeded', failed: 'failed', canceled: 'canceled' }; const out = Array.isArray(b?.output) ? b.output[0] : b?.output;
    return { state: map[b?.status] || 'running', progress: 0, error: b?.error ? String(b.error).slice(0, 300) : null, result: typeof out === 'string' ? out : null };
  },
  async download(cfg, { result, fetchImpl }) { if (!result) throw new Error('predição sem URL de saída'); const r = await fetchImpl(result, { headers: {} }); if (!r.ok) throw await errOf(r, 'download da saída'); const ext = (/\.(mp4|webm|mov)(\?|$)/i.exec(result) || [, 'mp4'])[1].toLowerCase(); return { bytes: Buffer.from(await r.arrayBuffer()), ext }; },
  async cancel(cfg, { jobId, fetchImpl }) { await fetchImpl(`${root(cfg.baseUrl)}/predictions/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', headers: hdrs(cfg) }); },
};
// ---------------- áudio ----------------
const openaiSpeech = {
  label: 'OpenAI-compatível (POST /v1/audio/speech) — não testado contra o serviço real',
  async synth(cfg, { text, voice, fetchImpl }) {
    need(cfg, 'baseUrl', 'model'); const r = await fetchImpl(`${root(cfg.baseUrl)}/audio/speech`, { method: 'POST', headers: hdrs(cfg, { 'content-type': 'application/json' }), body: JSON.stringify({ model: cfg.model, input: String(text).slice(0, 4000), voice: voice || cfg.voice || 'alloy', response_format: 'mp3' }) });
    if (!r.ok) throw await errOf(r, 'fala'); return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'mp3' };
  },
};
const sapiLocal = { label: 'Voz local do Windows (SAPI, não-IA; vozes en-US)', local: true };
// ---------------- imagem ----------------
const openaiImages = { label: 'OpenAI-compatível (POST /v1/images/generations)', async generate(cfg, { prompt, ratio, fetchImpl }) { return generateImage({ baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey, prompt, ratio, fetchImpl }); } };

// ---------------- foto falante (lip-sync por IA) ----------------
// Contrato COMUM interno do PiperLine (NÃO é o protocolo privado do Pippit nem o de um provedor específico). Cada adaptador declara o que realmente aceita:
//   submit(cfg, { image, audio, text, voice, gesture, params, fetchImpl }) → { jobId, accepted, ignored }   image/audio = { bytes, mime, name }
//   describe(cfg, req) → { accepted, ignored }   campos que ESTA configuração envia; os não mapeados NÃO são enviados e aparecem como "ignorados" no orçamento
//   estimate(cfg, { seconds }) → { known, amount, currency, basis }   só "known" se o usuário informou custo por segundo + moeda; senão desconhecido
//   limits(cfg) → { maxAudioSeconds }   · poll/download como no vídeo · cancel → { requested, httpStatus } (lança se o provedor recusar)
//   requiresTaskConsent: true → NENHUMA tarefa deste tipo é enviada sem consentimento explícito POR TAREFA (verificado no servidor, em app/lib/jobs.mjs)
const dataUri = (f) => `data:${f.mime || 'application/octet-stream'};base64,${Buffer.from(f.bytes).toString('base64')}`;
const LIPSYNC_DEFAULT_MAP = { image: 'image', audio: 'audio' }; // texto, voz e gesto só são enviados se o usuário mapear o campo (provedores diferem)
const lipsyncReplicate = {
  label: 'Replicate — modelo foto+áudio→vídeo (POST /v1/models/{modelo}/predictions) — não testado contra o serviço real',
  requiresTaskConsent: true,
  mapOf(cfg) { return { ...LIPSYNC_DEFAULT_MAP, ...(cfg.inputMap || {}) }; },
  describe(cfg, req = {}) {
    const map = this.mapOf(cfg); const accepted = []; const ignored = [];
    for (const k of ['image', 'audio', 'text', 'voice', 'gesture']) if (req[k]) (map[k] ? accepted : ignored).push(k);
    for (const k of Object.keys(req.params || {})) ((cfg.paramMap || {})[k] ? accepted : ignored).push(`param:${k}`);
    return { accepted, ignored };
  },
  estimate(cfg, { seconds }) {
    const c = cfg.costPerSecond === '' || cfg.costPerSecond == null ? NaN : Number(cfg.costPerSecond); const cur = String(cfg.currency || '').toUpperCase();
    if (!Number.isFinite(c) || c < 0 || !/^[A-Z]{3}$/.test(cur)) return { known: false, amount: null, currency: null, basis: 'o usuário não informou custo por segundo e moeda deste modelo' };
    return { known: true, amount: Math.round(seconds * c * 10000) / 10000, currency: cur, basis: `${seconds.toFixed(2)} s × ${c} ${cur}/s (valor informado pelo usuário; não verificado no provedor)` };
  },
  limits(cfg) { return { maxAudioSeconds: Number(cfg.maxAudioSeconds) > 0 ? Number(cfg.maxAudioSeconds) : 60 }; },
  async submit(cfg, { image, audio, text, voice, gesture, params, fetchImpl }) {
    need(cfg, 'baseUrl', 'model'); if (!image?.bytes) throw new Error('imagem de entrada ausente'); if (!audio?.bytes) throw new Error('áudio de entrada ausente');
    const map = this.mapOf(cfg); const desc = this.describe(cfg, { image, audio, text, voice, gesture, params }); const input = { ...(cfg.extraInput || {}) };
    input[map.image] = dataUri(image); input[map.audio] = dataUri(audio);
    if (text && map.text) input[map.text] = String(text).slice(0, 4000); if (voice && map.voice) input[map.voice] = String(voice).slice(0, 200); if (gesture && map.gesture) input[map.gesture] = String(gesture).slice(0, 500);
    for (const [k, v] of Object.entries(params || {})) { const fld = (cfg.paramMap || {})[k]; if (fld) input[fld] = v; }
    const short = /^[\w.-]+\/[\w.-]+$/.test(cfg.model); const url = short ? `${root(cfg.baseUrl)}/models/${cfg.model}/predictions` : `${root(cfg.baseUrl)}/predictions`; const body = short ? { input } : { version: cfg.model, input };
    let r; try { r = await fetchImpl(url, { method: 'POST', headers: hdrs(cfg, { 'content-type': 'application/json' }), body: JSON.stringify(body) }); } catch (e) { const err = new Error(`falha de rede ao enviar: ${String(e.message || e).slice(0, 200)}`); err.network = true; throw err; }
    if (!r.ok) { const err = await errOf(r, 'predição'); err.http = r.status; throw err; }
    const b = await j(r); if (!b?.id) throw new Error('resposta sem id da predição'); return { jobId: b.id, accepted: desc.accepted, ignored: desc.ignored };
  },
  poll: replicate.poll, download: replicate.download,
  async cancel(cfg, { jobId, fetchImpl }) { const r = await fetchImpl(`${root(cfg.baseUrl)}/predictions/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', headers: hdrs(cfg) }); if (!r.ok) throw await errOf(r, 'cancelamento'); return { requested: true, httpStatus: r.status }; },
};

export const ADAPTERS = { video: { 'openai-videos': openaiVideos, replicate }, audio: { 'openai-speech': openaiSpeech, 'sapi-local': sapiLocal }, image: { 'openai-images': openaiImages }, talkingphoto: { 'replicate-lipsync': lipsyncReplicate } };
export const KINDS = Object.keys(ADAPTERS);
export const adapterFor = (kind, name) => ADAPTERS[kind]?.[name] || null;
// configuração salva: settings.providers[kind] = { adapter, baseUrl, model, apiKey, ... } (+ migração do antigo settings.imageProvider)
export function resolveProviders(settings = {}) {
  const p = { ...(settings.providers || {}) };
  if (!p.image && settings.imageProvider?.baseUrl && settings.imageProvider?.model) p.image = { adapter: 'openai-images', ...settings.imageProvider };
  return p;
}
export const isConfigured = (cfg, kind) => !!cfg?.adapter && !!adapterFor(kind, cfg.adapter) && (adapterFor(kind, cfg.adapter).local || (!!cfg.baseUrl && !!cfg.model));
export function publicProviders(settings) {
  const p = resolveProviders(settings);
  return Object.fromEntries(KINDS.map((k) => [k, { configured: isConfigured(p[k], k), adapter: p[k]?.adapter || null, baseUrl: p[k]?.baseUrl || '', model: p[k]?.model || '', hasKey: !!p[k]?.apiKey, voice: p[k]?.voice || '', costPerSecond: p[k]?.costPerSecond ?? '', currency: p[k]?.currency || '', maxCostPerTask: p[k]?.maxCostPerTask ?? '', maxAudioSeconds: p[k]?.maxAudioSeconds ?? '', inputMap: p[k]?.inputMap || null, paramMap: p[k]?.paramMap || null, adapters: Object.entries(ADAPTERS[k]).map(([id, a]) => ({ id, label: a.label })) }]));
}
export function validateConfig(kind, b) {
  if (!ADAPTERS[kind]) return 'tipo de provedor inválido'; if (!adapterFor(kind, b.adapter)) return `adaptador inválido para ${kind}`;
  const a = adapterFor(kind, b.adapter); if (a.local) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(String(b.baseUrl || ''))) return 'baseUrl inválida (use http(s)://…)'; if (!String(b.model || '').trim()) return 'informe o modelo';
  if (b.inputMap && (typeof b.inputMap !== 'object' || Array.isArray(b.inputMap))) return 'inputMap deve ser um objeto';
  if (b.paramMap && (typeof b.paramMap !== 'object' || Array.isArray(b.paramMap))) return 'paramMap deve ser um objeto';
  const has = (v) => v !== undefined && v !== null && v !== ''; const num = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
  if (has(b.costPerSecond) && !num(b.costPerSecond)) return 'custo por segundo inválido (número ≥ 0)'; if (has(b.costPerSecond) && !/^[A-Za-z]{3}$/.test(String(b.currency || ''))) return 'informe a moeda (3 letras, ex.: USD) junto com o custo por segundo';
  if (has(b.maxCostPerTask) && !num(b.maxCostPerTask)) return 'limite de custo por tarefa inválido (número ≥ 0)'; if (has(b.maxAudioSeconds) && !(Number(b.maxAudioSeconds) >= 1 && Number(b.maxAudioSeconds) <= 300)) return 'duração máxima do áudio deve estar entre 1 e 300 s';
  return null;
}
