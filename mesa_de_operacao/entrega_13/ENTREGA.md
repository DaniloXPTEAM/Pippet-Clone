# ENTREGA — RODADA 13 · o código de saída do PowerShell, o import do Windows e a auditoria da árvore

**Data:** 2026-11-09 · **Branch:** `arena/a14d8a49-pippet-clone` (sem push) · **Suíte:** **128 passaram, 2 skip explícito, 0 falharam (de 130)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## Ponto de partida (seu Windows, rodada 12)

**128 ok / 2 skip / 2 falhas de 130.** As duas falhas eram `lipsync_adapters` (determinística) e `browser_probe` (teste novo, nem chegava a rodar). Os 2 skips eram `pageview` e `parity`, os de sempre.

---

## Item 1 — `ce8693c` · o PowerShell agora devolve o código real do programa

**Causa (provada por você no PowerShell real).** `powershell -Command` **não repassa** o código de saída de um programa **nativo**: `& node -e 'process.exit(3)'` termina **1**, e só com `; exit $LASTEXITCODE` termina **3**. O app montava a linha do executor local sem esse sufixo, então a tarefa era fechada como "código 1" e o teste — que espera "código 3" — falhava.

**Correção (`src/providers.mjs`, `localShellPlan().argsFor()`):**

| Shell | Antes | Agora |
|---|---|---|
| **PowerShell / pwsh** | `['-NoProfile','-Command', cmd]` | `['-NoProfile','-Command', cmd + '; exit $LASTEXITCODE']` |
| `cmd.exe` | `['/d','/s','/c', cmd]` | **igual** (o cmd já repassa o código) |
| POSIX (bash/sh) | `['-lc', cmd]` | **igual** (o POSIX já repassa o código) |

O **`prepare()` com `& ` da rodada 11 continua congelado** — não foi tocado, como você mandou. O sufixo é acrescentado **depois** do `prepare()`, na hora de montar os argumentos.

**Teste (`test/lipsync_adapters.test.mjs`).** O imitador do PowerShell passou a seguir **a mesma regra de código de saída** (`sufixo = '; exit $LASTEXITCODE'`, `propaga`) e o caso do seu Windows foi reproduzido em **três passos**, com a linha válida `& "…node" "script.mjs" …` (a que **executa**, sem cair no erro de aspas):

| Passo | Comando | Código devolvido |
|---|---|---|
| (a) o defeito | linha válida **sem** o sufixo | **1** ← o seu "código 1" |
| (b) a correção | linha válida **com** `; exit $LASTEXITCODE` | **3** |
| (c) o app | o app roda esse comando | a tarefa fecha com **"código 3"** e guarda o erro do programa no motivo |

Além disso o plano é conferido nos três shells (pwsh, cmd.exe, POSIX). **Controle negativo:** revertendo a linha de `src/providers.mjs`, o teste falha no plano (`'x'` contra `'x; exit $LASTEXITCODE'`).

**Limite honesto:** não existe `pwsh` neste sandbox Linux. A prova local é o imitador com a mesma regra; **o fecho é a sua suíte**.

## Item 2 — `85ebc03` · `browser_probe` roda no Windows (import por `file://`)

**Causa.** O teste da rodada 12 roda um inspetor em processo novo e mandava o caminho do apoio como **caminho absoluto cru**: `import { … } from "C:\\…\\support/browser.mjs"`. No Windows o Node trata isso como **URL** e recusa com `ERR_UNSUPPORTED_ESM_URL_SCHEME` (o "esquema" `c:` não existe). No Linux o caminho cru funciona — por isso passou aqui e quebrou aí.

**Correção (`test/browser_probe.test.mjs`):**

```js
const especificador = pathToFileURL(path.join(REPO_TEST, 'support/browser.mjs')).href;  // file:///C:/… no Windows, file:///home/… no Linux
const codigo = `import { browserAvailability } from ${JSON.stringify(especificador)}; …`;
```

**Grep por outros casos iguais:** os únicos `import()` com especificador montado são os de `node:os` e `node:fs` (módulos embutidos, não caminho). **Nenhum outro.**

Prova em `browser_probe_r13.txt`: a correção, o teste rodando (4 casos) e a demonstração de que o caminho cru só falha no Windows.

## Item 3 — suíte completa e `git status`

```
128 passaram, 2 skip explícito, 0 falharam (de 130).     (231 s)
```

- **Falhas: nenhuma.**
- **Skips:** `pageview` e `parity` — dizem o motivo na tela (evidências do Pippit que não estão neste checkout).
- **`git status --short` no fim: vazio**, e a prova é ativa: sha256 dos **659 arquivos versionados antes e depois da suíte** → **0 diferenças** (`git_status_prova_r13.txt`).
- O "1 arquivo alterado não identificado" da r12 **não se repetiu**. A explicação mais provável é que aquele arquivo era o **próprio teste que eu tinha acabado de editar** antes de rodar a suíte; não consigo reproduzir aquele estado para confirmar, e por isso **não afirmo causa**.

## Item 4 — `74c953e` · auditoria (relatório completo em `AUDITORIA_R13.md`)

Nove frentes pedidas, com **arquivo:linha** e evidência em cada uma:

| # | Frente | Achado | Decisão |
|---|---|---|---|
| a | `new URL(import.meta.url).pathname` | **0** ocorrências | nada a fazer |
| b | `import()` de caminho absoluto sem `pathToFileURL` | **1** (o `browser_probe`) | **corrigido** (item 2) |
| c | executável falso com shebang | **2** (`lipsync_adapters:246,290`) | já protegidos: shebang só no POSIX, `if (!noWindows)`, chamados por `node` |
| d | `bash -c` / `sh -c` / `-lc` | só em `src/providers.mjs:259` | legítimo (escolha de shell por sistema) |
| e | `/tmp` fixo | fixture do Gradio falso (`lipsync_adapters:45,59,60,65`) e `recuperar_ambiente.sh:80,97,134` | legítimo (texto de resposta do servidor falso; script do sandbox) |
| f | `set -e` | só em `recuperar_ambiente.sh` | legítimo |
| g | `0600` como premissa | `auth_structure.test.mjs:41` só fora do win32; `:43` skip explícito | já correto |
| h | `catch {}` vazio | **11**, todos de `JSON.parse`, limpeza ou aborto de SSE | registrados |
| i | teste gravando em arquivo versionado | regra cumprida; `canvas_panel_ui:42` usa `shotsDir()` (fora do repo), `avatar_gallery_ui:38-40` usa `os.tmpdir()` | nada a fazer, com guarda automática (`no_versioned_writes`) |

**Registrados sem mexer** (não são bug claro): `e2e_live` grava evidência em `captures/e2e_live/` (não versionado, teste opcional fora da suíte, exige Ollama real) e o `MANIFEST_SHA256.csv` da raiz vem da **importação** (não cita `local_reconstruction/`; não é o manifesto da entrega).

**Números dos documentos conferidos:** **130 testes** em `run-all.mjs` (0 duplicados) · inventário **30 implementadas + 53 verificadas = 83/122 = 68,0%**, 19 parciais · placar do Windows da r12 **128/2/2 = 130**. O manifesto da entrega r12 (**657 linhas**) já **não cobria** os arquivos versionados de hoje — refeito neste pacote (`MANIFESTO_SHA256.csv`).

**Achado de caminho (corrigido):** o commit do item 1 tinha arrastado dois arquivos da `entrega_12` que estavam **fora do git** (`SHA256SUMS.txt`, `piperline_rodada12_bundle_verify.txt`). Como nada foi pushed, o histórico desta sessão foi reorganizado em commits limpos, um por assunto: `ce8693c` (item 1), `85ebc03` (item 2), `eb129b4` (os dois arquivos da r12), `74c953e` (auditoria). Nada foi perdido.

## Item 5 — o que está no Drive, e o que é atual, velho ou duplicado

Conferência feita por listagem e busca na API do Drive (nada apagado — **só sugestão**):

**Atual (r13, nesta pasta `entrega_13`):** todos os arquivos listados no fim deste relatório.

**Atual (r12, pasta `entrega_12`)** — é o estado que você validou no Windows: `LEIA_PRIMEIRO_NOVA_SESSAO.md`, `PREPARO_PUSH.md`, `STATUS.md`, `ENTREGA.md`, `FEATURE_INVENTORY.md`, `MANIFESTO_SHA256.csv`, `SHA256SUMS.txt`, `suite_rodada12_final.txt`, `pricing_faq_ui_20x.txt`, `pricing_faq_ui_cpu.txt`, `browser_probe_antes_depois.txt`, `lipsync_adapters_3x.txt`, `.env.example`, `piperline_arvore_rodada12.zip`, `piperline_rodada12_bundle_verify.txt` e o bundle **novo** (`10yV0d9DwBH-m44PNZ9LgnGpQZVT3p3Sy`, 17.843.438 B).
**Duplicado dentro da própria `entrega_12`:** `piperline_rodada12.bundle` existe **duas vezes** — a cópia de 17.741.525 B (`1GnIBedox1__o6CYkZ-TXfTYuNWXV3eir`, a primeira, **incompleta**: era o bundle gerado com o repositório raso) continua na pasta. **Sugestão:** mandar a de 17.741.525 B para a lixeira e ficar com a de 17.843.438 B.

**Velho (substituído por esta rodada):** `STATUS.md`, `FEATURE_INVENTORY.md` e `.env.example` soltos em `mesa_de_operacao/` (o `STATUS.md` de 24.942 B é da rodada 6; há **três** `STATUS.md` soltos: 16.656, 20.633 e 24.942 B) e o `FEATURE_INVENTORY.md` de 67.127 B de 11/11 — todos anteriores à r12. As versões atuais estão nas pastas `entrega_12` e `entrega_13`. **Sugestão:** manter as pastas e parar de usar os soltos.

**Pastas de rodadas antigas:** `entrega_3` e `entrega_7` estão em `mesa_de_operacao/`; `entrega_6`, `entrega_8` e `entrega_9` estão **na raiz do Meu Drive** (fora de `mesa_de_operacao`) — inconsistência de organização, não de conteúdo. `entrega_10` e `entrega_11` estão em `entregaveis/`, junto com a `entrega_12`. **Não há** pastas `entrega_4` e `entrega_5` (essas rodadas foram entregues como zips soltos dentro de `mesa_de_operacao`).

**Duplicados nas pastas antigas (só sugestão, nada apagado):**
- `entrega_9`: **três** `piperline_rodada9.bundle` (17.700.049 / 17.700.561 / 17.700.603 B).
- `entrega_10`: **dois** `piperline_rodada10.bundle` (17.725.981 / 17.726.106 B).
- `mesa_de_operacao/`: `PASSO_A_PASSO_CLAUDE.md` ×3, `TABELA_LINHAS_NAO_PRONTAS.md` ×2, `STATUS.md` ×3, dois bundles antigos (`novai_3bb40ea.bundle` 22,9 MB e `rodada6_cb7b5c3.bundle` 31,7 MB) e ~8 zips `PiperLine_*` das rodadas 1–2.

**Reenvios desta rodada:** `STATUS.md`, `FEATURE_INVENTORY.md`, `LEIA_PRIMEIRO_NOVA_SESSAO.md`, `PREPARO_PUSH.md`, `piperline_rodada13.bundle`, `piperline_arvore_rodada13.zip` e mais os documentos e provas da r13 — todos em `entrega_13`, conferidos por **tamanho e sha256 lidos de volta** do Drive (`SHA256SUMS.txt`).

## O que NÃO consegui provar aqui

1. **Windows.** Nada rodou no seu PC: a regra do PowerShell é a sua (aqui a prova é o imitador) e o `file://` só se confirma aí.
2. **`e2e` intermitente.** A falha antiga continua de causa **NÃO esclarecida**; nada foi tocado nela nesta rodada.
3. **Os quatro testes de tempo** (`notifications_ui`, `workflow_jobs`, `talkingphoto_ui`, `pricing_faq_ui`) só falham com o PC sobrecarregado — nesta rodada passaram aqui, e continuam sem causa provada no seu.
4. **A causa do "1 arquivo alterado" da r12** não foi reproduzida (ver item 3).

## Estado do repositório

- **HEAD:** `894a0ff` (manifesto final; o commit do manifesto não pode listar a si mesmo) · commits desta rodada, em ordem: `ce8693c` (item 1), `85ebc03` (item 2), `eb129b4` (dois arquivos da r12 que estavam fora do git), `74c953e` (auditoria), `ac1ab3e` (documentos e provas), `b826bc3` (prova do bundle), `193f265`/`1e953e9`/`894a0ff` (manifesto), `f1b60e2` (prova do item 3) e `432b1c5` (SHA256SUMS e prova do bundle fora do git), sobre `f5f3332` (r12).
- **Divergência com o remoto (medida com `git rev-list --left-right --count`):** local **13** commits que o remoto não tem (14 depois deste pacote) · remoto **12** (pontas `1443745`), base comum `48ca7bb`. `git push` seria recusado; **nunca `--force`**. Ver `PREPARO_PUSH.md`.
- **Nenhum push**, nenhuma chave.
- Bundle autossuficiente (`--all`) e zip da árvore: `piperline_rodada13.bundle` e `piperline_arvore_rodada13.zip`, com tamanho e sha256 no `SHA256SUMS.txt`.

## Arquivos desta entrega (tamanho e sha256 no `SHA256SUMS.txt`)

`LEIA_PRIMEIRO_NOVA_SESSAO.md` · `ENTREGA.md` · `AUDITORIA_R13.md` · `STATUS.md` · `FEATURE_INVENTORY.md` · `PREPARO_PUSH.md` · `MANIFESTO_SHA256.csv` · `segredos_varredura_r13.txt` · `suite_rodada13_final.txt` · `git_status_prova_r13.txt` · `lipsync_adapters_3x_r13.txt` · `browser_probe_r13.txt` · `.env.example` · `piperline_rodada13.bundle` · `piperline_rodada13_bundle_verify.txt` · `piperline_arvore_rodada13.zip` · `SHA256SUMS.txt`.
