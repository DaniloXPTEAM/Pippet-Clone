// Para cada um dos 5 scripts divididos: lista modulos por peca e referencias n(<literal>) entre modulos/pecas (AST, acorn).
import fs from 'node:fs'; import path from 'node:path'; import * as acorn from 'acorn';
const SP='C:/w/PiperLine/scripts/split';
const SETS={'landing_lib-polyfill':'landing_polyfill','kep_lib-polyfill':'kep_polyfill','uifid-fingerprint-init':'uifid','landing_771':'landing_771','kep_69':'kep_69'};
const FN=new Set(['FunctionExpression','FunctionDeclaration','ArrowFunctionExpression']);
const keyOf=p=>p.key.type==='Literal'?String(p.key.value):p.key.name;
function walk(n,f){ if(!n||typeof n.type!=='string') return; f(n); for(const k in n){const v=n[k]; if(Array.isArray(v)) v.forEach(x=>walk(x,f)); else if(v&&typeof v.type==='string') walk(v,f);} }
function scan(fnNode, req){ // retorna {lits:[], dyn:0, chunks:0, ambiguous:false}
  const out={lits:[],dyn:0,chunk:0,amb:false};
  (function go(n,top){ if(!n||typeof n.type!=='string') return;
    if(!top&&FN.has(n.type)&&n.params.some(p=>p.type==='Identifier'&&p.name===req)) return; // sombreia
    if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&n.id.name===req) out.amb=true;
    if(n.type==='CallExpression'){ const c=n.callee;
      if(c.type==='Identifier'&&c.name===req){ const a=n.arguments[0]; if(a&&a.type==='Literal') out.lits.push(String(a.value)); else out.dyn++; }
      else if(c.type==='MemberExpression'&&c.object.type==='Identifier'&&c.object.name===req&&c.property.name==='e') out.chunk++; }
    for(const k in n){const v=n[k]; if(Array.isArray(v)) v.forEach(x=>go(x,false)); else if(v&&typeof v.type==='string') go(v,false);} })(fnNode.body,true);
  return out; }
const res={};
for(const [name,dir] of Object.entries(SETS)){
  const files=fs.readdirSync(path.join(SP,dir)).filter(f=>f.endsWith('.js')).sort();
  const pieces=[],idPiece={};
  for(const f of files){ const src=fs.readFileSync(path.join(SP,dir,f),'utf8'); const piece=f.replace(/\.js$/,'').split('__').pop();
    const info={piece,file:f,bytes:Buffer.byteLength(src),modules:[],kind:'modulos'};
    let ast; try{ ast=acorn.parse(src,{ecmaVersion:'latest'}); }catch(e){ info.parse_error=String(e); pieces.push(info); continue; }
    const decl=ast.body.find(s=>s.type==='VariableDeclaration'&&s.declarations[0].id.name==='__mods');
    if(decl){ for(const p of decl.declarations[0].init.properties){ const id=keyOf(p); const fnn=p.value; const req=fnn.params[2]?.name;
        const sc=req?scan(fnn,req):{lits:[],dyn:0,chunk:0,amb:false}; info.modules.push({id,bytes:p.end-p.start,req,...sc}); if(idPiece[id]) (idPiece._dup=idPiece._dup||[]).push(id); idPiece[id]=piece; } }
    else { info.kind='resto'; info.stmts=ast.body.length; info.first=src.slice(0,160).replace(/\s+/g,' ');
      // chamadas com literal que coincidem com id de modulo (resolvidas depois)
      info.restLits=[]; walk(ast,n=>{ if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.arguments[0]&&n.arguments[0].type==='Literal') info.restLits.push([n.callee.name,String(n.arguments[0].value)]); }); }
    pieces.push(info); }
  res[name]={dir,pieces,idPiece}; }
fs.writeFileSync('C:/w/PiperLine/notes/piece_xref.json',JSON.stringify(res));
for(const [n,r] of Object.entries(res)) console.log(n,'pecas',r.pieces.length,'modulos',Object.keys(r.idPiece).filter(k=>k!=='_dup').length,'dup',(r.idPiece._dup||[]).length);
