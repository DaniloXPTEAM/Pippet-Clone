# PROVA DE HISTÓRICO — rodada 17, item 2

## O que tinha sido perdido

O `.git` foi perdido e remontado como clone raso novo em `ba09c73` ("Create ORQUESTRADOR_PIPERLINE.md", 1 commit visível). O bundle da r16 saiu com 9 commits e o clone de prova não restaurava o histórico do projeto (a r15 tinha 44).

## De onde veio cada parte (nada foi inventado)

| Fonte | O que trouxe | Commits |
|---|---|---|
| `git fetch --unshallow origin` + fetch das branches do GitHub | linha `main` + `arena/a14d8a49-pippet-clone-r14` (ponta `76aee1a`, rodada 14) + branch antiga `arena/a14d8a49-pippet-clone` (ponta `1443745`) | 3 + 31 + 14 |
| Drive `piperline_rodada15.bundle` (17.892.500 B) | a linha completa da r15 (inclui a -r14), ponta `e07f5b2` | 44 |
| Drive `pippet-clone-r16.bundle` (17.875.882 B) | os commits da r16 sobre o snapshot `ba09c73` | 9 |

## Como foi remontado

Cada commit perdido foi recriado com `git commit-tree` **reusando a árvore, mensagem, autor e datas originais**, encadeado sobre `e07f5b2` (ponta da r15, que contém toda a r14):

```
… (r14/r15: 44 commits) → e07f5b2
→ 5834745 Create ORQUESTRADOR_PIPERLINE.md        (árvore de ba09c73)
→ 5e72fd6 rodada 16 item 1 …                      (árvore de 4dd9126)
→ c768601 rodada 16 item 2 …                      (árvore de b8df76b)
→ 1587f0c rodada 16 item 3 …                      (árvore de 4640719)
→ 73227c1 rodada 16 item 4 …                      (árvore de 07a06d1)
→ cc107e3 rodada 16 item 5 …                      (árvore de 399e129)
→ 283ac3d rodada 16 item 6 …                      (árvore de 3684da6)
→ fb9db1f rodada 16: MANIFESTO e SHA256SUMS …     (conteúdo do commit perdido 5138ba8)
→ adab41c rodada 17 item 1 …                      (ordem determinística + hasText)
```

Os objetos antigos **não foram apagados**: seguem referenciados pelas tags `legado-r16-original` (ponta `3684da6`) e `legado-branch-antiga` (ponta `1443745`), e entram no bundle — **todos os commits** ficam preservados.

## Números (conferidos por `git rev-list`)

- **Branch `arena/d9cee29f-pippet-clone`: 53 commits** (44 da r15/r14 + 9 recriados).
- **Total no repositório (todas as refs/tags): 72 commits**.
- A working tree ficou **idêntica** ao estado validado da r16 (133/2/1 no Windows) mais a correção do item 1 — `git status` limpo após o `reset --hard`.

A prova final do bundle (clone em pasta vazia + nº de commits) está no `MANIFESTO.md` e no `ENTREGA.md` da entrega_17.
