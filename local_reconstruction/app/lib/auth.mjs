// Camada de autenticação — adaptadores plugáveis com contrato único.
//  • `local`   : usuário único da instalação (PADRÃO). Sessão por cookie HttpOnly assinado (HMAC), guardada só como hash.
//  • `supabase`: implementação real sobre o GoTrue (Supabase Auth). Lê SUPABASE_URL/SUPABASE_ANON_KEY do AMBIENTE
//                (nunca de arquivo/log/tela) e manda o cabeçalho `apikey` em TODAS as chamadas. Fluxos implementados:
//                signup, senha, refresh, logout, user, recover, settings e OAuth Google com PKCE (S256).
// Os tokens do GoTrue ficam só no servidor, CIFRADOS no disco (AES-256-GCM com o segredo local) e nunca aparecem em
// resposta de API, log ou relatório. A API só informa booleanos (`configured`, `google`, `e-mail ligado`).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SESSION_COOKIE = 'piperline_session';
export const SESSION_TTL_MS = 7 * 24 * 3600_000;

// Contrato de OAuth (só descrição: endpoints, escopos e o que falta). Nenhuma URL é chamada.
export const OAUTH_PROVIDERS = Object.freeze({
  google: Object.freeze({ id: 'google', label: 'Google', scopes: ['openid', 'email', 'profile'], authorizePath: '/auth/v1/authorize?provider=google', tokenPath: '/auth/v1/token?grant_type=pkce', redirectEnv: 'SUPABASE_REDIRECT_URL' }),
  tiktok: Object.freeze({ id: 'tiktok', label: 'TikTok', scopes: ['user.info.basic'], authorizePath: '/auth/v1/authorize?provider=tiktok', tokenPath: '/auth/v1/token?grant_type=pkce', redirectEnv: 'SUPABASE_REDIRECT_URL' }),
});

const supabaseEnv = () => ({ url: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''), key: process.env.SUPABASE_ANON_KEY || '' });

// ---------- GoTrue (Supabase Auth) — cliente mínimo, sem SDK
export const GOTRUE_TIMEOUT_MS = 10_000;
export const OAUTH_CALLBACK_PATH = '/auth/callback';
// Sempre 127.0.0.1 (nunca localhost): é o que o Supabase precisa ter na lista de Redirect URLs.
export function publicOrigin() {
  const raw = process.env.PIPERLINE_PUBLIC_ORIGIN || 'http://127.0.0.1:5180';
  return String(raw).replace(/\/+$/, '').replace(/\/\/localhost(?=[:/]|$)/i, '//127.0.0.1');
}
export const oauthRedirectTo = () => publicOrigin() + OAUTH_CALLBACK_PATH;
// Só https, ou http quando o host é o loopback literal 127.0.0.1 (servidor falso de teste).
export function supabaseConfig() {
  const { url, key } = supabaseEnv();
  let base = null, problem = null;
  if (!url) problem = 'SUPABASE_URL não definida no ambiente';
  else {
    try { const u = new URL(url); const loop = u.hostname === '127.0.0.1' || u.hostname === '::1'; if (u.protocol !== 'https:' && !(u.protocol === 'http:' && loop)) problem = 'SUPABASE_URL precisa ser https (http só para 127.0.0.1 no servidor falso)'; else base = url.replace(/\/+$/, ''); } catch { problem = 'SUPABASE_URL inválida'; }
  }
  if (!key) problem = problem || 'SUPABASE_ANON_KEY não definida no ambiente';
  return { base, key, configured: !!(base && key), problem, redirectTo: oauthRedirectTo() };
}

// Chamada ao GoTrue. `apikey` vai SEMPRE; `Authorization` só quando há token de acesso.
// Devolve { ok, status, data, error } — nunca lança por status HTTP e nunca devolve a chave.
export async function gotrue(pathandquery, { method = 'GET', body, accessToken, timeoutMs = GOTRUE_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const cfg = supabaseConfig();
  if (!cfg.configured) return { ok: false, status: 0, data: null, error: `Supabase não configurado: ${cfg.problem}` };
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const headers = { apikey: cfg.key, accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const res = await fetchImpl(`${cfg.base}${pathandquery}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ac.signal });
    const text = await res.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 300) }; }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : gotrueError(res.status, data) };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? `GoTrue não respondeu em ${Math.round(timeoutMs / 1000)} s` : `falha de rede com o GoTrue: ${String(e.message || e).slice(0, 160)}`;
    return { ok: false, status: 0, data: null, error: msg };
  } finally { clearTimeout(timer); }
}
// Tradução das mensagens do GoTrue: sem vazar token, sem inventar sucesso.
export function gotrueError(status, data) {
  const code = String(data?.error_code || data?.code || '').toLowerCase();
  const msg = String(data?.msg || data?.error_description || data?.message || data?.error || '').trim();
  if (status === 429) return 'muitas tentativas: aguarde alguns minutos antes de tentar de novo (o Supabase limitou as requisições)';
  if (/user_already_exists|already registered|already been registered/i.test(code + ' ' + msg)) return 'este e-mail já está cadastrado: use "Entrar" ou recupere a senha';
  if (/email_not_confirmed/i.test(code + ' ' + msg)) return 'confirme seu e-mail antes de entrar (verifique a caixa de entrada)';
  if (status === 422 || /weak_password|password.*(short|weak)/i.test(code + ' ' + msg)) return `senha curta ou fraca: ${msg || 'use ao menos 6 caracteres'}`;
  if (status === 401 || /invalid_credentials|invalid_grant/i.test(code + ' ' + msg)) return 'e-mail ou senha inválidos';
  if (/invalid api key/i.test(msg)) return 'a chave pública (SUPABASE_ANON_KEY) não confere com este projeto';
  return msg || `o GoTrue respondeu ${status}`;
}

// ---------- PKCE (S256) para o OAuth do Google
export const base64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function createPkce(bytes = 32) {
  const verifier = base64url(crypto.randomBytes(bytes)); // 43 caracteres, dentro de 43–128
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 's256' };
}
export function authorizeUrl({ provider = 'google', challenge, redirectTo = oauthRedirectTo() } = {}) {
  const cfg = supabaseConfig();
  if (!cfg.configured) return { ok: false, error: `Supabase não configurado: ${cfg.problem}` };
  const u = new URL(`${cfg.base}/auth/v1/authorize`);
  u.searchParams.set('provider', provider); u.searchParams.set('redirect_to', redirectTo);
  if (challenge) { u.searchParams.set('code_challenge', challenge); u.searchParams.set('code_challenge_method', 's256'); }
  return { ok: true, url: u.toString(), redirectTo };
}

// ---------- tokens cifrados no disco (AES-256-GCM; a chave é o segredo local do servidor)
export function seal(secret, value) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(String(secret)).digest(), iv);
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${enc.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}
export function open(secret, payload) {
  try {
    const [v, iv, enc, tag] = String(payload || '').split('.');
    if (v !== 'v1' || !iv || !enc || !tag) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(String(secret)).digest(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(enc, 'base64url')), d.final()]).toString('utf8');
  } catch { return null; }
}

// ---------- senha local (scrypt, sal por usuário; nunca texto puro)
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [kind, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const got = crypto.scryptSync(String(password), salt, 32);
  const want = Buffer.from(hash, 'hex');
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

// ---------- segredo do servidor (arquivo local 0600; nunca em log, nunca em /api)
// No Windows não existem os bits de permissão do POSIX: o chmod(0600) vira no-op e o arquivo herda
// a ACL da pasta. Ali a proteção do segredo depende da pasta do usuário (perfil do Windows), não do
// modo do arquivo — por isso o teste não exige 0600 no win32 e a documentação diz isso com palavras.
export const secretModeEnforced = (platform = process.platform) => platform !== 'win32';
export function loadSecret(dataDir) {
  const file = path.join(dataDir, 'auth-secret');
  try { const s = fs.readFileSync(file, 'utf8').trim(); if (s.length >= 32) return s; } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, s, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
  return s;
}

export const hashToken = (token, secret) => crypto.createHmac('sha256', secret).update(String(token)).digest('hex');

export function newSession({ secret, userId, adapter = 'local', ttlMs = SESSION_TTL_MS, now = Date.now() }) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    session: { id: 's' + crypto.randomBytes(6).toString('hex'), tokenHash: hashToken(token, secret), userId, adapter, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString() },
  };
}

export function pruneSessions(sessions = [], now = Date.now()) {
  return sessions.filter((s) => { const t = Date.parse(s.expiresAt); return Number.isFinite(t) && t > now; });
}

export function verifySession({ secret, token, sessions = [], now = Date.now() }) {
  if (!token) return null;
  const want = Buffer.from(hashToken(token, secret), 'hex');
  for (const s of sessions) {
    const got = Buffer.from(String(s.tokenHash || ''), 'hex');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) continue;
    if (!(Date.parse(s.expiresAt) > now)) return null;
    return s;
  }
  return null;
}

// ---------- cookie
export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) { const i = part.indexOf('='); if (i < 0) continue; const k = part.slice(0, i).trim(); if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
export const sessionCookie = (token, { maxAgeSec = Math.floor(SESSION_TTL_MS / 1000) } = {}) =>
  `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
export const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// ---------- adaptadores
export const localAdapter = Object.freeze({
  id: 'local', label: 'Local (usuário único)', mode: 'funcional', enabled: true, configured: true,
  env: [], secrets: [],
  describe: () => ({ id: 'local', label: 'Local (usuário único)', mode: 'funcional', enabled: true, requiresPassword: false, note: 'Usuário único da instalação, como hoje. Sessão por cookie HttpOnly; senha opcional (definida em Configurações > Login).' }),
  signIn: ({ password, passwordHash } = {}) => {
    if (passwordHash && !verifyPassword(password || '', passwordHash)) return { ok: false, error: 'senha incorreta' };
    return { ok: true, user: { id: 'local', name: 'local', email: 'local@piperline.invalid', provider: 'local' } };
  },
});

// Usuário do GoTrue → formato interno (sem token nenhum).
export function normalizeUser(u) {
  if (!u || typeof u !== 'object') return null;
  const md = u.user_metadata || {};
  return {
    id: String(u.id || ''), email: String(u.email || ''), name: String(md.full_name || md.name || (u.email || '').split('@')[0] || 'conta'),
    avatarUrl: md.avatar_url || null, provider: String(u.app_metadata?.provider || (u.identities?.[0]?.provider) || 'email'),
    emailConfirmed: !!(u.email_confirmed_at || u.confirmed_at), createdAt: u.created_at || null,
  };
}
const tokenBag = (data) => ({
  accessToken: String(data?.access_token || ''), refreshToken: String(data?.refresh_token || ''),
  expiresIn: Number(data?.expires_in) || 3600, tokenType: data?.token_type || 'bearer',
});
const hasTokens = (bag) => !!(bag.accessToken && bag.refreshToken);

export const supabaseAdapter = Object.freeze({
  id: 'supabase', label: 'Supabase (GoTrue)', mode: 'funcional', enabled: true,
  get configured() { return supabaseConfig().configured; },
  env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'], secrets: ['SUPABASE_ANON_KEY'],
  describe: () => {
    const cfg = supabaseConfig();
    return {
      id: 'supabase', label: 'Supabase (GoTrue)', mode: 'funcional', enabled: true, configured: cfg.configured,
      baseUrlHost: cfg.base ? safeHost(cfg.base) : null,                    // host apenas; nunca a chave
      problem: cfg.problem, redirectTo: cfg.redirectTo,
      env: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
      endpoints: {
        signup: 'POST {SUPABASE_URL}/auth/v1/signup', password: 'POST {SUPABASE_URL}/auth/v1/token?grant_type=password',
        refresh: 'POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token', pkce: 'POST {SUPABASE_URL}/auth/v1/token?grant_type=pkce',
        logout: 'POST {SUPABASE_URL}/auth/v1/logout', user: 'GET {SUPABASE_URL}/auth/v1/user',
        recover: 'POST {SUPABASE_URL}/auth/v1/recover', settings: 'GET {SUPABASE_URL}/auth/v1/settings',
        authorize: '{SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to={redirect}&code_challenge=…&code_challenge_method=s256',
      },
      oauth: Object.values(OAUTH_PROVIDERS).map((p) => ({ ...p, status: 'implementado com PKCE (S256); precisa do provedor ligado no projeto' })),
      note: cfg.configured
        ? 'GoTrue ligado: todas as chamadas mandam o cabeçalho apikey; tokens ficam só no servidor, cifrados, e nunca aparecem em resposta de API.'
        : `Supabase não configurado: ${cfg.problem}. Defina as variáveis no ambiente (nunca em arquivo).`,
    };
  },
  // GET /auth/v1/settings — descobre se Google e e-mail estão ligados no projeto.
  async settings({ fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/settings', { fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error };
    const ext = r.data?.external || {};
    return { ok: true, google: ext.google === true, email: r.data?.email === true, providers: Object.keys(ext), mailerAutoconfirm: r.data?.mailer_autoconfirm === true };
  },
  async signUp({ email, password, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/signup', { method: 'POST', body: { email, password }, fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error, code: r.data?.error_code || r.data?.code || null };
    const bag = tokenBag(r.data); const user = normalizeUser(r.data?.user || r.data);
    if (hasTokens(bag)) return { ok: true, user, tokens: bag, needsEmailConfirmation: false };
    return { ok: true, user, tokens: null, needsEmailConfirmation: true, message: 'Cadastro criado: confirme seu e-mail (o projeto exige confirmação) antes de entrar.' };
  },
  async signIn({ email, password, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error, code: r.data?.error_code || r.data?.code || null };
    const bag = tokenBag(r.data); if (!hasTokens(bag)) return { ok: false, status: 502, error: 'o GoTrue autenticou mas não devolveu sessão' };
    return { ok: true, user: normalizeUser(r.data.user), tokens: bag };
  },
  async exchangeCode({ authCode, codeVerifier, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: authCode, code_verifier: codeVerifier }, fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error };
    const bag = tokenBag(r.data); if (!hasTokens(bag)) return { ok: false, status: 502, error: 'o GoTrue não devolveu sessão no callback' };
    return { ok: true, user: normalizeUser(r.data.user), tokens: bag };
  },
  async refresh({ refreshToken, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken }, fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error };
    const bag = tokenBag(r.data); if (!hasTokens(bag)) return { ok: false, status: 502, error: 'o GoTrue não devolveu tokens no refresh' };
    return { ok: true, user: normalizeUser(r.data.user), tokens: bag };
  },
  async getUser({ accessToken, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/user', { accessToken, fetchImpl });
    if (!r.ok) return { ok: false, status: r.status, error: r.error };
    return { ok: true, user: normalizeUser(r.data) };
  },
  async logout({ accessToken, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/logout', { method: 'POST', accessToken, fetchImpl });
    // 401/403 = token já inválido: a sessão local é encerrada do mesmo jeito
    return { ok: r.ok || r.status === 401 || r.status === 403, status: r.status, error: r.ok ? null : r.error };
  },
  async recover({ email, fetchImpl } = {}) {
    const r = await gotrue('/auth/v1/recover', { method: 'POST', body: { email, redirect_to: oauthRedirectTo() }, fetchImpl });
    return r.ok ? { ok: true } : { ok: false, status: r.status, error: r.error };
  },
});

export const ADAPTERS = Object.freeze({ local: localAdapter, supabase: supabaseAdapter });
export const adapterFor = (id) => ADAPTERS[id] || localAdapter;

function safeHost(u) { try { return new URL(u).host; } catch { return null; } }

// Configuração persistida (settings.auth). Sempre normalizada; nunca contém chave.
export function authConfig(settings = {}) {
  const a = settings.auth || {};
  const adapter = ADAPTERS[a.adapter] ? a.adapter : 'local';
  return { adapter, required: a.required === true, hasPassword: typeof settings.auth?.passwordHash === 'string' && settings.auth.passwordHash.length > 0 };
}

// ---------- administrador (14/11/2026): login com credencial do AMBIENTE; créditos ilimitados.
// PIPPIT_ADMIN_EMAIL + PIPPIT_ADMIN_PASSWORD (mín. 8 caracteres). Nunca no repositório, nunca em resposta de API.
const sha = (v) => crypto.createHash('sha256').update(String(v ?? '')).digest();
export function adminConfig(env = process.env) {
  const email = String(env.PIPPIT_ADMIN_EMAIL || '').trim().toLowerCase(); const pw = String(env.PIPPIT_ADMIN_PASSWORD || '');
  return { configured: !!email && pw.length >= 8, email: email || null };
}
export function verifyAdmin({ email, password } = {}, env = process.env) {
  const c = adminConfig(env); if (!c.configured) return false;
  const emailOk = crypto.timingSafeEqual(sha(String(email || '').trim().toLowerCase()), sha(c.email));
  const passOk = crypto.timingSafeEqual(sha(password), sha(env.PIPPIT_ADMIN_PASSWORD));
  return emailOk && passOk;
}
