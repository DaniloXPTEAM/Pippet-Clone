// Offline: deriva da comparacao dos mapas de chunks (runtime antigo x runtime novo) quais dos bundles analisados foram substituidos pelo deploy de 28/10/2026.
// Uso: node notes/build_drift.mjs  (saida: notes/_build_drift.json). Nao faz requisicao de rede.
import fs from 'node:fs';
import path from 'node:path';
function maps(file) {
  const rt = fs.readFileSync(file, 'utf8'); const i0 = rt.indexOf('i.u=e=>"static/js/async/"+'); const seg = rt.slice(i0, rt.indexOf('".js",i.miniCssF', i0));
  const balanced = (s, from) => { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } };
  const [a1, b1] = balanced(seg, 0); const [a2, b2] = balanced(seg, b1 + 1);
  return { names: (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'), hashes: (0, eval)('(' + seg.slice(a2, b2 + 1) + ')') };
}
const D = 'scripts/auth_bundles'; const oldRt = path.join(D, fs.readdirSync(D).find((f) => /^runtime\./.test(f))); const newRt = path.join('scripts/current_20261029', fs.readdirSync('scripts/current_20261029').find((f) => /runtime\./.test(f)));
const O = maps(oldRt), N = maps(newRt); const out = { runtime_antigo: path.basename(oldRt), runtime_novo: path.basename(newRt), chunks_antigos: Object.keys(O.hashes).length, chunks_novos: Object.keys(N.hashes).length };
const changed = [], removed = [], added = [];
for (const id of Object.keys(O.hashes)) { if (!(id in N.hashes)) removed.push({ id, name: O.names[id] || null, hash: O.hashes[id] }); else if (N.hashes[id] !== O.hashes[id]) changed.push({ id, name: N.names[id] || O.names[id] || null, antigo: O.hashes[id], novo: N.hashes[id] }); }
for (const id of Object.keys(N.hashes)) if (!(id in O.hashes)) added.push({ id, name: N.names[id] || null, hash: N.hashes[id] });
out.alterados = changed.length; out.removidos = removed.length; out.adicionados = added.length; out.iguais = out.chunks_antigos - changed.length - removed.length;
// dos 250 bundles analisados: quais continuam identicos no site atual?
const local = fs.readdirSync(D).filter((f) => f.startsWith('async__')); const changedKeys = new Set(changed.map((c) => `${c.name || c.id}.${c.antigo}`)); const removedKeys = new Set(removed.map((c) => `${c.name || c.id}.${c.hash}`));
const newKeys = new Set(Object.keys(N.hashes).map((id) => `${N.names[id] || id}.${N.hashes[id]}`));
const status = { identico: [], alterado: [], removido: [], desconhecido: [] };
for (const f of local) { const k = f.replace(/^async__/, '').replace(/\.js$/, ''); (changedKeys.has(k) ? status.alterado : removedKeys.has(k) ? status.removido : newKeys.has(k) ? status.identico : status.desconhecido).push(f); }
out.bundles_locais = local.length; out.bundles_identicos = status.identico.length; out.bundles_alterados = status.alterado.map((f) => f.replace(/^async__/, '').replace(/\.js$/, '')); out.bundles_removidos = status.removido.length; out.bundles_sem_correspondencia = status.desconhecido.length;
out.alterados_lista = changed; out.adicionados_lista = added.slice(0, 80);
fs.writeFileSync('notes/_build_drift.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, bundles_alterados: out.bundles_alterados.length, alterados_lista: undefined, adicionados_lista: undefined }));
console.log('bundles locais ALTERADOS no site atual:', out.bundles_alterados.join(' '));
