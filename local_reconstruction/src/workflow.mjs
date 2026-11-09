// Modelo do workflow do agente observado (PIPPIT_WORKFLOW_OBSERVATIONS.md). Apenas regras OBSERVADAS; o planejador (LLM) e plugavel.
export const STEP_STATES = ['completed', 'failed', 'warning'];
export const MAX_SEGMENT_SECONDS = 15; // observado: "o gerador permite no maximo 15 s por trecho" (seedance 2.0 mini lite)
export const CREDITS_PER_SECOND = 7;   // observado na UI do compositor ("7 /s"); 15 s x 7 = 105, igual ao debito do ledger

export function planSegments(totalSeconds, maxSeg = MAX_SEGMENT_SECONDS) {
  const n = Math.ceil(totalSeconds / maxSeg); const segs = [];
  for (let i = 0; i < n; i++) segs.push({ id: `shot_${String(i + 1).padStart(2, '0')}`, seconds: Math.min(maxSeg, totalSeconds - i * maxSeg), continuesFrom: i ? `shot_${String(i).padStart(2, '0')}_lastframe` : null });
  return segs;
}
// Gating por plano observado: modelo exige assinatura -> falha "Assine para continuar usando este recurso" (cartao "recurso Starter").
export function checkModelAccess(model, plan) {
  if (model.requiresPlan && model.requiresPlan !== plan) return { ok: false, error: 'Não foi possível gerar o vídeo', upsell: { heading: 'Você está usando um recurso Starter', cta: 'Assinar agora' } };
  return { ok: true };
}
export function estimateCredits(seconds, perSecond = CREDITS_PER_SECOND) { return seconds * perSecond; }

export class AgentSession {
  constructor({ planner }) { this.planner = planner; this.steps = []; this.nodes = []; this.edges = []; this.awaiting = null; }
  step(label, state = 'completed', extra = {}) { this.steps.push({ label, state, ...extra }); }
  addNode(kind, title) { const n = { id: `n${this.nodes.length + 1}`, kind, title }; this.nodes.push(n); return n; }
  link(a, b) { this.edges.push({ from: a.id, to: b.id }); }
  // Fluxo observado: habilidades -> ler arquivo -> pergunta (se faltar tema) -> design doc -> storyboard -> confirmacao -> segmentos -> render
  async run(request, { plan = 'free', model, answer }) {
    this.step('Habilidades carregadas'); if (request.attachments?.length) this.step('Arquivo lido');
    if (!request.theme) { this.awaiting = { type: 'question', options: this.planner.themeOptions(request) }; if (!answer) return this; request = { ...request, theme: answer }; this.awaiting = null; }
    const design = this.addNode('document', 'creative_design.md'); this.step('Planos criados');
    const story = this.addNode('document', 'storyboard.md'); this.link(design, story); this.step('Solicitação executada');
    const segs = planSegments(request.seconds);
    this.awaiting = { type: 'confirm_production', options: { mode: ['parallel', 'sequential_lastframe', 'review'], autoContinue: [true, false] } };
    if (!request.confirmation) return this; this.awaiting = null;
    const access = checkModelAccess(model, plan);
    if (!access.ok) { this.step('Não foi possível gerar o vídeo', 'failed', access); return this; }
    const shots = segs.map((s) => { const n = this.addNode('video', `${s.id}.mp4`); this.step('Vídeo gerado'); return n; });
    shots.forEach((n) => this.link(story, n));
    const final = this.addNode('video', 'final.mp4'); shots.forEach((n) => this.link(n, final)); this.step('Vídeo renderizado');
    this.result = { seconds: request.seconds, segments: segs.length, credits: estimateCredits(request.seconds) }; return this;
  }
}
