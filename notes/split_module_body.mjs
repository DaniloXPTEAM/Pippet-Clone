// Divide UM módulo gigante (função) em pedaços por instruções do corpo, para análise estática por partes.
// Uso: node split_module_body.mjs <entrada.js> <pasta_saida> [limite_KB=60]
// Cada pedaço vira `function __part_N(<mesmos parâmetros>) { <instruções> }`.
// Limitação: variáveis declaradas em outro pedaço aparecem como "desconhecidas" na análise (fronteira explícita).
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const [, , inFile, outDir, limitArg] = process.argv;
const LIMIT = (Number(limitArg) || 60) * 1024;
const src = fs.readFileSync(inFile, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest' });
const obj = ast.body[0].declarations[0].init;
const prop = obj.properties[0];
const fn = prop.value;
const params = fn.params.map((p) => src.slice(p.start, p.end)).join(',');
const stmts = fn.body.body;
fs.mkdirSync(outDir, { recursive: true });
const base = path.basename(inFile, '.js');
const report = { arquivo: inFile, modulo: String(prop.key.value ?? prop.key.name), parametros: params, instrucoes: stmts.length, pecas: [] };
const sizes = stmts.map((s) => s.end - s.start);
report.maiores_instrucoes = [...sizes].sort((a, b) => b - a).slice(0, 5);
let group = [], size = 0, idx = 0;
const flush = () => {
  if (!group.length) return;
  const name = `${base}__part_${String(++idx).padStart(2, '0')}.js`;
  const code = `function __part_${idx}(${params}){\n${group.join('\n')}\n}`;
  fs.writeFileSync(path.join(outDir, name), code, 'utf8');
  report.pecas.push({ name, bytes: Buffer.byteLength(code), instrucoes: group.length });
  group = []; size = 0;
};
for (const s of stmts) {
  const code = src.slice(s.start, s.end);
  if (size + code.length > LIMIT && group.length) flush();
  group.push(code); size += code.length;
}
flush();
fs.writeFileSync(path.join(outDir, `${base}__split_report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
