# SEM_PAYWALL_R20 — remoção de bloqueios (rodada 20)

**Regra (decisão do usuário — vale para sempre): NESTE PRODUTO TUDO É GRATUITO E SEM BLOQUEIO.** "Igual
ao Pippit" vale para telas, fluxos e funções, NÃO para cobrança. Nenhum paywall, nenhum bloqueio por
plano ou por modelo, todos os modelos livres (vídeo, imagem, áudio). Preço só existirá no futuro, em
OUTRO produto. A estrutura de pagamento fica no código, desligada. Preços e paywall observados ficam SÓ
nos documentos de evidência (`../entrega_19/ADENDO_R19.md`), marcados *"observado no original, não
reproduzido por decisão do usuário"*.

## 1. O que foi REMOVIDO (varredura: paywall, plansModal, is_allowed, Upgrade, Subscribe, plan === 'free', LimitFree, 409 por plano)

| Bloqueio removido | Onde estava | Substituído por | Commit |
|---|---|---|---|
| Envio em modo Áudio não gerava e abria o modal "Subscribe to boost your business" | `app/public/app.js` (fluxo de envio) | **Gera com o provedor gratuito por padrão**; sem provedor → mostra o motivo (toast), nunca planos | item 1 |
| Modal de assinatura `subscribeModal` ("Subscribe to boost your business", Monthly/Yearly, slider, botão **Subscribe**) | `app/public/app.js` | **Removido**; a tela de planos virou informativa (ver item 2) | item 2 |
| Preços em R$ na tela de planos (R$513/R$855, R$1,252/R$2,087, R$18,325/R$30,542) e em "Ofertas observadas" (R$/s) | `app/public/app.js` | Sem valores; "No momento gratuito — em breve"; valores observados só em `ADENDO_R19.md` | item 2 |
| Paywall por MODELO ("Assine o Starter agora para uso ilimitado de X" ao enviar com modelo nomeado) | `app/public/app.js` | Toast com o motivo (sem provedor para o modelo); nada abre planos | item 1 |
| Paywall por PLANO no envio de Imagem auto (`ST.user.plan === 'free'`) e no Auto Route (`status !== 1 → plansModal()`) | `app/public/app.js` | Sem condição de plano; o check de benefícios segue no fluxo mas nunca bloqueia | item 1 |
| `checkModelAccess` — gating de modelo por plano no agente (falha "Assine para continuar usando este recurso", cartão "recurso Starter" com "Assinar agora") | `src/workflow.mjs` (usado por `app/lib/agent.mjs`) | Sem efeito (todo modelo livre); a regra observada fica como evidência no comentário | item 4 |
| Avatar de foto: 3 usos gratuitos e **402** "Assine para continuar" (débito de usos por envio) | `app/server.mjs`, `src/avatar.mjs`, `app/public/app.js` | Sem limite e sem 402; `photoFreeUses` é só informação (não debitado); UI mostra "Ilimitado" | item 1 |
| Avatar de vídeo: **402** com paywall "Assine o Starter…" em plano free | `app/server.mjs`, `src/avatar.mjs` | **501** com o motivo real (serviço de geração do Pippit ausente); botão "Entendi", sem "Assinar agora" | item 1 |
| `batch_check_withhold_deduct` bloqueava (status 2, `paywall:'subscribe'`, `missing_max_role:'starter'`, `missing_role`) sem tentativas/saldo | `src/directgen.mjs` | Nunca bloqueia (status 1, paywall null); campos `LimitFree`/`missing_role` = estrutura, desligada e informativa | item 1 |
| Falha "Subscription required (local rule…)" no processamento de run | `src/directgen.mjs` | Removida | item 1 |
| Débito de créditos por geração (`charge` ligado por padrão) | `src/directgen.mjs` | Desligado por padrão (`charge === true` para ligar); o produto nunca debita | item 1 |
| CTA "Assine para obter mais créditos" nos detalhes de créditos | `app/public/app.js` | "Ver planos" (informativo) | item 2 |
| **409 por plano** | — | **Nenhum encontrado** (os 409 do servidor são por configuração/adapter ausente: Supabase, voz-clonada etc.) | item 4 |
| **Upgrade** | — | **Nenhum** em código | item 4 |

## 2. O que FICOU na varredura (e por quê)

- `is_allowed` em `POST /api/biz/v2/videogen/check` (`app/server.mjs`): **espelho do contrato observado** (o fluxo continua chamando o check), nunca bloqueia.
- `LimitFree`, `consume_types`, `missing_role`, `paywall: null` em `src/directgen.mjs`: **estrutura de pagamento observada, mantida no código e desligada** (o que a ordem chamou de "estrutura fica no código").
- `paywallType`/`checkPaywall` em `app/lib/talking_photo_contract.mjs`: **parser de contrato de fidelidade** do original (evidência); não bloqueia o produto.
- `/api/billing/flow/*` e `/api/billing/checkout|webhook` (501): estrutura de pagamento, desligada; testes `billing_structure`/`billing_flow` cobrem a estrutura.
- `PLANS`/`AVATAR_RULES` (`src/plans.mjs`) e `photoFreeUses` (`app/lib/store.mjs`): dados **observados** (evidência/estrutura); a UI não exibe preços nem limites.
- `plan === 'free'` em `app/server.mjs`/`src`: restam só como **estrutura de plano local** (troca de plano em `/api/plan`), sem efeito de bloqueio (nenhum gate).
- Comentários com "paywall"/"Assine"/"Subscribe" em `src/plans.mjs`, `app/server.mjs`, `src/workflow.mjs`: todos marcados como **evidência observada, não reproduzida**.

## 3. Teste que PROVA (usuário novo gera vídeo, imagem e áudio sem ver tela de planos)

`local_reconstruction/test/sem_paywall_ui.test.mjs` (no `run-all`, registro `sem_paywall_ui`), com estado
novo e **provedores falsos** (`local-ffmpeg`, mock OpenAI-compatível em loopback, `PIPPIT_TTS=fake`):

1. **Vídeo** gerado (nó do canvas, provedor falso `local-ffmpeg` — não-IA) ✓
2. **Imagem** gerada (mock `/v1/images/generations` em loopback) ✓
3. **Áudio** gerado (envio no modo Áudio pela UI, `PIPPIT_TTS=fake`) ✓
4. Gatilhos que ABRIAM paywall no r19 exercitados: envio com modelo nomeado (mostra só o motivo) e
   "Vídeo em avatar" (mostra só o motivo do serviço ausente) ✓
5. Um `MutationObserver` registra TODA tela de modal exibida durante o teste: **nenhuma tela de planos**,
   nenhum "No momento gratuito", "Subscribe", "Assine" ou valor em R$ ✓

Complementares (verdes): `plans_modal_ui` (tela de planos com "No momento gratuito — em breve", botões
desabilitados, sem R$/Subscribe), `workflow` (modelo `requiresPlan` não bloqueia), `canvas_avatar`,
`directgen*` (check nunca bloqueia; sem débito), `e2e` (avatar sem limite/paywall), `composer_audio_mode`
(gera por padrão; provedor falso gera), `videogen_check_route` (padrão ligado; `=0` mostra o motivo).

## 4. Marcação nos documentos de evidência

`../entrega_19/ADENDO_R19.md`: banner de correção r20 no topo + seção 5 (paywall/preços) marcada
*"observado no original, não reproduzido por decisão do usuário"* (grep -F da marcação: 4 ocorrências).
