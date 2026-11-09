// Offline: compara o CONTEXTO de cada marcador de contrato (janela de codigo ao redor) entre o build antigo e o novo, ignorando nomes minificados e ids de modulo.
// Robusto a re-empacotamento (modulos que mudaram de chunk/ID). Saida: notes/_contract_context.json. Sem rede.
import fs from 'node:fs';
import path from 'node:path';
const A = 'scripts/auth_bundles', CR = 'scripts/cache_recovered', DO = 'scripts/downloaded_omni', NW = 'scripts/current_20261029';
const drift = JSON.parse(fs.readFileSync('notes/_build_drift.json', 'utf8')); const changed = new Set(drift.alterados_lista.map((c) => `${c.name || c.id}.${c.antigo}`));
const key = (f) => f.replace(/^async__/, '').replace(/\.js$/, ''); const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const norm = (s) => s.replace(/\b[A-Za-z_$][A-Za-z0-9_$]?\b/g, '_').replace(/\(\d{4,7}\)/g, '(#)').replace(/\d{4,7}(?=[:,(])/g, '#').replace(/\s+/g, '');
// corpus antigo (todos os chunks analisados) e novo (identicos + versoes novas lidas do cache/downloads)
const rtNew = fs.readFileSync(path.join(NW, fs.readdirSync(NW).find((f) => /runtime\./.test(f))), 'utf8'); const newKeys = new Set(); { const i0 = rtNew.indexOf('i.u=e=>"static/js/async/"+'); const seg = rtNew.slice(i0, rtNew.indexOf('".js",i.miniCssF', i0)); const bal = (s, from) => { let d = 0, st = -1; for (let k = from; k < s.length; k++) { if (s[k] === '{') { if (d++ === 0) st = k; } else if (s[k] === '}' && --d === 0) return [st, k]; } }; const [a1, b1] = bal(seg, 0); const [a2, b2] = bal(seg, b1 + 1); const N = (0, eval)('(' + seg.slice(a1, b1 + 1) + ')'), H = (0, eval)('(' + seg.slice(a2, b2 + 1) + ')'); for (const id of Object.keys(H)) newKeys.add(`${N[id] || id}.${H[id]}`); }
const oldList = [...fs.readdirSync(A).filter((f) => f.startsWith('async__')).map((f) => [A, f]), ...fs.readdirSync(CR).map((f) => [CR, f]), ...fs.readdirSync(DO).map((f) => [DO, f])];
const newList = [...oldList.filter(([, f]) => newKeys.has(key(f))), ...fs.readdirSync(NW).filter((f) => f.endsWith('.js')).map((f) => [NW, f])];
const newWins = (p) => { const w = []; for (const [d, f] of newList) { if (!f.endsWith('.js')) continue; const x = read(d, f); let i = -1; while ((i = x.indexOf(p, i + 1)) >= 0) w.push([f, norm(x.slice(Math.max(0, i - 160), i + p.length + 260))]); } return w; };
const probes = JSON.parse(fs.readFileSync('notes/_drift_check.json', 'utf8')).sondas.map((s) => s.probe); const out = [];
for (const p of probes) {
  const nwins = newWins(p); const occ = []; for (const [d, f] of oldList) { if (!f.endsWith('.js')) continue; const t = read(d, f); let i = -1; while ((i = t.indexOf(p, i + 1)) >= 0) occ.push({ f, i, win: t.slice(Math.max(0, i - 160), i + p.length + 260), chunkIdentico: newKeys.has(key(f)) }); }
  const rows = occ.map((o) => { if (o.chunkIdentico) return { arquivo: o.f, resultado: 'chunk identico' }; const nw = norm(o.win); const hit = nwins.find(([, nt]) => nt === nw); return hit ? { arquivo: o.f, resultado: 'contexto identico apos normalizar', agora_em: hit[0] } : { arquivo: o.f, resultado: 'CONTEXTO DIFERENTE/NAO ENCONTRADO', janela: o.win.slice(0, 300) }; });
  const bad = rows.filter((r) => r.resultado.startsWith('CONTEXTO')); const cls = !occ.length ? 'nao localizado' : bad.length ? (bad.length === rows.length ? 'ALTERADO ou nao localizado no novo' : 'parcialmente alterado') : rows.every((r) => r.resultado === 'chunk identico') ? 'inalterado (chunk identico)' : 'inalterado (re-empacotado/renomeado)';
  out.push({ probe: p, ocorrencias: occ.length, classe: cls, detalhe: rows.slice(0, 8) });
}
fs.writeFileSync('notes/_contract_context.json', JSON.stringify(out, null, 1));
const by = {}; for (const r of out) (by[r.classe] ||= []).push(`${r.probe}(${r.ocorrencias})`); for (const [c, l] of Object.entries(by)) console.log(`\n[${l.length}] ${c}\n  ${l.join(' | ')}`);
