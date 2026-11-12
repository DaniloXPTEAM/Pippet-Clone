// Marca d'água do PiperLine — módulo ÚNICO (configuração + filtro de ffmpeg). Desligada por padrão.
// A estrutura é final; o que falta é conteúdo do usuário: a imagem da marca e o nome da marca.
// • imagem: arquivo substituível em assets/brand/watermark.png (ou outro caminho dentro de app/public)
// • texto: usa o nome da marca que vier da CONFIGURAÇÃO (settings.brandName) — nenhum nome é escrito no código
import fs from 'node:fs';
// • posição: top-left | top-right | bottom-left | bottom-right | center
// • escala: largura da marca como fração da largura do vídeo (imagem) · opacidade 0–1 · margem como fração do lado menor
// Nada é baixado, nada é buscado na rede: ou a imagem está no disco, ou a marca não é aplicada (com motivo).
export const WATERMARK_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];

export const WATERMARK_DEFAULTS = Object.freeze({
  enabled: false,              // DESLIGADA por padrão (exigência da estrutura)
  kind: 'image',               // 'image' | 'text'
  text: '',                    // vazio = usa o nome da marca da configuração
  imagePath: 'assets/brand/watermark.png',
  position: 'bottom-right',
  scale: 0.14,                 // 14% da largura do vídeo
  opacity: 0.7,
  margin: 0.03,                // 3% do lado menor
});

const num = (v, def) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? def : Number(v));

// Valida e normaliza a configuração. Lança Error com mensagem em português quando algo é inválido.
export function normalizeWatermark(input = {}) {
  // aceita também o formato antigo (booleano em settings.watermark) para não quebrar dados já gravados
  const src = input === true ? { enabled: true } : input && typeof input === 'object' ? input : {};
  const raw = { ...WATERMARK_DEFAULTS, ...Object.fromEntries(Object.entries(src).filter(([, v]) => v !== undefined && v !== null)) };
  const kind = String(raw.kind || 'image').toLowerCase();
  if (!['image', 'text'].includes(kind)) throw new Error(`tipo de marca d'água inválido: ${kind} (use image ou text)`);
  const position = String(raw.position || 'bottom-right').toLowerCase();
  if (!WATERMARK_POSITIONS.includes(position)) throw new Error(`posição inválida: ${position} (use ${WATERMARK_POSITIONS.join(', ')})`);
  const scale = num(raw.scale, WATERMARK_DEFAULTS.scale);
  if (!(scale > 0.01 && scale <= 1)) throw new Error('escala deve ficar entre 0,01 e 1 (fração da largura do vídeo)');
  const opacity = num(raw.opacity, WATERMARK_DEFAULTS.opacity);
  if (!(opacity >= 0 && opacity <= 1)) throw new Error('opacidade deve ficar entre 0 e 1');
  const margin = num(raw.margin, WATERMARK_DEFAULTS.margin);
  if (!(margin >= 0 && margin < 0.5)) throw new Error('margem deve ficar entre 0 e 0,5 (fração do lado menor)');
  const imagePath = String(raw.imagePath || WATERMARK_DEFAULTS.imagePath).trim().replace(/^\/+/, '');
  if (imagePath.includes('..')) throw new Error('caminho da imagem inválido');
  return { enabled: raw.enabled === true || raw.enabled === 'true', kind, text: String(raw.text || '').slice(0, 120), imagePath, position, scale, opacity, margin };
}

// Onde a imagem vive: por padrão dentro de app/public (servida em /assets/...). O caminho é validado contra `..`.
export function resolveImagePath(cfg, publicDir) {
  if (!cfg || cfg.kind !== 'image') return null;
  const p = String(cfg.imagePath || WATERMARK_DEFAULTS.imagePath).replace(/^\/+/, '');
  if (p.includes('..')) return null;
  return `${String(publicDir).replace(/\/+$/, '')}/${p}`;
}

// Marca ativa nesta exportação? Combina configuração, pedido do diálogo e a preferência "Salvar sem marca d'água"
// (que só vale se o PLANO local permitir — PLANS[].noWatermark).
export function effectiveWatermark(settings = {}, { requested, plan, imageExists } = {}) {
  const cfg = normalizeWatermark(settings?.watermark || {});
  if (!cfg.enabled) return { active: false, cfg, reason: "marca d'água desligada na configuração (padrão)" };
  if (requested === false) return { active: false, cfg, reason: 'exportação pedida sem marca d\'água' };
  const brandName = String(settings?.brandName || cfg.text || '').trim();
  if (cfg.kind === 'text' && !brandName) return { active: false, cfg, reason: 'nome da marca não configurado (Settings > Marca d\'água)' };
  if (cfg.kind === 'image' && imageExists === false) return { active: false, cfg, reason: `imagem da marca não encontrada (${cfg.imagePath})` };
  if (settings?.saveWithoutWatermark === true) {
    return plan?.noWatermark === true
      ? { active: false, cfg, reason: 'preferência "Salvar sem marca d\'água" ligada (o plano atual permite)' }
      : { active: true, cfg, reason: 'preferência ignorada: o plano atual não remove a marca d\'água' };
  }
  return { active: true, cfg, reason: "marca d'água ligada na configuração" };
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const escFilter = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
// Caminho de fonte no filtro: o ffmpeg usa ':' como separador de opção, então o "C:" do Windows
// precisa virar "C\:" (é o que o próprio ffmpeg documenta para caminhos do Windows). Sem isso o
// drawtext falha com "No option name near .../Windows/Fonts/..." e a exportação devolve 500.
// Barras invertidas e aspas também são escapadas, para caminhos escritos como C:\Windows\Fonts\....
export const escapeFilterPath = (p) => String(p).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

// Posição em pixels (canto superior esquerdo da marca) — usada para conferência/prévia; o filtro usa expressões (W-w/H-h).
export function overlayPosition(position, { videoW, videoH, markW, markH, margin }) {
  const m = Math.round(Math.min(videoW, videoH) * margin);
  const x = position.endsWith('left') ? m : position.endsWith('right') ? videoW - markW - m : Math.round((videoW - markW) / 2);
  const y = position.startsWith('top') ? m : position.startsWith('bottom') ? videoH - markH - m : Math.round((videoH - markH) / 2);
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

// Filtro de ffmpeg para a marca. Devolve { ok, mode, filterComplex, extraInputs, reason }.
//   imagem → [1:v] escala/opacidade + overlay sobre o quadro já redimensionado (filter_complex com duas entradas)
//   texto  → drawtext com o nome vindo da configuração (fonte do sistema, cor branca com a opacidade pedida)
export function buildWatermarkFilter(cfg, { videoW, videoH, brandName = '', fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', imagePath = null, imageExists = true, baseFilters = [], fontExists = null } = {}) {
  const c = normalizeWatermark(cfg);
  if (c.kind === 'image') {
    if (!imagePath || imageExists === false) return { ok: false, mode: 'none', reason: `imagem da marca não encontrada (${c.imagePath})` };
    const markW = even(videoW * c.scale);
    // posição em expressões do próprio overlay (W/H = vídeo, w/h = marca já escalada) → independe da proporção da imagem
    const m = Math.round(Math.min(videoW, videoH) * c.margin);
    const x = c.position.endsWith('left') ? `${m}` : c.position.endsWith('right') ? `W-w-${m}` : '(W-w)/2';
    const y = c.position.startsWith('top') ? `${m}` : c.position.startsWith('bottom') ? `H-h-${m}` : '(H-h)/2';
    const base = baseFilters.length ? `[0:v]${baseFilters.join(',')}[base];` : '';
    const filterComplex = `${base}[1:v]scale=${markW}:-1,format=rgba,colorchannelmixer=aa=${c.opacity.toFixed(3)}[wm];${baseFilters.length ? '[base]' : '[0:v]'}[wm]overlay=${x}:${y}[outv]`;
    return { ok: true, mode: 'image', filterComplex, extraInputs: [imagePath], markW, x, y, reason: 'imagem sobreposta no canto configurado' };
  }
  const text = String(brandName || c.text || '').trim();
  if (!text) return { ok: false, mode: 'none', reason: "nome da marca não configurado (Settings > Marca d'água)" };
  const fontsize = Math.max(12, Math.round(Math.min(videoW, videoH) * Math.max(0.02, c.scale * 0.25)));
  const m = Math.round(Math.min(videoW, videoH) * c.margin);
  const x = c.position.endsWith('left') ? `${m}` : c.position.endsWith('right') ? `w-text_w-${m}` : '(w-text_w)/2';
  const y = c.position.startsWith('top') ? `${m}` : c.position.startsWith('bottom') ? `h-text_h-${m}` : '(h-text_h)/2';
  // `fontExists` permite ao teste provar o caminho de um SO sem tocar no disco do outro.
  const exists = typeof fontExists === 'function' ? fontExists : (f) => { try { return fs.existsSync(f); } catch { return false; } };
  const hasFont = !!fontFile && exists(fontFile) === true;
  const drawtext = `drawtext=${hasFont ? `fontfile='${escapeFilterPath(fontFile)}':` : ''}text='${escFilter(text)}':x=${x}:y=${y}:fontsize=${fontsize}:fontcolor=white@${c.opacity.toFixed(3)}:box=1:boxcolor=black@${(c.opacity * 0.5).toFixed(3)}`;
  return { ok: true, mode: 'text', drawtext, fontsize, reason: 'texto desenhado com o nome configurado' };
}

// Fonte para o modo texto: primeira fonte existente na máquina. Sem fonte, o ffmpeg usa a padrão dele.
export const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/arial.ttf',
];
export const pickFont = () => FONT_CANDIDATES.find((f) => { try { return fs.existsSync(f); } catch { return false; } }) || null;
