// Divide `var __mods={ id(e,t,n){...}, ... }` em grupos de propriedades (módulos) de até N KB.
// Uso: node split_props.mjs <entrada.js> <pasta_saida> [limite_KB=40]
import fs from 'node:fs'; import path from 'node:path'; import * as acorn from 'acorn';
const [, , inFile, outDir, limitArg] = process.argv; const LIMIT=(Number(limitArg)||40)*1024;
const src=fs.readFileSync(inFile,'utf8'); const ast=acorn.parse(src,{ecmaVersion:'latest'});
const decl=ast.body.find(s=>s.type==='VariableDeclaration'); const obj=decl.declarations[0].init;
fs.mkdirSync(outDir,{recursive:true}); const base=path.basename(inFile,'.js'); const rep={props:obj.properties.length,total:src.length,pecas:[]};
let g=[],size=0,i=0; const flush=()=>{ if(!g.length) return; const n=`${base}__p_${String(++i).padStart(2,'0')}.js`; const code=`var __mods={${g.join(',')}};`;
 fs.writeFileSync(path.join(outDir,n),code,'utf8'); rep.pecas.push({n,bytes:code.length,modulos:g.length}); g=[];size=0; };
for(const p of obj.properties){ const c=src.slice(p.start,p.end); if(size+c.length>LIMIT&&g.length) flush(); g.push(c); size+=c.length; }
flush(); fs.writeFileSync(path.join(outDir,`${base}__p_report.json`),JSON.stringify(rep,null,1)); console.log(JSON.stringify(rep));
