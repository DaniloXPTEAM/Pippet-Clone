// Linhas #9/#10: adaptadores OAuth das redes (TikTok, Facebook, Instagram, YouTube) — PKCE/state, callback
// em 127.0.0.1, tokens cifrados no servidor, fila de publicação e fluxo "gerar vídeo → publicar" ponta a ponta
// contra SERVIDOR FALSO. O que não foi observado no Pippit real fica marcado UNOBSERVED (conteúdo/resultado real).
// Nenhum teste chama a internet: PIPIT_OAUTH_BASE_<REDE> aponta para o servidor falso de loopback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-oauth-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.TIKTOK_CLIENT_KEY = 'tiktok-key-test';
process.env.TIKTOK_CLIENT_SECRET = 'tiktok-secret-test';
process.env.META_APP_ID = 'meta-id-test';
process.env.META_APP_SECRET = 'meta-secret-test';
process.env.GOOGLE_CLIENT_ID = 'google-id-test';
process.env.GOOGLE_CLIENT_SECRET = 'google-secret-test';

const FFMPEG = process.env.PIPPIT_FFMPEG || 'ffmpeg';
const media = path.join(tmp, 'media'); fs.mkdirSync(media, { recursive: true });
const make = (name, args) => { const out = path.join(media, name); execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args, out]); return out; };
const PNG_FILE = make('foto.png', ['-f', 'lavfi', '-i', 'color=c=0x558844:s=400x400', '-frames:v', '1']);
const WAV_FILE = make('voz.wav', ['-f', 'lavfi', '-i', 'sine=frequency=330:duration=1', '-ar', '16000', '-ac', '1']);
const MP4_FILE = make('clipe.mp4', ['-f', 'lavfi', '-i', 'color=c=green:s=320x240:d=1', '-pix_fmt', 'yuv420p', '-r', '24']);

// ---------- servidor falso das redes (um host, caminhos de cada provedor) ----------
const net = { hits: [], tokenError: false, publishError: false };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const u = new URL(req.url, 'http://127.0.0.1'); const raw = Buffer.concat(chunks);
    net.hits.push({ method: req.method, path: u.pathname + u.search, auth: req.headers.authorization || null, body: raw.toString('utf8'), bytes: raw.length, contentType: req.headers['content-type'] || '' });
    const json = (code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
    const isToken = u.pathname === '/v2/oauth/token/' || u.pathname === '/v21.0/oauth/access_token' || u.pathname === '/token';
    if (isToken && req.method === 'POST') {
      if (net.tokenError) return json(400, { error: 'invalid_grant', error_description: 'code inválido ou expirado' });
      const who = u.pathname === '/v2/oauth/token/' ? 'tiktok' : u.pathname === '/token' ? 'google' : 'meta';
      return json(200, { access_token: `tok-plain-${who}-1`, refresh_token: `ref-plain-${who}-1`, expires_in: 3600, token_type: 'Bearer' });
    }
    if (u.pathname === '/v2/post/publish/video/init/') return net.publishError ? json(400, { error: { message: 'permissão recusada pelo TikTok' } }) : json(200, { publish_id: 'tt-pub-1', status: 'PUBLISH_COMPLETE' });
    if (u.pathname === '/v21.0/me/videos') return net.publishError ? json(400, { error: { message: 'permissão recusada pela Meta' } }) : json(200, { id: 'fb-video-1', success: true });
    if (u.pathname === '/v21.0/me/media') return json(200, { id: 'ig-container-1' });
    if (u.pathname === '/v21.0/me/media_publish') return json(200, { id: 'ig-reel-1' });
    if (u.pathname === '/upload/youtube/v3/videos' && req.method === 'POST') return json(200, {}, { location: `http://127.0.0.1:${fake.address().port}/resumable/up-1` });
    if (u.pathname === '/resumable/up-1' && req.method === 'PUT') return json(200, { id: 'yt-video-1', status: { privacyStatus: 'private' } });
    return json(404, { error: `rota falsa ${req.method} ${u.pathname}` });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const fakeBase = `http://127.0.0.1:${fake.address().port}`;
for (const k of ['PIPPIT_OAUTH_BASE_TIKTOK', 'PIPPIT_OAUTH_BASE_FACEBOOK', 'PIPPIT_OAUTH_BASE_INSTAGRAM', 'PIPPIT_OAUTH_BASE_YOUTUBE']) process.env[k] = fakeBase;

const { server: app } = await import('../app/server.mjs');
const OAS = await import('../src/oauth_social.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
process.env.PIPERLINE_PUBLIC_ORIGIN = base;

const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 300);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };
const tick = async () => { const r = await api('/api/jobs/tick', {}); assert.equal(r.status, 200); };
const jobOf = async (id) => (await api('/api/jobs', undefined, 'GET')).body.find((j) => j.id === id);

try {
  // ---------- contrato: 4 redes, nomes de variáveis no .env.example, nada de segredo na API ----------
  const st = ok(await api('/api/oauth/social/status', undefined, 'GET'), 'status inicial');
  assert.deepEqual(st.networks.map((n) => n.id), ['tiktok', 'facebook', 'instagram', 'youtube']);
  assert.ok(st.networks.every((n) => n.connected === false), 'nenhuma rede conectada no início');
  assert.ok(st.networks.every((n) => n.env.id && n.env.secret), 'cada rede expõe os NOMES das variáveis (não os valores)');
  assert.match(st.redirectUri, /^http:\/\/127\.0\.0\.1:\d+\/api\/oauth\/social\/callback$/, 'callback em 127.0.0.1');
  assert.ok(st.networks.every((n) => JSON.stringify(n).indexOf('tok-plain') < 0 && JSON.stringify(n).indexOf('secret-test') < 0), 'nenhum segredo em resposta');
  const envDoc = fs.readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const name of ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'META_APP_ID', 'META_APP_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'PIPPIT_OAUTH_BASE_TIKTOK']) assert.ok(envDoc.includes(name), `.env.example documenta ${name}`);

  // ---------- PKCE + state ----------
  delete process.env.GOOGLE_CLIENT_ID;
  const semCred = await api('/api/oauth/social/start', { network: 'youtube' });
  assert.equal(semCred.status, 409); assert.match(semCred.body.error, /GOOGLE_CLIENT_ID/);
  process.env.GOOGLE_CLIENT_ID = 'google-id-test';

  const s1 = ok(await api('/api/oauth/social/start', { network: 'tiktok' }), 'iniciar TikTok');
  const authUrl = new URL(s1.authorizeUrl);
  assert.equal(authUrl.origin + authUrl.pathname, fakeBase + '/v2/auth/authorize/');
  assert.equal(authUrl.searchParams.get('client_id'), 'tiktok-key-test');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 's256');
  assert.ok(authUrl.searchParams.get('code_challenge'), 'PKCE S256 presente');
  assert.equal(authUrl.searchParams.get('state'), s1.state);
  assert.match(authUrl.searchParams.get('redirect_uri'), /^http:\/\/127\.0\.0\.1:\d+\/api\/oauth\/social\/callback$/);
  assert.ok(authUrl.searchParams.get('scope').includes('video.publish'));

  const errState = await api(`/api/oauth/social/callback?network=tiktok&code=code-1&state=FORJADO`, undefined, 'GET');
  assert.equal(errState.status, 400); assert.match(errState.body.error, /state/);

  const cb = ok(await api(`/api/oauth/social/callback?network=tiktok&code=code-tt-1&state=${encodeURIComponent(s1.state)}`, undefined, 'GET'), 'callback TikTok');
  assert.equal(cb.connected, true);
  const tokHit = net.hits.find((h) => h.path === '/v2/oauth/token/');
  assert.ok(tokHit, 'a troca do code foi ao servidor da rede');
  assert.ok(tokHit.body.includes('code_verifier='), 'PKCE: code_verifier enviado');
  assert.ok(tokHit.body.includes('code=code-tt-1') && tokHit.body.includes('client_secret=tiktok-secret-test'), 'code + segredo do AMBIENTE');

  // tokens CIFRADOS no disco: o db.json não pode conter o token em claro
  const dbText = fs.readFileSync(path.join(tmp, 'db.json'), 'utf8');
  assert.ok(!dbText.includes('tok-plain-tiktok-1') && !dbText.includes('ref-plain-tiktok-1'), 'token cifrado no disco (AES-256-GCM)');
  const st2 = ok(await api('/api/oauth/social/status', undefined, 'GET'), 'status pós-conexão');
  assert.equal(st2.networks.find((n) => n.id === 'tiktok').connected, true);
  assert.equal(st2.networks.find((n) => n.id === 'tiktok').hasRefreshToken, true);
  assert.ok(!JSON.stringify(st2).includes('tok-plain'), 'API nunca devolve token');

  // ---------- fluxo "gerar vídeo → publicar" ponta a ponta contra o servidor falso ----------
  // 1) GERAR: foto + voz → vídeo por executor local (script falso que copia um MP4 pronto) — mesmo caminho do lipsync
  const script = path.join(tmp, 'gerar_falso.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs'; const out = process.argv[4]; fs.copyFileSync(${JSON.stringify(MP4_FILE)}, out);\n`);
  ok(await api('/api/providers/talkingphoto', { adapter: 'local-command', command: `"${process.execPath}" "${script}" {image} {audio} {out}`, maxAudioSeconds: 120 }), 'configurar geração local');
  const uploadAsset = async (name, file, type) => { const r = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': type, 'x-cat': 'upload' }, body: fs.readFileSync(file) }); assert.equal(r.status, 200, `upload de ${name}`); return r.json(); };
  const foto = await uploadAsset('foto.png', PNG_FILE, 'image/png');
  const voz = await uploadAsset('voz.wav', WAV_FILE, 'audio/wav');
  const quote = ok(await api('/api/talking-photo/quote', { assetId: foto.id, audioAssetId: voz.id }), 'orçamento');
  const gen = ok(await api('/api/talking-photo/generate', { assetId: foto.id, audioAssetId: voz.id }), 'criar tarefa de vídeo');
  ok(await api(`/api/talking-photo/jobs/${gen.job.id}/authorize`, { confirm: true, quoteDigest: gen.quote.digest }), 'autorizar geração');
  const fim = Date.now() + 60_000; let gj = null;
  while (Date.now() < fim) { await tick(); gj = await jobOf(gen.job.id); if (['succeeded', 'failed', 'canceled'].includes(gj.state)) break; await new Promise((r) => setTimeout(r, 40)); }
  assert.equal(gj.state, 'succeeded', `vídeo gerado (estado ${gj.state}: ${gj.error || ''})`);
  const assets = (await api('/api/assets', undefined, 'GET')).body.assets || (await api('/api/assets', undefined, 'GET')).body;
  const video = (Array.isArray(assets) ? assets : []).find((a) => a.kind === 'video');
  assert.ok(video && video.id, 'vídeo gerado virou asset');
  void quote;

  // bytes do asset servidos para as redes que aceitam URL
  const served = await fetch(`${base}/api/assets/${video.id}/file`);
  assert.equal(served.status, 200); assert.equal(served.headers.get('content-type'), 'video/mp4');
  assert.ok((await served.arrayBuffer()).byteLength > 0);

  // 2) PUBLICAR sem todas as contas: nunca "publicado" — "falhou" com o motivo
  const fila0 = ok(await api('/api/social/queue', { assetId: video.id, caption: 'Primeiro clipe #teste', platforms: [1], networks: ['youtube'] }), 'enfileirar (youtube solto)');
  const semYt = await api(`/api/social/queue/${fila0.task.id}/publish`);
  assert.equal(semYt.status, 502); assert.match(semYt.body.task.reason, /youtube não vinculada/);
  assert.equal(semYt.body.task.state, 'falhou');

  // 3) conectar as demais redes (Meta e Google) e publicar DE VERDADE contra o servidor falso
  for (const rede of ['facebook', 'instagram', 'youtube']) {
    const s = ok(await api('/api/oauth/social/start', { network: rede }), `iniciar ${rede}`);
    ok(await api(`/api/oauth/social/callback?network=${rede}&code=code-${rede}-1&state=${encodeURIComponent(s.state)}`, undefined, 'GET'), `callback ${rede}`);
  }
  const fila1 = ok(await api('/api/social/queue', { assetId: video.id, caption: 'Publicação e2e — café & pão', platforms: [1, 311, 301], networks: ['youtube'], hashtags: ['#teste', 'avaliação'] }), 'enfileirar tudo');
  const pub = ok(await api(`/api/social/queue/${fila1.task.id}/publish`), 'publicar ponta a ponta');
  assert.equal(pub.task.state, 'publicado', pub.task.reason || '');
  assert.deepEqual(pub.task.remoteIds, { tiktok: 'tt-pub-1', facebook: 'fb-video-1', instagram: 'ig-reel-1', youtube: 'yt-video-1' }, 'cada rede devolveu o id remoto');

  // o servidor falso recebeu os 4 envios no contrato documentado (UNOBSERVED quanto ao serviço real)
  if (process.env.OAUTH_DEBUG) { const t0 = net.hits.find((h) => h.path === '/v2/post/publish/video/init/'); console.log('TT', JSON.stringify(t0 && { m: t0.method, p: t0.path, a: t0.auth, b: t0.body.slice(0, 200) }), 'URLPROCURADA', `/api/assets/${video.id}/file`); }
  const tt = net.hits.find((h) => h.path === '/v2/post/publish/video/init/');
  assert.ok(tt && tt.auth === 'Bearer tok-plain-tiktok-1' && tt.body.includes('Publicação e2e') && tt.body.includes(`/api/assets/${video.id}/file`), 'TikTok: JSON com URL + legenda, Bearer do token cifrado');
  const fb = net.hits.find((h) => h.path === '/v21.0/me/videos');
  assert.ok(fb && fb.contentType.startsWith('multipart/form-data') && fb.body.includes('Publicação e2e') && fb.body.includes('video.mp4'), 'Facebook: multipart com BYTES do vídeo + descrição');
  const ig1 = net.hits.filter((h) => h.path === '/v21.0/me/media'); const ig2 = net.hits.filter((h) => h.path === '/v21.0/me/media_publish');
  assert.equal(ig1.length, 1); assert.equal(ig2.length, 1); assert.ok(ig1[0].body.includes('REELS') && ig1[0].body.includes('caption'), 'Instagram: contêiner REELS com legenda');
  const yt = net.hits.filter((h) => h.path.startsWith('/upload/youtube/v3/videos'));
  const ytPut = net.hits.find((h) => h.path === '/resumable/up-1');
  assert.equal(yt.length, 1); assert.equal(yt[0].auth, 'Bearer tok-plain-google-1', 'YouTube: resumable com Bearer');
  assert.ok(ytPut && ytPut.method === 'PUT' && ytPut.bytes > 0, 'YouTube: upload dos bytes na segunda etapa');

  // ---------- refresh, desconexão e erros honestos ----------
  const refreshed = await OAS.refreshTokens(OAS.NETWORKS.tiktok, { refreshToken: 'ref-plain-tiktok-1' });
  assert.equal(refreshed.ok, true); assert.equal(refreshed.tokens.accessToken, 'tok-plain-tiktok-1');
  assert.ok(net.hits.some((h) => h.path === '/v2/oauth/token/' && h.body.includes('grant_type=refresh_token')), 'refresh grant enviado');

  ok(await api('/api/oauth/social/disconnect', { network: 'tiktok' }), 'desconectar TikTok');
  const st3 = ok(await api('/api/oauth/social/status', undefined, 'GET'), 'status pós-desconexão');
  assert.equal(st3.networks.find((n) => n.id === 'tiktok').connected, false);

  // erro de troca de code: motivo claro, sem sucesso inventado
  net.tokenError = true;
  const sErr = ok(await api('/api/oauth/social/start', { network: 'youtube' }), 'iniciar (para o erro)');
  const cbErr = await api(`/api/oauth/social/callback?network=youtube&code=x&state=${encodeURIComponent(sErr.state)}`, undefined, 'GET');
  assert.equal(cbErr.status, 502); assert.match(cbErr.body.error, /code inválido ou expirado/);
  net.tokenError = false;

  // erro de publicação: a rede recusou → "falhou" com o motivo da rede (nunca sucesso inventado)
  ok(await api('/api/oauth/social/disconnect', { network: 'youtube' }), 'limpar youtube');
  const sYt = ok(await api('/api/oauth/social/start', { network: 'youtube' }), 'reiniciar youtube');
  ok(await api(`/api/oauth/social/callback?network=youtube&code=c&state=${encodeURIComponent(sYt.state)}`, undefined, 'GET'), 'reconectar youtube');
  const sTt = ok(await api('/api/oauth/social/start', { network: 'tiktok' }), 'reiniciar tiktok');
  ok(await api(`/api/oauth/social/callback?network=tiktok&code=c&state=${encodeURIComponent(sTt.state)}`, undefined, 'GET'), 'reconectar tiktok');
  net.publishError = true;
  const fila2 = ok(await api('/api/social/queue', { assetId: video.id, caption: 'falha esperada', platforms: [1] }), 'enfileirar p/ erro');
  const pubErr = await api(`/api/social/queue/${fila2.task.id}/publish`);
  assert.equal(pubErr.status, 502); assert.match(pubErr.body.task.reason, /permissão recusada pelo TikTok/);
  assert.equal(pubErr.body.task.state, 'falhou');
  net.publishError = false;

  console.log('ok (test/oauth_social.test.mjs)');
} finally {
  await new Promise((r) => app.close(r)); await new Promise((r) => fake.close(r));
}
