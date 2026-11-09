// Download AUTORIZADO pelo usuario (27/10/2026) de exatamente 3 JS estaticos publicos da pagina Omni (Foto falante). Sem cookies/credenciais.
// Saida: scripts/downloaded_omni/ + notes/_omni_download.json (url, status, bytes transferidos, bytes descomprimidos, headers relevantes, sha256).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
const BASE = 'https://sf16-web-login-neutral.capcutstatic.com/obj/capcut-web-login-static/ies/lvweb/platform-business_online/static/js/async/';
const FILES = ['Omni.22227907e5.js', '30538.9543fa0369.js', '549630.cc8177d2bb.js'];
const OUT = 'scripts/downloaded_omni'; fs.mkdirSync(OUT, { recursive: true }); const res = [];
for (const f of FILES) {
  const url = BASE + f; const r = await fetch(url, { headers: { 'accept-encoding': 'br', 'user-agent': 'Mozilla/5.0' }, redirect: 'error' });
  const enc = r.headers.get('content-encoding'); const raw = Buffer.from(await r.arrayBuffer()); // fetch ja descomprime; content-length e o tamanho transferido
  res.push({ file: f, url, status: r.status, content_type: r.headers.get('content-type'), content_encoding: enc, content_length: r.headers.get('content-length'), last_modified: r.headers.get('last-modified'), bytes_transferidos_aprox: Number(r.headers.get('content-length')) || null, bytes_descomprimidos: raw.length, sha256: crypto.createHash('sha256').update(raw).digest('hex') });
  if (r.status === 200) fs.writeFileSync(path.join(OUT, 'async__' + f), raw);
}
fs.writeFileSync('notes/_omni_download.json', JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
