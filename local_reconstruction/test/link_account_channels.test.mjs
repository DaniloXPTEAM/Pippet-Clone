// Adendo r19 (13/11/2026) — Link account com APENAS três canais (confirmado):
// TikTok, Facebook Page, Instagram Reels. Rota + menu observados; OAuth real continua bloqueado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-link-account-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };

try {
  const st = await api('/api/social');
  assert.equal(st.status, 200);
  assert.deepEqual(st.body.linkAccountChannels, ['TikTok', 'Facebook Page', 'Instagram Reels']);
  assert.match(st.body.note, /apenas TikTok, Facebook Page, Instagram Reels/);

  const c1 = await api('/api/social/connect', { platform: 'YouTube' });
  assert.equal(c1.status, 400, 'canal fora do Link account é recusado');
  assert.deepEqual(c1.body.allowed, ['TikTok', 'Facebook Page', 'Instagram Reels']);

  const c2 = await api('/api/social/connect', { platform: 'TikTok' });
  assert.equal(c2.status, 501, 'canal permitido continua bloqueado por OAuth real');
  assert.equal(c2.body.blocked, true);
  assert.match(c2.body.error, /OAuth/);
  const c3 = await api('/api/social/connect', { platform: 'Instagram Reels' });
  assert.equal(c3.status, 501);

  console.log('link_account_channels.test.mjs: ok (Link account = TikTok/Facebook Page/Instagram Reels; fora da lista = 400; OAuth real bloqueado)');
} finally { app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); }
