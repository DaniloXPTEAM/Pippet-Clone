// Servidor local da reconstrucao do Pippit (sem dependencias). Uso: node app/server.mjs  -> http://127.0.0.1:5180
// Primeiro import de proposito: carrega o .env local (ignorado pelo git) antes de qualquer outro
// módulo ler variável de ambiente. O ambiente do processo sempre tem prioridade; nada é impresso.
import { envFileSummary } from './lib/env-file.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import * as S from './lib/store.mjs';
import * as media from './lib/media.mjs';
import { userMessage } from './lib/agent.mjs';
import { VIDEO_MODELS, IMAGE_MODELS, AUDIO_MODELS, VIDEO_RATIOS, IMAGE_RATIOS, VIDEO_RES, IMAGE_RES, SKILLS, NODE_PANELS, MARKETING, videoCost, NEEDS } from './lib/catalog.mjs';
import { OFFICIAL, SKILL_DEFS, skillDef, skillSummary } from './lib/skilldefs.mjs';
import { PLANS, AVATAR_RULES, getPlan } from '../src/plans.mjs';
import * as WMARK from './lib/watermark.mjs';
import * as AUTH from './lib/auth.mjs';
import * as BILL from '../src/billing.mjs';
import { NODE_TYPES, NODE_TOOLS, Canvas } from '../src/canvas.mjs';
import { validatePhoto, canAdvance, photoAvatarAccess, videoAvatarAccess } from '../src/avatar.mjs';
import { buildPageViewUrl } from '../src/pageview.mjs';
import { DirectGen, newDirectState } from '../src/directgen.mjs';
import { generateImage } from '../src/imagegen.mjs';
import * as SP from '../src/skillpkg.mjs';
import * as PV from '../src/providers.mjs';
import * as PUB from '../src/publishing.mjs';
import * as TP from './lib/talking_photo_contract.mjs';
import * as TPH from './lib/talkingphoto.mjs';
import { planChunks, normalizeTranscription, offsetWords, cuesFromWords, cuesFromText, toSrt, keepRangesFromWords, clipSegments, MAX_CHUNK_MS } from './lib/transcribe.mjs';
import { JobManager } from './lib/jobs.mjs';
import { createRouterLLM, RouterLLM, ROUTER_LLM_MIN_TIMEOUT_MS } from './lib/router_llm.mjs';
import { composeWorkflow } from './lib/compose.mjs';
import { LLM, DEFAULT_BASE_URL, llmCreateSkill, llmRefinePrompt, llmSmartIdeas } from '../src/llm.mjs';
import { resolveVoiceEngine, voiceStatus } from './lib/voice.mjs';
import { FREE_PROVIDER_CATALOG, FREE_PROVIDER_DEFAULTS, ROUTER_TASKS, newFreeRouterConfig, publicFreeRouterConfig, validateFreeRouterConfig, planFreeRoutes, executeFreeRoutes, createFreeRouterAdapters, availabilitySnapshot, clearAvailability, markUnavailable, classifyFreeRouterError, omniRouterProviderEntry, sniffImageMime, sniffAudioMime, credentialEnvNames, stackProviderEntries, DEFAULT_TASK_PREFERENCES, CLOUDFLARE_AUDIO_MODEL, FREELLMAPI_MODEL, NOVAI_VIDEO_MODEL, NOVAI_VIDEO_DURATION, NOVAI_POLL_MS, NOVAI_VIDEO_DAILY_LIMIT, isAllowedAssetUrl } from '../src/free_router.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, 'public');
// Raiz da imagem da marca d'água. Por padrão dentro de app/public (servida em /assets/...), mas o
// teste precisa de uma pasta temporária: ele não pode mais escrever em arquivo versionado
// (assets/brand/watermark.png). `PIPPIT_BRAND_DIR` só muda de onde a imagem é lida/gravada; nada
// mais do app passa a olhar para lá.
const BRAND_DIR = process.env.PIPPIT_BRAND_DIR ? path.resolve(process.env.PIPPIT_BRAND_DIR) : PUBLIC;
const PORT = Number(process.env.PORT || 5180);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };
const db = () => S.load();
const runtimeKeys = new Map();
const SECRET_ENV = { llm: 'PIPPIT_LLM_API_KEY', imageProvider: 'PIPPIT_IMAGE_API_KEY', video: 'PIPPIT_VIDEO_API_KEY', audio: 'PIPPIT_AUDIO_API_KEY', image: 'PIPPIT_IMAGE_PROVIDER_API_KEY', talkingphoto: 'PIPPIT_TALKINGPHOTO_API_KEY' };
function scrubPersistedSecrets() {
  const settings = db().settings; let changed = false;
  const strip = (obj, name) => { if (obj && typeof obj.apiKey === 'string' && obj.apiKey) { if (!runtimeKeys.has(name)) runtimeKeys.set(name, obj.apiKey); delete obj.apiKey; changed = true; } };
  strip(settings.llm, 'llm'); strip(settings.imageProvider, 'imageProvider');
  for (const [kind, cfg] of Object.entries(settings.providers || {})) strip(cfg, kind);
  if (changed) S.save();
}
scrubPersistedSecrets();
function secretFor(name) { return process.env[SECRET_ENV[name]] || runtimeKeys.get(name) || ''; }
function providerRuntimeSettings() {
  const settings = structuredClone(db().settings); const p = { ...(settings.providers || {}) };
  for (const kind of ['video', 'audio', 'image', 'talkingphoto']) if (p[kind] || runtimeKeys.has(kind) || process.env[SECRET_ENV[kind]]) {
    p[kind] = { ...(p[kind] || {}), apiKey: secretFor(kind) || undefined };
    if (p[kind].baseUrl && !isLocalEndpoint(p[kind].baseUrl)) { p[kind].baseUrl = ''; p[kind].allowSpend = false; p[kind].apiKey = undefined; }
  }
  settings.providers = p;
  if (settings.imageProvider || runtimeKeys.has('imageProvider') || process.env[SECRET_ENV.imageProvider]) {
    settings.imageProvider = { ...(settings.imageProvider || {}), apiKey: secretFor('imageProvider') || undefined };
    if (settings.imageProvider.baseUrl && !isLocalEndpoint(settings.imageProvider.baseUrl)) { settings.imageProvider.baseUrl = ''; settings.imageProvider.apiKey = undefined; }
  }
  return settings;
}
function isLocalEndpoint(value) {
  try { const host = new URL(value).hostname.toLowerCase(); if (['localhost', '::1', '[::1]'].includes(host) || host.endsWith('.localhost') || host.endsWith('.local')) return true; const octets = host.split('.').map(Number); if (octets.length !== 4 || octets.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false; const [a, b] = octets; return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254); } catch { return false; }
}
const send = (res, code, body, headers = {}) => { const b = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body); res.writeHead(code, { 'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json', 'cache-control': 'no-store', ...headers }); res.end(b); };
const readBody = (req) => new Promise((ok, no) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
const readJson = async (req) => { const b = await readBody(req); try { return b.length ? JSON.parse(b.toString('utf8')) : {}; } catch { return {}; } };
const fail = (res, code, error, extra = {}) => send(res, code, { ok: false, error, ...extra });
const kindOf = (name, mime = '') => (/^image\//.test(mime) || /\.(png|jpe?g|webp|gif)$/i.test(name) ? 'image' : /^video\//.test(mime) || /\.(mp4|mov|webm|mkv)$/i.test(name) ? 'video' : /^audio\//.test(mime) || /\.(mp3|wav|m4a|ogg|aac)$/i.test(name) ? 'audio' : 'file');

// ---- dominio
function addAsset(name, file, kind, cat = 'upload') {
  const d = db(); const id = S.newId(); const ext = path.extname(file) || path.extname(name); const stored = `${id}${ext}`;
  if (path.resolve(file) !== path.resolve(S.pubFile(stored))) fs.copyFileSync(file, S.pubFile(stored));
  let info = {}; if (media.available() && kind !== 'file') { try { info = media.probe(S.pubFile(stored)); } catch {} }
  const a = { id, name, kind, cat, stored, duration: info.duration || null, width: info.width || null, height: info.height || null, createdAt: new Date().toISOString() };
  d.assets.unshift(a); S.save(); return a;
}
const assetPath = (id) => { const a = db().assets.find((x) => x.id === id); if (!a) throw new Error('ativo inexistente'); return S.pubFile(a.stored); };
function project(id) { const p = db().projects.find((x) => x.id === id); if (!p) throw new Error('projeto inexistente'); return p; }
function newProject(type, title) {
  const d = db(); const p = { id: S.newId(), type, title: title || (type === 'canvas' ? 'PROJECT' : 'Untitled'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), canvas: { nodes: [], edges: [] }, chats: [], ratio: '9:16' };
  d.projects.unshift(p); S.save(); return p;
}
const touch = (p) => { p.updatedAt = new Date().toISOString(); S.save(); };
function addNode(p, type, title, extra = {}) {
  const c = new Canvas(p.id); c.nodes = p.canvas.nodes; const n = c.addNode(type); n.title = title || n.title; Object.assign(n, extra);
  const i = p.canvas.nodes.length - 1; n.x = 80 + (i % 4) * 300; n.y = 80 + Math.floor(i / 4) * 340; n.panel = NODE_PANELS[type] ? { ...NODE_PANELS[type] } : type === 'Texto' ? { kind: 'text', model: 'free-router' } : null; n.id = `n${S.newId().slice(-6)}`; touch(p); return n;
}
const addDoc = (p, title, text) => addNode(p, 'Texto', title, { text, doc: true });
const link = (p, a, b) => { p.canvas.edges.push({ from: a.id, to: b.id }); touch(p); };
const linkId = (p, a, b) => { p.canvas.edges.push({ from: a, to: b }); touch(p); };
// instruções da skill escolhida para o planejamento: skills do usuário trazem o corpo do SKILL.md; as nativas só têm a descrição pública (instruções internas do Pippit são DESCONHECIDAS)
const skillGuide = (id) => {
  const k = skillsState().custom.find((x) => x.id === id); if (k) { const md = SP.parseSkillMd(skillFiles(k)[SP.SKILL_MD] || ''); return { id, name: k.name, custom: true, instructions: String(md.body || k.instructions || '').slice(0, 1200) }; }
  const b = SKILLS.find((x) => x.id === id); const d = skillDef(id); // skills oficiais com definição local: a instrução de planejamento é TEXTO DO PIPPERLINE (não a instrução privada do Pippit)
  return b ? { id, name: b.name, custom: false, official: !!d, instructions: String((d?.planning) || b.desc || '').slice(0, 1200) } : null;
};
const agentCtx = async () => ({ skillGuide, db: db(), addDoc, addNode, link, linkId, addAsset, assetPath, mediaDir: S.FILES_DIR, llm: await getLLM(), providers: PV.resolveProviders(providerRuntimeSettings()), jobs: jobsMgr });
function state() {
  const d = db(); const bal = S.balance(); const plan = getPlan(d.user.plan);
  return { user: d.user, plan, balance: bal, balances: S.balances(), settings: publicSettings(d.settings), social: { limit: d.social.limit, accounts: d.social.accounts }, ffmpeg: media.available(), provider: d.settings.provider || 'none', avatarRules: AVATAR_RULES, photoFreeUses: d.avatars.photoFreeUses };
}
// telemetria: mesmo cliente de page view observado, enviado ao coletor local
function track(path_, host) { const url = buildPageViewUrl({ reportHost: `http://${host || '127.0.0.1:' + PORT}`, webId: db().user.id, isFirstVisitPage: false, isSessionStartPage: true, referrer: '', userAgent: '', channel: { channel_from: 'ut', session_start_url: path_, channel_level1: 'Direct', channel_level2: 'enter_url', channel_level3: '', channel_level4: '', branch: 'master' } }); return url; }

// ---- rotas
const STYLES = JSON.parse(fs.readFileSync(new URL('./lib/style_library.json', import.meta.url), 'utf8'));
const routes = [];
const route = (method, re, fn) => routes.push({ method, re, fn });
// ---- autenticação: adaptador `local` (padrão) e `supabase` (GoTrue real, com apikey em todas as chamadas).
const AUTH_SECRET = AUTH.loadSecret(S.DATA_DIR);
const authState = () => { const d = db(); d.auth ||= { sessions: [] }; return d.auth; };
const authCfg = () => AUTH.authConfig(db().settings);
const sessionOf = (req) => { const token = AUTH.parseCookies(req.headers.cookie || '')[AUTH.SESSION_COOKIE]; if (!token) return null; const st = authState(); const s = AUTH.verifySession({ secret: AUTH_SECRET, token, sessions: st.sessions || [] }); if (s) { st.sessions = AUTH.pruneSessions(st.sessions, Date.now()); } return s || null; };
// Sessão do Supabase guarda os tokens CIFRADOS (AES-256-GCM). Nada de token em resposta de API.
const saveSupabaseSession = ({ user, tokens }) => {
  const { token, session } = AUTH.newSession({ secret: AUTH_SECRET, userId: user?.id || 'supabase', adapter: 'supabase', ttlMs: Math.max(300, tokens.expiresIn) * 1000 });
  const rec = { ...session, email: user?.email || '', name: user?.name || '', provider: user?.provider || 'email', accessSealed: AUTH.seal(AUTH_SECRET, tokens.accessToken), refreshSealed: AUTH.seal(AUTH_SECRET, tokens.refreshToken) };
  const st = authState(); st.sessions = [...AUTH.pruneSessions(st.sessions || []), rec]; S.save();
  return { token, session: rec };
};
const authUser = (s) => (s && s.adapter === 'supabase' ? { id: s.userId, name: s.name || s.email || 'conta', email: s.email || null, provider: s.provider || 'email', adapter: 'supabase' } : null);
let authSettingsCache = { at: 0, key: '', value: null };
async function supabaseSettings({ force = false } = {}) {
  const cfg = AUTH.supabaseConfig();
  if (!cfg.configured) return { ok: false, error: `Supabase não configurado: ${cfg.problem}` };
  const key = cfg.base;
  if (!force && authSettingsCache.value && authSettingsCache.key === key && Date.now() - authSettingsCache.at < 60_000) return authSettingsCache.value;
  const res = await AUTH.supabaseAdapter.settings();
  const value = { ...res, at: new Date().toISOString() };
  if (res.ok) authSettingsCache = { at: Date.now(), key, value };
  return value;
}
const authSummary = async (req) => {
  const d = db(); const cfg = authCfg(); const adapter = AUTH.adapterFor(cfg.adapter); const s = sessionOf(req); const st = authState();
  const sup = cfg.adapter === 'supabase' ? await supabaseSettings() : null;
  return {
    ...cfg, adapterInfo: adapter.describe(), adapters: Object.values(AUTH.ADAPTERS).map((a) => ({ id: a.id, label: a.label, mode: a.mode, enabled: a.enabled !== false, configured: a.configured === true })),
    authenticated: !!s || !cfg.required,
    user: s ? (authUser(s) || { id: d.user.id, name: d.user.name, provider: s.adapter }) : (cfg.required ? null : { id: d.user.id, name: d.user.name, provider: cfg.adapter }),
    session: s ? { id: s.id, adapter: s.adapter, mode: s.adapter === 'supabase' ? 'tokens cifrados no servidor' : 'hmac local', createdAt: s.createdAt, expiresAt: s.expiresAt } : null,
    contract: AUTH.ADAPTERS.supabase.describe().endpoints, sessions: (st.sessions || []).length,
    oauth: Object.values(AUTH.OAUTH_PROVIDERS).map((p) => ({ id: p.id, label: p.label, scopes: p.scopes, status: 'implementado com PKCE (S256)' })),
    supabase: sup ? { configured: !!adapter.configured, reachable: sup.ok === true, google: sup.google === true, email: sup.email === true, providers: sup.providers || [], error: sup.ok ? null : sup.error, checkedAt: sup.at || null } : { configured: false, reachable: false, google: false, email: false, providers: [] },
    redirectTo: AUTH.oauthRedirectTo(),
    note: cfg.required ? 'Login exigido: rotas /api/* pedem sessão (exceto /api/auth/*).' : 'Login não exigido (padrão): sessão local de usuário único.',
  };
};
route('GET', /^\/api\/auth\/state$/, async (q, r) => send(r, 200, await authSummary(q)));
route('GET', /^\/api\/auth\/settings$/, async (q, r) => { const s = await supabaseSettings({ force: new URL(q.url, 'http://x').searchParams.get('force') === '1' }); send(r, s.ok ? 200 : 503, s.ok ? { ok: true, google: s.google, email: s.email, providers: s.providers, redirectTo: AUTH.oauthRedirectTo() } : { ok: false, error: s.error }); });
route('POST', /^\/api\/auth\/adapter$/, async (q, r) => {
  const b = await readJson(q); if (!AUTH.ADAPTERS[b.adapter]) return fail(r, 400, 'adaptador inválido (use local ou supabase)');
  if (b.adapter === 'supabase' && !AUTH.supabaseConfig().configured) return fail(r, 409, `não é possível usar o Supabase: ${AUTH.supabaseConfig().problem}`);
  const d = db(); d.settings.auth = { ...(d.settings.auth || {}), adapter: b.adapter }; S.save(); send(r, 200, { ok: true, ...(await authSummary(q)) });
});
route('POST', /^\/api\/auth\/require$/, async (q, r) => {
  const b = await readJson(q); if (typeof b.required !== 'boolean') return fail(r, 400, 'required precisa ser true/false');
  if (b.required && authCfg().adapter === 'supabase' && !(await supabaseSettings()).ok) return fail(r, 409, 'o Supabase precisa responder /auth/v1/settings para exigir login');
  const d = db(); d.settings.auth = { ...(d.settings.auth || {}), required: b.required }; S.save(); send(r, 200, { ok: true, ...(await authSummary(q)) });
});
route('POST', /^\/api\/auth\/password$/, async (q, r) => {
  const b = await readJson(q); const pw = String(b.password || ''); if (pw.length < 6) return fail(r, 400, 'senha muito curta (mínimo 6 caracteres)');
  const d = db(); d.settings.auth = { ...(d.settings.auth || {}), passwordHash: AUTH.hashPassword(pw) }; S.save(); send(r, 200, { ok: true, hasPassword: true });
});
route('DELETE', /^\/api\/auth\/password$/, async (q, r) => { const d = db(); d.settings.auth = { ...(d.settings.auth || {}), passwordHash: null }; S.save(); send(r, 200, { ok: true, hasPassword: false }); });
// Cadastro (GoTrue). Com confirmação de e-mail ligada, o GoTrue devolve usuário SEM sessão → a tela pede a confirmação.
route('POST', /^\/api\/auth\/signup$/, async (q, r) => {
  if (authCfg().adapter !== 'supabase') return fail(r, 409, 'cadastro por e-mail só existe no adaptador Supabase (o local é usuário único)');
  const b = await readJson(q); const email = String(b.email || '').trim(); const password = String(b.password || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(r, 400, 'e-mail inválido');
  if (password.length < 6) return fail(r, 400, 'senha muito curta (mínimo 6 caracteres)');
  const res = await AUTH.supabaseAdapter.signUp({ email, password });
  if (!res.ok) return fail(r, res.status === 0 ? 503 : res.status, res.error, { code: res.code });
  if (!res.tokens) return send(r, 200, { ok: true, needsEmailConfirmation: true, message: res.message || 'Confirme seu e-mail.' });
  const { token, session } = saveSupabaseSession({ user: res.user, tokens: res.tokens });
  send(r, 200, { ok: true, needsEmailConfirmation: false, user: userView(res.user), session: { id: session.id, expiresAt: session.expiresAt } }, { 'set-cookie': AUTH.sessionCookie(token) });
});
const userView = (u) => (u ? { id: u.id, name: u.name, email: u.email, provider: u.provider, emailConfirmed: u.emailConfirmed } : null);
route('POST', /^\/api\/auth\/login$/, async (q, r) => {
  const b = await readJson(q); const cfg = authCfg(); const adapter = AUTH.adapterFor(cfg.adapter); const d = db();
  if (adapter.id === 'supabase') {
    const email = String(b.email || '').trim(); if (!email || !b.password) return fail(r, 400, 'informe e-mail e senha');
    const res = await adapter.signIn({ email, password: String(b.password) });
    if (!res.ok) { const code = res.status === 0 ? 503 : res.status; return fail(r, code, res.error); }
    const { token, session } = saveSupabaseSession({ user: res.user, tokens: res.tokens });
    return send(r, 200, { ok: true, user: userView(res.user), session: { id: session.id, expiresAt: session.expiresAt }, adapter: 'supabase' }, { 'set-cookie': AUTH.sessionCookie(token) });
  }
  const res = adapter.signIn({ password: b.password, passwordHash: d.settings.auth?.passwordHash });
  if (!res.ok) return fail(r, 401, res.error);
  const { token, session } = AUTH.newSession({ secret: AUTH_SECRET, userId: d.user.id, adapter: adapter.id });
  const st = authState(); st.sessions = [...AUTH.pruneSessions(st.sessions || []), session]; S.save();
  send(r, 200, { ok: true, user: { id: d.user.id, name: d.user.name, provider: adapter.id }, session: { id: session.id, expiresAt: session.expiresAt } }, { 'set-cookie': AUTH.sessionCookie(token) });
});
route('POST', /^\/api\/auth\/logout$/, async (q, r) => {
  const st = authState(); const s = sessionOf(q);
  // No Supabase, encerra também no GoTrue (falha remota não impede sair aqui).
  if (s?.adapter === 'supabase') { const at = AUTH.open(AUTH_SECRET, s.accessSealed); if (at) await AUTH.supabaseAdapter.logout({ accessToken: at }); }
  if (s) { st.sessions = (st.sessions || []).filter((x) => x.id !== s.id); S.save(); }
  send(r, 200, { ok: true, loggedOut: !!s, revokedRemote: s?.adapter === 'supabase' }, { 'set-cookie': AUTH.clearCookie() });
});
route('GET', /^\/api\/auth\/sessions$/, async (q, r) => { const cur = sessionOf(q); const list = AUTH.pruneSessions(authState().sessions || []); send(r, 200, { sessions: list.map((s) => ({ id: s.id, adapter: s.adapter, email: s.email || null, createdAt: s.createdAt, expiresAt: s.expiresAt, current: s.id === cur?.id })) }); });
route('DELETE', /^\/api\/auth\/sessions\/([\w]+)$/, async (q, r, m) => {
  const st = authState(); const n = (st.sessions || []).length; const s = (st.sessions || []).find((x) => x.id === m[1]);
  if (s?.adapter === 'supabase') { const at = AUTH.open(AUTH_SECRET, s.accessSealed); if (at) await AUTH.supabaseAdapter.logout({ accessToken: at }); }
  st.sessions = (st.sessions || []).filter((x) => x.id !== m[1]); S.save(); send(r, 200, { ok: true, revoked: n !== st.sessions.length });
});
// Retorno do OAuth (redirect_to = http://127.0.0.1:5180/auth/callback): troca o code pelo token com o verifier do servidor.
const callbackPage = (title, detail, ok = false) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px/1.5 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:0 20px;color:#111}a{color:#0b57d0}</style></head><body><h1>${title}</h1><p>${detail}</p><p><a href="/#/login${ok ? '?supabase=ok' : ''}">Voltar para o login</a></p></body></html>`;
route('GET', /^\/auth\/callback$/, async (q, r) => {
  const u = new URL(q.url, 'http://x'); const code = u.searchParams.get('code'); const state = u.searchParams.get('state');
  const err = u.searchParams.get('error') || u.searchParams.get('error_description');
  const clearPkce = 'piperline_pkce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  if (err) return send(r, 400, callbackPage('Login cancelado', `O provedor devolveu: ${String(err).replace(/[<>&]/g, '')}. Nada foi criado no app.`), { 'set-cookie': clearPkce });
  if (!code) return send(r, 400, callbackPage('Callback incompleto', 'Faltou o parâmetro code na volta do provedor.'), { 'set-cookie': clearPkce });
  const raw = AUTH.parseCookies(q.headers.cookie || '').piperline_pkce || ''; const [pkId, pkState] = raw.split('.');
  const ast = authState(); const row = (ast.pkce || []).find((x) => x.id === pkId);
  if (!row) return send(r, 400, callbackPage('Sessão de login expirada', 'O pedido de login não foi encontrado (ou já foi usado). Comece de novo na tela de login.'), { 'set-cookie': clearPkce });
  ast.pkce = (ast.pkce || []).filter((x) => x.id !== pkId); S.save();            // uso único
  if (!state || decodeURIComponent(state) !== row.state || decodeURIComponent(pkState || '') !== row.state) return send(r, 400, callbackPage('Callback recusado', 'O parâmetro state não confere com o pedido feito neste navegador.'), { 'set-cookie': clearPkce });
  const ex = await AUTH.supabaseAdapter.exchangeCode({ authCode: code, codeVerifier: row.verifier });
  if (!ex.ok) return send(r, ex.status === 0 ? 503 : 400, callbackPage('Não foi possível concluir o login', `${String(ex.error || '').replace(/[<>&]/g, '')} — o código pode ter expirado, ou o verifier PKCE não confere.`), { 'set-cookie': clearPkce });
  const { token } = saveSupabaseSession({ user: ex.user, tokens: ex.tokens });
  send(r, 302, '', { location: '/#/login?supabase=ok', 'set-cookie': [AUTH.sessionCookie(token), clearPkce] });
});
// Renova a sessão do Supabase com o refresh_token (cifrado no servidor). Nunca devolve token.
route('POST', /^\/api\/auth\/refresh$/, async (q, r) => {
  if (authCfg().adapter !== 'supabase') return fail(r, 409, 'refresh só existe no adaptador Supabase');
  const s = sessionOf(q); if (!s) return fail(r, 401, 'sem sessão para renovar');
  const refreshToken = AUTH.open(AUTH_SECRET, s.refreshSealed); if (!refreshToken) return fail(r, 401, 'sessão sem refresh token: entre de novo');
  const res = await AUTH.supabaseAdapter.refresh({ refreshToken });
  if (!res.ok) { const st = authState(); st.sessions = (st.sessions || []).filter((x) => x.id !== s.id); S.save(); return fail(r, res.status === 0 ? 503 : res.status, res.error, { reauth: true }, { 'set-cookie': AUTH.clearCookie() }); }
  const st = authState(); const cur = st.sessions.find((x) => x.id === s.id);
  if (cur) { cur.accessSealed = AUTH.seal(AUTH_SECRET, res.tokens.accessToken); cur.refreshSealed = AUTH.seal(AUTH_SECRET, res.tokens.refreshToken); cur.expiresAt = new Date(Date.now() + Math.max(300, res.tokens.expiresIn) * 1000).toISOString(); if (res.user) { cur.email = res.user.email; cur.name = res.user.name; } S.save(); }
  send(r, 200, { ok: true, user: userView(res.user), refreshed: true, expiresAt: cur?.expiresAt || null });
});
route('POST', /^\/api\/auth\/recover$/, async (q, r) => {
  if (authCfg().adapter !== 'supabase') return fail(r, 409, 'recuperação de senha só existe no adaptador Supabase');
  const email = String((await readJson(q)).email || '').trim(); if (!email) return fail(r, 400, 'informe o e-mail');
  const res = await AUTH.supabaseAdapter.recover({ email });
  if (!res.ok) return fail(r, res.status === 0 ? 503 : res.status, res.error);
  send(r, 200, { ok: true, message: 'Se este e-mail estiver cadastrado, o Supabase enviou o link de recuperação.' });
});
// Google/OAuth com PKCE: o verifier fica no servidor (cookie httpOnly) e NUNCA vai para a URL.
route('GET', /^\/api\/auth\/oauth\/(google|tiktok)$/, async (q, r, m) => {
  if (authCfg().adapter !== 'supabase') return fail(r, 409, 'login social exige o adaptador Supabase');
  const prov = m[1]; const st = await supabaseSettings();
  if (!st.ok) return fail(r, 503, st.error || 'não foi possível falar com o Supabase');
  if (st.google !== true) return fail(r, 409, `o provedor ${prov} não está ligado neste projeto do Supabase (settings.google=${st.google === true})`);
  const pkce = AUTH.createPkce(); const state = AUTH.base64url(crypto.randomBytes(12));
  const authz = AUTH.authorizeUrl({ provider: prov, challenge: pkce.challenge });
  if (!authz.ok) return fail(r, 503, authz.error);
  // guarda verifier+state ligados ao navegador (cookie httpOnly de curta duração) e à lista do servidor
  const row = { id: 'pk' + crypto.randomBytes(6).toString('hex'), verifier: pkce.verifier, state, provider: prov, redirectTo: authz.redirectTo, createdAt: new Date().toISOString() };
  const ast = authState(); ast.pkce = [...(ast.pkce || []).filter((x) => Date.now() - Date.parse(x.createdAt) < 10 * 60_000), row]; S.save();
  send(r, 302, '', { location: authz.url, 'set-cookie': `piperline_pkce=${encodeURIComponent(row.id)}.${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600` });
});
route('POST', /^\/api\/auth\/oauth\/(google|tiktok)$/, async (q, r) => fail(r, 405, 'use GET para iniciar o OAuth (redireciona para o provedor)'));
route('GET', /^\/api\/state$/, async (q, r) => send(r, 200, state()));
route('POST', /^\/api\/daily-claim$/, async (q, r) => send(r, 200, { ...S.claimDaily(), balance: S.balance() }));
route('GET', /^\/api\/ledger$/, async (q, r) => send(r, 200, S.ledgerView()));
// Central de ajuda: só o que foi observado (página pública capturada). Conteúdo interno e widget seguem UNOBSERVED.
const HELP_OBSERVED = Object.freeze({
  title: 'Central de Ajuda',
  publicUrl: 'https://www.pippit.ai/pt-br/resource/help-center',
  source: 'notes/pages/13_resource_help-center.json',
  headings: ['Central de Ajuda'],
  counts: { links: 124, images: 6, videos: 0, sections: 4 },
  unobserved: ['conteúdo dos artigos', 'busca da central', 'categorias internas', 'widget kefu-im-i18n.byteintl.com', 'efeito do botão (?) no app logado (2 tentativas sem efeito visível)'],
  externalCalls: false,
});
route('GET', /^\/api\/help$/, (q, r) => send(r, 200, { ok: true, ...HELP_OBSERVED }));

const CAT_PT = { 'Short Drama': 'Drama curto', 'Marketing Advertising': 'Marketing Publicidade', 'Professional film and television': 'Cinema e televisão profissionais' };
// dados observados no servidor (official_skills.json, REA 6.7.0): categorias, ferramentas declaradas, modelos padrão e textos de guia
const enrichSkill = (sk) => { const o = OFFICIAL[sk.id]; if (!o) return sk; const tags = (o.categories || []).map((c) => CAT_PT[c] || c); return { ...sk, tag: tags[0] || sk.tag, tags: tags.length ? tags : undefined, tools: o.tools, defaultModels: o.defaultModels, guideWords: o.guideWords, guideKind: o.guideKind, materialGuide: o.materialGuide, contentVersion: o.contentVersion, officialSkillName: o.skillName }; };
route('GET', /^\/api\/catalog$/, async (q, r) => send(r, 200, { videoModels: VIDEO_MODELS, imageModels: IMAGE_MODELS, audioModels: AUDIO_MODELS, videoRatios: VIDEO_RATIOS, imageRatios: IMAGE_RATIOS, videoRes: VIDEO_RES, imageRes: IMAGE_RES, editorRatios: media.EDITOR_RATIOS, skills: SKILLS.map(enrichSkill), skillDefs: Object.fromEntries(Object.keys(SKILL_DEFS).map((id) => [id, skillSummary(id)])), plans: PLANS, nodeTypes: NODE_TYPES, nodeTools: NODE_TOOLS, nodePanels: NODE_PANELS, marketing: MARKETING }));
// Cobrança (estrutura): planos e créditos locais; adaptador `gratuito` funcional e `gateway` desabilitado.
// Nenhum SDK, nenhuma chamada: checkout/webhook/portal do gateway respondem 501 com o contrato.
const billingAdapter = () => (db().settings.billing?.adapter === 'gateway' ? 'gateway' : 'gratuito');
route('GET', /^\/api\/billing$/, async (q, r) => send(r, 200, { ok: true, ...BILL.billingSummary({ adapter: billingAdapter(), user: db().user, balance: S.balance() }) }));
route('POST', /^\/api\/billing\/adapter$/, async (q, r) => {
  const b = await readJson(q); if (!BILL.BILLING_ADAPTERS[b.adapter]) return fail(r, 400, 'adaptador inválido (use gratuito ou gateway)');
  const d = db(); d.settings.billing = { ...(d.settings.billing || {}), adapter: b.adapter }; S.save();
  send(r, 200, { ok: true, ...BILL.billingSummary({ adapter: billingAdapter(), user: d.user, balance: S.balance() }) });
});
route('POST', /^\/api\/billing\/checkout$/, async (q, r) => {
  const b = await readJson(q); const res = BILL.checkoutIntent({ planId: String(b.planId || b.plan || ''), billing: b.billing, adapter: BILL.adapterFor(billingAdapter()) });
  if (!res.ok) return fail(r, res.status || 501, res.error, { intent: res.intent, contract: res.contract, missing: res.missing, charged: false });
  send(r, 200, { ok: true, charged: false, state: res.state, intent: res.intent, note: res.note });
});
route('POST', /^\/api\/billing\/webhook$/, async (q, r) => {
  const raw = await readBody(q); const sig = q.headers['x-signature'] || null;
  fail(r, 501, 'webhook do gateway desabilitado (estrutura): nenhum evento é processado, nenhum plano muda', { received: raw.length, signed: !!sig, charged: false, contract: BILL.GATEWAY_CONTRACT.webhook, adapter: billingAdapter() });
});
route('GET', /^\/api\/billing\/portal$/, async (q, r) => fail(r, 501, 'portal de cobrança desabilitado (estrutura)', { contract: BILL.GATEWAY_CONTRACT.portal, adapter: billingAdapter() }));
route('POST', /^\/api\/plan$/, async (q, r) => { const b = await readJson(q); const ch = BILL.applyPlanChange({ planId: b.plan, billing: b.billing }); if (!ch.ok) return fail(r, 400, ch.error);
  const d = db(); d.user.plan = ch.plan; d.user.billing = ch.billing; S.save();
  send(r, 200, { ok: true, note: 'Troca de plano LOCAL para testar bloqueios; nenhuma cobrança existe nesta reconstrução.', charged: false, amount: 0, billingAdapter: billingAdapter(), state: state() }); });
route('POST', /^\/api\/settings$/, async (q, r) => { const b = await readJson(q); const s = db().settings; Object.assign(s, b.language ? { language: b.language } : {}, b.theme ? { theme: b.theme } : {}, b.provider !== undefined ? { provider: b.provider } : {}); if (b.creditConfirm) s.creditConfirm = { mode: b.creditConfirm.mode === 'ignore' ? 'ignore' : 'threshold', limit: Number(b.creditConfirm.limit) || 450 }; S.save(); send(r, 200, state()); });
// idioma/aparência (opções lidas no app original: 18 idiomas; Light/Dark). Só a escolha persiste; a tradução da interface não foi capturada.
const LANGS = [['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'], ['de', 'Deutsch'], ['en', 'English'], ['es', 'Español'], ['fil', 'Filipino'], ['fr', 'Français'], ['it', 'Italiano'], ['pl', 'Polski'], ['pt-BR', 'Português'], ['vi', 'Tiếng Việt'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['th', 'ไทย'], ['ja', '日本語'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['ko', '한국어']];
// Voz do usuário configurada e autorizada a gastar (adaptador não-local). É a OPÇÃO, nunca o padrão.
function cloudVoiceProvider() {
  const cfg = PV.resolveProviders(providerRuntimeSettings()).audio; const ad = cfg && PV.adapterFor('audio', cfg.adapter);
  if (!ad || ad.local || !PV.isConfigured(cfg, 'audio') || cfg.allowSpend !== true) return null;
  return cfg;
}
function voiceCard() {
  const cloud = cloudVoiceProvider();
  return voiceStatus({ sapiAvailable: media.ttsAvailable(), cloudConfigured: !!cloud, cloudLabel: cloud ? `${cloud.adapter} · ${cloud.model}` : null });
}
// Voz na nuvem pelo roteador gratuito: hoje só a Cloudflare Workers AI (melotts) declara audio-output.
// Nunca é chamada por padrão: SAPI é o padrão e isto só acontece com voiceSource:"cloud".
function routerVoicePlan() { return planFreeRoutes('audio_generation', freeRouterConfig(), { quotaUsage: freeRouterUsage() }); }
// Cloudflare (melotts) é OPT-IN: nunca assume a voz sozinha; só com voiceSource:"cloud".
// Os demais provedores que declaram audio-output seguem o caminho antigo (sem SAPI, eles podem assumir).
const VOICE_OPT_IN_PROVIDERS = new Set(['cloudflare']);
async function synthViaRouter(text, { lang = 'en', signal, includeOptIn = false } = {}) {
  const planned = routerVoicePlan();
  if (!planned.ok) return { ok: false, reason: planned.reason };
  const routes = includeOptIn ? planned.routes : planned.routes.filter((route) => !VOICE_OPT_IN_PROVIDERS.has(route.providerId));
  if (!routes.length) return { ok: false, reason: 'a voz da Cloudflare é opt-in (voiceSource:"cloud")', optInOnly: true };
  try {
    const result = await executeFreeRoutes(routes, { prompt: text, lang }, {
      adapters: createFreeRouterAdapters(), credentials: routerCredentials(), signal,
      onAttempt: (candidate) => { const u = freeRouterUsage(); const entry = u[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.count++; S.save(); },
      onQuota: (candidate) => { const u = freeRouterUsage(); const entry = u[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.blocked = true; S.save(); },
    });
    if (!result.audio) return { ok: false, reason: 'o provedor de voz não devolveu áudio' };
    const bytes = Buffer.from(result.audio); const mimeType = result.mimeType || sniffAudioMime(bytes) || 'audio/wav';
    return { ok: true, bytes, mimeType, route: { providerId: result.route.providerId, providerName: result.route.providerName, modelId: result.route.modelId, locality: result.route.locality } };
  } catch (error) { return { ok: false, reason: String(error.message || error).slice(0, 320), quota: error?.quotaExceeded === true }; }
}
route('GET', /^\/api\/tts-voices$/, async (q, r) => send(r, 200, {
  ...voiceCard(),
  available: media.ttsAvailable(),
  voices: media.ttsAvailable() ? media.ttsVoices() : [],
  cloudRouter: (() => { const plan = routerVoicePlan(); return { available: plan.ok, requestedWith: 'voiceSource:"cloud"', provider: plan.ok ? plan.routes[0].providerId : null, model: CLOUDFLARE_AUDIO_MODEL, format: 'WAV', reason: plan.ok ? null : plan.reason }; })(),
  note: `Voz sintética local do Windows (SAPI) é o PADRÃO: não é IA generativa nem o Seed Audio do Pippit; só vozes instaladas (en-US). ${voiceCard().reason} Voz na nuvem (Cloudflare melotts) só com voiceSource:"cloud".`,
}));
route('GET', /^\/api\/settings-options$/, async (q, r) => send(r, 200, { languages: LANGS.map(([code, label]) => ({ code, label })), themes: ['light', 'dark'] }));
route('POST', /^\/api\/preferences$/, async (q, r) => { const b = await readJson(q); const s = db().settings; if (b.language !== undefined) { if (!LANGS.some(([c]) => c === b.language)) return fail(r, 400, 'idioma inválido'); s.language = b.language; } if (b.theme !== undefined) { if (!['light', 'dark'].includes(b.theme)) return fail(r, 400, 'tema inválido'); s.theme = b.theme; } if (b.saveWithoutWatermark !== undefined) { if (typeof b.saveWithoutWatermark !== 'boolean') return fail(r, 400, 'preferência de marca d’água inválida'); s.saveWithoutWatermark = b.saveWithoutWatermark; } S.save(); send(r, 200, { ok: true, language: s.language, theme: s.theme, saveWithoutWatermark: !!s.saveWithoutWatermark }); });
// skills: favoritos e skills manuais do usuário (formato interno das skills do Pippit é DESCONHECIDO; este formato é local)
const skillsState = () => (db().skills ||= { favorites: [], custom: [] });
route('POST', /^\/api\/skills\/favorite$/, async (q, r) => { const b = await readJson(q); const s = skillsState(); const id = String(b.id || ''); if (!id) return fail(r, 400, 'id obrigatório'); s.favorites = s.favorites.filter((x) => x !== id); if (b.on !== false) s.favorites.push(id); S.save(); send(r, 200, s); });
// skills como PACOTES (SKILL.md em ZIP), regras de src/skillpkg.mjs (observadas nos bundles). Skills antigas (só instruções) são migradas na leitura.
const skillView = (k) => { const f = skillFiles(k); const md = SP.parseSkillMd(f[SP.SKILL_MD] || ''); return { id: k.id, name: k.name, description: k.description || '', guideWords: k.guideWords || '', materialGuide: k.materialGuide || '', tags: k.tags || [], outputGenre: k.outputGenre || '', defaultImageModel: k.defaultImageModel || '', defaultVideoModel: k.defaultVideoModel || '', allowPublic: !!k.allowPublic, cover: k.cover || null, cases: k.cases || [], ai: k.ai || null, custom: true, tag: 'Minhas skills', desc: k.description || '', instructions: md.body, files: Object.keys(f), createdAt: k.createdAt, updatedAt: k.updatedAt }; };
const skillFiles = (k) => { if (!k.files) k.files = { [SP.SKILL_MD]: SP.buildSkillMd({ name: k.name, description: k.description, body: k.instructions || '' }) }; return k.files; };
route('GET', /^\/api\/skills\/state$/, async (q, r) => { const s = skillsState(); send(r, 200, { favorites: s.favorites, custom: s.custom.map(skillView), limits: SP.LIMITS, outputGenres: SP.OUTPUT_GENRES }); });
route('GET', /^\/api\/skills\/custom\/([\w-]+)$/, async (q, r, m) => { const k = skillsState().custom.find((x) => x.id === m[1]); if (!k) return fail(r, 404, 'skill inexistente'); send(r, 200, { ...skillView(k), contents: skillFiles(k) }); });
const assetSize = (id) => { const a = db().assets.find((x) => x.id === id); if (!a) return null; try { return { kind: a.kind, size: fs.statSync(S.pubFile(a.stored)).size, name: a.name }; } catch { return null; } };
const mediaProblem = (cover, cases) => { if (cover) { const m = assetSize(cover); if (!m || m.kind !== 'image') return 'A capa deve ser uma imagem dos Ativos.'; const e = SP.checkMedia(m); if (e) return e; } const ce = SP.checkCases((cases || []).length); if (ce) return ce; for (const id of cases || []) { const m = assetSize(id); if (!m || !['image', 'video'].includes(m.kind)) return 'Exemplos devem ser imagens ou vídeos dos Ativos.'; const e = SP.checkMedia(m); if (e) return e; } return null; };
const readSkillBody = (b, keep = {}) => {
  const meta = { name: b.name ?? keep.name, description: b.description ?? keep.description, guideWords: b.guideWords ?? keep.guideWords ?? '', materialGuide: b.materialGuide ?? keep.materialGuide ?? '', tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 5) : keep.tags || [], outputGenre: b.outputGenre ?? keep.outputGenre ?? '', defaultImageModel: String(b.defaultImageModel ?? keep.defaultImageModel ?? ''), defaultVideoModel: String(b.defaultVideoModel ?? keep.defaultVideoModel ?? ''), allowPublic: b.allowPublic ?? keep.allowPublic ?? false, cover: b.cover === undefined ? keep.cover || null : b.cover || null, cases: Array.isArray(b.cases) ? b.cases.map(String) : keep.cases || [] };
  const err = SP.validateMeta(meta) || mediaProblem(meta.cover, meta.cases); return { meta, err };
};
route('POST', /^\/api\/skills\/custom$/, async (q, r) => {
  const b = await readJson(q); const { meta, err } = readSkillBody(b); if (err) return fail(r, 400, err);
  if (b.outputGenre && !SP.OUTPUT_GENRES.includes(b.outputGenre)) return fail(r, 400, 'tipo de saída inválido');
  const files = { ...(b.files && typeof b.files === 'object' ? b.files : {}) }; if (b.content !== undefined || !files[SP.SKILL_MD]) files[SP.SKILL_MD] = SP.buildSkillMd({ name: meta.name, description: meta.description, body: b.content ?? '' });
  const perr = SP.validatePackage(files); if (perr.length) return fail(r, 400, perr[0], { errors: perr }); if (!SP.parseSkillMd(files[SP.SKILL_MD]).body) return fail(r, 400, 'Escreva as instruções da skill (conteúdo do SKILL.md).');
  const now = new Date().toISOString(); const sk = { id: 'custom-' + S.newId(), ...meta, files, createdAt: now, updatedAt: now }; skillsState().custom.unshift(sk); S.save(); send(r, 200, skillView(sk));
});
route('PUT', /^\/api\/skills\/custom\/([\w-]+)$/, async (q, r, m) => {
  const k = skillsState().custom.find((x) => x.id === m[1]); if (!k) return fail(r, 404, 'skill inexistente'); const b = await readJson(q); const keep = skillView(k); const { meta, err } = readSkillBody(b, keep); if (err) return fail(r, 400, err);
  const files = b.files && typeof b.files === 'object' ? b.files : { ...skillFiles(k) }; if (!(SP.SKILL_MD in files)) return fail(r, 400, 'SKILL.md cannot be renamed or deleted.');
  if (b.content !== undefined) files[SP.SKILL_MD] = SP.buildSkillMd({ name: meta.name, description: meta.description, body: b.content });
  else if ('name' in b || 'description' in b) { const md = SP.parseSkillMd(files[SP.SKILL_MD]); files[SP.SKILL_MD] = SP.buildSkillMd({ name: meta.name, description: meta.description, body: md.body }); }
  const perr = SP.validatePackage(files); if (perr.length) return fail(r, 400, perr[0], { errors: perr });
  for (const [path_, v] of Object.entries(files)) if (typeof v === 'string' && !/\.md$/i.test(path_) && !(path_ in skillFiles(k))) return fail(r, 400, 'Only Markdown files can be created here.');
  Object.assign(k, meta, { files, updatedAt: new Date().toISOString() }); delete k.instructions; S.save(); send(r, 200, skillView(k));
});
route('DELETE', /^\/api\/skills\/custom\/([\w-]+)$/, async (q, r, m) => { const s = skillsState(); s.custom = s.custom.filter((x) => x.id !== m[1]); s.favorites = s.favorites.filter((x) => x !== m[1]); S.save(); send(r, 200, { favorites: s.favorites, custom: s.custom.map(skillView) }); });
route('GET', /^\/api\/skills\/custom\/([\w-]+)\/zip$/, async (q, r, m) => { const k = skillsState().custom.find((x) => x.id === m[1]); if (!k) return fail(r, 404, 'skill inexistente'); const z = SP.zipWrite(skillFiles(k)); r.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${SP.slugify(k.name) || 'skill'}.zip"`, 'content-length': z.length }); r.end(z); });
route('POST', /^\/api\/skills\/import$/, async (q, r) => {
  const buf = await readBody(q); const { files, errors } = SP.zipRead(buf); if (errors.length) return fail(r, 400, errors[0], { errors }); const perr = SP.validatePackage(files); if (perr.length) return fail(r, 400, perr[0], { errors: perr });
  const md = SP.parseSkillMd(files[SP.SKILL_MD]); const fname = decodeURIComponent(q.headers['x-file-name'] || '').replace(/\.zip$/i, ''); const meta = { name: (md.name || fname || '').slice(0, 60), description: md.description }; const err = SP.validateMeta(meta); if (err) return fail(r, 400, err);
  const now = new Date().toISOString(); const sk = { id: 'custom-' + S.newId(), ...meta, name: meta.name, guideWords: '', materialGuide: '', tags: [], outputGenre: '', allowPublic: false, cover: null, cases: [], files, createdAt: now, updatedAt: now }; skillsState().custom.unshift(sk); S.save(); send(r, 200, skillView(sk));
});
route('POST', /^\/api\/skills\/ai$/, async (q, r) => {
  const b = await readJson(q); const brief = String(b.brief || '').trim(); if (brief.length < 10) return fail(r, 400, 'Descreva a skill (mínimo 10 caracteres)'); const c = await needLLM(r); if (!c) return;
  try {
    const k = await llmCreateSkill(c, brief); const meta = { name: [...k.name].slice(0, SP.LIMITS.name).join('').trim(), description: [...k.description].slice(0, SP.LIMITS.description).join('').trim() || [...brief].slice(0, SP.LIMITS.description).join('') };
    const err = SP.validateMeta(meta); if (err) return fail(r, 502, `O LLM devolveu uma skill inválida: ${err}`);
    const now = new Date().toISOString(); const sk = { id: 'custom-' + S.newId(), ...meta, guideWords: '', materialGuide: '', tags: [], outputGenre: '', allowPublic: false, cover: null, cases: [], files: { [SP.SKILL_MD]: SP.buildSkillMd({ ...meta, body: k.instructions }) }, ai: c.label, createdAt: now, updatedAt: now }; skillsState().custom.unshift(sk); S.save(); send(r, 200, skillView(sk));
  } catch (e) { fail(r, 502, `Falha ao criar a skill com IA: ${String(e.message || e).slice(0, 700)}`); }
});
// notificações locais (o original tem central de anúncios editoriais + contador de não lidas; aqui: eventos do próprio app)
const notes = () => (db().notifications ||= []);
const notify = (title, body, kind = 'info') => { notes().unshift({ id: S.newId(), title, body, kind, at: new Date().toISOString(), read: false }); if (notes().length > 100) notes().length = 100; S.save(); };
// Anúncios editoriais observados (REA ev_72d7b4c2…7b20; FEATURE_INVENTORY linha 147): o relatório
// registra 8 anúncios de jan–abr/2026 enumerados por TEMA. Títulos, datas e textos individuais não
// foram preservados — cada cartão traz o tema observado e marca o resto UNOBSERVED (nada é inventado).
const EDITORIAL_ADS = Object.freeze([
  'GPT Image 2', '700+ avatares via @', 'Pesquisa de satisfação (pt/es)', 'Descontinuação temporária de Nano Banana Pro/Veo 3.1',
  'Descontinuação temporária de Seedream 4.1', 'Seedream 5.0', 'Geração agendada', 'Mais tarefas de crédito',
].map((theme, i) => ({ id: `ad-${i + 1}`, theme })));
const EDITORIAL_ADS_META = Object.freeze({
  source: 'REA ev_72d7b4c2…7b20 (FEATURE_INVENTORY linha 147)',
  period: 'jan–abr/2026', count: 8,
  titles: 'UNOBSERVED', dates: 'UNOBSERVED', bodies: 'UNOBSERVED', themeToAdMapping: 'UNOBSERVED',
  note: 'Os temas vêm da enumeração observada do relatório; título, data e texto de cada anúncio não foram preservados.',
  externalCalls: false,
});
const editorialAds = () => { const rd = (db().editorialAdsRead ||= {}); return EDITORIAL_ADS.map((a) => ({ id: a.id, kind: 'ad', title: a.theme, body: 'Conteúdo do anúncio: UNOBSERVED (REA ev_72d7b4c2…7b20) · jan–abr/2026', at: null, read: !!rd[a.id] })); };
// ---- provedores de mídia + tarefas de geração (src/providers.mjs, app/lib/jobs.mjs, app/lib/compose.mjs)
const saveBuffer = (name, bytes, kind, cat) => { const tmp = S.pubFile('_job_' + S.newId() + path.extname(name)); fs.writeFileSync(tmp, bytes); const a = addAsset(name, tmp, kind, cat); try { fs.unlinkSync(tmp); } catch {} return a; };
const readAssetBytes = (id) => { const a = db().assets.find((x) => x.id === id); if (!a || !fs.existsSync(S.pubFile(a.stored))) return null; return { bytes: fs.readFileSync(S.pubFile(a.stored)), mime: ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.wma': 'audio/x-ms-wma' })[path.extname(a.stored || a.name || '').toLowerCase()] || (a.kind === 'image' ? 'image/png' : 'application/octet-stream'), name: a.name }; };
const lastFrameOf = (assetId) => { try { const a = db().assets.find((x) => x.id === assetId); const out = S.pubFile(`_lf_${S.newId()}.png`); media.lastFrame(S.pubFile(a.stored), out); const b = fs.readFileSync(out); try { fs.unlinkSync(out); } catch {} return b; } catch { return null; } };
// ---- Foto falante com lip-sync por provedor externo (orçamento + consentimento por tarefa; lib/talkingphoto.mjs). O bloqueio de gasto é DO SERVIDOR: a interface não o contorna.
const tpInfoOf = (inputs) => ({ image: { sha: inputs.imageSha, size: inputs.imageSize, width: inputs.width, height: inputs.height }, audio: { sha: inputs.audioSha, size: inputs.audioSize }, audioSeconds: inputs.audioSeconds });
const tpQuote = (job) => TPH.buildQuote(db().settings, job.inputs || {}, tpInfoOf(job.inputs || {}));
const tpSummary = (qt) => (qt?.ok ? { digest: qt.digest, provider: qt.provider, seconds: qt.seconds, cost: qt.cost, maxCostPerTask: qt.maxCostPerTask, overLimit: qt.overLimit, limits: qt.limits, accepted: qt.accepted, ignored: qt.ignored, warnings: qt.warnings, needsConsent: true, needsUnknownCostAck: qt.needsUnknownCostAck } : { ok: false, reason: qt?.reason });
const jobsMgr = new JobManager({ db: () => { const raw = db(); raw.jobs ||= []; return { ...raw, jobs: raw.jobs, settings: providerRuntimeSettings() }; }, save: () => S.save(), newId: S.newId, media, readAsset: readAssetBytes, lastFrameOf, saveAsset: saveBuffer, consentProblem: (job, cfg) => TPH.consentProblem(job, tpQuote(job), cfg), onDone: (job) => { afterJob(job).catch(() => {}); }, pollMs: Number(process.env.PIPPIT_JOB_POLL_MS ?? 5000) });
const jobView = (j) => ({ id: j.id, kind: j.kind, title: j.title, prompt: j.prompt, params: j.params, state: j.state, progress: j.progress, error: j.error, assetId: j.assetId, source: j.source, after: j.after || null, attempts: j.attempts, createdAt: j.createdAt, updatedAt: j.updatedAt, usedReference: !!j.usedReference, ...(j.kind === 'talkingphoto' ? { inputs: { imageAssetId: j.inputs?.imageAssetId, audioAssetId: j.inputs?.audioAssetId, hasText: !!j.inputs?.text, gesture: j.inputs?.gesture || '', audioSeconds: j.inputs?.audioSeconds }, quote: tpSummary(tpQuote(j)), authorized: !!j.authorization?.confirm, sent: j.sent || null, ambiguousSend: !!j.ambiguousSend, remoteCancel: j.remoteCancel || null, remoteCancelNote: j.remoteCancelNote || null } : { remoteCancel: j.remoteCancel || null }) });
const chatMsg = (o) => ({ id: String(Math.random()).slice(2), t: new Date().toISOString(), role: 'agent', ...o });
async function afterJob(job) {
  try {
    if (job.source?.type === 'node') {
      const p = db().projects.find((x) => x.id === job.source.projectId); const n = p?.canvas.nodes.find((x) => x.id === job.source.nodeId);
      if (job.state === 'succeeded' && n) { n.assetId = job.assetId; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p); notify('Geração concluída', `Nó "${n.title}": vídeo gerado pelo provedor.`, 'success'); } else if (job.state !== 'succeeded') notify(job.state === 'canceled' ? 'Geração cancelada' : 'Falha na geração', `${n?.title || 'nó'}: ${job.error}`, 'error');
    } else if (job.source?.type === 'agent') await finishAgent(job);
  } catch (e) { notify('Erro ao concluir a tarefa', String(e.message || e).slice(0, 200), 'error'); }
  S.save();
}
async function finishAgent(job) {
  const p = db().projects.find((x) => x.id === job.source.projectId); const chat = p?.chats.find((x) => x.id === job.source.chatId); const st = chat?.state; if (!st?.jobIds) return;
  const jobs = st.jobIds.map((id) => jobsMgr.get(id)); if (!jobs.every((j) => j && ['succeeded', 'failed', 'canceled'].includes(j.state)) || st.finalized) return; st.finalized = true;
  const bad = jobs.filter((j) => j.state !== 'succeeded');
  if (bad.length) { st.workflow = { ...st.workflow, state: 'failed' }; chat.messages.push(chatMsg({ text: `${bad.length} de ${jobs.length} tarefa(s) de geração não concluíram: ${bad.map((j) => `${j.title.split('_').pop()} (${j.state}: ${j.error})`).join('; ')}. Corrija/reenvie em Tarefas (Tentar de novo) e o workflow continua.`, steps: [{ label: 'Geração incompleta', state: 'failed' }] })); notify('Geração incompleta', `${bad.length} de ${jobs.length} tarefa(s) falharam.`, 'error'); touch(p); return; }
  const out = await composeWorkflow({ db: db(), assetPath, addAsset, addNode: (pp, ...a) => addNode(pp, ...a), linkId, mediaDir: S.FILES_DIR, newEditor: (title, tl) => { const e = newProject('editor', title); e.timeline = tl; touch(e); return e; }, synth }, { project: p, st, jobs });
  st.workflow = { ...st.workflow, state: 'done', editorId: out.editor.id, finalAssetId: out.asset.id }; st.done = true;
  chat.messages.push(chatMsg({ text: `Vídeo final composto a partir de ${out.clips} vídeo(s) gerados pelo provedor (${out.narrations} narração(ões), ${out.captions} legenda(s)) e exportado: ${Math.round(out.info.duration * 10) / 10} s, ${out.info.width}×${out.info.height}. Projeto de edição criado no editor: "${out.editor.title}".${out.notes.length ? ' Notas: ' + out.notes.join('; ') + '.' : ''}`, steps: [{ label: 'Vídeos gerados', state: 'completed', count: jobs.length }, { label: 'Composição', state: 'completed' }, { label: 'Projeto no editor criado', state: 'completed' }, { label: 'Vídeo exportado', state: 'completed' }], artifacts: [{ assetId: out.asset.id, nodeId: out.node.id }], editorId: out.editor.id }));
  notify('Workflow concluído', `Vídeo final de "${st.theme}" pronto (editor: ${out.editor.title}).`, 'success'); touch(p);
}
// narração: provedor de áudio configurado (com autorização de gasto) ou voz local SAPI (não-IA)
async function synth(text, voice) {
  const cfg = cloudVoiceProvider(); const ad = cfg && PV.adapterFor('audio', cfg.adapter);
  // SAPI é o padrão; o provedor do usuário só assume quando o SAPI não existe nesta máquina.
  if (media.ttsAvailable()) { const out = S.pubFile(`_tts_${S.newId()}.wav`); media.ttsLocal(text, out, { voice: cfg?.voice }); const a = addAsset('narracao.wav', out, 'audio', 'works'); try { fs.unlinkSync(out); } catch {} return { asset: a, engine: 'sapi', label: 'voz local SAPI (não-IA)' }; }
  if (ad) { const o = await ad.synth(cfg, { text, voice, fetchImpl: fetch }); return { asset: saveBuffer(`narracao.${o.ext}`, o.bytes, 'audio', 'works'), engine: 'cloud', label: `${cfg.adapter} (${cfg.model})` }; }
  return null;
}
route('GET', new RegExp('^/api/env-file$'), async (q, r) => send(r, 200, envFileSummary()));
route('GET', /^\/api\/providers$/, async (q, r) => send(r, 200, { providers: PV.publicProviders(providerRuntimeSettings()), allowSpend: Object.fromEntries(PV.KINDS.map((k) => [k, PV.resolveProviders(providerRuntimeSettings())[k]?.allowSpend === true])), note: 'Adaptadores genéricos legados só aceitam endpoint local/privado e não podem enviar dados para SaaS. Chaves Settings são efêmeras (memória); provedores cloud gratuitos devem usar o Roteador gratuito com cap e free-tier explícito.' }));
route('POST', /^\/api\/providers\/(video|audio|image|talkingphoto)$/, async (q, r, m) => {
  const b = await readJson(q); const kind = m[1]; const st = (db().settings.providers ||= {}); const cur = PV.resolveProviders(providerRuntimeSettings())[kind] || {};
  const next = { ...cur, adapter: b.adapter ?? cur.adapter, baseUrl: b.baseUrl ?? cur.baseUrl, model: b.model ?? cur.model, voice: b.voice ?? cur.voice, size: b.size ?? cur.size, inputMap: b.inputMap ?? cur.inputMap, extraInput: b.extraInput ?? cur.extraInput };
  delete next.apiKey;
  // Campos dos adaptadores de lip-sync: Replicate (mapas/custo), Space do Hugging Face (space/apiName/fields) e
  // executor local (command). Nenhum deles é segredo; token do HF vem de HF_TOKEN do ambiente (ou do campo de chave).
  if (kind === 'talkingphoto') for (const k of ['inputMap', 'paramMap', 'costPerSecond', 'currency', 'maxCostPerTask', 'maxAudioSeconds', 'space', 'apiName', 'fields', 'command', 'shell', 'timeoutMs', 'pollTimeoutMs']) next[k] = k in b ? b[k] : cur[k];
  if (kind === 'talkingphoto') for (const k of ['space', 'apiName', 'command', 'shell']) if (typeof next[k] === 'string') next[k] = next[k].trim().slice(0, 600); for (const k of ['costPerSecond', 'maxCostPerTask', 'maxAudioSeconds']) if (typeof next[k] === 'string' && next[k].trim() !== '' && Number.isFinite(Number(next[k]))) next[k] = Number(next[k]);
  if ('allowSpend' in b) next.allowSpend = b.allowSpend === true;
  const err = PV.validateConfig(kind, next); if (err) return fail(r, 400, err);
  // Endpoints remotos seguem desativados, EXCETO adaptadores declarados gratuitos (Space do Hugging Face): são
  // gratuitos, exigem consentimento por tarefa e não passam pelo roteador de mídia.
  const chosen = PV.adapterFor(kind, next.adapter);
  if (next.baseUrl && !isLocalEndpoint(next.baseUrl) && chosen?.allowRemote !== true) return fail(r, 403, 'Provedores genéricos pagos/remotos estão desativados. Use endpoint local; integrações cloud precisam passar pelo Roteador gratuito.');
  if ('apiKey' in b) { const key = String(b.apiKey || '').trim().slice(0, 400); if (key) runtimeKeys.set(kind, key); else runtimeKeys.delete(kind); }
  st[kind] = next; S.save(); await jobsMgr.tick(); send(r, 200, { ok: true });
});
route('DELETE', /^\/api\/providers\/(video|audio|image|talkingphoto)$/, async (q, r, m) => { runtimeKeys.delete(m[1]); if (db().settings.providers) delete db().settings.providers[m[1]]; if (m[1] === 'image') delete db().settings.imageProvider; S.save(); send(r, 200, { ok: true }); });
route('GET', /^\/api\/jobs$/, async (q, r) => send(r, 200, [...jobsMgr.jobs()].reverse().map(jobView)));
route('POST', /^\/api\/jobs\/([\w-]+)\/(cancel|retry)$/, async (q, r, m) => {
  const job = jobsMgr.get(m[1]); if (!job) return fail(r, 404, 'tarefa inexistente');
  if (m[2] === 'cancel') await jobsMgr.cancel(job.id); else { const ch = job.source?.type === 'agent' ? db().projects.find((x) => x.id === job.source.projectId)?.chats.find((x) => x.id === job.source.chatId) : null; if (ch?.state) ch.state.finalized = false; jobsMgr.retry(job.id); await jobsMgr.tick(); }
  send(r, 200, jobView(job));
});
route('POST', /^\/api\/jobs\/tick$/, async (q, r) => { await jobsMgr.tick(); send(r, 200, { ok: true, jobs: jobsMgr.jobs().length }); });
// ---- Foto falante com lip-sync por provedor externo: orçamento → tarefa SEMPRE criada bloqueada → consentimento por tarefa → envio. Sem provedor/consentimento nada sai desta máquina.
const tpSha = (b) => TPH.sha256(b);
function tpPrepare(b) {
  const img = db().assets.find((x) => x.id === String(b.assetId) && x.kind === 'image'); if (!img) return { error: 'Envie uma foto primeiro.' };
  let audio = b.audioAssetId ? db().assets.find((x) => x.id === String(b.audioAssetId) && x.kind === 'audio') : null; if (b.audioAssetId && !audio) return { error: 'Áudio não encontrado: envie o clipe novamente.' };
  const text = String(b.text || '').trim().slice(0, 2000);
  if (!audio) {
    if (!text) return { error: 'Informe um clipe de áudio ou escreva o roteiro.' };
    if (!media.available() || !media.ttsAvailable()) return { error: 'O roteiro precisa da voz local (SAPI) e do ffmpeg, indisponíveis nesta máquina; envie um clipe de áudio.', blocked: true };
    const cache = (db().tpTts ||= {}); const key = tpSha(Buffer.from(`${text}\n${b.voice || ''}`)); audio = cache[key] && db().assets.find((x) => x.id === cache[key]);
    if (!audio) { const wav = S.pubFile(`_tpg_${S.newId()}.wav`); media.ttsLocal(text, wav, { voice: b.voice }); audio = addAsset('locucao.wav', wav, 'audio', 'works'); try { fs.unlinkSync(wav); } catch {} cache[key] = audio.id; S.save(); }
  }
  const ib = fs.readFileSync(S.pubFile(img.stored)); const ab = fs.readFileSync(S.pubFile(audio.stored)); let width = null, height = null, audioSeconds = 0;
  if (media.available()) { const ip = media.probe(S.pubFile(img.stored)); width = ip.width; height = ip.height; audioSeconds = media.probe(S.pubFile(audio.stored)).duration; }
  const params = b.params && typeof b.params === 'object' && !Array.isArray(b.params) ? b.params : undefined;
  return { inputs: { imageAssetId: img.id, audioAssetId: audio.id, text: text || undefined, voice: b.voice ? String(b.voice).slice(0, 200) : undefined, gesture: String(b.gesture || '').slice(0, 500) || undefined, params, imageSha: tpSha(ib), imageSize: ib.length, audioSha: tpSha(ab), audioSize: ab.length, width, height, audioSeconds } };
}
route('POST', /^\/api\/talking-photo\/quote$/, async (q, r) => {
  const pr = tpPrepare(await readJson(q)); if (pr.error) return fail(r, pr.blocked ? 503 : 400, pr.error, pr.blocked ? { blocked: true } : {});
  const qt = TPH.buildQuote(db().settings, pr.inputs, tpInfoOf(pr.inputs)); if (!qt.ok) return fail(r, 409, qt.reason, { blocked: true });
  send(r, 200, { ok: true, quote: tpSummary(qt), creditsCharged: 0, externalCalls: 0 });
});
route('POST', /^\/api\/talking-photo\/generate$/, async (q, r) => {
  const b = await readJson(q); const pr = tpPrepare(b); if (pr.error) return fail(r, pr.blocked ? 503 : 400, pr.error, pr.blocked ? { blocked: true } : {});
  const qt = TPH.buildQuote(db().settings, pr.inputs, tpInfoOf(pr.inputs)); if (!qt.ok) return fail(r, 409, qt.reason, { blocked: true });
  const title = String(b.title || 'Foto falante (lip-sync)').slice(0, 80); let source = { type: 'talkingphoto' };
  if (b.projectId) { const p = db().projects.find((x) => x.id === String(b.projectId)); if (!p) return fail(r, 404, 'projeto inexistente'); const n = addNode(p, 'Vídeo', title); source = { type: 'node', projectId: p.id, nodeId: n.id }; }
  const job = jobsMgr.create({ kind: 'talkingphoto', state: 'blocked', title, prompt: '', params: { seconds: qt.seconds }, inputs: pr.inputs, source, authorization: null, error: 'aguardando seu consentimento para esta tarefa (revise o orçamento e autorize)' });
  await jobsMgr.tick(); send(r, 202, { ok: true, job: jobView(job), quote: tpSummary(qt), note: 'Tarefa criada BLOQUEADA: nada foi enviado ao provedor. Revise o orçamento e autorize esta tarefa.' });
});
route('POST', /^\/api\/talking-photo\/jobs\/([\w-]+)\/authorize$/, async (q, r, m) => {
  const job = jobsMgr.get(m[1]); if (!job || job.kind !== 'talkingphoto') return fail(r, 404, 'tarefa inexistente');
  if (!['blocked', 'queued'].includes(job.state)) return fail(r, 409, `a tarefa está "${job.state}"; só tarefas ainda não enviadas podem ser autorizadas`);
  const b = await readJson(q); if (b.confirm !== true) return fail(r, 400, 'consentimento não confirmado (confirm:true)');
  const qt = tpQuote(job); if (!qt.ok) return fail(r, 409, `orçamento indisponível: ${qt.reason}`);
  if (b.quoteDigest !== qt.digest) return fail(r, 409, 'o orçamento mudou ou não é o que você revisou: reabra o orçamento antes de autorizar');
  if (qt.overLimit) return fail(r, 409, 'custo estimado acima do limite por tarefa configurado');
  if (!qt.cost.known && b.acknowledgeUnknownCost !== true) return fail(r, 400, 'custo desconhecido: confirme explicitamente (acknowledgeUnknownCost:true) que aceita uma cobrança não estimada');
  job.authorization = { confirm: true, quoteDigest: qt.digest, acknowledgeUnknownCost: b.acknowledgeUnknownCost === true, at: new Date().toISOString() }; S.save(); await jobsMgr.tick(); send(r, 200, jobView(job));
});
route('DELETE', /^\/api\/talking-photo\/jobs\/([\w-]+)\/authorize$/, async (q, r, m) => {
  const job = jobsMgr.get(m[1]); if (!job || job.kind !== 'talkingphoto') return fail(r, 404, 'tarefa inexistente'); if (!['blocked', 'queued'].includes(job.state)) return fail(r, 409, 'a tarefa já foi enviada; use Cancelar');
  job.authorization = null; jobsMgr.touch(job, { state: 'blocked', error: 'consentimento revogado' }); S.save(); send(r, 200, jobView(job));
});
const jobTimer = setInterval(() => { jobsMgr.tick().catch(() => {}); }, Number(process.env.PIPPIT_JOB_TICK_MS ?? 3000)); jobTimer.unref();
route('GET', /^\/api\/notifications$/, async (q, r) => send(r, 200, { items: [...notes(), ...editorialAds()], unread: [...notes(), ...editorialAds()].filter((n) => !n.read).length, editorial: EDITORIAL_ADS_META }));
route('POST', /^\/api\/notifications\/read-all$/, async (q, r) => { const rd = (db().editorialAdsRead ||= {}); EDITORIAL_ADS.forEach((a) => (rd[a.id] = true)); notes().forEach((n) => (n.read = true)); S.save(); send(r, 200, { ok: true, unread: 0 }); });
route('GET', /^\/api\/projects$/, async (q, r) => send(r, 200, db().projects.map((p) => ({ id: p.id, title: p.title, type: p.type, updatedAt: p.updatedAt, subtitle: p.type === 'canvas' ? 'Tela' : p.type === 'direct' ? 'Geração direta' : p.type, href: p.direct ? `/direct/${p.id}/${p.direct.canvasId}/${p.direct.runId}` : undefined }))));
route('POST', /^\/api\/projects$/, async (q, r) => { const b = await readJson(q); send(r, 200, newProject(b.type || 'canvas', b.title)); });
route('GET', /^\/api\/projects\/(\d+)$/, async (q, r, m) => send(r, 200, project(m[1])));
route('PATCH', /^\/api\/projects\/(\d+)$/, async (q, r, m) => { const b = await readJson(q); const p = project(m[1]); if (b.title) p.title = String(b.title).slice(0, 120); if (b.ratio) p.ratio = b.ratio; if ('style' in b) { if (b.style === null || b.style === '') p.style = null; else { if (!STYLES.todos.includes(b.style)) return fail(r, 400, 'estilo inexistente na Biblioteca de estilos'); p.style = b.style; } } touch(p); send(r, 200, p); });
route('GET', /^\/api\/style-library$/, async (q, r) => send(r, 200, STYLES));
route('DELETE', /^\/api\/projects\/(\d+)$/, async (q, r, m) => { const d = db(); d.projects = d.projects.filter((p) => p.id !== m[1]); S.save(); send(r, 200, { ok: true }); });
route('POST', /^\/api\/projects\/(\d+)\/share$/, async (q, r, m) => { const p = project(m[1]); const t = S.newId(); db().shares[t] = p.id; S.save(); send(r, 200, { link: `http://127.0.0.1:${PORT}/#/share/${t}`, message: 'Link copiado. Compartilhe com seus amigos para que eles possam ver todo o processo de criação.' }); });
route('GET', /^\/api\/share\/(\d+)$/, async (q, r, m) => { const id = db().shares[m[1]]; if (!id) return fail(r, 404, 'link inválido'); send(r, 200, { readOnly: true, project: project(id) }); });
route('POST', /^\/api\/projects\/(\d+)\/nodes$/, async (q, r, m) => { const b = await readJson(q); if (!NODE_TYPES.includes(b.type)) return fail(r, 400, 'tipo de nó desconhecido'); send(r, 200, addNode(project(m[1]), b.type, b.title)); });
route('PATCH', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)$/, async (q, r, m) => { const p = project(m[1]); const n = p.canvas.nodes.find((x) => x.id === m[2]); if (!n) return fail(r, 404, 'nó inexistente'); const b = await readJson(q); for (const k of ['title', 'text', 'x', 'y', 'assetId', 'panel', 'description', 'episodes', 'voice', 'scene', 'group']) if (k in b) n[k] = b[k]; if (b.assetId) { n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); } touch(p); send(r, 200, n); });
route('DELETE', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)$/, async (q, r, m) => { const p = project(m[1]); p.canvas.nodes = p.canvas.nodes.filter((x) => x.id !== m[2]); p.canvas.edges = p.canvas.edges.filter((e) => e.from !== m[2] && e.to !== m[2]); touch(p); send(r, 200, { ok: true }); });
route('POST', /^\/api\/projects\/(\d+)\/edges$/, async (q, r, m) => { const b = await readJson(q); const p = project(m[1]); linkId(p, b.from, b.to); send(r, 200, { ok: true }); });
// ferramentas de no sem IA (ffmpeg): geram um NOVO no ligado ao original (nao destrutivo). Ferramentas de IA (Melhorar qualidade, Analisar, Amplificar, Preencher, Isolar camadas, Panorama, ...) ficam bloqueadas.
const LOCAL_TOOLS = ['Extrair quadro', 'Cortar', 'Extrair áudio', 'Recortar', 'Girar', 'Melhorar qualidade', 'Amplificar'];
route('POST', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)\/tool$/, async (q, r, m) => {
  const p = project(m[1]); const n = p.canvas.nodes.find((x) => x.id === m[2]); if (!n) return fail(r, 404, 'nó inexistente'); const b = await readJson(q); const tool = b.tool;
  if (!n.tools?.some((t) => t.name === tool)) return fail(r, 400, 'ferramenta inexistente neste nó');
  if (!LOCAL_TOOLS.includes(tool)) return fail(r, 501, `${tool}: ferramenta de IA do Pippit, não implementada localmente (precisa de um modelo de visão/segmentação; sem provedor).`, { blocked: true });
  if (!n.assetId) return fail(r, 400, 'o nó ainda não tem mídia (as ferramentas ficam desabilitadas até haver mídia)'); if (!media.available()) return fail(r, 501, 'ffmpeg indisponível');
  const src = db().assets.find((x) => x.id === n.assetId); if (!src) return fail(r, 404, 'ativo do nó inexistente'); const file = S.pubFile(src.stored); const isVideo = src.kind === 'video'; const isImage = src.kind === 'image';
  const stamp = `${p.id}_${n.id}_${Date.now()}`; const P = b.params || {}; let out, kind, type, name;
  try {
    if (tool === 'Extrair quadro') { if (!isVideo) return fail(r, 400, 'Extrair quadro só vale para vídeo'); out = S.pubFile(`${stamp}.png`); if (P.t === undefined || P.t === 'last') media.lastFrame(file, out); else media.extractFrameAt(file, out, Number(P.t)); kind = 'image'; type = 'Imagem'; name = `${n.title} (quadro)`; }
    else if (tool === 'Cortar') { if (!isVideo) return fail(r, 400, 'Cortar só vale para vídeo'); out = S.pubFile(`${stamp}.mp4`); media.trimVideo(file, out, Number(P.start) || 0, P.end === undefined ? 0 : Number(P.end)); kind = 'video'; type = 'Vídeo'; name = `${n.title} (corte)`; }
    else if (tool === 'Extrair áudio') { if (!isVideo) return fail(r, 400, 'Extrair áudio só vale para vídeo'); out = S.pubFile(`${stamp}.mp3`); media.extractAudio(file, out); kind = 'audio'; type = 'Áudio'; name = `${n.title} (áudio)`; }
    else if (tool === 'Recortar') { if (!isVideo && !isImage) return fail(r, 400, 'Recortar só vale para imagem ou vídeo'); out = S.pubFile(`${stamp}.${isVideo ? 'mp4' : 'png'}`); media.cropToRatio(file, out, P.ratio || '1:1', isVideo); kind = src.kind; type = n.type; name = `${n.title} (recorte ${P.ratio || '1:1'})`; }
    else if (tool === 'Melhorar qualidade' || tool === 'Amplificar') { if (tool === 'Melhorar qualidade' ? !isVideo : !isImage) return fail(r, 400, tool === 'Melhorar qualidade' ? 'Melhorar qualidade só vale para vídeo' : 'Amplificar só vale para imagem'); out = S.pubFile(`${stamp}.${isVideo ? 'mp4' : 'png'}`); media.enhanceMedia(file, out, isVideo); kind = src.kind; type = n.type; name = `${n.title} (${tool === 'Amplificar' ? 'ampliada 2x' : 'melhorada'})`; }
    else { if (!isVideo && !isImage) return fail(r, 400, 'Girar só vale para imagem ou vídeo'); out = S.pubFile(`${stamp}.${isVideo ? 'mp4' : 'png'}`); media.rotateMedia(file, out, Number(P.degrees) || 90, isVideo); kind = src.kind; type = n.type; name = `${n.title} (giro ${Number(P.degrees) || 90}°)`; }
  } catch (e) { return fail(r, 400, String(e.message || e).slice(0, 300)); }
  const a = addAsset(`${name}${path.extname(out)}`, out, kind, 'works'); const nn = addNode(p, type, name, { assetId: a.id, hasMedia: true }); nn.tools.forEach((t) => (t.enabled = true)); link(p, n, nn); S.save();
  send(r, 200, { ok: true, node: nn, asset: a });
});
// geracao de no: so executa com provedor configurado; sem provedor -> bloqueado (sem debito, sem resultado ficticio)
route('POST', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)\/generate$/, async (q, r, m) => {
  const p = project(m[1]); const n = p.canvas.nodes.find((x) => x.id === m[2]); if (!n) return fail(r, 404, 'nó inexistente'); const b = await readJson(q);
  const panel = { ...(n.panel || {}), ...b }; const kind = panel.kind; const provider = db().settings.provider || 'none';
  // Vídeo pela NovAI: submit + consulta a cada 12 s, em fila (uma tarefa por vez) e com progresso. A resposta é 202
  // com o run; no fim o MP4 é salvo e anexado a ESTE nó. Sem rota de vídeo, o fluxo antigo (síncrono) continua valendo.
  if (kind === 'video') {
    const videoRoutes = videoPlan();
    if (videoRoutes.ok && videoRoutes.routes.some((x) => x.providerId === 'novai')) {
      const prompt = String(panel.prompt || n.text || '').trim();
      if (prompt.length < 15) return fail(r, 400, 'Your prompt must contain at least 15 characters. Please provide a more detailed description.');
      const p0 = project(p.id); let chat = p0.chats[0];
      if (!chat) { chat = { id: S.newId(), title: 'Vídeo', messages: [], state: {} }; p0.chats.push(chat); }
      const run = {
        id: S.newId(), task: 'video_generation', state: 'queued', prompt: prompt.slice(0, 4000),
        seconds: Number(panel.seconds) || NOVAI_VIDEO_DURATION, projectId: p0.id, chatId: chat.id,
        sourceNodeId: n.id, nodeId: n.id, source: { type: 'node', projectId: p0.id, nodeId: n.id },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), events: [],
      };
      localRuns().unshift(run); publishLocalRun(run, 'queued'); touch(p0); S.save(); startLocalRun(run);
      return send(r, 202, { ok: true, queued: true, task: 'video_generation', run: runPublic(run), providerId: 'novai', note: 'Vídeo na fila do roteador gratuito (NovAI cogvideox-flash, 5 s). O progresso aparece no nó; o MP4 é salvo ao concluir.' });
    }
  }
  // Áudio fica fora desta rota genérica: voz tem regra própria (SAPI é o padrão; nuvem só com voiceSource:"cloud"),
  // tratada mais abaixo para não trocar a voz local por um provedor de nuvem em silêncio.
  const freeTask = { video: 'video_generation', image: 'image_generation', text: 'text' }[kind];
  const nodeRouterPlan = freeTask ? planFreeRoutes(freeTask, freeRouterConfig(), { quotaUsage: freeRouterUsage() }) : null;
  if (freeTask && nodeRouterPlan?.ok) {
    const prompt = String(panel.prompt || n.text || '').trim(); if (!prompt) return fail(r, 400, kind === 'text' ? 'Escreva o texto a gerar' : 'Descreva o que deseja gerar');
    if (kind === 'video' && prompt.length < 15) return fail(r, 400, 'Your prompt must contain at least 15 characters. Please provide a more detailed description.');
    const credentials = routerCredentials();
    let result; try {
      result = await executeFreeRoutes(nodeRouterPlan.routes, { prompt, options: { ...(panel.ratio ? { aspect_ratio: panel.ratio } : {}), ...(panel.seconds ? { duration: Number(panel.seconds) } : {}) } }, {
        adapters: createFreeRouterAdapters(), credentials,
        onAttempt: (candidate) => { const entry = freeRouterUsage()[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.count++; S.save(); },
        onQuota: (candidate) => { const entry = freeRouterUsage()[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.blocked = true; S.save(); },
      });
    } catch (error) { const message = String(error.message || error).slice(0, 500); return fail(r, error?.quotaExceeded ? 429 : /chave não configurada/.test(message) ? 503 : 502, message, { blocked: true, kind, creditsCharged: 0 }); }
    let output, asset = null;
    if (kind === 'text') { output = String(result.text || '').trim(); if (!output) return fail(r, 502, 'O provedor não retornou texto', { blocked: true }); n.text = output; }
    else if (kind === 'image' || kind === 'audio') {
      let data = kind === 'image' ? (result.image || result.images?.[0]?.data) : result.audio;
      if (!data && kind === 'image' && result.url) { try { data = await (await fetch(result.url)).arrayBuffer(); } catch { return fail(r, 502, 'Não foi possível obter a imagem retornada pelo provedor', { blocked: true }); } }
      if (!data) return fail(r, 502, `O provedor não retornou ${kind === 'image' ? 'imagem' : 'áudio'}`, { blocked: true, kind });
      const mime = kind === 'audio' ? (result.mimeType || 'audio/mpeg') : (result.mimeType || result.images?.[0]?.mimeType || sniffImageMime(data) || 'image/png');
      const ext = kind === 'audio' ? (mime.includes('wav') ? '.wav' : '.mp3') : (mime.includes('jpeg') ? '.jpg' : mime.includes('webp') ? '.webp' : '.png');
      const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}${ext}`); fs.writeFileSync(out, Buffer.isBuffer(data) ? data : Buffer.from(data));
      asset = addAsset(`${n.title}${ext}`, out, kind, 'works'); n.assetId = asset.id; n.hasMedia = true; n.tools?.forEach((t) => (t.enabled = true)); output = { assetId: asset.id, name: asset.name };
    } else { output = result.operation || result; n.generationResult = output; }
    touch(p); S.save(); return send(r, 200, { ok: true, task: freeTask, providerId: result.route?.providerId || result.providerId, result: output, ...(asset ? { asset } : {}), node: n, creditsCharged: 0 });
  }
  if (kind === 'video' && PV.isConfigured(PV.resolveProviders(providerRuntimeSettings()).video, 'video')) { // provedor de vídeo do usuário: cria TAREFA (assíncrona, persistente)
    const prompt = String(panel.prompt || n.text || '').trim(); if (prompt.length < 15) return fail(r, 400, 'Your prompt must contain at least 15 characters. Please provide a more detailed description.');
    const job = jobsMgr.create({ title: `${p.id}_${n.id}`, prompt, params: { seconds: Number(panel.seconds) || 5, ratio: panel.ratio || '9:16' }, source: { type: 'node', projectId: p.id, nodeId: n.id }, referenceAssetId: n.assetId && /\.(png|jpe?g|webp)$/i.test(db().assets.find((x) => x.id === n.assetId)?.stored || '') ? n.assetId : undefined }); await jobsMgr.tick();
    return send(r, 202, { ok: true, queued: true, job: jobView(job), note: job.state === 'blocked' ? `A tarefa foi criada mas não enviada: ${job.error}` : 'Tarefa enviada ao provedor; acompanhe em Tarefas.' });
  }
  if (kind === 'video' && provider === 'local-ffmpeg' && media.available()) {
    const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.mp4`); const ref = n.assetId && /\.(png|jpe?g|webp)$/i.test(db().assets.find((x) => x.id === n.assetId)?.stored || '') ? assetPath(n.assetId) : null;
    const info = media.generateLocalVideo(out, { seconds: Number(panel.seconds) || 5, ratio: panel.ratio, image: ref }); const a = addAsset(`${n.title}.mp4`, out, 'video', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
    return send(r, 200, { ok: true, provider: 'local-ffmpeg (não-IA)', asset: a, creditsCharged: 0, info });
  }
  if (kind === 'audio') { // voz: SAPI (padrão desta instalação, não-IA) ou o provedor do usuário, quando pedido/não houver SAPI
    const text = String(panel.prompt || n.text || '').trim(); if (!text) return fail(r, 400, 'Descreva o texto a falar');
    const cloud = cloudVoiceProvider();
    const requestedVoice = String(panel.voiceSource || panel.engine || 'auto').trim().toLowerCase();
    // A voz na nuvem do roteador (Cloudflare melotts) é OPT-IN: só com voiceSource/engine = "cloud".
    const wantCloud = requestedVoice === 'cloud';
    const engine = resolveVoiceEngine({ requested: requestedVoice, sapiAvailable: media.ttsAvailable(), cloudConfigured: !!cloud });
    if (engine === 'sapi') {
      const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.wav`);
      try { media.ttsLocal(text, out, { voice: panel.voice, rate: panel.rate }); } catch (e) { return fail(r, 500, String(e.message || e).slice(0, 300)); }
      const a = addAsset(`${n.title}.wav`, out, 'audio', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
      return send(r, 200, { ok: true, voiceEngine: 'sapi', provider: 'voz local do Windows (SAPI, não-IA) — padrão', asset: a, creditsCharged: 0 });
    }
    // Sem SAPI (ou nuvem pedida): rota gratuita primeiro. A Cloudflare só entra quando o pedido é voiceSource:"cloud".
    const viaRouter = requestedVoice === 'sapi'
      ? { ok: false, reason: 'voz local SAPI pedida, mas não existe nesta máquina' }
      : await synthViaRouter(text, { lang: panel.lang || 'en', includeOptIn: wantCloud });
    if (viaRouter.ok) {
      const ext = viaRouter.mimeType.includes('wav') ? '.wav' : viaRouter.mimeType.includes('mpeg') ? '.mp3' : '.wav';
      const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.${ext}`); fs.writeFileSync(out, viaRouter.bytes);
      const a = addAsset(`${n.title}${ext}`, out, 'audio', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
      return send(r, 200, { ok: true, voiceEngine: 'cloud', provider: `${viaRouter.route.providerName} · ${viaRouter.route.modelId}`, mimeType: viaRouter.mimeType, route: viaRouter.route, asset: a, creditsCharged: 0 });
    }
    if (cloud) {
      let o; try { o = await PV.adapterFor('audio', cloud.adapter).synth(cloud, { text, voice: panel.voice, fetchImpl: fetch }); } catch (e) { return fail(r, 502, `Falha no provedor de voz: ${String(e.message || e).slice(0, 240)}`); }
      const ext = o.ext || 'mp3'; const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.${ext}`); fs.writeFileSync(out, Buffer.from(o.bytes));
      const a = addAsset(`${n.title}.${ext}`, out, 'audio', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
      return send(r, 200, { ok: true, voiceEngine: 'cloud', provider: `${cloud.adapter} (${cloud.model}) — opção do usuário`, asset: a, creditsCharged: 0 });
    }
    return fail(r, 409, wantCloud
      ? `Voz na nuvem indisponível: ${viaRouter.reason}. Nada foi gerado.`
      : `Nenhuma voz disponível: ${viaRouter.reason}. A voz local SAPI é o padrão; para usar a Cloudflare peça voiceSource:"cloud". Nada foi gerado.`,
    { blocked: true, kind, creditsCharged: 0, routeReason: viaRouter.reason });
  }
  const ipc = PV.resolveProviders(providerRuntimeSettings()).image;
  if (kind === 'image' && PV.isConfigured(ipc, 'image')) { // provedor de imagem do usuário (adaptador do registro; migra o antigo imageProvider)
    const ip = ipc; const prompt = String(panel.prompt || n.text || '').trim(); if (prompt.length < 3) return fail(r, 400, 'Descreva a imagem');
    let buf; try { buf = await PV.adapterFor('image', ip.adapter).generate(ip, { prompt, ratio: panel.ratio, fetchImpl: fetch }); } catch (e) { return fail(r, 502, `Falha no provedor de imagem: ${String(e.message || e).slice(0, 240)}`); }
    const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.png`); fs.writeFileSync(out, buf); const a = addAsset(`${n.title}.png`, out, 'image', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
    return send(r, 200, { ok: true, provider: `${ip.model} @ ${new URL(ip.baseUrl).host} (provedor do usuário)`, asset: a, creditsCharged: 0 });
  }
  const cost = kind === 'video' ? videoCost(panel.model, Number(panel.seconds) || 10) : kind === 'image' ? panel.cost || 68 : null;
  return fail(r, 409, NEEDS[kind] || 'geração indisponível', { blocked: true, kind, wouldCost: cost, creditsCharged: 0 });
});
route('POST', /^\/api\/projects\/(\d+)\/chats$/, async (q, r, m) => { const p = project(m[1]); const c = { id: S.newId(), title: 'Novo chat', messages: [], state: {} }; p.chats.push(c); touch(p); send(r, 200, c); });
route('POST', /^\/api\/projects\/(\d+)\/chats\/(\d+)\/messages$/, async (q, r, m) => {
  const p = project(m[1]); const c = p.chats.find((x) => x.id === m[2]); if (!c) return fail(r, 404, 'chat inexistente'); const b = await readJson(q);
  if (p.title === 'PROJECT' || p.title === 'Untitled') { if (b.text) p.title = b.text.slice(0, 50); }
  try { await userMessage(await agentCtx(), p, c, b); } catch (e) { return fail(r, 500, String(e.message || e)); }
  c.title = c.messages.find((x) => x.role === 'user')?.text?.slice(0, 50) || c.title; touch(p); send(r, 200, { chat: c, project: p });
});
route('GET', /^\/api\/assets$/, async (q, r) => { const u = new URL(q.url, 'http://x'); const cat = u.searchParams.get('cat'), kind = u.searchParams.get('kind'), s = (u.searchParams.get('q') || '').toLowerCase(); let a = db().assets; if (cat) a = a.filter((x) => x.cat === cat); if (kind) a = a.filter((x) => x.kind === kind); if (s) a = a.filter((x) => x.name.toLowerCase().includes(s)); send(r, 200, a); });
route('POST', /^\/api\/assets$/, async (q, r) => {
  const buf = await readBody(q); const name = decodeURIComponent(q.headers['x-file-name'] || 'arquivo'); const tmp = S.pubFile('_up_' + S.newId() + path.extname(name));
  fs.writeFileSync(tmp, buf); const a = addAsset(name, tmp, kindOf(name, q.headers['content-type'] || ''), q.headers['x-cat'] || 'upload'); try { fs.unlinkSync(tmp); } catch {} send(r, 200, a);
});
// onde um ativo é usado (confirmação de exclusão): personagens, produtos, nós do Canvas, projetos de edição e tarefas
const assetUsage = (id) => {
  const d = db(); const nodes = [], editors = [];
  for (const p of d.projects) { if (p.type === 'editor') { if (p.timeline?.clips?.some((c) => c.assetId === id) || p.timeline?.audio?.some((c) => c.assetId === id)) editors.push({ projectId: p.id, title: p.title }); } else for (const n of p.canvas?.nodes || []) if (n.assetId === id) nodes.push({ projectId: p.id, nodeId: n.id, title: `${p.title} › ${n.title}` }); }
  return { characters: chars().filter((e) => e.assetIds.includes(id)).map((e) => ({ id: e.id, name: e.name })), products: prods().filter((e) => e.assetIds.includes(id)).map((e) => ({ id: e.id, name: e.name })), nodes, editors, jobs: jobsMgr.jobs().filter((j) => j.assetId === id).map((j) => j.id) };
};
route('GET', /^\/api\/assets\/(\d+)\/usage$/, async (q, r, m) => { if (!db().assets.some((x) => x.id === m[1])) return fail(r, 404, 'ativo inexistente'); send(r, 200, assetUsage(m[1])); });
route('DELETE', /^\/api\/assets\/(\d+)$/, async (q, r, m) => {
  const d = db(); const a = d.assets.find((x) => x.id === m[1]); if (a) { try { fs.unlinkSync(S.pubFile(a.stored)); } catch {} }
  d.assets = d.assets.filter((x) => x.id !== m[1]); for (const list of [chars(), prods()]) { for (const e of list) e.assetIds = e.assetIds.filter((x) => x !== m[1]); } d.characters = chars().filter((e) => e.assetIds.length); d.products = prods().filter((e) => e.assetIds.length); // personagem/produto sem nenhuma imagem deixa de existir
  S.save(); send(r, 200, { ok: true });
});
// Personagens e produtos a partir do menu "…" do ativo. O Pippit mostra o menu (Baixar, Selecionar, Adicionar personagem, Adicionar produto, Vincular produto existente, Excluir; captures/auth/cdp/asset_menu),
// mas os diálogos dessas 3 ações NUNCA foram abertos: as regras abaixo são LOCAIS (só imagens, nome obrigatório até 60 caracteres, sem nome repetido, um personagem por ativo).
const chars = () => (db().characters ||= []); const prods = () => (db().products ||= []);
const entView = (e) => ({ ...e, assets: e.assetIds.map((id) => db().assets.find((a) => a.id === id)).filter(Boolean) });
route('GET', /^\/api\/characters$/, async (q, r) => send(r, 200, chars().map(entView)));
route('GET', /^\/api\/products$/, async (q, r) => send(r, 200, prods().map(entView)));
const imageAsset = (r, id) => { const a = db().assets.find((x) => x.id === id); if (!a) { fail(r, 404, 'ativo inexistente'); return null; } if (a.kind !== 'image') { fail(r, 400, 'apenas imagens podem ser personagem ou produto'); return null; } return a; };
for (const [kind, list, label, art] of [['character', chars, 'personagem', 'um personagem'], ['product', prods, 'produto', 'um produto']]) {
  route('POST', new RegExp(`^/api/assets/(\\d+)/${kind}$`), async (q, r, m) => {
    const a = imageAsset(r, m[1]); if (!a) return; const b = await readJson(q); const have = list().find((e) => e.assetIds.includes(a.id)); if (have) return send(r, 200, { ok: true, reused: true, [kind]: entView(have) });
    const name = String(b.name ?? a.name.replace(/\.[^.]+$/, '')).trim().slice(0, 60); if (!name) return fail(r, 400, `Digite um nome para o ${label}`);
    if (list().some((e) => e.name.toLowerCase() === name.toLowerCase())) return fail(r, 409, `Já existe ${art} chamado "${name}"`);
    const e = { id: S.newId(), name, assetIds: [a.id], createdAt: new Date().toISOString() }; list().unshift(e); S.save(); send(r, 200, { ok: true, reused: false, [kind]: entView(e) });
  });
  route('DELETE', new RegExp(`^/api/${kind}s/(\\d+)$`), async (q, r, m) => { const l = list(); const i = l.findIndex((e) => e.id === m[1]); if (i < 0) return fail(r, 404, `${label} inexistente`); l.splice(i, 1); S.save(); send(r, 200, { ok: true }); }); // só remove o cadastro: as imagens ficam nos ativos
}
route('POST', /^\/api\/assets\/(\d+)\/link-product$/, async (q, r, m) => {
  const a = imageAsset(r, m[1]); if (!a) return; const b = await readJson(q); const p = prods().find((e) => e.id === String(b.productId)); if (!p) return fail(r, 404, 'produto inexistente'); if (p.assetIds.includes(a.id)) return send(r, 200, { ok: true, reused: true, product: entView(p) });
  p.assetIds.push(a.id); S.save(); send(r, 200, { ok: true, reused: false, product: entView(p) });
});
// avatares: assistente de foto (validacao real da imagem + consentimento + 3 usos gratuitos), vídeo (paywall), voz (referencia)
route('GET', /^\/api\/avatars$/, async (q, r) => send(r, 200, { ...db().avatars, costs: { videoAvatar: AVATAR_RULES.videoAvatarCreditsPerUse, customVoice: AVATAR_RULES.customVoiceCreditsPerUse } }));
route('POST', /^\/api\/avatars\/photo\/verify$/, async (q, r) => {
  const buf = await readBody(q); const tmp = S.pubFile('_v_' + S.newId()); fs.writeFileSync(tmp, buf); let info = null; try { info = media.probe(tmp); } catch {} try { fs.unlinkSync(tmp); } catch {}
  if (!info || !info.hasVideo) return send(r, 200, { ok: false, errors: ['arquivo não é uma imagem válida'] });
  const mime = /png/i.test(info.codec) ? 'image/png' : /mjpeg|jpeg/i.test(info.codec) ? 'image/jpeg' : 'image/' + info.codec; send(r, 200, { ...validatePhoto({ mime, width: info.width, height: info.height }), width: info.width, height: info.height, mime, note: 'A verificação de rosto (frontal, único, sem óculos escuros) do Pippit é desconhecida e não foi reproduzida.' });
});
route('POST', /^\/api\/avatars\/photo$/, async (q, r) => {
  const d = db(); const consent = q.headers['x-consent'] === 'true'; const name = decodeURIComponent(q.headers['x-avatar-name'] || 'Avatar'); const buf = await readBody(q);
  const acc = photoAvatarAccess({ plan: d.user.plan, usesLeft: d.avatars.photoFreeUses }); if (!acc.ok) return fail(r, 402, 'Sem usos gratuitos de foto em avatar. Assine para continuar.', { paywall: true });
  const tmp = S.pubFile('_a_' + S.newId()); fs.writeFileSync(tmp, buf); let info = null; try { info = media.probe(tmp); } catch {}
  const mime = info ? (/png/i.test(info.codec) ? 'image/png' : 'image/jpeg') : '';
  if (!canAdvance({ photo: info && { mime, width: info.width, height: info.height }, consent })) { try { fs.unlinkSync(tmp); } catch {} return fail(r, 400, consent ? 'foto inválida (JPG/PNG, lado > 256 px)' : 'é necessário o consentimento de uso do conteúdo'); }
  const a = addAsset(name + (mime === 'image/png' ? '.png' : '.jpg'), tmp, 'image', 'character'); try { fs.unlinkSync(tmp); } catch {}
  const av = { id: S.newId(), name, voice: decodeURIComponent(q.headers['x-avatar-voice'] || ''), assetId: a.id, createdAt: new Date().toISOString() }; d.avatars.photo.push(av); if (d.user.plan === 'free') d.avatars.photoFreeUses = acc.usesLeft; S.save();
  send(r, 200, { ok: true, avatar: av, photoFreeUses: d.avatars.photoFreeUses });
});
route('POST', /^\/api\/avatars\/video$/, async (q, r) => { const acc = videoAvatarAccess({ plan: db().user.plan }); if (!acc.ok) return fail(r, 402, acc.paywall, { paywall: true }); fail(r, 501, 'Criação de avatar em vídeo exige o serviço de geração do Pippit (1999 créditos/vez); não disponível localmente.', { blocked: true }); });
route('POST', /^\/api\/avatars\/voice$/, async (q, r) => { const name = decodeURIComponent(q.headers['x-voice-name'] || 'Voz'); const buf = await readBody(q); const tmp = S.pubFile('_s_' + S.newId()); fs.writeFileSync(tmp, buf); const a = addAsset(name + '.audio', tmp, 'audio', 'upload'); try { fs.unlinkSync(tmp); } catch {} const v = { id: S.newId(), name, assetId: a.id, mode: 'referência de áudio (sem clonagem)' }; db().avatars.voices.push(v); S.save(); send(r, 200, { ok: true, voice: v }); });
// marca d'agua (estrutura pronta, DESLIGADA por padrao): config unica em app/lib/watermark.mjs, aplicada na exportacao.
// Nome da marca vem da CONFIGURACAO (settings.brandName); nenhum nome de marca esta escrito no codigo.
const wmCfg = () => { try { return WMARK.normalizeWatermark(db().settings.watermark || {}); } catch { return { ...WMARK.WATERMARK_DEFAULTS, invalid: true }; } };
// O arquivo existe independentemente do modo escolhido (serve para prévia e para trocar de modo sem perder o upload).
const wmImagePath = () => WMARK.resolveImagePath({ ...wmCfg(), kind: 'image' }, BRAND_DIR);
const wmImageInfo = () => { const f = wmImagePath(); let size = null; try { size = f ? fs.statSync(f).size : null; } catch {} return { path: wmCfg().imagePath, file: f, exists: size !== null, bytes: size, url: (() => { const c = wmCfg(); return size !== null ? '/' + c.imagePath : null; })() }; };
const wmStatus = () => {
  const cfg = wmCfg(); const plan = getPlan(db().user.plan); const img = wmImageInfo(); const brand = String(db().settings.brandName || '');
  const eff = WMARK.effectiveWatermark({ ...db().settings, watermark: cfg }, { requested: true, plan, imageExists: img.exists });
  return {
    config: cfg, defaults: WMARK.WATERMARK_DEFAULTS, positions: WMARK.WATERMARK_POSITIONS,
    brandName: brand, brandConfigured: !!brand, image: img, plan: { id: plan?.id, name: plan?.name, noWatermark: plan?.noWatermark === true },
    saveWithoutWatermark: { preference: db().settings.saveWithoutWatermark === true, allowed: plan?.noWatermark === true },
    effective: { active: eff.active, reason: eff.reason },
    note: cfg.enabled
      ? (eff.active ? `Marca d'água ligada (${cfg.kind}, ${cfg.position}) e aplicada na exportação.` : `Marca d'água configurada, mas não será aplicada: ${eff.reason}.`)
      : "Marca d'água DESLIGADA (padrão). Ligue para aplicá-la nas exportações — a estrutura já está pronta e o arquivo assets/brand/watermark.png pode ser substituído.",
  };
};
route('GET', /^\/api\/watermark$/, async (q, r) => send(r, 200, wmStatus()));
route('POST', /^\/api\/watermark$/, async (q, r) => {
  const b = await readJson(q); const d = db();
  if (b.brandName !== undefined) { const n = String(b.brandName || '').trim(); if (n.length > 40) return fail(r, 400, 'nome da marca muito longo (máx. 40)'); d.settings.brandName = n; }
  const merged = { ...wmCfg(), ...(b.config || b) }; delete merged.invalid;
  let cfg; try { cfg = WMARK.normalizeWatermark(merged); } catch (e) { return fail(r, 400, String(e.message)); }
  d.settings.watermark = cfg; S.save(); send(r, 200, { ok: true, ...wmStatus() });
});
// Substitui a imagem da marca (corpo = bytes PNG/JPEG). Sem upload embutido de terceiros: só grava o arquivo local.
route('POST', /^\/api\/watermark\/image$/, async (q, r) => {
  const buf = await readBody(q); if (buf.length < 100) return fail(r, 400, 'arquivo vazio'); if (buf.length > 8 * 1024 * 1024) return fail(r, 413, 'imagem grande demais (máx. 8 MB)');
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  if (!png && !jpg) return fail(r, 415, 'envie um PNG ou JPEG'); const c = wmCfg(); const dest = WMARK.resolveImagePath({ ...c, kind: 'image' }, BRAND_DIR);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); send(r, 200, { ok: true, format: png ? 'png' : 'jpeg', ...wmStatus() });
});
route('DELETE', /^\/api\/watermark\/image$/, async (q, r) => { const f = wmImagePath(); try { if (f) fs.unlinkSync(f); } catch {} send(r, 200, { ok: true, ...wmStatus() }); });
// editor: rascunhos, timeline e exportacao real (ffmpeg)
route('POST', /^\/api\/editor$/, async (q, r) => { const p = newProject('editor', new Date().toISOString().replace(/\D/g, '').slice(0, 12)); p.timeline = { ratio: 'original', clips: [], texts: [], captions: [], audio: [] }; S.save(); send(r, 200, p); });
route('PUT', /^\/api\/editor\/(\d+)$/, async (q, r, m) => { const p = project(m[1]); const b = await readJson(q); for (const c of b.clips || []) { if (c.speed !== undefined && !(Number(c.speed) >= 0.1 && Number(c.speed) <= 10)) return fail(r, 400, 'velocidade fora do intervalo 0,1x–10x (limite local: o Pippit não mostra a faixa)'); if (c.in !== undefined && !(Number(c.in) >= 0)) return fail(r, 400, 'início inválido'); }
  if (b.ratio !== undefined && !media.validRatio(b.ratio)) return fail(r, 400, `proporção inválida: ${String(b.ratio).slice(0, 20)} (use ${media.EDITOR_RATIOS.map((x) => x.id).join(', ')})`); p.timeline = { ratio: b.ratio || p.timeline?.ratio || '9:16', clips: b.clips || [], texts: b.texts || [], captions: b.captions || [], audio: b.audio || [], background: ['black', 'color', 'blur'].includes(b.background?.type) ? { type: b.background.type, color: /^[0-9a-fA-F]{6}$/.test(b.background.color || '') ? b.background.color : undefined } : { type: 'black' } }; if (b.title) p.title = b.title; touch(p); send(r, 200, p); });
route('POST', /^\/api\/editor\/(\d+)\/export$/, async (q, r, m) => {
  const p = project(m[1]); if (!media.available()) return fail(r, 501, 'ffmpeg indisponível'); if (!p.timeline?.clips?.length) return fail(r, 400, 'timeline vazia');
  // Sem corpo: exportacao simples (compatibilidade). Com opcoes do dialogo "Export settings": nome obrigatorio (max 100), resolucao, qualidade, fps, formato, marca d'agua.
  const b = await readJson(q); const hasOpts = ['name', 'resolution', 'quality', 'fps', 'format', 'watermark'].some((k) => k in b); let opts = null; let name = p.title || 'export';
  if (hasOpts) {
    if ('name' in b) { name = String(b.name || '').trim(); if (!name) return fail(r, 400, 'Enter a name'); if (name.length > 100) return fail(r, 400, 'name too long (max 100 characters)'); }
    try { opts = media.normalizeExportOptions(b); } catch (e) { return fail(r, 400, String(e.message)); }
  }
  const ext = opts ? media.EXPORT_OPTIONS.format[opts.format] : 'mp4'; const out = S.pubFile(`${p.id}_export_${Date.now()}.${ext}`);
  // marca d'agua: decisao unica (config + dialogo + preferencia/plano) vinda do modulo app/lib/watermark.mjs
  const planNow = getPlan(db().user.plan); const imgNow = wmImageInfo();
  const wmEff = WMARK.effectiveWatermark(db().settings, { requested: opts ? opts.watermark !== false : true, plan: planNow, imageExists: imgNow.exists });
  const wmCtx = { active: wmEff.active, reason: wmEff.reason, cfg: wmEff.cfg, brandName: String(db().settings.brandName || ''), imagePath: WMARK.resolveImagePath(wmEff.cfg, BRAND_DIR), imageExists: imgNow.exists, fontFile: WMARK.pickFont() };
  try {
    let info; if (opts) { const base = out + '.base.mp4'; media.exportTimeline(p.timeline, assetPath, base); try { info = media.finalize(base, out, opts, { watermark: wmCtx }); } finally { try { fs.unlinkSync(base); } catch {} } } else if (wmCtx.active) { const base = out + '.base.mp4'; media.exportTimeline(p.timeline, assetPath, base); try { info = media.finalize(base, out, {}, { watermark: wmCtx }); } finally { try { fs.unlinkSync(base); } catch {} } } else info = media.exportTimeline(p.timeline, assetPath, out);
    const a = addAsset(`${name}.${ext}`, out, 'video', 'works');
    // projeto de edição vindo de um nó do Canvas: o resultado volta ao Canvas de origem como novo nó de vídeo ligado ao nó original
    let linked = null; if (p.origin) { const op = db().projects.find((x) => x.id === p.origin.projectId); const src = op?.canvas.nodes.find((x) => x.id === p.origin.nodeId); if (op) { const nn = addNode(op, 'Vídeo', `${name} (editado)`, { assetId: a.id, hasMedia: true, editedFrom: p.origin.nodeId, editorId: p.id }); nn.tools?.forEach((t) => (t.enabled = true)); if (src) linkId(op, src.id, nn.id); linked = { projectId: op.id, nodeId: nn.id }; touch(op); } }
    send(r, 200, { ok: true, asset: a, info, linked, watermark: info?.watermark || { applied: false, reason: wmEff.reason }, watermarkNote: wmCtx.active ? null : wmEff.reason });
  } catch (e) { fail(r, 500, String(e.message || e).slice(0, 600)); }
});
// Canvas → Editor. EXTENSÃO LOCAL: o Pippit não mostra ação "editar" no nó de vídeo (o editor dele lista os ativos da conta); aqui o vídeo REAL do nó vira o clipe de um projeto de edição.
// Recusa (sem criar cartões de mentira): nó que não é de vídeo, geração incompleta, ativo/arquivo ausente, mídia inválida.
route('POST', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)\/edit$/, async (q, r, m) => {
  const p = project(m[1]); const n = p.canvas.nodes.find((x) => x.id === m[2]); if (!n) return fail(r, 404, 'nó inexistente'); const b = await readJson(q);
  if (n.type !== 'Vídeo') return fail(r, 400, 'só nós de vídeo podem ser enviados para edição');
  if (!n.assetId) { const job = jobsMgr.jobs().find((j) => j.source?.type === 'node' && j.source.projectId === p.id && j.source.nodeId === n.id && ['blocked', 'queued', 'running'].includes(j.state)); return fail(r, 409, job ? `a geração deste nó ainda não terminou (${job.state}${job.error ? ': ' + job.error : ''})` : 'o nó ainda não tem vídeo', { jobState: job?.state || null }); }
  const a = db().assets.find((x) => x.id === n.assetId); if (!a) return fail(r, 404, 'o ativo deste nó não existe mais');
  const file = S.pubFile(a.stored); if (!fs.existsSync(file)) return fail(r, 410, 'o arquivo de vídeo deste nó está ausente do disco'); if (!media.available()) return fail(r, 501, 'ffmpeg indisponível');
  let info = null; try { info = media.probe(file); } catch {} if (!info?.hasVideo || !(info.duration > 0)) return fail(r, 422, 'o arquivo deste nó não é um vídeo válido');
  const prev = !b.new && (n.editorIds || []).map((id) => db().projects.find((x) => x.id === id)).filter(Boolean).at(-1); if (prev) return send(r, 200, { ok: true, editorId: prev.id, reused: true });
  const e = newProject('editor', String(n.title || 'Vídeo').slice(0, 60)); e.timeline = { ratio: 'original', clips: [{ assetId: a.id, in: 0, out: Math.round(info.duration * 100) / 100 }], texts: [], captions: [], audio: [], background: { type: 'black' } }; e.origin = { projectId: p.id, nodeId: n.id, assetId: a.id };
  (n.editorIds ||= []).push(e.id); touch(e); touch(p); send(r, 200, { ok: true, editorId: e.id, reused: false });
});
// Capa do diálogo Export settings: miniatura REAL do primeiro quadro do primeiro clipe.
// Observado no Pippit: a capa é uma miniatura do primeiro quadro e o clique simples NÃO abre seletor de capa.
route('GET', /^\/api\/editor\/(\d+)\/cover$/, async (q, r, m) => {
  const p = db().projects.find((x) => String(x.id) === String(m[1])); if (!p) return fail(r, 404, 'projeto de edição inexistente'); if (!p.timeline?.clips?.length) return fail(r, 404, 'timeline vazia');
  if (!media.available()) return fail(r, 501, 'ffmpeg indisponível');
  const clip = [...p.timeline.clips].sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0))[0];
  const a = db().assets.find((x) => x.id === clip.assetId); if (!a) return fail(r, 404, 'ativo do clipe não existe');
  const src = S.pubFile(a.stored); if (!fs.existsSync(src)) return fail(r, 410, 'arquivo do clipe ausente do disco');
  const at = Math.max(0, Number(clip.in) || 0); const out = path.join(S.FILES_DIR, `cover_${a.id}_${Math.round(at * 100)}.png`);
  try { if (!fs.existsSync(out)) media.extractFrameAt(src, out, at); } catch (e) { return fail(r, 422, `não foi possível extrair o primeiro quadro: ${String(e.message || e).slice(0, 200)}`); }
  return send(r, 200, fs.readFileSync(out), { 'content-type': 'image/png', 'cache-control': 'no-store' });
});
// Promoções vistas na home: valores OBSERVADOS em capturas (não é cotação atual nem preço praticado aqui).
// Mapeamento valor→data, duração e efeito na cobrança seguem UNOBSERVED: nada é inferido.
const PROMO_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 80 (capturado de captures/audit/home; arquivo não incluído neste checkout)',
  current: false,
  currency: 'BRL',
  snapshots: [
    { date: '2026-10-20', bannerPercent: 90, text: 'banner da home: até 90% de desconto nos planos' },
    { date: '2026-10-21', bannerPercent: 40, text: 'banner da home: até 40% de desconto nos planos' },
  ],
  priceObservations: [
    { model: 'Seedance 2.5', unit: 'R$/s', values: [0.18, 0.45] },
    { model: '2.0 Fast', unit: 'R$/s', values: [0.04, 0.22] },
  ],
  unobserved: ['qual valor de preço corresponde a qual data', 'duração das promoções', 'efeito real no valor cobrado', 'preço praticado hoje'],
});
// Feed Inspiration / desafios: NENHUMA tela de feed foi capturada. A rota devolve os nomes de função
// e caminhos de endpoint que os bundles citam (PIPPIT_API_CATALOG.md), todos marcados UNOBSERVED em
// comportamento; nada de cartões, curtidas, remix ou chamadas externas.
const INSPIRATION_OBSERVED = Object.freeze({
  source: 'PIPPIT_API_CATALOG.md (nomes de endpoints estáticos; 78 linhas de inspiration)',
  feedCaptured: false,
  features: [
    { id: 'feed', label: 'Feed', status: 'UNOBSERVED' },
    { id: 'like/mylikes', label: 'Curtir e meus likes', status: 'UNOBSERVED' },
    { id: 'list_related_remix', label: 'Remix relacionado', status: 'UNOBSERVED' },
    { id: 'list_published_inspiration', label: 'Publicados', status: 'UNOBSERVED' },
    { id: 'feed_challenge', label: 'Desafios', status: 'UNOBSERVED' },
    { id: 'challenge_tools', label: 'Ferramentas do desafio', status: 'UNOBSERVED' },
  ],
  // Áreas nomeadas pelos endpoints observados nos bundles (só nomes/caminhos estáticos; contrato e
  // resposta em execução nunca foram capturados — cada área segue UNOBSERVED no comportamento).
  endpointAreas: {
    feed: ['inspiration/feed (GetInspirations)', 'inspiration/list_feed_inspiration', 'inspiration/detail_list', 'inspiration/details', 'inspiration/feature_tab', 'inspiration/get_inspiration_tab_config'],
    curtir: ['inspiration/like', 'inspiration/mylikes', 'inspiration/interactions', 'inspiration/batch_get_interaction_status'],
    remix: ['inspiration/list_related_remix', 'inspiration/list_for_fission'],
    publicados: ['inspiration/list_published_inspiration', 'inspiration/get_published_inspiration_detail', 'inspiration/publish_drama_general'],
    atividades: ['inspiration/list_inspiration_activity', 'inspiration/list_feed_challenge', 'inspiration/list_challenge_tools', 'inspiration/locate_challenge_position', 'inspiration/get_drama_hot_topic', 'inspiration/get_drama_sug_item'],
  },
  externalCalls: false,
  note: 'Nenhuma tela, cartão ou resposta de feed foi capturada neste checkout; nada é inventado e nada é enviado.',
});
route('GET', /^\/api\/inspiration\/state$/, (q, r) => send(r, 200, { ok: true, ...INSPIRATION_OBSERVED }));

route('GET', /^\/api\/promotions$/, (q, r) => send(r, 200, { ok: true, ...PROMO_OBSERVED }));

// Controles do composer (linha 81): os RÓTULOS foram vistos nas capturas de audit/home, mas as opções
// internas de Preferência, o custo por geração e a lista de @ nunca foram capturados. A rota devolve os
// cinco controles com o seletor local que os implementa e marca explicitamente o que falta observar.
const COMPOSER_CONTROLS = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 81 (rótulos de captures/audit/home; captura não incluída neste checkout)',
  captured: true,
  internalsCaptured: false,
  controls: [
    { id: 'agent', label: 'Agente ▾', local: '#modeB', optionsObserved: false, note: 'os quatro modos locais (Agente/Vídeo/Imagem/Áudio) vêm de test/composer_dropdowns_ui; a ordem e o texto exatos do menu original não estão no checkout' },
    { id: 'mention', label: '@', local: '#at', optionsObserved: false, note: 'a menção local responde com aviso; nenhuma captura da lista de menções' },
    { id: 'skills', label: 'Habilidades ▾', local: '#skillB', optionsObserved: true, note: 'lista local de habilidades já coberta por composer_dropdowns_ui' },
    { id: 'model_preference', label: 'Modelo | Preferência ▾', local: '#modelB', optionsObserved: false, note: 'modelos, proporção e resolução locais existem; as preferências (Inteligente/720p/Duração inteligente) aparecem só como title, sem captura do painel' },
    { id: 'canvas_toggle', label: 'Tela', local: '#canvasT', optionsObserved: false, note: 'interruptor local liga/desliga o canvas; o efeito no serviço original não foi observado' },
  ],
  cost: { observed: false, note: 'nenhuma captura mostra custo em créditos por geração neste compositor' },
  externalCalls: false,
});
route('GET', /^\/api\/composer\/controls$/, (q, r) => send(r, 200, { ok: true, ...COMPOSER_CONTROLS }));

// Integrações de loja/marketplace (linha 77): a frase "integração com o mercado de vendas online" é texto
// da página pública de preços; NENHUMA tela de integração foi localizada no app. Só os canais sociais do
// fluxo de publicação (TikTok, Facebook, Instagram) existem localmente — e mesmo eles sem OAuth real.
const INTEGRATIONS_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 77 (texto da página pública de preços, REA ev_58c189b5…74a9)',
  marketingClaim: 'Integração com o mercado de vendas online',
  claimCaptured: true,
  marketplace: {
    screens: 0,
    status: 'UNOBSERVED',
    note: 'nenhuma tela, menu ou rota de integração de marketplace/loja foi localizada; só a frase de marketing existe',
  },
  social: [
    { id: 'tiktok', label: 'TikTok', status: 'CONFIRMED', where: 'publicação: adicionar canal' },
    { id: 'facebook', label: 'Facebook', status: 'CONFIRMED', where: 'publicação: adicionar canal' },
    { id: 'instagram', label: 'Instagram', status: 'CONFIRMED', where: 'publicação: adicionar canal' },
  ],
  oauth: 'UNOBSERVED',
  externalCalls: false,
});
route('GET', /^\/api\/integrations$/, (q, r) => send(r, 200, { ok: true, ...INTEGRATIONS_OBSERVED }));
// Gerador de vídeos / ferramentas populares (linha 79): o inventário preservou os NOMES e alguns detalhes
// (passos da foto falante, tamanho mínimo de imagem, presets), mas a tela do gerador e a lista de chips
// nunca foram capturadas. A rota devolve o que foi observado e marca o resto como UNOBSERVED.
const GENERATOR_TOOLS = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 79 (REA ev_8863847a…3217; ev_2320cb92…5021)',
  page: { id: 'ai-video-generator-v2', title: 'Gerador de vídeos', screenCaptured: false },
  tools: [
    { id: 'avatar-video', label: 'Avatar video', detail: 'UNOBSERVED' },
    { id: 'ai-talking-photo', label: 'AI talking photo', steps: ['Upload photo', 'Add voiceover', 'Export'], input: 'JPG/PNG maior que 256×256', examples: '~20 exemplos (não preservados)' },
    { id: 'remove-background', label: 'Remove background', detail: 'diálogo Upload video; remoção automática' },
    { id: 'quick-cut', label: 'Quick cut', detail: 'transcrição automática' },
    { id: 'video-editor', label: 'Video editor', detail: 'UNOBSERVED' },
  ],
  presets: [
    { label: 'Tough guy sweet style', preview: 'UNOBSERVED' },
    { label: 'News link to video', preview: 'UNOBSERVED' },
    { label: 'Santa shop showcase', preview: 'UNOBSERVED' },
  ],
  chiplist: { observed: false, note: 'a lista de chips de "ferramentas populares" do serviço original não foi capturada' },
  externalCalls: false,
});
route('GET', /^\/api\/generator\/tools$/, (q, r) => send(r, 200, { ok: true, ...GENERATOR_TOOLS }));


// Menu do avatar (linha 56): só "Aplicar" aparece na evidência; o menu "…" e a prévia de áudio nunca foram
// observados. Nada de renomear/excluir presumido — a rota expõe a lacuna e a tela repete isso.
const AVATAR_MENU_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 56 (b3_existing_avatar; test/avatar_menu_ui.test.mjs)',
  items: [
    { id: 'apply', label: 'Aplicar', status: 'CONFIRMED', local: 'implementado como @menção no compositor' },
    { id: 'more', label: 'Menu “…” do avatar', status: 'UNOBSERVED', local: 'só abre um aviso; não altera o avatar' },
    { id: 'audio_preview', label: 'Prévia de áudio', status: 'UNOBSERVED', local: 'não reproduzida' },
  ],
  ownAvatarMenu: 'UNOBSERVED',
  exampleAvatarMenu: 'não existe (o avatar de exemplo não tem menu)',
  humanObservation: 'PENDING',
  externalCalls: false,
});
route('GET', /^\/api\/avatar\/menu$/, (q, r) => send(r, 200, { ok: true, ...AVATAR_MENU_OBSERVED }));
// Templates de marketing (linha 76): o inventário diz 10 templates e preservou 8 nomes. Imagens, texto
// pré-preenchido e o fluxo Generate NÃO foram capturados — a rota devolve só o que existe, sem inventar nome.
const TEMPLATES_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 76 (REA ev_5d03dbc3…4dff)',
  totalReported: 10,
  namesPreserved: [
    'Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal',
    'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop',
  ],
  missingNames: 2,
  images: 'UNOBSERVED',
  prefillText: 'UNOBSERVED',
  generateFlow: 'UNOBSERVED',
  externalCalls: false,
});
route('GET', /^\/api\/templates\/state$/, (q, r) => send(r, 200, { ok: true, ...TEMPLATES_OBSERVED }));
// Barra do canvas (linha 90): a captura mostra as ações de painel/compartilhar/fechar e a barra contextual,
// mas ícones, dimensões e contratos não foram observados. A rota separa o que existe local do que falta.
const CANVAS_TOOLBAR_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 90 (REA ev_ae60525e…3513; ev_94367b0e…9572; screenshots/auth/tela_atual_usuario.png)',
  observedActions: ['painel do agente à direita', 'reposicionar para a esquerda/direita', 'compartilhar tela', 'fechar', 'histórico de chats'],
  localTools: ['ajustar o zoom à tela', 'ocultar conexões', 'organizar a tela', 'ocultar variações', 'minimapa', 'alinhar à grade', 'modo trackpad', 'modo mouse', 'opções de zoom'],
  icons: 'UNOBSERVED',
  dimensions: 'UNOBSERVED',
  contracts: 'UNOBSERVED',
  nodeAccessibilityTree: 'UNOBSERVED',
  externalCalls: false,
});
route('GET', /^\/api\/canvas\/toolbar$/, (q, r) => send(r, 200, { ok: true, ...CANVAS_TOOLBAR_OBSERVED }));

// Conta: CLI, wishlist e atendimento (linha 22): três destinos citados nas páginas de conta que nunca foram
// abertos numa captura. A rota existe para a tela dizer isso junto, em vez de cada item mentir sozinho.
const ACCOUNT_UNOBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 22 (account_pages)',
  items: [
    { id: 'cli', label: 'CLI', status: 'UNOBSERVED', note: 'destino de CLI não capturado' },
    { id: 'wishlist', label: 'Feature wishlist', status: 'UNOBSERVED', note: 'lista de desejos não capturada' },
    { id: 'support', label: 'Customer service', status: 'UNOBSERVED', note: 'atendimento não capturado' },
  ],
  openedDestinations: 0,
  externalCalls: false,
});
route('GET', /^\/api\/account\/unobserved$/, (q, r) => send(r, 200, { ok: true, ...ACCOUNT_UNOBSERVED }));
// Painéis da barra de título (linha 31 do inventário; evidência estática: scripts/auth_bundles —
// módulos async__title-bar-agent-connect e title-bar-export-task). Os metadados de composição abaixo
// foram observados; conteúdo, condição de render e ações dos painéis seguem UNOBSERVED.
const TITLEBAR_PANELS = Object.freeze({
  source: 'scripts/auth_bundles (async__title-bar-agent-connect, title-bar-export-task); PIPPIT_API_CATALOG.md',
  panels: [
    { id: 'agent-connect', component: 'TitleBarAgentConnect', position: 'right', order: 101, type: 'Custom', renderCondition: 'UNOBSERVED', content: 'UNOBSERVED', actions: 'UNOBSERVED' },
    { id: 'export-task', component: 'TitleBarExportTask', position: 'UNOBSERVED', order: 4, type: 'UNOBSERVED', renderCondition: 'UNOBSERVED', content: 'UNOBSERVED', actions: 'UNOBSERVED' },
  ],
  externalCalls: false,
  note: 'Só a arquitetura estática foi observada; nada do comportamento em execução foi presumido.',
});
route('GET', /^\/api\/titlebar\/panels$/, (q, r) => send(r, 200, { ok: true, ...TITLEBAR_PANELS }));
// FAQ da página de preços (linha 78): as seis perguntas foram preservadas; as RESPOSTAS não. As seções
// de recursos têm títulos observados (notes/pages/02_pricing.json) e conteúdo não preservado. As avaliações
// têm carrossel observado (5 revisões, Previous/Next/Show review 1–5) e textos não preservados.
const PRICING_FAQ_OBSERVED = Object.freeze({
  source: 'FEATURE_INVENTORY.md linha 78 (REA ev_58c189b5…74a9; notes/pages/02_pricing.json; test/pricing_faq_ui.test.mjs, pricing_reviews_ui.test.mjs)',
  questions: [
    'Há testes gratuitos disponíveis?',
    'Qual é a diferença entre assinatura e créditos?',
    'Quais são as diferenças entre a assinatura anual e a mensal?',
    'Quais métodos de pagamento são aceitos?',
    'Como usar os créditos do Pippit?',
    'E se eu ficar sem créditos antes do final do mês?',
  ],
  answersPreserved: false,
  answers: 'UNOBSERVED',
  ratings: 'UNOBSERVED',
  ratingsNavigation: { reviews: 5, controls: ['Previous review', 'Next review', 'Show review 1', 'Show review 2', 'Show review 3', 'Show review 4', 'Show review 5'], texts: 'UNOBSERVED' },
  featureSections: ['Detalhes do plano', 'Créditos', 'Por que escolher o Pippit', 'Perguntas frequentes', 'Crie com asas Criação de conteúdo turbinada', 'O Agente de IA definitivo que facilita o marketing eficaz.'],
  featureSectionsContent: 'UNOBSERVED',
  planComparison: 'local',
  externalCalls: false,
});
route('GET', /^\/api\/pricing\/faq$/, (q, r) => send(r, 200, { ok: true, ...PRICING_FAQ_OBSERVED }));
// Omni / humano digital (linha 92): só os nomes de endpoint aparecem nos bundles. Sem corpos, sem tela, sem
// execução observada — a rota lista os nomes com tudo o mais marcado UNOBSERVED.
const OMNI_CAPABILITIES = Object.freeze({
  source: 'PIPPIT_API_CATALOG.md + FEATURE_INVENTORY.md linha 92',
  endpoints: ['get_tone_list', 'get_hot_audio_list', 'text_to_speech', 'audio_to_text', 'image_object_detect', 'get_img_category_list', 'preprocess_submit_request', 'before_create_limit_check', 'try_task', 'retry_task', 'batch_delete_digital'],
  bodies: 'UNOBSERVED',
  screen: 'UNOBSERVED',
  execution: 'UNOBSERVED',
  createsRealAvatar: false,
  externalCalls: false,
});
route('GET', /^\/api\/capabilities\/omni$/, (q, r) => send(r, 200, { ok: true, ...OMNI_CAPABILITIES }));





route('GET', /^\/api\/editor-export-options$/, async (q, r) => send(r, 200, { ...media.EXPORT_OPTIONS, note: 'Opções observadas no diálogo Export settings; "Free for now" para Sem marca d\'água, 1080p, 2k e 4k.' }));
// Corte rapido por SILENCIO (real, sem IA): remove trechos silenciosos de cada clipe com audio e substitui o clipe pelos trechos com som.
route('POST', /^\/api\/editor\/(\d+)\/silence-cut$/, async (q, r, m) => {
  const p = project(m[1]); const tl = p.timeline; if (!tl?.clips?.length) return fail(r, 400, 'timeline vazia'); if (!media.available()) return fail(r, 501, 'ffmpeg indisponível'); const b = await readJson(q);
  const noiseDb = Number.isFinite(Number(b.noiseDb)) ? Math.max(-80, Math.min(-10, Number(b.noiseDb))) : -30, minSilence = Math.max(0.1, Math.min(5, Number(b.minSilence) || 0.5)), pad = Math.max(0, Math.min(0.5, b.pad === undefined ? 0.1 : Number(b.pad)));
  const out = []; let removed = 0, analysed = 0;
  for (const c of tl.clips) {
    const file = assetPath(c.assetId); const info = media.probe(file); const t0 = c.in || 0, t1 = c.out || info.duration;
    if (!info.hasAudio || c.mute) { out.push(c); continue; } analysed++;
    const ranges = media.speechRanges(media.detectSilences(file, { noiseDb, minSilence }), t0, t1, { pad });
    if (!ranges.length) { out.push(c); continue; } // so silencio: mantem o clipe (nao esvazia a timeline)
    removed += (t1 - t0) - ranges.reduce((n, [x, y]) => n + (y - x), 0); for (const [x, y] of ranges) out.push({ ...c, in: x, out: y });
  }
  tl.clips = out; touch(p); send(r, 200, { ok: true, clips: out.length, analysedClips: analysed, removedSeconds: Math.round(removed * 100) / 100, timeline: tl });
});
// Transcrição por trechos: extrai áudio 16 kHz mono com ffmpeg (até 25 s por trecho) e transcreve pela pilha
// gratuita (Cloudflare @cf/openai/whisper). Chaves só do ambiente; nada é baixado do provedor além do texto.
const transcriptionPlan = () => planFreeRoutes('transcription', freeRouterConfig(), { quotaUsage: freeRouterUsage() });
function transcriptionCredentialGap(route) {
  if (!route) return 'nenhum modelo de transcrição configurado';
  const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === route.providerId);
  if (route.secretEnv && !routerCredentials()[route.secretEnv]) return `${route.secretEnv} ausente`;
  if (policy?.accountEnv && !process.env[policy.accountEnv]) return `${policy.accountEnv} ausente`;
  return null;
}
// Transcreve um arquivo de mídia (vídeo ou áudio) em trechos. Devolve texto, palavras com tempo absoluto e o SRT por trecho.
async function transcribeMediaFile(file, { language = 'auto', chunkMs = MAX_CHUNK_MS } = {}) {
  const plan = transcriptionPlan();
  if (!plan.ok) return { ok: false, status: 501, reason: `Transcrição indisponível: ${plan.reason}`, blocked: true, pending: true };
  const route = plan.routes[0];
  const gap = transcriptionCredentialGap(route);
  if (gap) return { ok: false, status: 501, reason: `Transcrição indisponível: ${gap}. Defina ${route.secretEnv || 'a credencial'} no ambiente (nada é gravado em arquivo) e aplique a pilha gratuita.`, blocked: true, needs: route.secretEnv || null };
  const info = media.probe(file);
  const totalMs = Math.round((Number(info.duration) || 0) * 1000);
  const chunks = planChunks(totalMs, chunkMs);
  if (!chunks.length) return { ok: false, status: 400, reason: 'o arquivo não tem duração de áudio para transcrever' };
  const adapter = createFreeRouterAdapters()[route.adapter];
  // Timeout por trecho: a rota traz o limite do provedor (>= 15 s na Cloudflare); sem isso um servidor mudo trava a rota.
  const budgetMs = Math.max(1_000, Number(route.timeoutMs) || 60_000);
  const results = [];
  const words = [];
  let text = '';
  for (const [i, chunk] of chunks.entries()) {
    const wav = S.pubFile(`_tr_${Date.now()}_${i}_${S.newId()}.wav`);
    try {
      try { media.extractChunk(file, wav, chunk); } catch (error) { return { ok: false, status: 502, reason: `falha ao extrair o áudio (${String(error.message || error).slice(0, 160)})` }; }
      const bytes = fs.readFileSync(wav);
      let out; const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(Object.assign(new Error(`transcrição excedeu ${Math.round(budgetMs / 1000)} s por trecho`), { name: 'TimeoutError', timeout: true, timeoutMs: budgetMs })), budgetMs);
      try {
        out = await adapter.execute({ ...route, task: 'transcription' }, { audio: bytes, language }, {
          apiKey: routerKeyFor(route), signal: controller.signal,
          credentials: { CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID },
        });
      } catch (error) {
        const failure = controller.signal.aborted ? Object.assign(new Error(`transcrição excedeu ${Math.round(budgetMs / 1000)} s por trecho`), { name: 'TimeoutError', timeout: true, timeoutMs: budgetMs }) : error;
        noteRouterFailure(route, failure);
        const verdict = classifyFreeRouterError(failure);
        return { ok: false, status: verdict.kind === 'quota' ? 429 : failure?.status === 401 ? 401 : verdict.kind === 'timeout' ? 504 : 502, reason: `transcrição falhou no trecho ${i + 1}/${chunks.length}: ${verdict.reason}`, kind: verdict.kind };
      } finally { clearTimeout(timer); }
      const part = normalizeTranscription(out);
      const offset = chunk.startMs / 1000;
      if (!part.text) return { ok: false, status: 502, reason: `o provedor não retornou texto no trecho ${i + 1}/${chunks.length}` };
      text += (text ? ' ' : '') + part.text;
      const offsetted = offsetWords(part.words, offset);
      words.push(...offsetted);
      results.push({ index: i, start: offset, end: chunk.endMs / 1000, text: part.text, words: offsetted.length, durationMs: chunk.endMs - chunk.startMs });
    } finally { try { fs.unlinkSync(wav); } catch {} }
  }
  const cues = words.length
    ? cuesFromWords(words)
    : results.flatMap((r) => cuesFromText(r.text, { startSeconds: r.start, durationSeconds: r.end - r.start }));
  return {
    ok: true, route: { providerId: route.providerId, providerName: route.providerName, modelId: route.modelId, locality: route.locality },
    text: text.trim(), words, cues, srt: toSrt(cues), chunks: results, totalMs,
    note: `Transcrição em ${results.length} trecho(s) de até ${Math.round(chunkMs / 1000)} s (escolha local: o limite real por requisição não foi observado). Tempos por palavra só quando o provedor devolve result.words.`,
  };
}
// Legendas automáticas: caminho local (whisper.cpp do ffmpeg + modelo ggml do usuário) quando disponível;
// senão a MESMA tarefa vai para a pilha gratuita (Cloudflare @cf/openai/whisper, áudio em trechos de 25 s).
// Sem modelo local e sem credencial: 501 com o motivo e o nome da variável — nada é baixado nem simulado.
route('POST', /^\/api\/editor\/(\d+)\/captions-auto$/, async (q, r, m) => {
  const p = project(m[1]); const tl = p.timeline; if (!tl?.clips?.length) return fail(r, 400, 'timeline vazia');
  if (!media.available()) return fail(r, 501, 'ffmpeg indisponível: sem ele não há como extrair o áudio.', { blocked: true });
  const b = await readJson(q); const language = /^[a-z]{2,3}$|^auto$/.test(b.language || '') ? b.language : 'auto';
  const model = db().settings.whisperModel; const localReady = media.whisperAvailable() && !!model && fs.existsSync(model);
  const backend = localReady ? 'local' : 'router';
  if (backend === 'router') {
    const plan = transcriptionPlan();
    if (!plan.ok) return fail(r, 501, `Legendas automáticas: ${plan.reason} Informe um modelo Whisper local (filtro whisper do ffmpeg, ex.: ggml-base.bin) em Configurações > Assistente de IA ou aplique a pilha gratuita (Cloudflare @cf/openai/whisper, com CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).`, { blocked: true, pending: true });
    const gap = transcriptionCredentialGap(plan.routes[0]);
    if (gap) return fail(r, 501, `Legendas automáticas exigem transcrição: ${gap}. Defina ${plan.routes[0].secretEnv || 'a credencial'} no ambiente e aplique a pilha gratuita (nada é gravado em arquivo); ou informe um modelo Whisper local em Configurações > Assistente de IA.`, { blocked: true, needs: plan.routes[0].secretEnv || null, localModelAvailable: media.whisperAvailable() });
  }
  const caps = []; const parts = []; let offset = 0; let chunks = 0; let routeInfo = null;
  for (const c of tl.clips) {
    const file = assetPath(c.assetId); const info = media.probe(file); const t0 = c.in || 0; const t1 = c.out || info.duration; const sp = c.speed || 1;
    if (info.hasAudio && !c.mute) {
      let cues = [];
      if (backend === 'local') {
        const srt = S.pubFile(`_cap_${Date.now()}.srt`);
        try { media.transcribeSrt(file, srt, { model, language }); cues = media.parseSrt(fs.readFileSync(srt, 'utf8')).map((x) => ({ start: x.start, end: x.end, text: x.text })); }
        finally { try { fs.unlinkSync(srt); } catch {} }
      } else {
        const out = await transcribeMediaFile(file, { language });
        if (!out.ok) return fail(r, out.status || 502, out.reason, { blocked: out.blocked === true, kind: out.kind, stage: 'transcription' });
        routeInfo = out.route; chunks += out.chunks.length; parts.push(out.srt); cues = out.cues;
      }
      for (const x of cues) { if (x.end <= t0 || x.start >= t1) continue; caps.push({ text: x.text, start: Math.round((offset + (Math.max(x.start, t0) - t0) / sp) * 100) / 100, end: Math.round((offset + (Math.min(x.end, t1) - t0) / sp) * 100) / 100 }); }
    }
    offset += (t1 - t0) / sp;
  }
  if (!caps.length) return fail(r, 422, backend === 'local' ? 'A transcrição local não encontrou fala nos clipes.' : 'A transcrição não encontrou fala nos clipes (o provedor devolveu texto vazio).', { stage: 'transcription' });
  tl.captions = [...(tl.captions || []), ...caps]; touch(p);
  let srtAsset = null; const srtText = parts.length ? parts.join('\n') : toSrt(caps);
  try { const f = S.pubFile(`_caps_${Date.now()}.srt`); fs.writeFileSync(f, srtText); srtAsset = addAsset(`Legendas automáticas (${backend === 'local' ? 'whisper local' : routeInfo?.providerName || 'roteador'}).srt`, f, 'file', 'works'); try { fs.unlinkSync(f); } catch {} } catch {}
  send(r, 200, { ok: true, captions: caps.length, backend, chunks, provider: routeInfo, srtAssetId: srtAsset?.id || null, srt: srtText.slice(0, 20000), timeline: tl,
    note: `Legendas ${backend === 'local' ? 'pelo whisper.cpp local (modelo do usuário)' : 'pela pilha gratuita (Cloudflare whisper)'} — áudio em trechos de até 25 s (escolha local; o limite real por requisição não foi observado). SRT salvo em Ativos.` });
});
// Corte por transcrição (quick cut por texto): transcreve cada clipe e mantém só as falas, removendo pausas
// maiores que o limiar. Exige tempos por palavra (result.words); sem eles a resposta explica em vez de adivinhar.
route('POST', /^\/api\/editor\/(\d+)\/quick-cut$/, async (q, r, m) => {
  const p = project(m[1]); const tl = p.timeline; if (!tl?.clips?.length) return fail(r, 400, 'timeline vazia');
  if (!media.available()) return fail(r, 501, 'ffmpeg indisponível: sem ele não há como extrair o áudio.', { blocked: true });
  const plan = transcriptionPlan();
  if (!plan.ok) return fail(r, 501, `Corte por transcrição: ${plan.reason} Use o filtro whisper local (modelo Whisper em Configurações > Assistente de IA) ou aplique a pilha gratuita; sem provedor, "Remover silêncios" continua funcionando.`, { blocked: true, pending: true });
  const gap = transcriptionCredentialGap(plan.routes[0]);
  if (gap) return fail(r, 501, `Corte por transcrição exige transcrição: ${gap}. Defina ${plan.routes[0].secretEnv || 'a credencial'} no ambiente e aplique a pilha gratuita. Use \"Remover silêncios\" se preferir sem provedor.`, { blocked: true, needs: plan.routes[0].secretEnv || null });
  const b = await readJson(q); const minGapMs = Math.max(100, Math.min(5000, Number(b.minGapMs) || 600)); const padMs = Math.max(0, Math.min(1000, b.padMs === undefined ? 120 : Number(b.padMs)));
  const out = []; let removed = 0, analysed = 0, words = 0, chunks = 0, routeInfo = null, text = '';
  for (const c of tl.clips) {
    const file = assetPath(c.assetId); const info = media.probe(file); const t0 = c.in || 0; const t1 = c.out || info.duration; const sp = c.speed || 1;
    if (!info.hasAudio || c.mute) { out.push(c); continue; } analysed++;
    const res = await transcribeMediaFile(file);
    if (!res.ok) return fail(r, res.status || 502, res.reason, { blocked: res.blocked === true, kind: res.kind, stage: 'transcription' });
    routeInfo = res.route; chunks += res.chunks.length; text += (text ? ' ' : '') + res.text;
    const inWindow = (res.words || []).filter((w) => w.end > t0 && w.start < t1);
    words += inWindow.length;
    if (!inWindow.length) { out.push(c); continue; }
    const ranges = keepRangesFromWords(inWindow, { totalSeconds: t1, padMs, minGapMs });
    if (!ranges.length) { out.push(c); continue; }
    const segs = clipSegments(c, ranges, { speed: sp });
    removed += (t1 - t0) - ranges.reduce((n, [x, y]) => n + (y - x), 0);
    out.push(...segs);
  }
  if (!words) return fail(r, 422, 'A transcrição não devolveu tempos por palavra: sem eles o corte por texto cortaria no lugar errado. Use \"Remover silêncios\" ou gere as legendas automáticas.', { stage: 'transcription', provider: routeInfo });
  tl.clips = out; touch(p);
  send(r, 200, { ok: true, clips: out.length, analysedClips: analysed, words, chunks, provider: routeInfo, removedSeconds: Math.round(removed * 100) / 100, text: text.slice(0, 4000), minGapMs, padMs, timeline: tl,
    note: 'Regra local: mantém as falas com folga e remove pausas maiores que o limiar. O comportamento exato do corte por texto do Pippit não foi observado.' });
});
// redes sociais: OAuth externo nao reproduzivel localmente; estados e limites sim
// favoritos do drawer Avatar video: o ícone de favorito aparece ao passar o mouse sobre o tile (observado); a aba Favorites vazia mostra "No favorite avatar yet" (observado). A persistência/ação em si NÃO foi observada (favoritar altera a conta): comportamento local inferido.
const favs = () => (db().avatars.favorites ||= []);
route('GET', /^\/api\/avatar-favorites$/, async (q, r) => send(r, 200, { ok: true, favorites: favs() }));
route('POST', /^\/api\/avatar-favorites$/, async (q, r) => { const b = await readJson(q); const n = String(b.name || '').trim().slice(0, 120); if (!n) return fail(r, 400, 'nome do avatar ausente'); const i = favs().indexOf(n); if (b.on === false) { if (i >= 0) favs().splice(i, 1); } else if (i < 0) { if (favs().length >= 500) return fail(r, 409, 'limite de favoritos'); favs().unshift(n); } S.save(); send(r, 200, { ok: true, favorites: favs() }); });
route('GET', /^\/api\/avatar-drawer$/, async (q, r) => { const d = JSON.parse(fs.readFileSync(new URL('./lib/avatar_drawer_data.json', import.meta.url), 'utf8')); try { d.catalogo = JSON.parse(fs.readFileSync(new URL('./lib/avatar_catalog.json', import.meta.url), 'utf8')); } catch { d.catalogo = null; } send(r, 200, d); });
route('GET', /^\/api\/social$/, async (q, r) => send(r, 200, { limit: db().social.limit, accounts: db().social.accounts, platforms: ['TikTok', 'YouTube', 'Facebook (Página)', 'Instagram (Reels)', 'TikTok Shop (criador)', 'TikTok Shop (vendedor)', 'Shopify', 'Google Drive', 'Dropbox'], note: 'Vincular exige OAuth real de cada rede (app registrado e revisado); não implementado.' }));
route('POST', /^\/api\/social\/connect$/, async (q, r) => { const b = await readJson(q); const plat = String(b.platform || '').toLowerCase(); const ad = PUB.PUBLISH_ADAPTERS[plat] || null;
  fail(r, 501, 'Vincular conta exige OAuth da rede social com aplicativo registrado; bloqueado nesta instalação local.', { blocked: true, platform: b.platform || null, adapter: ad ? { id: ad.id, oauth: ad.oauth, env: ad.env, missing: ad.missing } : null, status: 'nao_conectado' }); });
route('POST', /^\/api\/social\/publish$/, async (q, r) => { const b = await readJson(q); const ids = (Array.isArray(b.platforms) ? b.platforms : Object.keys(b.platforms || {})).map(Number);
  fail(r, 409, 'Nenhuma conta vinculada: publicação indisponível.', { blocked: true, adapters: (ids.length ? ids : Object.keys(PUB.PUBLISH_ADAPTERS).flatMap((k) => PUB.PUBLISH_ADAPTERS[k].codes)).map((c) => PUB.adapterForPlatform(c)?.id).filter(Boolean), missing: Object.values(PUB.PUBLISH_ADAPTERS).map((a) => ({ id: a.id, missing: a.missing })) }); });
// Publicação: estrutura preservada (src/publishing.mjs). Rascunhos LOCAIS; nenhuma rota chama rede social, faz OAuth ou publica.
const drafts = () => (db().social.drafts ||= []);
route('GET', /^\/api\/social\/structure$/, async (q, r) => send(r, 200, { ok: true, ...PUB.publishingSummary() }));
route('GET', /^\/api\/social\/drafts$/, async (q, r) => send(r, 200, { ok: true, drafts: drafts() }));
route('POST', /^\/api\/social\/drafts$/, async (q, r) => {
  const b = await readJson(q); const n = PUB.normalizeDraft(b, { assets: db().assets }); if (n.error) return fail(r, 400, n.error);
  if (drafts().length >= PUB.LIMITS.drafts) return fail(r, 409, `limite de ${PUB.LIMITS.drafts} rascunhos`);
  const d = { id: S.newId(), ...n.draft, createdAt: new Date().toISOString() }; drafts().unshift(d); S.save(); send(r, 200, { ok: true, draft: d, note: 'Rascunho local: nada foi enviado nem agendado em rede social.' });
});
route('DELETE', /^\/api\/social\/drafts\/(\d+)$/, async (q, r, m) => { const i = drafts().findIndex((x) => x.id === m[1]); if (i < 0) return fail(r, 404, 'rascunho inexistente'); drafts().splice(i, 1); S.save(); send(r, 200, { ok: true }); });
// Fila de publicação (estrutura): estados rascunho/agendado/publicando/publicado/falhou, adaptadores só contrato.
const queue = () => (db().social.queue ||= []);
route('GET', /^\/api\/social\/adapters$/, async (q, r) => send(r, 200, {
  ok: true, adapters: PUB.publishAdaptersSummary(), states: PUB.PUBLISH_STATES, labels: PUB.STATE_LABELS, connections: {},
  note: 'Nenhum adaptador conectado: todas as chamadas de OAuth e publicação estão desligadas. Vincular exige aplicativo registrado, revisão e credencial do usuário.',
}));
route('GET', /^\/api\/social\/queue$/, async (q, r) => send(r, 200, { ok: true, tasks: queue(), ...PUB.queueSummary(queue()) }));
route('POST', /^\/api\/social\/queue$/, async (q, r) => {
  const b = await readJson(q); const d = db();
  const source = b.draftId ? drafts().find((x) => x.id === String(b.draftId)) : b;
  if (!source) return fail(r, 404, 'rascunho inexistente');
  const n = PUB.normalizeDraft({ assetId: source.assetId, caption: source.caption, platforms: source.platforms, scheduledAt: source.scheduledAt, hashtags: source.hashtags }, { assets: d.assets });
  if (n.error) return fail(r, 400, n.error);
  const task = PUB.createTask(n.draft); queue().unshift(task); S.save();
  send(r, 200, { ok: true, task, note: task.state === 'agendado' ? 'Agendado na fila LOCAL: nada será enviado até existir conta vinculada.' : 'Na fila local como rascunho: nada é enviado.' });
});
route('POST', /^\/api\/social\/queue\/([\w]+)\/attempt$/, async (q, r, m) => {
  const task = queue().find((x) => x.id === m[1]); if (!task) return fail(r, 404, 'tarefa inexistente');
  const res = PUB.attemptPublish(task, { connections: db().social.connections || {} }); // sem conta vinculada: bloqueia, nunca simula envio
  Object.assign(task, res.task); S.save();
  if (!res.ok) return fail(r, res.status || 409, res.reason, { blocked: true, task });
  send(r, 200, { ok: true, task });
});
route('POST', /^\/api\/social\/queue\/([\w]+)\/cancel$/, async (q, r, m) => {
  const task = queue().find((x) => x.id === m[1]); if (!task) return fail(r, 404, 'tarefa inexistente');
  const t2 = PUB.transition(task, 'rascunho', { reason: null }); if (t2.error) return fail(r, 409, t2.error);
  Object.assign(task, t2.task); S.save(); send(r, 200, { ok: true, task });
});
route('DELETE', /^\/api\/social\/queue\/([\w]+)$/, async (q, r, m) => { const i = queue().findIndex((x) => x.id === m[1]); if (i < 0) return fail(r, 404, 'tarefa inexistente'); queue().splice(i, 1); S.save(); send(r, 200, { ok: true }); });
// formatos observados do Pippit (somente leitura; contas sempre vazias)
route('POST', /^\/api\/biz\/v1\/publish\/list_schedule_task$/, async (q, r) => send(r, 200, PUB.listScheduleTask(drafts(), await readJson(q))));
route('POST', /^\/api\/account\/v1\/get_bind_account_list$/, async (q, r) => send(r, 200, PUB.bindAccountList(db().social.accounts, await readJson(q))));
// Foto falante de IA (/ai-talking-photo): etapa 1 observada (JPG/PNG, >256x256); render LOCAL = foto estática + voz do Windows (SAPI), rotulado como prévia SEM animação labial e SEM IA (nunca débito).
route('POST', /^\/api\/talking-photo\/photo$/, async (q, r) => {
  const buf = await readBody(q); const name = decodeURIComponent(q.headers['x-file-name'] || 'foto'); const ext = path.extname(name).toLowerCase(); if (!['.jpg', '.jpeg', '.png'].includes(ext)) return fail(r, 400, 'Formato inválido: use JPG ou PNG.');
  if (!buf.length) return fail(r, 400, 'Arquivo vazio.'); const tmp = S.pubFile('_tp_' + S.newId() + ext); fs.writeFileSync(tmp, buf);
  try { const info = media.available() ? media.probe(tmp) : {}; if (info.width && info.height && (info.width <= 256 || info.height <= 256)) { fs.unlinkSync(tmp); return fail(r, 400, 'A imagem deve ser maior que 256×256.'); } const a = addAsset(name, tmp, 'image', 'upload'); try { fs.unlinkSync(tmp); } catch {} send(r, 200, { ok: true, asset: a }); } catch (e) { try { fs.unlinkSync(tmp); } catch {} fail(r, 400, 'Não foi possível ler a imagem.'); }
});
// Etapa 2 (aba "Upload Audio Clip"): regras da pagina Omni — audio mp3/wma/flac ou video mp4/avi/mov/wmv/mkv (audio extraido), < 30 s (contrato em lib/talking_photo_contract.mjs)
route('POST', /^\/api\/talking-photo\/audio$/, async (q, r) => {
  const buf = await readBody(q); const name = decodeURIComponent(q.headers['x-file-name'] || 'audio'); const ext = path.extname(name).toLowerCase();
  if (![...TP.AUDIO_EXT, ...TP.VIDEO_EXT].includes(ext)) return fail(r, 400, 'Formato inválido: use áudio (mp3/wma/flac) ou vídeo (mp4/avi/mov/wmv/mkv).');
  if (!buf.length) return fail(r, 400, 'Arquivo vazio.'); if (!media.available()) return fail(r, 503, 'Exige ffmpeg para ler o áudio.', { blocked: true });
  const tmp = S.pubFile('_tpa_' + S.newId() + ext); fs.writeFileSync(tmp, buf); let mp3;
  try {
    const isVideo = TP.VIDEO_EXT.includes(ext); let src = tmp; if (isVideo) { mp3 = S.pubFile('_tpa_' + S.newId() + '.mp3'); media.extractAudio(tmp, mp3); src = mp3; }
    const duration = media.probe(src).duration; const chk = TP.checkAudioUpload({ name, durationSeconds: duration }); if (!chk.ok) return fail(r, 400, 'Envie um clipe de áudio com menos de 30 s.');
    const a = addAsset(isVideo ? name.replace(/\.[^.]+$/, '') + '.mp3' : name, src, 'audio', 'upload'); send(r, 200, { ok: true, asset: a, duration, isFromVideo: isVideo });
  } catch (e) { fail(r, 400, 'Não foi possível ler o áudio.'); } finally { for (const f of [tmp, mp3]) try { if (f) fs.unlinkSync(f); } catch {} }
});
route('POST', /^\/api\/talking-photo\/render$/, async (q, r) => {
  const b = await readJson(q); const a = db().assets.find((x) => x.id === String(b.assetId)); if (!a || a.kind !== 'image') return fail(r, 400, 'Envie uma foto primeiro.');
  const up = b.audioAssetId ? db().assets.find((x) => x.id === String(b.audioAssetId) && x.kind === 'audio') : null; if (b.audioAssetId && !up) return fail(r, 400, 'Envie o clipe de áudio novamente.');
  const text = String(b.text || '').trim(); if (!up && !text) return fail(r, 400, 'Escreva o roteiro da locução.'); if (text.length > 2000) return fail(r, 400, 'O roteiro excede 2000 caracteres.');
  const gesture = String(b.gesture || '').slice(0, 500);
  const cloud = cloudVoiceProvider();
  const engine = resolveVoiceEngine({ requested: b.voiceSource || b.engine || 'auto', sapiAvailable: media.ttsAvailable(), cloudConfigured: !!cloud });
  if (!media.available() || (!up && !engine)) return fail(r, 503, 'A prévia local exige ffmpeg' + (up ? '.' : ' e uma voz (SAPI padrão ou provedor do usuário); indisponíveis nesta máquina.'), { blocked: true });
  try {
    let audio, wav, voiceEngine = up ? 'upload' : engine;
    if (up) audio = up;
    else if (engine === 'cloud') {
      const o = await PV.adapterFor('audio', cloud.adapter).synth(cloud, { text, voice: b.voice, fetchImpl: fetch });
      const ext = o.ext || 'mp3'; const cf = S.pubFile(`_tpc_${S.newId()}.${ext}`); fs.writeFileSync(cf, Buffer.from(o.bytes)); audio = addAsset(`locucao.${ext}`, cf, 'audio', 'works'); try { fs.unlinkSync(cf); } catch {}
    } else { wav = S.pubFile(`_tp_${S.newId()}.wav`); media.ttsLocal(text, wav, { voice: b.voice }); audio = addAsset('locucao.wav', wav, 'audio', 'works'); }
    const mp4 = S.pubFile(`_tp_${S.newId()}.mp4`); media.stillWithAudio(S.pubFile(a.stored), S.pubFile(audio.stored), mp4); const video = addAsset('Foto falante (prévia local sem animação labial).mp4', mp4, 'video', 'works'); for (const f of [wav, mp4]) try { if (f) fs.unlinkSync(f); } catch {}
    const dur = media.probe(S.pubFile(audio.stored)).duration; const tab = up ? 'voiceover' : 'tts';
    // `wire`: parâmetros de exportação que o Pippit montaria (contrato Omni); IDs são locais e NADA é enviado ao Pippit
    const wire = TP.exportParams({ audio: TP.audioExportParams({ tab, material: { vid: audio.id, uri: undefined, duration: dur }, ttsEndTimeSeconds: dur }), image: { uri: a.id }, gesturePrompt: gesture, tab, script: text || undefined });
    send(r, 200, { ok: true, video, audio, voiceEngine, creditsCharged: 0, wire, gestureApplied: false, label: 'Prévia local: foto estática com ' + (up ? 'o áudio enviado' : (engine === 'cloud' ? `a voz do provedor do usuário (${cloud.adapter})` : 'a voz do Windows (SAPI, padrão)')) + '. NÃO há animação labial nem IA' + (gesture ? '; o gesto/movimento descrito não é aplicado.' : '.') });
  } catch (e) { fail(r, 500, String(e.message || e).slice(0, 300)); }
});
// Foto falante -> clipe de IA pelo roteador gratuito (NovAI cogvideox-flash, 5 s). A foto e o áudio NÃO são enviados:
// a API documentada aceita somente prompt (texto), então o resultado é um clipe genérico e SEM sincronia labial.
// A prévia local (foto estática + voz) continua sendo o padrão desta página.
route('POST', /^\/api\/talking-photo\/ai-video$/, async (q, r) => {
  const b = await readJson(q);
  const a = db().assets.find((x) => x.id === String(b.assetId || '')); if (!a || a.kind !== 'image') return fail(r, 400, 'Envie uma foto primeiro.');
  const text = String(b.text || b.prompt || '').trim().slice(0, 900);
  if (text.length < 15) return fail(r, 400, 'Descreva a cena do clipe com pelo menos 15 caracteres.');
  const plan = videoPlan();
  if (!plan.ok) return fail(r, 501, `Clipe de IA indisponível: ${plan.reason}`, { blocked: true, pending: true });
  const run = {
    id: S.newId(), task: 'video_generation', state: 'queued', prompt: text, seconds: NOVAI_VIDEO_DURATION,
    projectId: null, chatId: null, sourceNodeId: null,
    source: { type: 'talkingphoto', imageAssetId: a.id, sendsImage: false, sendsAudio: false },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), events: [],
  };
  localRuns().unshift(run); publishLocalRun(run, 'queued'); S.save(); startLocalRun(run);
  send(r, 202, { ok: true, queued: true, run: runPublic(run), label: 'Clipe de IA (NovAI cogvideox-flash, 5 s) na fila. A foto e o áudio NÃO são enviados: a API aceita só prompt, então NÃO há sincronia labial.' });
});

// ---- roteador gratuito: metadados podem persistir; segredos só vivem em memória ou no ambiente deste processo.
const freeRouterSecrets = new Map();
const routerDay = () => new Date().toISOString().slice(0, 10);
// Credenciais vivem só aqui: token/chave do segredo (ambiente ou memória) e a CONTA da Cloudflare apenas do ambiente.
function routerCredentials() {
  const credentials = {};
  for (const policy of FREE_PROVIDER_CATALOG) {
    if (policy.secretEnv) credentials[policy.secretEnv] = process.env[policy.secretEnv] || freeRouterSecrets.get(policy.id) || undefined;
    if (policy.optionalSecretEnv) credentials[policy.optionalSecretEnv] = process.env[policy.optionalSecretEnv] || undefined;
    if (policy.accountEnv) credentials[policy.accountEnv] = process.env[policy.accountEnv] || undefined;
  }
  return credentials;
}
// A página/relatório só vê booleanos: nunca o valor do token nem o id da conta.
const routerHasCredential = (policy) => ({
  hasKey: !!(policy?.secretEnv && (process.env[policy.secretEnv] || freeRouterSecrets.get(policy.id))),
  accountEnv: policy?.accountEnv || null,
  hasAccount: !!(policy?.accountEnv && process.env[policy.accountEnv]),
});
function freeRouterConfig() { return db().settings.freeRouter || newFreeRouterConfig(); }
function freeRouterUsage() {
  const raw = db().settings.freeRouterUsage || {};
  const today = routerDay();
  for (const id of Object.keys(raw)) if (raw[id]?.day !== today) delete raw[id];
  db().settings.freeRouterUsage = raw;
  return raw;
}
function freeRouterStatus() {
  const config = publicFreeRouterConfig(freeRouterConfig()); const usage = freeRouterUsage();
  config.providers = config.providers.map((p) => { const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === p.id); const { hasKey, accountEnv, hasAccount } = routerHasCredential(policy); return { ...p, keyRequired: !!policy?.secretEnv, hasKey, accountEnv, hasAccount, usedToday: usage[p.id]?.count || 0, quotaBlocked: usage[p.id]?.blocked === true }; });
  config.availability = availabilitySnapshot();
  return { config, availability: config.availability, tasks: Object.fromEntries(Object.entries(ROUTER_TASKS).map(([id, task]) => [id, task.label])), note: 'Somente Ollama local e modelos/cotas gratuitas explicitamente confirmados são elegíveis. Limites diários são um bloqueio local; limites reais do provedor podem variar. Chaves são efêmeras (memória) ou do ambiente e nunca gravadas em db.json.' };
}
route('GET', new RegExp('^/api/free-router/config$'), async (q, r) => send(r, 200, freeRouterStatus()));
// ---- tela única de provedores (item 3 da rodada 6): estado, pilha por tipo, variáveis esperadas e teste por provedor.
// Nunca devolve chave: apenas `hasKey`/`hasAccount` e os NOMES das variáveis de ambiente.
const PROVIDER_TASK_LABELS = { text: 'texto', image_generation: 'imagem', audio_generation: 'voz', video_generation: 'vídeo', transcription: 'transcrição', audio_understanding: 'entender áudio', vision: 'visão' };
const PROVIDER_STATE_LABELS = { ready: 'configurado', 'missing-key': 'ausente', unavailable: 'indisponível', disabled: 'desligado', 'not-configured': 'fora da pilha' };
function providerPanel() {
  const config = freeRouterConfig(); const usage = freeRouterUsage(); const now = Date.now();
  const tasksByProvider = {};
  for (const task of Object.keys(ROUTER_TASKS)) {
    const plan = planFreeRoutes(task, config, { quotaUsage: usage });
    for (const route of plan.routes || []) (tasksByProvider[route.providerId] ||= []).push({ task, label: PROVIDER_TASK_LABELS[task] || task, model: route.modelId, timeoutMs: route.timeoutMs || null });
  }
  const stacks = Object.fromEntries(Object.keys(ROUTER_TASKS).map((task) => {
    const plan = planFreeRoutes(task, config, { quotaUsage: usage });
    return [task, { label: PROVIDER_TASK_LABELS[task] || task, ok: plan.ok, reason: plan.ok ? null : plan.reason, order: (plan.routes || []).map((x) => `${x.providerId}/${x.modelId}`) }];
  }));
  const providers = FREE_PROVIDER_CATALOG.map((policy) => {
    const entry = (config.providers || []).find((x) => x.id === policy.id) || null;
    const { hasKey, accountEnv, hasAccount } = routerHasCredential(policy);
    const envNames = { key: policy.secretEnv || null, optionalKey: policy.optionalSecretEnv || null, account: policy.accountEnv || null, base: FREE_PROVIDER_DEFAULTS[policy.id]?.env?.base || null, model: FREE_PROVIDER_DEFAULTS[policy.id]?.env?.model || null };
    const unavailability = availabilitySnapshot(now).filter((a) => a.providerId === policy.id).sort((a, b) => b.until - a.until)[0] || null;
    const usedToday = usage[policy.id]?.count || 0;
    const models = (entry?.models || []).map((m) => ({ id: m.id, capabilities: [...(m.capabilities || [])] }));
    const tasks = tasksByProvider[policy.id] || [];
    let state = 'not-configured';
    const localQuota = !!entry && (usage[policy.id]?.blocked === true || (Number(entry.dailyLimit) > 0 && usedToday >= Number(entry.dailyLimit)));
    if (unavailability) state = 'unavailable';
    else if (!tasks.length && localQuota && !(policy.secretEnv && !hasKey)) state = 'unavailable';
    else if (entry && entry.enabled === false) state = 'disabled';
    else if (tasks.length) state = (policy.secretEnv && !hasKey) || (policy.accountEnv && !hasAccount) ? 'missing-key' : 'ready';
    const reason = state === 'unavailable' ? (unavailability ? `${unavailability.kind}: ${unavailability.reason}` : usage[policy.id]?.blocked ? 'cota gratuita esgotada hoje (limite local)' : `limite local de ${entry?.dailyLimit} chamada(s)/dia atingido (${usedToday} usadas)`) : state === 'missing-key'
      ? `falta ${[policy.secretEnv && !hasKey ? policy.secretEnv : null, policy.accountEnv && !hasAccount ? policy.accountEnv : null].filter(Boolean).join(' e ')}`
      : state === 'not-configured' ? (entry ? 'não está na pilha de nenhuma tarefa' : 'não aplicado (use “Aplicar pilha gratuita” ou o JSON abaixo)') : null;
    return {
      id: policy.id, name: policy.name, locality: policy.locality, adapters: [...(policy.adapters || [policy.adapter])],
      keyRequired: !!policy.secretEnv, hasKey, accountEnv, hasAccount, envNames, credentialEnvNames: credentialEnvNames(policy),
      state, stateLabel: PROVIDER_STATE_LABELS[state] || state, reason,
      unavailable: unavailability ? { kind: unavailability.kind, reason: unavailability.reason, until: new Date(unavailability.until).toISOString(), remainingMs: unavailability.remainingMs } : null,
      usedToday, dailyLimit: Number(entry?.dailyLimit) || 0, blockedToday: !!usage[policy.id]?.blocked,
      models, tasks, capabilities: [...new Set((entry?.models || []).flatMap((m) => m.capabilities || []))],
      testable: tasks.filter((x) => x.task !== 'video_generation'), // vídeo só com confirmação explícita
    };
  });
  const icons = { ready: '✅', 'missing-key': '🔑', unavailable: '⛔', disabled: '⏸', 'not-configured': '➖' };
  return {
    ok: true, providers, stacks, states: PROVIDER_STATE_LABELS, icons,
    daily: { videoLimit: NOVAI_VIDEO_DAILY_LIMIT, videoUsedToday: usage.novai?.count || 0 },
    note: 'Somente provedores gratuitos: nada aqui é pago. Nenhuma chave é mostrada ou devolvida — só `hasKey` e os nomes das variáveis. Testar faz UMA chamada curta; o teste de vídeo gasta 1 das ' + NOVAI_VIDEO_DAILY_LIMIT + ' do dia e exige confirmação.',
  };
}
route('GET', new RegExp('^/api/free-router/panel$'), async (q, r) => send(r, 200, providerPanel()));
// Testa UM provedor com UMA chamada curta. Vídeo exige { confirm: true } porque consome 1 das 5 gerações do dia.
const PROVIDER_TEST_PAYLOADS = {
  text: { prompt: 'Responda apenas com a palavra: ok', options: { max_tokens: 12, temperature: 0 } },
  image_generation: { prompt: 'um quadrado azul sobre fundo branco', options: { width: 256, height: 256, steps: 1 } },
  audio_generation: { text: 'ok' },
  video_generation: { prompt: 'um quadrado azul parado', options: { duration: 5 } },
};
route('POST', new RegExp('^/api/free-router/test$'), async (q, r) => {
  const b = await readJson(q); const providerId = String(b.providerId || '');
  const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === providerId);
  if (!policy) return fail(r, 400, `Provedor desconhecido: ${providerId || '(vazio)'}. Use: ${FREE_PROVIDER_CATALOG.map((x) => x.id).join(', ')}.`);
  const config = freeRouterConfig();
  const tasksOf = Object.keys(ROUTER_TASKS).filter((task) => planFreeRoutes(task, config, { quotaUsage: freeRouterUsage() }).routes.some((x) => x.providerId === providerId));
  let task = b.task ? String(b.task) : (tasksOf[0] || null);
  if (!task) return fail(r, 409, `${policy.name} não está na pilha de nenhuma tarefa. Aplique a pilha gratuita (ou inclua este provedor no JSON) antes de testar.`, { providerId, state: 'not-configured' });
  if (!ROUTER_TASKS[task]) return fail(r, 400, `Tarefa desconhecida: ${task}. Use: ${Object.keys(ROUTER_TASKS).join(', ')}.`);
  if (!tasksOf.includes(task)) return fail(r, 409, `${policy.name} não está na pilha de ${PROVIDER_TASK_LABELS[task] || task}. Tarefas com este provedor: ${tasksOf.map((x) => PROVIDER_TASK_LABELS[x] || x).join(', ') || 'nenhuma'}.`, { providerId, tasks: tasksOf });
  if (task === 'video_generation' && b.confirm !== true) return fail(r, 428, `O teste de vídeo gasta 1 das ${NOVAI_VIDEO_DAILY_LIMIT} gerações gratuitas do dia. Confirme explicitamente para executar.`, { providerId, task, needsConfirmation: true, dailyLimit: NOVAI_VIDEO_DAILY_LIMIT, usedToday: freeRouterUsage()[providerId]?.count || 0 });
  const plan = planFreeRoutes(task, config, { quotaUsage: freeRouterUsage() });
  const route = plan.routes.find((x) => x.providerId === providerId);
  const payload = PROVIDER_TEST_PAYLOADS[task];
  if (!payload) return fail(r, 501, `Teste de ${PROVIDER_TASK_LABELS[task] || task} ainda não tem chamada curta definida; use a tarefa real (ex.: Legendas automáticas no editor).`, { providerId, task, pending: true });
  const t0 = Date.now(); const before = freeRouterUsage()[providerId]?.count || 0;
  try {
    const result = await executeFreeRoutes([{ ...route, timeoutMs: Math.min(Number(route.timeoutMs) || 60_000, 90_000) }], payload, {
      adapters: createFreeRouterAdapters(), credentials: routerCredentials(), useAvailabilityCache: false,
      onAttempt: (candidate) => { const entry = freeRouterUsage()[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.count++; S.save(); },
      onQuota: (candidate) => { const entry = freeRouterUsage()[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.blocked = true; S.save(); },
    });
    const usedNow = (freeRouterUsage()[providerId]?.count || 0) - before;
    notify('Teste de provedor', `${policy.name} respondeu (${PROVIDER_TASK_LABELS[task] || task}) em ${((Date.now() - t0) / 1000).toFixed(1)} s.`, 'info');
    send(r, 200, { ok: true, providerId, providerName: policy.name, task, label: PROVIDER_TASK_LABELS[task] || task, model: route.modelId, ms: Date.now() - t0, usedNow,
      sample: task === 'text' ? String(result.text || '').slice(0, 120) : task === 'image_generation' ? `imagem ${(result.image || []).length} byte(s)` : task === 'audio_generation' ? `áudio ${(result.audio || []).length} byte(s)` : `vídeo ${String(result.videoUrl || result.id || '').slice(0, 80)}`,
      hasKey: routerHasCredential(policy).hasKey });
  } catch (error) {
    const message = String(error.message || error).slice(0, 600);
    const status = error?.status === 429 ? 429 : error?.status === 401 ? 401 : /chave não configurada|ausente/.test(message) ? 409 : /timeout/i.test(message) ? 504 : 502;
    send(r, status, { ok: false, providerId, providerName: policy.name, task, label: PROVIDER_TASK_LABELS[task] || task, error: message, state: providerPanel().providers.find((x) => x.id === providerId)?.state || null });
  }
});

route('POST', new RegExp('^/api/free-router/config$'), async (q, r) => {
  const body = await readJson(q); const config = body.config || body;
  const errors = validateFreeRouterConfig(config); if (errors.length) return fail(r, 400, errors.join('; '));
  const safe = publicFreeRouterConfig(config);
  for (const item of config.providers || []) {
    const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === item.id); const value = body.secrets?.[item.id];
    if (policy?.secretEnv && value === null) freeRouterSecrets.delete(item.id);
    else if (policy?.secretEnv && typeof value === 'string' && value.trim()) freeRouterSecrets.set(item.id, value.trim().slice(0, 500));
  }
  db().settings.freeRouter = safe; S.save(); send(r, 200, { ok: true, status: freeRouterStatus() });
});
// Semeia (ou atualiza) o Omni Router sem exigir JSON manual: base 127.0.0.1:20128, texto auto/best-free, imagem flux.2-klein.
// A chave continua vindo de OMNIROUTER_API_KEY (ambiente) ou do campo de segredo em memória — nunca é gravada.
route('POST', new RegExp('^/api/free-router/preset/omni$'), async (q, r) => {
  const current = publicFreeRouterConfig(freeRouterConfig());
  const entry = omniRouterProviderEntry(process.env);
  const providers = [...(current.providers || []).filter((p) => p.id !== 'omni-router'), entry];
  const config = { ...current, providers };
  const errors = validateFreeRouterConfig(config); if (errors.length) return fail(r, 400, errors.join('; '));
  db().settings.freeRouter = publicFreeRouterConfig(config); S.save();
  clearAvailability('omni-router');
  send(r, 200, { ok: true, provider: entry, hasKey: !!process.env.OMNIROUTER_API_KEY, status: freeRouterStatus() });
});
// Pilha gratuita completa em um clique: texto FreeLLMAPI (auto) -> Omni -> NVIDIA; imagem Cloudflare flux-1-schnell -> Omni
// flux.2-klein; voz Cloudflare melotts (só com voiceSource:"cloud", o padrão continua SAPI); vídeo PENDING.
// Chaves e o id da conta continuam vindo do ambiente: a resposta só diz se estão presentes.
route('POST', new RegExp('^/api/free-router/preset/stack$'), async (q, r) => {
  const current = publicFreeRouterConfig(freeRouterConfig());
  const providers = stackProviderEntries(process.env, current.providers || []);
  const config = { ...current, providers, taskPreferences: { ...DEFAULT_TASK_PREFERENCES } };
  const errors = validateFreeRouterConfig(config); if (errors.length) return fail(r, 400, errors.join('; '));
  db().settings.freeRouter = publicFreeRouterConfig(config); S.save();
  for (const id of ['freellmapi', 'cloudflare', 'omni-router', 'nvidia-nim', 'novai']) clearAvailability(id);
  // Reaplicar a pilha é ação explícita do usuário: libera o bloqueio temporário (401/429/timeout) sem zerar a
  // cota do dia — o teto de 5 vídeos/dia da NovAI continua valendo pela contagem.
  const usage = freeRouterUsage();
  for (const entry of Object.values(usage)) { entry.blocked = false; delete entry.unavailable; }
  S.save();
  const status = freeRouterStatus();
  const creds = Object.fromEntries(providers.map((p) => [p.id, routerHasCredential(FREE_PROVIDER_CATALOG.find((x) => x.id === p.id))]));
  send(r, 200, {
    ok: true, providers: status.config.providers, taskPreferences: config.taskPreferences,
    credentials: creds,
    order: { text: DEFAULT_TASK_PREFERENCES.text, image: DEFAULT_TASK_PREFERENCES.image_generation, audio: DEFAULT_TASK_PREFERENCES.audio_generation, video: DEFAULT_TASK_PREFERENCES.video_generation },
    voice: { default: 'sapi', cloud: `use voiceSource:"cloud" (${CLOUDFLARE_AUDIO_MODEL}, WAV)` },
    video: { provider: `novai/${NOVAI_VIDEO_MODEL}`, seconds: NOVAI_VIDEO_DURATION, pollMs: NOVAI_POLL_MS, dailyLimit: NOVAI_VIDEO_DAILY_LIMIT, queue: 'um vídeo por vez; a tarefa mostra progresso' },
    missing: Object.entries(creds).flatMap(([id, c]) => [!c.hasKey ? `${id}: chave ausente` : null, c.accountEnv && !c.hasAccount ? `${id}: ${c.accountEnv} ausente` : null]).filter(Boolean),
    note: 'Nada de chave/conta é gravado: só o ambiente desta sessão (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, FREELLMAPI_API_KEY, OMNIROUTER_API_KEY, NVIDIA_API_KEY, NOVAI_API_KEY).',
  });
});
route('POST', new RegExp('^/api/free-router/execute$'), async (q, r) => {
  const body = await readJson(q); const task = String(body.task || ''); const usage = freeRouterUsage();
  const planned = planFreeRoutes(task, freeRouterConfig(), { quotaUsage: usage });
  if (!planned.ok) return fail(r, 503, planned.reason, { blocked: true, routesTried: 0 });
  const credentials = routerCredentials();
  try {
    const result = await executeFreeRoutes(planned.routes, body.payload || {}, {
      adapters: createFreeRouterAdapters(), credentials,
      onAttempt: (candidate) => { const current = freeRouterUsage(); const entry = current[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.count++; S.save(); },
      onQuota: (candidate) => { const current = freeRouterUsage(); const entry = current[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.blocked = true; S.save(); },
      onUnavailable: ({ route, kind, reason, until }) => { const current = freeRouterUsage(); const entry = current[route.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.unavailable = { kind, reason, until }; if (kind === 'auth' && route.providerId === 'ollama') entry.disabled = true; S.save(); },
    });
    const safe = { ...result, route: { ...result.route, taskEndpoints: undefined, secretEnv: undefined } };
    for (const [key, value] of Object.entries(safe)) if (Buffer.isBuffer(value)) safe[key] = { base64: value.toString('base64') };
    send(r, 200, { ok: true, ...safe, usage: freeRouterUsage(), availability: availabilitySnapshot() });
  } catch (error) { const message = String(error.message || error).slice(0, 1200); const status = error?.quotaExceeded ? 429 : error?.authFailed ? 401 : /chave não configurada/.test(message) ? 503 : 502; send(r, status, { ok: false, error: message, attempts: error?.attempts || [], availability: availabilitySnapshot(), blocked: true, usage: freeRouterUsage() }); }
});


// E2: execução gratuita como tarefa local persistente com estados, eventos SSE, cancelamento e resultado ligado a Canvas/Histórico.
const localRunControllers = new Map();
const localRunListeners = new Map();
const localRuns = () => (db().localRuns ||= []);
const sapiLabel = () => `windows-sapi:${media.ttsVoices()[0] || 'voz padrão'}`;
// Linha 47 do inventário — atalhos e "Compartilhar tela" do canvas: o que é referência do serviço,
// o que funciona DE FATO nesta reconstrução e o que nunca foi observado (contrato real do compartilhar).
const CANVAS_SHORTCUTS = Object.freeze([
  { group: 'Criar', rows: [{ action: 'Agrupar', keys: 'Ctrl G', implemented: true }, { action: 'Desagrupar', keys: 'Ctrl Shift G', implemented: true }, { action: 'Gerar', keys: 'Ctrl Enter', implemented: true }, { action: 'Adicionar nó', keys: 'Tab', implemented: true }, { action: 'Duplicar nó', keys: 'Alt + arrastar', implemented: true }, { action: 'Criar cópia', keys: 'Ctrl Alt + arrastar', implemented: true }] },
  { group: 'Zoom', rows: [{ action: 'Aumentar zoom', keys: 'Ctrl +', implemented: true }, { action: 'Diminuir zoom', keys: 'Ctrl -', implemented: true }, { action: 'Ajustar à tela', keys: 'Ctrl 0', implemented: true }, { action: 'Zoom do trackpad', keys: 'Pinça' }, { action: 'Zoom do mouse', keys: 'Ctrl + rolar', implemented: true }] },
  { group: 'Mover', rows: [{ action: 'Mover a tela', keys: 'Espaço + arrastar', implemented: true }, { action: 'Mover com trackpad', keys: 'Deslizar', implemented: true }, { action: 'Organizar', keys: 'Alt Shift F', implemented: true }, { action: 'Mover (ferramenta)', keys: 'V', implemented: true }, { action: 'Ferramenta mão', keys: 'H', implemented: true }] },
  { group: 'Geral', rows: [{ action: 'Localizar', keys: 'Ctrl F', implemented: true }, { action: 'Desfazer', keys: 'Ctrl Z', implemented: true }, { action: 'Refazer', keys: 'Ctrl Y', implemented: true }, { action: 'Selecionar tudo', keys: 'Ctrl A', implemented: true }, { action: 'Excluir', keys: 'Delete', implemented: true }] },
]);
const shortcutList = () => CANVAS_SHORTCUTS.map((g) => ({ group: g.group, rows: g.rows.map((r) => ({ ...r, implemented: r.implemented === true, state: r.implemented === true ? 'extensão local funcionando' : 'referência do Pippit: não implementado localmente' })) }));
route('GET', /^\/api\/canvas\/shortcuts$/, async (q, r) => {
  const groups = shortcutList();
  const implemented = groups.flatMap((g) => g.rows.filter((x) => x.implemented).map((x) => x.keys));
  const notImplemented = groups.flatMap((g) => g.rows.filter((x) => !x.implemented).map((x) => x.keys));
  send(r, 200, {
    openButton: '⌨ Atalhos', shortcutsObservedOnPippit: false, groups,
    implemented, documentedNotImplemented: notImplemented,
    share: { label: 'Compartilhar tela', contractState: 'UNOBSERVED', contractNote: 'Nenhuma captura do compartilhamento real de tela (stream/convite) foi registrada.', local: 'copia o link somente-leitura do projeto e mostra um aviso', implemented: true },
    externalCalls: 0,
    note: 'A lista de atalhos é referência do Pippit (não observada em captura); aqui cada linha diz se funciona nesta reconstrução. O contrato real de Compartilhar tela continua UNOBSERVED.',
  });
});
// Linha 88 do inventário — formato de anúncio: o comportamento Expand/Select observado e o que falta.
// As descrições reais dos cartões nunca foram capturadas; a única frase vista é exposta como exemplo SEM dono.
route('GET', /^\/api\/marketing\/ad-formats$/, async (q, r) => {
  const names = MARKETING.adFormats.items.map((i) => i.name);
  const captured = 'Hook viewers with a surprise product drop.';
  send(r, 200, {
    search: MARKETING.adFormats.search,
    categories: ['Trending Ads', 'UGC Ads', 'Product Demos', 'Visual Effects'],
    items: names.map((name) => ({ name, category: null, categoryState: 'UNOBSERVED', description: null, descriptionState: 'UNOBSERVED' })),
    expand: { buttonLabel: 'Expand', expandedLabel: 'Collapse', showsDescription: true, descriptionSource: 'cartão do serviço' },
    select: { createsChip: 'Ad formats：<nome>', closesDialog: true, removableChip: true, treatedAsSkill: true },
    capturedDescription: { text: captured, attributedTo: null, state: 'UNOBSERVED atribuição', note: 'A captura registra a frase de um cartão, sem dizer qual; por isso ela não é atribuída a nenhum formato.' },
    counts: { formats: names.length, descriptions: 0, categories: 0 },
    externalCalls: 0,
    note: 'Expand/Collapse e Select (chip removível, tratado como skill) são reproduzidos. Descrições completas dos cartões, imagens de prévia e categorias por cartão continuam UNOBSERVED.',
  });
});
// Linha 132 do inventário — modo Áudio do composer: o que foi observado do menu, o que a instalação faz
// hoje (voz local SAPI como padrão, provedor como opção) e o que continua UNOBSERVED (presets, corpo, custo, chunk).
route('GET', /^\/api\/composer\/audio-mode$/, async (q, r) => send(r, 200, {
  menu: { label: 'Áudio ▾', modeOptions: ['Agente', 'Vídeo', 'Imagem', 'Áudio'], observedText: 'Choose an audio model and generate directly' },
  local: { implemented: true, action: 'POST /api/local-runs { mode: "audio", prompt }', handoff: 'cria projeto no Canvas com um nó de Áudio apontando para o WAV gerado', voice: voiceCard(), cloudOption: 'voz na nuvem só quando pedido (voiceSource:"cloud")' },
  // Voz na nuvem: Cloudflare melotts pela rota gratuita (WAV, ~1 s medido). Nunca assume no lugar do SAPI.
  cloudVoice: (() => { const plan = routerVoicePlan(); return { requestedWith: 'voiceSource:"cloud"', configured: plan.ok, defaultEngine: 'sapi', model: CLOUDFLARE_AUDIO_MODEL, format: 'WAV', measuredMs: 1000, route: plan.ok ? plan.routes[0].providerId : null, reason: plan.ok ? null : plan.reason }; })(),
  unobserved: ['presets de áudio do menu', 'corpo da requisição de geração', 'custo por geração', 'contrato do chunk 565447 (handoff real)'],
  externalCalls: 0, simulated: false,
  note: 'Presets, corpo e custo do modo Áudio nunca foram capturados; a geração local usa a voz do Windows (SAPI), rotulada como não-IA, e não cobra créditos. A voz na nuvem (Cloudflare melotts) só entra com voiceSource:"cloud".',
}));
// `progress`/`phase`/`queuePosition`/`remoteId` são o que a UI mostra enquanto o vídeo está em andamento (fila assíncrona).
const runPublic = (run) => ({
  id: run.id, task: run.task, state: run.state, prompt: run.prompt, projectId: run.projectId || null, chatId: run.chatId || null,
  sourceNodeId: run.sourceNodeId || null, targetNodeId: run.nodeId || null, resultNodeId: run.resultNodeId || null, result: run.result || null,
  assetId: run.assetId || null, asset: run.asset || null, voiceEngine: run.voiceEngine || null, error: run.error || null, route: run.route || null,
  progress: Number.isFinite(run.progress) ? run.progress : (run.state === 'succeeded' ? 100 : 0), phase: run.phase || null,
  queuePosition: run.queuePosition || null, remoteId: run.remoteId || null, remoteStatus: run.remoteStatus || null,
  seconds: run.seconds || null, source: run.source || null, attempts: run.attempts || 0,
  createdAt: run.createdAt, updatedAt: run.updatedAt,
});
function publishLocalRun(run, state, fields = {}) {
  Object.assign(run, fields, { state, updatedAt: new Date().toISOString() });
  const event = { id: (run.events?.at(-1)?.id || 0) + 1, event: 'state', data: runPublic(run) };
  run.events ||= []; run.events.push(event); if (run.events.length > 40) run.events.shift(); S.save();
  for (const listener of localRunListeners.get(run.id) || []) listener(event);
  return event;
}
function getLocalRun(id) { return localRuns().find((x) => x.id === id); }
// ---- Fila de vídeo do roteador gratuito (NovAI): assíncrona, uma tarefa por vez, com progresso visível.
// A API da NovAI é submit + consulta a cada 12 s (medido: 72 s até o MP4). Nada é baixado fora de https em
// aiapi-pro.com/*.ufileos.com, e a URL final (depois de redirecionamentos) é conferida pelo adaptador.
const MAX_RUNNING_VIDEO_RUNS = 1;
const videoPlan = () => planFreeRoutes('video_generation', freeRouterConfig(), { quotaUsage: freeRouterUsage() });
const activeVideoRuns = () => localRuns().filter((x) => x.task === 'video_generation' && x.state === 'running').length;
const queuedVideoRuns = () => localRuns().filter((x) => x.task === 'video_generation' && x.state === 'queued');
const runProject = (run) => (run?.projectId ? db().projects.find((x) => x.id === run.projectId) || null : null);
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(signal.reason || Object.assign(new Error('tarefa cancelada'), { name: 'AbortError' }));
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason || Object.assign(new Error('tarefa cancelada'), { name: 'AbortError' })); }, { once: true });
});
const routerKeyFor = (route) => { const policy = FREE_PROVIDER_CATALOG.find((x) => x.id === route.providerId); const envName = policy?.secretEnv; return envName ? routerCredentials()[envName] : undefined; };
function noteRouterFailure(route, error) {
  const verdict = classifyFreeRouterError(error);
  const usage = freeRouterUsage(); const entry = usage[route.providerId] ||= { day: routerDay(), count: 0, blocked: false };
  const quota = verdict.kind === 'quota' || error?.status === 429 || error?.quotaExceeded === true;
  if (quota) { entry.blocked = true; error.quotaExceeded = true; if (!error.status) error.status = 429; }
  entry.unavailable = { kind: verdict.kind, reason: verdict.reason, until: Date.now() + 60 * 60_000 };
  try { markUnavailable(route.providerId, { kind: verdict.kind, reason: verdict.reason }); } catch {}
  S.save();
}
// Executa um run de vídeo: envia, consulta até SUCCESS/COMPLETED, baixa o MP4 e salva o ativo/nó.
async function executeVideoRun(run) {
  const controller = localRunControllers.get(run.id);
  const plan = videoPlan();
  if (!plan.ok) throw Object.assign(new Error(plan.reason), { blocked: true, pending: true });
  const route = plan.routes[0];
  const adapter = createFreeRouterAdapters()[route.adapter];
  if (typeof adapter?.submitVideo !== 'function') throw Object.assign(new Error(`o provedor ${route.providerName} não expõe fila de vídeo; use o fluxo síncrono`), { blocked: true });
  const apiKey = routerKeyFor(route);
  const routeInfo = { providerId: route.providerId, providerName: route.providerName, modelId: route.modelId, locality: route.locality };
  const usage = freeRouterUsage(); const entry = usage[route.providerId] ||= { day: routerDay(), count: 0, blocked: false };
  entry.count++; run.attempts = (run.attempts || 0) + 1; S.save();
  publishLocalRun(run, 'running', { phase: 'submitting', progress: 5, route: routeInfo });
  let submitted;
  try { submitted = await adapter.submitVideo(route, { prompt: run.prompt, seconds: Number(run.seconds) || NOVAI_VIDEO_DURATION }, { apiKey, signal: controller?.signal }); }
  catch (error) { noteRouterFailure(route, error); throw error; }
  publishLocalRun(run, 'running', { phase: 'polling', remoteId: submitted.id, remoteStatus: submitted.status, progress: 10, route: routeInfo });
  const pollMs = Math.max(10, Number(process.env.NOVAI_POLL_MS) || NOVAI_POLL_MS);
  // Limite >= 180 s em uso real; o servidor falso dos testes (NOVAI_ALLOW_INSECURE_ASSETS=1) pode encurtar.
  const timeoutFloor = process.env.NOVAI_ALLOW_INSECURE_ASSETS === '1' ? 500 : 180_000;
  const budget = Math.max(timeoutFloor, Number(process.env.NOVAI_TIMEOUT_MS) || Number(route.timeoutMs) || FREE_PROVIDER_DEFAULTS.novai.timeoutMs);
  const expected = Number(FREE_PROVIDER_DEFAULTS.novai.measuredMs.video_generation) || 72_000;
  const startedAt = Date.now();
  let status = null;
  for (;;) {
    if (Date.now() - startedAt > budget) throw Object.assign(new Error(`a NovAI não concluiu o vídeo em ${Math.round((Date.now() - startedAt) / 1000)} s (limite local de ${Math.round(budget / 1000)} s). A tarefa continua no provedor (${run.remoteId || submitted.id}); nada foi baixado.`), { name: 'TimeoutError', timeout: true });
    await sleep(pollMs, controller?.signal);
    try { status = await adapter.pollVideo(route, submitted.id, { apiKey, signal: controller?.signal }); }
    catch (error) { noteRouterFailure(route, error); throw error; }
    if (status.state === 'done') break;
    if (status.state === 'failed') throw new Error(`a geração de vídeo terminou com status "${status.status || 'desconhecido'}". Nada foi baixado.`);
    if (status.state === 'unknown') throw new Error(`status de vídeo inesperado ("${status.status || 'vazio'}"). A tarefa foi interrompida; nada foi baixado.`);
    const progress = Math.min(88, 10 + Math.round(((Date.now() - startedAt) / Math.max(1000, expected)) * 78));
    publishLocalRun(run, 'running', { phase: 'polling', progress, remoteStatus: status.status });
  }
  if (!status?.url) throw new Error('a NovAI concluiu o vídeo sem video_result[0].url/video_url; nada foi baixado.');
  publishLocalRun(run, 'running', { phase: 'downloading', progress: 92, remoteStatus: status.status });
  const bytes = await adapter.fetchAsset(status.url, { signal: controller?.signal });
  if (!bytes?.length) throw new Error('o download do vídeo voltou vazio; nada foi salvo.');
  const p = runProject(run);
  const out = path.join(S.FILES_DIR, `${run.projectId || 'talkingphoto'}_run_${run.id}_${Date.now()}.mp4`);
  fs.writeFileSync(out, bytes);
  const asset = addAsset(`Vídeo do roteador (${route.modelId}).mp4`, out, 'video', 'works');
  let resultNodeId = run.resultNodeId || null;
  if (p) {
    const target = run.nodeId ? p.canvas.nodes.find((x) => x.id === run.nodeId) : null;
    if (target) { target.assetId = asset.id; target.hasMedia = true; target.tools?.forEach((tool) => (tool.enabled = true)); resultNodeId = target.id; }
    else { const node = addNode(p, 'Vídeo', 'Vídeo do roteador gratuito', { assetId: asset.id, hasMedia: true }); if (run.sourceNodeId) linkId(p, run.sourceNodeId, node.id); resultNodeId = node.id; }
    touch(p);
    const chat = p.chats?.find((x) => x.id === run.chatId);
    chat?.messages.push({ id: S.newId(), t: new Date().toISOString(), role: 'agent', text: `Vídeo gerado pelo roteador gratuito (${route.providerName} / ${route.modelId}, ${Number(run.seconds) || NOVAI_VIDEO_DURATION} s, MP4, 0 crédito).`, steps: [{ label: 'Vídeo na fila', state: 'done', provider: route.providerName, reason: status.status }] });
  }
  publishLocalRun(run, 'succeeded', {
    progress: 100, phase: 'done', result: `Vídeo gerado: ${asset.name}`, assetId: asset.id,
    asset: { id: asset.id, name: asset.name, stored: asset.stored, kind: 'video', mime: 'video/mp4' },
    resultNodeId, route: routeInfo, remoteStatus: status.status,
  });
}
async function executeLocalRun(run) {
  const controller = localRunControllers.get(run.id); if (!controller || run.state !== 'queued') return;
  // Vídeo tem fila e consulta própria (NovAI): progresso, cancelamento e download validado.
  if (run.task === 'video_generation') return executeVideoRun(run);
  publishLocalRun(run, 'running', { phase: 'routing' });
  if (run.task === 'audio_generation') { // modo Áudio do composer: voz local (SAPI) é o padrão; a nuvem só com voiceSource:"cloud"
    const ap = project(run.projectId); const achat = ap.chats.find((x) => x.id === run.chatId);
    const wantCloud = String(run.voiceSource || '').trim().toLowerCase() === 'cloud';
    if (!wantCloud && !media.ttsAvailable()) {
      throw Object.assign(new Error(`Modo Áudio: sem SAPI nesta máquina e a voz na nuvem é opt-in (voiceSource:"cloud" → Cloudflare melotts/PENDING do Omni). Nada foi gerado.`), { blocked: true, pending: true });
    }
    if (wantCloud) {
      // Nuvem: rota gratuita (Cloudflare melotts). Sem SAPI e sem rota, a tarefa falha explicitamente — nada é simulado.
      const viaRouter = await synthViaRouter(run.prompt, { lang: run.lang || 'en', includeOptIn: true });
      if (viaRouter.ok) {
        const ext = viaRouter.mimeType.includes('wav') ? '.wav' : viaRouter.mimeType.includes('mpeg') ? '.mp3' : '.wav';
        const out = path.join(S.FILES_DIR, `${ap.id}_run_${run.id}_${Date.now()}${ext}`); fs.writeFileSync(out, viaRouter.bytes);
        const asset = addAsset(`Locução do composer (${viaRouter.route.providerName})${ext}`, out, 'audio', 'works');
        const anode = addNode(ap, 'Áudio', 'Locução do roteador (voz na nuvem)', { assetId: asset.id, hasMedia: true }); linkId(ap, run.sourceNodeId, anode.id); touch(ap);
        achat.messages.push({ id: S.newId(), t: new Date().toISOString(), role: 'agent', text: `Locução gerada na nuvem por ${viaRouter.route.providerName} (${viaRouter.route.modelId}, 0 crédito). O padrão desta instalação continua sendo a voz local SAPI.`, steps: [{ label: 'Voz na nuvem', state: 'done', provider: viaRouter.route.providerName }] });
        return publishLocalRun(run, 'succeeded', { result: `Áudio gerado: ${asset.name}`, assetId: asset.id, asset: { id: asset.id, name: asset.name, stored: asset.stored, kind: 'audio', mime: viaRouter.mimeType }, resultNodeId: anode.id, voiceEngine: 'cloud', route: viaRouter.route });
      }
      throw Object.assign(new Error(`Modo Áudio: voz na nuvem não configurada (voiceSource:"cloud" → ${CLOUDFLARE_AUDIO_MODEL}). ${viaRouter.reason} Nada foi gerado.`), { blocked: true, pending: true });
    }
    const wav = path.join(S.FILES_DIR, `${ap.id}_run_${run.id}_${Date.now()}.wav`);
    try { media.ttsLocal(run.prompt, wav, { voice: run.voice, rate: run.rate }); } catch (e) { throw new Error(`Voz local falhou: ${String(e.message || e).slice(0, 240)}`); }
    const asset = addAsset('Locução do composer (SAPI).wav', wav, 'audio', 'works');
    const anode = addNode(ap, 'Áudio', 'Locução do roteador (voz local)', { assetId: asset.id, hasMedia: true }); linkId(ap, run.sourceNodeId, anode.id); touch(ap);
    achat.messages.push({ id: S.newId(), t: new Date().toISOString(), role: 'agent', text: 'Locução gerada com a voz local do Windows (SAPI, não-IA) — o padrão desta instalação.', steps: [{ label: 'Voz local', state: 'done', provider: 'SAPI' }] });
    return publishLocalRun(run, 'succeeded', { result: `Áudio gerado: ${asset.name}`, assetId: asset.id, asset: { id: asset.id, name: asset.name, stored: asset.stored, kind: 'audio', mime: 'audio/wav' }, resultNodeId: anode.id, voiceEngine: 'sapi', route: { providerId: 'sapi-local', providerName: 'Voz local do Windows (SAPI)', modelId: sapiLabel(), locality: 'local' } });
  }
  const usage = freeRouterUsage(); const planned = planFreeRoutes(run.task, freeRouterConfig(), { quotaUsage: usage });
  if (!planned.ok) throw Object.assign(new Error(planned.reason), { blocked: true });
  const credentials = routerCredentials();
  const payload = run.task === 'image_generation' ? { prompt: run.prompt, options: run.imageOptions || {} } : { prompt: run.prompt };
  const result = await executeFreeRoutes(planned.routes, payload, {
    adapters: createFreeRouterAdapters(), credentials, signal: controller.signal,
    onAttempt: (candidate) => { const u = freeRouterUsage(); const entry = u[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.count++; S.save(); },
    onQuota: (candidate) => { const u = freeRouterUsage(); const entry = u[candidate.providerId] ||= { day: routerDay(), count: 0, blocked: false }; entry.blocked = true; S.save(); },
  });
  if (controller.signal.aborted || run.state === 'canceled') return;
  const p = project(run.projectId); const chat = p.chats.find((x) => x.id === run.chatId);
  const now = new Date().toISOString();
  const routeInfo = { providerId: result.route.providerId, providerName: result.route.providerName, modelId: result.route.modelId, locality: result.route.locality };
  const fail = (message) => { throw Object.assign(new Error(message)); };
  if (run.task === 'image_generation') {
    let data = result.image || result.images?.[0]?.data;
    if (!data && result.url) { try { data = Buffer.from(await (await fetch(result.url)).arrayBuffer()); } catch { fail('O provedor retornou uma URL de imagem que não pôde ser baixada.'); } }
    if (!data) fail('O provedor não retornou imagem; nenhuma imagem foi salva.');
    const mime = result.mimeType || result.images?.[0]?.mimeType || sniffImageMime(data) || 'image/png';
    const ext = mime.includes('jpeg') ? '.jpg' : mime.includes('webp') ? '.webp' : '.png';
    const out = path.join(S.FILES_DIR, `${p.id}_run_${run.id}_${Date.now()}${ext}`);
    fs.writeFileSync(out, Buffer.isBuffer(data) ? data : Buffer.from(data));
    const asset = addAsset(`Imagem do roteador gratuito${ext}`, out, 'image', 'works');
    const node = addNode(p, 'Imagem', 'Imagem do roteador gratuito', { assetId: asset.id, hasMedia: true }); linkId(p, run.sourceNodeId, node.id); touch(p);
    chat.messages.push({ id: S.newId(), t: now, role: 'agent', text: `Imagem gerada pelo roteador gratuito (${mime}, ${result.route.providerName} / ${result.route.modelId}).`, steps: [{ label: 'Roteador gratuito', state: 'done', provider: result.route.providerName, reason: result.route.modelId }] });
    return publishLocalRun(run, 'succeeded', { result: `Imagem gerada: ${asset.name}`, assetId: asset.id, asset: { id: asset.id, name: asset.name, stored: asset.stored, kind: 'image', mime }, resultNodeId: node.id, route: routeInfo });
  }
  const text = String(result.text ?? '').trim().slice(0, 12000);
  if (!text) throw new Error('O modelo não retornou texto; nenhuma resposta foi salva.');
  chat.messages.push({ id: S.newId(), t: now, role: 'agent', text, steps: [{ label: 'Roteador gratuito', state: 'done', provider: result.route.providerName, reason: result.route.modelId }] });
  const node = addNode(p, 'Texto', 'Resposta do roteador gratuito', { text, doc: true }); linkId(p, run.sourceNodeId, node.id); touch(p);
  publishLocalRun(run, 'succeeded', { result: text, resultNodeId: node.id, route: routeInfo });
}
// Só um vídeo roda por vez: quem chega depois fica "Na fila" com posição e progresso 0.
function pumpVideoQueue() {
  if (activeVideoRuns() >= MAX_RUNNING_VIDEO_RUNS) return;
  const next = queuedVideoRuns().filter((x) => !localRunControllers.has(x.id)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
  if (next) startLocalRun(next);
}
function startLocalRun(run) {
  if (run.task === 'video_generation' && activeVideoRuns() >= MAX_RUNNING_VIDEO_RUNS) {
    const position = queuedVideoRuns().findIndex((x) => x.id === run.id) + 1;
    publishLocalRun(run, 'queued', { queuePosition: Math.max(1, position) });
    return null;
  }
  const controller = new AbortController(); localRunControllers.set(run.id, controller);
  setImmediate(async () => {
    try { await executeLocalRun(run); }
    catch (error) {
      if (run.state === 'canceled' || controller.signal.aborted) return;
      const message = String(error?.message || error).slice(0, 1000); const p = runProject(run); const chat = p?.chats.find((x) => x.id === run.chatId);
      chat?.messages.push({ id: S.newId(), t: new Date().toISOString(), role: 'agent', text: `A tarefa não foi concluída: ${message}`, steps: [{ label: error.blocked ? 'Bloqueada' : 'Falhou', state: 'failed', reason: message }] }); if (p) touch(p);
      publishLocalRun(run, error.blocked ? 'blocked' : 'failed', { error: message, phase: 'failed' });
    } finally {
      localRunControllers.delete(run.id);
      if (run.task === 'video_generation') pumpVideoQueue();
    }
  });
  return controller;
}
route('GET', /^\/api\/local-runs$/, async (q, r) => send(r, 200, localRuns().map(runPublic)));
route('POST', /^\/api\/local-runs$/, async (q, r) => {
  const body = await readJson(q); const prompt = String(body.prompt || '').trim();
  if (!prompt) return fail(r, 400, 'Descreva sua ideia primeiro.');
  // Modo do composer -> tarefa do roteador. Vídeo e voz do Omni seguem PENDING: nenhum combo confirmado, nada é inventado.
  const mode = String(body.mode || body.kind || 'text').trim();
  const task = ({ text: 'text', texto: 'text', image: 'image_generation', imagem: 'image_generation', audio: 'audio_generation', áudio: 'audio_generation', video: 'video_generation', vídeo: 'video_generation' })[mode.toLowerCase()];
  if (!task) return fail(r, 400, `modo desconhecido: ${mode}`);
  // Vídeo: NovAI (cogvideox-flash, 5 s) em fila assíncrona quando configurado. Sem rota gratuita de vídeo, segue PENDING.
  if (task === 'video_generation' && !videoPlan().ok) return fail(r, 501, 'Vídeo pelo roteador gratuito está PENDING: nenhum provedor gratuito de vídeo configurado (aplique a pilha gratuita com NOVAI_API_KEY). Nada foi gerado.', { blocked: true, pending: true });
  if (task === 'video_generation' && prompt.length < 15) return fail(r, 400, 'Your prompt must contain at least 15 characters. Please provide a more detailed description.');
  // Áudio: a voz local (SAPI) é o padrão; sem SAPI nesta máquina, o run nasce e falha explicitamente (PENDING do Omni), sem chamar provedor.
  const voice = task === 'audio_generation' ? {
    voice: String(body.voice || '').slice(0, 200) || undefined,
    rate: Number.isFinite(Number(body.rate)) ? Number(body.rate) : undefined,
    // SAPI é o padrão; "cloud" é pedido explícito e usa a rota gratuita (Cloudflare melotts).
    voiceSource: String(body.voiceSource || '').toLowerCase() === 'cloud' ? 'cloud' : 'sapi',
    ...(body.lang ? { lang: String(body.lang).slice(0, 16) } : {}),
  } : null;
  const imageOptions = task === 'image_generation' ? { ...(body.size ? { size: String(body.size) } : {}), ...(body.ratio ? { aspect_ratio: String(body.ratio) } : {}) } : null;
  const id = S.newId(); const p = newProject('canvas', prompt.slice(0, 50)); const chat = { id: S.newId(), title: prompt.slice(0, 50), messages: [{ id: S.newId(), t: new Date().toISOString(), role: 'user', text: prompt }], state: {} }; p.chats.push(chat);
  const source = addNode(p, 'Texto', 'Solicitação do composer', { text: prompt, doc: true });
  const videoOptions = task === 'video_generation' ? { seconds: Number(body.seconds) || NOVAI_VIDEO_DURATION } : null;
  const run = { id, task, state: 'queued', prompt: prompt.slice(0, 4000), ...(imageOptions ? { imageOptions } : {}), ...(voice ? voice : {}), ...(videoOptions || {}), projectId: p.id, chatId: chat.id, sourceNodeId: source.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), events: [] };
  localRuns().unshift(run); publishLocalRun(run, 'queued'); startLocalRun(run); send(r, 202, { ok: true, run: runPublic(run) });
});
route('GET', /^\/api\/local-runs\/([\w-]+)$/, async (q, r, m) => { const run = getLocalRun(m[1]); if (!run) return fail(r, 404, 'tarefa inexistente'); send(r, 200, runPublic(run)); });
route('POST', /^\/api\/local-runs\/([\w-]+)\/cancel$/, async (q, r, m) => {
  const run = getLocalRun(m[1]); if (!run) return fail(r, 404, 'tarefa inexistente');
  if (!['queued', 'running'].includes(run.state)) return fail(r, 409, `a tarefa está "${run.state}" e não pode ser cancelada`);
  localRunControllers.get(run.id)?.abort(new Error('tarefa cancelada pelo usuário'));
  const p = runProject(run); const chat = p?.chats.find((x) => x.id === run.chatId); chat?.messages.push({ id: S.newId(), t: new Date().toISOString(), role: 'agent', text: 'Tarefa cancelada localmente. O roteador não iniciará outra tentativa.' }); if (p) touch(p);
  publishLocalRun(run, 'canceled', { error: 'Cancelada pelo usuário.', phase: 'canceled' });
  if (run.task === 'video_generation' && !localRunControllers.has(run.id)) pumpVideoQueue();
  send(r, 200, { ok: true, run: runPublic(run) });
});
route('GET', /^\/api\/local-runs\/([\w-]+)\/events$/, async (q, r, m) => {
  const run = getLocalRun(m[1]); if (!run) return fail(r, 404, 'tarefa inexistente');
  r.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' }); r.flushHeaders?.();
  const write = (event) => { if (!r.destroyed && !r.writableEnded) r.write(`id:${event.id}\nevent:${event.event}\ndata:${JSON.stringify(event.data)}\n\n`); };
  const last = Number(q.headers['last-event-id'] || 0); for (const event of run.events || []) if (event.id > last) write(event);
  if (['succeeded', 'failed', 'blocked', 'canceled'].includes(run.state)) return r.end();
  const listeners = localRunListeners.get(run.id) || new Set(); localRunListeners.set(run.id, listeners); const listener = (event) => { write(event); if (['succeeded', 'failed', 'blocked', 'canceled'].includes(event.data.state)) { listeners.delete(listener); r.end(); } }; listeners.add(listener);
  const heartbeat = setInterval(() => { if (!r.destroyed && !r.writableEnded) r.write(': keep-alive\n\n'); }, 15000); heartbeat.unref();
  const cleanup = () => { clearInterval(heartbeat); listeners.delete(listener); if (!listeners.size) localRunListeners.delete(run.id); };
  r.once('close', cleanup); r.once('error', cleanup);
});

// ---- LLM (planejador do agente, skills com IA, refinamento de prompt, Criação Inteligente). Padrão: Ollama local autodetectado; configurável (compatível com OpenAI).
const publicSettings = (st) => ({ ...st, llm: st.llm ? { ...st.llm, apiKey: undefined, hasKey: !!secretFor('llm') } : undefined, imageProvider: st.imageProvider ? { ...st.imageProvider, apiKey: undefined, hasKey: !!secretFor('imageProvider') } : undefined, providers: st.providers ? Object.fromEntries(Object.entries(st.providers).map(([k, v]) => [k, { ...v, apiKey: undefined, hasKey: !!secretFor(k) }])) : undefined });
let llmCache = { key: '', at: 0, client: null, source: 'none', models: [], error: null };
// Cliente do agente: a pilha de texto do roteador gratuito é o PADRÃO (FreeLLMAPI → Omni → NVIDIA → NovAI).
// O Ollama local (ou um servidor compatível escolhido pelo usuário) continua disponível como opção:
// modelo definido à mão tem prioridade; senão o roteador; senão a autodetecção do Ollama.
function routerLLMClient() {
  try {
    const client = createRouterLLM({ config: freeRouterConfig(), credentials: routerCredentials(), quotaUsage: freeRouterUsage() });
    return client ? { client, routes: client.routeIds, error: null } : { client: null, routes: [], error: 'nenhuma rota de texto com credencial (aplique a pilha gratuita)' };
  } catch (error) { return { client: null, routes: [], error: String(error.message || error).slice(0, 160) }; }
}
// Assinatura da pilha de texto: entrar/sair da tela de provedores não pode deixar o agente preso a um cliente antigo.
function routerSignature() {
  try {
    const plan = planFreeRoutes('text', freeRouterConfig(), { quotaUsage: freeRouterUsage() });
    if (!plan.ok) return 'none';
    const creds = routerCredentials();
    return plan.routes.map((x) => `${x.providerId}/${x.modelId}${x.secretEnv && !creds[x.secretEnv] ? ':sem-chave' : ''}`).join(',');
  } catch { return 'erro'; }
}
async function getLLM(force = false) {
  const cfg = { ...(db().settings.llm || {}), apiKey: secretFor('llm') || undefined }; const key = JSON.stringify(cfg) + (cfg.model ? '' : '|' + routerSignature()); if (cfg.enabled === false) return null;
  if (process.env.PIPPIT_LLM === 'off' && !cfg.model) { llmCache = { key, at: Date.now(), client: null, source: 'auto', models: [], error: 'autodetecção desativada (PIPPIT_LLM=off)' }; return null; }
  // Sem modelo manual: o roteador gratuito vem antes da autodetecção do Ollama.
  if (!cfg.model) {
    if (!force && llmCache.key === key && llmCache.client && llmCache.source === 'router' && Date.now() - llmCache.at < 30000) return llmCache.client;
    const router = routerLLMClient();
    if (router.client) { llmCache = { key, at: Date.now(), client: router.client, source: 'router', models: router.routes, error: null }; return router.client; }
    llmCache = { ...llmCache, routerError: router.error };
  } // usado pelos testes para ficarem determinísticos
  if (!force && llmCache.key === key && Date.now() - llmCache.at < 30000) return llmCache.client;
  const baseUrl = cfg.baseUrl || DEFAULT_BASE_URL; let client = null, models = [], error = null, source = cfg.model ? 'manual' : 'auto';
  const mk = (model) => (llmCache.client && llmCache.key === key && llmCache.client.model === model ? llmCache.client : new LLM({ baseUrl, model, apiKey: cfg.apiKey, timeoutMs: 240000, native: cfg.native, keepAlive: cfg.keepAlive || '30m', options: cfg.options || {}, cache: llmResultCache() })); // reaproveita o cliente: mantém estatísticas e chamadas em andamento
  try {
    const probe = new LLM({ baseUrl, model: cfg.model || 'probe', apiKey: cfg.apiKey, timeoutMs: 240000 });
    if (cfg.model) client = mk(cfg.model); // modelo escolhido pelo usuário: erros aparecem no uso (e o agente cai nas regras locais)
    else { models = await Promise.race([probe.models(), new Promise((_, no) => setTimeout(() => no(new Error('sem resposta em 3 s')), 3000))]); const m = models.find((x) => /qwen3-local/.test(x)) || models.find((x) => !/embed/i.test(x)); if (m) client = mk(m); else error = 'nenhum modelo de chat instalado'; }
  } catch (e) { error = String(e.message || e).slice(0, 160); }
  const fresh = client && client !== llmCache.client; llmCache = { key, at: Date.now(), client, source, models, error };
  if (fresh && client.native && process.env.PIPPIT_LLM_WARMUP !== 'off') client.warmup().catch(() => {}); // carrega o modelo em segundo plano (evita 15–36 s na primeira chamada real)
  return client;
}
// cache persistente de respostas do LLM por entrada (db.llmCache, limitado a 200): evita regenerar temas/storyboard/prompts iguais (a geração é o gargalo: ~4 tok/s)
function llmResultCache() {
  return {
    get: (k) => db().llmCache?.[k]?.t,
    set: (k, t) => { const c = (db().llmCache ||= {}); c[k] = { t, at: Date.now() }; const ks = Object.keys(c); if (ks.length > 200) for (const o of ks.sort((a, b) => c[a].at - c[b].at).slice(0, ks.length - 200)) delete c[o]; S.save(); },
  };
}
route('GET', /^\/api\/llm\/stats$/, async (q, r) => { const c = await getLLM(); send(r, 200, { available: !!c, label: c?.label || null, native: !!c?.native, keepAlive: c?.keepAlive || null, options: c?.options || {}, cachedEntries: Object.keys(db().llmCache || {}).length, stats: c?.stats || null, note: 'Medições por etapa: carregamento (loadMs), processamento do prompt (promptMs) e geração de tokens (genMs); válidas apenas para o caminho nativo do Ollama.' }); });
route('POST', /^\/api\/llm\/cache\/clear$/, async (q, r) => { db().llmCache = {}; S.save(); send(r, 200, { ok: true }); });
route('GET', /^\/api\/llm\/status$/, async (q, r) => { const c = await getLLM(true); const cfg = db().settings.llm || {}; const plan = planFreeRoutes('text', freeRouterConfig(), { quotaUsage: freeRouterUsage() });
  send(r, 200, { enabled: cfg.enabled !== false, source: llmCache.source, label: c?.label || null, reachable: !!c, baseUrl: cfg.baseUrl || (llmCache.source === 'router' ? c?.baseUrl || null : DEFAULT_BASE_URL), model: cfg.model || c?.model || null, hasKey: !!secretFor('llm'), whisperModel: db().settings.whisperModel || null, whisperFilter: media.whisperAvailable(), models: llmCache.models, error: llmCache.error,
    router: { planned: plan.routes.map((x) => `${x.providerId}/${x.modelId}`), reason: plan.ok ? null : plan.reason, timeoutMs: ROUTER_LLM_MIN_TIMEOUT_MS, error: llmCache.routerError || null },
    ollama: { optional: true, baseUrl: cfg.baseUrl || DEFAULT_BASE_URL, used: llmCache.source === 'auto' || llmCache.source === 'manual' },
    note: 'Planejador do agente, skills com IA, refinamento de prompt e Criação Inteligente usam a pilha de texto do roteador gratuito (FreeLLMAPI → Omni → NVIDIA → NovAI) por padrão; o Ollama local é opção (modelo definido à mão tem prioridade). Sem nenhum dos dois, o agente usa regras locais. Não é o LLM do Pippit.' }); });
route('POST', /^\/api\/llm\/config$/, async (q, r) => {
  const b = await readJson(q); const cur = db().settings.llm || {}; const next = { ...cur };
  if ('enabled' in b) next.enabled = !!b.enabled; if ('model' in b) next.model = String(b.model || '').trim().slice(0, 120) || undefined;
  if ('baseUrl' in b) { const u = String(b.baseUrl || '').trim(); if (u && !/^https?:\/\/[^\s]+$/i.test(u)) return fail(r, 400, 'baseUrl inválida (use http(s)://…/v1)'); if (u && !isLocalEndpoint(u)) return fail(r, 403, 'LLM genérico remoto desativado; use Ollama local ou Roteador gratuito com confirmação de cota.'); next.baseUrl = u || undefined; }
  if ('apiKey' in b) { const apiKey = String(b.apiKey || '').trim().slice(0, 300); if (apiKey) runtimeKeys.set('llm', apiKey); else runtimeKeys.delete('llm'); }
  delete next.apiKey;
  if ('native' in b) next.native = b.native === null ? undefined : !!b.native; if ('keepAlive' in b) { const k = String(b.keepAlive || '').trim(); if (k && !/^(-1|\d+(s|m|h)?)$/.test(k)) return fail(r, 400, 'keepAlive inválido (ex.: 30m, 1h, -1)'); next.keepAlive = k || undefined; }
  if ('options' in b) { const o = b.options; if (o !== null && (typeof o !== 'object' || Array.isArray(o))) return fail(r, 400, 'options deve ser um objeto'); const okKeys = ['num_thread', 'num_gpu', 'num_ctx', 'num_batch', 'top_k', 'top_p', 'repeat_penalty']; const clean = {}; for (const [k, v] of Object.entries(o || {})) { if (!okKeys.includes(k) || typeof v !== 'number' || !Number.isFinite(v)) return fail(r, 400, `opção inválida: ${k} (permitidas: ${okKeys.join(', ')})`); clean[k] = v; } next.options = o ? clean : undefined; }
  if ('whisperModel' in b) { const w = String(b.whisperModel || '').trim(); if (w && !fs.existsSync(w)) return fail(r, 400, 'arquivo do modelo Whisper não encontrado'); db().settings.whisperModel = w || undefined; }
  db().settings.llm = next; S.save(); llmCache.key = ''; send(r, 200, { ok: true });
});
route('GET', /^\/api\/image-provider$/, async (q, r) => { const c = providerRuntimeSettings().imageProvider || {}; send(r, 200, { configured: !!(c.baseUrl && c.model), baseUrl: c.baseUrl || '', model: c.model || '', hasKey: !!secretFor('imageProvider'), note: 'Somente endpoint local. Chave efêmera; geração externa só pelo Roteador gratuito com confirmação de free tier e limite de cota.' }); });
route('POST', /^\/api\/image-provider$/, async (q, r) => { const b = await readJson(q); const cur = db().settings.imageProvider || {}; const next = { ...cur }; if ('baseUrl' in b) { const u = String(b.baseUrl || '').trim(); if (u && !/^https?:\/\/[^\s]+$/i.test(u)) return fail(r, 400, 'baseUrl inválida'); if (u && !isLocalEndpoint(u)) return fail(r, 403, 'Provedores de imagem remotos estão desativados; use o Roteador gratuito.'); next.baseUrl = u || undefined; } if ('model' in b) next.model = String(b.model || '').trim().slice(0, 120) || undefined; if ('apiKey' in b) { const key = String(b.apiKey || '').trim(); if (key) runtimeKeys.set('imageProvider', key.slice(0, 300)); else runtimeKeys.delete('imageProvider'); } delete next.apiKey; db().settings.imageProvider = next; S.save(); send(r, 200, { ok: true }); });
route('POST', /^\/api\/llm\/test$/, async (q, r) => { const c = await getLLM(true); if (!c) return fail(r, 503, `Nenhum LLM disponível: aplique a pilha gratuita de texto (FreeLLMAPI/Omni/NVIDIA/NovAI) com as chaves no ambiente ou inicie o Ollama local${llmCache.error ? ` (${llmCache.error})` : ''}.`); const t0 = Date.now(); try { const text = await c.chat([{ role: 'user', content: 'Responda apenas com a palavra: pronto' }], { maxTokens: 20, temperature: 0 }); send(r, 200, { ok: true, source: llmCache.source, label: c.label, text: text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(), ms: Date.now() - t0 }); } catch (e) { fail(r, e?.status === 429 ? 429 : 502, String(e.message || e).slice(0, 700)); } });
const needLLM = async (r) => { const c = await getLLM(); if (!c) { fail(r, 503, `Nenhum LLM disponível: aplique a pilha gratuita de texto (FreeLLMAPI → Omni → NVIDIA → NovAI) com as chaves no ambiente ou inicie o Ollama local com um modelo.${llmCache.error ? ' Motivo: ' + llmCache.error : ''}`); return null; } return c; };
route('POST', /^\/api\/prompt\/refine$/, async (q, r) => { const b = await readJson(q); const text = String(b.text || '').trim(); if (text.length < 3) return fail(r, 400, 'Digite uma ideia'); const c = await needLLM(r); if (!c) return; try { send(r, 200, { prompt: await llmRefinePrompt(c, text, b.kind === 'image' ? 'imagem' : 'vídeo'), label: c.label }); } catch (e) { fail(r, 502, `Falha ao refinar: ${String(e.message || e).slice(0, 700)}`); } });
// Criação Inteligente: com consentimento, gera ideias de vídeo a partir do histórico (1x/dia enquanto o servidor roda; ou sob demanda). Ideias viram prompts na Home.
const smart = () => (db().smart ||= { ideas: [], lastRun: null });
const historyTexts = () => db().projects.flatMap((p) => [p.title, ...(p.chats || []).flatMap((c) => c.messages.filter((m) => m.role === 'user' && m.text).map((m) => m.text))]).filter((t) => t && !/^(Untitled|PROJECT)$/.test(t)).slice(0, 12);
const RULE_IDEAS = [{ title: 'Produto em destaque', prompt: 'Um produto girando lentamente sobre fundo claro, luz suave de estúdio, câmera aproximando devagar.' }, { title: 'Um dia na vida', prompt: 'Uma pessoa preparando café pela manhã numa cozinha iluminada pelo sol, planos curtos e ritmo calmo.' }, { title: 'Antes e depois', prompt: 'Transformação de um ambiente bagunçado em organizado, em passos rápidos com música animada.' }];
async function runSmartIdeas() {
  const c = await getLLM(); let ideas, source = 'regras locais';
  if (c) { try { ideas = await llmSmartIdeas(c, historyTexts()); source = `LLM ${c.label}`; } catch (e) { smart().error = String(e.message || e).slice(0, 160); } }
  ideas ||= RULE_IDEAS; const st = smart(); st.ideas = ideas.map((i) => ({ id: S.newId(), ...i, source, at: new Date().toISOString() })); st.lastRun = new Date().toISOString(); if (source !== 'regras locais') st.error = null; S.save();
  notify('Criação Inteligente', `${st.ideas.length} nova(s) ideia(s) de vídeo (${source}).`, 'info'); return st;
}
route('GET', /^\/api\/smart-creation$/, async (q, r) => send(r, 200, { authorized: !!db().settings.smartCreation, steps: ['Gere vídeos com o Agente de vídeo', 'Vídeos gratuitos criados automaticamente com base no histórico de chat (por tempo limitado)', 'Confira os vídeos no dia seguinte na página “Criação inteligente”'], details: ['Prompts com descrições detalhadas e mídia levam a melhores resultados.', 'Os vídeos serão criados automaticamente usando seu prompt e mídia.', 'Baixe os que você gostar ou edite para ficar incríveis.'], categories: ['Vitrine de produtos', 'Como usar', 'História da marca', 'Avaliações de clientes'], ideas: smart().ideas, lastRun: smart().lastRun, error: smart().error || null, note: 'Local: com o consentimento, o app gera ideias a partir do histórico (LLM local quando disponível) uma vez por dia e sob demanda; a geração gratuita automática de vídeos do Pippit não existe aqui.' }));
route('POST', /^\/api\/smart-creation$/, async (q, r) => { const b = await readJson(q); db().settings.smartCreation = !!b.authorize; S.save(); send(r, 200, { authorized: db().settings.smartCreation }); });
route('POST', /^\/api\/smart-creation\/run$/, async (q, r) => { if (!db().settings.smartCreation) return fail(r, 403, 'Autorize a Criação Inteligente primeiro'); send(r, 200, await runSmartIdeas()); });
const smartTimer = setInterval(() => { if (db().settings.smartCreation && (!smart().lastRun || Date.now() - Date.parse(smart().lastRun) > 20 * 3600 * 1000)) runSmartIdeas().catch(() => {}); }, 3600 * 1000); smartTimer.unref();
// telemetria (coletor local do GET observado /lv/v1/event/report)
route('GET', /^\/lv\/v1\/event\/report$/, async (q, r) => { const u = new URL(q.url, 'http://x'); const ev = Object.fromEntries(u.searchParams); db().events.push({ t: new Date().toISOString(), ...ev }); if (db().events.length > 500) db().events.shift(); S.save(); send(r, 200, { ret: '0', errmsg: '', svr_time: Math.floor(Date.now() / 1000) }); });
route('GET', /^\/api\/events$/, async (q, r) => send(r, 200, db().events));
route('GET', /^\/api\/track-url$/, async (q, r) => { const u = new URL(q.url, 'http://x'); send(r, 200, { url: track(u.searchParams.get('path') || '/', q.headers.host) }); });
route('POST', /^\/api\/reset$/, async (q, r) => { S.reset(); send(r, 200, { ok: true }); });


// ---- geracao direta de video (contrato OBSERVADO em 21/10/2026; src/directgen.mjs). Caminhos iguais aos do Pippit para o cliente poder usar o mesmo fluxo.
const DIRECT_LISTENERS = new Set();
function direct() {
  const local = (db().settings.provider === 'local-ffmpeg') && media.available();
  return new DirectGen({
    state: (db().direct ||= newDirectState()), listeners: DIRECT_LISTENERS, plan: () => db().user.plan, charge: !local, // renderizador local nao-IA: sem debito (igual a /nodes/:id/generate)
    credits: { balance: () => S.balance(), balances: () => S.balances(), debit: (l, n) => S.debit(l, n) },
    mediaInfo: (id) => { const a = db().assets.find((x) => x.id === id); return a ? { asset_id: a.id, md5: '', format: a.kind, size: fs.existsSync(S.pubFile(a.stored)) ? fs.statSync(S.pubFile(a.stored)).size : 0, width: a.width, height: a.height, download_url: `/files/${a.stored}`, mime: a.kind === 'video' ? 'video/mp4' : '', duration_ms: a.duration ? Math.round(a.duration * 1000) : null, cover_url: null } : null; },
    render: local ? async (run, { param, signal }) => { const out = path.join(S.FILES_DIR, `direct_${run.run_id}.mp4`); try { await media.generateLocalVideoAsync(out, { seconds: Number(param.duration_sec) || 4, ratio: param.ratio, signal }); } catch (e) { try { fs.unlinkSync(out); } catch {} throw e; } const a = addAsset(`direct_${run.run_id.slice(0, 8)}.mp4`, out, 'video', 'works'); return { assetId: a.id, name: a.name, durationMs: Math.round((a.duration || param.duration_sec) * 1000), width: a.width, height: a.height }; } : null,
  });
}
const dEnv = (path_, fn) => route('POST', new RegExp('^' + path_ + '$'), async (q, r) => { const b = await readJson(q); const out = fn(direct(), b); S.save(); send(r, 200, out); });
dEnv('/commerce/v3/benefits/batch_check_withhold_deduct', (d, b) => d.checkWithholdDeduct(b));
dEnv('/commerce/v1/benefits/user_credit', (d) => d.userCredit());
dEnv('/api/biz/v1/agent/create_creative_project', (d, b) => { const out = d.createCreativeProject(b); const id = String(out.data.project_id); const now = new Date().toISOString(); db().projects.unshift({ id, type: 'direct', title: 'Untitled', createdAt: now, updatedAt: now, canvas: { nodes: [], edges: [] }, chats: [], ratio: '9:16' }); return out; });
dEnv('/api/biz/v1/agent/cancel_run', (d, b) => d.cancelRun(b));
route('GET', /^\/api\/direct\/runs$/, async (q, r) => send(r, 200, direct().listRuns()));
route('GET', /^\/api\/direct\/tasks$/, async (q, r) => send(r, 200, { scope: 'local-only; not the Pippit generation_task_list contract', tasks: direct().listLocalTasks() }));
dEnv('/api/biz/v1/agent/get_thread', (d, b) => d.getThread(b));
dEnv('/api/biz/v1/agent/get_run', (d, b) => d.getRun(b));
dEnv('/api/biz/v1/agent/list_project_file', (d, b) => d.listProjectFile(b));
dEnv('/api/biz/v1/asset/namespace_create', (d, b) => d.namespaceCreate(b));
dEnv('/api/biz/v1/asset/batch_generate_asset_id', (d) => d.batchGenerateAssetId());
dEnv('/api/biz/v1/asset/batch_patch_asset', (d, b) => d.batchPatchAsset(b));
dEnv('/api/biz/v1/asset/subscribe_asset', (d) => d.env(null));
dEnv('/api/biz/v1/common/mget_asset_info', (d, b) => d.mgetAssetInfo(b));
dEnv('/api/biz/v2/common/generation_task_list', (d) => d.generationTaskList());
route('POST', /^\/api\/biz\/v1\/agent\/submit_run$/, async (q, r) => {
  const b = await readJson(q); const d = direct(); const out = d.submitRun(b);
  if (out.ret === '0') { // espelha no historico de projetos (abre /direct/<projeto>/<canvas>/<run>); titulo do projeto = titulo do thread + " part" (regra UNOBSERVED)
    const run = d.s.runs[out.data.run.run_id]; const th = d.s.threads[run.thread_id]; const lp = db().projects.find((x) => x.id === String(b.project_id));
    if (lp) { lp.title = `${th.title} part`; lp.direct = { canvasId: th.canvasId, threadId: th.thread_id, runId: run.run_id }; lp.updatedAt = new Date().toISOString(); }
  }
  S.save(); send(r, 200, out);
  if (out.ret === '0') setTimeout(() => { direct().process(out.data.run.run_id).then((run) => { if (run && [3, 4, 5].includes(run.state)) { const ok = run.state === 3; const th = direct().s.threads[run.thread_id]; notify(ok ? 'Geração concluída' : run.state === 5 ? 'Geração cancelada' : 'Falha na geração', `${th?.title || 'Vídeo'}${run.fail_reason?.detail ? ' — ' + run.fail_reason.detail : ''}`, ok ? 'success' : 'error'); } S.save(); }).catch(() => {}); }, 300); // validacao/debito/render acontecem depois da resposta (como no original)
});
const sse = (res) => { res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' }); res.flushHeaders?.(); return (e) => { if (res.destroyed || res.writableEnded) return false; return res.write(`event:${e.event}\ndata:${typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}\n\n`); }; };
const detachSse = (res, listener) => {
  const cleanup = () => DIRECT_LISTENERS.delete(listener);
  res.once('close', cleanup); res.once('error', cleanup);
  DIRECT_LISTENERS.add(listener);
};
route('POST', /^\/api\/biz\/v1\/agent\/subscribe_(thread|run)$/, async (q, r, m) => {
  const b = await readJson(q); const d = direct(); const write = sse(r); const threadId = b.thread_id || d.s.runs[b.run_id]?.thread_id;
  for (const e of d.threadEvents(threadId)) write(e);
  // O replay de subscribe_thread observado contém message/message/ping. O payload incremental de subscribe_run
  // não foi capturado: o alias local abaixo é apenas um fallback de reconstrução, não contrato comprovado.
  const on = (ev) => { if (ev.type === 'run' && ev.thread_id === threadId) { const v = direct().threadEvents(threadId)[0]; if (v) write(v); } };
  detachSse(r, on);
});
route('POST', /^\/api\/biz\/v1\/asset\/sse_asset$/, async (q, r) => {
  const b = await readJson(q); const d = direct(); const ids = (b.asset_ids || b.pippit_asset_ids || Object.keys(d.s.assets)).map(String); const write = sse(r);
  for (const e of d.assetEvents(ids)) write(e);
  const on = (ev) => { if (ev.type === 'asset' && ids.includes(String(ev.id))) write({ event: 'AssetJsonUpdate', data: { pippit_asset_id: String(ev.id), version: ev.version, content: JSON.stringify({ patches: ev.patches }), start_version: ev.version - 1, extra: { asset_content_version: String(ev.version) } } }); };
  detachSse(r, on);
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'); const p = url.pathname;
    if (req.method === 'OPTIONS') return send(res, 204, '');
    // autenticação (estrutura): com "exigir login" ligado (adaptador local), /api/* pede sessão; /api/auth/* sempre acessível.
    if (p.startsWith('/api/') && !p.startsWith('/api/auth/')) {
      const cfg = authCfg();
      if (cfg.required && !sessionOf(req)) return fail(res, 401, 'não autenticado: faça login para continuar', { authRequired: true, adapter: cfg.adapter });
    }
    for (const rt of routes) { if (rt.method !== req.method) continue; const m = rt.re.exec(p); if (m) return await rt.fn(req, res, m); }
    if (p.startsWith('/files/')) { const f = S.pubFile(path.basename(p)); if (!fs.existsSync(f)) return send(res, 404, 'não encontrado'); const st = fs.statSync(f); const type = MIME[path.extname(f).toLowerCase()] || 'application/octet-stream'; const range = req.headers.range;
      if (range) { const [a, b] = range.replace('bytes=', '').split('-'); const s = Number(a), e = b ? Number(b) : st.size - 1; res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${e}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 }); return fs.createReadStream(f, { start: s, end: e }).pipe(res); }
      res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes' }); return fs.createReadStream(f).pipe(res); }
    if (p.startsWith('/src/') && p.endsWith('.mjs')) { const sf = path.join(HERE, '..', 'src', path.basename(p)); if (fs.existsSync(sf)) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(fs.readFileSync(sf)); } }
    let f = path.join(PUBLIC, p === '/' ? 'index.html' : p); if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUBLIC, 'index.html');
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res);
  } catch (e) { fail(res, 500, String(e.message || e)); }
});
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { S.claimDaily(); server.listen(PORT, '127.0.0.1', () => console.log(`Pippit local: http://127.0.0.1:${PORT}  (dados em ${S.DATA_DIR}; ffmpeg: ${media.available() ? 'sim' : 'não'})`)); }
export { server, PORT };
