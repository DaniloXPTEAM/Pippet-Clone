# ENTREGA 17 — 2026-11-12 (rodada 17)

A entrega 17 fecha os pontos apontados pela validação da r16 no Windows (**133 ok / 2 skip / 1 falha instável de 135**): a falha instável (`features_ui`) foi corrigida, o histórico do git foi restaurado por completo e o inventário foi recontado com o placar real.

## O que a entrega 17 contém

- `LEIA_PRIMEIRO_NOVA_SESSAO.md` — contrato e estado (atualizado com o placar do Windows).
- `STATUS.md` — estado atual com a recontagem.
- `ENTREGA.md` — este documento.
- `FEATURE_INVENTORY.md` — inventário recontado (423 linhas granulares: **84 verificadas / 66 implementadas (conteúdo UNOBSERVED) / 1 não verificada (instável) / 272 inventadas**).
- `PROVA_HISTORICO.md` — a restauração do histórico (as fontes, o método e os números).
- `SHA256SUMS` — formato `hash  arquivo` (2 espaços).
- `MANIFESTO.md` — conferências (inclui a prova do bundle com `git clone`).
- `pippet-clone-r17.bundle` — bundle git **autossuficiente com TODOS os commits** (branch + tags de legado).
- `pippet-clone-r17.zip` — pacote completo (tudo exceto `.git`, `.claude`, `node_modules`).

## Os 3 itens da rodada

1. **`features_ui` corrigido** — ordem determinística das notificações (eventos reais primeiro, data desc, empate por id; anúncios sem data por último) + teste que acha a nota pelo conteúdo (`hasText`, não a primeira). **10/10 execuções seguidas** na rota de notificações. Falta a suíte do Windows para fechar.
2. **Histórico restaurado** — a remontagem tinha deixado o bundle da r16 com 9 commits. Recuperado o histórico completo: branch com **53 commits** (r14 + r15 + r16 + r17), **72 commits** ao todo (as tags `legado-r16-original` e `legado-branch-antiga` preservam os objetos antigos). Prova do bundle (clone em pasta vazia + nº de commits) no `MANIFESTO.md`.
3. **Recontagem** — placar do Windows da r16 registrado nos 4 documentos; os testes de tela passaram a contar (validação real), menos a linha de `features_ui` (instável): **84 verificadas / 66 implementadas (conteúdo UNOBSERVED) / 1 não verificada / 272 inventadas** (423 linhas).

## Como restaurar

```bash
unzip pippet-clone-r17.zip
cd pippet-clone-r17 && cd local_reconstruction && node test/run-all.mjs
# ou pelo bundle (com git):
git clone pippet-clone-r17.bundle pippet-clone-r17
```

## Quanto falta para terminar

- **Para o reproduzível**: falta **1 linha não verificada** (`features_ui`) — a correção está nesta rodada; rodando a suíte no Windows e passando, tudo o que é possível com a evidência existente fica fechado.
- **Para o catálogo inteiro (423 linhas)**: 272 (64%) são conteúdo apagado/não documentado — sem evidência nova do Pippit não voltam; o teto sem evidência nova é **151/423 = 36%**.
- **Push**: apenas no fim do projeto, por ordem explícita ("PUSH AUTORIZADO").
