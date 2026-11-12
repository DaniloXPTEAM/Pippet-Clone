# MANIFESTO — pippet-clone-r17 (entrega 17 revisada, 2026-11-12)

## Pacote

| Arquivo | Tamanho (bytes) | SHA256 |
|---|---|---|
| `pippet-clone-r17.bundle` | 17.996.698 | `19ae1c2679bea5a88a78b4f6f28c06027f812366fc65e4105eb95c4abc12ca49` |
| `pippet-clone-r17.zip` | 14.184.626 | `3b2023440cbddbff6e7b2c1177e7b0a5511ebd9d13899d8c22fa2bf0a23bb933` |

Formato de `SHA256SUMS`: `hash  arquivo` (2 espaços). `MANIFESTO.md` e `SHA256SUMS` acompanham os pacotes no Drive; **não** estão dentro do zip (evitar auto-referência de hash). O zip traz os 5 documentos + a árvore do projeto, sem `.git`, `node_modules`, `.claude`.

## Prova do bundle — `git clone` em pasta vazia

- HEAD do clone: `c17ac3f` (rodada 17 revisão, ponto 3). O commit deste MANIFESTO fica fora do bundle (auto-referência).
- **Commits da branch `arena/d9cee29f-pippet-clone` no clone: 59.**
- **Commits totais (`git rev-list --all --count`): 71** — inclui as tags `legado-r16-original` (`3684da6`) e `legado-branch-antiga` (`1443745`).
- **SHAs originais dos bundles anteriores: 8/8 conferidos presentes** (`e07f5b2`, `4dd9126`, `b8df76b`, `4640719`, `07a06d1`, `399e129`, `3684da6`, `ba09c73`) — a costura r15+r16 (merge `5a82113`) preserva os 53 commits dos bundles `piperline_rodada15.bundle` + `pippet-clone-r16.bundle` sem reescrever nenhum SHA (mapa lado a lado em `PROVA_HISTORICO.md`).
- `git status` do clone: limpo. O bundle é **autossuficiente**.

## Conferências

- [x] **Suíte completa nesta máquina, COM navegador** (Chromium 153 headless do `@sparticuz/chromium` via `PIPERLINE_CHROMIUM_EXECUTABLE`): **133 passaram, 2 skip explícito (`pageview`, `parity` — evidência local ausente), 0 falharam (de 135)**. Os 56 testes de tela **rodaram aqui** — são os que contam.
- [x] `features_ui` (instável no Windows, 1 em 3): **4/4 aqui** (suíte + 3 seguidas). Causa da instabilidade era o loop de espera por `unread`; corrigida no item 1 (ordem determinística + `hasText`), com prova 10/10 na rota.
- [x] Recontagem nos documentos, **as duas réguas lado a lado**: **105/122 = 86,1%** (critério r15) e **151/423 = 35,7%** (catálogo integral: 85 verificadas / 66 implementadas UNOBSERVED / 272 inventadas).
- [x] `git status` limpo após a suíte; `unzip -t` do zip: íntegro.

## Arquivos da entrega (`entrega_17` no Drive)

`LEIA_PRIMEIRO_NOVA_SESSAO.md`, `STATUS.md`, `ENTREGA.md`, `FEATURE_INVENTORY.md`, `PROVA_HISTORICO.md`, `SHA256SUMS`, `MANIFESTO.md`, `pippet-clone-r17.bundle`, `pippet-clone-r17.zip` (9 arquivos).
