# ENTREGA — RODADA 14 · a espera por tempo no `lipsync_adapters` e a passagem para o sandbox novo

**Data:** 2026-11-12 · **Branch:** `arena/d9cee29f-pippet-clone` (sem push) · **Suíte:** **128 passaram, 2 skip explícito, 0 falharam (de 130)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## Ponto de partida (seu Windows, rodada 13)

**126 ok / 2 skip / 2 falhas de 130** (validado por você). As duas falhas: `omni_router_ui` (de **tempo** — passou **4/4** quando você reexecutou; sem causa provada) e `lipsync_adapters` (**4/4 falhas**, causa provada por você: o job fica `running` porque o PowerShell demora a abrir). Os 2 skips eram `pageview` e `parity`, os de sempre.

---

## Item 1 — `afb2550` · `lipsync_adapters` espera por TEMPO (30 s), não por 40 voltas de 40 ms

**Causa (provada — a sua medição + o código antigo, reproduzidos aqui).** O plano do PowerShell do app está **certo**: no PowerShell real, saída 0 dá 0 e saída 3 dá 3 (sua validação na r13). O defeito estava **no teste**: o laço de espera do `runJob` (`test/lipsync_adapters.test.mjs`, linha 87) corria **40 voltas de 40 ms** — um teto de **~1,6 s** — e o PowerShell leva **2,2–2,7 s** para abrir o processo. O job continuava `running`, as 40 voltas acabavam e o teste estourava **"a tarefa não terminou dentro do tempo do teste"**. Demonstração local: o laço antigo termina em **1610 ms** com o job ainda em andamento — contra uma abertura de 2,5 s ele **sempre** estoura.

**Correção (mínima, só a condição de parada):**

```js
// antes:  for (let i = 0; i < 40; i++) { await tick(); … setTimeout(r, 40) }        // teto ~1,6 s
// depois: const fim = Date.now() + 30_000;
//         while (Date.now() < fim) { await tick(); … setTimeout(r, 40) }           // teto 30 s, por TEMPO
```

O **resto do teste ficou idêntico** (tick por volta, `LIPSYNC_DEBUG`, as sete chamadas do `runJob`, todas as asserções). A folga de 30 s é para a abertura do PowerShell do seu PC; no Linux o teste continua fechando em ~1,5 s (retorna assim que o job termina).

**Prova (`lipsync_adapters_5x_r14.txt`): 5 execuções seguidas, 5 ok** (exit 0; 1420–1552 ms cada), mais a demonstração do laço antigo × novo.

**Limite honesto:** não existe `pwsh` neste sandbox — a causa combina **a sua medição do PowerShell** (2,2–2,7 s) com **o código antigo do teste** (teto de 1,6 s), reproduzido aqui; a correção se confirma com a sua próxima suíte.

## Item 2 — a passagem para o sandbox novo (`mesa_de_operacao/entrega_14`)

O sandbox era novo (o `.git` se foi pela **6ª vez**) e nasceu com um clone limpo do `main` (só os documentos). Recuperação feita como manda a §4 do LEIA_PRIMEIRO:

1. Bundle `piperline_rodada13.bundle` baixado do Drive — **sha256 conferido** contra o `SHA256SUMS.txt` da r13 (`21512f21…`, 17.889.142 B ✓).
2. `git bundle verify`: **"The bundle records a complete history"** ✓ · `git fetch` do bundle · ponta `arena/a14d8a49-pippet-clone` = `9e57f96b61ed…`.
3. **HEAD conferido em `9e57f96`** ("rodada 13: manifesto final (HEAD estavel)") antes dos commits da r14.
4. `./recuperar_ambiente.sh --sem-suite` + `. .deps/env.sh` (Node 22.22.3, ffmpeg, Chromium).
5. Suíte em blocos (soma por teste único: **128/2/0 de 130**) e depois **três execuções completas** do `run-all` fechando **128/2/0** (uma antes dos commits, duas depois).

`LEIA_PRIMEIRO_NOVA_SESSAO.md`, `STATUS.md` e `PREPARO_PUSH.md` atualizados com o placar do Windows da r13 (**126/2/2**), a rodada 14 e os novos IDs (lista real de commits no fim deste documento).

## Item 3 — push preparado, **NÃO executado**

A checagem da §5 do `PREPARO_PUSH.md` foi rodada nesta rodada:

| Checagem | Resultado |
|---|---|
| `git status --short` (após os commits) | **vazio** |
| `git rev-list --left-right --count HEAD...origin/arena/a14d8a49-pippet-clone` | **23 / 12** locais × remotos (26/12 depois do pacote da r14) |
| `git ls-files \| grep -E '(^\|/)\.env$\|auth-secret\|node_modules\|\.bundle$'` | **sem resultados** |
| varredura de segredos (9 padrões, 672 arquivos) | **0 credenciais reais** (`segredos_varredura_r14.txt`) |
| `node test/run-all.mjs` | **128 passaram, 2 skip explícito, 0 falharam (de 130)** |

Quando você escrever **"PUSH AUTORIZADO"**: **um único push, sem `--force`**, pela opção A — `git push -u origin arena/d9cee29f-pippet-clone:refs/heads/arena/a14d8a49-pippet-clone-r12` (a branch nova, **com o nome exato da sua ordem**), e confiro o sha no GitHub (`gh api .../branches/<branch> --jq .commit.sha`) para mostrar. **Não** abro PR sem ordem.

## O que NÃO consegui provar aqui

1. **Windows.** Nada rodou no seu PC: a causa do item 1 combina a sua medição com o código antigo; o fecho é a sua suíte.
2. **`omni_router_ui` (r13).** Falha de tempo, passou 4/4 na sua reexecução — **sem causa provada**, mesma classe de `notifications_ui`/`workflow_jobs`; nada foi tocado nele.
3. **`e2e` intermitente e os testes de tempo** (`talkingphoto_ui` etc.) — continuam como estavam; precisam do seu PC livre.
4. **O nome da branch nova do push** (`arena/a14d8a49-pippet-clone-r12`) foi o **exato da sua ordem** — se você quiser outro sufixo, avisar antes do PUSH AUTORIZADO.

## Estado do repositório

- **HEAD base da rodada:** `9e57f96` (conferido após a restauração do bundle) · commit do item 1: `afb2550`.
- Commits do pacote da r14 (lista real e HEAD final no commit seguinte a este documento).
- **Divergência com o remoto (medida com `git rev-list --left-right --count`):** local **23** commits que o remoto não tem (26 depois do pacote) · remoto **12** (ponta `1443745`), base comum `48ca7bb`. `git push` seria recusado; **nunca `--force`**. Ver `PREPARO_PUSH.md`.
- **Nenhum push**, nenhuma chave.
- Bundle autossuficiente (`--all`, com `git fetch --unshallow` antes) e zip da árvore: `piperline_rodada14.bundle` e `piperline_arvore_rodada14.zip`, com tamanho e sha256 no `SHA256SUMS.txt`.

## Arquivos desta entrega (tamanho e sha256 no `SHA256SUMS.txt`)

`LEIA_PRIMEIRO_NOVA_SESSAO.md` · `ENTREGA.md` · `STATUS.md` · `FEATURE_INVENTORY.md` · `PREPARO_PUSH.md` · `MANIFESTO_SHA256.csv` · `segredos_varredura_r14.txt` · `suite_rodada14_final.txt` · `git_status_prova_r14.txt` · `lipsync_adapters_5x_r14.txt` · `.env.example` · `piperline_rodada14.bundle` · `piperline_rodada14_bundle_verify.txt` · `piperline_arvore_rodada14.zip` · `SHA256SUMS.txt`.
