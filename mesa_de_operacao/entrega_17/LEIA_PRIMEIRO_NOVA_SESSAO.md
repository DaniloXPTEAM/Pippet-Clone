# LEIA PRIMEIRO — passagem para a sessão nova (rodada 17)

**Projeto:** PiperLine — reconstrução local do Pippit (`DaniloXPTEAM/Pippet-Clone`), em português, rodando na máquina do usuário, sem depender de serviço pago para funcionar.
**Este arquivo** é o retrato do estado no fim da **rodada 17 revisada** (2026-11-12). Se você é a sessão nova: leia tudo, nesta ordem. Ele foi escrito para que **nada do que está no sandbox seja necessário** — tudo o que importa está nesta pasta do Drive.

---

## 1. Situação em uma frase

A rodada 16 foi validada no Windows do usuário (com navegador): **133 ok / 2 skip / 1 falha instável (de 135)**. A r17 corrigiu a instável e a revisão da r17 fechou os 3 pontos apontados pelo usuário: (1) **as duas réguas lado a lado** (§3): **105/122 = 86,1%** (critério r15) e **151/423 = 35,7%** (catálogo integral: 85 verificadas / 66 implementadas UNOBSERVED / 272 inventadas); (2) **histórico com os SHAs originais dos bundles** — a r15 e a r16 nasceram em ramos paralelos (o `.git` foi apagado na virada r15→r16) e a **costura** (merge `5a82113`) une os dois ramos sem reescrever nada: 53/53 commits dos bundles com SHA original (`PROVA_HISTORICO.md` traz o mapa lado a lado); (3) **a suíte inteira roda no sandbox com navegador** — **133 ok / 2 skip explícitos / 0 falhas (de 135)** com o Chromium 153 headless (§5/§8), `features_ui` incluída (**4/4 aqui**; a instabilidade era o loop de espera por `unread`, corrigido no item 1). **Não há push** (só no fim do projeto, quando o usuário escrever "PUSH AUTORIZADO"); o código está no bundle `pippet-clone-r17.bundle` da entrega_17.

**Atenção, isto continua valendo desde a rodada 12:** a branch `arena/a14d8a49-pippet-clone-r14` **já foi publicada no GitHub** (push autorizado e consumido na r14, ponta `76aee1a`). A branch de trabalho desta sessão é `arena/d9cee29f-pippet-clone`, com os commits da r15 **não publicados**. `PREPARO_PUSH.md` traz os comandos prontos, **não executados** — só quando o usuário escrever "PUSH AUTORIZADO", um push, nunca `--force`.

## 2. Regras do usuário (não negociáveis, valem para toda rodada)

1. **Respostas curtas** ao usuário; ordens são **numeradas**, e cada item deve ser respondido na mesma ordem.
2. **Nada em segundo plano** (sem `nohup`, sem espera longa em silêncio) — o usuário quer ver o que está acontecendo.
3. **Sem push** sem ordem explícita dele. Quando houver ordem: **um push por sessão**, só para a branch de trabalho, **nunca `--force`**.
4. **Nenhuma chave/segredo** em arquivo versionado, commit, log, tela, API, guia, relatório **ou no Drive**. Credenciais só pelo **ambiente** ou por `.env` local (ignorado). A API só informa **presente/ausente**.
5. **Endereços sempre `127.0.0.1`**, nunca `localhost` (IPv6 `::1` trava no Windows).
6. **Testes não podem alterar arquivos versionados** (png, `ui-shots`): capturas vão para pasta temporária (`test/support/shots.mjs`).
7. **Não declarar equivalência com o Pippit.** O que existe é a reconstrução local; cobertura de linhas ≠ paridade.
8. **Não inventar dado observado**: o que não foi medido fica "NÃO provado / DESCONHECIDO". Se um item não puder ser corrigido, **diga o motivo**.
9. Mensagens do usuário para o Arena têm **limite de ~2800 caracteres** — ele manda ordens curtas por isso.
10. Cada item de rodada = **um commit, com teste**.

## 3. Estado de cada rodada

Placar = **passaram / skip / falharam (total)**. "Sandbox" = este ambiente Linux; "Windows" = PC do usuário (validado por ele).

| Rodada | Tema | Sandbox | Windows |
|---|---|---|---|
| 1–2 | base do app local, páginas, testes iniciais | não registrado aqui | não registrado |
| 3 | Chromium + entrega (suite 44/40/0 de 84 no sandbox sem navegador) | 44/40/0 (84) | não registrado |
| 4 | B/C: roteador, marketing, canvas | 78/2/0 (80) | não registrado |
| 5 | NovAI (vídeo gratuito em fila), reservas | ~90/2/0 | não registrado |
| 6 | Cloudflare Workers AI, FreeLLMAPI, Omni Router | não registrado aqui | 3 falhas de rota (corrigidas nas rodadas seguintes) |
| 7 | lip-sync (2 adaptadores), marca d’água, login, publicação, pagamento | **120/2/0 (122)** após recuperação do `.git` | não registrado |
| 8 | login Supabase real (GoTrue, PKCE), `.env` só nomes, guia do usuário | **124/2/0 (126)** | **119/2/5 (126)** |
| 9 | as 5 falhas do Windows: `drawtext`, `0600`, voz SAPI, roteador | **125/2/0 (127)** | **122/3/2 (127)** |
| 10 | marca d’água (png 628 B), WSL no executor local, `free_router_ui`, regra dos arquivos versionados | **127/2/0 (129)** | passou, com **1 falha**: `lipsync_adapters` |
| 11 | `&` de chamada no PowerShell (comando entre aspas) | **127/2/0 (129)** | **119/5/5 (129)** |
| 12 | teste independente de shebang + SKIP do navegador + pacote | **128/2/0 (130)** | **128/2/2 (130)** |
| 13 | código de saída do PowerShell, import por `file://`, auditoria da árvore | **128/2/0 (130)** | **126/2/2 (130)** — validado pelo usuário |
| 14 | espera por tempo no `lipsync_adapters` + esta passagem | **128/2/0 (130)** | aguardando a suíte do usuário |
| 15 | terminar o projeto: 39 linhas, inventário recontado (105/122), 8 anúncios, atalhos 19/20 | **79/56/0 (135)** — 56 skips de navegador | 56 UI rodaram; **4 defeitos** (corrigidos na r16) |
| 16 | os 4 defeitos do Windows + régua honesta (UNOBSERVED ≠ verificada; UI só conta passando) | **79/56/0 (135)** | **133/2/1 (135)** — validado pelo usuário; a falha instável = `features_ui` (passa 1 de 3) |
| 17 | ordem determinística das notificações + histórico costurado (SHAs originais) + réguas lado a lado | **133 ok / 2 skip / 0 falhas (de 135)** com Chromium headless; `features_ui` **4/4** | aguardando a suíte do usuário |

As duas falhas da r13 no Windows: `omni_router_ui` (**falha de tempo**; passou **4/4** em reexecução — mesma classe sem causa provada de `notifications_ui`/`workflow_jobs`) e `lipsync_adapters` (falhou **4/4**; **causa provada**: o laço de espera do teste dava 40 voltas de 40 ms ≈ 1,6 s e o PowerShell leva 2,2–2,7 s para abrir — o job ficava "running" e o teste estourava "a tarefa não terminou dentro do tempo do teste"). **Corrigido na r14** (`afb2550`): o laço agora espera **por tempo** (`Date.now()`, teto de 30 s), com o resto do teste idêntico; provado com **5 execuções seguidas**. Veja §6.

## 4. Como recuperar o ambiente do zero

Pré-requisito: Node 20+ (`node -v`). Se o `.git` sumir, restaure primeiro o código:

```bash
# caminho 1 — pelo bundle (autossuficiente; testado restaurando numa pasta vazia —
# os números da r14 estão em `piperline_rodada14_bundle_verify.txt`)
git init piperline && cd piperline
git fetch ../piperline_rodada14.bundle 'refs/heads/*:refs/remotes/bundle/*'
git checkout -b arena/d9cee29f-pippet-clone bundle/arena/d9cee29f-pippet-clone
# (a ponta do bundle é o HEAD final da r14 — o sha está no `SHA256SUMS.txt`;
#  no bundle da r13 o ref se chamava bundle/arena/a14d8a49-pippet-clone, ponta 9e57f96)

# caminho 2 — pelo zip (sem git nenhum)
unzip piperline_arvore_rodada14.zip -d piperline
```

Ou, sem git nenhum, descompacte `piperline_arvore_rodada14.zip` (a árvore sem `.git`).

Depois, dentro de `local_reconstruction/`:

```bash
./recuperar_ambiente.sh --sem-suite   # instala deps em .deps/, acha ffmpeg/ffprobe e Chromium
. .deps/env.sh                        # exporta PIPPIT_FFMPEG, PIPPIT_FFPROBE, LD_LIBRARY_PATH, NODE_PATH
```

O script põe tudo **fora** da árvore versionada (`.deps/`, `node_modules` → symlink), porque o sandbox apaga e o `.gitignore` já cobre. Ele também sabe restaurar de um bundle: `./recuperar_ambiente.sh --bundle arquivo.bundle --sem-suite`.

**Nota desta rodada:** o checkout do Arena nasce **shallow** (`git rev-parse --is-shallow-repository` = `true`) — antes de gerar qualquer bundle, rode `git fetch --unshallow origin` (senão o bundle não é autossuficiente; ver `PREPARO_PUSH.md` §8).

## 5. Como rodar a suíte

```bash
cd local_reconstruction && . .deps/env.sh
node test/run-all.mjs              # tudo (~4–6 min, 130 testes)
node test/run-all.mjs pricing      # só os que casam com "pricing"
node test/pricing_faq_ui.test.mjs  # um teste isolado
```

Notas de uso:
- `.deps/env.sh` / `source` **é obrigatório**: sem ele o Chromium não acha as libs e o ffmpeg não é encontrado.
- A suíte completa leva ~4 min. **Não** rode com `&`/`nohup` (regra do usuário); se precisar de tempo, rode em blocos por prefixo (na r14 a soma dos blocos por teste único fechou 128/2/0 de 130; 5 testes rodaram 2× por sobreposição de filtro do `run-all`, sem conflito de resultado).
- `PIPERLINE_TEST_TIMING=1` imprime o tempo de cada etapa nos testes que já têm cronômetro (`pricing_faq_ui`).
- `PIPERLINE_TEST_CPU_RATE=8` deixa o navegador 8× mais lento (CDP) — foi assim que o defeito do `free_router_ui` foi reproduzido na rodada 10. Hoje há `applyCpuThrottle(page)` em `test/support/browser.mjs`.
- `PIPERLINE_BROWSER_PROBE_MS` ajusta o prazo da sondagem do navegador (padrão 20 s).
- `PIPERLINE_CHROMIUM_EXECUTABLE` aponta o navegador; `PIPERLINE_TEST_SKIP_BROWSER` não existe — o skip vem de `skipUnavailableBrowser`.
- Os 2 skips fixos (`pageview`, `parity`) dependem de `captures/` do Pippit, que **não** fazem parte do checkout versionado.
- **Placar desta r17 revisada, rodado aqui com navegador: 133 ok / 2 skip explícito / 0 falhas (de 135)** — os 56 testes de tela **rodam no sandbox** (§8, item 2). No Arena, se `.deps/` não existir: `npm install` em `local_reconstruction/`, `npm install --no-save @sparticuz/chromium`, extrair `bin/al2023.tar.br` do pacote e exportar `PIPERLINE_CHROMIUM_EXECUTABLE=/tmp/chromium` + `LD_LIBRARY_PATH` da pasta das libs; ffmpeg/ffprobe estáticos em `/home/user/.tools/` (a pasta é apagada entre sessões — reinstale: wheel `imageio-ffmpeg` no PyPI + tarball `ffprobe-static` no npm).

## 6. Falhas conhecidas — com a causa provada ou NÃO provada

| Item | Estado | Causa |
|---|---|---|
| `features_ui` instável (passa 1 de 3) | **corrigido na r17** | **provada**: a espera era por `unread > 0`, que os 8 anúncios deixam sempre verdadeiro — a lista chegava sem o evento real e `.note.first()` era um anúncio; agora espera-se o evento e a nota é achada por `hasText`; o servidor passou a ordenar (eventos primeiro, data desc, anúncios por último). Falta rodar no Windows para fechar. |

| Item | Situação | Causa |
|---|---|---|
| `lipsync_adapters` no Windows (r11) | **corrigido na r12** (`6a6292d`) | **provada**: o teste criava "powershell"/"node" com shebang, que o Windows não executa → `spawnSync` devolvia `status: null` |
| `lipsync_adapters` na r12: esperava "código 3", recebia "código 1" | **corrigido na r13** (`ce8693c`) | **provada pelo usuário no PowerShell real**: `powershell -Command` termina 1 quando um programa nativo falha; `; exit $LASTEXITCODE` devolve 3 |
| `lipsync_adapters` na r13: falhou 4/4 no Windows | **corrigido na r14** (`afb2550`) | **provada**: o laço de espera (linha 87) dava 40 voltas de 40 ms ≈ 1,6 s; o PowerShell leva 2,2–2,7 s para abrir → o job ficava "running" e o teste estourava "a tarefa não terminou dentro do tempo do teste". Agora o laço espera **por tempo** (até 30 s, `Date.now()`); 5 execuções seguidas, 5 ok |
| `browser_probe` na r12: `ERR_UNSUPPORTED_ESM_URL_SCHEME` | **corrigido na r13** (`85ebc03`) | **provada**: `import()` de caminho absoluto `C:\...`; o Node exige URL `file://` no Windows |
| SKIP de 14–19 s no `pricing_faq_ui` | **corrigido na r12** (`722f235`) | **provada e reproduzida**: sondagem de navegador com prazo fixo de 5 s, 3 candidatos, checada 2× por teste |
| `omni_router_ui` na r13 (Windows): 1 falha de tempo | **aberto** (passou 4/4 em reexecução) | **NÃO provada**; mesma classe de `notifications_ui`/`workflow_jobs` (janela de PC sobrecarregado) |
| `pricing_faq_ui` falhando em 74 s | **não reproduzido** | **NÃO provada**. Medido: até 30 s do tempo antigo eram sondagens do navegador; o teste agora **nomeia a etapa** que falha |
| `talkingphoto_ui` lento (35–70 s) e 1 falha intermitente | **aberto** (registrado desde a r8) | **NÃO provada**; suspeita de ffmpeg/IO sob carga |
| `e2e` falhando em 292 s (limite 290 s) | **aberto** | **NÃO provada** (ECONNRESET antigo, citado no `CLAUDE.md`) |
| `notifications_ui`, `workflow_jobs` | **aberto** (1 falha por tempo cada, passaram 4/4 depois) | **NÃO provada**, mesma janela de PC sobrecarregado |

## 7. O que só o PC do usuário prova (não dá para provar no sandbox)

- **PowerShell de verdade**: `prepare()` com `& ` (provado pelo usuário) e a regra `; exit $LASTEXITCODE` (r13). Aqui a prova é o imitador com a mesma regra.
- **Ausência do WSL** no caminho do executor local (o sandbox é Linux; a diferença `bash.exe` do System32 não existe aqui).
- **SAPI** (voz local do Windows) — aqui só existe a flag `PIPPIT_TTS=off`.
- **Caminhos com `:` e espaço** (`C:\…`), ACL de arquivo, `0600` inexistente.
- **Tempos reais** com a máquina carregada (523 MB de RAM livre, Edge/VS Code/WSL) — é a origem das falhas de tempo (inclusive o `lipsync_adapters` da r13, cuja causa é a demora do PowerShell em abrir).
- **Chrome/Edge instalados**: a sondagem acha o navegador do sistema.

## 8. Limitações deste sandbox (o que você vai encontrar)

1. **O `.git` é apagado** com frequência (6 vezes até aqui): a árvore sobrevive, o histórico não. **Entregue no Drive toda rodada.** Nesta rodada o sandbox novo nasceu com um clone limpo do `main` — o código veio do bundle r13 e o HEAD conferiu em `9e57f96`.
2. **Sem `apt`** e sem `cdn.playwright.dev`: o Chromium vem do `@sparticuz/chromium` (`.deps/`) e as libs (`libnspr4`/`libnss3`) precisam ser reextraídas pelo script.
3. **Sem `pwsh`** — teste de PowerShell só por simulação aqui.
4. **Sem GPU** e sem chaves: nada de lip-sync real, nada de chamada paga.
5. **Rede de saída** só para `github.com`, `codeload`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`.
6. `/tmp`, `.deps` e `node_modules` **não persistem** entre sessões.

## 9. Pendências por prioridade

1. **Lip-sync real** — o adaptador `huggingface-space` e o `local-command` existem e são testados com servidor/processo falsos, mas **nenhum modelo rodou**: falta GPU (Wav2Lip/LivePortrait) **ou** um provedor autorizado com credencial. O `LIPSYNC_PROVIDERS.md` tem o levantamento e as licenças (Wav2Lip proíbe uso comercial).
2. **Publicação** — estrutura pronta, sem app registrado/OAuth real (TikTok/Facebook/Instagram aparecem como "confirmados" **na captura**, não como conexão funcionando).
3. **Pagamento** — só estrutura (`PAGAMENTO_ESTRUTURA.md`); a tela de planos diz explicitamente "Não há pagamento nesta reconstrução".
4. **Marca d’água** — **o png atual (628 B) é provisório**; a marca real será a do **CineForma**, ainda a criar. O teste `watermark_export` protege o arquivo (não pode ser sobrescrito).
5. **`talkingphoto_ui` / `e2e` / `omni_router_ui`** — instabilidade de tempo; precisam de uma rodada própria com o PC do usuário livre.
6. **Push** — o GitHub **não** tem nada disto. Só com ordem explícita; ver `PREPARO_PUSH.md`.

## 10. Arquivos desta entrega (`mesa_de_operacao/entrega_17` no Drive)

| Arquivo | O que é |
|---|---|
| `LEIA_PRIMEIRO_NOVA_SESSAO.md` | este texto |
| `pippet-clone-r17.bundle` | **bundle autossuficiente** com todo o histórico (53 SHAs originais dos bundles + costura + r17; prova no `MANIFESTO.md`) |
| `pippet-clone-r17.zip` | árvore do projeto **sem `.git`**, sem `node_modules`/`.claude` |
| `SHA256SUMS` | hashes dos dois pacotes, formato `hash  arquivo` |
| `STATUS.md` | estado oficial (todas as rodadas) |
| `ENTREGA.md` | relatório da rodada 14 (itens 1, 2 e 3) e a classificação do que está no Drive |
| `FEATURE_INVENTORY.md` | inventário com **as duas réguas lado a lado** (105/122 = 86,1% e 151/423 = 35,7% — cobertura de linhas, **não** paridade) |
| `PROVA_HISTORICO.md` | mapa lado a lado: o que é SHA original dos bundles e o que é SHA novo, e por quê |
| `MANIFESTO.md` | conferências do pacote + prova do `git clone` em pasta vazia |
| `PREPARO_PUSH.md` | branch, commits, divergência com o remoto e o comando de push **não executado** |
| `segredos_varredura_r14.txt` | resultado cru da varredura de segredos desta rodada |
| `suite_rodada14_final.txt` | suíte completa: **128 passaram, 2 skip explícito, 0 falharam (de 130)** |
| `git_status_prova_r14.txt` | sha256 dos arquivos versionados antes e depois da suíte (0 diferenças) e o `git status --short` |
| `lipsync_adapters_5x_r14.txt` | a causa provada do item 1 (laço antigo × demora do PowerShell) e 5 execuções seguidas, 5 ok |
| `SHA256SUMS.txt` | sha256 de **todos** os arquivos da entrega, inclusive do bundle e do zip (gerado depois deles) |

## 11. Primeiros passos sugeridos para a sessão nova

1. Restaurar o código (§4) e rodar a suíte (§5): espere **128/2/0**.
2. Ler `STATUS.md` (topo), `ENTREGA.md` (rodada 14) e `PREPARO_PUSH.md` (o push está pronto, **não executado**).
3. Perguntar ao usuário **qual é a ordem da rodada 15** — não presumir.
4. Se ele escrever "PUSH AUTORIZADO": seguir `PREPARO_PUSH.md`, **sem `--force`**, um único push para a branch nova `arena/a14d8a49-pippet-clone-r12` (opção A), conferir o sha no GitHub e mostrar.
