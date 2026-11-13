// Teste de ponta a ponta da aplicacao local (HTTP + ffmpeg reais). Dados em diretorio temporario.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-e2e-'));
process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
const media = await import('../app/lib/media.mjs');
const PORT = 5193; await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const put = (p, b) => j(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const upload = (p, buf, headers) => j(p, { method: 'POST', headers, body: buf });
assert.ok(media.available(), 'ffmpeg necessario para o e2e');
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return fs.readFileSync(out); };

// 1. creditos: bonus de criacao +200, diario +80, ledger com lotes
let st = (await j('/api/state')).body; assert.equal(st.balance, 200); assert.equal(st.plan.id, 'free');
assert.equal((await post('/api/daily-claim')).body.claimed, true); assert.equal((await post('/api/daily-claim')).body.claimed, false);
assert.equal((await j('/api/state')).body.balance, 280);

// 2. canvas: nos, ferramentas desabilitadas, geracao bloqueada sem provedor (sem debito, sem resultado ficticio)
const proj = (await post('/api/projects', { type: 'canvas' })).body; assert.equal(proj.title, 'PROJECT');
const vnode = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Vídeo' })).body; assert.ok(vnode.tools.every((t) => !t.enabled));
assert.equal((await post(`/api/projects/${proj.id}/nodes`, { type: 'Inexistente' })).status, 400);
let g = await post(`/api/projects/${proj.id}/nodes/${vnode.id}/generate`, { kind: 'video', model: 'seedance-2.5', seconds: 10 });
assert.equal(g.status, 409); assert.equal(g.body.blocked, true); assert.equal(g.body.wouldCost, 370); assert.equal(g.body.creditsCharged, 0);
assert.equal((await j('/api/state')).body.balance, 280);
// provedor local (nao-IA) ligado: gera arquivo real
await post('/api/settings', { provider: 'local-ffmpeg' });
g = await post(`/api/projects/${proj.id}/nodes/${vnode.id}/generate`, { kind: 'video', ratio: '9:16', seconds: 3 });
assert.equal(g.status, 200); assert.equal(g.body.creditsCharged, 0); assert.ok(Math.abs(g.body.info.duration - 3) < 0.3); assert.equal(g.body.info.height, 1280);
const pj = (await j(`/api/projects/${proj.id}`)).body; assert.ok(pj.canvas.nodes.find((n) => n.id === vnode.id).tools.every((t) => t.enabled));

// 3. agente: pergunta -> design/storyboard -> confirmacao -> segmentos de 15 s -> render
await post('/api/settings', { provider: 'none' });
const chat = (await post(`/api/projects/${proj.id}/chats`)).body;
let m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Gere um vídeo viral de animação 3d para crianças com a personagem Gabi. Duração: 20 s' })).body;
let last = m.chat.messages.at(-1); assert.equal(last.form.type, 'question'); assert.equal(last.form.options.length, 4); assert.ok(last.steps.some((s) => s.label === 'Habilidades carregadas'));
m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { answer: 'A aventura na floresta' })).body;
last = m.chat.messages.at(-1); assert.equal(last.form.type, 'confirm_production'); assert.equal(last.form.segments, 2);
const titles = m.project.canvas.nodes.map((n) => n.title); assert.ok(titles.includes('creative_design.md') && titles.includes('storyboard.md'));
const design = m.project.canvas.nodes.find((n) => n.title === 'creative_design.md').text; assert.match(design, /Duração total: 20 segundos/); assert.match(design, /Limite por chamada: 15 segundos/);
// limite de confirmacao de creditos (observado: 450): 20 s x 37 = 740 > 450 pede confirmacao antes de executar
m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { confirmation: { mode: 'sequencial' } })).body; assert.equal(m.chat.messages.at(-1).form.type, 'credit_confirm'); assert.equal(m.chat.messages.at(-1).form.estimatedCredits, 740);
// sem provedor: falha explicita, sem debito
m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { confirmation: { mode: 'sequencial', creditOk: true } })).body;
last = m.chat.messages.at(-1); assert.equal(last.steps.at(-1).state, 'warning'); assert.match(last.steps.at(-1).reason, /sem provedor de video configurado/); assert.match(last.text, /NÃO foram enviadas.*nada foi gerado nem cobrado/); assert.equal((await j('/api/state')).body.balance, 280);
{ const jobs = (await j('/api/jobs')).body; assert.equal(jobs.length, 2, 'uma tarefa por segmento'); assert.ok(jobs.every((x) => x.state === 'blocked' && /sem provedor/.test(x.error) && x.prompt.length > 30), 'tarefas preparadas com prompts, bloqueadas pelo motivo exato'); assert.ok(!(await j('/api/assets?cat=works')).body.some((a) => /final|animatic/.test(a.name)), 'nenhum vídeo apresentado sem geração real'); }
// com provedor local: executa de verdade (2 segmentos 15+5, ultimo quadro, concatenacao)
await post('/api/settings', { provider: 'local-ffmpeg' }); const chat2 = (await post(`/api/projects/${proj.id}/chats`)).body;
await post(`/api/projects/${proj.id}/chats/${chat2.id}/messages`, { text: 'Faça um vídeo de uma floresta encantada com a menina Gabi seguindo uma luz misteriosa e ajudando um coelhinho perdido, 20 segundos, com narração calma' });
m = (await post(`/api/projects/${proj.id}/chats/${chat2.id}/messages`, { confirmation: { mode: 'sequencial' } })).body; last = m.chat.messages.at(-1);
// o provedor local-ffmpeg NÃO é IA: produz um ANIMATIC (prévia do storyboard) e o diz claramente — nunca "vídeo gerado"/final
assert.ok(last.steps.some((s) => s.label === 'Animatic montado'), JSON.stringify(last)); assert.match(last.text, /NÃO um vídeo gerado por IA/);
const finalAsset = (await j('/api/assets?cat=works')).body.find((a) => a.name === 'animatic.mp4'); assert.ok(Math.abs(finalAsset.duration - 20) < 0.5, 'duracao do animatic ' + finalAsset.duration);
assert.equal(last.steps.filter((s) => /^Animatic gerado/.test(s.label)).length, 2); assert.ok(!last.steps.some((s) => s.label === 'Vídeo gerado' || s.label === 'Vídeo renderizado'), 'sem rótulos de vídeo gerado para o animatic');

// 4. avatares: validacao real da foto, consentimento, 3 usos gratuitos, paywall do video em avatar
const png = mk(['-f', 'lavfi', '-i', 'testsrc=size=512x512:rate=1', '-frames:v', '1'], path.join(tmp, 'face.png'));
const small = mk(['-f', 'lavfi', '-i', 'testsrc=size=200x200:rate=1', '-frames:v', '1'], path.join(tmp, 'small.png'));
assert.equal((await upload('/api/avatars/photo/verify', png, {})).body.ok, true); assert.equal((await upload('/api/avatars/photo/verify', small, {})).body.ok, false);
assert.equal((await upload('/api/avatars/photo', png, { 'x-consent': 'false', 'x-avatar-name': 'Crys' })).status, 400);
let a1 = await upload('/api/avatars/photo', png, { 'x-consent': 'true', 'x-avatar-name': 'Crys' }); assert.equal(a1.status, 200); assert.equal(a1.body.photoFreeUses, 2);
await upload('/api/avatars/photo', png, { 'x-consent': 'true', 'x-avatar-name': 'B' }); await upload('/api/avatars/photo', png, { 'x-consent': 'true', 'x-avatar-name': 'C' });
assert.equal((await upload('/api/avatars/photo', png, { 'x-consent': 'true', 'x-avatar-name': 'D' })).status, 402);
assert.equal((await post('/api/avatars/video')).status, 402); await post('/api/plan', { plan: 'starter' }); assert.equal((await post('/api/avatars/video')).status, 501);
assert.equal((await upload('/api/avatars/photo', png, { 'x-consent': 'true', 'x-avatar-name': 'E' })).status, 200); await post('/api/plan', { plan: 'free' });

// 5. editor: timeline com corte, texto e legenda; exportacao real
const vid = mk(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=6', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'a.mp4'));
const up = (await upload('/api/assets', vid, { 'x-file-name': 'a.mp4', 'content-type': 'video/mp4' })).body; assert.equal(up.kind, 'video'); assert.ok(Math.abs(up.duration - 6) < 0.3);
const ed = (await post('/api/editor')).body; assert.equal(ed.type, 'editor');
await put(`/api/editor/${ed.id}`, { ratio: '9:16', title: 'meu-corte', clips: [{ assetId: up.id, in: 1, out: 3 }, { assetId: up.id, in: 4, out: 6, speed: 2 }], texts: [{ text: 'Olá: mundo', start: 0, end: 2 }], captions: [{ text: 'legenda manual', start: 1, end: 2.5 }] });
const ex = await post(`/api/editor/${ed.id}/export`); assert.equal(ex.status, 200, JSON.stringify(ex.body)); assert.ok(Math.abs(ex.body.info.duration - 3) < 0.4, 'duracao export ' + ex.body.info.duration); assert.equal(ex.body.info.width, 720);
// opcoes do dialogo Export settings (observadas): nome obrigatorio (max 100), resolucao pelo lado menor, fps, formato, qualidade, marca d'agua
assert.equal((await post(`/api/editor/${ed.id}/export`, { name: '  ' })).status, 400); assert.equal((await post(`/api/editor/${ed.id}/export`, { name: 'x'.repeat(101) })).status, 400);
assert.equal((await post(`/api/editor/${ed.id}/export`, { name: 'a', resolution: '999p' })).status, 400); assert.equal((await post(`/api/editor/${ed.id}/export`, { name: 'a', fps: 31 })).status, 400);
const opt = await post(`/api/editor/${ed.id}/export`, { name: 'saida-360', resolution: '360p', fps: 24, format: 'mov', quality: 'faster', watermark: false });
assert.equal(opt.status, 200, JSON.stringify(opt.body)); assert.equal(opt.body.asset.name, 'saida-360.mov'); assert.equal(opt.body.info.width, 360); assert.equal(opt.body.info.height, 640); assert.equal(opt.body.info.fps, 24); assert.match(opt.body.info.container, /mov/); assert.equal(opt.body.info.options.watermark, false);
const opt2 = await post(`/api/editor/${ed.id}/export`, { name: 'saida-1080', resolution: '1080p', fps: 60, format: 'mp4', quality: 'better', watermark: true });
assert.equal(opt2.status, 200, JSON.stringify(opt2.body)); assert.equal(opt2.body.info.width, 1080); assert.equal(opt2.body.info.height, 1920); assert.equal(opt2.body.info.fps, 60); assert.equal(opt2.body.asset.name, 'saida-1080.mp4');
assert.equal((await j('/api/editor-export-options')).body.defaults.resolution, '720p');
assert.equal((await post(`/api/editor/${ed.id}/captions-auto`)).status, 501);
assert.equal((await post(`/api/editor/${(await post('/api/editor')).body.id}/export`)).status, 400);

// 6. historico: renomear, compartilhar (link), excluir; telemetria; redes sociais; configuracoes
await j(`/api/projects/${proj.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Renomeado' }) });
const sh = (await post(`/api/projects/${proj.id}/share`)).body; assert.match(sh.message, /Link copiado/); const tok = sh.link.split('/').pop(); assert.equal((await j(`/api/share/${tok}`)).body.readOnly, true);
const tu = (await j('/api/track-url?path=/home')).body.url; assert.match(tu, /event\/report\?is_pwa=0&pwa_from=not_pwa/); await fetch(tu); assert.ok((await j('/api/events')).body.some((e) => e.event_name === 'user_page_view'));
assert.equal((await post('/api/social/connect')).status, 400, 'sem canal do Link account = 400 (r19: só TikTok/Facebook Page/Instagram Reels)'); assert.equal((await post('/api/social/connect', { platform: 'TikTok' })).status, 501, 'canal do Link account segue bloqueado por OAuth real'); assert.equal((await post('/api/social/publish')).status, 409);
await post('/api/settings', { creditConfirm: { mode: 'ignore', limit: 450 } }); assert.equal((await j('/api/state')).body.settings.creditConfirm.mode, 'ignore');
await j(`/api/projects/${proj.id}`, { method: 'DELETE' }); assert.ok(!(await j('/api/projects')).body.some((p) => p.id === proj.id));
console.log('OK e2e: creditos, canvas, geracao bloqueada sem provedor, agente (pergunta/design/storyboard/confirmacao/segmentos/render real), avatar (validacao/consentimento/3 usos/paywall), editor (corte/texto/legenda/exportacao real), historico/compartilhar, telemetria, social bloqueado');
server.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
