// Offline: URL, dependencias e disponibilidade local dos chunks do drawer de avatar, a partir de runtime.*.js + route-manifest-main.*.js ja recuperados.
// Nao faz nenhuma requisicao de rede. Uso: node notes/chunk_info.mjs  (saida: notes/_missing_chunks.json)
import fs from 'node:fs';
import path from 'node:path';
const D = 'scripts/auth_bundles';
const files = fs.readdirSync(D);
const rt = fs.readFileSync(path.join(D, files.find((f) => /^runtime\./.test(f))), 'utf8');
const man = fs.readFileSync(path.join(D, files.find((f) => /^route-manifest-main/.test(f))), 'utf8');
const pub = rt.match(/i\.p="([^"]+)"/)[1];
const i0 = rt.indexOf('i.u=e=>"static/js/async/"+'); const end = rt.indexOf('".js",i.miniCssF', i0);
const seg = rt.slice(i0, end);
function balanced(s, from) { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } }
const [a1, b1] = balanced(seg, 0); const [a2, b2] = balanced(seg, b1 + 1);
const names = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'); const hashes = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')');
const BS = String.fromCharCode(92);
const manIds = (k) => { const key = '"' + k + '":{"chunkIds":['; const x = man.indexOf(key); if (x < 0) return null; const y = x + key.length; return man.slice(y, man.indexOf(']', y)).split(',').filter(Boolean).map(Number); };
const url = (id) => `https:${pub}static/js/async/${names[id] || id}.${hashes[id]}.js`;
const local = (id) => files.find((f) => f.startsWith('async__' + (names[id] || id) + '.' + hashes[id]) ) || files.find((f) => f.startsWith('async__' + (names[id] || id) + '.')) || null;
const out = { publicPath: pub, entries: {} };
for (const [label, key] of [['avatar-based-generator', 'avatar-based-generator'], ['digital-human-managers', 'digital-human-managers'], ['bundle_avatar-editor-service', 'bundle_avatar-editor-service']]) {
  const ids = manIds(key); if (!ids) { out.entries[label] = null; continue; }
  const rows = ids.map((id) => ({ id, name: names[id] || null, hash: hashes[id], url: url(id), local: local(id), bytes_local: local(id) ? fs.statSync(path.join(D, local(id))).size : null }));
  out.entries[label] = { chunk_ids: ids, missing: rows.filter((r) => !r.local), present: rows.filter((r) => r.local).length };
}
fs.writeFileSync('notes/_missing_chunks.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out.entries)) { console.log('==', k, v && `ids=${v.chunk_ids.length} presentes=${v.present} faltam=${v.missing.length}`); if (v) for (const r of v.missing) console.log('  FALTA', r.id, r.name, r.hash, r.url); }
