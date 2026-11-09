# Planos do Pippit (BRL, conta brasileira, aba "Mensal") — observado pelo REA
Fonte: `captures/auth/inspect_plans_modal.json` (inspeção passiva do modal de assinatura aberto pelo usuário), árvore de acessibilidade em `captures/auth/plans_modal_tree.txt`. Data da captura: 2026-10-20 (oferta com contagem regressiva visível). Classificação: **[V]** visto na tela; **[?]** não verificado. Nada foi comprado.

| | Gratuito | Starter | Plus | Pro |
|---|---|---|---|---|
| Preço mensal exibido [V] | R$0 "Sempre gratuito", sem cartão | **R$7,59** (tachado R$76; selo 90% OFF; "preço especial" com cartão débito/crédito/PayPal, "com outras formas de pagamento" difere [texto cortado]) | **R$109,90** (tachado R$183; 40% OFF) | **R$1.588** (tachado R$2.647; 40% OFF) |
| Créditos por mês [V] | diários: 80/dia (observado) | 1.575 (= R$1 → 207,51 créditos) | 3.885 (R$1 → 35,35) | 59.000 no nível selecionado (R$1 → 37,15); seletor com 5 níveis: 8,6k · 17,6k · 23,5k · 35,5k · 59k (preço dos outros níveis [?]) |
| Vídeos de 10 s/mês (estimativa da UI) | — | 19 | 48 | 737 |
| Desconto em créditos [V] | — | 43% no Seedance 2.0 Fast 720p | 57% no Seedance 2.5 720p; 43% no 2.0 Fast 720p | 76% no Seedance 2.5 720p; 43% no 2.0 Fast 720p |
| Preço do Seedance 2.5 [V] | — | a partir de R$0,18/s (oferta) | — | a partir de R$0,24/s (rótulo do bloco Plus/Pro) |
| Armazenamento [V] | — | 500 GB | 500 GB | ilimitado |
| Avatares de vídeo grátis [V] | 1 personalizável? (Gratuito: "Criar 3 avatares de foto grátis, em 30+ idiomas") | 1 | 3 | 10 |
| Avatares de foto | 3 grátis | ilimitados | ilimitados | ilimitados |
| Recursos | créditos diários, Agente de vídeo, remix de virais, foto falante, Agente de imagem, vídeos de avatar; "alguns recursos custam créditos" | + comprar créditos, geração rápida, modelos avançados, remover marca d'água, amplificar até 4K, mais tarefas simultâneas, gerenciar produtos e conteúdo | + GPT Image 2.5 (economize 60% em créditos), geração "ainda mais rápida" | + geração "mais rápida", acesso antecipado ao beta |
| Botão | "Plano atual" | "Pague R$7.59" e "Pague R$46" [significado do 2º: ?] | "Assinar" | "Assinar" |
- Abas: **Mensal (90% OFF)** e **Anual (40% OFF)**; a aba Anual **não foi capturada** [?].
- Banner de oferta limitada: "Seedance oficial / Por tempo limitado", contagem regressiva em dias/horas/minutos/segundos.
- Endpoints associados: `POST /commerce/v1/subscription/cc_price_list`, `/commerce/v3/benefits/batch_get_user_benefit`, `/commerce/v3/resource/benefit_metadata` (corpos não retidos pelo REA).
- Consistência interna conferida: créditos ÷ preço reproduz "R$1 = N créditos" nos três planos pagos (ver `local_reconstruction/test/plans.test.mjs`).

## Aba Anual (capturada pelo REA em `captures/auth/b4_video_tile_a2/`, paywall "Assine o Starter agora para uso ilimitado de Vídeo em avatar") [V]
| | Starter | Plus | Pro |
|---|---|---|---|
| Preço anual | R$513 (tachado R$855; 40% OFF) | R$1.252 (tachado R$2.087) | R$18.325 (tachado R$30.542) |
| Créditos mensais | 1.575 ("R$1 = 36,84") | 3.885 ("R$1 = 37,24") | 59.000 ("R$1 = 38,64"; seletor 8,6k/17,6k/23,5k/35,5k/59k) |
| Seedance 2.5 a partir de | — | R$0,43/s | R$0,23/s |
Os "R$1 = N" conferem com créditos ÷ (preço anual ÷ 12). Listas de recursos iguais às da aba mensal. **Regra de avatar**: o plano gratuito vê o paywall ao tentar criar **Vídeo em avatar**; Starter/Plus/Pro dão 1/3/10 avatares de vídeo personalizados grátis; avatares de foto ilimitados a partir do Starter; gratuito tem 3 usos de foto em avatar.
