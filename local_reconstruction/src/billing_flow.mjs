// Fluxo de pagamento (#39) — SÓ ESTRUTURA (decisão do usuário): checkout, webhook e portal contra o
// gateway CONFIGURADO no ambiente (BILLING_GATEWAY_BASE_URL — nos testes, um servidor falso). Sem SDK,
// sem gateway real, sem cobrança: o que existe é o fluxo completo e verificável para ligar depois.
// Webhook: assinatura HMAC-SHA256 do corpo cru com BILLING_WEBHOOK_SECRET (X-Signature) — conferida
// antes de QUALQUER mudança de estado (regra em GATEWAY_CONTRACT.webhook.rule).
import crypto from 'node:crypto';
import { priceFor, applyPlanChange, BILLING_STATES, CURRENCY, GATEWAY_CONTRACT } from './billing.mjs';

export const GATEWAY_ENV = Object.freeze({ base: 'BILLING_GATEWAY_BASE_URL', key: 'BILLING_GATEWAY_KEY', webhookSecret: 'BILLING_WEBHOOK_SECRET', portal: 'BILLING_PORTAL_URL' });

export function gatewayConfig(env = process.env) {
  const baseUrl = (env[GATEWAY_ENV.base] || '').replace(/\/+$/, '');
  const key = env[GATEWAY_ENV.key] || '';
  const webhookSecret = env[GATEWAY_ENV.webhookSecret] || '';
  const problem = !baseUrl ? `defina ${GATEWAY_ENV.base} no ambiente` : !key ? `defina ${GATEWAY_ENV.key} no ambiente` : null;
  return { baseUrl, key, webhookSecret, configured: !!(baseUrl && key), problem };
}

// Eventos do contrato → estados locais (BILLING_STATES). Só isso muda estado; nada é aplicado sem verificação.
export const WEBHOOK_EVENTS = Object.freeze({
  'checkout.completed': 'checkout_pendente',
  'payment.paid': 'pago',
  'payment.failed': 'recusado',
  'refund.created': 'reembolsado',
});

export function signWebhook(rawBody, secret) {
  return crypto.createHmac('sha256', String(secret || '')).update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8')).digest('hex');
}
export function verifyWebhook(rawBody, signature, secret) {
  const want = signWebhook(rawBody, secret);
  const got = String(signature || '').trim().toLowerCase();
  if (!got || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(want, 'hex'), Buffer.from(got, 'hex'));
}

// POST {base}/v1/checkout/sessions (contrato GATEWAY_CONTRACT.checkout). O valor vem do catálogo local;
// a sessão nasce como "checkout_pendente" e só o webhook assinado muda o estado.
export async function createCheckout({ planId, billing = 'monthly', customerReference = null, successUrl = null, cancelUrl = null, env = process.env, fetchImpl = fetch, now = Date.now() } = {}) {
  const cfg = gatewayConfig(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `gateway não configurado: ${cfg.problem}`, env: GATEWAY_ENV, contract: GATEWAY_CONTRACT.checkout };
  // Valor e validação vêm do catálogo local (priceFor); o adaptador `gateway` do billing.mjs continua
  // "estrutura desabilitada" (checkoutIntent responde 501 lá) — este fluxo é a camada testável acima dele.
  const price = priceFor(planId, { billing });
  if (price.error) return { ok: false, status: 400, error: price.error };
  if (price.amount === 0) return { ok: false, status: 400, error: 'plano gratuito: nada a cobrar — nenhum checkout é criado' };
  const intentId = 'ck_' + now.toString(36) + Math.random().toString(36).slice(2, 8);
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/v1/checkout/sessions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.key}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ plan_id: planId, billing: billing === 'annual' ? 'annual' : 'monthly', customer_reference: customerReference, success_url: successUrl, cancel_url: cancelUrl, amount: price.amount, currency: CURRENCY }),
      signal: ac.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `o gateway recusou o checkout (HTTP ${res.status})` };
    return { ok: true, session: { id: data.id || null, url: data.url || null, amount: data.amount ?? price.amount, currency: data.currency || CURRENCY, status: data.status || 'checkout_pendente', intentId } };
  } catch (e) {
    return { ok: false, error: `falha de rede com o gateway: ${String(e.message || e).slice(0, 160)}` };
  } finally { clearTimeout(t); }
}

// Portal de autoatendimento (contrato GATEWAY_CONTRACT.portal).
export async function createPortal({ env = process.env, fetchImpl = fetch, customerReference = null } = {}) {
  const cfg = gatewayConfig(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `gateway não configurado: ${cfg.problem}`, env: GATEWAY_ENV, contract: GATEWAY_CONTRACT.portal };
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15_000);
  try {
    const url = new URL(`${cfg.baseUrl}/v1/billing/portal`);
    if (customerReference) url.searchParams.set('customer_reference', String(customerReference));
    const res = await fetchImpl(url, { headers: { authorization: `Bearer ${cfg.key}`, accept: 'application/json' }, signal: ac.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `o gateway recusou o portal (HTTP ${res.status})` };
    return { ok: true, portalUrl: data.url || data.portal_url || null };
  } catch (e) {
    return { ok: false, error: `falha de rede com o gateway: ${String(e.message || e).slice(0, 160)}` };
  } finally { clearTimeout(t); }
}

// Webhook assinado: verifica a assinatura ANTES de interpretar; só eventos do contrato mudam estado.
export function handleWebhook({ rawBody, signature, env = process.env }) {
  const cfg = gatewayConfig(env);
  if (!cfg.webhookSecret) return { ok: false, status: 503, error: `segredo do webhook ausente: defina ${GATEWAY_ENV.webhookSecret} no ambiente` };
  if (!verifyWebhook(rawBody, signature, cfg.webhookSecret)) return { ok: false, status: 401, error: 'assinatura do webhook inválida — evento descartado, nada foi aplicado' };
  let event = null; try { event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)); } catch { return { ok: false, status: 400, error: 'corpo do webhook não é JSON' }; }
  const state = WEBHOOK_EVENTS[event?.type];
  if (!state) return { ok: false, status: 400, error: `evento desconhecido: ${String(event?.type || '(vazio)')} — nada foi aplicado` };
  return { ok: true, event: { type: event.type, sessionId: event.session_id ?? event.sessionId ?? null, planId: event.plan_id ?? event.planId ?? null }, state };
}

// Aplica o estado confirmado (local, sem cobrança): sessão + troca de plano local quando "pago".
export function applyWebhookState(session, { event, state }) {
  const next = { ...session, state, lastEvent: event.type, updatedAt: new Date().toISOString() };
  let planChange = null;
  if (state === 'pago' && event.planId) { planChange = applyPlanChange({ planId: event.planId }); if (planChange.ok) next.plan = planChange.plan; }
  return { session: next, planChange };
}

export const flowSummary = () => ({
  line: '#39 compra/assinatura real — SÓ ESTRUTURA (decisão do usuário): sem gateway real e sem cobrança',
  env: { ...GATEWAY_ENV }, states: [...BILLING_STATES], events: Object.keys(WEBHOOK_EVENTS), contract: GATEWAY_CONTRACT,
  note: 'Fluxo completo (checkout/webhook assinado/portal) testado contra servidor falso; não verificado contra gateway real (UNOBSERVED).',
});
