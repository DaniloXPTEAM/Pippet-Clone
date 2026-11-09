// Livro-razao de creditos observado na conta gratuita (captures/auth/credit_details_accessibility.txt).
// Regras observadas: lotes com validade; debito consome o lote que vence primeiro; ao vencer, o saldo restante vira "Expired -N".
// Tres bolsas (benefits/user_credit -> {vip_credit, gift_credit, purchase_credit}): vip = assinatura, gift = gratuitos e bonus (a conta gratuita observada tinha gift_credit 125), purchase = comprados.
// Aqui todo credito concedido localmente (diario +80, bonus +200) e 'gift'; vip e purchase ficam em 0 porque assinatura e compra estao bloqueadas.
// NAO observado (DESCONHECIDO): ordem de consumo ENTRE bolsas (aqui: lote que vence primeiro, de qualquer bolsa), ordem entre lotes de mesma validade, regras de planos pagos, estorno em falha de geracao.
export const POUCHES = ['vip', 'gift', 'purchase'];
export class CreditLedger {
  constructor() { this.lots = []; this.entries = []; }
  grant(label, amount, at, expiresAt, pouch = 'gift') { if (!POUCHES.includes(pouch)) throw new Error('bolsa invalida'); this.lots.push({ label, remaining: amount, expiresAt: new Date(expiresAt), pouch }); this.entries.push({ at: new Date(at), label, delta: +amount, pouch }); }
  expireUntil(now) {
    now = new Date(now);
    for (const lot of this.lots.filter((l) => l.expiresAt <= now && l.remaining > 0).sort((a, b) => a.expiresAt - b.expiresAt)) {
      this.entries.push({ at: lot.expiresAt, label: 'Expired', delta: -lot.remaining, pouch: lot.pouch || 'gift' }); lot.remaining = 0;
    }
  }
  debit(label, amount, at) {
    this.expireUntil(at);
    const live = this.lots.filter((l) => l.remaining > 0).sort((a, b) => a.expiresAt - b.expiresAt);
    if (live.reduce((s, l) => s + l.remaining, 0) < amount) return { ok: false, reason: 'insufficient_credits' };
    let left = amount; const split = {}; for (const l of live) { const t = Math.min(l.remaining, left); l.remaining -= t; left -= t; const k = l.pouch || 'gift'; split[k] = (split[k] || 0) + t; if (!left) break; }
    this.entries.push({ at: new Date(at), label, delta: -amount, pouches: split }); return { ok: true, pouches: split };
  }
  balance(now) { this.expireUntil(now); return this.lots.reduce((s, l) => s + l.remaining, 0); }
  // saldo por bolsa, no formato observado de benefits/user_credit
  balances(now) { this.expireUntil(now); const o = { vip_credit: 0, gift_credit: 0, purchase_credit: 0 }; for (const l of this.lots) o[`${l.pouch || 'gift'}_credit`] += l.remaining; return o; }
}
