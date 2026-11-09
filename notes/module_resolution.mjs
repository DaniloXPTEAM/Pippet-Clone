// Offline: dos modulos externos importados por um chunk, quais estao DEFINIDOS nos bundles locais (scripts/auth_bundles + scripts/cache_recovered) e quais nao.
// Uso: node notes/module_resolution.mjs <arquivo-do-chunk> [saida.json]
import fs from 'node:fs';
import path from 'node:path';
const dirs = ['scripts/auth_bundles', 'scripts/cache_recovered', 'scripts/downloaded_omni'];
const defRe = /[,{](\d{3,7})\((\w),(\w)(?:,(\w))?\)\{/g;
const index = new Map(); // id -> [arquivos]
for (const d of dirs) for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.js'))) {
  const t = fs.readFileSync(path.join(d, f), 'utf8'); let m; defRe.lastIndex = 0;
  while ((m = defRe.exec(t))) { const id = +m[1]; (index.get(id) || index.set(id, []).get(id)).push(path.join(d, f).split(path.sep).join('/')); }
}
const target = process.argv[2]; const t = fs.readFileSync(target, 'utf8');
const own = new Set(); { let m; defRe.lastIndex = 0; while ((m = defRe.exec(t))) own.add(+m[1]); }
const used = new Set(); { const re = /[a-zA-Z_$]\((\d{4,7})\)/g; let m; while ((m = re.exec(t))) used.add(+m[1]); }
const rows = [...used].map((id) => ({ id, own: own.has(id), files: index.get(id) || [] }));
const missing = rows.filter((r) => !r.own && !r.files.length).map((r) => r.id);
const res = { arquivo: target, modulos_usados: used.size, definidos_no_proprio_chunk: rows.filter((r) => r.own).length, resolvidos_em_bundles_locais: rows.filter((r) => !r.own && r.files.length).length, nao_encontrados: missing.length, ids_nao_encontrados: missing };
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ ...res, resolvidos: rows.filter((r) => !r.own && r.files.length).map((r) => ({ id: r.id, arquivo: r.files[0] })) }, null, 1));
console.log(JSON.stringify(res));
