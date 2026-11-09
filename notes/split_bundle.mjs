// Divide um bundle JS (minificado) em pedaços menores, por módulo, para análise estática pedaço a pedaço.
// Uso: node split_bundle.mjs <arquivo.js> <pasta_saida> [limite_KB=110]
// Só LÊ o arquivo de entrada. Não executa o código (apenas parse com acorn).
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const [, , inFile, outDir, limitArg] = process.argv;
const LIMIT = (Number(limitArg) || 110) * 1024;
const src = fs.readFileSync(inFile, 'utf8');
let ast;
try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true }); }
catch (e1) { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); }

// achar o maior ObjectExpression com muitas propriedades-função (mapa de módulos)
let best = null;
const isFn = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
(function walk(n) {
  if (!n || typeof n.type !== 'string') return;
  if (n.type === 'ObjectExpression') {
    const props = n.properties.filter((p) => p.type === 'Property' && isFn(p.value));
    if (props.length >= 8 && (!best || (n.end - n.start) > (best.end - best.start))) best = n;
  }
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
  }
})(ast);

fs.mkdirSync(outDir, { recursive: true });
const base = path.basename(inFile, '.js');
const report = { arquivo: inFile, bytes: src.length, topo: ast.body.length, strategy: '', pieces: [] };

function emit(name, code) { fs.writeFileSync(path.join(outDir, name), code, 'utf8'); report.pieces.push({ name, bytes: Buffer.byteLength(code) }); }

if (best) {
  report.strategy = `mapa de módulos: ${best.properties.length} propriedades`;
  // peça "rest": o arquivo sem o corpo do mapa (mantém o invólucro do chunk)
  emit(`${base}__rest.js`, src.slice(0, best.start) + '{}' + src.slice(best.end));
  let group = [], size = 0, idx = 0;
  const flush = () => { if (!group.length) return; emit(`${base}__mods_${String(++idx).padStart(2, '0')}.js`, 'var __mods={' + group.join(',') + '};'); group = []; size = 0; };
  for (const p of best.properties) {
    const code = src.slice(p.start, p.end);
    if (size + code.length > LIMIT && group.length) flush();
    group.push(code); size += code.length;
  }
  flush();
} else {
  report.strategy = 'sem mapa de módulos; divisão por instruções de topo';
  let group = [], size = 0, idx = 0;
  const flush = () => { if (!group.length) return; emit(`${base}__part_${String(++idx).padStart(2, '0')}.js`, group.join('\n')); group = []; size = 0; };
  for (const st of ast.body) {
    const code = src.slice(st.start, st.end);
    if (size + code.length > LIMIT && group.length) flush();
    group.push(code); size += code.length;
  }
  flush();
  const big = ast.body.map((s) => s.end - s.start).sort((a, b) => b - a).slice(0, 3);
  report.maiores_instrucoes_de_topo = big;
}
fs.writeFileSync(path.join(outDir, `${base}__split_report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ arquivo: path.basename(inFile), estrategia: report.strategy, pecas: report.pieces.length, maiores: report.pieces.map((p) => p.bytes).sort((a, b) => b - a).slice(0, 3), topo: ast.body.length, maiores_topo: report.maiores_instrucoes_de_topo }));
