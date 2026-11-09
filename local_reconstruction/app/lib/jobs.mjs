// Gerenciador de tarefas de geração de VÍDEO por provedor externo (adaptadores em src/providers.mjs). Persistente (db.jobs), retomável após reiniciar,
// com sequência opcional (cada tarefa pode depender da anterior e usar seu último quadro como referência). Só envia ao provedor se o usuário configurou
// o adaptador E marcou "allowSpend" (chamadas podem ser pagas no provedor dele); sem isso a tarefa fica BLOQUEADA com o motivo — nunca simulada.
import crypto from 'node:crypto';
import { adapterFor, isConfigured, resolveProviders } from '../../src/providers.mjs';

export const JOB_STATES = ['blocked', 'queued', 'running', 'succeeded', 'failed', 'canceled'];
const DONE = new Set(['succeeded', 'failed', 'canceled']);

export class JobManager {
  // deps: { db() -> objeto db, save(), media: {lastFrame}, readAsset(assetId)->{bytes,mime,name}|null, saveAsset(name, bytes, kind, cat)->asset, onDone(job), fetchImpl, pollMs, maxParallel, now }
  constructor(deps) { this.d = deps; this.f = deps.fetchImpl || globalThis.fetch; this.pollMs = deps.pollMs ?? 5000; this.maxParallel = deps.maxParallel ?? 2; this.now = deps.now || (() => Date.now()); this.busy = false; }
  jobs() { return (this.d.db().jobs ||= []); }
  get(id) { return this.jobs().find((x) => x.id === id); }
  create(spec) {
    const t = new Date(this.now()).toISOString(); const job = { id: this.d.newId(), kind: 'video', state: 'queued', progress: 0, error: null, attempts: 0, providerJobId: null, assetId: null, createdAt: t, updatedAt: t, ...spec };
    this.jobs().push(job); this.d.save(); return job;
  }
  providerOf(job) { const cfg = resolveProviders(this.d.db().settings)[job.kind]; return { cfg, adapter: cfg ? adapterFor(job.kind, cfg.adapter) : null }; }
  // motivo que impede o envio ao provedor (ou null)
  blockReason(job) {
    const { cfg, adapter } = this.providerOf(job); if (!cfg || !adapter || !isConfigured(cfg, job.kind)) return `sem provedor de ${job.kind} configurado (Configurações > Assistente de IA > Provedores)`;
    // adaptadores com consentimento POR TAREFA (ex.: foto falante): o servidor exige um consentimento amarrado ao orçamento exato; sem a função de verificação, BLOQUEIA (fail-closed)
    if (adapter.requiresTaskConsent) {
      if (typeof this.d.consentProblem !== 'function') return 'consentimento por tarefa indisponível: envio bloqueado';
      try { return this.d.consentProblem(job, cfg) || null; } catch (e) { return `erro ao verificar o consentimento (envio bloqueado): ${String(e.message || e).slice(0, 160)}`; }
    }
    if (!adapter.local && cfg.allowSpend !== true) return 'aguardando autorização de gasto: o provedor pode cobrar por geração (marque "Autorizo chamadas pagas" nas configurações do provedor)'; return null;
  }
  touch(job, patch) { Object.assign(job, patch, { updatedAt: new Date(this.now()).toISOString() }); }
  async tick() {
    if (this.busy) return; this.busy = true;
    try {
      const jobs = this.jobs(); let changed = false;
      // recuperação: um envio iniciado (sendIntent) sem resposta registrada (providerJobId) pode ter chegado ao provedor (e sido cobrado) — NUNCA reenviar sozinho
      for (const job of jobs.filter((x) => x.state === 'queued' && x.sendIntent && !x.providerJobId)) { this.touch(job, { state: 'failed', ambiguousSend: true, error: 'envio interrompido antes da resposta do provedor: a tarefa pode ter sido recebida (e cobrada). Confira no painel do provedor antes de tentar de novo; ela não será reenviada automaticamente.' }); changed = true; this.d.onDone?.(job); }
      for (const job of jobs.filter((x) => x.state === 'blocked' || x.state === 'queued')) { const why = this.blockReason(job); if (why && (job.state !== 'blocked' || job.error !== why)) { this.touch(job, { state: 'blocked', error: why }); changed = true; } else if (!why && job.state === 'blocked') { this.touch(job, { state: 'queued', error: null }); changed = true; } }
      for (const job of jobs.filter((x) => x.state === 'running')) { const r = await this.poll(job).catch((e) => { this.touch(job, { error: String(e.message || e).slice(0, 300), lastError: this.now() }); return null; }); changed = true; if (r === 'done') this.d.onDone?.(job); }
      const running = jobs.filter((x) => x.state === 'running').length; let slots = this.maxParallel - running;
      for (const job of jobs.filter((x) => x.state === 'queued')) {
        if (slots <= 0) break; if (job.after) { const prev = this.get(job.after); if (prev && !DONE.has(prev.state)) continue; if (prev && prev.state !== 'succeeded') { this.touch(job, { state: 'failed', error: `tarefa anterior (${prev.state}) não concluiu` }); changed = true; this.d.onDone?.(job); continue; } }
        await this.submit(job); slots--; changed = true; if (job.state === 'failed') this.d.onDone?.(job);
      }
      if (changed) this.d.save();
    } finally { this.busy = false; }
  }
  // Envio de tarefas com consentimento por tarefa (foto falante): revalida o consentimento IMEDIATAMENTE antes de enviar e grava a intenção de envio antes da chamada
  async submitConsented(job, cfg, adapter) {
    const why = this.blockReason(job); if (why) { this.touch(job, { state: 'blocked', error: why }); return; }
    const inp = job.inputs || {}; const image = this.d.readAsset(inp.imageAssetId); const audio = this.d.readAsset(inp.audioAssetId);
    if (!image || !audio) { this.touch(job, { state: 'failed', error: 'entradas da tarefa não encontradas (os ativos foram removidos?)' }); return; }
    const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); // o que será enviado tem de ser EXATAMENTE o que o consentimento cobriu
    if ((inp.imageSha && sha(image.bytes) !== inp.imageSha) || (inp.audioSha && sha(audio.bytes) !== inp.audioSha)) { this.touch(job, { state: 'blocked', error: 'as entradas mudaram desde o orçamento autorizado: refaça o orçamento e o consentimento', authorization: null }); return; }
    this.touch(job, { sendIntent: new Date(this.now()).toISOString() }); this.d.save();
    try {
      const out = await adapter.submit(cfg, { image, audio, text: inp.text, voice: inp.voice, gesture: inp.gesture, params: inp.params, fetchImpl: this.f });
      this.touch(job, { state: 'running', providerJobId: out.jobId, startedAt: new Date(this.now()).toISOString(), lastPoll: 0, error: null, sent: { accepted: out.accepted || [], ignored: out.ignored || [] }, sendIntent: null });
    } catch (e) {
      const msg = String(e.message || e).slice(0, 300);
      if (e.network === true) this.touch(job, { state: 'failed', ambiguousSend: true, error: `${msg}. O provedor pode ter recebido a tarefa (e cobrado): confira no painel dele antes de tentar de novo.` });
      else this.touch(job, { state: 'failed', error: msg, sendIntent: null });
    }
  }
  async submit(job) {
    const { cfg, adapter } = this.providerOf(job); job.attempts++;
    if (adapter?.requiresTaskConsent) return this.submitConsented(job, cfg, adapter);
    try {
      let reference = null;
      if (job.referenceAssetId) reference = this.d.readAsset(job.referenceAssetId);
      else if (job.after) { const prev = this.get(job.after); if (prev?.assetId && this.d.media?.lastFrame) { const png = this.d.lastFrameOf(prev.assetId); if (png) reference = { bytes: png, mime: 'image/png', name: 'ref.png' }; } }
      const out = await adapter.submit(cfg, { prompt: job.prompt, seconds: job.params?.seconds || 5, ratio: job.params?.ratio || '9:16', reference, fetchImpl: this.f });
      this.touch(job, { state: 'running', providerJobId: out.jobId, billedSeconds: out.seconds ?? job.params?.seconds, startedAt: new Date(this.now()).toISOString(), lastPoll: 0, error: null, usedReference: !!reference });
    } catch (e) { this.touch(job, { state: 'failed', error: String(e.message || e).slice(0, 400) }); }
  }
  async poll(job) {
    if (this.now() - (job.lastPoll || 0) < this.pollMs) return null; const { cfg, adapter } = this.providerOf(job); if (!adapter) return null; job.lastPoll = this.now();
    const p = await adapter.poll(cfg, { jobId: job.providerJobId, fetchImpl: this.f }); this.touch(job, { progress: p.progress ?? job.progress });
    if (p.state === 'failed' || p.state === 'canceled') { this.touch(job, { state: p.state, error: p.error || p.state }); return 'done'; }
    if (p.state !== 'succeeded') return null;
    const dl = await adapter.download(cfg, { jobId: job.providerJobId, result: p.result, fetchImpl: this.f }); const asset = this.d.saveAsset(`${job.title || job.id}.${dl.ext}`, dl.bytes, 'video', 'works');
    this.touch(job, { state: 'succeeded', assetId: asset.id, progress: 100, error: null }); return 'done';
  }
  async cancel(id) {
    const job = this.get(id); if (!job || DONE.has(job.state)) return job; const { cfg, adapter } = this.providerOf(job);
    // remoteCancel diz a VERDADE sobre o provedor: not_submitted (nada foi enviado) · requested (o provedor aceitou o PEDIDO; a confirmação final é dele) · refused/failed (o pedido foi recusado/falhou: pode continuar rodando e cobrando) · unsupported (o adaptador não cancela) · unknown (envio interrompido, sem id)
    let remote = 'not_submitted', note = null;
    if (job.providerJobId) {
      if (!adapter?.cancel) remote = 'unsupported';
      else { try { const o = await adapter.cancel(cfg, { jobId: job.providerJobId, fetchImpl: this.f }); remote = o && o.requested === false ? 'refused' : 'requested'; } catch (e) { remote = 'failed'; note = String(e.message || e).slice(0, 200); } }
    } else if (job.sendIntent) remote = 'unknown';
    this.touch(job, { state: 'canceled', error: 'cancelada pelo usuário', remoteCancel: remote, remoteCancelNote: note }); this.d.save(); this.d.onDone?.(job); return job;
  }
  retry(id) {
    const job = this.get(id); if (!job || !['failed', 'canceled'].includes(job.state)) return job;
    this.touch(job, { state: 'queued', error: null, providerJobId: null, progress: 0 });
    if (this.providerOf(job).adapter?.requiresTaskConsent) this.touch(job, { authorization: null, sendIntent: null, ambiguousSend: false, remoteCancel: null, remoteCancelNote: null }); // nova tentativa exige NOVO consentimento
    this.d.save(); return job;
  }
}
