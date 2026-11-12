// Adaptadores OAuth das redes sociais (TikTok, Facebook, Instagram, YouTube) — contrato direto, sem SDK.
// Linhas #9/#10 do inventário. Regras do projeto:
//  • credenciais SÓ por variável de ambiente (nomes no .env.example); nunca em arquivo, log, API ou tela;
//  • PKCE (S256) + state em TODAS as redes; callback em 127.0.0.1 (nunca localhost);
//  • tokens CIFRADOS no servidor (AES-256-GCM, seal/open de app/lib/auth.mjs) e nunca devolvidos em resposta;
//  • endpoints dos serviços = contratos DOCUMENTADOS públicos (não verificados contra o serviço real nesta
//    rodada — teste usa servidor falso; o que não foi observado está marcado UNOBSERVED no teste/docs).
// `PIPPIT_OAUTH_BASE_<REDE>` troca a ORIGEM das URLs (servidor falso de teste) mantendo os caminhos.
import crypto from 'node:crypto';
import { seal, open, base64url } from '../app/lib/auth.mjs';

export const NETWORKS = Object.freeze({
  tiktok: Object.freeze({
    id: 'tiktok', label: 'TikTok', pkce: true,
    env: { id: 'TIKTOK_CLIENT_KEY', secret: 'TIKTOK_CLIENT_SECRET', base: 'PIPPIT_OAUTH_BASE_TIKTOK' },
    authorize: 'https://www.tiktok.com/v2/auth/authorize/',
    token: 'https://open.tiktokapis.com/v2/oauth/token/',
    publish: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
    scopes: ['video.publish', 'video.upload'], publishMode: 'url',
  }),
  facebook: Object.freeze({
    id: 'facebook', label: 'Página do Facebook', pkce: false,
    env: { id: 'META_APP_ID', secret: 'META_APP_SECRET', base: 'PIPPIT_OAUTH_BASE_FACEBOOK' },
    authorize: 'https://www.facebook.com/v21.0/dialog/oauth',
    token: 'https://graph.facebook.com/v21.0/oauth/access_token',
    publish: 'https://graph.facebook.com/v21.0/me/videos',
    scopes: ['pages_manage_posts', 'pages_read_engagement'], publishMode: 'bytes',
  }),
  instagram: Object.freeze({
    id: 'instagram', label: 'Reels do Instagram', pkce: false,
    env: { id: 'META_APP_ID', secret: 'META_APP_SECRET', base: 'PIPPIT_OAUTH_BASE_INSTAGRAM' },
    authorize: 'https://www.facebook.com/v21.0/dialog/oauth',
    token: 'https://graph.facebook.com/v21.0/oauth/access_token',
    publish: 'https://graph.facebook.com/v21.0/me/media',
    publishConfirm: 'https://graph.facebook.com/v21.0/me/media_publish',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'], publishMode: 'url',
  }),
  youtube: Object.freeze({
    id: 'youtube', label: 'YouTube', pkce: true,
    env: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', base: 'PIPPIT_OAUTH_BASE_YOUTUBE' },
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    publish: 'https://www.googleapis.com/upload/youtube/v3/videos',
    scopes: ['https://www.googleapis.com/auth/youtube.upload'], publishMode: 'resumable',
  }),
});

export const networkFor = (id) => NETWORKS[String(id || '').toLowerCase()] || null;

// Troca a origem quando o ambiente define PIPIT_OAUTH_BASE_<REDE> (servidor falso); caminhos intactos.
export function endpoint(net, url) {
  const base = (process.env[net.env.base] || '').replace(/\/+$/, '');
  if (!base) return url;
  const u = new URL(url); const b = new URL(base);
  return `${b.origin}${u.pathname}${u.search}`;
}

export function clientEnv(net) {
  const clientId = process.env[net.env.id] || '';
  const clientSecret = process.env[net.env.secret] || '';
  return { clientId, clientSecret, configured: !!(clientId && clientSecret), problem: !clientId ? `defina ${net.env.id} no ambiente` : !clientSecret ? `defina ${net.env.secret} no ambiente` : null };
}

export const createState = () => base64url(crypto.randomBytes(24));
export function createPkceLocal() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 's256' };
}

// URL de autorização: client_id, state, redirect_uri (127.0.0.1) e PKCE S256 quando a rede exige.
export function authorizationUrl(net, { state, challenge, redirectUri } = {}) {
  const env = clientEnv(net);
  const u = new URL(endpoint(net, net.authorize));
  u.searchParams.set('client_id', env.clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', net.scopes.join(' '));
  u.searchParams.set('state', state);
  if (net.pkce && challenge) { u.searchParams.set('code_challenge', challenge); u.searchParams.set('code_challenge_method', 's256'); }
  return u.toString();
}

const form = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])).toString();

// Troca o code por tokens. Nunca lança por status HTTP; nunca devolve segredo da resposta além dos tokens.
export async function exchangeCode(net, { code, codeVerifier, redirectUri, fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const env = clientEnv(net);
  if (!env.configured) return { ok: false, error: `credencial ausente: ${env.problem}` };
  const body = form({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: env.clientId, client_secret: env.clientSecret, ...(net.pkce ? { code_verifier: codeVerifier } : {}) });
  return tokenRequest(net, body, fetchImpl, timeoutMs);
}

export async function refreshTokens(net, { refreshToken, fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const env = clientEnv(net);
  if (!env.configured) return { ok: false, error: `credencial ausente: ${env.problem}` };
  return tokenRequest(net, form({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: env.clientId, client_secret: env.clientSecret }), fetchImpl, timeoutMs);
}

async function tokenRequest(net, body, fetchImpl, timeoutMs) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint(net, net.token), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body, signal: ac.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error_description || data?.error || `token recusado (HTTP ${res.status})`, httpStatus: res.status };
    if (!data.access_token) return { ok: false, error: 'a rede não devolveu access_token' };
    return { ok: true, tokens: { accessToken: data.access_token, refreshToken: data.refresh_token || null, expiresIn: Number(data.expires_in) || null, tokenType: data.token_type || 'Bearer' } };
  } catch (e) {
    return { ok: false, error: `falha de rede na troca do code: ${String(e.message || e).slice(0, 160)}` };
  } finally { clearTimeout(t); }
}

// Publicar vídeo. Cada rede segue o contrato DOCUMENTADO (marcado como não verificado contra o serviço real):
//  • tiktok   — POST JSON {post_info, source_info:{video_url}} (direct post);
//  • facebook — POST multipart com os BYTES do vídeo + descrição (upload na Página);
//  • instagram— POST {media_type:'REELS', video_url, caption} → POST {creation_id} (container + publish);
//  • youtube  — upload RESUMABLE: POST (metadados, Location) → PUT (bytes) → id.
export async function publishVideo(net, { accessToken, videoUrl, videoBytes, caption = '', fetchImpl = fetch, timeoutMs = 60_000 } = {}) {
  const auth = { authorization: `Bearer ${accessToken}`, accept: 'application/json' };
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
  const call = (url, init) => fetchImpl(url, { ...init, signal: ac.signal });
  try {
    if (net.id === 'tiktok') {
      const res = await call(endpoint(net, net.publish), { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ post_info: { title: caption }, source_info: { video_url: videoUrl } }) });
      const data = await res.json().catch(() => ({}));
      return res.ok ? { ok: true, remoteId: data.publish_id || data.publish_id_string || null } : { ok: false, error: data?.error?.message || data?.error_description || `publicação recusada (HTTP ${res.status})` };
    }
    if (net.id === 'facebook') {
      if (!videoBytes?.length) return { ok: false, error: 'facebook exige os bytes do vídeo (upload na Página)' };
      const fd = new FormData(); fd.append('description', caption); fd.append('source', new Blob([videoBytes], { type: 'video/mp4' }), 'video.mp4'); fd.append('access_token', accessToken);
      const res = await call(endpoint(net, net.publish), { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      return res.ok ? { ok: true, remoteId: data.id || null } : { ok: false, error: data?.error?.message || `publicação recusada (HTTP ${res.status})` };
    }
    if (net.id === 'instagram') {
      const res = await call(endpoint(net, net.publish), { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error?.message || `contêiner recusado (HTTP ${res.status})` };
      const res2 = await call(endpoint(net, net.publishConfirm), { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ creation_id: data.id }) });
      const data2 = await res2.json().catch(() => ({}));
      return res2.ok ? { ok: true, remoteId: data2.id || null } : { ok: false, error: data2?.error?.message || `publicação recusada (HTTP ${res2.status})` };
    }
    if (net.id === 'youtube') {
      if (!videoBytes?.length) return { ok: false, error: 'youtube exige os bytes do vídeo (upload resumable)' };
      const start = await call(endpoint(net, net.publish) + '?uploadType=resumable', { method: 'POST', headers: { ...auth, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4' }, body: JSON.stringify({ snippet: { title: caption || 'vídeo', description: caption }, status: { privacyStatus: 'private' } }) });
      const loc = start.headers.get('location');
      if (!start.ok || !loc) return { ok: false, error: `upload resumable recusado (HTTP ${start.status})` };
      const up = await call(loc, { method: 'PUT', headers: { 'content-type': 'video/mp4', authorization: `Bearer ${accessToken}` }, body: videoBytes });
      const data = await up.json().catch(() => ({}));
      return up.ok ? { ok: true, remoteId: data.id || null } : { ok: false, error: `upload recusado (HTTP ${up.status})` };
    }
    return { ok: false, error: `rede desconhecida: ${net.id}` };
  } catch (e) {
    return { ok: false, error: `falha de rede na publicação: ${String(e.message || e).slice(0, 160)}` };
  } finally { clearTimeout(t); }
}

// ---------- tokens cifrados no servidor (nunca em claro no db.json; nunca em resposta)
export function saveTokens(store, net, tokens, secret, { now = Date.now() } = {}) {
  store[net.id] = {
    access: seal(secret, tokens.accessToken),
    refresh: tokens.refreshToken ? seal(secret, tokens.refreshToken) : null,
    expiresAt: tokens.expiresIn ? new Date(now + tokens.expiresIn * 1000).toISOString() : null,
    obtainedAt: new Date(now).toISOString(),
  };
  return { connected: true, expiresAt: store[net.id].expiresAt };
}
export function loadTokens(store, net, secret) {
  const raw = store?.[net.id]; if (!raw) return null;
  const accessToken = open(secret, raw.access); if (!accessToken) return null;
  return { accessToken, refreshToken: raw.refresh ? open(secret, raw.refresh) : null, expiresAt: raw.expiresAt, obtainedAt: raw.obtainedAt };
}
export const clearTokens = (store, net) => { delete store[net.id]; };

// Resumo público: só o contrato e o estado de conexão — NUNCA token/chave.
export function statusSummary(store, secret) {
  return Object.values(NETWORKS).map((net) => {
    const t = loadTokens(store, net, secret);
    return {
      id: net.id, label: net.label, scopes: [...net.scopes], pkce: net.pkce, publishMode: net.publishMode,
      env: { ...net.env }, connected: !!t, expiresAt: t?.expiresAt || null, hasRefreshToken: !!t?.refreshToken,
    };
  });
}
