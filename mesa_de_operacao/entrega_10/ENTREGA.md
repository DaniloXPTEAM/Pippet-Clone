# ENTREGA — RODADA 10 · Windows (as duas falhas restantes + o teste instável + a regra dos arquivos versionados)

**Data:** 2026-11-09 · **Branch:** `arena/a14d8a49-pippet-clone` (sem push) · **Suíte:** **127 passaram, 2 skip explícito, 0 falharam (de 129)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## Ponto de partida relatado (Windows)

Sua suíte no Windows deu **122 ok, 3 skip, 2 falhas de 127**, e `free_router_ui` falhava em ~15% das execuções (2 em 13):

| # | Teste | Sintoma no Windows | Causa encontrada | Item |
|---|---|---|---|---|
| 1 | `watermark_export` (linha 122) | `W.image.exists` esperado `false`, veio `true`; o png versionado foi **sobrescrito (628 B → 235 B)** | o teste achava a imagem por `new URL(import.meta.url).pathname`, que no Windows vira `/C:/…` (caminho inválido) → não lia, não restaurava, não apagava; `try/catch` vazios escondiam o erro | 1 |
| 2 | `lipsync_adapters` | `CreateProcessCommon ERROR` | o adaptador local-command chamava `bash` — no Windows isso é o `bash.exe` do System32, que abre o **WSL** e não enxerga os caminhos do Windows; o teste ainda usava `set -e`, `[ -s ]`, `>&2` e `sleep`, que são de shell POSIX | 2 |
| 3 | `free_router_ui` | ~2 de 13 execuções ficavam 30 s esperando `#localRunPage` depois do clique em `#freeSend` | **redesenho atrasado**: os botões de Configurações > LLM agendavam `setTimeout(() => pageSettings('llm'), …)`; se a navegação acontecia antes do timer, Configurações era pintada **por cima** da rota nova e o Playwright abortava o clique (`element was detached from the DOM`) | 3 |

**Item 4** é a sua regra nova: **teste não altera arquivo versionado** (png, ui-shots).

## O que foi feito — quatro itens, um commit cada, cada um com teste

**Item 1 — `6f73285` · marca d'água: caminho válido no Windows e restauração que falha alto.**
`fileURLToPath(import.meta.url)` no lugar de `new URL(...).pathname`; o teste **confere que a imagem existe** antes de começar e falha com mensagem se não existir; restauração da imagem em `finally` e, se a restauração falhar, **o teste falha** (nada de `catch` vazio); remoção/restauração do caso "imagem ausente" também falham em vez de silenciar.
Junto veio a regra nova: a marca de trabalho vai para **pasta temporária** — o servidor aceita `PIPPIT_BRAND_DIR` (raiz da imagem, padrão `app/public`) e o teste aponta para uma cópia em `tmp`. No fim, compara o **sha256 do png versionado** com o do começo: intocado, **628 bytes**.

**Item 2 — `93c6f7f` · executor local não cai mais no WSL; teste independente de shell.**
`src/providers.mjs` ganhou `localShellPlan(shell, platform)`: **Windows → `powershell -NoProfile -Command`** (aspas `"…"` com `"` dobrado), `cmd` → `/d /s /c`, POSIX → `bash -lc` (aspas simples). `cfg.shell` do usuário continua mandando. O teste deixou de depender de bash: o processo falso agora é um **script Node** (roda igual nos dois sistemas) e o teste confere o **plano do Windows rodando em Linux** — binário padrão `powershell` (nunca `bash`/WSL), argumentos e aspas — além de respeitar o shell escolhido.

**Item 3 — `eac1e0d` · repaint atrasado não pinta por cima de outra rota.**
Reproduzido aqui **antes** de corrigir: com o CPU 8× mais lento (CDP `Emulation.setCPUThrottlingRate`), o mesmo `free_router_ui` falhava **14 de 20** vezes; o log do Playwright dizia `locator('#freeSend') … element was detached from the DOM, retrying`, e o botão estava estável e sem mutações em `#main` — ou seja, **outra tela** era redesenhada por cima.
Correções em `app/public/app.js`:
- `repaintIfRoute(prefixo, fn)`: redesenho atrasado só desenha se a rota atual ainda começar pelo prefixo — aplicado aos **5** `setTimeout` de Configurações;
- `lastRoute`/contadores só são gravados **depois** de `paintRoute()` concluir; página que estoura mostra `#routeError` com o motivo e botão "tentar de novo" (`__piperlineRoute.lastError`) — antes, uma rota que falhava ficava marcada como desenhada e a deduplicação bloqueava qualquer nova tentativa;
- `pageLocalRun`: até 4 tentativas (300/600/900 ms) e, se ainda falhar, **o motivo escrito na tela** com `#localRunRetry` (nunca página em branco nem a tela anterior parada);
- `startFreeRun`: resposta inválida reabilita o botão; se o hash já é a rota alvo, chama `route_()` na mão.
Teste novo **`local_run_page_recovery`**: 500 passageiro recupera na tentativa, falha persistente mostra o motivo com "tentar de novo", rota que estoura **não** entra em `lastRoute` (é a prova do travamento), `#localRunRetry` recarrega e `#routeRetry` redesenha. **O teste falha no código anterior** (verificado: `git show 6fb1431:…/app.js` → `/Resposta fake exibida/`) e passa no atual.
`free_router_ui` ganhou medição do clique até `#localRunPage`, conferência de **exatamente um** POST e nova tentativa de clique com diagnóstico no timeout.

**Item 4 — `a7d3b8e` · testes não escrevem mais em arquivo versionado.**
Onze testes de interface gravavam em `test/ui-shots/*.png` e cada execução da suíte deixava o `git status` sujo (aqui tivemos de restaurar esses pngs à mão ao fim de cada bateria) — e o teste da marca d'água, no Windows, chegou a sobrescrever o png versionado.
- `test/support/shots.mjs`: `shotsDir()`/`shotPath()` gravam em **pasta temporária do sistema**; `PIPPIT_UI_SHOTS_DIR` permite apontar para outra pasta (por exemplo para guardar evidência fora do repositório);
- os 11 testes passaram a usar o helper;
- `test/no_versioned_writes.test.mjs` cobra a regra: (1) a pasta de capturas fica fora do repositório e respeita `PIPPIT_UI_SHOTS_DIR`; (2) nenhum arquivo de teste monta caminho para `test/ui-shots`; (3) depois de uma captura de verdade, os **56 arquivos versionados vigiados** (ui-shots + png da marca) continuam **byte a byte iguais**, por sha256 **e** por `git status --porcelain`.

## Prova do item 3 — 20 + 20 execuções seguidas

`free_router_ui_20x.txt`:

| Bateria | Condição | Resultado |
|---|---|---|
| A | 20 execuções normais | **20 de 20 ok** (325–452 ms do clique) |
| B | 20 execuções com CPU **8× mais lenta** | **20 de 20 ok** |
| antes da correção | CPU 8× mais lenta | **6 de 20 ok** |

O throttle é o `PIPERLINE_TEST_CPU_RATE` do teste (CDP), que existe justamente para **reproduzir** o timing lento do seu PC; sem ele, o defeito não aparecia aqui.

## Suíte completa

`suite_rodada10_final.txt` (execução desta árvore, com navegador):

```
127 passaram, 2 skip explícito, 0 falharam (de 129).
```

Os 2 skips são os de sempre, explícitos e não falhas: `pageview` e `parity` (evidências do Pippit que **não fazem parte deste checkout**). O total subiu de 127 para 129 porque entraram os testes novos `local_run_page_recovery` e `no_versioned_writes`.

**Depois da suíte, `git status --short` saiu vazio** — é a prova prática do item 4 (antes, a suíte deixava os 12 pngs de `test/ui-shots` modificados).

## Como consertar o png no seu PC

O `watermark.png` do seu checkout está com **235 bytes** (foi sobrescrito na rodada anterior). Duas formas de voltar ao original de **628 bytes**:

```powershell
git checkout -- local_reconstruction/app/public/assets/brand/watermark.png
```

ou copie `watermark.png` desta entrega (sha256 `69cdd75919631dfa93a403dd2c0ce29427e98499934bfde298728f91cdb6aead`) sobre o arquivo. Este png é **provisório**; a marca real será a do CineForma, a criar.

## O que NÃO consegui provar aqui — leia antes de considerar fechado

1. **Não rodei em Windows.** Tudo foi executado em **Linux** (este sandbox). O item 2 foi provado pelo **plano** de execução (`localShellPlan`) e por um processo falso em Node; o defeito real do `bash.exe`/WSL não é executável daqui. **A confirmação final é a sua suíte no Windows.**
2. **Item 3 exigiu reproduzir o defeito, não só corrigir.** Ele apareceu aqui **só** com CPU 8× mais lenta (6/20). Se no seu PC voltar, o console já diz onde olhar: `window.__piperlineRoute` (`lastError`, contadores) e, na tela da tarefa, o motivo escrito com "tentar de novo".
3. **`talkingphoto_ui`** segue com a instabilidade registrada na rodada 8 (prévia local às vezes 4,72 s em vez de ~3,0 s). Passou nesta execução; não é item desta rodada.
4. **`test/ui-shots/*.png` continuam no repositório** como evidência histórica — agora são **somente leitura** para os testes. Não os apaguei porque são a referência visual das entregas anteriores; se você preferir, eles podem sair num commit próprio.

## Estado do repositório

- **HEAD:** o commit que fecha esta rodada (mensagem **“rodada 10: entrega escrita …”**) · commits desta rodada: `6fb1431` (recuperação do `.git` apagado pelo sandbox), `6f73285` (item 1), `93c6f7f` (item 2), `eac1e0d` (item 3), `a7d3b8e` (item 4) e o commit da entrega (este relatório, o `STATUS.md` e os arquivos desta pasta).
- Depois de tudo, `git status --short` **vazio** — inclusive depois da suíte completa, que antes deixava 12 pngs de `test/ui-shots` modificados.
- **Nenhum push**, nenhum `--force`, nenhuma chave.
- Bundle autossuficiente: `piperline_rodada10.bundle` (no Drive, pasta `entrega_10`).
