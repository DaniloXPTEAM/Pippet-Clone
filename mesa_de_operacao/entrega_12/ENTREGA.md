# ENTREGA — RODADA 12 · o teste que o Windows não conseguia rodar e o SKIP sem motivo

**Data:** 2026-11-09 · **Branch:** `arena/a14d8a49-pippet-clone` (sem push) · **Suíte:** **128 passaram, 2 skip explícito, 0 falharam (de 130)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## Ponto de partida (seu Windows, rodada 11)

**119 ok / 5 skip / 5 falhas de 129**, com `git status` limpo no fim. Uma falha determinística (`lipsync_adapters`, 6 de 6) e quatro de tempo (`notifications_ui`, `pricing_faq_ui`, `workflow_jobs`, `talkingphoto_ui`). Você enxugou o item 2 para **só `pricing_faq_ui`**; os outros três ficaram fora (PC com 523 MB de RAM livre, Edge/VS Code/WSL abertos).

## Item 1 — `6a6292d` · o teste de lipsync não depende mais de shebang

**Causa (confirmada pela sua leitura).** A rodada 11 provou o `prepare()` com `& `, mas o teste montava o cenário com dois arquivos que **o Windows não executa**: um "powershell" **sem extensão** com `#!/usr/bin/env node` e um "node com espaço" com `#!/bin/sh`. Sem shebang, o `spawnSync` devolve `status: null` — e a asserção olhava o **código** (`2`) em vez de notar que o shell **nem rodou**. Daí 6 de 6.

**Correção (no teste; o app não mudou):**

| | Antes | Agora |
|---|---|---|
| Shell usado | "powershell" falso com shebang (não roda no Windows) | **Windows: o PowerShell de verdade**, que existe em qualquer Windows. Linux/macOS: o imitador da rodada 11 (lá shebang executa) |
| Primeiro token do comando | script `#!/bin/sh` numa pasta com espaço | **node de verdade em caminho com espaço**: no Windows o próprio `process.execPath` já é `C:\Program Files\nodejs\node.exe`; se não tiver espaço, hardlink para uma pasta com espaço e, se o sistema de arquivos não permitir, **cópia** do executável |
| Controle negativo | `assert.equal(status, 2)` | exige primeiro que **o shell tenha rodado** (`status != null`) e só então que a linha seja **recusada** (`!= 0`), com mensagem que distingue "não executou" de "recusou" |
| Erro do parser | `/Token inesperado/` | `/Token inesperado|Unexpected token/` — o Windows pode estar em inglês |

**O que o teste prova no Windows agora:** o PowerShell real recusa `"C:\…\node.exe" "script.mjs" …` **sem** o `& ` e executa o **mesmo** comando com o `prepare()` do app, gerando o MP4. Zero simulação nesse caminho.

**Limite honesto:** aqui é Linux. Rodei **3 de 3** com o imitador (`lipsync_adapters_3x.txt`); o caminho real do PowerShell só fecha na **sua** suíte.

## Item 2 — `722f235` · `pricing_faq_ui`: de onde vinha o SKIP e o que dá para dizer dos 74 s

### (a) O SKIP não era do app — era a sondagem de navegador do próprio teste

`test/support/browser.mjs` dava **5 segundos** para o binário responder `--version`. Num PC carregado, um Chrome frio (antivírus, disco, WSL) passa disso; aí **todos** os candidatos "não executam" e o teste é **PULADO com o motivo errado** — a mensagem dizia "faltam dependências/libs". Eram até **3 candidatos × 5 s**, e a checagem rodava **duas vezes** por teste (`skipUnavailableBrowser` + `launchChromium`): **14–19 s de SKIP**, exatamente o que você viu.

**Reproduzido aqui**, com um navegador que demora 6 s para responder (`browser_probe_antes_depois.txt`):

```
código antigo (prazo 5 s): 5007 ms  ok=false  "…mas não executa (faltam dependências/libs…)"   ← motivo ERRADO
código novo  (prazo 20 s): 6014 ms  ok=true   executablePath=…, origem=PIPERLINE_CHROMIUM_EXECUTABLE
teste completo com esse navegador lento: ok em 6,4 s   (antes: SKIP)
```

**Correção (infraestrutura de teste, não do app):** uma sondagem por processo (cache), prazo de **20 s** ajustável por `PIPERLINE_BROWSER_PROBE_MS`, e motivo que **sempre** diz o que foi tentado e por quê — *não existe* / *não respondeu em N ms* / *saiu com código X* / *faltam libs*. Teste novo **`browser_probe`** (entrou na suíte) cobra os quatro casos, inclusive que a resposta é memorizada.

### (b) Qual espera estoura nos 74 s

**Não consegui reproduzir 74 s aqui.** O que medi:

| Cenário | Resultado |
|---|---|
| 20 execuções seguidas (normal) | **20 de 20 ok** — min **697 ms**, mediana **734 ms**, max **826 ms** |
| 40 execuções com 8 navegadores em paralelo | **40 de 40 ok**, mediana 2,3 s (max 2,8 s) |
| CPU **100×** mais lenta (CDP) | **ok em 10,2 s**; a maior etapa é `rota /pricing` (4,7 s), depois `nota de integrações` (1,8 s) |

Tabela completa em `pricing_faq_ui_20x.txt` e `pricing_faq_ui_cpu.txt` (cada etapa cronometrada).

**O que dá para afirmar com medição:** com o código antigo, **até 30 s do tempo do teste eram sondagens do navegador** (2 × 3 candidatos × 5 s), *antes* de o navegador abrir. Somando uma espera de 30 s estourando, chega-se aos ~74 s do seu relato. Ou seja: **a causa provável é ambiente sobrecarregado, não o app** — e a mesma sobrecarga explica o SKIP. Não tenho como provar qual `locator`/`waitFor` estourou no seu PC; **não vou inventar**.

**Para que a próxima falha diga o nome:** o teste passou a cronometrar **cada etapa** (navegador, aba, rota, nota de integrações, nota do FAQ, 6 perguntas, abrir resposta, comparação de planos) e, ao falhar, imprime a **etapa**, o **tempo** e o **estado da tela** (hash, se `#pricingFaq` existe, o texto das duas notas, quantas perguntas, se o modal abriu). Isso separa na hora **"o app não preencheu"** de **"o navegador não abriu"**. `PIPERLINE_TEST_TIMING=1` mostra as etapas também quando passa.

Exemplo de diagnóstico (o que você veria):

```
pricing_faq_ui: falhou na etapa "nota de integrações" depois de 74.2s
  etapas: navegador=812ms · aba=44ms · rota /pricing=3021ms · nota de integrações=30158ms (FALHOU)
  tela: {"hash":"#/pricing","temPricingFaq":true,"integracoes":"Integrações: verificando…","faq":"6 perguntas preservadas…","perguntas":6,"planos":false}
```

(Esse texto é **ilustrativo do formato**, não uma execução: se a nota aparecer como `verificando…`, a falha é do app; se `temPricingFaq` vier `false`, é do ambiente/carregamento.)

### O app mudou? Não

Nenhuma mudança em `app/`. Em 20 + 40 + 4 execuções (inclusive com CPU 100×) as duas notas foram preenchidas e as 6 perguntas apareceram sempre — não há evidência de defeito do app. O throttle de CPU virou helper compartilhado (`applyCpuThrottle`), usado por `free_router_ui` e por este teste.

## Suíte completa

`suite_rodada12_final.txt`:

```
128 passaram, 2 skip explícito, 0 falharam (de 130).
```

- **Falhas: nenhuma** (era 5 no seu Windows).
- **Skips:** `pageview` e `parity`, os dois explícitos de sempre (evidências do Pippit que não fazem parte deste checkout).
- Total subiu de 129 para **130** com o teste novo `browser_probe`.
- Depois da suíte, `git status --short` **vazio** (a regra de não alterar arquivo versionado continua valendo).

## O que NÃO consegui provar aqui

1. **Windows.** Não rodei no seu PC: o caminho real do PowerShell (item 1) e o comportamento do `--version` sob antivírus (item 2) só se confirmam lá.
2. **Os 74 s.** Não reproduzi; o que entrego é a medição do que **é** reproduzível, a explicação do tempo gasto em sondagens e o teste que passa a **nomear** a etapa. Se voltar, o log diz onde.
3. **Os outros três testes lentos** (`notifications_ui`, `workflow_jobs`, `talkingphoto_ui`) **não foram tocados** — ficaram fora da ordem, e você vai repeti-los quando a máquina estiver livre.
4. **Rodada 12 começou com o quinto reset do sandbox:** o `.git` voltou ao clone (HEAD `48ca7bb`) e `.deps`/`/tmp` sumiram. A árvore sobreviveu inteira; refiz o ambiente com `recuperar_ambiente.sh --sem-suite` e registrei o estado da rodada 11 num **commit de recuperação** (`bfa9169`) antes dos itens.

## Estado do repositório

- **HEAD:** o commit que fecha esta rodada (mensagem **“rodada 12: entrega escrita …”**) · commits: `bfa9169` (recuperação do estado da rodada 11), `6a6292d` (item 1), `722f235` (item 2) e o commit da entrega.
- **Nenhum push**, nenhum `--force`, nenhuma chave.
- Bundle autossuficiente: `piperline_rodada12.bundle` (no Drive, pasta `entrega_12`).
