// Download de chunks JS ESTATICOS do build atual (autorizado pelo usuario em 29/10/2026), sem cookies/credenciais e sem redirecionamento.
// Uso: node notes/download_chunks.mjs <saida.json> nome1.hash.js nome2.hash.js ...   (nomes como aparecem no mapa do runtime novo)
// Registra URL, status HTTP, tamanho transferido (content-length) e descompactado, sha256 e cabecalhos relevantes. Nao sobrescreve arquivos existentes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const OUT = 'scripts/current_20261029'; const rt = fs.readFileSync(path.join(OUT, fs.readdirSync(OUT).find((f) => /runtime\./.test(f))), 'utf8');
const pub = rt.match(/i\.p="([^"]+)"/)[1]; const BASE = `https:${pub}static/js/async/`; const [meta, ...names] = process.argv.slice(2); const res = [];
for (const n of names) {
  const url = BASE + n; const file = path.join(OUT, 'async__' + n.replace(/[\\/]/g, '__')); if (fs.existsSync(file)) { res.push({ name: n, url, pulado: 'ja existe localmente' }); continue; }
  try {
    const r = await fetch(url, { headers: { 'accept-encoding': 'br', 'user-agent': 'Mozilla/5.0' }, redirect: 'error' }); const body = Buffer.from(await r.arrayBuffer());
    const row = { name: n, url, status: r.status, content_type: r.headers.get('content-type'), content_encoding: r.headers.get('content-encoding'), content_length: r.headers.get('content-length'), last_modified: r.headers.get('last-modified'), bytes_descomprimidos: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex') };
    if (r.status === 200) fs.writeFileSync(file, body); else row.limitacao = 'nao disponivel publicamente sem credenciais: nao contornado'; res.push(row);
  } catch (e) { res.push({ name: n, url, erro: String(e.message || e).slice(0, 200) }); }
}
fs.writeFileSync(meta, JSON.stringify(res, null, 1)); for (const x of res) console.log(x.status ?? x.pulado ?? x.erro, String(x.content_length ?? '').padStart(8), String(x.bytes_descomprimidos ?? '').padStart(8), x.name, x.limitacao || '');
