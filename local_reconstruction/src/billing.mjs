// Camada de planos, créditos e COBRANÇA (estrutura) — rodada 7, item 5.
// Dois adaptadores com o mesmo contrato:
//   • `gratuito`: o de hoje. Nenhuma cobrança, nenhum SDK, nenhuma chamada; troca de plano é local.
//   • `gateway` : DESABILITADO. Só descreve checkout/webhook/portal e as variáveis de ambiente esperadas.
// Nada aqui importa SDK, abre socket ou cobra: as três interfaces do gateway devolvem 501 com o contrato.
import { PLANS, getPlan } from './plans.mjs';

export const BILLING_STATES = Object.freeze(['sem_cobranca', 'checkout_pendente', 'pago', 'recusado', 'reembolsado']);
export const CURRENCY = 'BRL';

const sum = (plan, billing = 'monthly') => {
  if (!plan) return null;
  if (billing === 'annual' && plan.annual) return { amount: plan.annual.priceBRL, listPrice: plan.annual.listPriceBRL ?? null, period: 'ano' };
  return { amount: plan.priceBRL, listPrice: plan.listPriceBRL ?? null, period: 'mês' };
};

// preço do catálogo LOCAL (PIPPIT_PLANS.md). Não é cotação: é dado observado de 20/10/2026.
export function priceFor(planId, { billing = 'monthly' } = {}) {
  const plan = getPlan(planId);
  if (!plan) return { error: `plano inválido: ${planId}` };
  const s = sum(plan, billing);
  return { ok: true, planId, name: plan.name, billing, amount: s.amount, currency: CURRENCY, period: s.period, listPrice: s.listPrice, source: 'catálogo local (PIPPIT_PLANS.md, 2026-10-20)' };
}

// Intenção de checkout: valida e descreve o que SERIA cobrado. Nunca cobra, nunca cria sessão real.
export function checkoutIntent({ planId, billing = 'monthly', adapter = BILLING_ADAPTERS.gratuito, now = Date.now(), id } = {}) {
  const price = priceFor(planId, { billing });
  if (price.error) return { ok: false, status: 400, error: price.error };
  const intentId = id || 'ck_' + now.toString(36) + Math.random().toString(36).slice(2, 8);
  const base = { intentId, planId, billing, amount: price.amount, currency: CURRENCY, period: price.period, price, createdAt: new Date(now).toISOString() };
  if (price.amount === 0) return { ok: true, charged: false, state: 'sem_cobranca', intent: { ...base, state: 'sem_cobranca' }, note: 'Plano gratuito: nada a cobrar e nenhum checkout é criado.' };
  if (!adapter || adapter.enabled !== true) return { ok: false, status: 501, state: 'sem_cobranca', charged: false, error: 'gateway de pagamento desabilitado (estrutura): nenhuma sessão de checkout é criada e nada é cobrado', intent: { ...base, state: 'sem_cobranca', adapter: adapter?.id || null }, contract: adapter?.contract || null, missing: adapter?.missing || [] };
  return { ok: true, charged: false, state: 'sem_cobranca', intent: { ...base, state: 'sem_cobranca', adapter: adapter.id }, note: 'Adaptador funcional sem cobrança: nenhum valor é debitado nem enviado a lugar nenhum.' };
}

// Troca de plano LOCAL (o que o adaptador gratuito faz). Sempre sem cobrança.
export function applyPlanChange({ planId, billing = 'monthly', plans = PLANS } = {}) {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, status: 400, error: 'plano inválido' };
  return { ok: true, plan: plan.id, billing: billing === 'annual' ? 'annual' : 'monthly', charged: false, amount: 0, state: 'sem_cobranca', note: 'Troca de plano local para exercitar limites: nenhuma cobrança.' };
}

// Contrato do gateway (desligado). Nada é chamado; o corpo serve para implementar depois.
export const GATEWAY_CONTRACT = Object.freeze({
  checkout: { method: 'POST', endpoint: '{BILLING_GATEWAY_BASE_URL}/v1/checkout/sessions', body: '{ plan_id, billing: "monthly"|"annual", customer_reference, success_url, cancel_url }', response: '{ id, url, amount, currency, status }' },
  webhook: { method: 'POST', endpoint: '{BILLING_GATEWAY_BASE_URL}/v1/webhooks', headers: ['X-Signature: HMAC-SHA256 do corpo cru com BILLING_WEBHOOK_SECRET'], events: ['checkout.completed', 'payment.paid', 'payment.failed', 'refund.created'], rule: 'só muda o plano/créditos depois de conferir a assinatura e o evento; nada é aplicado no recebimento sem verificação' },
  portal: { method: 'GET', endpoint: '{BILLING_GATEWAY_BASE_URL}/v1/billing/portal', purpose: 'autoatendimento do cliente (formas de pagamento, faturas, cancelamento)' },
});

export const BILLING_ADAPTERS = Object.freeze({
  gratuito: Object.freeze({
    id: 'gratuito', label: 'Gratuito (sem cobrança)', mode: 'funcional', enabled: true, configured: true,
    env: [], supports: { checkout: false, webhook: false, portal: false },
    contract: null, missing: [],
    note: 'Adapter atual: planos e créditos são locais; nenhuma cobrança existe.',
  }),
  gateway: Object.freeze({
    id: 'gateway', label: 'Gateway de pagamento (estrutura)', mode: 'estrutura', enabled: false,
    get configured() { return !!(process.env.BILLING_GATEWAY_BASE_URL && process.env.BILLING_GATEWAY_KEY); },
    env: ['BILLING_GATEWAY_BASE_URL', 'BILLING_GATEWAY_KEY', 'BILLING_WEBHOOK_SECRET', 'BILLING_PORTAL_URL'], supports: { checkout: true, webhook: true, portal: true },
    contract: GATEWAY_CONTRACT,
    missing: ['contratação do gateway pelo usuário', 'credenciais no ambiente', 'definição dos eventos e do webhook assinado', 'decisão de preços/créditos por plano'],
    note: 'Desabilitado: checkout, webhook e portal respondem 501 com o contrato; nenhum SDK é importado e nenhuma chamada é feita.',
  }),
});

export const adapterFor = (id) => BILLING_ADAPTERS[id] || BILLING_ADAPTERS.gratuito;
export const adaptersSummary = () => Object.values(BILLING_ADAPTERS).map((a) => ({
  id: a.id, label: a.label, mode: a.mode, enabled: a.enabled === true, configured: a.configured === true,
  env: [...a.env], supports: { ...a.supports }, missing: [...a.missing], note: a.note,
}));

export function billingSummary({ adapter = 'gratuito', user = {}, balance = null, plans = PLANS } = {}) {
  const ad = adapterFor(adapter);
  return {
    adapter: ad.id, adapterInfo: adaptersSummary().find((a) => a.id === ad.id), adapters: adaptersSummary(), states: BILLING_STATES, currency: CURRENCY, contract: GATEWAY_CONTRACT,
    plans: plans.map((p) => ({ id: p.id, name: p.name, priceBRL: p.priceBRL, listPriceBRL: p.listPriceBRL ?? null, annual: p.annual ? { priceBRL: p.annual.priceBRL } : null, dailyCredits: p.dailyCredits ?? null, monthlyCredits: p.monthlyCredits ?? null, noWatermark: p.noWatermark === true, buyCredits: p.buyCredits === true })),
    credits: { balance, unit: 'créditos', model: 'concessão diária + lotes com validade (livro-razão local)', purchaseEnabled: false },
    user: { plan: user.plan || null, billing: user.billing || 'monthly' },
    charged: false, state: 'sem_cobranca',
    note: ad.enabled ? 'Nenhuma cobrança nesta instalação: os planos são trocados localmente e o saldo de créditos não é comprado.' : 'Gateway desabilitado: nada é cobrado; o contrato está descrito e falta credencial.',
  };
}
