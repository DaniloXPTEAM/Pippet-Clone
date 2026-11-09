// Preferências (18 idiomas + claro/escuro), skills (favoritos e manuais) e notificações locais (eventos de geração), pela API HTTP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-feat-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5197; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// idioma/tema
const opt = (await j('/api/settings-options')).body; assert.equal(opt.languages.length, 18); assert.deepEqual(opt.languages.map((l) => l.label).slice(0, 4), ['Bahasa Indonesia', 'Bahasa Melayu', 'Deutsch', 'English']); assert.ok(opt.languages.some((l) => l.label === '한국어'));
assert.equal((await post('/api/preferences', { language: 'xx' })).status, 400); assert.equal((await post('/api/preferences', { theme: 'blue' })).status, 400);
assert.equal((await post('/api/preferences', { language: 'ja', theme: 'dark' })).status, 200); const st = (await j('/api/state')).body; assert.equal(st.settings.language, 'ja'); assert.equal(st.settings.theme, 'dark');

// skills: manual + favoritos
assert.equal((await post('/api/skills/custom', { name: '', description: 'd', content: 'x' })).status, 400); assert.equal((await post('/api/skills/custom', { name: 'a'.repeat(21), description: 'd', content: 'x' })).status, 400); assert.equal((await post('/api/skills/custom', { name: 'ok', description: 'd' })).status, 400);
const sk = (await post('/api/skills/custom', { name: 'Anúncio curto', description: 'd', content: 'Sempre gere 15 s em 9:16.' })).body; assert.match(sk.id, /^custom-/); assert.equal(sk.tag, 'Minhas skills');
let ss = (await post('/api/skills/favorite', { id: sk.id, on: true })).body; assert.deepEqual(ss.favorites, [sk.id]); ss = (await post('/api/skills/favorite', { id: 'drama-ads', on: true })).body; assert.equal(ss.favorites.length, 2);
ss = (await post('/api/skills/favorite', { id: sk.id, on: false })).body; assert.deepEqual(ss.favorites, ['drama-ads']); assert.equal((await post('/api/skills/favorite', {})).status, 400);
ss = (await post('/api/skills/favorite', { id: sk.id, on: true })).body; ss = (await j('/api/skills/custom/' + sk.id, { method: 'DELETE' })).body; assert.equal(ss.custom.length, 0); assert.ok(!ss.favorites.includes(sk.id), 'excluir remove dos favoritos');

// notificações: uma geração direta com prompt curto falha -> notificação não lida; "Todas lidas" zera
assert.deepEqual((await j('/api/notifications')).body, { items: [], unread: 0 });
const pr = (await post('/api/biz/v1/agent/create_creative_project', { user_info: { consumer_uid: 'u' } })).body.data.project_id; const cv = (await post('/api/biz/v1/asset/batch_generate_asset_id')).body.data.ids[0];
await post('/api/biz/v1/asset/namespace_create', { namespace_data: [{ FileName: 'canvas.json', PippitAssetID: cv, ProjectID: String(pr) }] });
await post('/api/biz/v1/agent/submit_run', { project_id: pr, message: { content: [{ type: 'data', data: JSON.stringify({ param: JSON.stringify({ prompt: 'red apple', ratio: '9:16', resolution: '768p', model: 'MiniMax-H3-trial', duration_sec: 4 }), extra: '{}', tool_name: 'biz/x_tool_name_video_part' }), sub_type: 'biz/x_data_direct_tool_call_req' }], role: 'user', thread_id: `canvas_thread_${cv}_pippit_video_part_agent`, run_id: 'n1', created_at: 1, message_id: 'm1' }, user_info: {}, agent_name: 'pippit_video_part_agent', concurrency_control: { policy: 1, conflict_key: 'node-n1' }, run_extra: '{}' });
for (let i = 0; i < 50 && !(await j('/api/notifications')).body.unread; i++) await sleep(100); let nt = (await j('/api/notifications')).body; assert.equal(nt.unread, 1); assert.equal(nt.items[0].title, 'Falha na geração'); assert.match(nt.items[0].body, /at least 15 characters/); assert.equal(nt.items[0].kind, 'error');
assert.equal((await post('/api/notifications/read-all')).body.unread, 0); nt = (await j('/api/notifications')).body; assert.equal(nt.unread, 0); assert.equal(nt.items.length, 1);
console.log('OK features: 18 idiomas e tema, skills (manual/favoritos), notificações de geração'); server.close(); process.exit(0);
