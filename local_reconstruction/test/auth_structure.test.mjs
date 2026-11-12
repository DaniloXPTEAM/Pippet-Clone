// Rodada 7 item 3 + rodada 8 item 1 — camada de login com dois adaptadores funcionais: `local` (usuário único) e
// `supabase` (GoTrue). Prova: sessão/cookie/rotas protegidas reais no `local`; o `local` é o padrão e não chama rede;
// a chave nunca aparece na API. O contrato GoTrue completo tem teste próprio (supabase_auth.test.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-auth-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_TICK_MS = '3600000';

// servidor falso no lugar do Supabase: anota TODAS as requisições (o adaptador `local`, padrão, não pode chamar nenhuma)
const FAKE_KEY = 'chave-anon-de-mentira-nao-usar';
const hits = []; let googleOn = false;
const fake = http.createServer((req, res) => {
  hits.push(req.method + ' ' + req.url);
  res.writeHead(200, { 'content-type': 'application/json' });
  if (req.url.startsWith('/auth/v1/settings')) return res.end(JSON.stringify({ external: { google: googleOn, email: true }, mailer_autoconfirm: false }));
  if (req.url.startsWith('/auth/v1/token')) return res.end(JSON.stringify({ access_token: 'at-falso', refresh_token: 'rt-falso', expires_in: 3600, user: { id: 'u-falso', email: 'a@b.c', app_metadata: { provider: 'email' } } }));
  res.end('{}');
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
process.env.SUPABASE_URL = `http://127.0.0.1:${fake.address().port}`; process.env.SUPABASE_ANON_KEY = FAKE_KEY;

const AUTH = await import('../app/lib/auth.mjs');
// ---------- 1. primitivas
const h = AUTH.hashPassword('segredo-forte'); assert.match(h, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/); assert.ok(!h.includes('segredo-forte'), 'nunca guarda a senha em texto puro');
assert.equal(AUTH.verifyPassword('segredo-forte', h), true); assert.equal(AUTH.verifyPassword('errada', h), false); assert.equal(AUTH.verifyPassword('', null), false);
const secret = AUTH.loadSecret(tmp); assert.ok(secret.length >= 32); assert.equal(AUTH.loadSecret(tmp), secret, 'segredo estável no disco');
// Rodada 9, item 2: no Windows não há bits de permissão POSIX (chmod é no-op), então exigir 0600
// ali só gerava falha falsa. A asserção é pulada com motivo explícito; o resto do teste continua.
assert.equal(AUTH.secretModeEnforced('win32'), false, 'no Windows o modo 0600 não é exigível');
assert.equal(AUTH.secretModeEnforced('linux'), true);
// prova também o caminho sem argumento (o que roda de fato no Windows): simula process.platform
const platformReal = process.platform;
try {
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  assert.equal(AUTH.secretModeEnforced(), false, 'process.platform=win32 desliga a exigência de 0600');
} finally { Object.defineProperty(process, 'platform', { value: platformReal, configurable: true }); }
assert.equal(process.platform, platformReal);
if (AUTH.secretModeEnforced()) {
  assert.equal((fs.statSync(path.join(tmp, 'auth-secret')).mode & 0o777), 0o600, 'segredo do servidor só para o dono');
} else {
  console.log('[SKIP] auth_structure: modo 0600 do auth-secret não é verificável no Windows (não há permissão POSIX; a proteção depende da pasta do usuário) — ver LOGIN_ESTRUTURA.md');
}
const { token, session } = AUTH.newSession({ secret, userId: 'u1' });
assert.equal(AUTH.verifySession({ secret, token, sessions: [session] }).id, session.id);
assert.equal(AUTH.verifySession({ secret, token: token + 'x', sessions: [session] }), null, 'token adulterado não vale');
assert.equal(AUTH.verifySession({ secret, token, sessions: [{ ...session, expiresAt: new Date(Date.now() - 1000).toISOString() }] }), null, 'sessão expirada não vale');
assert.equal(AUTH.pruneSessions([session, { ...session, id: 'velha', expiresAt: '2000-01-01T00:00:00.000Z' }]).length, 1);
assert.deepEqual(AUTH.parseCookies('a=1; piperline_session=xyz%3D'), { a: '1', piperline_session: 'xyz=' });
assert.match(AUTH.sessionCookie('t'), /HttpOnly/); assert.match(AUTH.sessionCookie('t'), /SameSite=Lax/); assert.match(AUTH.sessionCookie('t'), /Path=\//);
// adaptadores: `local` é o padrão e funciona sem rede; `supabase` existe e fala GoTrue de verdade
const supa = AUTH.ADAPTERS.supabase.describe(); assert.equal(supa.enabled, true); assert.equal(supa.mode, 'funcional'); assert.equal(supa.configured, true, 'variáveis presentes são detectadas'); assert.equal(supa.baseUrlHost, `127.0.0.1:${fake.address().port}`);
assert.deepEqual(supa.oauth.map((o) => o.id), ['google', 'tiktok']); assert.match(supa.note, /GoTrue ligado/); assert.match(supa.note, /apikey/);
assert.deepEqual(AUTH.ADAPTERS.local.signIn({}).ok, true);
assert.equal(AUTH.authConfig({}).adapter, 'local', 'o padrão continua local'); assert.equal(AUTH.authConfig({ auth: { adapter: 'inventado' } }).adapter, 'local', 'adaptador desconhecido cai no local');

// ---------- 2. servidor real
const { server } = await import('../app/server.mjs'); const PORT = 5202; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); const txt = await r.text(); let b = null; try { b = JSON.parse(txt); } catch {} return { status: r.status, body: b, text: txt, cookie: (r.headers.get('set-cookie') || '').split(';')[0] }; };
const send = (m) => (p, b, headers = {}) => j(p, { method: m, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b || {}) }); const post = send('POST');

let A = (await j('/api/auth/state')).body;
assert.equal(A.adapter, 'local'); assert.equal(A.required, false); assert.equal(A.authenticated, true); assert.equal(A.user.provider, 'local');
assert.equal(A.hasPassword, false); assert.deepEqual(A.adapters.map((x) => x.id), ['local', 'supabase']);
assert.equal(A.adapters.find((x) => x.id === 'supabase').configured, true); assert.equal(A.adapters.find((x) => x.id === 'supabase').enabled, true);
assert.equal(A.adapterInfo.id, 'local'); assert.equal(A.contract.password, 'POST {SUPABASE_URL}/auth/v1/token?grant_type=password'); assert.match(A.contract.pkce, /grant_type=pkce/); assert.match(A.contract.settings, /auth\/v1\/settings/);
assert.deepEqual(A.oauth.map((o) => o.id), ['google', 'tiktok']);
assert.ok(!JSON.stringify(A).includes(FAKE_KEY), 'a chave do ambiente nunca volta na API');
assert.equal((await j('/api/projects')).status, 200, 'padrão continua aberto (usuário único local)');

// ---------- 3. exigir login: rotas /api/* protegidas de verdade
assert.equal((await post('/api/auth/require', { required: 'sim' })).status, 400);
assert.equal((await post('/api/auth/require', { required: true })).status, 200);
assert.equal((await j('/api/projects')).status, 401); const denied = await j('/api/state'); assert.equal(denied.status, 401); assert.equal(denied.body.authRequired, true); assert.match(denied.body.error, /não autenticado/);
assert.equal((await j('/api/auth/state')).status, 200, '/api/auth/* segue acessível (senão ninguém entra)');
assert.equal((await j('/api/auth/state')).body.authenticated, false);

// senha local (scrypt) e login
assert.equal((await post('/api/auth/password', { password: '123' })).status, 400);
assert.equal((await post('/api/auth/password', { password: 'senha-boa' })).status, 200);
assert.equal((await post('/api/auth/login', { password: 'errada' })).status, 401);
let login = await post('/api/auth/login', { password: 'senha-boa' }); assert.equal(login.status, 200, JSON.stringify(login.body));
assert.match(login.cookie, /^piperline_session=/); assert.ok(login.body.session.expiresAt);
const cookie = login.cookie;
assert.equal((await j('/api/projects', { headers: { cookie } })).status, 200, 'sessão válida libera a rota');
assert.equal((await j('/api/state', { headers: { cookie } })).status, 200);
assert.equal((await j('/api/projects', { headers: { cookie: 'piperline_session=token-inventado' } })).status, 401, 'token inventado não vale');
const sess = (await j('/api/auth/sessions', { headers: { cookie } })).body.sessions; assert.equal(sess.length, 1); assert.equal(sess[0].current, true); assert.equal(sess[0].adapter, 'local');
// o token só existe no cookie: no disco fica apenas o hash
const disk = fs.readFileSync(path.join(tmp, 'db.json'), 'utf8');
assert.ok(!disk.includes(cookie.split('=')[1]), 'token de sessão não é gravado em claro');
const stored = JSON.parse(disk).auth.sessions[0]; assert.match(stored.tokenHash, /^[0-9a-f]{64}$/); assert.ok(!disk.includes('senha-boa'), 'senha não é gravada em claro');

// revogar e sair
assert.equal((await j(`/api/auth/sessions/${stored.id}`, { method: 'DELETE' })).status, 200);
assert.equal((await j('/api/projects', { headers: { cookie } })).status, 401, 'sessão revogada deixa de valer');
login = await post('/api/auth/login', { password: 'senha-boa' }); const c2 = login.cookie;
assert.equal((await j('/api/projects', { headers: { cookie: c2 } })).status, 200);
const out = await post('/api/auth/logout', {}, { cookie: c2 }); assert.equal(out.status, 200); assert.equal(out.body.loggedOut, true); assert.match(out.cookie, /^piperline_session=$/);
assert.equal((await j('/api/projects', { headers: { cookie: c2 } })).status, 401, 'depois de sair a sessão morre');
assert.equal((await post('/api/auth/password', { password: 'outra-senha' }, { cookie: c2 })).status, 200, 'recupera acesso definindo nova senha');
login = await post('/api/auth/login', { password: 'senha-boa' }); assert.equal(login.status, 401, 'senha antiga não vale mais');
assert.equal((await post('/api/auth/login', { password: 'outra-senha' })).status, 200);

// ---------- 4. adaptador supabase: selecionável e funcional (o detalhe do contrato está em supabase_auth)
assert.equal(hits.length, 0, 'com o adaptador local (padrão) nenhuma chamada foi feita ao servidor falso');
assert.equal((await post('/api/auth/adapter', { adapter: 'xyz' })).status, 400);
let sel = await post('/api/auth/adapter', { adapter: 'supabase' }); assert.equal(sel.status, 200); assert.equal(sel.body.adapter, 'supabase');
A = (await j('/api/auth/state')).body; assert.equal(A.adapterInfo.id, 'supabase'); assert.equal(A.adapterInfo.mode, 'funcional');
assert.equal(A.supabase.reachable, true); assert.equal(A.supabase.google, false);
assert.equal((await post('/api/auth/require', { required: false })).status, 200);
assert.equal((await post('/api/auth/require', { required: true })).status, 200, 'com /auth/v1/settings respondendo, exigir login é permitido');
const supaLogin = await post('/api/auth/login', { email: 'a@b.c', password: 'x' }); assert.equal(supaLogin.status, 200, JSON.stringify(supaLogin.body));
assert.match(supaLogin.cookie, /^piperline_session=/); assert.ok(!JSON.stringify(supaLogin.body).includes('at-falso'), 'tokens não aparecem na resposta da API');
assert.equal((await j('/api/projects', { headers: { cookie: supaLogin.cookie } })).status, 200, 'sessão do Supabase vale para a API');
// OAuth: sem google=true no settings o GET recusa; com o provedor ligado, redireciona com PKCE (S256)
const blocked = await fetch(base + '/api/auth/oauth/google', { redirect: 'manual' });
assert.equal(blocked.status, 409); assert.match(await blocked.text(), /google=false|não está ligado/);
googleOn = true; assert.equal((await j('/api/auth/settings?force=1')).status, 200);
const rr = await fetch(base + '/api/auth/oauth/google', { redirect: 'manual' });
assert.equal(rr.status, 302, await rr.text());
const loc = rr.headers.get('location'); assert.match(loc, /\/auth\/v1\/authorize\?provider=google/); assert.match(loc, /code_challenge_method=s256/); assert.match(loc, /redirect_to=http%3A%2F%2F127\.0\.0\.1%3A5180%2Fauth%2Fcallback/);
assert.match(rr.headers.get('set-cookie') || '', /piperline_pkce=/);
assert.equal((await post('/api/auth/oauth/google', {})).status, 405, 'iniciar OAuth por POST não existe (use GET)');
assert.ok(hits.every((x) => /^(GET|POST) \/auth\/v1\//.test(x)), 'só chamadas ao GoTrue falso, nenhuma outra');
assert.ok(hits.every((x) => !x.includes(FAKE_KEY)), 'a chave vai em cabeçalho apikey, nunca na URL');
assert.equal((await post('/api/auth/logout', {})).status, 200);
// voltar ao local e sair do modo exigido
assert.equal((await post('/api/auth/adapter', { adapter: 'local' })).status, 200);
assert.equal((await post('/api/auth/require', { required: false })).status, 200);
assert.equal((await j('/api/projects')).status, 200, 'volta ao comportamento de usuário único');
console.log('auth_structure: OK');
fake.close(); server.close();
