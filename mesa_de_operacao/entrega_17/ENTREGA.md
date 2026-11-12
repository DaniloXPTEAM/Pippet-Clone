# ENTREGA 17 (revisada) — Pippet-Clone, 2026-11-12

Resumo: a r16 foi validada no Windows (133 ok / 2 skip / 1 falha instável de 135); esta rodada corrigiu a instável, restaurou o histórico **com os SHAs originais dos bundles** e passou a rodar **a suíte inteira, incluindo os 56 testes de tela, neste sandbox**: **133 ok / 2 skip / 0 falhas (de 135)**.

## Os 3 pontos da revisão

1. **Réguas lado a lado** — `FEATURE_INVENTORY.md`: **105/122 = 86,1%** (critério antigo da r15) e **151/423 = 35,7%** (catálogo integral: 85 verificadas / 66 implementadas UNOBSERVED / 272 inventadas). Denominadores diferentes; explicação no próprio inventário (e corrigido o texto de "229 linhas").
2. **Histórico sem reescrever os bundles** — a r15 e a r16 nasceram em ramos paralelos (o `.git` foi apagado na virada r15→r16). A costura (merge `5a82113`) une os dois ramos: **53/53 commits dos bundles com SHA original**; só os commits fora de bundle ganham SHA novo (`PROVA_HISTORICO.md` traz o mapa lado a lado).
3. **Os 56 testes de tela contam** — com Chromium 153 headless (`@sparticuz/chromium`) a suíte roda completa aqui: **133 ok / 2 skip explícitos (evidência local ausente) / 0 falhas**. `features_ui` passou **4/4** (a instabilidade era o loop de espera por `unread`, corrigido no item 1).

## O que vem no pacote

`pippet-clone-r17.bundle` (autossuficiente — clone em pasta vazia prova o histórico; números no `MANIFESTO.md`), `pippet-clone-r17.zip` (sem `.git/.claude/node_modules`), `SHA256SUMS` (formato `hash  arquivo`), `MANIFESTO.md`, `LEIA_PRIMEIRO_NOVA_SESSAO.md`, `STATUS.md`, `FEATURE_INVENTORY.md`, `PROVA_HISTORICO.md`, `ENTREGA.md` (este). **Sem push; nenhuma chave.**
