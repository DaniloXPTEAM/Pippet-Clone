// Offline: compara literais de string (antigo x novo) dos 11 chunks alterados baixados em 29/10/2026 e procura marcadores de contrato.
import fs from 'node:fs';
const NW='scripts/current_20261029', dirs=['scripts/auth_bundles','scripts/cache_recovered','scripts/downloaded_omni'];
const drift=JSON.parse(fs.readFileSync('notes/_build_drift_cache.json','utf8'));
const probes=JSON.parse(fs.readFileSync('notes/_drift_check.json','utf8')).sondas.map(s=>s.probe);
const names=['CanvasShare','asset-library-sdk-picker','activity-detail/(slug$)/page','home-page/page','364997','home/page','565447','$','replay/page','Replay','ActivityDetail'];
const lits=(t)=>new Set([...t.matchAll(/"((?:[^"\\n]|\.){3,200})"/g)].map(m=>m[1]));
const out=[];
for(const c of Object.values(drift)){const n=c.name||c.id;if(!names.includes(n)&&!names.includes(c.id))continue;
 const base=(c.name||c.id).replace(/[\/]/g,'__');const nf=`${NW}/async__${base}.${c.novo}.js`;const of=dirs.map(d=>`${d}/async__${base}.${c.antigo}.js`).find(f=>fs.existsSync(f));
 if(!fs.existsSync(nf)){out.push({n,erro:'sem versao nova'});continue}
 const nt=fs.readFileSync(nf,'utf8');if(!of){out.push({n,antigo:null,tamanho_novo:nt.length,probes_no_novo:probes.filter(p=>nt.includes(p)),obs:'versao antiga nao esta nos 246 bundles locais'});continue}
 const ot=fs.readFileSync(of,'utf8');const a=lits(ot),b=lits(nt);
 out.push({n,antigo:c.antigo,novo:c.novo,tam:[ot.length,nt.length],literais_removidos:[...a].filter(x=>!b.has(x)).slice(0,12),literais_adicionados:[...b].filter(x=>!a.has(x)).slice(0,12),probes_no_antigo:probes.filter(p=>ot.includes(p)),probes_no_novo:probes.filter(p=>nt.includes(p))});}
fs.writeFileSync('notes/_diff_remaining11.json',JSON.stringify(out,null,1));
for(const r of out)console.log(JSON.stringify(r).slice(0,700));
