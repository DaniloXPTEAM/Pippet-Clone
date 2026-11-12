# Prova do histórico (r17 revisada) — o que é original e o que foi recriado

Revisão do ponto 2: na primeira restauração da r17, os commits da r16 (e o ORQUESTRADOR) foram **recriados** com `commit-tree` para linearizar o branch — árvores e mensagens iguais, mas **SHAs novos**. Esta versão corrige: os **53 commits dos dois bundles anteriores entram com os SHAs originais**.

## O que aconteceu com o `.git`

1. **r1–r15 (44 commits, SHAs originais)** — criados num repositório saudável; capturados no `piperline_rodada15.bundle` (Drive, `entrega_15`). Raiz comum: `851a3b5` (Initial) → `48ca7bb` (Importa PiperLine) → 31 commits r1–r14 (`76aee1a`) → 13 commits r15 (`e07f5b2`).
2. **virada r15→r16: o sandbox apagou o `.git` de novo** (clone raso em `ba09c73` = `origin/main`). A r16 foi commitada sobre `ba09c73`, **sem** os r1–r15: nasceu truncada (9 commits = `851a3b5`, `48ca7bb`, `ba09c73`, 6 itens r16 → `3684da6`). Esse é o `pippet-clone-r16.bundle` (Drive, `entrega_16`).
3. Os dois históricos são **ramos paralelos** com merge-base `48ca7bb`. Para ter um branch único, a primeira restauração da r17 reescreveu os commits da r16 (SHAs novos) — foi o que o usuário apontou. **Correção (esta revisão): um commit de merge (costura) que une os dois ramos sem tocar em nenhum SHA de bundle.**

## Como o branch está agora

```
851a3b5 → 48ca7bb ─┬─ [31 commits r1–r14] → [13 commits r15] → e07f5b2 ─┐
                   └─ ba09c73 → [6 itens r16] → 3684da6 → b2dc510 ──────┴→ 5a82113 (merge/costura) → itens r17
```

- **53 commits com SHA original** (todos os dos bundles r15 e r16): 44 do ramo r1–r15 (`e07f5b2`…) + 9 do ramo r16 (`3684da6`…) — nada foi reescrito.
- **Novos SHAs** apenas onde não há objeto original em lugar algum (fora de qualquer bundle):

| commit | SHA antigo (perdido) | SHA na branch final | por quê |
|---|---|---|---|
| manifesto r16 (MANIFESTO+SHA256SUMS) | `5138ba8` (fora da árvore `3684da6`; nunca em bundle) | `b2dc510` | objeto sumiu na remontagem; refeito com os mesmos arquivos |
| costura r15+r16 | — (não existia) | `5a82113` | merge que preserva os dois ramos |
| r17 item 1 (notificações/`features_ui`) | `adab41c` (bundle r17 anterior) | `443a435` | re-pendurado sobre a costura; mensagem igual |
| r17 item 2 (histórico) | `5dd1c28` (bundle r17 anterior) | `29ded87` | idem; mensagem com os números atualizados |
| r17 item 3 (docs) | `850a5bf` (bundle r17 anterior) | `c7ff946` | idem |
| revisão r17 (réguas lado a lado, navegador, pacote) | — (novo) | commits seguintes | trabalho desta revisão |

A primeira versão da r17 também tinha recriado `ba09c73`→`5834745`, `4dd9126`→`5e72fd6`, `b8df76b`→`c768601`, `4640719`→`1587f0c`, `07a06d1`→`73227c1`, `399e129`→`cc107e3`, `3684da6`→`283ac3d` — **essa linearização foi descartada**; os SHAs originais (coluna da esquerda) são os da branch agora. Os objetos antigos continuam guardados nas tags `legado-r16-original` (`3684da6`) e `legado-branch-antiga` (`1443745`) e nos bundles do Drive.

## Como conferir (e o que o MANIFESTO prova)

```bash
git clone pippet-clone-r17.bundle p && cd p
git rev-list --count HEAD            # commits da branch
git rev-list --all --count           # tudo, com as tags legado
for s in e07f5b2 4dd9126 b8df76b 4640719 07a06d1 399e129 3684da6 ba09c73; do
  git cat-file -e "$s" && echo "$s ORIGINAL"   # todos devem existir com estes SHAs
done
```

Os números da prova (clone em pasta vazia) estão no `MANIFESTO.md` desta pasta.
