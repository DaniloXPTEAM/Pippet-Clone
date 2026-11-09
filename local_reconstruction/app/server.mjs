// Servidor local da reconstrucao do Pippit (sem dependencias). Uso: node app/server.mjs  -> http://127.0.0.1:5180
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './lib/store.mjs';
import * as media from './lib/media.mjs';
import { userMessage } from './lib/agent.mjs';
import { VIDEO_MODELS, IMAGE_MODELS, AUDIO_MODELS, VIDEO_RATIOS, IMAGE_RATIOS, VIDEO_RES, IMAGE_RES, SKILLS, NODE_PANELS, MARKETING, videoCost, NEEDS } from './lib/catalog.mjs';
import { OFFICIAL, SKILL_DEFS, skillDef, skillSummary } from './lib/skilldefs.mjs';
import { PLANS, AVATAR_RULES, getPlan } from '../src/plans.mjs';
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
import { JobManager } from './lib/jobs.mjs';
import { composeWorkflow } from './lib/compose.mjs';
import { LLM, DEFAULT_BASE_URL, llmCreateSkill, llmRefinePrompt, llmSmartIdeas } from '../src/llm.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, 'public');
const PORT = Number(process.env.PORT || 5180);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };
const db = () => S.load();
const send = (res, code, body, headers = {}) => { const b = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body); res.writeHead(code, { 'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json', ...headers }); res.end(b); };
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
  const i = p.canvas.nodes.length - 1; n.x = 80 + (i % 4) * 300; n.y = 80 + Math.floor(i / 4) * 340; n.panel = NODE_PANELS[type] ? { ...NODE_PANELS[type] } : null; n.id = `n${S.newId().slice(-6)}`; touch(p); return n;
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
const agentCtx = async () => ({ skillGuide, db: db(), addDoc, addNode, link, linkId, addAsset, assetPath, mediaDir: S.FILES_DIR, llm: await getLLM(), providers: PV.resolveProviders(db().settings), jobs: jobsMgr });
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
route('GET', /^\/api\/state$/, async (q, r) => send(r, 200, state()));
route('POST', /^\/api\/daily-claim$/, async (q, r) => send(r, 200, { ...S.claimDaily(), balance: S.balance() }));
route('GET', /^\/api\/ledger$/, async (q, r) => send(r, 200, S.ledgerView()));
const CAT_PT = { 'Short Drama': 'Drama curto', 'Marketing Advertising': 'Marketing Publicidade', 'Professional film and television': 'Cinema e televisão profissionais' };
// dados observados no servidor (official_skills.json, REA 6.7.0): categorias, ferramentas declaradas, modelos padrão e textos de guia
const enrichSkill = (sk) => { const o = OFFICIAL[sk.id]; if (!o) return sk; const tags = (o.categories || []).map((c) => CAT_PT[c] || c); return { ...sk, tag: tags[0] || sk.tag, tags: tags.length ? tags : undefined, tools: o.tools, defaultModels: o.defaultModels, guideWords: o.guideWords, guideKind: o.guideKind, materialGuide: o.materialGuide, contentVersion: o.contentVersion, officialSkillName: o.skillName }; };
route('GET', /^\/api\/catalog$/, async (q, r) => send(r, 200, { videoModels: VIDEO_MODELS, imageModels: IMAGE_MODELS, audioModels: AUDIO_MODELS, videoRatios: VIDEO_RATIOS, imageRatios: IMAGE_RATIOS, videoRes: VIDEO_RES, imageRes: IMAGE_RES, editorRatios: media.EDITOR_RATIOS, skills: SKILLS.map(enrichSkill), skillDefs: Object.fromEntries(Object.keys(SKILL_DEFS).map((id) => [id, skillSummary(id)])), plans: PLANS, nodeTypes: NODE_TYPES, nodeTools: NODE_TOOLS, nodePanels: NODE_PANELS, marketing: MARKETING }));
route('POST', /^\/api\/plan$/, async (q, r) => { const b = await readJson(q); if (!getPlan(b.plan)) return fail(r, 400, 'plano inválido'); db().user.plan = b.plan; db().user.billing = b.billing || 'monthly'; S.save(); send(r, 200, { ok: true, note: 'Troca de plano LOCAL para testar bloqueios; nenhuma cobrança existe nesta reconstrução.', state: state() }); });
route('POST', /^\/api\/settings$/, async (q, r) => { const b = await readJson(q); const s = db().settings; Object.assign(s, b.language ? { language: b.language } : {}, b.theme ? { theme: b.theme } : {}, b.provider !== undefined ? { provider: b.provider } : {}); if (b.creditConfirm) s.creditConfirm = { mode: b.creditConfirm.mode === 'ignore' ? 'ignore' : 'threshold', limit: Number(b.creditConfirm.limit) || 450 }; S.save(); send(r, 200, state()); });
// idioma/aparência (opções lidas no app original: 18 idiomas; Light/Dark). Só a escolha persiste; a tradução da interface não foi capturada.
const LANGS = [['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'], ['de', 'Deutsch'], ['en', 'English'], ['es', 'Español'], ['fil', 'Filipino'], ['fr', 'Français'], ['it', 'Italiano'], ['pl', 'Polski'], ['pt-BR', 'Português'], ['vi', 'Tiếng Việt'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['th', 'ไทย'], ['ja', '日本語'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['ko', '한국어']];
route('GET', /^\/api\/tts-voices$/, async (q, r) => send(r, 200, { available: media.ttsAvailable(), voices: media.ttsAvailable() ? media.ttsVoices() : [], note: 'Voz sintética local do Windows (SAPI): não é IA generativa nem o Seed Audio do Pippit; só vozes instaladas (en-US).' }));
route('GET', /^\/api\/settings-options$/, async (q, r) => send(r, 200, { languages: LANGS.map(([code, label]) => ({ code, label })), themes: ['light', 'dark'] }));
route('POST', /^\/api\/preferences$/, async (q, r) => { const b = await readJson(q); const s = db().settings; if (b.language !== undefined) { if (!LANGS.some(([c]) => c === b.language)) return fail(r, 400, 'idioma inválido'); s.language = b.language; } if (b.theme !== undefined) { if (!['light', 'dark'].includes(b.theme)) return fail(r, 400, 'tema inválido'); s.theme = b.theme; } S.save(); send(r, 200, { ok: true, language: s.language, theme: s.theme }); });
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
  } catch (e) { fail(r, 502, `Falha ao criar a skill com IA: ${String(e.message || e).slice(0, 200)}`); }
});
// notificações locais (o original tem central de anúncios editoriais + contador de não lidas; aqui: eventos do próprio app)
const notes = () => (db().notifications ||= []);
const notify = (title, body, kind = 'info') => { notes().unshift({ id: S.newId(), title, body, kind, at: new Date().toISOString(), read: false }); if (notes().length > 100) notes().length = 100; S.save(); };
// ---- provedores de mídia + tarefas de geração (src/providers.mjs, app/lib/jobs.mjs, app/lib/compose.mjs)
const saveBuffer = (name, bytes, kind, cat) => { const tmp = S.pubFile('_job_' + S.newId() + path.extname(name)); fs.writeFileSync(tmp, bytes); const a = addAsset(name, tmp, kind, cat); try { fs.unlinkSync(tmp); } catch {} return a; };
const readAssetBytes = (id) => { const a = db().assets.find((x) => x.id === id); if (!a || !fs.existsSync(S.pubFile(a.stored))) return null; return { bytes: fs.readFileSync(S.pubFile(a.stored)), mime: ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.wma': 'audio/x-ms-wma' })[path.extname(a.stored || a.name || '').toLowerCase()] || (a.kind === 'image' ? 'image/png' : 'application/octet-stream'), name: a.name }; };
const lastFrameOf = (assetId) => { try { const a = db().assets.find((x) => x.id === assetId); const out = S.pubFile(`_lf_${S.newId()}.png`); media.lastFrame(S.pubFile(a.stored), out); const b = fs.readFileSync(out); try { fs.unlinkSync(out); } catch {} return b; } catch { return null; } };
// ---- Foto falante com lip-sync por provedor externo (orçamento + consentimento por tarefa; lib/talkingphoto.mjs). O bloqueio de gasto é DO SERVIDOR: a interface não o contorna.
const tpInfoOf = (inputs) => ({ image: { sha: inputs.imageSha, size: inputs.imageSize, width: inputs.width, height: inputs.height }, audio: { sha: inputs.audioSha, size: inputs.audioSize }, audioSeconds: inputs.audioSeconds });
const tpQuote = (job) => TPH.buildQuote(db().settings, job.inputs || {}, tpInfoOf(job.inputs || {}));
const tpSummary = (qt) => (qt?.ok ? { digest: qt.digest, provider: qt.provider, seconds: qt.seconds, cost: qt.cost, maxCostPerTask: qt.maxCostPerTask, overLimit: qt.overLimit, limits: qt.limits, accepted: qt.accepted, ignored: qt.ignored, warnings: qt.warnings, needsConsent: true, needsUnknownCostAck: qt.needsUnknownCostAck } : { ok: false, reason: qt?.reason });
const jobsMgr = new JobManager({ db, save: () => S.save(), newId: S.newId, media, readAsset: readAssetBytes, lastFrameOf, saveAsset: saveBuffer, consentProblem: (job, cfg) => TPH.consentProblem(job, tpQuote(job), cfg), onDone: (job) => { afterJob(job).catch(() => {}); }, pollMs: Number(process.env.PIPPIT_JOB_POLL_MS ?? 5000) });
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
  const cfg = PV.resolveProviders(db().settings).audio; const ad = cfg && PV.adapterFor('audio', cfg.adapter);
  if (ad && !ad.local && PV.isConfigured(cfg, 'audio') && cfg.allowSpend === true) { const o = await ad.synth(cfg, { text, voice, fetchImpl: fetch }); return { asset: saveBuffer(`narracao.${o.ext}`, o.bytes, 'audio', 'works'), label: `${cfg.adapter} (${cfg.model})` }; }
  if (media.ttsAvailable()) { const out = S.pubFile(`_tts_${S.newId()}.wav`); media.ttsLocal(text, out, { voice: cfg?.voice }); const a = addAsset('narracao.wav', out, 'audio', 'works'); try { fs.unlinkSync(out); } catch {} return { asset: a, label: 'voz local SAPI (não-IA)' }; }
  return null;
}
route('GET', /^\/api\/providers$/, async (q, r) => send(r, 200, { providers: PV.publicProviders(db().settings), allowSpend: Object.fromEntries(PV.KINDS.map((k) => [k, PV.resolveProviders(db().settings)[k]?.allowSpend === true])), note: 'Provedores do USUÁRIO (URL/modelo/chave ficam só neste computador). Chamadas podem ser pagas no provedor; nada é enviado sem "Autorizo chamadas pagas". Não são os modelos nem as credenciais do Pippit.' }));
route('POST', /^\/api\/providers\/(video|audio|image|talkingphoto)$/, async (q, r, m) => {
  const b = await readJson(q); const kind = m[1]; const st = (db().settings.providers ||= {}); const cur = st[kind] || (kind === 'image' ? PV.resolveProviders(db().settings).image : null) || {};
  const next = { ...cur, adapter: b.adapter ?? cur.adapter, baseUrl: b.baseUrl ?? cur.baseUrl, model: b.model ?? cur.model, voice: b.voice ?? cur.voice, size: b.size ?? cur.size, inputMap: b.inputMap ?? cur.inputMap, extraInput: b.extraInput ?? cur.extraInput };
  if (kind === 'talkingphoto') for (const k of ['inputMap', 'paramMap', 'costPerSecond', 'currency', 'maxCostPerTask', 'maxAudioSeconds']) next[k] = k in b ? b[k] : cur[k]; for (const k of ['costPerSecond', 'maxCostPerTask', 'maxAudioSeconds']) if (typeof next[k] === 'string' && next[k].trim() !== '' && Number.isFinite(Number(next[k]))) next[k] = Number(next[k]); // custo/limites são informados PELO USUÁRIO (o PiperLine não consulta preços)
  if ('apiKey' in b && String(b.apiKey).trim()) next.apiKey = String(b.apiKey).trim().slice(0, 400); if ('allowSpend' in b) next.allowSpend = b.allowSpend === true;
  const err = PV.validateConfig(kind, next); if (err) return fail(r, 400, err); st[kind] = next; S.save(); await jobsMgr.tick(); send(r, 200, { ok: true });
});
route('DELETE', /^\/api\/providers\/(video|audio|image|talkingphoto)$/, async (q, r, m) => { if (db().settings.providers) delete db().settings.providers[m[1]]; if (m[1] === 'image') delete db().settings.imageProvider; S.save(); send(r, 200, { ok: true }); });
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
route('GET', /^\/api\/notifications$/, async (q, r) => send(r, 200, { items: notes(), unread: notes().filter((n) => !n.read).length }));
route('POST', /^\/api\/notifications\/read-all$/, async (q, r) => { notes().forEach((n) => (n.read = true)); S.save(); send(r, 200, { ok: true, unread: 0 }); });
route('GET', /^\/api\/projects$/, async (q, r) => send(r, 200, db().projects.map((p) => ({ id: p.id, title: p.title, type: p.type, updatedAt: p.updatedAt, subtitle: p.type === 'canvas' ? 'Tela' : p.type === 'direct' ? 'Geração direta' : p.type, href: p.direct ? `/direct/${p.id}/${p.direct.canvasId}/${p.direct.runId}` : undefined }))));
route('POST', /^\/api\/projects$/, async (q, r) => { const b = await readJson(q); send(r, 200, newProject(b.type || 'canvas', b.title)); });
route('GET', /^\/api\/projects\/(\d+)$/, async (q, r, m) => send(r, 200, project(m[1])));
route('PATCH', /^\/api\/projects\/(\d+)$/, async (q, r, m) => { const b = await readJson(q); const p = project(m[1]); if (b.title) p.title = String(b.title).slice(0, 120); if (b.ratio) p.ratio = b.ratio; if ('style' in b) { if (b.style === null || b.style === '') p.style = null; else { if (!STYLES.todos.includes(b.style)) return fail(r, 400, 'estilo inexistente na Biblioteca de estilos'); p.style = b.style; } } touch(p); send(r, 200, p); });
route('GET', /^\/api\/style-library$/, async (q, r) => send(r, 200, STYLES));
route('DELETE', /^\/api\/projects\/(\d+)$/, async (q, r, m) => { const d = db(); d.projects = d.projects.filter((p) => p.id !== m[1]); S.save(); send(r, 200, { ok: true }); });
route('POST', /^\/api\/projects\/(\d+)\/share$/, async (q, r, m) => { const p = project(m[1]); const t = S.newId(); db().shares[t] = p.id; S.save(); send(r, 200, { link: `http://127.0.0.1:${PORT}/#/share/${t}`, message: 'Link copiado. Compartilhe com seus amigos para que eles possam ver todo o processo de criação.' }); });
route('GET', /^\/api\/share\/(\d+)$/, async (q, r, m) => { const id = db().shares[m[1]]; if (!id) return fail(r, 404, 'link inválido'); send(r, 200, { readOnly: true, project: project(id) }); });
route('POST', /^\/api\/projects\/(\d+)\/nodes$/, async (q, r, m) => { const b = await readJson(q); if (!NODE_TYPES.includes(b.type)) return fail(r, 400, 'tipo de nó desconhecido'); send(r, 200, addNode(project(m[1]), b.type, b.title)); });
route('PATCH', /^\/api\/projects\/(\d+)\/nodes\/([\w]+)$/, async (q, r, m) => { const p = project(m[1]); const n = p.canvas.nodes.find((x) => x.id === m[2]); if (!n) return fail(r, 404, 'nó inexistente'); const b = await readJson(q); for (const k of ['title', 'text', 'x', 'y', 'assetId', 'panel', 'description', 'episodes', 'voice', 'scene']) if (k in b) n[k] = b[k]; if (b.assetId) { n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); } touch(p); send(r, 200, n); });
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
  if (kind === 'video' && PV.isConfigured(PV.resolveProviders(db().settings).video, 'video')) { // provedor de vídeo do usuário: cria TAREFA (assíncrona, persistente)
    const prompt = String(panel.prompt || n.text || '').trim(); if (prompt.length < 15) return fail(r, 400, 'Your prompt must contain at least 15 characters. Please provide a more detailed description.');
    const job = jobsMgr.create({ title: `${p.id}_${n.id}`, prompt, params: { seconds: Number(panel.seconds) || 5, ratio: panel.ratio || '9:16' }, source: { type: 'node', projectId: p.id, nodeId: n.id }, referenceAssetId: n.assetId && /\.(png|jpe?g|webp)$/i.test(db().assets.find((x) => x.id === n.assetId)?.stored || '') ? n.assetId : undefined }); await jobsMgr.tick();
    return send(r, 202, { ok: true, queued: true, job: jobView(job), note: job.state === 'blocked' ? `A tarefa foi criada mas não enviada: ${job.error}` : 'Tarefa enviada ao provedor; acompanhe em Tarefas.' });
  }
  if (kind === 'video' && provider === 'local-ffmpeg' && media.available()) {
    const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.mp4`); const ref = n.assetId && /\.(png|jpe?g|webp)$/i.test(db().assets.find((x) => x.id === n.assetId)?.stored || '') ? assetPath(n.assetId) : null;
    const info = media.generateLocalVideo(out, { seconds: Number(panel.seconds) || 5, ratio: panel.ratio, image: ref }); const a = addAsset(`${n.title}.mp4`, out, 'video', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
    return send(r, 200, { ok: true, provider: 'local-ffmpeg (não-IA)', asset: a, creditsCharged: 0, info });
  }
  if (kind === 'audio' && provider === 'local-ffmpeg' && media.ttsAvailable()) { // voz sintética local do Windows (SAPI, não-IA; vozes en-US): NÃO é o Seed Audio do Pippit
    const text = String(panel.prompt || n.text || '').trim(); if (!text) return fail(r, 400, 'Descreva o texto a falar');
    const out = path.join(S.FILES_DIR, `${p.id}_${n.id}_${Date.now()}.wav`);
    try { media.ttsLocal(text, out, { voice: panel.voice, rate: panel.rate }); } catch (e) { return fail(r, 500, String(e.message || e).slice(0, 300)); }
    const a = addAsset(`${n.title}.wav`, out, 'audio', 'works'); n.assetId = a.id; n.hasMedia = true; n.tools.forEach((t) => (t.enabled = true)); touch(p);
    return send(r, 200, { ok: true, provider: 'voz local do Windows (SAPI, não-IA)', asset: a, creditsCharged: 0 });
  }
  const ipc = PV.resolveProviders(db().settings).image;
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
  try {
    let info; if (opts) { const base = out + '.base.mp4'; media.exportTimeline(p.timeline, assetPath, base); try { info = media.finalize(base, out, opts); } finally { try { fs.unlinkSync(base); } catch {} } } else info = media.exportTimeline(p.timeline, assetPath, out);
    const a = addAsset(`${name}.${ext}`, out, 'video', 'works');
    // projeto de edição vindo de um nó do Canvas: o resultado volta ao Canvas de origem como novo nó de vídeo ligado ao nó original
    let linked = null; if (p.origin) { const op = db().projects.find((x) => x.id === p.origin.projectId); const src = op?.canvas.nodes.find((x) => x.id === p.origin.nodeId); if (op) { const nn = addNode(op, 'Vídeo', `${name} (editado)`, { assetId: a.id, hasMedia: true, editedFrom: p.origin.nodeId, editorId: p.id }); nn.tools?.forEach((t) => (t.enabled = true)); if (src) linkId(op, src.id, nn.id); linked = { projectId: op.id, nodeId: nn.id }; touch(op); } }
    send(r, 200, { ok: true, asset: a, info, linked });
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
// Legendas automaticas: whisper.cpp do ffmpeg com um modelo ggml escolhido/baixado pelo usuario (settings.whisperModel). Sem modelo: 501 com instrucoes (nada e baixado automaticamente).
route('POST', /^\/api\/editor\/(\d+)\/captions-auto$/, async (q, r, m) => {
  const p = project(m[1]); const tl = p.timeline; if (!tl?.clips?.length) return fail(r, 400, 'timeline vazia'); const model = db().settings.whisperModel;
  if (!media.whisperAvailable()) return fail(r, 501, 'Este ffmpeg não tem o filtro whisper (whisper.cpp).', { blocked: true });
  if (!model || !fs.existsSync(model)) return fail(r, 501, 'Legendas automáticas exigem um modelo Whisper (ggml, ex.: ggml-base.bin). Baixe-o você mesmo (ex.: huggingface.co/ggerganov/whisper.cpp) e informe o caminho em Configurações > Assistente de IA (campo "Modelo Whisper"). Nada é baixado automaticamente.', { blocked: true, needs: 'whisperModel' });
  const b = await readJson(q); const language = /^[a-z]{2,3}$|^auto$/.test(b.language || '') ? b.language : 'auto'; const caps = []; let offset = 0;
  try {
    for (const c of tl.clips) {
      const file = assetPath(c.assetId); const t0 = c.in || 0; const t1 = c.out || media.probe(file).duration; const sp = c.speed || 1; const srt = S.pubFile(`_cap_${Date.now()}.srt`);
      if (media.probe(file).hasAudio && !c.mute) { media.transcribeSrt(file, srt, { model, language }); for (const x of media.parseSrt(fs.readFileSync(srt, 'utf8'))) { if (x.end <= t0 || x.start >= t1) continue; caps.push({ text: x.text, start: Math.round((offset + (Math.max(x.start, t0) - t0) / sp) * 100) / 100, end: Math.round((offset + (Math.min(x.end, t1) - t0) / sp) * 100) / 100 }); } }
      try { fs.unlinkSync(srt); } catch {} offset += (t1 - t0) / sp;
    }
  } catch (e) { return fail(r, 500, String(e.message || e).slice(0, 400)); }
  tl.captions = [...(tl.captions || []), ...caps]; touch(p); send(r, 200, { ok: true, captions: caps.length, timeline: tl });
});
route('POST', /^\/api\/editor\/(\d+)\/quick-cut$/, async (q, r) => fail(r, 501, 'Corte rápido POR TEXTO exige transcrição (modelo Whisper) e edição por palavras; use "Remover silêncios" ou configure o modelo Whisper e gere as legendas automáticas.', { blocked: true }));
// redes sociais: OAuth externo nao reproduzivel localmente; estados e limites sim
// favoritos do drawer Avatar video: o ícone de favorito aparece ao passar o mouse sobre o tile (observado); a aba Favorites vazia mostra "No favorite avatar yet" (observado). A persistência/ação em si NÃO foi observada (favoritar altera a conta): comportamento local inferido.
const favs = () => (db().avatars.favorites ||= []);
route('GET', /^\/api\/avatar-favorites$/, async (q, r) => send(r, 200, { ok: true, favorites: favs() }));
route('POST', /^\/api\/avatar-favorites$/, async (q, r) => { const b = await readJson(q); const n = String(b.name || '').trim().slice(0, 120); if (!n) return fail(r, 400, 'nome do avatar ausente'); const i = favs().indexOf(n); if (b.on === false) { if (i >= 0) favs().splice(i, 1); } else if (i < 0) { if (favs().length >= 500) return fail(r, 409, 'limite de favoritos'); favs().unshift(n); } S.save(); send(r, 200, { ok: true, favorites: favs() }); });
route('GET', /^\/api\/avatar-drawer$/, async (q, r) => { const d = JSON.parse(fs.readFileSync(new URL('./lib/avatar_drawer_data.json', import.meta.url), 'utf8')); try { d.catalogo = JSON.parse(fs.readFileSync(new URL('./lib/avatar_catalog.json', import.meta.url), 'utf8')); } catch { d.catalogo = null; } send(r, 200, d); });
route('GET', /^\/api\/social$/, async (q, r) => send(r, 200, { limit: db().social.limit, accounts: db().social.accounts, platforms: ['TikTok', 'YouTube', 'Facebook (Página)', 'Instagram (Reels)', 'TikTok Shop (criador)', 'TikTok Shop (vendedor)', 'Shopify', 'Google Drive', 'Dropbox'], note: 'Vincular exige OAuth real de cada rede (app registrado e revisado); não implementado.' }));
route('POST', /^\/api\/social\/connect$/, async (q, r) => fail(r, 501, 'Vincular conta exige OAuth da rede social com aplicativo registrado; bloqueado nesta instalação local.', { blocked: true }));
route('POST', /^\/api\/social\/publish$/, async (q, r) => fail(r, 409, 'Nenhuma conta vinculada: publicação indisponível.', { blocked: true }));
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
  if (!media.available() || (!up && !media.ttsAvailable())) return fail(r, 503, 'A prévia local exige ffmpeg' + (up ? '.' : ' e a voz do Windows (SAPI); indisponíveis nesta máquina.'), { blocked: true });
  try {
    let audio, wav; if (up) audio = up; else { wav = S.pubFile(`_tp_${S.newId()}.wav`); media.ttsLocal(text, wav, { voice: b.voice }); audio = addAsset('locucao.wav', wav, 'audio', 'works'); }
    const mp4 = S.pubFile(`_tp_${S.newId()}.mp4`); media.stillWithAudio(S.pubFile(a.stored), S.pubFile(audio.stored), mp4); const video = addAsset('Foto falante (prévia local sem animação labial).mp4', mp4, 'video', 'works'); for (const f of [wav, mp4]) try { if (f) fs.unlinkSync(f); } catch {}
    const dur = media.probe(S.pubFile(audio.stored)).duration; const tab = up ? 'voiceover' : 'tts';
    // `wire`: parâmetros de exportação que o Pippit montaria (contrato Omni); IDs são locais e NADA é enviado ao Pippit
    const wire = TP.exportParams({ audio: TP.audioExportParams({ tab, material: { vid: audio.id, uri: undefined, duration: dur }, ttsEndTimeSeconds: dur }), image: { uri: a.id }, gesturePrompt: gesture, tab, script: text || undefined });
    send(r, 200, { ok: true, video, audio, creditsCharged: 0, wire, gestureApplied: false, label: 'Prévia local: foto estática com ' + (up ? 'o áudio enviado' : 'a voz do Windows') + '. NÃO há animação labial nem IA' + (gesture ? '; o gesto/movimento descrito não é aplicado.' : '.') });
  } catch (e) { fail(r, 500, String(e.message || e).slice(0, 300)); }
});
// ---- LLM (planejador do agente, skills com IA, refinamento de prompt, Criação Inteligente). Padrão: Ollama local autodetectado; configurável (compatível com OpenAI).
const publicSettings = (st) => ({ ...st, llm: st.llm ? { ...st.llm, apiKey: undefined, hasKey: !!st.llm.apiKey } : undefined, imageProvider: st.imageProvider ? { ...st.imageProvider, apiKey: undefined, hasKey: !!st.imageProvider.apiKey } : undefined, providers: st.providers ? Object.fromEntries(Object.entries(st.providers).map(([k, v]) => [k, { ...v, apiKey: undefined, hasKey: !!v.apiKey }])) : undefined });
let llmCache = { key: '', at: 0, client: null, source: 'none', models: [], error: null };
async function getLLM(force = false) {
  const cfg = db().settings.llm || {}; const key = JSON.stringify(cfg); if (cfg.enabled === false) return null;
  if (process.env.PIPPIT_LLM === 'off' && !cfg.model) { llmCache = { key, at: Date.now(), client: null, source: 'auto', models: [], error: 'autodetecção desativada (PIPPIT_LLM=off)' }; return null; } // usado pelos testes para ficarem determinísticos
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
route('GET', /^\/api\/llm\/status$/, async (q, r) => { const c = await getLLM(true); const cfg = db().settings.llm || {}; send(r, 200, { enabled: cfg.enabled !== false, source: llmCache.source, label: c?.label || null, reachable: !!c, baseUrl: cfg.baseUrl || DEFAULT_BASE_URL, model: cfg.model || c?.model || null, hasKey: !!cfg.apiKey, whisperModel: db().settings.whisperModel || null, whisperFilter: media.whisperAvailable(), models: llmCache.models, error: llmCache.error, note: 'Planejador do agente, skills com IA, refinamento de prompt e Criação Inteligente usam este LLM; sem ele, o agente usa regras locais. Não é o LLM do Pippit.' }); });
route('POST', /^\/api\/llm\/config$/, async (q, r) => {
  const b = await readJson(q); const cur = db().settings.llm || {}; const next = { ...cur };
  if ('enabled' in b) next.enabled = !!b.enabled; if ('model' in b) next.model = String(b.model || '').trim().slice(0, 120) || undefined; if ('apiKey' in b) next.apiKey = String(b.apiKey || '').trim().slice(0, 300) || undefined;
  if ('baseUrl' in b) { const u = String(b.baseUrl || '').trim(); if (u && !/^https?:\/\/[^\s]+$/i.test(u)) return fail(r, 400, 'baseUrl inválida (use http(s)://…/v1)'); next.baseUrl = u || undefined; }
  if ('native' in b) next.native = b.native === null ? undefined : !!b.native; if ('keepAlive' in b) { const k = String(b.keepAlive || '').trim(); if (k && !/^(-1|\d+(s|m|h)?)$/.test(k)) return fail(r, 400, 'keepAlive inválido (ex.: 30m, 1h, -1)'); next.keepAlive = k || undefined; }
  if ('options' in b) { const o = b.options; if (o !== null && (typeof o !== 'object' || Array.isArray(o))) return fail(r, 400, 'options deve ser um objeto'); const okKeys = ['num_thread', 'num_gpu', 'num_ctx', 'num_batch', 'top_k', 'top_p', 'repeat_penalty']; const clean = {}; for (const [k, v] of Object.entries(o || {})) { if (!okKeys.includes(k) || typeof v !== 'number' || !Number.isFinite(v)) return fail(r, 400, `opção inválida: ${k} (permitidas: ${okKeys.join(', ')})`); clean[k] = v; } next.options = o ? clean : undefined; }
  if ('whisperModel' in b) { const w = String(b.whisperModel || '').trim(); if (w && !fs.existsSync(w)) return fail(r, 400, 'arquivo do modelo Whisper não encontrado'); db().settings.whisperModel = w || undefined; }
  db().settings.llm = next; S.save(); llmCache.key = ''; send(r, 200, { ok: true });
});
route('GET', /^\/api\/image-provider$/, async (q, r) => { const c = db().settings.imageProvider || {}; send(r, 200, { configured: !!(c.baseUrl && c.model), baseUrl: c.baseUrl || '', model: c.model || '', hasKey: !!c.apiKey, note: 'Provedor de imagem do USUÁRIO (API compatível com OpenAI /images/generations); não são os modelos do Pippit. Chave e URL ficam só neste computador.' }); });
route('POST', /^\/api\/image-provider$/, async (q, r) => { const b = await readJson(q); const cur = db().settings.imageProvider || {}; const next = { ...cur }; if ('baseUrl' in b) { const u = String(b.baseUrl || '').trim(); if (u && !/^https?:\/\/[^\s]+$/i.test(u)) return fail(r, 400, 'baseUrl inválida'); next.baseUrl = u || undefined; } if ('model' in b) next.model = String(b.model || '').trim().slice(0, 120) || undefined; if ('apiKey' in b) next.apiKey = String(b.apiKey || '').trim().slice(0, 300) || undefined; db().settings.imageProvider = next; S.save(); send(r, 200, { ok: true }); });
route('POST', /^\/api\/llm\/test$/, async (q, r) => { const c = await getLLM(true); if (!c) return fail(r, 503, `Nenhum LLM disponível${llmCache.error ? ': ' + llmCache.error : ''}`); const t0 = Date.now(); try { const text = await c.chat([{ role: 'user', content: 'Responda apenas com a palavra: pronto' }], { maxTokens: 20, temperature: 0 }); send(r, 200, { ok: true, label: c.label, text: text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(), ms: Date.now() - t0 }); } catch (e) { fail(r, 502, String(e.message || e)); } });
const needLLM = async (r) => { const c = await getLLM(); if (!c) { fail(r, 503, `Nenhum LLM disponível${llmCache.error ? ' (' + llmCache.error + ')' : ''}. Inicie o Ollama com um modelo ou configure um servidor compatível em Configurações > LLM.`); return null; } return c; };
route('POST', /^\/api\/prompt\/refine$/, async (q, r) => { const b = await readJson(q); const text = String(b.text || '').trim(); if (text.length < 3) return fail(r, 400, 'Digite uma ideia'); const c = await needLLM(r); if (!c) return; try { send(r, 200, { prompt: await llmRefinePrompt(c, text, b.kind === 'image' ? 'imagem' : 'vídeo'), label: c.label }); } catch (e) { fail(r, 502, `Falha ao refinar: ${String(e.message || e).slice(0, 200)}`); } });
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
