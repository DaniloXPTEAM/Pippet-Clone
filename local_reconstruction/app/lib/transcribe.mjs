// Transcrição por trechos (usada nas legendas automáticas e no corte por transcrição).
// Regras LOCAIS, todas determinísticas e testáveis sem rede:
//  - o áudio é extraído em 16 kHz mono (o formato que o Whisper espera) e cortado em trechos de até 25 s,
//    porque a Cloudflare limita o tamanho do áudio por requisição;
//  - a resposta da Cloudflare é `{result:{text, words:[{word,start,end}]}}` — `words` é opcional;
//  - as legendas são montadas por palavras quando existem (melhor sincronia) e por frase quando não;
//  - o corte por transcrição mantém as falas e remove as pausas longas (limiar configurável).
// Os limites do serviço real (duração máxima aceita por requisição, precisão dos tempos) NÃO foram observados;
// por isso os valores abaixo são conservadores e ficam declarados na resposta da API.
export const MAX_CHUNK_MS = 25_000;
export const TRANSCRIBE_SAMPLE_RATE = 16_000;

// Divide a duração total em trechos contíguos de até `maxMs` (o último pode ser menor).
export function planChunks(totalMs, maxMs = MAX_CHUNK_MS) {
  const total = Math.max(0, Math.round(Number(totalMs) || 0));
  const size = Math.max(1_000, Math.round(Number(maxMs) || MAX_CHUNK_MS));
  if (!total) return [];
  const chunks = [];
  for (let start = 0; start < total; start += size) chunks.push({ startMs: start, endMs: Math.min(total, start + size) });
  return chunks;
}

// ffmpeg: extrai só o áudio do trecho, mono, 16 kHz, PCM 16 bits (WAV) — o formato aceito pelo Whisper.
export function extractChunkArgs(src, out, { startMs = 0, endMs = null } = {}) {
  const args = ['-y'];
  if (startMs > 0) args.push('-ss', (startMs / 1000).toFixed(3));
  args.push('-i', src, '-vn', '-ac', '1', '-ar', String(TRANSCRIBE_SAMPLE_RATE));
  if (endMs != null && endMs > startMs) args.push('-t', ((endMs - startMs) / 1000).toFixed(3));
  args.push('-c:a', 'pcm_s16le', out);
  return args;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
// Normaliza a resposta do Whisper (Cloudflare, ou o formato "cru" {text, words}). Devolve segundos.
export function normalizeTranscription(json) {
  const result = json?.result && typeof json.result === 'object' ? json.result : json || {};
  const text = typeof result.text === 'string' ? result.text.trim() : '';
  const words = Array.isArray(result.words) ? result.words : [];
  const clean = words
    .map((w) => ({ word: String(w?.word ?? w?.text ?? '').trim(), start: num(w?.start), end: num(w?.end) }))
    .filter((w) => w.word && w.start != null && w.end != null && w.end >= w.start)
    .map((w) => ({ word: w.word, start: w.start, end: w.end }));
  return { text, words: clean };
}

// Soma o deslocamento do trecho às palavras e ordena.
export function offsetWords(words, offsetSeconds = 0) {
  const off = Number(offsetSeconds) || 0;
  return (words || []).map((w) => ({ ...w, start: Math.round((w.start + off) * 1000) / 1000, end: Math.round((w.end + off) * 1000) / 1000 }));
}

// Legenda por palavras: agrupa até `maxChars`/`maxGap` e devolve faixas de tempo.
export function cuesFromWords(words, { maxChars = 42, maxGap = 0.6, maxDuration = 6 } = {}) {
  const cues = [];
  let cur = null;
  for (const w of words || []) {
    if (!w?.word) continue;
    const gap = cur ? w.start - cur.end : Infinity;
    const tooLong = cur ? cur.text.length + 1 + w.word.length > maxChars || w.end - cur.start > maxDuration : true;
    if (!cur || gap > maxGap || tooLong) {
      if (cur) cues.push(cur);
      cur = { start: w.start, end: w.end, text: w.word };
    } else {
      cur.text += (cur.text.endsWith(' ') ? '' : ' ') + w.word;
      cur.end = w.end;
    }
  }
  if (cur) cues.push(cur);
  return cues.map((c) => ({ start: Math.max(0, Math.round(c.start * 100) / 100), end: Math.round(c.end * 100) / 100, text: c.text.replace(/\s+/g, ' ').trim() }));
}

// Sem palavras (só texto): uma legenda por trecho, distribuída pela duração conhecida do trecho.
export function cuesFromText(text, { startSeconds = 0, durationSeconds = 0 } = {}) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const sentences = t.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  const parts = sentences.length ? sentences : [t];
  const total = Math.max(0.5, Number(durationSeconds) || 0);
  const step = total / parts.length;
  return parts.map((p, i) => ({ start: Math.round((startSeconds + i * step) * 100) / 100, end: Math.round((startSeconds + (i + 1) * step) * 100) / 100, text: p }));
}

const srtTime = (seconds) => {
  const ms = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0');
  const r = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${r}`;
};
export function toSrt(cues) {
  return (cues || [])
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${String(c.text || '').trim()}\n`)
    .join('\n');
}

// Corte por transcrição: mantém as falas (com folga) e remove pausas maiores que `minGapMs`.
// Devolve faixas [início, fim] em SEGUNDOS, relativas ao início do clipe analisado.
export function keepRangesFromWords(words, { totalSeconds = 0, padMs = 120, minGapMs = 600 } = {}) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const pad = Math.max(0, Number(padMs) || 0) / 1000;
  const minGap = Math.max(0, Number(minGapMs) || 0) / 1000;
  const list = (words || []).filter((w) => w?.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start);
  if (!list.length) return [];
  const ranges = [];
  for (const w of list) {
    const start = Math.max(0, w.start - pad);
    const end = total ? Math.min(total, w.end + pad) : w.end + pad;
    const last = ranges[ranges.length - 1];
    if (last && start - last[1] <= minGap) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }
  return ranges.map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]).filter(([a, b]) => b > a);
}

// Converte faixas relativas (do clipe) em clipes da timeline, preservando in/out absolutos do arquivo.
export function clipSegments(clip, ranges, { speed = 1 } = {}) {
  const t0 = Number(clip.in) || 0;
  const sp = Number(speed) || 1;
  return ranges.map(([a, b]) => ({ ...clip, in: Math.round((t0 + a) * 100) / 100, out: Math.round((t0 + b) * 100) / 100, speed: sp }));
}
