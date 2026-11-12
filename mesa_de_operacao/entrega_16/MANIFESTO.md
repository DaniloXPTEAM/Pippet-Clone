# MANIFESTO — pippet-clone-r16 (entrega 16, 2026-11-12)

## Pacote

| Arquivo | Tamanho (bytes) | SHA256 |
|---|---|---|
| `pippet-clone-r16.bundle` | 17.875.882 | `5d76901d0e0611ddc460a8cce8793c472413864d4370296b2412a0a66ee51c35` |
| `pippet-clone-r16.zip` | 36.177.202 | `c68e1a34a0d6f4ccc63f5443adc9ca87efb4aa33a92e094790bba02c38ab473c` |

Formato de `SHA256SUMS`: `hash  arquivo` (2 espaços).

## Conferências

- [x] `git bundle verify` e **`git clone` do bundle**: restaura com HEAD `3684da6` (prova executada nesta rodada).
- [x] `unzip -t` do zip: íntegro.
- [x] Placar honesto da suíte nesta máquina (Linux, sem Chromium): **79 passaram, 56 skip explícito, 0 falharam (de 135)**. Os 56 de tela **não executaram aqui** (lista no `ENTREGA.md`) — não se declara "0 falhas" sobre eles.
- [x] Os 4 defeitos do Windows (r15) corrigidos, um commit por item (`REVISAO_WINDOWS.md`).
- [x] Regra r16: conteúdo UNOBSERVED/inventado com teste = "implementada (conteúdo UNOBSERVED)", nunca "verificada"; os 56 UI contam só quando passarem.
- [x] `git status` limpo após a suíte (o `browser_probe` deixou de apagar arquivo versionado).

## Arquivos da entrega

`LEIA_PRIMEIRO_NOVA_SESSAO.md`, `STATUS.md`, `ENTREGA.md`, `FEATURE_INVENTORY.md`, `REVISAO_WINDOWS.md`, `PREPARO_PUSH.md`, `SHA256SUMS`, `MANIFESTO.md`, `pippet-clone-r16.bundle`, `pippet-clone-r16.zip`.
