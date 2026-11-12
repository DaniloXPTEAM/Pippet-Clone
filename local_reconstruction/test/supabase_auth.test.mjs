// Rodada 8 · item 1 — login Supabase REAL sobre o GoTrue, com servidor falso imitando o Supabase.
// Cobre: settings (google ligado/desligado), signup (confirmação de e-mail, senha curta, e-mail repetido),
// senha (200/401/429), refresh, logout, user, recover, OAuth Google com PKCE S256 (code_challenge/verifier,
// state, erro no callback, verifier errado) e a garantia de que nenhum token aparece em resposta de API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-gotrue-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPERLINE_PUBLIC_ORIGIN = 'http://127.0.0.1:5205';

// ---------------- servidor falso do GoTrue
const seen = []; let googleOn = true; let challengeOk = null;
const users = new Map([['conta@teste.dev', { password: 'senha-boa', id: 'u-1', name: 'Conta Teste' }]]);
const tokens = new Set();
const s256 = (v) => crypto.createHash('sha256').update(v).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const issued = (email) => { const at = 'AT-' + crypto.randomBytes(8).toString('hex'), rt = 'RT-' + crypto.randomBytes(8).toString('hex'); tokens.add(at); tokens.add(rt); return { access_token: at, refresh_token: rt, token_type: 'bearer', expires_in: 3600, user: userOf(email) }; };
const userOf = (email) => { const u = users.get(email) || { id: 'u-x', name: 'Conta' }; return { id: u.id, email, email_confirmed_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z', app_metadata: { provider: /^google@/.test(email) ? 'google' : 'email' }, user_metadata: { full_name: u.name } }; };
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); });
const fake = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const body = await readBody(req); let json = {}; try { json = body ? JSON.parse(body) : {}; } catch {}
  seen.push({ method: req.method, path: u.pathname + (u.search ? u.search : ''), apikey: req.headers.apikey || null, auth: req.headers.authorization || null, body: json });
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
  const p = u.pathname;
  if (p === '/auth/v1/settings') return send(200, { external: googleOn ? { google: true, email: true } : {}, email: true, mailer_autoconfirm: false });
  if (p === '/auth/v1/signup' && req.method === 'POST') {
    if (String(json.password || '').length < 6 || json.password === 'fraca1') return send(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters' });
    if (users.has(json.email) || /existe/.test(json.email)) return send(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    if (/confirmar/.test(json.email)) return send(200, { id: 'u-conf', email: json.email, confirmation_sent_at: '2026-11-09T00:00:00Z' });
    users.set(json.email, { password: json.password, id: 'u-new', name: 'Nova' }); return send(200, issued(json.email));
  }
  if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
    if (/limite/.test(json.email)) return send(429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Too many requests' });
    const acc = users.get(json.email);
    if (!acc || acc.password !== json.password) return send(400, { code: 400, error_code: 'invalid_credentials', error_description: 'Invalid login credentials' });
    return send(200, issued(json.email));
  }
  if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token') {
    if (json.refresh_token !== 'RT-bom' && !tokens.has(json.refresh_token)) return send(400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    tokens.delete(json.refresh_token); return send(200, issued('conta@teste.dev'));
  }
  if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'pkce') {
    const verifier = String(json.code_verifier || '');
    if (!challengeOk || s256(verifier) !== challengeOk) return send(400, { error: 'invalid_grant', error_description: 'code verifier does not match code challenge' });
    const email = 'google@teste.dev'; if (!users.has(email)) users.set(email, { password: '', id: 'u-g', name: 'Google' });
    return send(200, issued(email));
  }
  if (p === '/auth/v1/logout' && req.method === 'POST') { if (!req.headers.authorization) return send(401, { msg: 'no token' }); return send(204); }
  if (p === '/auth/v1/user' && req.method === 'GET') { if (!req.headers.authorization) return send(401, { msg: 'no token' }); return send(200, userOf('conta@teste.dev')); }
  if (p === '/auth/v1/recover' && req.method === 'POST') return send(200, {});
  return send(404, { msg: 'rota não implementada no falso: ' + p + u.search });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
process.env.SUPABASE_URL = `http://127.0.0.1:${fake.address().port}`; process.env.SUPABASE_ANON_KEY = 'ANON-DE-MENTIRA-NAO-USAR';

const AUTH = await import('../app/lib/auth.mjs');
// ---------- 1. primitivas do cliente GoTrue
assert.equal(AUTH.publicOrigin(), 'http://127.0.0.1:5205'); assert.equal(AUTH.oauthRedirectTo(), 'http://127.0.0.1:5205/auth/callback');
process.env.PIPERLINE_PUBLIC_ORIGIN = 'http://localhost:5180'; assert.equal(AUTH.publicOrigin(), 'http://127.0.0.1:5180', 'localhost é sempre trocado por 127.0.0.1'); process.env.PIPERLINE_PUBLIC_ORIGIN = 'http://127.0.0.1:5205';
const pk = AUTH.createPkce(); assert.equal(pk.verifier.length, 43); assert.equal(pk.method, 's256'); assert.equal(pk.challenge, s256(pk.verifier));
assert.match(AUTH.authorizeUrl({ challenge: pk.challenge }).url, /provider=google&redirect_to=http%3A%2F%2F127\.0\.0\.1%3A5205%2Fauth%2Fcallback&code_challenge=.*code_challenge_method=s256/);
const sealed = AUTH.seal('segredo', 'AT-secreto'); assert.ok(!sealed.includes('AT-secreto')); assert.equal(AUTH.open('segredo', sealed), 'AT-secreto'); assert.equal(AUTH.open('outro', sealed), null);
assert.equal(AUTH.gotrueError(429), 'muitas tentativas: aguarde alguns minutos antes de tentar de novo (o Supabase limitou as requisições)');
assert.match(AUTH.gotrueError(422, { error_code: 'weak_password' }), /senha curta ou fraca/); assert.match(AUTH.gotrueError(422, { error_code: 'user_already_exists' }), /já está cadastrado/);
assert.match(AUTH.gotrueError(400, { error_code: 'email_not_confirmed' }), /confirme seu e-mail/); assert.equal(AUTH.gotrueError(400, { error_code: 'invalid_credentials' }), 'e-mail ou senha inválidos');
const st0 = await AUTH.supabaseAdapter.settings(); assert.deepEqual({ ok: st0.ok, google: st0.google, email: st0.email }, { ok: true, google: true, email: true });
assert.ok(seen.every((r) => r.apikey === 'ANON-DE-MENTIRA-NAO-USAR'), 'apikey em TODAS as chamadas');
const su = await AUTH.supabaseAdapter.signUp({ email: 'confirmar@teste.dev', password: 'senha-boa' });
assert.equal(su.ok, true); assert.equal(su.needsEmailConfirmation, true); assert.equal(su.tokens, null, 'com confirmação ligada o GoTrue não devolve sessão');
assert.equal((await AUTH.supabaseAdapter.signUp({ email: 'novo@teste.dev', password: '123' })).status, 422);
assert.match((await AUTH.supabaseAdapter.signUp({ email: 'existe@teste.dev', password: 'senha-boa' })).error, /já está cadastrado/);

// ---------- 2. rotas reais do app
const { server } = await import('../app/server.mjs'); const PORT = 5205; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, { redirect: 'manual', ...o }); const text = await r.text(); let b = null; try { b = JSON.parse(text); } catch {} return { status: r.status, body: b, text, cookie: (r.headers.getSetCookie?.() || []).join(' | '), location: r.headers.get('location') }; };
const sendJ = (m) => (p, b, headers = {}) => j(p, { method: m, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b || {}) });
const post = sendJ('POST');
const setAdapter = async () => { const r = await post('/api/auth/adapter', { adapter: 'supabase' }); assert.equal(r.status, 200, JSON.stringify(r.body)); };
await setAdapter();
let A = (await j('/api/auth/state')).body;
assert.equal(A.adapter, 'supabase'); assert.equal(A.supabase.google, true, 'settings.google detectado'); assert.equal(A.supabase.email, true);
assert.equal(A.adapterInfo.enabled, true); assert.equal(A.adapterInfo.mode, 'funcional');
assert.ok(!JSON.stringify(A).includes('ANON-DE-MENTIRA-NAO-USAR'), 'a chave nunca volta na API');
assert.equal(A.redirectTo, 'http://127.0.0.1:5205/auth/callback');

// signup: confirmação de e-mail (sem sessão) e erros do GoTrue traduzidos
let r = await post('/api/auth/signup', { email: 'confirmar@teste.dev', password: 'senha-boa' });
assert.equal(r.status, 200); assert.equal(r.body.needsEmailConfirmation, true); assert.match(r.body.message, /confirme seu e-mail/i); assert.equal(r.cookie, '');
assert.equal((await post('/api/auth/signup', { email: 'x@y.dev', password: '123' })).status, 400, 'senha curta recusada antes de chamar');
r = await post('/api/auth/signup', { email: 'novo2@teste.dev', password: 'fraca1' }); assert.equal(r.status, 422); assert.match(r.body.error, /senha curta ou fraca/);
r = await post('/api/auth/signup', { email: 'existe@teste.dev', password: 'senha-boa' }); assert.equal(r.status, 422); assert.match(r.body.error, /já está cadastrado/);
assert.equal((await post('/api/auth/signup', { email: 'sem-arroba', password: 'senha-boa' })).status, 400);
// signup com autoconfirmação (usuário novo comum) já devolve cookie de sessão
r = await post('/api/auth/signup', { email: 'auto@teste.dev', password: 'senha-boa' }); assert.equal(r.status, 200); assert.equal(r.body.needsEmailConfirmation, false); assert.match(r.cookie, /piperline_session=/);

// senha: 401, 429 e 200 com cookie httpOnly
r = await post('/api/auth/login', { email: 'conta@teste.dev', password: 'errada' }); assert.equal(r.status, 400); assert.match(r.body.error, /e-mail ou senha inválidos/);
r = await post('/api/auth/login', { email: 'limite@teste.dev', password: 'x' }); assert.equal(r.status, 429); assert.match(r.body.error, /muitas tentativas/);
assert.equal((await post('/api/auth/login', {})).status, 400);
r = await post('/api/auth/login', { email: 'conta@teste.dev', password: 'senha-boa' }); assert.equal(r.status, 200, JSON.stringify(r.body));
assert.match(r.cookie, /piperline_session=/); assert.match(r.cookie, /HttpOnly/); assert.match(r.cookie, /SameSite=Lax/);
assert.ok(!JSON.stringify(r.body).includes('AT-'), 'tokens fora da resposta do login');
const cookie = (r.cookie.match(/piperline_session=[^;|]+/) || [''])[0];
A = (await j('/api/auth/state', { headers: { cookie } })).body; assert.equal(A.authenticated, true); assert.equal(A.user.email, 'conta@teste.dev'); assert.equal(A.user.provider, 'email'); assert.equal(A.user.adapter, 'supabase');
assert.equal(A.session.mode, 'tokens cifrados no servidor');
assert.ok(!JSON.stringify(A).includes('AT-') && !JSON.stringify(A).includes('RT-'), 'estado da API sem token');
const dbRaw = fs.readFileSync(path.join(tmp, 'db.json'), 'utf8');
assert.ok(!dbRaw.includes('AT-') && !dbRaw.includes('RT-'), 'tokens não ficam em claro no disco');
assert.equal((await j('/api/projects', { headers: { cookie } })).status, 200);
assert.equal((await j('/api/projects', { headers: { cookie: 'piperline_session=inventado' } })).status, 200, 'login não exigido por padrão continua abrindo');

// refresh e logout
r = await post('/api/auth/refresh', {}, { cookie }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.refreshed, true); assert.ok(!JSON.stringify(r.body).includes('AT-'));
const cookie2 = (r.cookie.match(/piperline_session=[^;|]+/) || [cookie])[0];
assert.equal((await post('/api/auth/refresh', {})).status, 401, 'sem sessão não há refresh');
const beforeLogout = seen.length;
r = await post('/api/auth/logout', {}, { cookie: cookie2 }); assert.equal(r.status, 200); assert.equal(r.body.loggedOut, true); assert.equal(r.body.revokedRemote, true);
assert.ok(seen.slice(beforeLogout).some((x) => x.path === '/auth/v1/logout' && /^Bearer AT-/.test(x.auth || '')), 'logout também é chamado no GoTrue');
assert.equal((await post('/api/auth/refresh', {}, { cookie: cookie2 })).status, 401, 'sessão encerrada não renova');
assert.ok(!(await j('/api/auth/sessions')).body.sessions.some((s) => s.email === 'conta@teste.dev'), 'a sessão encerrada não está mais na lista');

// recuperar senha
r = await post('/api/auth/recover', { email: 'conta@teste.dev' }); assert.equal(r.status, 200); assert.match(r.body.message, /Se este e-mail estiver cadastrado/);
assert.equal((await post('/api/auth/recover', {})).status, 400);

// ---------- 3. OAuth Google com PKCE
r = await j('/api/auth/oauth/google'); assert.equal(r.status, 302);
const authz = new URL(r.location);
assert.equal(authz.origin + authz.pathname, `http://127.0.0.1:${fake.address().port}/auth/v1/authorize`);
assert.equal(authz.searchParams.get('provider'), 'google'); assert.equal(authz.searchParams.get('redirect_to'), 'http://127.0.0.1:5205/auth/callback');
assert.equal(authz.searchParams.get('code_challenge_method'), 's256'); assert.ok(authz.searchParams.get('code_challenge').length > 20);
assert.ok(!r.location.includes('localhost'), 'redirect sempre em 127.0.0.1');
const pkceCookie = (r.cookie.match(/piperline_pkce=[^;|]+/) || [''])[0]; assert.match(pkceCookie, /piperline_pkce=/);
// verifier errado: o falso passa a exigir outro challenge → callback recusa
challengeOk = s256('verifier-que-nao-e-o-do-servidor');
const wrong = await j(`/auth/callback?code=abc&state=${encodeURIComponent(decodeURIComponent(pkceCookie.split('.')[1] || ''))}`, { headers: { cookie: pkceCookie } });
assert.equal(wrong.status, 400); assert.match(wrong.text, /Não foi possível concluir o login/); assert.match(wrong.text, /verifier PKCE não confere/);
assert.equal((await j(`/auth/callback?code=abc&state=xxx`, { headers: { cookie: pkceCookie } })).status, 400, 'state recusado depois de usado');
// fluxo correto: novo pedido, challenge do servidor aceito
r = await j('/api/auth/oauth/google'); const authz2 = new URL(r.location); challengeOk = authz2.searchParams.get('code_challenge');
const pkceCookie2 = (r.cookie.match(/piperline_pkce=[^;|]+/) || [''])[0]; const state2 = decodeURIComponent(pkceCookie2.split('.')[1]);
const cb = await j(`/auth/callback?code=code-bom&state=${encodeURIComponent(state2)}`, { headers: { cookie: pkceCookie2 } });
assert.equal(cb.status, 302, cb.text); assert.equal(cb.location, '/#/login?supabase=ok'); assert.match(cb.cookie, /piperline_session=/); assert.match(cb.cookie, /piperline_pkce=;/);
const gCookie = (cb.cookie.match(/piperline_session=[^;|]+/) || [''])[0];
A = (await j('/api/auth/state', { headers: { cookie: gCookie } })).body; assert.equal(A.user.email, 'google@teste.dev'); assert.equal(A.user.provider, 'google');
// callback com erro do provedor e callback sem code
assert.equal((await j('/auth/callback?error=access_denied')).status, 400); assert.match((await j('/auth/callback?error=access_denied')).text, /Login cancelado/);
assert.equal((await j('/auth/callback')).status, 400);
// reuso do mesmo pedido é recusado (uso único)
assert.equal((await j(`/auth/callback?code=code-bom&state=${encodeURIComponent(state2)}`, { headers: { cookie: pkceCookie2 } })).status, 400);

// ---------- 4. settings sem google=true: botão desligado e rota recusa
googleOn = false; await j('/api/auth/settings?force=1');
A = (await j('/api/auth/state')).body; assert.equal(A.supabase.google, false);
const noGoogle = await j('/api/auth/oauth/google'); assert.equal(noGoogle.status, 409); assert.match(noGoogle.body.error, /não está ligado neste projeto/);
assert.match(JSON.stringify(A.oauth), /PKCE/);

// ---------- 5. sem SUPABASE_URL: adaptador não pode ser escolhido e login não chama nada
const savedUrl = process.env.SUPABASE_URL; delete process.env.SUPABASE_URL;
const out = await post('/api/auth/adapter', { adapter: 'supabase' }); assert.equal(out.status, 409); assert.match(out.body.error, /SUPABASE_URL/);
r = await post('/api/auth/login', { email: 'a@b.dev', password: 'x' }); assert.equal(r.status, 503); assert.match(r.body.error, /Supabase não configurado|SUPABASE_URL/, 'sem URL configurada o login não finge sucesso');
process.env.SUPABASE_URL = savedUrl;
// a chave nunca apareceu em chamada de API nem em arquivo
assert.ok(!fs.readFileSync(path.join(tmp, 'db.json'), 'utf8').includes('ANON-DE-MENTIRA-NAO-USAR'), 'chave anônima não é gravada');
assert.ok(seen.every((x) => !String(x.body?.password || '').includes('ANON')), 'nenhuma chamada carrega a chave no corpo');
// volta para local (padrão) e limpa
await post('/api/auth/adapter', { adapter: 'local' }); assert.equal((await j('/api/auth/state')).body.adapter, 'local');
console.log('supabase_auth: OK');
fake.close(); server.close();
