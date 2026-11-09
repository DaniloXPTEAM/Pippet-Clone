// Offline: extrai pares chave->texto-padrao de chamadas .t("chave", {...}, "Texto") em um chunk. Uso: node notes/i18n_pairs.mjs <arquivo> [saida.json]
import fs from 'node:fs';
const t = fs.readFileSync(process.argv[2], 'utf8'); const out = {};
const re = /\.t\(\s*["']([A-Za-z0-9_]+)["']\s*,\s*(\{[^{}]*\}|[^,()]+)\s*,\s*(["'`])/g; let m;
while ((m = re.exec(t))) {
  const q = m[3]; let i = re.lastIndex, s = '';
  while (i < t.length && t[i] !== q) { if (t[i] === String.fromCharCode(92)) { s += t[i + 1] === 'n' ? '\n' : t[i + 1]; i += 2; } else s += t[i++]; }
  if (/^(cc_|cc4b_|Pippit_|pippit_|web_)/.test(m[1])) out[m[1]] = s;
}
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(60), v.slice(0, 170).replace(/\n/g, ' '));
console.log(Object.keys(out).length, 'chaves');
