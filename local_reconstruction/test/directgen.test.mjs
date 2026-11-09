// Reproduz, contra o contrato OBSERVADO (captures/auth/autoroute/*.har), a geracao direta de video: falha por prompt curto (sem debito),
// sucesso com debito 125 -> 113, estados de run, patches de canvas/no, SSE por replay e regras de tentativas gratuitas.
import assert from 'node:assert/strict';
import { DirectGen, newDirectState, applyPatch, MIN_PROMPT, RUN_STATE, AUTO_ROUTE, creditsFor } from '../src/directgen.mjs';

const mkCredits = (n) => ({ n, balance() { return this.n; }, debit(label, a) { if (this.n < a) return { ok: false }; this.n -= a; this.log = [...(this.log || []), [label, -a]]; return { ok: true }; } });
const mk = (opts = {}) => { const credits = mkCredits(opts.credits ?? 125); const state = newDirectState(); const svc = new DirectGen({ state, credits, render: opts.render }); return { svc, credits, state }; };
const submit = (svc, projectId, canvasId, prompt) => {
  const threadId = `canvas_thread_${canvasId}_pippit_video_part_agent`;
  const param = JSON.stringify({ prompt, images: [], ratio: '9:16', resolution: '768p', model: AUTO_ROUTE.modelKey, duration_sec: 4 });
  return svc.submitRun({ project_id: projectId, message: { content: [{ type: 'data', data: JSON.stringify({ param, extra: '{}', tool_name: AUTO_ROUTE.toolName }), sub_type: 'biz/x_data_direct_tool_call_req' }], role: 'user', thread_id: threadId, run_id: 'run-' + prompt.length, created_at: 1, message_id: 'msg-1' }, user_info: { consumer_uid: 'u1' }, agent_name: AUTO_ROUTE.agentName, concurrency_control: { policy: 1, conflict_key: 'node1' }, entrance_from: 'web_video_direct', run_extra: JSON.stringify({ babi_param: { tool_id: 'integrated_agent_canvas' }, client_extra: { generate_mode: 'video_gen' } }), request_id: 'r1' });
};
const open = (svc) => { const p = svc.createCreativeProject({ user_info: { consumer_uid: 'u1' } }); const pid = p.data.project_id; svc.namespaceCreate({ namespace_data: [{ FileName: 'canvas.json', PippitAssetID: 'canvas1', ProjectID: String(pid) }] }); return String(pid); };

// patches JSON
{ const r = { content: {} }; applyPatch(r, { op: 'add', path: '/content/nodes/n1', value: { a: 1 } }); applyPatch(r, { op: 'replace', path: '/content/nodes/n1', value: { a: 2 } }); assert.deepEqual(r, { content: { nodes: { n1: { a: 2 } } } }); applyPatch(r, { op: 'remove', path: '/content/nodes/n1' }); assert.deepEqual(r.content.nodes, {}); }

// custo observado: 4 s / 768p = 12
assert.equal(creditsFor(4), 12);

// check de credito: LimitFree, sem paywall (observado)
{ const { svc } = mk(); const c = svc.checkWithholdDeduct({ action_type: 1, strict: true, item_list: [{ resource_type: 'aigc', resource_id: AUTO_ROUTE.resourceId, benefit_type: AUTO_ROUTE.benefitType, amount: 1, high_precision_amount: 4, submit_id: '' }], client_check_group: [] });
  assert.equal(c.ret, '0'); assert.equal(c.data.status, 1); assert.equal(c.data.item_list[0].credits_amount, 12); assert.deepEqual(c.data.item_list[0].consume_types, ['LimitFree']); assert.equal(c.data.paywall, null); assert.deepEqual(JSON.parse(c.response), c.data); }

// get_thread antes do envio: ret "8", data null (observado)
{ const { svc } = mk(); const t = svc.getThread({ thread_id: 'canvas_thread_x_pippit_video_part_agent', scopes: ['run_list.entry_list'] }); assert.equal(t.ret, '8'); assert.equal(t.data, null); assert.equal(t.errmsg, 'Something went wrong. Try again.'); }

// FALHA: prompt de 9 caracteres -> run 1 -> state 4, code 99999, detail; sem debito; no "failed" (observado)
{ const { svc, credits } = mk(); const pid = open(svc);
  const r = submit(svc, pid, 'canvas1', 'red apple'); assert.equal(r.ret, '0'); assert.equal(r.data.run.state, RUN_STATE.submitted); assert.equal(r.data.run.fail_reason, null); assert.equal(r.api_base_resp, null);
  const run = await svc.process(r.data.run.run_id);
  assert.equal(run.state, RUN_STATE.failed); const g = svc.getRun({ run_id: run.run_id, thread_id: run.thread_id, scopes: ['entry_list'] }).data.run;
  assert.equal(g.fail_reason.code, 99999); assert.equal(g.fail_reason.message, 'Message provided by the server.'); assert.match(g.fail_reason.detail, /at least 15 characters/); assert.equal(g.entry_list.at(-1).message.content[0].sub_type, 'biz/error');
  assert.equal(credits.balance(), 125, 'sem debito na falha de validacao');
  const gen = svc.s.assets.node1.root.content.generation; assert.equal(gen.state.status, 'failed'); assert.equal(gen.state.errorMessage, 'Message provided by the server.'); assert.equal(gen.modelKey, 'MiniMax-H3-trial'); assert.equal(gen.prompt, 'red apple');
  assert.equal(svc.s.assets.canvas1.root.content.nodes.node1.type, 'biz/video'); assert.equal(svc.s.assets.canvas1.root.content.nodes.node1.w, 480);
  const th = svc.getThread({ thread_id: run.thread_id, scopes: ['run_list.entry_list'] }).data.thread; assert.equal(th.run_list[0].state, 4); assert.equal(th.title, 'red apple video');
  const ev = svc.threadEvents(run.thread_id); assert.deepEqual(ev.map((e) => e.event), ['message', 'message', 'ping']); assert.equal(ev[0].data.run, null);
  assert.equal(svc.userCredit().data.credit.gift_credit, 125); assert.ok(MIN_PROMPT === 15); }

// SUCESSO (com renderizador injetado): debito 125 -> 113, tentativas 3 -> 2, no "succeeded", canvas 272x476, arquivo do projeto, SSE por replay
{ const { svc, credits, state } = mk({ render: async () => ({ assetId: 'asset-77', name: 'clip.mp4', durationMs: 4467, width: 768, height: 1344 }) }); const pid = open(svc);
  const r = submit(svc, pid, 'canvas1', 'a red apple rotating on a white table'); assert.equal(r.data.run.state, 1);
  const run = await svc.process(r.data.run.run_id);
  assert.equal(run.state, RUN_STATE.completed); assert.equal(credits.balance(), 113); assert.deepEqual(credits.log, [['Geração de vídeo (MiniMax-H3-trial) 4s', -12]]); assert.equal(state.tries.auto, 2);
  const gen = svc.s.assets.node1.root.content.generation; assert.equal(gen.state.status, 'succeeded'); assert.equal(gen.successfulGenerationCount, 1); assert.equal(gen.lastSuccessfulGenerationRunId, run.run_id); assert.equal(svc.s.assets.node1.root.content.metadata.durationMs, 4467);
  const n = svc.s.assets.canvas1.root.content.nodes.node1; assert.equal(n.w, 272); assert.equal(n.h, 476);
  const f = svc.listProjectFile({ project_id: pid, PageNum: 1, PageSize: 300 }).data; assert.equal(f.Total, 1); assert.equal(f.Files[0].IconType, '.mp4'); assert.match(f.Files[0].Raw.Filepath, /^\/workspace\/assets\/\d+\.1$/);
  const ev = svc.assetEvents(['canvas1', 'node1']); assert.equal(ev[0].event, 'ping'); assert.equal(ev[0].data, 'connected'); assert.equal(ev.at(-1).event, 'ping'); assert.ok(ev.some((e) => e.event === 'AssetJsonUpdate' && JSON.parse(e.data.content).patches[0].path === '/history'));
  assert.equal(svc.generationTaskList().data.paginator.has_more, false); }

// sem renderizador: falha explicita local, SEM debito (desvio local documentado)
{ const { svc, credits } = mk(); const pid = open(svc); const r = submit(svc, pid, 'canvas1', 'a red apple rotating on a white table'); const run = await svc.process(r.data.run.run_id); assert.equal(run.state, 4); assert.match(run.fail_reason.detail, /No local generation provider/); assert.equal(credits.balance(), 125); }

// tentativas gratuitas esgotadas -> check devolve status 2 + paywall (regra UNOBSERVED, marcada como tal no codigo)
{ const { svc, state } = mk(); state.tries.auto = 0; const c = svc.checkWithholdDeduct({ action_type: 1, item_list: [{ resource_id: AUTO_ROUTE.resourceId, resource_type: 'aigc', benefit_type: AUTO_ROUTE.benefitType, high_precision_amount: 4 }] }); assert.equal(c.data.status, 2); assert.equal(c.data.paywall, 'subscribe'); }

// cancel_run (estado/corpo UNOBSERVED): cancela run submetido durante a renderizacao; renderizador nao sobrescreve; run concluido nao muda
{ let release; const gate = new Promise((r) => (release = r)); const { svc, credits } = mk({ render: async () => { await gate; return { assetId: 'a1', name: 'x.mp4', durationMs: 4000, width: 768, height: 1344 }; } }); const pid = open(svc);
  const r = submit(svc, pid, 'canvas1', 'a red apple rotating on a white table'); const p = svc.process(r.data.run.run_id); await new Promise((x) => setTimeout(x, 10));
  const c = svc.cancelRun({ run_id: r.data.run.run_id, thread_id: r.data.run.thread_id }); assert.equal(c.data.run.state, RUN_STATE.canceled); assert.equal(svc.s.assets.node1.root.content.generation.state.status, 'cancelled');
  release(); const run = await p; assert.equal(run.state, RUN_STATE.canceled); assert.equal(svc.s.projects[pid].files.length, 0); assert.equal(credits.balance(), 113, 'sem estorno: regra desconhecida (documentada)');
  assert.equal(svc.cancelRun({ run_id: r.data.run.run_id }).data.run.state, RUN_STATE.canceled); assert.equal(svc.cancelRun({ run_id: 'inexistente' }).ret, '8');
  const rows = svc.listRuns(); assert.equal(rows.length, 1); assert.equal(rows[0].state, RUN_STATE.canceled); assert.equal(rows[0].prompt, 'a red apple rotating on a white table'); assert.equal(rows[0].canvas_id, 'canvas1'); }

// recurso nao observado: nao inventa preco
{ const { svc } = mk(); const c = svc.checkWithholdDeduct({ item_list: [{ resource_id: 'cc_biz_outro', resource_type: 'aigc' }] }); assert.equal(c.data.item_list[0].status, 0); assert.ok(c.data.item_list[0]._unobserved); }
console.log('directgen.test.mjs: ok');
