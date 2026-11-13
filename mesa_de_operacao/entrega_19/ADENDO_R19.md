# Adendo r19 — reprodução das observações Playwright de 13/11/2026

> **CORREÇÃO r20 (decisão do usuário — vale para sempre): NESTE PRODUTO TUDO É GRATUITO E SEM BLOQUEIO.**
> O item 5 abaixo (paywall de Áudio + preços) **estava ERRADO como direção de reprodução e foi desfeito**:
> os preços e o paywall observados no Pippit ficam **SÓ neste documento de evidência**, marcados
> **"observado no original, não reproduzido por decisão do usuário"**. Nenhum paywall, nenhum bloqueio
> por plano ou modelo, sem valores em R$ e sem "Subscribe" na UI; estrutura de pagamento fica no código,
> desligada. Ver `mesa_de_operacao/entrega_20/SEM_PAYWALL_R20.md`.

Fonte: observações do Pippit real (Playwright, 13/11/2026), conforme ordem do usuário. Cada item = um commit com teste. Textos observados reproduzidos EXATAMENTE (inglês, verbatim). Nada inventado virou "observado": tudo que não foi capturado está marcado UNOBSERVED.

## Itens e status

| # | Item (ordem do usuário) | Commit | Testes |
|---|---|---|---|
| 1 | Textos dos modos de criação | `ba200dc` | `composer_controls_route`, `composer_dropdowns_ui`, `fidelity2_ui` |
| 2 | Painel de Áudio (modelos/sample rate/custo) | `b3200ac` | `composer_audio_mode`, `audio_mode_ui` |
| 3 | Feed "Featured works" + `/home?work_id=N` | `40e48db` | `home_recommend_route`, `featured_works_ui` |
| 4 | Link account = 3 canais (confirmado) | `d073743` | `link_account_channels`, `link_account_channels_ui` |
| 5 | Paywall de Áudio (Free) + modal de planos | `659bb8b` | `videogen_check_route`, `subscribe_modal_ui` |
| — | Ajustes de asserts envelhecidos + flaky | (segue) | `e2e`, `fidelity2_ui`, `pricing_reviews_ui` |

## 1. Modos de criação (textos EXATOS observados)

- **Agent**: "Long-form video — Describe your idea. Agent refines it and chooses the right models."
- **Video**: "Choose a video model and generate directly."
- **Image**: "Choose an image model and generate directly."
- **Audio**: "Choose an audio model and generate directly."

Implementado no menu `#modeB` (app.js) e na rota `GET /api/composer/controls` (`creationModes`, `agent.optionsObserved=true`; 3 dos 5 controles do Agent seguem sem opções internas capturadas).

## 2. Painel de Áudio (observado)

- O botão **Skills some** no modo Áudio.
- Modelos (diamante = plano pago):
  - **Seed Audio 1.0** — "Supports reference audio for voice, sound effect, and music design"
  - **Standard voice generation** — "Clear voice style for roles that need crisp delivery"
- **Sample rate**: 8 / 16 / 24 / 32 / **44.1 (padrão)** / 48 kHz.
- **Custo**: 17 créditos por geração (34 riscado).
- `GET /api/composer/audio-mode` agora reporta `observed` (modelos/descrições/rates/custo) + `freeLocalProvider`.

## 3. Feed "Featured works" (Home)

- Cards de **título + autor** ("Featured works"), clique abre o detalhe em **`/home?work_id=N`**.
- Detalhe: **Close**, **Share**, **Author**, **Work intro**.
- API observada: **`POST /api/biz/v1/home/recommend_video`** (espelho local com envelope `{ret,errmsg,logId,data}`).
- **CONTEÚDO (títulos/autores/intros) não foi capturado** → itens de exemplo nossos, rotulados como exemplo no próprio feed (`FEATURED_WORKS` em `app/lib/catalog.mjs`). Campos exatos da resposta da API real = UNOBSERVED.

## 4. Link account (confirmado)

- O menu tem **apenas**: **TikTok**, **Facebook Page**, **Instagram Reels** (labels exatos observados).
- `GET /api/social` expõe `linkAccountChannels` = os 3; `POST /api/social/connect` recusa canal fora da lista (400) e mantém 501 honesto para OAuth real.
- Resolve a divergência do `PERGUNTAS_USUARIO.md` (YouTube no código vs menu): **menu = 3 canais**; o adaptador YouTube do catálogo estático não aparece no Link account.

## 5. Paywall de Áudio (plano Free) + modal de planos — *observado no original, não reproduzido por decisão do usuário (r20)*

- Enviar em modo Áudio **não gera**: a UI chama **`POST /api/biz/v2/videogen/check`** com `{"generate_source":1}` → resposta `data.is_allowed: true` → DEPOIS abre o modal **"Subscribe to boost your business"** (sequência observada).
- Modal (textos e preços ANUAIS observados):
  - Alternância **Monthly | Yearly**.
  - **Free** — "Always free — No credit card required" + **Current plan**.
  - **Starter (Best value)** — **R$513**/Yearly de ~~R$855~~.
  - **Plus** — **R$1,252**/Yearly de ~~R$2,087~~.
  - **Pro** — **R$18,325**/Yearly de ~~R$30,542~~ + **slider** (semântica do slider = UNOBSERVED).
  - Planos pagos: "Auto renews, cancel anytime." + botão **Subscribe**.
- **Pagamento = só estrutura** (diferença aceita; r20: estrutura desligada): Subscribe não cobra nada — *não reproduzido por decisão do usuário (r20)*.
- **Provedor gratuito local** ficava atrás da configuração nossa **`PIPPIT_FREE_AUDIO_PROVIDER`** — na r20 passou a **ligado por padrão** (produto gratuito, sem paywall; `=0` desliga mostrando o motivo). *O comportamento antigo ("padrão desligado = paywall observado") = observado no original, não reproduzido por decisão do usuário (r20).*

## UNOBSERVED (não inventado)

1. **Preços mensais** de todos os planos (marcados no modal).
2. **Corpo da requisição de geração de áudio** (além do check).
3. **SSE ao vivo** (fluxo de progresso em tempo real).
4. **Conteúdo do feed** (títulos/autores/intros reais) e campos exatos da resposta de `recommend_video`.
5. **Semântica do slider** do card Pro.

## Placar

- **Suíte do sandbox (este checkout, 12/11/2026): 146 ok / 2 skip / 0 falhas de 148.**
  - Comando: `PIPERLINE_CHROMIUM_EXECUTABLE=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023lib/lib PIPPIT_FFMPEG=<imageio-ffmpeg x86_64> PIPPIT_FFPROBE=<ffprobe-static> node local_reconstruction/test/run-all.mjs` (cwd = raiz do repositório).
  - Skips explícitos: `pageview` e `parity` — pedem evidências locais em `captures/` que não existem neste checkout (não é falha).
  - Base r18 neste checkout = 142 testes (140 ok / 2 skip / 0 falhas — mesmo placar validado no Windows em 13/11) + **6 testes novos** do adendo r19 = 148.
- **Réguas INALTERADAS** (nada foi promovido nesta ordem): **113/122 = 92,6%** (38 impl + 75 verif; 8 bloqueadas) e **152/423 = 35,9%** (canal 7 = 94|72|12|10|0|0).
- Os textos observados do r19 são novo material para promoção futura de linhas (modos do composer, presets de áudio, feed, Link account, paywall de áudio) — decisão de régua fica para reavaliação explícita, não automática.

## Pendências

1. **Validar a suíte no Windows** (146/2/0 de 148 esperado) — regra: só o resultado do navegador conta.
2. Preços mensais: capturar quando o usuário puder abrir a aba Monthly no Pippit real (o modal já marca UNOBSERVED e mostra os anuais).
3. Corpo da geração de áudio e SSE ao vivo: capturar com DevTools/Playwright quando possível.

## Costura do git (reparo de 13/11/2026)

O `.git` deste sandbox foi truncado entre turnos (branch de volta em `ba09c73`, sem pais) e o primeiro
`entrega_19_bundle.git` entregue continha só essa base — defeito reportado pelo PC e corrigido aqui.
A cadeia foi reconstituída sobre **`703889c`** (74 commits r15–r18, base do PC) com **2 commits
reconstituídos** (cauda r18: revisão do REA + verificação/mineração, era a621b0c/844e872; e este adendo
r19, era ba200dc…6bfaa02) — `git rev-list --count HEAD` = **76** (> 74). Bundle corrigido substitui o
defeituoso: clonável em pasta vazia, HEAD na branch, `git merge-base --is-ancestor 703889c HEAD` ok.
**Para a r20:** manter a cadeia (um commit por item sobre este HEAD), `git bundle create --all`, e mostrar
`git rev-list --count HEAD` (esperado > 76).
