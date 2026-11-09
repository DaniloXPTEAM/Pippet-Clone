// Pacote de skill no formato OBSERVADO nos bundles autenticados (notes/auth_skill_strings.json): ZIP com SKILL.md na raiz (protegido contra renomear/excluir),
// nome ≤ 20 caracteres, descrição ≤ 50, texto-guia ≤ 50, guia de mídia ≤ 12, sem scripts/executáveis, só Markdown criado pela interface, caminhos únicos e válidos,
// pública exige capa + categoria + tipo de saída, imagens ≤ 10 MB, vídeos ≤ 50 MB, até 6 exemplos, MPEG/MPG não suportado.
// UNOBSERVED (valores locais): limite do identificador gerado (40), tamanho máximo do ZIP (5 MB), lista exata de extensões proibidas, YAML do cabeçalho do SKILL.md.
import zlib from 'node:zlib';

export const LIMITS = { name: 20, description: 50, guideWords: 50, materialGuide: 12, cases: 6, imageMB: 10, videoMB: 50, slug: 40, zipMB: 5 };
export const SKILL_MD = 'SKILL.md';
export const OUTPUT_GENRES = ['video', 'image', 'audio', 'text'];  // UNOBSERVED: o campo "output type" existe; os valores do Pippit não foram lidos
const FORBIDDEN_EXT = /\.(js|mjs|cjs|ts|py|sh|bash|bat|cmd|ps1|exe|dll|so|dylib|bin|jar|rb|pl|php|vbs|msi|com|scr)$/i;

export const slugify = (name) => String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '');
const NAME_OK = /^[\p{L}\p{N} _-]+$/u;

// valida os campos do formulário "Create Skill"; devolve a mensagem do original (inglês) ou null
export function validateMeta(m, { forPublic = false } = {}) {
  const name = String(m.name || '').trim(), desc = String(m.description || '').trim();
  if (!name || !desc) return 'Enter a skill name and description before saving.';
  if ([...name].length > LIMITS.name) return 'The skill name cannot exceed 20 characters.';
  if (!NAME_OK.test(name)) return 'The Skill name contains unsupported characters. Change it and try again.';
  const slug = slugify(name); if (!slug) return 'The Skill name must contain Chinese characters, English letters, or numbers.';
  if (slug.length > LIMITS.slug) return 'The generated Skill identifier is too long. Shorten the name.';
  if ([...desc].length > LIMITS.description) return 'The description cannot exceed 50 characters.';
  if ([...String(m.guideWords || '')].length > LIMITS.guideWords) return 'Guide words cannot exceed 50 characters.';
  if ([...String(m.materialGuide || '')].length > LIMITS.materialGuide) return 'Material guide words cannot exceed 12 characters.';
  if (m.allowPublic || forPublic) {
    if (!m.cover) return 'Upload a skill cover before making your skill public.';
    if (!(m.tags || []).length) return 'Choose a category before making your skill public.';
    if (!m.outputGenre) return 'Choose an output type before making your skill public.';
  }
  return null;
}
export function checkMedia(item) { // item: {kind:'image'|'video', size, name}
  if (/\.(mpe?g)$/i.test(item.name || '')) return 'MPG and MPEG videos are not supported yet.';
  if (item.kind === 'image' && item.size > LIMITS.imageMB * 1048576) return 'Images must be 10 MB or smaller.';
  if (item.kind === 'video' && item.size > LIMITS.videoMB * 1048576) return 'Videos must be 50 MB or smaller.';
  return null;
}
export const checkCases = (n) => (n > LIMITS.cases ? 'You can upload up to 6 showcase items.' : null);

export function validatePath(p, existing = []) {
  const s = String(p || '');
  if (!s || s.startsWith('/') || s.includes('\\') || s.split('/').some((x) => !x || x === '.' || x === '..') || /[\u0000-\u001f<>:"|?*]/.test(s) || existing.includes(s)) return 'Use a unique, valid file path.';
  return null;
}
export const isScript = (p) => FORBIDDEN_EXT.test(p);

// SKILL.md = cabeçalho YAML mínimo (name/description) + instruções em Markdown
export function buildSkillMd({ name, description, body }) { return `---\nname: ${slugify(name) || 'skill'}\ndescription: ${String(description || '').replace(/\r?\n/g, ' ')}\n---\n\n${String(body || '').trim()}\n`; }
export function parseSkillMd(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(String(text)); if (!m) return { name: '', description: '', body: String(text).trim() };
  const get = (k) => { const x = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(m[1]); return x ? x[1].trim().replace(/^["']|["']$/g, '') : ''; };
  return { name: get('name'), description: get('description'), body: m[2].trim() };
}
// files: { path: string | {b64} }. Retorna lista de problemas (mensagens do original)
export function validatePackage(files) {
  const paths = Object.keys(files); const errs = [];
  if (!paths.includes(SKILL_MD)) errs.push('The Skill package must include SKILL.md.');
  const seen = [];
  for (const p of paths) { const e = validatePath(p, seen); if (e) errs.push(`${e} (${p})`); seen.push(p); if (isScript(p)) errs.push(`Skill packages cannot contain scripts or executable files. Remove ${p} before saving.`); }
  return errs;
}
export const canModify = (p) => p !== SKILL_MD; // "SKILL.md cannot be renamed or deleted."
export const canCreateText = (p) => /\.md$/i.test(p); // "Only Markdown files can be created here."

// ---- ZIP (leitor/escritor mínimos: stored/deflate, sem ZIP64/criptografia) ----
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipWrite(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, val] of Object.entries(files)) {
    const data = typeof val === 'string' ? Buffer.from(val, 'utf8') : Buffer.from(val.b64, 'base64'); const nameB = Buffer.from(name, 'utf8'); const comp = zlib.deflateRawSync(data); const useDeflate = comp.length < data.length; const body = useDeflate ? comp : data; const crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDeflate ? 8 : 0, 8); lh.writeUInt32LE(0x21000000 >>> 0, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameB.length, 26);
    parts.push(lh, nameB, body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDeflate ? 8 : 0, 10); ch.writeUInt32LE(0x21000000 >>> 0, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameB); offset += 30 + nameB.length + body.length;
  }
  const cd = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}
const TEXT_EXT = /\.(md|markdown|txt|json|ya?ml|csv|html?|css|xml|toml|ini)$/i;
// devolve { files, errors }; entradas de diretório são ignoradas; um único diretório raiz comum é removido (ZIPs de pasta); limite de tamanho do arquivo
export function zipRead(buf, { maxBytes = LIMITS.zipMB * 1048576 } = {}) {
  if (buf.length > maxBytes) return { files: {}, errors: [`The ZIP is larger than ${LIMITS.zipMB} MB.`] };
  let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return { files: {}, errors: ['The file is not a valid ZIP package.'] };
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const raw = {}; const errors = [];
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) { errors.push('The file is not a valid ZIP package.'); break; }
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString(flags & 0x0800 ? 'utf8' : 'latin1'); p += 46 + nl + el + cl;
    if (name.endsWith('/')) continue; if (flags & 1) { errors.push('Encrypted ZIP packages are not supported.'); continue; }
    const lnl = buf.readUInt16LE(lo + 26), lel = buf.readUInt16LE(lo + 28); const body = buf.subarray(lo + 30 + lnl + lel, lo + 30 + lnl + lel + csize);
    let data; try { data = method === 0 ? Buffer.from(body) : method === 8 ? zlib.inflateRawSync(body) : null; } catch { data = null; }
    if (!data || data.length !== usize || (crc32(data) !== buf.readUInt32LE(p - (46 + nl + el + cl) + 16))) { errors.push(`Could not read ${name} from the ZIP.`); continue; }
    raw[name.replace(/^\.\//, '')] = data;
  }
  for (const k of Object.keys(raw)) if (k.startsWith('__MACOSX/')) delete raw[k];
  const names = Object.keys(raw); const roots = new Set(names.map((x) => x.split('/')[0]));
  const strip = !names.includes(SKILL_MD) && roots.size === 1 && names.every((x) => x.includes('/')) ? `${[...roots][0]}/` : '';
  const files = {}; for (const [k, d] of Object.entries(raw)) { const path = strip ? k.slice(strip.length) : k; if (!path || path.startsWith('__MACOSX/')) continue; files[path] = TEXT_EXT.test(path) ? d.toString('utf8') : { b64: d.toString('base64') }; }
  return { files, errors };
}
