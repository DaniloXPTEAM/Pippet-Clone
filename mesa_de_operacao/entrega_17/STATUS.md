# STATUS DA RECONSTRUÇÃO LOCAL DO PIPPIT — RODADA 17 (ENTREGA 17)

## 1. O que esta rodada fez

A r16 foi validada no Windows do usuário (com navegador): **133 ok / 2 skip / 1 falha instável (de 135)** — pacote íntegro (os 2 hashes batem). A r17 atacou os 3 pontos da ordem:

1. **`features_ui` (instável: passa 1 de 3) — corrigido** (`rodada 17 item 1`): causa provada — a espera era por `unread > 0`, que os 8 anúncios deixam sempre verdadeiro, e `.note.first()` podia pegar um anúncio. Agora o **servidor** ordena de forma determinística (eventos reais primeiro, data desc, empate por id; anúncios sem data por último) e o **teste** espera o evento real e acha a nota pelo conteúdo (`hasText`). **Prova: 10/10 execuções seguidas** na rota (`notifications_editorial_route`).
2. **Histórico completo restaurado** (`rodada 17 item 2`): o `.git` tinha sido perdido/remontado e o bundle da r16 saiu com 9 commits. Trouxe a r14/r15 do GitHub + dos bundles do Drive e recriou os commits perdidos com `commit-tree` (árvores e mensagens originais). A branch volta a ter **53 commits** (r14 → r15 → r16 → r17); **72 commits** ao todo com as tags `legado-r16-original` e `legado-branch-antiga`. `git status` limpo; working tree idêntica ao estado validado + correção do item 1. Detalhes em `PROVA_HISTORICO.md`.
3. **Recontagem rigorosa** (item 3): placar do Windows registrado e 56 testes de tela passam a contar (rodraram e passaram lá, menos a instável).

## 2. Contagens (FEATURE_INVENTORY, 423 linhas granulares)

| Estado | Linhas | % |
|---|---|---|
| verificada (teste passou aqui OU no Windows r16) | 84 | 20% |
| implementada (conteúdo UNOBSERVED) | 66 | 16% |
| não verificada (instável — `features_ui`) | 1 | 0,2% |
| inventada (conteúdo apagado/não documentado) | 272 | 64% |
| **Total** | **423** | 100% |

- **Implementação**: 150 de 423 = 35%. **Verificação**: 84 de 423 = 20%. Contagem interpretada (par clássico): **150 de 423 = 35%**.
- Regra inalterada: conteúdo UNOBSERVED/inventado com teste = "implementada (conteúdo UNOBSERVED)", nunca "verificada".

## 3. Pendências e riscos

1. Rodar a suíte no Windows para fechar `features_ui` (a última não verificada).
2. Conteúdo inventado/apagado (272 linhas): irreproduzível sem evidência nova do Pippit.
3. Bloqueios de licença/monetização: documentados, não simulados.
4. **Push só no fim do projeto** (ordem do usuário), quando escrever "PUSH AUTORIZADO".

## 4. Linha do tempo

r14 (11/11): ~83/122 · pacote r14 (56 UI no Windows = 2 falhas) · push `arena/a14d8a49-pippet-clone-r14`.  
r15 (11/11): 105/122 (régua antiga) · pacote r15 validado no Windows (4 defeitos).  
r16 (12/12): 4 defeitos corrigidos · régua honesta · pacote validado no Windows: **133/2/1 (135)**.  
**r17 (12/12): `features_ui` corrigida (10/10) · histórico restaurado (53 commits) · recontagem 84/66/1/272 · entrega_17.**
