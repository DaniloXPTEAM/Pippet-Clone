// Leitura LOCAL e somente-leitura do cache HTTP (blockfile) do perfil Chrome do Pippit para recuperar os 3 chunks do drawer de avatar
// SEM nova requisicao de rede. Extrai apenas as entradas cujas chaves casam com os 3 nomes. Saida: scripts/cache_recovered/ + notes/_cache_chunks.json
// Formato (Chromium disk_cache blockfile): data_N = 8192 B de cabecalho + blocos; EntryStore (256 B) com key a partir do byte 96;
// Addr: bit31 inicializado, bits28-30 tipo (0 externo f_XXXXXX, 2=256 B, 3=1 KiB, 4=4 KiB), bits24-25 = nblocos-1, bits16-23 = no. do data_N, bits0-15 = bloco.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const CACHE = process.argv.find((a) => /Cache_Data/.test(a)) || 'C:/w/rea_chrome_profile/Default/Cache/Cache_Data';
const argv1 = (p) => (process.argv.find((a) => a.startsWith(p)) || '').slice(p.length);
const OUT = argv1('--out=') || 'scripts/cache_recovered'; const META = argv1('--meta=') || 'notes/_cache_chunks.json'; const NAMES = argv1('--names=');
let WANT = ['avatar-based-generator.d1db384db7.js', 'digital-human-managers.e6d5c9f2cb.js', 'bundle_avatar-editor-service.76367e03ff.js'];
// --deps: tambem as dependencias listadas em notes/_missing_chunks.json (somente as que existem no cache local)
if (process.argv.includes('--deps')) { const mc = JSON.parse(fs.readFileSync('notes/_missing_chunks.json', 'utf8')); for (const v of Object.values(mc.entries)) if (v) for (const r of v.missing) if (r.hash) { const n = (r.name || r.id) + '.' + r.hash + '.js'; if (!WANT.includes(n)) WANT.push(n); } }
// --ids=693197,30538,549630: chunks por ID; nome/hash vem do runtime.*.js ja recuperado (mapa i.u)
if (NAMES) WANT = NAMES.split(',');
const idsArg = process.argv.find((a) => a.startsWith('--ids='));
if (idsArg) {
  const D = 'scripts/auth_bundles'; const rt = fs.readFileSync(path.join(D, fs.readdirSync(D).find((f) => /^runtime\./.test(f))), 'utf8');
  const i0 = rt.indexOf('i.u=e=>"static/js/async/"+'); const seg = rt.slice(i0, rt.indexOf('".js",i.miniCssF', i0));
  const balanced = (s, from) => { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } };
  const [a1, b1] = balanced(seg, 0); const [a2, b2] = balanced(seg, b1 + 1);
  const names = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'); const hashes = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')');
  WANT = idsArg.slice(6).split(',').map((id) => (names[id] || id) + '.' + hashes[id] + '.js');
}
const idx = fs.readFileSync(path.join(CACHE, 'data_1')); const txt = idx.toString('latin1');
const BS = { 2: 256, 3: 1024, 4: 4096 };
function readAddr(addr, size) {
  if (!(addr >>> 31)) return null; const type = (addr >>> 28) & 7;
  if (type === 0) return fs.readFileSync(path.join(CACHE, 'f_' + (addr & 0x0fffffff).toString(16).padStart(6, '0'))).subarray(0, size);
  const bs = BS[type]; if (!bs) throw new Error('tipo de bloco nao tratado ' + type);
  const file = (addr >>> 16) & 0xff; const block = addr & 0xffff; const fd = fs.openSync(path.join(CACHE, 'data_' + file), 'r');
  try { const buf = Buffer.alloc(size); fs.readSync(fd, buf, 0, size, 8192 + block * bs); return buf; } finally { fs.closeSync(fd); }
}
fs.mkdirSync(OUT, { recursive: true }); const res = [];
for (const name of WANT) {
  let i = txt.indexOf('/' + name); if (i < 0) { res.push({ name, achado: false }); continue; }
  const ks = txt.lastIndexOf('1/0/_dk_', i); const e = ks - 96; const dv = new DataView(idx.buffer, idx.byteOffset + e, 256);
  const keyLen = dv.getInt32(32, true); const key = txt.slice(ks, ks + keyLen);
  const sz = [0, 1].map((j) => dv.getInt32(40 + j * 4, true)); const ad = [0, 1].map((j) => dv.getUint32(56 + j * 4, true));
  let hdr = null, body = null; try { hdr = readAddr(ad[0], sz[0]); body = readAddr(ad[1], sz[1]); } catch {} if (!hdr || !body) { res.push({ name, achado: false, motivo: 'entrada sem dados no cache (expulsa)' }); continue; }
  const hs = hdr.toString('latin1'); const enc = (hs.match(/content-encoding:\s*([a-z0-9-]+)/i) || [])[1] || null; const ctype = (hs.match(/content-type:\s*([^\0]+?)\0/i) || [])[1] || null; const clen = (hs.match(/content-length:\s*(\d+)/i) || [])[1] || null; const dateH = (hs.match(/\0date:\s*([^\0]+)\0/i) || [])[1] || null; const lastMod = (hs.match(/last-modified:\s*([^\0]+)\0/i) || [])[1] || null;
  let plain = body, how = 'sem codificacao';
  if (enc === 'gzip') { plain = zlib.gunzipSync(body); how = 'gzip'; } else if (enc === 'br') { plain = zlib.brotliDecompressSync(body); how = 'br'; } else if (enc === 'deflate') { plain = zlib.inflateSync(body); how = 'deflate'; } else if (enc === 'zstd' && zlib.zstdDecompressSync) { plain = zlib.zstdDecompressSync(body); how = 'zstd'; } else if (enc) how = 'codificacao nao tratada: ' + enc;
  const outName = 'async__' + name.replace(/[\/]/g, '__'); fs.writeFileSync(path.join(OUT, outName), plain);
  res.push({ name, achado: true, chave: key.replace(/^1\/0\/_dk_/, ''), bytes_armazenados_no_cache: body.length, content_length_header: clen, content_encoding: enc, bytes_descomprimidos: plain.length, content_type: ctype, data_header: dateH, last_modified: lastMod, descompressao: how, salvo_em: path.join(OUT, outName).split(path.sep).join('/') });
}
fs.writeFileSync(META, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
