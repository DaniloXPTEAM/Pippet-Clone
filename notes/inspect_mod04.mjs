import fs from 'node:fs';
import * as acorn from 'acorn';
const src = fs.readFileSync('C:\\w\\PiperLine\\scripts\\split\\landing_771\\771.5a26a240f4__mods_04.js', 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 'latest' });
const decl = ast.body[0].declarations[0].init; // ObjectExpression
console.log('propriedades:', decl.properties.length);
for (const p of decl.properties) {
  const size = p.end - p.start; const body = p.value.body;
  const stmts = body && body.type === 'BlockStatement' ? body.body.length : (body ? 1 : 0);
  console.log(String(p.key.value ?? p.key.name).padEnd(10), String(size).padStart(7), 'bytes', 'instruções no corpo:', stmts);
}
