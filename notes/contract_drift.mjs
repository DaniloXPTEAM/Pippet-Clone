// Offline: reconcilia a deriva de build e classifica cada contrato documentado como
//  inalterado (chunk com hash identico) | inalterado apos normalizar (so nomes minificados/ids de modulo) | ALTERADO | nao localizado | nao analisado (sem versao nova local).
// Tambem classifica os 246 bundles locais (198 identicos + 31 alterados + 16 removidos + 1 sem correspondencia) e diz para onde foram os modulos dos removidos.
// Saida: notes/_contract_drift.json. Sem rede.
import fs from 'node:fs';
import path from 'node:path';
const A = 'scripts/auth_bundles', CR = 'scripts/cache_recovered', DO = 'scripts/downloaded_omni', NW = 'scripts/current_20261029';
const drift = JSON.parse(fs.readFileSync('notes/_build_drift.json', 'utf8')); const defRe = /[,{](\d{3,7})\((\w),(\w)(?:,(\w))?\)\{/g;
const key = (f) => f.replace(/^async__/, '').replace(/\.js$/, ''); const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const mods = (t) => { const pos = []; let m; defRe.lastIndex = 0; while ((m = defRe.exec(t))) pos.push([m[1], m.index]); const o = new Map(); pos.forEach((p, i) => o.set(p[0], t.slice(p[1], pos[i + 1] ? pos[i + 1][1] : t.length))); return o; };
// normaliza nomes de variaveis de 1 letra e ids numericos de import: diferencas so desse tipo = mesmo codigo
const norm = (s) => s.replace(/\b[A-Za-z_$][A-Za-z0-9_$]?\b/g, '_').replace(/\(\d{4,7}\)/g, '(#)').replace(/\s+/g, '');
const changedBy = new Map(drift.alterados_lista.map((c) => [`${c.name || c.id}.${c.antigo}`, c])); const removedKeys = new Set(drift.removidos ? [] : []);
const rt = fs.readFileSync(path.join(NW, fs.readdirSync(NW).find((f) => /runtime\./.test(f))), 'utf8');
const newMapKeys = new Set(); { const i0 = rt.indexOf('i.u=e=>"static/js/async/"+'); const seg = rt.slice(i0, rt.indexOf('".js",i.miniCssF', i0)); const bal = (s, from) => { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } }; const [a1, b1] = bal(seg, 0); const [a2, b2] = bal(seg, b1 + 1); const N = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'), H = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')'); for (const id of Object.keys(H)) newMapKeys.add(`${N[id] || id}.${H[id]}`); }
const oldFiles = [...fs.readdirSync(A).filter((f) => f.startsWith('async__')).map((f) => [A, f]), ...fs.readdirSync(CR).map((f) => [CR, f]), ...fs.readdirSync(DO).map((f) => [DO, f])];
const status = (k) => (newMapKeys.has(k) ? 'identico' : changedBy.has(k) ? 'alterado' : 'removido');
const newFileOf = (k) => { const c = changedBy.get(k); if (!c) return null; return fs.readdirSync(NW).find((f) => f.startsWith(`async__${(c.name || c.id).replace(/[\\/]/g, '__')}.${c.novo}`)) || null; };
// ---- 1) reconciliacao dos bundles locais
const buckets = { identico: [], alterado: [], removido: [], sem_correspondencia: [] };
for (const f of fs.readdirSync(A).filter((x) => x.startsWith('async__'))) { const k = key(f); (newMapKeys.has(k) ? buckets.identico : changedBy.has(k) ? buckets.alterado : (drift.removidos_lista || []).some((r) => `${r.name || r.id}.${r.hash}` === k) ? buckets.removido : buckets.sem_correspondencia).push(f); }
// removidos: lista a partir do runtime antigo (nao estava em _build_drift.json)
const oldRt = fs.readFileSync(path.join(A, fs.readdirSync(A).find((f) => /^runtime\./.test(f))), 'utf8'); const oldKeys = new Map(); { const i0 = oldRt.indexOf('i.u=e=>"static/js/async/"+'); const seg = oldRt.slice(i0, oldRt.indexOf('".js",i.miniCssF', i0)); const bal = (s, from) => { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } }; const [a1, b1] = bal(seg, 0); const [a2, b2] = bal(seg, b1 + 1); const N = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'), H = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')'); for (const id of Object.keys(H)) oldKeys.set(`${N[id] || id}.${H[id]}`, id); }
const rebucket = { identico: [], alterado: [], removido: [], sem_correspondencia: [] };
for (const f of fs.readdirSync(A).filter((x) => x.startsWith('async__'))) { const k = key(f); if (newMapKeys.has(k)) rebucket.identico.push(f); else if (changedBy.has(k)) rebucket.alterado.push(f); else if (oldKeys.has(k)) rebucket.removido.push(f); else rebucket.sem_correspondencia.push(f); }
// corpus novo: identicos + versoes novas
const newCorpus = [...fs.readdirSync(A).filter((f) => newMapKeys.has(key(f))).map((f) => [A, f]), ...fs.readdirSync(NW).map((f) => [NW, f])];
const moduleHome = new Map(); for (const [d, f] of newCorpus) { if (!f.endsWith('.js')) continue; for (const id of mods(read(d, f)).keys()) if (!moduleHome.has(id)) moduleHome.set(id, f); }
const removidos = rebucket.removido.map((f) => { const ms = [...mods(read(A, f)).keys()]; const dest = {}; let lost = 0; for (const id of ms) { const h = moduleHome.get(id); if (h) dest[h] = (dest[h] || 0) + 1; else lost++; } return { bundle: key(f), modulos: ms.length, migraram_para: dest, sem_destino_conhecido: lost }; });
const semCorr = rebucket.sem_correspondencia.map((f) => ({ bundle: key(f), observacao: 'nome/hash nao consta no mapa antigo nem no novo (provavel artefato de nome do arquivo local)' }));
// ---- 2) classificacao de contratos
const PROBES = JSON.parse(fs.readFileSync('notes/_drift_check.json', 'utf8')).sondas.map((s) => s.probe);
const rows = PROBES.map((p) => {
  const where = []; for (const [d, f] of oldFiles) { if (!f.endsWith('.js')) continue; const t = read(d, f); if (!t.includes(p)) continue; const k = key(f); const st = status(k); const ms = [...mods(t)].filter(([, s]) => s.includes(p)).map(([id]) => id); where.push({ arquivo: f, modulos: ms.slice(0, 4), chunk: st });
    if (st === 'removido') { const OM = mods(t); where.at(-1).modulos_comparados = ms.slice(0, 4).map((id) => { const h = moduleHome.get(id); if (!h) return `${id}: NAO ENCONTRADO em nenhum chunk novo`; const NM = mods(read(fs.existsSync(path.join(NW, h)) ? NW : A, h)); const nm = NM.get(id); return nm === OM.get(id) ? `${id}: byte-identico (agora em ${h})` : norm(nm) === norm(OM.get(id)) ? `${id}: identico apos normalizar nomes/ids (agora em ${h})` : `${id}: ALTERADO (agora em ${h})`; }); }
    if (st === 'alterado') { const nf = newFileOf(k); if (!nf) { where.at(-1).nova = 'sem versao nova local'; } else { const NM = mods(read(NW, nf)), OM = mods(t); where.at(-1).modulos_comparados = ms.slice(0, 4).map((id) => (!NM.has(id) ? `${id}: NAO ENCONTRADO na versao nova` : NM.get(id) === OM.get(id) ? `${id}: byte-identico` : norm(NM.get(id)) === norm(OM.get(id)) ? `${id}: identico apos normalizar nomes/ids` : `${id}: ALTERADO`)); } } }
  let cls; if (!where.length) cls = 'nao localizado (nunca presente nos chunks analisados)'; else if (where.every((w) => w.chunk === 'identico')) cls = 'inalterado (chunk com hash identico)'; else if (where.some((w) => w.nova)) cls = 'nao analisado (chunk sem versao nova local)'; else if (where.some((w) => (w.modulos_comparados || []).some((x) => /ALTERADO|NAO ENCONTRADO/.test(x)))) cls = 'ALTERADO'; else cls = where.some((w) => w.chunk === 'removido') ? 'inalterado (re-empacotado em outro chunk; so nomes minificados/ids)' : 'inalterado (so nomes minificados/ids)'; return { probe: p, classe: cls, onde: where.slice(0, 5) };
});
fs.writeFileSync('notes/_contract_drift.json', JSON.stringify({ bundles_locais: fs.readdirSync(A).filter((x) => x.startsWith('async__')).length, identicos: rebucket.identico.length, alterados: rebucket.alterado.length, removidos: removidos, sem_correspondencia: semCorr, contratos: rows }, null, 1));
console.log('bundles', rebucket.identico.length, rebucket.alterado.length, rebucket.removido.length, rebucket.sem_correspondencia.length);
console.log('REMOVIDOS:'); for (const r of removidos) console.log(' ', r.bundle, '| modulos', r.modulos, '| migraram:', JSON.stringify(r.migraram_para), '| sem destino', r.sem_destino_conhecido);
console.log('SEM CORRESPONDENCIA:', semCorr.map((x) => x.bundle).join(' '));
const by = {}; for (const r of rows) (by[r.classe] ||= []).push(r.probe); for (const [c, l] of Object.entries(by)) console.log(`\n[${l.length}] ${c}\n  ${l.join(' | ')}`);
