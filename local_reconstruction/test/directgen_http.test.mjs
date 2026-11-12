// Fluxo HTTP da geracao direta (mesma sequencia observada no HAR do Pippit): check -> create_creative_project -> namespace_create -> submit_run -> SSE/polling -> resultado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-direct-'));
process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
const media = await import('../app/lib/media.mjs');
const PORT = 5195; await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;
const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); return { status: r.status, body: await r.json() }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readSse = async (p, b, ms = 700) => { const ac = new AbortController(); const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: ac.signal }); assert.match(r.headers.get('content-type'), /text\/event-stream/); const rd = r.body.getReader(); let t = ''; const end = Date.now() + ms; try { while (Date.now() < end) { const x = await Promise.race([rd.read(), sleep(ms)]); if (!x || x.done || !x.value) break; t += Buffer.from(x.value).toString('utf8'); } } catch {} ac.abort(); return t; };
const connectSse = async (p, b) => { const ac = new AbortController(); const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: ac.signal }); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/event-stream/); const rd = r.body.getReader(); let text = ''; let ended = false; const pump = (async () => { try { while (!ended) { const x = await rd.read(); if (x.done) break; text += Buffer.from(x.value).toString('utf8'); } } catch {} })(); return { get text() { return text; }, async until(re, ms = 3000) { const end = Date.now() + ms; while (!re.test(text)) { if (Date.now() >= end) throw new Error(`SSE timeout; wanted ${re}, got ${text.slice(-1200)}`); await sleep(10); } return text; }, async close() { ended = true; ac.abort(); try { await rd.cancel(); } catch {} await pump; } }; };
const AGENT = 'pippit_video_part_agent', TOOL = 'biz/x_tool_name_video_part';
const submit = (projectId, canvasId, prompt, runId, seconds = 4) => post('/api/biz/v1/agent/submit_run', { project_id: projectId, message: { content: [{ type: 'data', data: JSON.stringify({ param: JSON.stringify({ prompt, images: [], ratio: '9:16', resolution: '768p', model: 'MiniMax-H3-trial', duration_sec: seconds }), extra: '{}', tool_name: TOOL }), sub_type: 'biz/x_data_direct_tool_call_req' }], role: 'user', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent`, run_id: runId, created_at: Date.now(), message_id: 'm-' + runId }, user_info: { consumer_uid: 'u' }, agent_name: AGENT, concurrency_control: { policy: 1, conflict_key: 'node-' + runId }, entrance_from: 'web_video_direct', run_extra: JSON.stringify({ babi_param: {}, client_extra: {} }), request_id: 'q-' + runId });
const open = async () => { const pr = (await post('/api/biz/v1/agent/create_creative_project', { user_info: { consumer_uid: 'u' } })).body; const pid = pr.data.project_id; const canvasId = (await post('/api/biz/v1/asset/batch_generate_asset_id')).body.data.ids[0]; const ns = await post('/api/biz/v1/asset/namespace_create', { Base: { Client: 'web' }, namespace_data: [{ FileName: 'canvas.json', PippitAssetID: canvasId, ProjectID: String(pid) }] }); assert.equal(ns.body.data.FileName, 'canvas.json'); return { pid, canvasId }; };

// credito inicial e check (200 de bonus nesta reconstrucao; o 125 do original e so da conta observada)
const cr0 = (await post('/commerce/v1/benefits/user_credit', {})).body; assert.equal(cr0.ret, '0'); const bal0 = cr0.data.credit.gift_credit; assert.ok(bal0 > 0);
const chk = (await post('/commerce/v3/benefits/batch_check_withhold_deduct', { action_type: 1, strict: true, item_list: [{ resource_type: 'aigc', resource_id: 'cc_biz_video_agent_minimaxh3_768p', benefit_type: 'cc_biz_video_agent_minimaxh3_trial_768p', amount: 1, high_precision_amount: 4, submit_id: '' }], client_check_group: [] })).body; assert.equal(chk.data.item_list[0].credits_amount, 12); assert.equal(chk.data.paywall, null);

// get_thread antes: ret 8
assert.equal((await post('/api/biz/v1/agent/get_thread', { thread_id: 'canvas_thread_0_pippit_video_part_agent', scopes: ['run_list.entry_list'] })).body.ret, '8');

// 1) prompt curto -> falha de validacao do servidor, sem debito
{ const { pid, canvasId } = await open(); const s = await submit(pid, canvasId, 'red apple', 'run-short'); assert.equal(s.body.data.run.state, 1);
  await sleep(900); const g = (await post('/api/biz/v1/agent/get_run', { scopes: ['entry_list'], run_id: 'run-short', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` })).body.data.run;
  assert.equal(g.state, 4); assert.match(g.fail_reason.detail, /at least 15 characters/); assert.equal(g.fail_reason.code, 99999);
  const sub = await readSse('/api/biz/v1/agent/subscribe_thread', { thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` }); assert.match(sub, /event:message\ndata:\{"run":null,"thread":\{/); assert.match(sub, /event:ping/);
  const as = await readSse('/api/biz/v1/asset/sse_asset', { asset_ids: [canvasId] }); assert.match(as, /event:ping\ndata:connected/); assert.match(as, /event:AssetJsonUpdate/);
  assert.equal((await post('/commerce/v1/benefits/user_credit', {})).body.data.credit.gift_credit, bal0); }

// 2) prompt valido, sem provedor -> falha explicita local, sem debito, sem resultado ficticio
{ const { pid, canvasId } = await open(); await submit(pid, canvasId, 'a red apple rotating on a white table', 'run-noprov'); await sleep(900);
  const g = (await post('/api/biz/v1/agent/get_run', { scopes: ['entry_list'], run_id: 'run-noprov', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` })).body.data.run; assert.equal(g.state, 4); assert.match(g.fail_reason.detail, /No local generation provider/);
  assert.equal((await post('/api/biz/v1/agent/list_project_file', { Base: { Client: 'web' }, PageNum: 1, PageSize: 300, project_id: pid })).body.data.Total, 0); }

// Cancelamento via HTTP + eventos SSE funciona mesmo sem ffmpeg/provedor; e cancelamento pre-processamento local.
{ const { pid, canvasId } = await open(); await submit(pid, canvasId, 'a blue kite flying over a beach', 'run-http-cancel');
  const threadStream = await connectSse('/api/biz/v1/agent/subscribe_thread', { thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` });
  const runStream = await connectSse('/api/biz/v1/agent/subscribe_run', { run_id: 'run-http-cancel', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` });
  const assetStream = await connectSse('/api/biz/v1/asset/sse_asset', { asset_ids: [canvasId, 'node-run-http-cancel'] });
  await threadStream.until(/event:ping\ndata:ping/); await runStream.until(/event:ping\ndata:ping/); await assetStream.until(/event:ping\ndata:ping/);
  const cr = (await post('/api/biz/v1/agent/cancel_run', { run_id: 'run-http-cancel', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent` })).body; assert.equal(cr.data.run.state, 5);
  const liveRun = await threadStream.until(/\"state\":5/); assert.match(liveRun, /event:message\ndata:/);
  const liveSubscribeRun = await runStream.until(/\"state\":5/); assert.match(liveSubscribeRun, /event:message\ndata:/, 'payload de subscribe_run e fallback local, nao formato Pippit provado');
  const liveAsset = await assetStream.until(/cancelled/); assert.match(liveAsset, /event:AssetJsonUpdate\ndata:/);
  await threadStream.close(); await runStream.close(); await assetStream.close();
  await sleep(350); const final = (await post('/api/biz/v1/agent/get_run', { run_id: 'run-http-cancel' })).body.data.run; assert.equal(final.state, 5, 'timer nao reinicia run cancelado');
  assert.equal((await post('/api/biz/v1/agent/list_project_file', { Base: { Client: 'web' }, PageNum: 1, PageSize: 300, project_id: pid })).body.data.Total, 0); }

// 3) com provedor local (ffmpeg, nao-IA) -> sucesso, arquivo no projeto, sem debito
if (media.available()) {
  await post('/api/settings', { provider: 'local-ffmpeg' });
  const { pid, canvasId } = await open(); await submit(pid, canvasId, 'a red apple rotating on a white table', 'run-ok'); await sleep(4000);
  const th = (await post('/api/biz/v1/agent/get_thread', { thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent`, scopes: ['run_list.entry_list'] })).body.data.thread; assert.equal(th.run_list[0].state, 3);
  const files = (await post('/api/biz/v1/agent/list_project_file', { Base: { Client: 'web' }, PageNum: 1, PageSize: 300, project_id: pid })).body.data; assert.equal(files.Total, 1); assert.equal(files.Files[0].IconType, '.mp4');
  const info = (await post('/api/biz/v1/common/mget_asset_info', { asset_ids: [files.Files[0].Raw.AgentAsset.SourceID], need_transcode: true })).body.data; assert.equal(info[0].format, 'video'); assert.ok(info[0].width > 0);
  assert.equal((await post('/commerce/v1/benefits/user_credit', {})).body.data.credit.gift_credit, bal0, 'renderizador local nao-IA nao debita');
  // historico: o projeto direto aparece em /api/projects com titulo "<thread> part" e href para o canvas
  const projs = await (await fetch(base + '/api/projects')).json(); const mine = projs.find((x) => x.id === String(pid)); assert.ok(mine, 'projeto direto no historico'); assert.equal(mine.title, 'a red video part'); assert.equal(mine.href, `/direct/${pid}/${canvasId}/run-ok`);
  // cancelamento HTTP enquanto o renderer local (ffmpeg) esta ativo: run + patches do canvas chegam ao vivo.
  const c2 = await open(); await submit(c2.pid, c2.canvasId, 'a green pear spinning slowly on wood', 'run-cancel', 60);
  const threadStream = await connectSse('/api/biz/v1/agent/subscribe_thread', { thread_id: `canvas_thread_${c2.canvasId}_pippit_video_part_agent` });
  const assetStream = await connectSse('/api/biz/v1/asset/sse_asset', { asset_ids: [c2.canvasId, 'node-run-cancel'] });
  await threadStream.until(/event:ping\ndata:ping/); await assetStream.until(/event:ping\ndata:ping/);
  let inRender = false; for (let i = 0; i < 100; i++) { const state = (await post('/api/biz/v1/agent/get_run', { run_id: 'run-cancel' })).body.data.run.state; if (state === 7) { inRender = true; break; } await sleep(10); }
  assert.ok(inRender, 'run alcancou o estado local generating antes do cancelamento');
  const cr = (await post('/api/biz/v1/agent/cancel_run', { run_id: 'run-cancel', thread_id: `canvas_thread_${c2.canvasId}_pippit_video_part_agent` })).body; assert.equal(cr.data.run.state, 5);
  const liveRun = await threadStream.until(/\"state\":5/); assert.match(liveRun, /event:message\ndata:/); assert.match(liveRun, /\"state\":5/);
  const liveAsset = await assetStream.until(/cancelled/); assert.match(liveAsset, /event:AssetJsonUpdate\ndata:/); assert.match(liveAsset, /\"pippit_asset_id\":\"node-run-cancel\"/);
  await threadStream.close(); await assetStream.close(); await sleep(250);
  const g2 = (await post('/api/biz/v1/agent/get_run', { scopes: ['entry_list'], run_id: 'run-cancel', thread_id: `canvas_thread_${c2.canvasId}_pippit_video_part_agent` })).body.data.run; assert.equal(g2.state, 5, 'render nao sobrescreve o cancelamento');
  assert.equal((await post('/api/biz/v1/agent/list_project_file', { Base: { Client: 'web' }, PageNum: 1, PageSize: 300, project_id: c2.pid })).body.data.Total, 0);
  // tarefas locais
  const runs = await (await fetch(base + '/api/direct/runs')).json(); assert.ok(runs.length >= 4); assert.equal(runs.find((x) => x.run_id === 'run-cancel').state, 5); assert.equal(runs.find((x) => x.run_id === 'run-ok').state, 3);
  const taskView = await (await fetch(base + '/api/direct/tasks')).json(); assert.match(taskView.scope, /local-only/); assert.ok(taskView.tasks.some((t) => t.run_id === 'run-cancel' && t.run_state === 5)); assert.ok(taskView.tasks.some((t) => t.run_id === 'run-ok' && t.run_state === 3));
} else console.log('ffmpeg ausente: etapa 3 ignorada');
console.log('directgen_http.test.mjs: ok'); server.close(); process.exit(0);
