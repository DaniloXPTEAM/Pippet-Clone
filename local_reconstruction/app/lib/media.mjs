// Operacoes reais de midia via ffmpeg/ffprobe: sonda, geracao local (NAO e IA), ultimo quadro, concatenacao e exportacao de timeline.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const WINGET = 'C:/Users/Dannilo/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin';
function find(bin) {
  if (process.env['PIPPIT_' + bin.toUpperCase()]) return process.env['PIPPIT_' + bin.toUpperCase()];
  const t = spawnSync(bin, ['-version'], { encoding: 'utf8' }); if (!t.error) return bin;
  const w = path.join(WINGET, bin + '.exe'); return fs.existsSync(w) ? w : null;
}
export const FFMPEG = find('ffmpeg'), FFPROBE = find('ffprobe');
export const available = () => !!(FFMPEG && FFPROBE);
function run(bin, args) { const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'ffmpeg falhou').split('\n').slice(-6).join('\n')); return r.stdout; }
export function probe(file) {
  const j = JSON.parse(run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]));
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  const [fn, fd] = String(v?.avg_frame_rate || '0/1').split('/').map(Number);
  return { duration: Number(j.format.duration || 0), width: v?.width || null, height: v?.height || null, hasVideo: !!v, hasAudio: !!a, codec: v?.codec_name || a?.codec_name, fps: fd ? Math.round((fn / fd) * 100) / 100 : null, container: j.format.format_name || null };
}
// Opcoes do dialogo "Export settings" observado (PIPPIT_CAPTURE_STATUS.md): resolucao, qualidade, taxa de quadros, formato, marca d'agua.
export const EXPORT_OPTIONS = {
  resolution: { '360p': 360, '480p': 480, '720p': 720, '1080p': 1080, '2k': 1440, '4k': 2160 }, // lado menor; "2k" = 1440 (UNOBSERVED o valor exato do original)
  quality: { better: { crf: 18, preset: 'slow' }, recommended: { crf: 23, preset: 'medium' }, faster: { crf: 28, preset: 'veryfast' } }, // mapeamento para x264 e local
  fps: [24, 25, 30, 50, 60], format: { mp4: 'mp4', mov: 'mov' }, defaults: { resolution: '720p', quality: 'recommended', fps: 30, format: 'mp4', watermark: true },
};
export function normalizeExportOptions(o = {}) {
  const d = EXPORT_OPTIONS.defaults; const r = { ...d, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) };
  r.fps = Number(r.fps); r.watermark = r.watermark === true || r.watermark === 'with' || r.watermark === 'true'; r.format = String(r.format).toLowerCase(); r.resolution = String(r.resolution).toLowerCase(); r.quality = String(r.quality).toLowerCase();
  if (!EXPORT_OPTIONS.resolution[r.resolution]) throw new Error('resolucao invalida'); if (!EXPORT_OPTIONS.quality[r.quality]) throw new Error('qualidade invalida'); if (!EXPORT_OPTIONS.fps.includes(r.fps)) throw new Error('taxa de quadros invalida'); if (!EXPORT_OPTIONS.format[r.format]) throw new Error('formato invalido');
  return r;
}
// Reencoda o resultado conforme as opcoes (escala pelo lado menor mantendo a proporcao, fps, qualidade, formato e marca d'agua opcional).
export function finalize(src, out, opts) {
  const o = normalizeExportOptions(opts); const p = probe(src); const short = Math.min(p.width, p.height); const f = EXPORT_OPTIONS.resolution[o.resolution] / short;
  const ev = (n) => Math.max(2, Math.round((n * f) / 2) * 2); const vf = [`scale=${ev(p.width)}:${ev(p.height)}:flags=lanczos`, `fps=${o.fps}`];
  if (o.watermark) vf.push(`drawtext=fontfile='${FONT}':text='Pippit':x=w-text_w-16:y=h-text_h-16:fontsize=${Math.max(14, Math.round(EXPORT_OPTIONS.resolution[o.resolution] / 24))}:fontcolor=white@0.7:box=1:boxcolor=black@0.35`);
  const q = EXPORT_OPTIONS.quality[o.quality]; const args = ['-y', '-i', src, '-vf', vf.join(','), '-c:v', 'libx264', '-preset', q.preset, '-crf', String(q.crf), '-pix_fmt', 'yuv420p'];
  if (p.hasAudio) args.push('-c:a', 'aac'); else args.push('-an'); args.push('-f', EXPORT_OPTIONS.format[o.format], out); run(FFMPEG, args); return { ...probe(out), options: o };
}
const RATIOS = { '9:16': [720, 1280], '16:9': [1280, 720], '1:1': [720, 720], '3:4': [720, 960], '4:3': [960, 720], '2:1': [1280, 640], '21:9': [1280, 548] };
export const sizeFor = (ratio) => RATIOS[ratio] || RATIOS['9:16'];
// Seletor "Ratio" do editor do Pippit (captures/auth/cdp/t_editor/editor_ratio.png): "Original aspect ratio" (padrão) + 16:9 (YouTube ads), 4:3 (LinkedIn ads, Facebook videos), 2:1, 9:16 (TikTok, TikTok ads, Instagram stories), 1:1 (Instagram posts), 3:4. 21:9 existe só nos estúdios/agente locais.
export const EDITOR_RATIOS = [{ id: 'original', label: 'Original aspect ratio' }, { id: '16:9', label: '16:9', hint: 'YouTube ads' }, { id: '4:3', label: '4:3', hint: 'LinkedIn ads, Facebook videos' }, { id: '2:1', label: '2:1' }, { id: '9:16', label: '9:16', hint: 'TikTok, TikTok ads, Instagram stories' }, { id: '1:1', label: '1:1', hint: 'Instagram posts' }, { id: '3:4', label: '3:4' }];
export const validRatio = (r) => r === 'original' || Object.hasOwn(RATIOS, r);
// "Original": proporção do primeiro clipe (lado menor = 720, dimensões pares); sem clipes de vídeo legíveis cai em 9:16
export function sizeForTimeline(tl, resolve) {
  if ((tl.ratio || '9:16') !== 'original') return sizeFor(tl.ratio || '9:16');
  const first = tl.clips?.[0]; const p = first ? probe(resolve(first.assetId)) : null; if (!p?.width || !p?.height) return RATIOS['9:16'];
  const k = 720 / Math.min(p.width, p.height); const even = (x) => Math.max(2, Math.round(x / 2) * 2); return [even(p.width * k), even(p.height * k)];
}
// Provedor LOCAL (nao-IA): cartao de cor (ou imagem de referencia com zoom lento) com duracao e proporcao pedidas.
export function generateLocalVideo(out, { seconds = 5, ratio = '9:16', image = null, color = '1b1b2f', caption = null }) {
  const [w, h] = sizeFor(ratio); const fps = 25; const frames = Math.max(1, Math.round(seconds * fps));
  const cap = caption ? wrapCaption(caption, ratio).map((ln, i, a) => `drawtext=fontfile='${FONT}':text='${esc(ln)}':x=(w-text_w)/2:y=h*0.5+${(i - (a.length - 1) / 2) * 52}:fontsize=38:fontcolor=white:box=1:boxcolor=black@0.45`).join(',') : '';
  if (image) {
    run(FFMPEG, ['-y', '-loop', '1', '-i', image, '-vf', `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z='min(zoom+0.0008,1.2)':d=${frames}:s=${w}x${h}:fps=${fps}${cap ? ',' + cap : ''}`, '-t', String(seconds), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', out]);
  } else {
    run(FFMPEG, ['-y', '-f', 'lavfi', '-i', `color=c=0x${color}:s=${w}x${h}:r=${fps}:d=${seconds}`, ...(cap ? ['-vf', cap] : []), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', out]);
  }
  return probe(out);
}
// quebra a legenda do storyboard em linhas curtas (ate 5) para caber no cartao
function wrapCaption(text, ratio) {
  const max = ratio === '16:9' || ratio === '21:9' ? 44 : 24; const words = String(text).replace(/\s+/g, ' ').trim().split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur);
  return lines.slice(0, 5).map((l, i, a) => (i === 4 && lines.length > 5 ? l + '…' : l));
}
export function lastFrame(video, out) { run(FFMPEG, ['-y', '-sseof', '-0.1', '-i', video, '-frames:v', '1', out]); return out; }
// Ferramentas de no que NAO dependem de IA (Extrair quadro, Cortar, Extrair audio, Recortar, Girar). Cada uma gera um arquivo novo (nao destrutivo).
export function extractFrameAt(video, out, t) { run(FFMPEG, ['-y', '-ss', String(Math.max(0, t)), '-i', video, '-frames:v', '1', out]); return out; }
export function trimVideo(video, out, start, end) {
  const p = probe(video); const a = Math.max(0, start || 0), b = Math.min(p.duration, end || p.duration); if (!(b > a)) throw new Error('intervalo de corte invalido');
  run(FFMPEG, ['-y', '-i', video, '-ss', String(a), '-to', String(b), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', ...(p.hasAudio ? ['-c:a', 'aac'] : ['-an']), out]); return probe(out);
}
// Voz sintetica LOCAL (Windows SAPI via PowerShell; NAO e IA generativa nem o Seed Audio do Pippit). Texto e voz passam por variaveis de ambiente (sem interpolacao no comando).
let ttsOk;
export function ttsAvailable() { if (ttsOk === undefined) { ttsOk = process.platform === 'win32' && !spawnSync('powershell', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Speech'], { encoding: 'utf8' }).status ? true : false; } return ttsOk; }
export function ttsVoices() {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }; $s.Dispose()'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : [];
}
export function ttsLocal(text, out, { voice, rate } = {}) {
  const script = 'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; if ($env:PIPPIT_TTS_VOICE) { $s.SelectVoice($env:PIPPIT_TTS_VOICE) }; $s.Rate = [int]$env:PIPPIT_TTS_RATE; $s.SetOutputToWaveFile($env:PIPPIT_TTS_OUT); $s.Speak($env:PIPPIT_TTS_TEXT); $s.Dispose()';
  const r = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8', env: { ...process.env, PIPPIT_TTS_TEXT: String(text).slice(0, 2000), PIPPIT_TTS_VOICE: voice || '', PIPPIT_TTS_RATE: String(Math.max(-10, Math.min(10, Number(rate) || 0))), PIPPIT_TTS_OUT: out } });
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error('voz local falhou: ' + (r.stderr || r.stdout || '').slice(0, 200)); return probe(out);
}
// Silencios (ffmpeg silencedetect). Devolve [{start, end}] em segundos do arquivo; um silencio final sem "end" vai ate a duracao.
export function detectSilences(file, { noiseDb = -30, minSilence = 0.5 } = {}) {
  const dur = probe(file).duration; const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilence}`, '-vn', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = []; let cur = null;
  for (const line of String(r.stderr).split(/\r?\n/)) {
    const st = /silence_start: (-?[\d.]+)/.exec(line); if (st) { cur = { start: Math.max(0, Number(st[1])) }; continue; }
    const en = /silence_end: (-?[\d.]+)/.exec(line); if (en && cur) { cur.end = Number(en[1]); out.push(cur); cur = null; }
  }
  if (cur) { cur.end = dur; out.push(cur); } return out;
}
// Trechos COM fala/som dentro de [t0, t1], removendo silencios com margem `pad` (s) em cada ponta; descarta trechos menores que minKeep.
export function speechRanges(silences, t0, t1, { pad = 0.1, minKeep = 0.2 } = {}) {
  const ranges = []; let cursor = t0;
  for (const sl of silences) { if (sl.end <= t0 || sl.start >= t1) continue; const a = Math.max(sl.start, t0), b = Math.min(sl.end, t1); if (a - cursor > 0) ranges.push([cursor, Math.min(a + pad, b)]); cursor = Math.max(b - pad, a); }
  if (t1 - cursor > 0) ranges.push([cursor, t1]);
  return ranges.filter(([x, y]) => y - x >= minKeep).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
}
// Transcricao legivel como SRT via whisper.cpp embutido no ffmpeg (filtro `whisper`). Exige um modelo ggml (ex.: ggml-base.bin) baixado pelo usuario.
export function whisperArgs(src, srt, { model, language = 'auto', queue = 10 }) {
  const esc2 = (x) => String(x).split('\\').join('/').split(':').join('\\:').split("'").join("\\'");
  return ['-y', '-i', src, '-vn', '-af', `whisper=model='${esc2(model)}':language=${language}:queue=${queue}:destination='${esc2(srt)}':format=srt`, '-f', 'null', '-'];
}
export function whisperAvailable() { return !!FFMPEG && /\bwhisper\b/.test(spawnSync(FFMPEG, ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || ''); }
export function transcribeSrt(src, srt, opts) { run(FFMPEG, whisperArgs(src, srt, opts)); return fs.readFileSync(srt, 'utf8'); }
export function parseSrt(text) {
  return String(text).replace(/\r/g, '').split(/\n\n+/).map((b) => b.split('\n')).filter((l) => l.length >= 3).map((l) => { const m = /(\d+):(\d+):(\d+)[,.](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)/.exec(l[1]); if (!m) return null; const t = (h, mi, se, ms) => Number(h) * 3600 + Number(mi) * 60 + Number(se) + Number(ms) / 1000; return { start: t(m[1], m[2], m[3], m[4]), end: t(m[5], m[6], m[7], m[8]), text: l.slice(2).join(' ').trim() }; }).filter(Boolean);
}
export function extractAudio(video, out) { if (!probe(video).hasAudio) throw new Error('o video nao tem faixa de audio'); run(FFMPEG, ['-y', '-i', video, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', out]); return probe(out); }
// "Melhorar qualidade" (video) e "Amplificar" (imagem) CONVENCIONAIS: ampliacao 2x (lanczos) + reducao de ruido leve + nitidez. NAO e o upscaler de IA do Pippit.
export function enhanceMedia(file, out, isVideo) {
  const p = probe(file); const w = Math.min(p.width * 2, 3840), h = Math.min(p.height * 2, 3840); const ev = (n) => Math.max(2, Math.round(n / 2) * 2);
  const vf = `scale=${ev(w)}:${ev(h)}:flags=lanczos,${isVideo ? 'hqdn3d=1.5:1.5:6:6,' : ''}unsharp=5:5:0.8:5:5:0.0`;
  run(FFMPEG, ['-y', '-i', file, '-vf', vf, ...(isVideo ? ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy'] : ['-frames:v', '1']), out]); return probe(out);
}
export function cropToRatio(file, out, ratio, isVideo) {
  const p = probe(file); const [rw, rh] = String(ratio).split(':').map(Number); if (!(rw > 0 && rh > 0)) throw new Error('proporcao invalida');
  const target = rw / rh; const cur = p.width / p.height; const w = cur > target ? Math.round((p.height * target) / 2) * 2 : p.width; const h = cur > target ? p.height : Math.round((p.width / target) / 2) * 2;
  run(FFMPEG, ['-y', '-i', file, '-vf', `crop=${w}:${h}`, ...(isVideo ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'copy'] : ['-frames:v', '1']), out]); return probe(out);
}
export function rotateMedia(file, out, degrees, isVideo) {
  const f = { 90: 'transpose=1', 180: 'transpose=1,transpose=1', 270: 'transpose=2' }[degrees]; if (!f) throw new Error('angulo invalido (90, 180 ou 270)');
  run(FFMPEG, ['-y', '-i', file, '-vf', f, ...(isVideo ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'copy'] : ['-frames:v', '1']), out]); return probe(out);
}
export function concat(files, out) {
  const list = out + '.txt'; fs.writeFileSync(list, files.map((f) => "file '" + f.split('\\').join('/').split("'").join("'"+"\\"+"''") + "'").join(String.fromCharCode(10)));
  run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', '-an', out]); fs.unlinkSync(list); return probe(out);
}
const FONT = 'C\\:/Windows/Fonts/arial.ttf';
const BS = String.fromCharCode(92);
const esc = (s) => String(s).split(BS).join(BS + BS).split(':').join(BS + ':').split("'").join('’').split('%').join(BS + '%');
// Exporta a timeline: clipes (trim in/out, velocidade, audio proprio do clipe com volume dB/fade/reducao de ruido/mudo), plano de fundo (preto/cor/desfoque),
// proporcao, textos/legendas manuais com janela de tempo e faixas de audio. O audio dos clipes so entra se algum clipe tiver faixa de audio e nao estiver mudo.
const atempoChain = (sp) => { const f = []; let x = sp; while (x > 2) { f.push('atempo=2'); x /= 2; } while (x < 0.5) { f.push('atempo=0.5'); x *= 2; } f.push(`atempo=${x}`); return f; };
export function exportTimeline(tl, resolve, out) {
  const [w, h] = sizeForTimeline(tl, resolve); const parts = [], aparts = [], tmp = []; let clipAudio = false; const bg = tl.background || { type: 'black' }; const dir = path.dirname(out); const stamp = Date.now();
  const color = /^[0-9a-fA-F]{6}$/.test(bg.color || '') ? bg.color : '000000';
  tl.clips.forEach((c, i) => {
    const src = resolve(c.assetId); const p = probe(src); const t0 = c.in || 0; const t1 = c.out || p.duration; const sp = c.speed || 1; const d = (t1 - t0) / sp;
    const f = path.join(dir, `_seg${i}_${stamp}.mp4`); tmp.push(f);
    if (!p.hasVideo) { if (p.hasAudio) throw new Error('clipe somente de audio na faixa de video: use a faixa de audio'); throw new Error('clipe sem video'); }
    const base = `trim=start=${t0}:end=${t1},setpts=PTS-STARTPTS,setpts=PTS/${sp}`;
    // "Câmera lenta suave" (painel Velocidade): interpolação de quadros do ffmpeg ao desacelerar; "Tom" ligado: a altura do áudio acompanha a velocidade (decisão local, o Pippit não detalha)
    const smooth = !!c.smoothSlow && sp < 1; const baseV = smooth ? `${base},minterpolate=fps=25:mi_mode=mci:mc_mode=aobmc:vsbmc=1` : base;
    if (bg.type === 'blur') {
      const fc = `[0:v]${baseV},split[a][b];[a]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:5[bg];[b]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=25[v]`;
      run(FFMPEG, ['-y', '-i', src, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', f]);
    } else {
      const vf = [baseV, `scale=${w}:${h}:force_original_aspect_ratio=decrease`, `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x${color}`, 'setsar=1', 'fps=25'];
      run(FFMPEG, ['-y', '-i', src, '-vf', vf.join(','), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', f]);
    }
    parts.push(f);
    const wav = path.join(dir, `_aud${i}_${stamp}.wav`); tmp.push(wav);
    if (p.hasAudio && !c.mute) {
      const fi = Math.max(0, Number(c.fadeIn) || 0), fo = Math.max(0, Number(c.fadeOut) || 0);
      const af = [`atrim=start=${t0}:end=${t1}`, 'asetpts=PTS-STARTPTS', ...(c.pitch && sp !== 1 ? ['aresample=44100', `asetrate=${Math.round(44100 * sp)}`, 'aresample=44100'] : atempoChain(sp)), ...(c.denoise ? ['afftdn'] : []), `volume=${Number(c.volumeDb) || 0}dB`, ...(fi ? [`afade=t=in:st=0:d=${fi}`] : []), ...(fo ? [`afade=t=out:st=${Math.max(0, d - fo)}:d=${fo}`] : [])];
      run(FFMPEG, ['-y', '-i', src, '-vn', '-af', af.join(','), '-ar', '44100', '-ac', '2', '-t', String(d), wav]); clipAudio = true;
    } else run(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(d), wav]);
    aparts.push(wav);
  });
  const joined = out + '.join.mp4'; concat(parts, joined); tmp.push(joined);
  let clipWav = null; if (clipAudio) { const list = out + '.alist.txt'; tmp.push(list); fs.writeFileSync(list, aparts.map((x) => "file '" + x.split(BS).join('/') + "'").join(String.fromCharCode(10))); clipWav = out + '.clip.wav'; tmp.push(clipWav); run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', clipWav]); }
  const draw = (tl.texts || []).map((t) => `drawtext=fontfile='${FONT}':text='${esc(t.text)}':x=(w-text_w)/2:y=${t.y ?? 'h*0.8'}:fontsize=${t.size || 42}:fontcolor=${t.color || 'white'}:box=1:boxcolor=black@0.5:enable='between(t,${t.start || 0},${t.end || 9999})'`);
  const caps = (tl.captions || []).map((t) => `drawtext=fontfile='${FONT}':text='${esc(t.text)}':x=(w-text_w)/2:y=h*0.85:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6:enable='between(t,${t.start},${t.end})'`);
  const filters = [...draw, ...caps];
  const ains = [...(clipWav ? [{ file: clipWav, volume: 1, start: 0 }] : []), ...(tl.audio || []).map((a) => ({ file: resolve(a.assetId), volume: a.volume ?? 1, start: a.start || 0 }))];
  const args = ['-y', '-i', joined]; ains.forEach((a) => args.push('-i', a.file));
  const fc = []; if (filters.length) fc.push(`[0:v]${filters.join(',')}[v]`);
  if (ains.length) { ains.forEach((a, i) => fc.push(`[${i + 1}:a]volume=${a.volume},adelay=${Math.round(a.start * 1000)}|${Math.round(a.start * 1000)}[a${i}]`)); fc.push(`${ains.map((_, i) => `[a${i}]`).join('')}amix=inputs=${ains.length}:duration=longest:normalize=0[aout]`); }
  if (fc.length) args.push('-filter_complex', fc.join(';')); else args.push('-c:v', 'copy');
  if (fc.length) { args.push('-map', filters.length ? '[v]' : '0:v'); if (ains.length) args.push('-map', '[aout]'); args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p'); if (ains.length) args.push('-c:a', 'aac', '-shortest'); }
  args.push(out); run(FFMPEG, args); tmp.forEach((x) => { try { fs.unlinkSync(x); } catch {} });
  return probe(out);
}
// Foto falante (prévia local, SEM animação labial/IA): foto estática + narração
export function stillWithAudio(image, wav, out) { run(FFMPEG, ['-y', '-loop', '1', '-i', image, '-i', wav, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-shortest', '-r', '25', out]); return probe(out); }
