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

## Item 3 — pacote de passagem para a sessão nova (`ae68fa0`, `d85f88d`)

O sandbox já apagou o `.git` **cinco vezes**. Se ele apagar de novo, o trabalho não se perde **se** estiver no Drive — por isso esta pasta agora tem tudo o que a sessão nova precisa para continuar sem o sandbox:

| Arquivo | Tamanho | SHA-256 |
|---|---|---|
| `LEIA_PRIMEIRO_NOVA_SESSAO.md` | 11.627 B | `d8c50cffdaf2b426c739fd58a266fd4f6503a41f446199d84497c40e2ab84903` |
| `PREPARO_PUSH.md` | 5.756 B | `434a6dc052c572789c61497058e2a437b8cb4c9b8cc060f0c6610e21a648e11a` |
| `MANIFESTO_SHA256.csv` (656 arquivos versionados) | 71.610 B | `c9875691d77f1b5f17ab032c719aec238425c4be361c3e51427404b470b605b6` |
| `segredos_varredura.txt` | 3.492 B | `c1cd0b57240d18d7d5371d27e703f4af4f58ef5c7da622bead46d9d9ced46b31` |
| `STATUS.md` | 50.210 B | `b723069d746f9e3169248077aee6dca71372aa8ea78c2c4934cc4c8a47d7f863` |
| `FEATURE_INVENTORY.md` | 76.232 B | `7611c91dc8ed34a662d66afd67781fca2b6a41f5eab7e0c26527375495aa979f` |
| `.env.example` (só nomes) | 1.362 B | `052f37f79861061b26f3dda0ba9f13fc5cc0df8919d9d550b9c2a2e7fdfe65df` |
| `suite_rodada12_final.txt` | 4.024 B | `5df2878601e640749ba15cd28d4118e2fae29b98e5fd8a83909ffc7c4c06d368` |
| `pricing_faq_ui_20x.txt` | 3.752 B | `72882167e1725f3daebf414f725b97d11c2355dd2b79d3d1158293e7a19b3aa2` |
| `pricing_faq_ui_cpu.txt` | 1.125 B | `6c345fd17b2adb3751b4d20c311bf8447892157be9e7deb4cd43e9f4a95bff49` |
| `browser_probe_antes_depois.txt` | 604 B | `d1ae3791e4c9e4f71535335bcf95bedbf52ce4a5a3c4287beeea0a7da6a43723` |
| `lipsync_adapters_3x.txt` | 411 B | `46d5b34cff170ce75b1fcc9a004fdc5102aab0d8ebccf5beaaf87c0e6d39675a` |

**Artefatos gerados depois deste relatório** (tamanho e sha256 no `SHA256SUMS.txt`, ao lado deles): `piperline_rodada12.bundle` (+ `piperline_rodada12_bundle_verify.txt`) e `piperline_arvore_rodada12.zip`. O bundle é **autossuficiente** (`git bundle create --all`) e o zip tem a **árvore sem `.git`** e sem `node_modules`/`.deps` — assim há dois caminhos de recuperação, com e sem git.

**O que apareceu de novo ao montar o pacote (e mudou o `PREPARO_PUSH.md`):**

1. **A branch já existe no GitHub** — `origin/arena/a14d8a49-pippet-clone` tem **12 commits originais das rodadas 1–6** (ponta `1443745`), que o `STATUS.md` dava como perdidos. O histórico local divergiu: o local tem **7 commits** que o remoto não tem e o remoto tem **12** que o local não tem, com base comum em `48ca7bb`. **`git push` seria recusado**; `--force` está fora de questão. O `PREPARO_PUSH.md` traz as três opções (recomendada: branch nova `…-r12`, sem tocar na existente) e os comandos **prontos e não executados**.
2. **O primeiro bundle não era autossuficiente.** O repositório local era **shallow** (clone raso com `.git/shallow` em `48ca7bb`): `git bundle create --all` herdava essa fronteira, o `git bundle verify` dizia “complete history” e mesmo assim o `git fetch` do bundle falhava com *“did not send all necessary objects”*. Corrigi com `git fetch --unshallow origin` e **provei restaurando de verdade**: pasta vazia → `git fetch` do bundle → `git checkout` → **9 commits, 657 arquivos, HEAD `3f08230`** (`piperline_rodada12_bundle_verify.txt`). O bundle entregue é o regenerado depois disso.
3. **O zip** tem a árvore sem `.git` e sem `node_modules`/`.deps`: 685 entradas, 80.9 MB descompactados, **18 MB** comprimidos.

**O que está em cada documento:**

- **`LEIA_PRIMEIRO_NOVA_SESSAO.md`** — objetivo do projeto; as 10 regras do usuário (respostas curtas, nada em segundo plano, sem push sem ordem, nenhuma chave em arquivo/commit/log/Drive, `127.0.0.1` sempre, testes não alteram arquivo versionado, sem equivalência com o Pippit, sem dado inventado, mensagens ≤ ~2800 caracteres, um commit por item); placar de **todas as rodadas** no sandbox e no Windows; como recuperar o ambiente (`recuperar_ambiente.sh`) e rodar a suíte em blocos; falhas conhecidas com causa **provada** ou **NÃO provada**; o que só o PC do usuário prova; limites do sandbox; pendências por prioridade; a lista exata dos arquivos da entrega.
- **`PREPARO_PUSH.md`** — branch `arena/a14d8a49-pippet-clone`, remoto, o que seria enviado (650 arquivos; o `captures/current_670/rea_session_bundle_lote12.json` de **68 MB**, já no commit base), os commits que existem hoje e por que o histórico é **reconstruído**, o resultado da varredura de segredos e o comando `git push -u origin arena/a14d8a49-pippet-clone` **pronto e NÃO executado**, com a regra de nunca usar `--force`.
- **`segredos_varredura.txt`** — 22 ocorrências do padrão “valor colado”, **todas não-credenciais** (14 chaves falsas de teste, 6 marcadores em inglês, 2 nomes de variável de ambiente), **0 exigindo revisão**.
- **`MANIFESTO_SHA256.csv`** — `caminho,bytes,sha256` dos 656 arquivos versionados no commit `ae68fa0` (o próprio manifesto e este relatório não entram, porque mudariam o próprio hash).

## Estado do repositório

- **HEAD:** o commit que fecha esta rodada (mensagem **“rodada 12: entrega escrita …”**) · commits: `bfa9169` (recuperação do estado da rodada 11), `6a6292d` (item 1), `722f235` (item 2), `329e67d` (entrega dos itens 1 e 2), `ae68fa0` e `d85f88d` (item 3: passagem e manifesto) e o commit desta atualização.
- **Nenhum push**, nenhum `--force`, nenhuma chave.
- Bundle autossuficiente: `piperline_rodada12.bundle` (no Drive, pasta `entrega_12`).
