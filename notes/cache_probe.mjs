// Offline: dado nomes de manifest (ex.: Omni), lista os chunks (do route-manifest) e diz quais ja existem em scripts/ e quais constam no indice do cache HTTP local do Chrome.
// Uso: node notes/cache_probe.mjs Omni customize-photo-digital-human text-to-speech
import fs from 'node:fs';
import path from 'node:path';
const D = 'scripts/auth_bundles'; const files = fs.readdirSync(D).concat(fs.readdirSync('scripts/cache_recovered'));
const rt = fs.readFileSync(path.join(D, fs.readdirSync(D).find((f) => /^runtime\./.test(f))), 'utf8');
const man = fs.readFileSync(path.join(D, fs.readdirSync(D).find((f) => /^route-manifest-main/.test(f))), 'utf8');
const idx = fs.readFileSync('C:/w/rea_chrome_profile/Default/Cache/Cache_Data/data_1').toString('latin1');
const i0 = rt.indexOf('i.u=e=>"static/js/async/"+'); const seg = rt.slice(i0, rt.indexOf('".js",i.miniCssF', i0));
function balanced(s, from) { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } }
const [a1, b1] = balanced(seg, 0); const [a2, b2] = balanced(seg, b1 + 1);
const names = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'); const hashes = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')');
for (const k of process.argv.slice(2)) {
  const key = '"' + k + '":{"chunkIds":['; const x = man.indexOf(key); if (x < 0) { console.log(k, 'sem entrada no manifest'); continue; }
  const ids = man.slice(x + key.length, man.indexOf(']', x + key.length)).split(',').map(Number);
  const rows = ids.map((id) => { const n = names[id] || String(id); const h = hashes[id]; const local = h && files.some((f) => f.startsWith('async__' + n + '.' + h)); const cache = h && idx.includes('/' + n + '.' + h + '.js'); return { id, n, h, local: !!local, cache: !!cache }; });
  console.log('==', k, 'ids', ids.length, '| sem hash', rows.filter((r) => !r.h).length, '| locais', rows.filter((r) => r.local).length);
  for (const r of rows.filter((r) => r.h && !r.local)) console.log('   ausente em scripts:', r.id, r.n, r.h, r.cache ? '-> NO CACHE DO CHROME' : '-> nao esta no cache');
}
