// Mostra janelas de contexto em torno de um token nos bundles RECUPERADOS (somente leitura, offline). Uso: node bundle_ctx.mjs <prefixo-do-arquivo> <token> [antes=350] [depois=600] [max=3] [offsetInicial=0]
import fs from 'node:fs';
const [pre, tok, b = 350, a = 600, mx = 3, from = 0] = process.argv.slice(2); const d = 'C:/w/PiperLine/scripts/auth_bundles/'; const f = fs.readdirSync(d).find((x) => x.startsWith('async__' + pre + '.') || x.startsWith('async__' + pre + '_'));
if (!f) { console.log('arquivo não encontrado'); process.exit(1); } const t = fs.readFileSync(d + f, 'utf8'); let i = Number(from) - 1, n = 0; console.log('#', f, t.length);
while ((i = t.indexOf(tok, i + 1)) >= 0 && n < Number(mx)) { console.log(`--- @${i}`); console.log(t.slice(Math.max(0, i - Number(b)), i + Number(a)).replace(/\s+/g, ' ')); n++; }
