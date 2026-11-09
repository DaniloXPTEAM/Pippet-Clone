import fs from 'node:fs'; import vm from 'node:vm'; import { globSync } from 'node:fs';
const p = process.argv[2]; const t = fs.readFileSync(p, 'utf8');
const i = t.indexOf('.u=e=>'); const start = i + 3; // "e=>..."
// pega ate o proximo ",f." no nivel de topo da expressao (heuristica por balanceamento de parenteses)
let depth = 0, j = start;
for (; j < t.length; j++) { const c = t[j]; if ('({['.includes(c)) depth++; else if (')}]'.includes(c)) depth--; else if (c === ',' && depth === 0) break; }
const expr = t.slice(start, j);
const u = vm.runInNewContext('(' + expr + ')', {});
const ids = new Set([...expr.matchAll(/\b(\d{1,4})\s*:/g)].map(m => m[1]).concat([...expr.matchAll(/"(\d{1,4})"===e/g)].map(m => m[1])));
const out = {};
for (const id of [...ids].sort((a, b) => a - b)) { try { out[id] = u(id); } catch (e) { out[id] = 'ERRO ' + e.message; } }
console.log(JSON.stringify(out, null, 0));
