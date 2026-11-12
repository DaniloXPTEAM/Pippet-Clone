# ENTREGA — RODADA 11 · o último vermelho do Windows: comando local entre aspas no PowerShell

**Data:** 2026-11-09 · **Branch:** `arena/a14d8a49-pippet-clone` (sem push) · **Suíte:** **127 passaram, 2 skip explícito, 0 falharam (de 129)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## O que você relatou

A rodada 10 passou no seu PC com **uma** falha: `lipsync_adapters`. O plano do Windows é PowerShell (`localShellPlan`) e o comando do usuário ia **como veio**. O comando do teste começa com uma string entre aspas:

```
"<caminho do node>" "<caminho do script>" {image} {audio} {out}
```

No PowerShell **uma linha que começa com aspas é uma EXPRESSÃO (uma string)**, não uma chamada: o parser para antes de executar qualquer coisa e devolve **“Token inesperado na expressão”**. É o caso natural de quem tem caminho com espaço (`"C:\Program Files\nodejs\node.exe" …`), então o defeito não era do teste: era do app montando a linha errada para o Windows.

## O que foi feito — `e31726b` (um commit, com teste)

**Correção na origem (`src/providers.mjs`).** `localShellPlan()` ganhou `prepare(cmd)`: quando o shell é **PowerShell** (`powershell`/`pwsh`) e o comando **começa com aspas** (simples ou duplas), prefixa o **operador de chamada** `& `:

```
antes:  "C:\Program Files\nodejs\node.exe" "script.mjs" "foto.png" …
depois: & "C:\Program Files\nodejs\node.exe" "script.mjs" "foto.png" …
```

O resto da linha **não é tocado**, e o `prepare()` só age onde precisa:

| Shell | Comando começando com aspas | Resultado |
|---|---|---|
| PowerShell / pwsh (Windows) | `"…node.exe" "script.mjs"` | `& "…node.exe" "script.mjs"` |
| PowerShell, já com `&` | `& "x" "y"` | intacto (não dobra o `&`) |
| PowerShell, sem aspas no começo | `wav2lip --face {image} …` | intacto |
| `cmd.exe` (Windows) | `"…node.exe" …` | intacto (lá não há esse problema) |
| bash/sh (Linux/macOS) | `"…node.exe" …` | intacto (aspas só agrupam o primeiro token) |

`localCommand.submit` aplica `prepare()` **depois** de substituir `{image}` `{audio}` `{out}` `{workdir}` — ou seja, sobre a linha final que vai ao shell.

A tela de provedores passou a avisar, no campo do comando: *no Windows roda no PowerShell; se o comando começar com aspas, o `&` é posto automaticamente*.

**Teste (`test/lipsync_adapters.test.mjs`).** Duas partes, como você pediu:

1. **Plano** — `prepare()` com aspas duplas, aspas simples, comando sem aspas no começo, comando que já tem `&`, no `cmd.exe` e no POSIX.
2. **Execução com caminho entre aspas e com espaço** — um **`powershell` simulado** (um executável de mentira que aplica a **mesma regra** do parser real: linha começando com aspas → `Token inesperado na expressão`; e, quando a linha é válida, executa o resto). O executor local roda **de verdade** com `shell` = esse PowerShell, comando `"<tmp>/Node Com Espaço/node" "<script>" {image} {audio} {out}`, e o **MP4 sai** (o mesmo script Node de mentira da rodada 10, somando ffmpeg real).
3. **Controle negativo** — a mesma linha **sem** o `& ` é entregue ao PowerShell simulado e recusada com o erro do seu relato (`ParserError: Token inesperado na expressão`, código 2).

**A prova de que o teste pega o defeito:** troquei `prepare` por `return cmd` e o teste **falha** (`+ '"C:\Program Files\nodejs\node.exe" "app.mjs" {image}'` contra `- '& "C:\Program Files\nodejs\node.exe" "app.mjs" {image}'`); restaurei e ele passa.

`comando_aspas_antes_depois.txt` mostra os dois lados lado a lado, com a saída real de cada um.

## Suíte completa

`suite_rodada11_final.txt` (execução desta árvore, com navegador):

```
127 passaram, 2 skip explícito, 0 falharam (de 129).
```

Os 2 skips são os de sempre, explícitos e não falhas: `pageview` e `parity` (evidências do Pippit que não fazem parte deste checkout). Nenhum teste novo entrou no `run-all`: as provas desta rodada foram **asserções novas** dentro de `lipsync_adapters`, que já está na suíte.

`lipsync_adapters_5x.txt`: o teste rodado **5 vezes seguidas**, **5 de 5 ok**. Depois de tudo, `git status --short` **vazio**.

## O que NÃO consegui provar aqui — leia antes de considerar fechado

1. **Não rodei no PowerShell de verdade.** Este sandbox é Linux e não tem `pwsh` (nem há rede para instalá-lo). O que existe é: a regra do parser documentada, **simulada fielmente** no teste e no arquivo de evidência, mais a linha final que o app monta. **A confirmação final é a sua suíte no Windows** — é ela que fecha a rodada.
2. **Escapamento de `&`, `;`, `|` no comando do usuário não mudou.** O `prepare()` só prefixa `& ` quando a linha começa com aspas; o resto continua sendo o texto do usuário indo ao shell que ele escolheu. Isso é intencional (o comando é dele, e o executor local é uma opção avançada), mas é bom dizer: **não há sandbox de comando** — quem configura é quem manda executar.
3. **A rodada 11 começou com um reset do sandbox:** o `.git` voltou ao clone do GitHub (HEAD `48ca7bb`) e `.deps`/`/tmp` foram apagados. A árvore de trabalho sobreviveu inteira; refiz o ambiente com `recuperar_ambiente.sh --sem-suite` e registrei o estado entregue da rodada 10 num **commit de recuperação** (`f0c9643`) antes de fazer o item — por isso a história tem dois commits nesta rodada.

## Estado do repositório

- **HEAD:** o commit que fecha esta rodada (mensagem **“rodada 11: entrega escrita …”**) · commits: `f0c9643` (recuperação do estado da rodada 10), `e31726b` (item 1: `&` no PowerShell) e o commit da entrega (este relatório, o `STATUS.md` e os arquivos desta pasta).
- **Nenhum push**, nenhum `--force`, nenhuma chave.
- Bundle autossuficiente: `piperline_rodada11.bundle` (no Drive, pasta `entrega_11`).
