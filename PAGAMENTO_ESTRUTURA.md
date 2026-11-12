# PAGAMENTO_ESTRUTURA — planos, créditos e cobrança (estrutura pronta)

Contrato **interno do PiperLine**, escrito em 09/11/2026 para o item 5 da rodada 7. Existem dois adaptadores com o mesmo contrato: **`gratuito`** (o de hoje, funcional) e **`gateway`** (desabilitado, só contrato). **Nenhum SDK é importado, nenhuma chamada é feita e nada é cobrado.**

## 1. Peças

| Peça | Arquivo | Papel |
|---|---|---|
| Camada | `local_reconstruction/src/billing.mjs` | `BILLING_ADAPTERS` (`gratuito`, `gateway`), `priceFor`, `checkoutIntent`, `applyPlanChange`, `GATEWAY_CONTRACT`, `billingSummary`, `BILLING_STATES`. |
| Rotas | `local_reconstruction/app/server.mjs` | `GET /api/billing`, `POST /api/billing/adapter`, `POST /api/billing/checkout`, `POST /api/billing/webhook`, `GET /api/billing/portal`; `POST /api/plan` agora passa por `applyPlanChange` e informa `charged: false`. |
| Tela | `local_reconstruction/app/public/app.js` | Modal de planos ganhou o bloco **“Cobrança (estrutura)”**: adaptador em uso, estado do gateway, contrato previsto (checkout/webhook/portal) e o botão “Fazer checkout (estrutura)”. |
| Teste | `test/billing_structure.test.mjs` | Contrato, preços do catálogo local, checkout sem cobrança em todos os caminhos, gateway 501 (com e sem assinatura), saldo/livro-razão intactos, rede zero e tela. |

## 2. Adaptadores

| id | estado | checkout | webhook | portal |
|---|---|---|---|---|
| `gratuito` | **funcional** (padrão) | não existe: devolve `state: sem_cobranca`, `charged: false` e o valor que **seria** cobrado, sem criar sessão | não existe | não existe |
| `gateway` | **desabilitado** | **501** + contrato + `missing` | **501**; **nada é processado**, nem com `X-Signature` | **501** |

Variáveis esperadas pelo gateway (**só nomes; nunca valores no código**): `BILLING_GATEWAY_BASE_URL`, `BILLING_GATEWAY_KEY`, `BILLING_WEBHOOK_SECRET`, `BILLING_PORTAL_URL`.

## 3. Contrato do gateway (para implementar depois)

| interface | método e endpoint | observações |
|---|---|---|
| checkout | `POST {BASE}/v1/checkout/sessions` com `{ plan_id, billing, customer_reference, success_url, cancel_url }` → `{ id, url, amount, currency, status }` | valor vem do catálogo local (`src/plans.mjs`), moeda BRL |
| webhook | `POST {BASE}/v1/webhooks` com `X-Signature: HMAC-SHA256(corpo cru, BILLING_WEBHOOK_SECRET)` | eventos `checkout.completed`, `payment.paid`, `payment.failed`, `refund.created`; **só aplica plano/créditos depois de verificar a assinatura** |
| portal | `GET {BASE}/v1/billing/portal` | autoatendimento (formas de pagamento, faturas, cancelamento) |

Estados previstos: `sem_cobranca`, `checkout_pendente`, `pago`, `recusado`, `reembolsado`. Hoje o único estado produzido é `sem_cobranca`.

## 4. Créditos

- O saldo continua vindo do livro-razão local (`src/credits.mjs`): concessão diária + lotes com validade.
- Compra de crédito **não existe**: `credits.purchaseEnabled = false` na API e nenhum débito/crédito é criado por checkout.
- `POST /api/plan` troca o plano **localmente** para exercitar limites, sem cobrança — igual à rodada anterior, agora com a camada de cobrança no caminho.

## 5. O que falta para cobrar de verdade

1. Escolher e contratar o gateway (decisão do usuário) e definir preços/créditos por plano comercialmente.
2. Credenciais no **ambiente** e implementação das três interfaces acima, com verificação de assinatura obrigatória.
3. Decidir o que acontece com o plano quando o pagamento falha/é reembolsado (regra de negócio, não técnica).
