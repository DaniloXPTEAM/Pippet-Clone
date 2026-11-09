// Divide o corpo de uma IIFE dentro de um módulo (ex.: lodash) em pedaços `function __part_N(){...}`.
// Uso: node split_iife_body.mjs <entrada.js> <pasta_saida> [limite_KB=40]
import fs from 'node:fs'; import path from 'node:path'; import * as acorn from 'acorn';
const [, , inFile, outDir, limitArg] = process.argv;
const LIMIT = (Number(limitArg) || 40) * 1024;
const src = fs.readFileSync(inFile, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest' });
let target = null;
(function walk(n){ if(!n||typeof n.type!=='string'||target) return;
  if(n.type==='FunctionExpression' && n.body.body.length>20) { target=n; return; }
  for(const k in n){ const v=n[k]; if(Array.isArray(v)) v.forEach(walk); else if(v&&typeof v.type==='string') walk(v); } })(ast);
if(!target) throw new Error('IIFE nao encontrada');
const stmts = target.body.body; fs.mkdirSync(outDir,{recursive:true});
const base = path.basename(inFile,'.js'); const rep={instrucoes:stmts.length,pecas:[]};
let group=[],size=0,idx=0;
const flush=()=>{ if(!group.length) return; const name=`${base}__iife_${String(++idx).padStart(2,'0')}.js`;
  const code=`function __part_${idx}(){\n${group.join('\n')}\n}`; fs.writeFileSync(path.join(outDir,name),code,'utf8');
  rep.pecas.push({name,bytes:Buffer.byteLength(code),instrucoes:group.length}); group=[];size=0; };
for(const s of stmts){ const c=src.slice(s.start,s.end); if(size+c.length>LIMIT&&group.length) flush(); group.push(c); size+=c.length; }
flush(); fs.writeFileSync(path.join(outDir,`${base}__iife_report.json`),JSON.stringify(rep,null,1)); console.log(JSON.stringify(rep));
