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

// ---------------- foto falante: Hugging Face Space (Gradio) ----------------
// Space gratuito (SadTalker / Hallo2 / Wav2Lip): a chamada é a API pública do Gradio 4/5:
//   1) POST {base}/gradio_api/upload (multipart, campo "files") → [caminho do arquivo no Space]
//   2) POST {base}/gradio_api/call/{apiName}  {data:[...]} → {event_id}
//   3) GET  {base}/gradio_api/call/{apiName}/{event_id} → SSE (event: complete + data: [...])
// A fila do Space é assíncrona: o adapter devolve o event_id como jobId e a consulta lê o stream.
// Token: cfg.apiKey ou HF_TOKEN do ambiente (espaços públicos funcionam sem token; com token, cota maior).
// Nada é enviado sem consentimento por tarefa (requiresTaskConsent), e a espera é de pelo menos 300 s.
export const HF_MIN_TIMEOUT_MS = 300_000;
const hfBase = (cfg) => {
  const explicit = String(cfg?.baseUrl || '').trim();
  if (explicit) return root(explicit);
  const space = String(cfg?.space || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(space)) throw new Error('informe o Space do Hugging Face (dono/space) ou uma baseUrl do Space');
  const [owner, name] = space.split('/');
  const slug = (s) => s.toLowerCase().replace(/[._]/g, '-');
  return `https://${slug(owner)}-${slug(name)}.hf.space`;
};
const hfToken = (cfg) => String(cfg?.apiKey || process.env.HF_TOKEN || '').trim();
const hfAuth = (cfg) => (hfToken(cfg) ? { authorization: `Bearer ${hfToken(cfg)}` } : {});
const hfRuns = new Map(); // jobId → { startedAt, base, apiName } (só para timeout e para montar a consulta)
const hfLoopback = () => process.env.PIPERLINE_ALLOW_LOOPBACK_MEDIA === '1';
const hfFileUrlAllowed = (url, base) => {
  let u; try { u = new URL(String(url)); } catch { return false; }
  const b = new URL(base);
  const sameHost = u.hostname === b.hostname;
  const secure = u.protocol === 'https:' || (hfLoopback() && u.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(u.hostname));
  return sameHost && secure;
};
// Campos do formulário do Space: índices no array `data`. Padrão: foto=0, áudio=1 (SadTalker/Hallo2/Wav2Lip usam isso).
const HF_DEFAULT_FIELDS = { image: 0, audio: 1 };
const hfFields = (cfg) => ({ ...HF_DEFAULT_FIELDS, ...(cfg.fields || {}) });
const hfFileData = (base, p, file) => ({ path: p, url: `${base}/gradio_api/file=${p}`, orig_name: file?.name || 'arquivo', mime_type: file?.mime || 'application/octet-stream', meta: { _type: 'gradio.FileData' } });
const parseSse = (text) => {
  const events = []; let ev = null; const data = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (line.startsWith('event:')) { if (ev && data.length) events.push({ event: ev, data: data.join('\n') }); ev = line.slice(6).trim(); data.length = 0; }
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (ev && data.length) events.push({ event: ev, data: data.join('\n') });
  return events;
};
// Extrai o vídeo de saída de um evento "complete": string (URL/caminho), dict do Gradio ou lista com o vídeo.
const hfPickResult = (value) => {
  const walk = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return /\.(mp4|webm|mov|gif)(\?|$)/i.test(v) || /^https?:|^\//.test(v) ? v : null;
    if (Array.isArray(v)) { for (const item of v) { const r = walk(item); if (r) return r; } return null; }
    if (typeof v === 'object') return walk(v.url) || walk(v.path) || walk(v.name) || walk(v.video) || null;
    return null;
  };
  return walk(value);
};
const huggingFaceSpace = {
  label: 'Hugging Face Space (Gradio: SadTalker/Hallo2/Wav2Lip) — gratuito, fila do Space',
  requiresTaskConsent: true,
  freeExecution: true,
  allowRemote: true,
  configured: (cfg) => !!String(cfg?.baseUrl || cfg?.space || '').trim(),
  mapOf(cfg) { return { image: true, audio: true, ...(cfg.inputMap || {}) }; },
  describe(cfg, req = {}) {
    const accepted = []; const ignored = [];
    for (const k of ['image', 'audio', 'text', 'voice', 'gesture']) if (req[k]) (cfg.fields?.[k] != null || HF_DEFAULT_FIELDS[k] != null ? accepted : ignored).push(k);
    for (const k of Object.keys(req.params || {})) ((cfg.fields || {})[k] != null ? accepted : ignored).push(`param:${k}`);
    return { accepted, ignored };
  },
  estimate() { return { known: true, amount: 0, currency: null, basis: 'Space gratuito: sem cobrança do PiperLine (o Space pode ter fila e limites de uso)' }; },
  limits(cfg) { return { maxAudioSeconds: Number(cfg?.maxAudioSeconds) > 0 ? Number(cfg.maxAudioSeconds) : 60 }; },
  timeoutMs(cfg) { return Math.max(HF_MIN_TIMEOUT_MS, Number(cfg?.timeoutMs) || 0); },
  async submit(cfg, { image, audio, text, voice, gesture, params, fetchImpl }) {
    if (!image?.bytes) throw new Error('imagem de entrada ausente'); if (!audio?.bytes) throw new Error('áudio de entrada ausente');
    const base = hfBase(cfg); const apiName = String(cfg.apiName || 'predict').replace(/^\/+/, '');
    const desc = this.describe(cfg, { image, audio, text, voice, gesture, params });
    // 1) upload dos arquivos (multipart) — o Gradio devolve o caminho de cada um
    const upload = async (file, name) => {
      const fd = new FormData(); fd.set('files', new Blob([file.bytes], { type: file.mime || 'application/octet-stream' }), name);
      let r; try { r = await fetchImpl(`${base}/gradio_api/upload`, { method: 'POST', headers: hfAuth(cfg), body: fd }); }
      catch (e) { throw Object.assign(new Error(`falha de rede no upload para o Space: ${e.message}`), { network: true }); }
      if (!r.ok) throw await errOf(r, 'upload no Space');
      const b = await j(r); const p = Array.isArray(b) ? b[0] : b?.files?.[0] ?? b?.path;
      if (!p) throw new Error('o Space não devolveu o caminho do arquivo enviado');
      return hfFileData(base, p, { ...file, name });
    };
    const imageData = await upload(image, image.name || 'foto.png');
    const audioData = await upload(audio, audio.name || 'audio.wav');
    // 2) chamada com fila: data[] nos índices configurados (padrão foto=0, áudio=1)
    const fields = hfFields(cfg); const size = Math.max(...Object.values(fields).map((n) => Number(n) || 0)) + 1;
    const data = Array.from({ length: size }, () => null);
    data[fields.image] = imageData; data[fields.audio] = audioData;
    if (text && fields.text != null) data[fields.text] = String(text).slice(0, 4000);
    if (voice && fields.voice != null) data[fields.voice] = String(voice).slice(0, 200);
    if (gesture && fields.gesture != null) data[fields.gesture] = String(gesture).slice(0, 500);
    for (const [k, v] of Object.entries(params || {})) if (fields[k] != null) data[fields[k]] = v;
    let r; try { r = await fetchImpl(`${base}/gradio_api/call/${encodeURIComponent(apiName)}`, { method: 'POST', headers: { 'content-type': 'application/json', ...hfAuth(cfg) }, body: JSON.stringify({ data }) }); }
    catch (e) { throw Object.assign(new Error(`falha de rede ao enfileirar no Space: ${e.message}`), { network: true }); }
    if (!r.ok) throw await errOf(r, 'chamada no Space');
    const b = await j(r); if (!b?.event_id) throw new Error('o Space não devolveu event_id (fila indisponível)');
    hfRuns.set(b.event_id, { startedAt: Date.now(), base, apiName });
    return { jobId: String(b.event_id), accepted: desc.accepted, ignored: desc.ignored };
  },
  async poll(cfg, { jobId, fetchImpl }) {
    const run = hfRuns.get(jobId) || { startedAt: Date.now(), base: hfBase(cfg), apiName: String(cfg.apiName || 'predict') };
    const timeout = this.timeoutMs(cfg);
    if (Date.now() - run.startedAt > timeout) { hfRuns.delete(jobId); return { state: 'failed', progress: 0, error: `o Space não concluiu em ${Math.round(timeout / 1000)} s`, result: null }; }
    // Lê o stream por até pollTimeoutMs; sem "complete" no período, a tarefa continua na fila.
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), Number(cfg.pollTimeoutMs) || 5000);
    let text = '';
    try {
      const r = await fetchImpl(`${run.base}/gradio_api/call/${encodeURIComponent(run.apiName)}/${encodeURIComponent(jobId)}`, { headers: { accept: 'text/event-stream', ...hfAuth(cfg) }, signal: ac.signal });
      if (!r.ok) { const err = await errOf(r, 'consulta no Space'); return { state: 'failed', progress: 0, error: err.message, result: null }; }
      text = await r.text();
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return { state: 'running', progress: 0, error: null, result: null };
      return { state: 'failed', progress: 0, error: `falha de rede na consulta ao Space: ${String(e.message || e).slice(0, 200)}`, result: null };
    } finally { clearTimeout(timer); }
    const events = parseSse(text);
    const errorEvent = events.find((e) => e.event === 'error');
    if (errorEvent) { hfRuns.delete(jobId); return { state: 'failed', progress: 0, error: String(errorEvent.data).slice(0, 300), result: null }; }
    const done = events.find((e) => ['complete', 'process_completed'].includes(e.event));
    if (!done) return { state: 'running', progress: 0, error: null, result: null };
    let payload; try { payload = JSON.parse(done.data); } catch { payload = done.data; }
    const data = payload?.data ?? payload?.output?.data ?? payload;
    const result = hfPickResult(data);
    hfRuns.delete(jobId);
    if (payload?.success === false) return { state: 'failed', progress: 0, error: 'o Space relatou falha na geração', result: null };
    if (!result) return { state: 'failed', progress: 0, error: 'o Space concluiu sem devolver vídeo', result: null };
    return { state: 'succeeded', progress: 100, error: null, result };
  },
  async download(cfg, { result, fetchImpl }) {
    const base = hfBase(cfg); const absolute = /^https?:/i.test(String(result));
    const url = absolute ? String(result) : `${base}/gradio_api/file=${String(result)}`;
    // Só baixamos do próprio Space (https; http apenas em loopback com PIPERLINE_ALLOW_LOOPBACK_MEDIA=1, para testes).
    if (!hfFileUrlAllowed(url, base)) throw new Error(`saída do Space fora do host do próprio Space; download recusado (${new URL(url).host})`);
    let r; try { r = await fetchImpl(url, { headers: hfAuth(cfg) }); } catch (e) { throw new Error(`falha ao baixar o vídeo do Space: ${e.message}`); }
    if (!r.ok) throw await errOf(r, 'download do Space');
    const bytes = Buffer.from(await r.arrayBuffer());
    if (!bytes.length) throw new Error('o Space devolveu um vídeo vazio');
    const m = /\.(mp4|webm|mov|gif)(\?|$)/i.exec(url);
    return { bytes, ext: (m?.[1] || 'mp4').toLowerCase() };
  },
  // O Gradio não tem rota de cancelamento por event_id: o adapter NÃO declara cancel (a UI avisa que a fila do Space segue).
};
// ---------------- foto falante: executor LOCAL opcional ----------------
// Comando configurável (Wav2Lip, LivePortrait, SadTalker…), normalmente em GPU. O PiperLine NÃO baixa modelo,
// NÃO instala dependência e NÃO chama a rede: só executa o comando que o usuário escreveu, com os caminhos das
// entradas e da saída. Placeholders: {image} {audio} {out} {workdir}. Sem o comando preenchido, não é usado.
// Como executar o comando local: binário, argumentos e aspas dependem do sistema. Existe separado para
// o teste poder conferir o plano do Windows (PowerShell) rodando em Linux e garantir que nunca sobra
// 'bash' apontando para o WSL. `cfg.shell` do usuário continua mandando quando ele escolhe outro shell.
export function localShellPlan(shell, platform = process.platform) {
  const bin = String(shell || '').trim() || (platform === 'win32' ? 'powershell' : 'bash');
  const windows = platform === 'win32';
  const powershell = /(^|[\\/])(pwsh|powershell)(\.exe)?$/i.test(bin);
  const cmdExe = /(^|[\\/])cmd(\.exe)?$/i.test(bin);
  const argsFor = (cmd) => (powershell ? ['-NoProfile', '-Command', cmd] : cmdExe ? ['/d', '/s', '/c', cmd] : ['-lc', cmd]);
  // aspas: POSIX usa '...' (com '\\'' para aspas internas); PowerShell/cmd usam "..." (com "" dobrado)
  const quote = windows ? (v) => `"${String(v).replace(/"/g, '""')}"` : (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
  // Rodada 11: no PowerShell um comando que COMEÇA com aspas é lido como EXPRESSÃO (a string), não como
  // chamada — e o parser morre com "Token inesperado na expressão" antes de executar qualquer coisa.
  // Acontece com o comando natural de quem tem caminho com espaço: "C:\Program Files\...\node.exe" "script.mjs".
  // O operador de chamada (&) resolve sem mexer no resto da linha: & "...\node.exe" "script.mjs" ...
  // (cmd.exe e POSIX não precisam: lá as aspas só agrupam o primeiro token.)
  const prepare = (cmd) => (powershell && /^\s*["']/.test(String(cmd)) ? `& ${String(cmd).trim()}` : cmd);
  return { bin, windows, powershell, cmdExe, argsFor, quote, prepare };
}
const localRuns = new Map(); // jobId → { child, out, log, startedAt, state, error, cancelRequested }
const localCommand = {
  label: 'Executor local (comando configurável: Wav2Lip/LivePortrait em GPU) — sem download automático de modelo',
  local: true,
  requiresTaskConsent: true,
  freeExecution: true,
  configured: (cfg) => !!String(cfg?.command || '').trim(),
  describe(cfg, req = {}) {
    const accepted = []; const ignored = [];
    for (const k of ['image', 'audio']) if (req[k]) accepted.push(k);
    for (const k of ['text', 'voice', 'gesture']) if (req[k]) ({ accepted, ignored })[/\{(?:text|voice|gesture)\}/.test(String(cfg?.command || '')) ? 'accepted' : 'ignored'].push(k);
    for (const k of Object.keys(req.params || {})) (new RegExp(`\\{${k}\\}`).test(String(cfg?.command || '')) ? accepted : ignored).push(`param:${k}`);
    return { accepted, ignored };
  },
  estimate() { return { known: true, amount: 0, currency: null, basis: 'execução local: sem cobrança; o custo é o uso da sua máquina/GPU' }; },
  limits(cfg) { return { maxAudioSeconds: Number(cfg?.maxAudioSeconds) > 0 ? Number(cfg.maxAudioSeconds) : 120 }; },
  timeoutMs(cfg) { return Math.max(300_000, Number(cfg?.timeoutMs) || 0); },
  async submit(cfg, { image, audio }) {
    const [fs, os, path, cp] = await Promise.all([import('node:fs'), import('node:os'), import('node:path'), import('node:child_process')]);
    const command = String(cfg?.command || '').trim();
    if (!command) throw new Error('executor local sem comando configurado');
    if (!image?.bytes || !audio?.bytes) throw new Error('imagem/áudio de entrada ausentes');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-lipsync-'));
    const imagePath = path.join(dir, `foto${/png/i.test(image.mime || '') ? '.png' : '.jpg'}`);
    const audioPath = path.join(dir, `audio${/wav/i.test(audio.mime || '') ? '.wav' : /mpeg|mp3/i.test(audio.mime || '') ? '.mp3' : '.wav'}`);
    const out = path.join(dir, 'saida.mp4'); const log = path.join(dir, 'execucao.log');
    fs.writeFileSync(imagePath, Buffer.from(image.bytes)); fs.writeFileSync(audioPath, Buffer.from(audio.bytes));
    // Shell e aspas por sistema (plano testável em localShellPlan): no Windows, 'bash' cai no WSL
    // (bash.exe do System32) e o comando falha com "CreateProcessCommon"; lá o padrão é PowerShell.
    const plan = localShellPlan(cfg?.shell);
    const cmd = plan.prepare(command.replace(/\{(image|audio|out|workdir)\}/g, (_, k) => plan.quote({ image: imagePath, audio: audioPath, out, workdir: dir }[k])));
    const fd = fs.openSync(log, 'w');
    let child;
    try { child = cp.spawn(plan.bin, plan.argsFor(cmd), { cwd: dir, stdio: ['ignore', fd, fd] }); }
    catch (e) { fs.closeSync(fd); throw new Error(`não foi possível executar o comando local: ${e.message}`); }
    finally { try { fs.closeSync(fd); } catch {} }
    const jobId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { child, out, log, dir, startedAt: Date.now(), state: 'running', error: null, exitCode: null };
    localRuns.set(jobId, entry);
    child.on('error', (e) => { entry.state = 'failed'; entry.error = `falha ao iniciar o comando local: ${e.message}`; });
    child.on('close', (code) => { entry.exitCode = code; if (entry.cancelRequested) { entry.state = 'failed'; entry.error = 'cancelada pelo usuário'; return; } if (code === 0) entry.state = 'done'; else { entry.state = 'failed'; entry.error = `o comando local terminou com código ${code}`; } });
    return { jobId, accepted: ['image', 'audio'], ignored: [] };
  },
  async poll(cfg, { jobId }) {
    const entry = localRuns.get(jobId);
    if (!entry) return { state: 'failed', progress: 0, error: 'execução local não encontrada (o app foi reiniciado?)', result: null };
    const timeout = this.timeoutMs(cfg);
    if (entry.state === 'running' && Date.now() - entry.startedAt > timeout) {
      try { entry.child.kill('SIGTERM'); } catch {}
      localRuns.delete(jobId); return { state: 'failed', progress: 0, error: `o comando local não terminou em ${Math.round(timeout / 1000)} s`, result: null };
    }
    if (entry.state === 'running') return { state: 'running', progress: 0, error: null, result: null };
    if (entry.state === 'failed') {
      let tail = ''; try { tail = (await import('node:fs')).readFileSync(entry.log, 'utf8').trim().split('\n').slice(-3).join(' | ').slice(-300); } catch {}
      localRuns.delete(jobId); return { state: 'failed', progress: 0, error: `${entry.error}${tail ? `: ${tail}` : ''}`, result: null };
    }
    localRuns.delete(jobId);
    return { state: 'succeeded', progress: 100, error: null, result: entry.out };
  },
  async download(cfg, { result }) {
    const fs = await import('node:fs');
    if (!result || !fs.existsSync(result)) throw new Error('o comando local terminou sem gerar o arquivo de saída');
    const bytes = fs.readFileSync(result); if (!bytes.length) throw new Error('o comando local gerou um arquivo vazio');
    return { bytes, ext: 'mp4' };
  },
  async cancel(cfg, { jobId }) {
    const entry = localRuns.get(jobId); if (!entry) return { requested: false };
    entry.cancelRequested = true; try { entry.child.kill('SIGTERM'); } catch {}
    return { requested: true };
  },
};

export const ADAPTERS = { video: { 'openai-videos': openaiVideos, replicate }, audio: { 'openai-speech': openaiSpeech, 'sapi-local': sapiLocal }, image: { 'openai-images': openaiImages }, talkingphoto: { 'replicate-lipsync': lipsyncReplicate, 'huggingface-space': huggingFaceSpace, 'local-command': localCommand } };
export const KINDS = Object.keys(ADAPTERS);
export const adapterFor = (kind, name) => ADAPTERS[kind]?.[name] || null;
// configuração salva: settings.providers[kind] = { adapter, baseUrl, model, apiKey, ... } (+ migração do antigo settings.imageProvider)
export function resolveProviders(settings = {}) {
  const p = { ...(settings.providers || {}) };
  if (!p.image && settings.imageProvider?.baseUrl && settings.imageProvider?.model) p.image = { adapter: 'openai-images', ...settings.imageProvider };
  return p;
}
export const isConfigured = (cfg, kind) => {
  const a = cfg?.adapter ? adapterFor(kind, cfg.adapter) : null; if (!a) return false;
  if (typeof a.configured === 'function') return a.configured(cfg); // adaptadores com contrato próprio (Space local/remoto, comando local)
  return a.local ? true : (!!cfg.baseUrl && !!cfg.model);
};
export function publicProviders(settings) {
  const p = resolveProviders(settings);
  return Object.fromEntries(KINDS.map((k) => [k, { configured: isConfigured(p[k], k), adapter: p[k]?.adapter || null, baseUrl: p[k]?.baseUrl || '', model: p[k]?.model || '', hasKey: !!p[k]?.apiKey, voice: p[k]?.voice || '', costPerSecond: p[k]?.costPerSecond ?? '', currency: p[k]?.currency || '', maxCostPerTask: p[k]?.maxCostPerTask ?? '', maxAudioSeconds: p[k]?.maxAudioSeconds ?? '', inputMap: p[k]?.inputMap || null, paramMap: p[k]?.paramMap || null, space: p[k]?.space || '', apiName: p[k]?.apiName || '', command: p[k]?.command || '', fields: p[k]?.fields || null, needsToken: !!(p[k]?.adapter === 'huggingface-space' ? !(p[k]?.apiKey || process.env.HF_TOKEN) : false), adapters: Object.entries(ADAPTERS[k]).map(([id, a]) => ({ id, label: a.label })) }]));
}
export function validateConfig(kind, b) {
  if (!ADAPTERS[kind]) return 'tipo de provedor inválido'; if (!adapterFor(kind, b.adapter)) return `adaptador inválido para ${kind}`;
  const a = adapterFor(kind, b.adapter);
  if (a.local) return String(b.command || '').trim() || b.adapter !== 'local-command' ? null : 'informe o comando do executor local (use {image}, {audio} e {out})';
  if (kind === 'talkingphoto' && b.adapter === 'huggingface-space') {
    const space = String(b.space || '').trim(); const base = String(b.baseUrl || '').trim();
    if (!base && !/^[\w.-]+\/[\w.-]+$/.test(space)) return 'informe o Space do Hugging Face no formato dono/space (ou uma baseUrl do Space)';
    if (base && !/^https?:\/\/[^\s]+$/i.test(base)) return 'baseUrl inválida (use http(s)://…)';
    if (b.fields && (typeof b.fields !== 'object' || Array.isArray(b.fields))) return 'fields deve ser um objeto {campo: índice}';
    return null;
  }
  if (!/^https?:\/\/[^\s]+$/i.test(String(b.baseUrl || ''))) return 'baseUrl inválida (use http(s)://…)'; if (!String(b.model || '').trim()) return 'informe o modelo';
  if (b.inputMap && (typeof b.inputMap !== 'object' || Array.isArray(b.inputMap))) return 'inputMap deve ser um objeto';
  if (b.paramMap && (typeof b.paramMap !== 'object' || Array.isArray(b.paramMap))) return 'paramMap deve ser um objeto';
  const has = (v) => v !== undefined && v !== null && v !== ''; const num = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
  if (has(b.costPerSecond) && !num(b.costPerSecond)) return 'custo por segundo inválido (número ≥ 0)'; if (has(b.costPerSecond) && !/^[A-Za-z]{3}$/.test(String(b.currency || ''))) return 'informe a moeda (3 letras, ex.: USD) junto com o custo por segundo';
  if (has(b.maxCostPerTask) && !num(b.maxCostPerTask)) return 'limite de custo por tarefa inválido (número ≥ 0)'; if (has(b.maxAudioSeconds) && !(Number(b.maxAudioSeconds) >= 1 && Number(b.maxAudioSeconds) <= 300)) return 'duração máxima do áudio deve estar entre 1 e 300 s';
  return null;
}
