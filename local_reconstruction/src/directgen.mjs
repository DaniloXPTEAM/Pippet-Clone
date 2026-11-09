// Geracao direta de video (composer -> canvas) conforme o contrato OBSERVADO em execucao em 21/10/2026
// (PIPPIT_API_CATALOG.md: "Protocolo de geracao direta observado", "Contratos observados", "Conteudo dos fluxos SSE").
// Escopo honesto: reproduz formas de corpo/resposta, ordem das chamadas, regras e estados observados. NAO gera video por IA:
// o resultado so existe se o servidor injetar um renderizador local (render); sem ele o run falha com motivo explicito e SEM debito (desvio local, nao observado no original).
// Itens marcados UNOBSERVED sao palpites minimos necessarios para o fluxo fechar; nao afirmam comportamento do servico real.
import crypto from 'node:crypto';

export const MIN_PROMPT = 15; // observado: "Your prompt must contain at least 15 characters. Please provide a more detailed description."
// enum RunState dos bundles autenticados (modulo 205248): Unspecified 0, Submitted 1, Working 2, Completed 3, Failed 4, Canceled 5, InputRequired 6, Generating 7, ProgramInterrupt 8, Interrupt 9.
// Observados em execucao: 1 (submit) e 4 (falha). A SEQUENCIA de transicoes (Working/Generating durante o processamento) NAO foi observada.
export const RUN_STATE = { unspecified: 0, submitted: 1, working: 2, completed: 3, failed: 4, canceled: 5, inputRequired: 6, generating: 7, programInterrupt: 8, interrupt: 9 };
export const AUTO_ROUTE = {
  agentName: 'pippit_video_part_agent', toolName: 'biz/x_tool_name_video_part', entranceFrom: 'web_video_direct',
  modelKey: 'MiniMax-H3-trial', resourceId: 'cc_biz_video_agent_minimaxh3_768p', benefitType: 'cc_biz_video_agent_minimaxh3_trial_768p',
  starlingKey: 'cc_biz_video_novel_video_generate_minimaxh3_768p_trial',
  creditsBySeconds: { 4: 12 }, // observado: 4 s / 768p = 12 (preco cheio 72 riscado). Outras duracoes: UNOBSERVED (estimativa 3/s)
  estimatePerSecond: 3, listCredits4s: 72, freeTries: 3, // "Try 3 times" (UI); consumo do contador so na 1a geracao aceita (UNOBSERVED se falha o consome)
};
const SERVER_ERR = { code: 99999, message: 'Message provided by the server.', starling_key: 'server_passthrough_content_key' };

export const creditsFor = (seconds) => AUTO_ROUTE.creditsBySeconds[seconds] ?? Math.round(AUTO_ROUTE.estimatePerSecond * seconds);
export const newDirectState = () => ({ projects: {}, assets: {}, threads: {}, runs: {}, localTaskLinks: {}, tries: { auto: AUTO_ROUTE.freeTries }, seq: 0 });

// ---------- ativos JSON versionados com patches (canvas e nos) ----------
const unesc = (s) => s.replace(/~1/g, '/').replace(/~0/g, '~');
export function applyPatch(root, p) {
  const keys = p.path.split('/').slice(1).map(unesc); let o = root;
  for (const k of keys.slice(0, -1)) { if (o[k] === undefined || o[k] === null) o[k] = {}; o = o[k]; }
  const last = keys[keys.length - 1];
  if (p.op === 'remove') delete o[last]; else o[last] = p.value; // add e replace
}

export class DirectGen {
  // deps: { state, credits:{balance(), debit(label, n)}, plan: () => 'free'|..., now?, render?: async (run, ctx) => {assetId, name, durationMs, width, height}, mediaInfo?: (assetId) => ({...}) }
  constructor(deps) { this.s = deps.state; this.credits = deps.credits; this.plan = deps.plan || (() => 'free'); this.now = deps.now || (() => new Date()); this.render = deps.render || null; this.mediaInfo = deps.mediaInfo || (() => null); this.listeners = deps.listeners || new Set(); this.charge = deps.charge !== false; this.abortControllers = new Map(); }
  id() { this.s.seq = Math.max(this.s.seq + 1, Date.now() * 1000); return String(this.s.seq); } // < 2^53: seguro como numero JSON (project_id vai como numero)
  uuid() { return crypto.randomUUID(); }
  env(data = null, ret = '0', errmsg = '') { return { ret, errmsg, svr_time: Math.floor(this.now().getTime() / 1000), log_id: this.now().toISOString().replace(/\D/g, '') + crypto.randomBytes(8).toString('hex').toUpperCase(), data }; }
  credEnv(data) { return { ret: '0', errmsg: 'success', systime: String(this.now().getTime()), log_id: crypto.randomBytes(12).toString('hex').toUpperCase(), response: JSON.stringify(data), sign: 'local-unsigned', data }; }
  emit(ev) { for (const l of this.listeners) l(ev); }

  // commerce/v3/benefits/batch_check_withhold_deduct
  checkWithholdDeduct(body = {}) {
    const items = (body.item_list || []).map((it) => {
      if (it.resource_id !== AUTO_ROUTE.resourceId) return { ...it, status: 0, credits_amount: 0, consume_types: [], paywall: null, _unobserved: 'recurso nao observado nesta reconstrucao' };
      const seconds = Math.round((it.high_precision_amount || 4)); const cost = creditsFor(seconds); const free = this.s.tries.auto > 0;
      const ok = free && this.credits.balance() >= cost; // sem tentativas gratuitas: comportamento UNOBSERVED -> paywall
      return { resource_type: it.resource_type, resource_id: it.resource_id, benefit_type: it.benefit_type, status: ok ? 1 : 2, credits_amount: cost, benefit_log_id: '', consume_types: ok ? ['LimitFree'] : [], starling_key: AUTO_ROUTE.starlingKey, missing_role: ok ? '' : 'starter' };
    });
    const allOk = items.length > 0 && items.every((i) => i.status === 1);
    const r = { status: allOk ? 1 : 2, action_type: body.action_type ?? 1, item_list: items, paywall: allOk ? null : 'subscribe' /* UNOBSERVED */, paywall_type: allOk ? null : 'plan', missing_max_role: allOk ? '' : 'starter', target_purchase_type: '' };
    return { ret: '0', errmsg: 'success', systime: String(this.now().getTime()), log_id: crypto.randomBytes(12).toString('hex').toUpperCase(), response: JSON.stringify(r), sign: 'local-unsigned', data: r };
  }
  userCredit() { return this.credEnv({ credit: this.credits.balances ? this.credits.balances() : { vip_credit: 0, gift_credit: this.credits.balance(), purchase_credit: 0 } }); }

  // agent/create_creative_project
  createCreativeProject(body = {}) {
    const project_id = this.id(); const t = this.now().getTime();
    const info = { project_id, title: '', status: 1, create_time: t, update_time: t, team_id: null, creator_uid: body.user_info?.consumer_uid || null, cover_asset_id: null, cover_source: null, last_operator_uid: body.user_info?.consumer_uid || null, cover_url: null, current_thread_id: null, project_credit_summary: null, current_thread_credit_summary: null, project_type: '', creator_nickname: null, last_operator_nickname: null, creator_avatar_url: null, last_operator_avatar_url: null, visible_novel_thread_ids: null, clone_run: null, novel_meta_info: null };
    this.s.projects[project_id] = { ...info, canvasId: null, files: [] };
    return this.env({ project_id: Number(project_id), project_info: info });
  }
  // asset/namespace_create: registra canvas.json do projeto
  namespaceCreate(body = {}) {
    const d = (body.namespace_data || [])[0] || {}; const pr = this.s.projects[d.ProjectID]; if (!pr) return this.env(null, '8', 'Something went wrong. Try again.');
    pr.canvasId = d.PippitAssetID; this.asset(d.PippitAssetID, { content: { nodes: {} } });
    return this.env({ Team: 'pippit_asset', FileName: d.FileName, PippitAssetID: d.PippitAssetID, ProjectID: d.ProjectID, team_id: null });
  }
  batchGenerateAssetId() { return this.env({ ids: Array.from({ length: 1000 }, () => this.id()) }); }
  // asset/batch_patch_asset: corpo NAO legivel no HAR; aceita {assets:[{asset_id, transaction_id, patches}]} (UNOBSERVED) e sempre confirma com "ack"
  batchPatchAsset(body = {}) {
    const results = []; for (const a of body.assets || body.patches || []) { if (a.asset_id && a.patches) this.patch(a.asset_id, a.patches); results.push({ transaction_id: a.transaction_id || `tx_${this.id()}`, status: 'ack' }); }
    return this.env({ results });
  }
  asset(id, init) { return (this.s.assets[id] ||= { pippit_asset_id: String(id), version: 1, root: { content: {}, ...(init || {}) } }); }
  patch(id, patches) { const a = this.asset(id); for (const p of patches) applyPatch(a.root, p); a.version += 1; this.emit({ type: 'asset', id, version: a.version, patches }); return a; }

  // agent/submit_run
  submitRun(body = {}) {
    const pr = this.s.projects[body.project_id]; const msg = body.message || {};
    const c = (msg.content || [])[0]; let tool = {}; let param = {};
    try { tool = typeof c.data === 'string' ? JSON.parse(c.data) : c.data; param = typeof tool.param === 'string' ? JSON.parse(tool.param) : tool.param; } catch { return this.env(null, '8', 'Something went wrong. Try again.'); }
    if (!pr || tool.tool_name !== AUTO_ROUTE.toolName || body.agent_name !== AUTO_ROUTE.agentName) return this.env(null, '8', 'Something went wrong. Try again.');
    const threadId = msg.thread_id; const run_id = msg.run_id || this.uuid(); const t = this.now().getTime();
    const extra = { agent_version: 'default', _TaskBizType: 11, request_env: 'local', model_type: 'auto', submit_log_id: this.id(), babi_param: JSON.stringify(typeof body.run_extra === 'string' ? JSON.parse(body.run_extra).babi_param || {} : body.run_extra?.babi_param || {}), client_extra: JSON.stringify(typeof body.run_extra === 'string' ? JSON.parse(body.run_extra).client_extra || {} : body.run_extra?.client_extra || {}) };
    const userEntry = { type: 1, message: { message_id: msg.message_id || this.uuid(), role: 'user', thread_id: threadId, run_id, content: [{ type: 'data', data: JSON.stringify(tool), sub_type: c.sub_type, hidden: false, is_thought: false, is_mention: false }], created_at: Math.floor(t / 1000), context_data: { locale: '', llm_output_cache: null, avatar_param: null, is_pay_for_best: null }, user_action: { like_action: 0 }, client_tool_calls: [], client_tool_resp: [], sub_agent_info: null }, artifact: null, score: null };
    const run = { run_id, thread_id: threadId, state: RUN_STATE.submitted, entry_list: [userEntry], created_at: Math.floor(t / 1000), updated_at: Math.floor(t / 1000), completed_at: null, fail_reason: null, execute_task_id: Number(this.id()), user_id: body.user_info?.consumer_uid || null, agent_name: body.agent_name, run_number: 1, extra: JSON.stringify(extra), _project: String(body.project_id), _param: param, _node: body.concurrency_control?.conflict_key ? String(body.concurrency_control.conflict_key) : null, _submittedAt: this.now().toISOString() };
    this.s.runs[run_id] = run;
    // Mapeamento PiperLine LOCAL para exibir cada run como tarefa; não representa a ligação run↔task do Pippit (UNOBSERVED).
    this.s.localTaskLinks ||= {}; this.s.localTaskLinks[run_id] = { local_task_id: `local_run_task_${run_id}`, run_id, created_at: run.created_at };
    const th = (this.s.threads[threadId] ||= { thread_id: threadId, title: '', run_ids: [], project: String(body.project_id), canvasId: pr.canvasId });
    th.run_ids.push(run_id); pr.current_thread_id = threadId;
    this.prepareNode(run, th);
    return { ...this.env({ run: this.publicRun(run), thread: null, web_thread_link: null }), api_base_resp: null };
  }
  // cria o no biz/video "Generating" no canvas (patch observado) e o ativo do no com /content/generation
  prepareNode(run, th) {
    const p = run._param; if (!run._node) return; const gen = { catalogParameters: { aspectRatio: p.ratio, duration: String(p.duration_sec), durationSec: String(p.duration_sec), ratio: p.ratio, resolution: p.resolution }, catalogScene: 'web_video_agent', catalogSource: 'home_mode', count: 1, createdAt: run._submittedAt, durationMs: p.duration_sec * 1000, generateId: run.run_id, modelKey: p.model || AUTO_ROUTE.modelKey, prompt: p.prompt, ratio: p.ratio, references: [], resolution: p.resolution, runId: run.run_id, runSource: 'video_part', source: 'generated', state: { runId: run.run_id, status: 'running' /* UNOBSERVED: so failed/succeeded vistos */, submittedAt: run._submittedAt, target: 'video', threadId: th.thread_id, updatedAt: run._submittedAt }, submitRunClientExtra: { edit_type: 'other', entrance_from: 'home_page_integrated_agent_combo_input_box', generate_mode: 'video_gen', model_type: p.model || AUTO_ROUTE.modelKey, placement_name: 'canvas' }, submittedPrompt: p.prompt, threadId: th.thread_id, videoRatioUpdatedAt: this.now().getTime() };
    th.title = `${String(p.prompt).trim().split(/\s+/).slice(0, 2).join(' ')} video`; // UNOBSERVED a regra (no original o titulo vem do servidor)
    if (th.canvasId) this.patch(th.canvasId, [{ assetId: th.canvasId, baseAssetVersion: 1, op: 'add', path: `/content/nodes/${run._node}`, value: { data: {}, h: 270, id: run._node, order: 0, parentId: null, type: 'biz/video', w: 480, x: -210, y: -118 } }]);
    this.patch(run._node, [{ assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/generation', value: gen }]);
  }
  // processamento do servidor: validacao -> debito -> renderizacao (async). Chamado pelo servidor depois de responder o submit_run.
  async process(run_id) {
    const run = this.s.runs[run_id]; if (!run || run.state !== RUN_STATE.submitted) return run; run.state = RUN_STATE.working; this.emit({ type: 'run', run_id: run.run_id, thread_id: run.thread_id }); // UNOBSERVED: valor usado durante validacao/debito
    const p = run._param; const fail = (detail, extra = {}) => this.finish(run, { failed: true, detail, ...extra });
    if (String(p.prompt || '').trim().length < MIN_PROMPT) return fail('Your prompt must contain at least 15 characters. Please provide a more detailed description.');
    const chk = this.checkWithholdDeduct({ action_type: 1, item_list: [{ resource_type: 'aigc', resource_id: AUTO_ROUTE.resourceId, benefit_type: AUTO_ROUTE.benefitType, amount: 1, high_precision_amount: p.duration_sec }] });
    if (chk.data.status !== 1) return fail('Subscription required (local rule, not observed): no free tries left or insufficient credits.');
    if (!this.render) return fail('No local generation provider configured (this reconstruction does not run AI models). No credits were charged.');
    const cost = chk.data.item_list[0].credits_amount; // observado: debito logo apos o envio (aqui: charge=false quando o renderizador e local/nao-IA, como em /nodes/:id/generate)
    const d = this.charge ? this.credits.debit(`Geração de vídeo (${AUTO_ROUTE.modelKey}) ${p.duration_sec}s`, cost) : { ok: true };
    if (d && d.ok === false) return fail('Insufficient credits.');
    this.s.tries.auto = Math.max(0, this.s.tries.auto - 1);
    run.state = RUN_STATE.generating; this.emit({ type: 'run', run_id: run.run_id, thread_id: run.thread_id }); // UNOBSERVED: valor usado durante a renderizacao
    const controller = new AbortController(); this.abortControllers.set(run_id, controller);
    try { const out = await this.render(run, { param: p, signal: controller.signal }); if (run.state !== RUN_STATE.generating) return run; /* cancelado durante a renderizacao */ return this.finish(run, { out }); } catch (e) { if (run.state !== RUN_STATE.generating) return run; return fail(`Local renderer error: ${String(e.message || e).slice(0, 120)}`, { refund: cost }); } finally { this.abortControllers.delete(run_id); }
  }
  finish(run, { failed, detail, out, refund }) {
    const t = this.now(); const iso = t.toISOString(); const th = this.s.threads[run.thread_id]; run.updated_at = Math.floor(t.getTime() / 1000); run.completed_at = run.updated_at;
    if (refund) this.credits.refund?.('Estorno: falha do renderizador local', refund);
    const gp = run._node && this.s.assets[run._node]?.root.content.generation;
    if (failed) {
      run.state = RUN_STATE.failed; run.fail_reason = { ...SERVER_ERR, extra: null, is_not_retryable: false, payload: 'null', fallback_message: SERVER_ERR.message, detail };
      run.entry_list.push({ type: 1, message: { message_id: this.id(), role: 'assistant', thread_id: run.thread_id, run_id: run.run_id, content: [{ type: 'data', data: JSON.stringify({ code: SERVER_ERR.code, message: SERVER_ERR.message, extra: null, is_not_retryable: false, starling_key: SERVER_ERR.starling_key, payload: null, fallback_message: SERVER_ERR.message }), sub_type: 'biz/error', hidden: false, is_thought: false, is_mention: false }], created_at: run.updated_at, user_action: { like_action: 0 }, sub_agent_info: null }, artifact: null, score: null });
      if (gp) this.patch(run._node, [{ assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/generation/state', value: { errorMessage: SERVER_ERR.message, runId: run.run_id, status: 'failed', submittedAt: gp.state.submittedAt, target: 'video', threadId: run.thread_id, updatedAt: iso } }]);
    } else {
      run.state = RUN_STATE.completed; const artifactId = this.id();
      const state = { runId: run.run_id, status: 'succeeded', submittedAt: gp?.state.submittedAt, target: 'video', threadId: run.thread_id, updatedAt: iso };
      const gen = { ...gp, agentName: run.agent_name, artifactId, state, successfulGenerationCount: 1, lastSuccessfulGenerationRunId: run.run_id };
      const meta = { bitrate: 0, codecType: '', definition: '', durationMS: out.durationMs, durationMs: out.durationMs, encodedType: '', fileHash: '', format: '', height: out.height, md5: '', mime: '', ratio: '', size: 0, width: out.width };
      this.s.projects[run._project].files.push({ id: artifactId, assetId: out.assetId, name: out.name, createdAt: Math.floor(t.getTime() / 1000) });
      this.patch(run._node, [
        { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/history', value: { [artifactId]: { assetId: out.assetId, caption: 'Video', generation: gen, metadata: meta, name: out.name, pippitAssetId: artifactId, playback: { muted: true }, source: 'generated' } } },
        { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/assetId', value: out.assetId }, { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/name', value: out.name },
        { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/source', value: 'generated' }, { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/subType', value: 'biz/x_data_video' },
        { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/generation', value: gen }, { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/metadata', value: meta }, { assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/pippitAssetId', value: artifactId }]);
      if (th?.canvasId) this.patch(th.canvasId, [{ assetId: th.canvasId, baseAssetVersion: 1, op: 'replace', path: `/content/nodes/${run._node}`, value: { data: {}, h: 476, id: run._node, order: 0, parentId: null, type: 'biz/video', w: 272, x: -210, y: -118 } }]);
    }
    this.emit({ type: 'run', run_id: run.run_id, thread_id: run.thread_id }); return run;
  }
  publicRun(run, scopes) { const { _project, _param, _node, _submittedAt, ...r } = run; return scopes && !scopes.includes('entry_list') ? { ...r, entry_list: null } : r; }
  // agent/cancel_run: endpoint conhecido so do codigo (corpo/estado de cancelamento UNOBSERVED). Local: so cancela run submetido; nao ha estorno (regra desconhecida).
  cancelRun(body = {}) {
    const run = this.s.runs[body.run_id]; if (!run) return this.env(null, '8', 'Something went wrong. Try again.');
    if (![RUN_STATE.submitted, RUN_STATE.working, RUN_STATE.generating].includes(run.state)) return this.env({ run: this.publicRun(run) });
    const t = this.now(); run.state = RUN_STATE.canceled; this.abortControllers.get(run.run_id)?.abort(); run.updated_at = run.completed_at = Math.floor(t.getTime() / 1000);
    const gp = run._node && this.s.assets[run._node]?.root.content.generation;
    if (gp) this.patch(run._node, [{ assetId: run._node, baseAssetVersion: 1, op: 'add', path: '/content/generation/state', value: { runId: run.run_id, status: 'cancelled' /* UNOBSERVED */, submittedAt: gp.state.submittedAt, target: 'video', threadId: run.thread_id, updatedAt: t.toISOString() } }]);
    this.emit({ type: 'run', run_id: run.run_id, thread_id: run.thread_id }); return this.env({ run: this.publicRun(run) });
  }
  // resumo local dos runs (tarefas) para a pagina de tarefas; NAO e um endpoint do Pippit
  listRuns() { return Object.values(this.s.runs).map((r) => ({ run_id: r.run_id, project_id: r._project, thread_id: r.thread_id, canvas_id: this.s.threads[r.thread_id]?.canvasId || null, prompt: r._param?.prompt || '', model: r._param?.model || '', duration_sec: r._param?.duration_sec, state: r.state, created_at: r.created_at, completed_at: r.completed_at, detail: r.fail_reason?.detail || null, title: this.s.threads[r.thread_id]?.title || '' })).sort((a, b) => b.created_at - a.created_at); }
  // Ligacao explicitamente LOCAL; `generation_task_list` remoto continua vazio enquanto o contrato run↔task do Pippit for desconhecido.
  listLocalTasks() { const links = (this.s.localTaskLinks ||= {}); for (const run of Object.values(this.s.runs)) links[run.run_id] ||= { local_task_id: `local_run_task_${run.run_id}`, run_id: run.run_id, created_at: run.created_at }; return Object.values(links).map((link) => { const run = this.s.runs[link.run_id]; return run ? { ...link, run_state: run.state, updated_at: run.updated_at, completed_at: run.completed_at, project_id: run._project, thread_id: run.thread_id } : null; }).filter(Boolean).sort((a, b) => b.created_at - a.created_at); }
  // agent/get_run
  getRun(body = {}) { const r = this.s.runs[body.run_id]; if (!r) return this.env(null, '8', 'Something went wrong. Try again.'); return this.env({ run: this.publicRun(r, body.scopes) }); }
  threadView(threadId, withEntries = false) { const th = this.s.threads[threadId]; if (!th) return null; return { thread_id: th.thread_id, title: th.title, run_list: th.run_ids.map((id) => this.publicRun(this.s.runs[id], withEntries ? ['entry_list'] : [])), extra: JSON.stringify({ thread_message_version: 'V3' }) }; }
  // agent/get_thread: antes do 1o submit o original devolve ret "8" e data null (observado)
  getThread(body = {}) { const v = this.threadView(body.thread_id, (body.scopes || []).includes('run_list.entry_list')); return v ? this.env({ thread: v }) : this.env(null, '8', 'Something went wrong. Try again.'); }
  // agent/subscribe_thread (SSE): observado "event:message" com {run:null, thread} (x2) e "event:ping"
  threadEvents(threadId) { const v = this.threadView(threadId); return v ? [{ event: 'message', data: { run: null, thread: v } }, { event: 'message', data: { run: null, thread: v } }, { event: 'ping', data: 'ping' }] : []; }
  // asset/sse_asset (SSE): observado ping "connected", AssetJsonUpdate por ativo (replay de estado), ping final
  assetEvents(ids) {
    const ev = [{ event: 'ping', data: 'connected' }];
    for (const id of ids) { const a = this.s.assets[id]; if (!a) continue; const content = a.root.content || {};
      const mk = (path, value) => ({ event: 'AssetJsonUpdate', data: { pippit_asset_id: String(id), version: a.version, content: JSON.stringify({ patches: [{ assetId: String(id), baseAssetVersion: 1, op: 'add', path, value }] }), start_version: 1, extra: { asset_content_version: String(a.version) } } });
      if (content.nodes) for (const [nid, n] of Object.entries(content.nodes)) ev.push(mk(`/content/nodes/${nid}`, n));
      if (a.root.history) ev.push(mk('/history', a.root.history));
      for (const [k, v] of Object.entries(content)) if (k !== 'nodes') ev.push(mk(`/content/${k}`, v)); }
    ev.push({ event: 'ping', data: 'ping' }); return ev;
  }
  // common/generation_task_list: forma observada; ligacao run<->task NAO comprovada, entao a lista local fica vazia
  generationTaskList() { return this.env({ task_results: [], paginator: { next_cursor: '30', has_more: false, total: null } }); }
  // agent/list_project_file
  listProjectFile(body = {}) { const pr = this.s.projects[body.project_id]; const files = (pr?.files || []).map((f) => ({ ID: f.id, Raw: { AgentAsset: { AssetType: 2, SourceID: f.assetId, PippitAssetID: f.id, Name: f.name, Category: 2, CreateTime: f.createdAt }, Filename: `${f.id}.1`, Filepath: `/workspace/assets/${f.id}.1`, CreatedAt: String(f.createdAt), LastUpdatedAt: null }, DisplayFilename: f.name, IconType: '.mp4', LastUpdatedAt: null })); return this.env({ Files: files, Total: files.length, Editable: false }); }
  // common/mget_asset_info
  mgetAssetInfo(body = {}) { return this.env((body.asset_ids || []).map((id) => this.mediaInfo(id)).filter(Boolean)); }
}
