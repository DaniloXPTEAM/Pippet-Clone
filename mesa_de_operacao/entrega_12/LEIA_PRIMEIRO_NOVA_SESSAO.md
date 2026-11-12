# LEIA PRIMEIRO — passagem para a sessão nova

**Projeto:** PiperLine — reconstrução local do Pippit (`DaniloXPTEAM/Pippet-Clone`), em português, rodando na máquina do usuário, sem depender de serviço pago para funcionar.
**Este arquivo** é o retrato do estado no fim da **rodada 12** (2026-11-09). Se você é a sessão nova: leia tudo, nesta ordem. Ele foi escrito para que **nada do que está no sandbox seja necessário** — tudo o que importa está nesta pasta do Drive.

---

## 1. Situação em uma frase

O app roda, a suíte passa **128/2/0 de 130** no sandbox e o usuário validou as rodadas 9, 10 e 11 no Windows. **Não há push** (o GitHub **não** tem este trabalho) e **o `.git` local foi apagado pelo sandbox 5 vezes** — por isso esta entrega existe: bundle + zip + este texto.

## 2. Regras do usuário (não negociáveis, valem para toda rodada)

1. **Respostas curtas** ao usuário; ordens são **numeradas**, e cada item deve ser respondido na mesma ordem.
2. **Nada em segundo plano** (sem `nohup`, sem espera longa em silêncio) — o usuário quer ver o que está acontecendo.
3. **Sem push** sem ordem explícita dele. Quando houver ordem: **um push por sessão**, só para a branch de trabalho, **nunca `--force`**.
4. **Nenhuma chave/segredo** em arquivo versionado, commit, log, tela, API, guia, relatório **ou no Drive**. Credenciais só pelo **ambiente** ou por `.env` local (ignorado). A API só informa **presente/ausente**.
5. **Endereços sempre `127.0.0.1`**, nunca `localhost` (IPv6 `::1` trava no Windows).
6. **Testes não podem alterar arquivos versionados** (png, `ui-shots`): capturas vão para pasta temporária (`test/support/shots.mjs`).
7. **Não declarar equivalência com o Pippit.** O que existe é a reconstrução local; cobertura de linhas ≠ paridade.
8. **Não inventar dado observado**: o que não foi medido fica “NÃO provado / DESCONHECIDO”. Se um item não puder ser corrigido, **diga o motivo**.
9. Mensagens do usuário para o Arena têm **limite de ~2800 caracteres** — ele manda ordens curtas por isso.
10. Cada item de rodada = **um commit, com teste**.

## 3. Estado de cada rodada

Placar = **passaram / skip / falharam (total)**. “Sandbox” = este ambiente Linux; “Windows” = PC do usuário (validado por ele).

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
| 12 | teste independente de shebang + SKIP do navegador + este pacote | **128/2/0 (130)** | aguardando a suíte do usuário |

Detalhe das duas últimas falhas conhecidas do Windows (rodada 11): `lipsync_adapters` (determinística, 6 de 6) e quatro de tempo (`notifications_ui`, `pricing_faq_ui`, `workflow_jobs`, `talkingphoto_ui`). Veja §6.

## 4. Como recuperar o ambiente do zero

Pré-requisito: Node 20+ (`node -v`). Se o `.git` sumir, restaure primeiro o código:

```bash
git clone https://github.com/DaniloXPTEAM/Pippet-Clone.git  # ou: git init + git fetch do bundle
git bundle verify piperline_rodada12.bundle
git fetch piperline_rodada12.bundle 'refs/*:refs/remotes/bundle/*'
git checkout -b arena/a14d8a49-pippet-clone bundle/arena/a14d8a49-pippet-clone
```

Ou, sem git nenhum, descompacte `piperline_arvore_rodada12.zip` (a árvore sem `.git`).

Depois, dentro de `local_reconstruction/`:

```bash
./recuperar_ambiente.sh --sem-suite   # instala deps em .deps/, acha ffmpeg/ffprobe e Chromium
. .deps/env.sh                        # exporta PIPPIT_FFMPEG, PIPPIT_FFPROBE, LD_LIBRARY_PATH, NODE_PATH
```

O script põe tudo **fora** da árvore versionada (`.deps/`, `node_modules` → symlink), porque o sandbox apaga e o `.gitignore` já cobre. Ele também sabe restaurar de um bundle: `./recuperar_ambiente.sh --bundle arquivo.bundle --sem-suite`.

## 5. Como rodar a suíte

```bash
cd local_reconstruction && . .deps/env.sh
node test/run-all.mjs              # tudo (~5–6 min, 130 testes)
node test/run-all.mjs pricing      # só os que casam com "pricing"
node test/pricing_faq_ui.test.mjs  # um teste isolado
```

Notas de uso:
- `.deps/env.sh` / `source` **é obrigatório**: sem ele o Chromium não acha as libs e o ffmpeg não é encontrado.
- A suíte completa leva ~5 min. **Não** rode com `&`/`nohup` (regra do usuário); se precisar de tempo, rode em blocos por prefixo.
- `PIPERLINE_TEST_TIMING=1` imprime o tempo de cada etapa nos testes que já têm cronômetro (`pricing_faq_ui`).
- `PIPERLINE_TEST_CPU_RATE=8` deixa o navegador 8× mais lento (CDP) — foi assim que o defeito do `free_router_ui` foi reproduzido na rodada 10. Hoje há `applyCpuThrottle(page)` em `test/support/browser.mjs`.
- `PIPERLINE_BROWSER_PROBE_MS` ajusta o prazo da sondagem do navegador (padrão 20 s).
- `PIPERLINE_CHROMIUM_EXECUTABLE` aponta o navegador; `PIPERLINE_TEST_SKIP_BROWSER` não existe — o skip vem de `skipUnavailableBrowser`.
- Os 2 skips fixos (`pageview`, `parity`) dependem de `captures/` do Pippit, que **não** fazem parte do checkout versionado.

## 6. Falhas conhecidas — com a causa provada ou NÃO provada

| Item | Situação | Causa |
|---|---|---|
| `lipsync_adapters` no Windows (r11) | **corrigido na r12** (`6a6292d`) | **provada**: o teste criava “powershell”/“node” com shebang, que o Windows não executa → `spawnSync` devolvia `status: null` |
| SKIP de 14–19 s no `pricing_faq_ui` | **corrigido na r12** (`722f235`) | **provada e reproduzida**: sondagem de navegador com prazo fixo de 5 s, 3 candidatos, checada 2× por teste |
| `pricing_faq_ui` falhando em 74 s | **não reproduzido** | **NÃO provada**. Medido: até 30 s do tempo antigo eram sondagens do navegador; o resto exige uma espera de 30 s estourando sob carga. O teste agora **nomeia a etapa** que falha |
| `talkingphoto_ui` lento (35–70 s) e 1 falha intermitente | **aberto** (registrado desde a r8) | **NÃO provada**; suspeita de ffmpeg/IO sob carga (prévia local saindo 4,72 s em vez de ~3,0 s) |
| `e2e` falhando em 292 s (limite 290 s) | **aberto** | **NÃO provada** (ECONNRESET antigo, citado no `CLAUDE.md`) |
| `notifications_ui`, `workflow_jobs` | **aberto** (1 falha por tempo cada, passaram 4/4 depois) | **NÃO provada**, mesma janela de PC sobrecarregado |

## 7. O que só o PC do usuário prova (não dá para provar no sandbox)

- **PowerShell de verdade**: `prepare()` com `& ` (provado pelo usuário: `"C:\Program Files\nodejs\node.exe" -v` falha sem `&` e roda com ele).
- **Ausência do WSL** no caminho do executor local (o sandbox é Linux; a diferença `bash.exe` do System32 não existe aqui).
- **SAPI** (voz local do Windows) — aqui só existe a flag `PIPPIT_TTS=off`.
- **Caminhos com `:` e espaço** (`C:\…`), ACL de arquivo, `0600` inexistente.
- **Tempos reais** com a máquina carregada (523 MB de RAM livre, Edge/VS Code/WSL) — é a origem das falhas de tempo.
- **Chrome/Edge instalados**: a sondagem acha o navegador do sistema.

## 8. Limitações deste sandbox (o que você vai encontrar)

1. **O `.git` é apagado** com frequência (5 vezes até aqui): a árvore sobrevive, o histórico não. **Entregue no Drive toda rodada.**
2. **Sem `apt`** e sem `cdn.playwright.dev`: o Chromium vem do `@sparticuz/chromium` (`.deps/`) e as libs (`libnspr4`/`libnss3`) precisam ser reextraídas pelo script.
3. **Sem `pwsh`** — teste de PowerShell só por simulação aqui.
4. **Sem GPU** e sem chaves: nada de lip-sync real, nada de chamada paga.
5. **Rede de saída** só para `github.com`, `codeload`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`.
6. `/tmp`, `.deps` e `node_modules` **não persistem** entre sessões.

## 9. Pendências por prioridade

1. **Lip-sync real** — o adaptador `huggingface-space` e o `local-command` existem e são testados com servidor/processo falsos, mas **nenhum modelo rodou**: falta GPU (Wav2Lip/LivePortrait) **ou** um provedor autorizado com credencial. O `LIPSYNC_PROVIDERS.md` tem o levantamento e as licenças (Wav2Lip proíbe uso comercial).
2. **Publicação** — estrutura pronta, sem app registrado/OAuth real (TikTok/Facebook/Instagram aparecem como “confirmados” **na captura**, não como conexão funcionando).
3. **Pagamento** — só estrutura (`PAGAMENTO_ESTRUTURA.md`); a tela de planos diz explicitamente “Não há pagamento nesta reconstrução”.
4. **Marca d’água** — **o png atual (628 B) é provisório**; a marca real será a do **CineForma**, ainda a criar. O teste `watermark_export` protege o arquivo (não pode ser sobrescrito).
5. **`talkingphoto_ui` / `e2e`** — instabilidade de tempo; precisam de uma rodada própria com o PC do usuário livre.
6. **Push** — o GitHub **não** tem nada disto. Só com ordem explícita; ver `PREPARO_PUSH.md`.

## 10. Arquivos desta entrega (`mesa_de_operacao/entrega_12` no Drive)

| Arquivo | O que é |
|---|---|
| `LEIA_PRIMEIRO_NOVA_SESSAO.md` | este texto |
| `piperline_rodada12.bundle` | **bundle autossuficiente** (`--all`) com todo o histórico local |
| `piperline_rodada12_bundle_verify.txt` | saída de `git bundle verify` |
| `piperline_arvore_rodada12.zip` | árvore do projeto **sem `.git`**, sem `node_modules`/`.deps` |
| `STATUS.md` | estado oficial (todas as rodadas) |
| `FEATURE_INVENTORY.md` | inventário de linhas (122 reproduzíveis; 83/122 = 68,0% — cobertura de linhas, **não** paridade) |
| `.env.example` | **nomes** das variáveis, todos vazios |
| `MANIFESTO_SHA256.csv` | sha256 de cada arquivo versionado (no commit indicado no cabeçalho) |
| `PREPARO_PUSH.md` | branch, commits, varredura de segredos e o comando de push **não executado** |
| `segredos_varredura.txt` | resultado cru da varredura de segredos |
| `ENTREGA.md` | relatório da rodada 12 (itens 1, 2 e 3) com tamanho e sha256 dos arquivos |
| `suite_rodada12_final.txt` | suíte completa: **128 passaram, 2 skip explícito, 0 falharam (de 130)** |
| `pricing_faq_ui_20x.txt`, `pricing_faq_ui_cpu.txt` | 20 execuções (mín/mediana/máx) e a tabela de CPU 8×/20×/50×/100× |
| `browser_probe_antes_depois.txt` | o SKIP do Windows reproduzido e corrigido |
| `lipsync_adapters_3x.txt` | 3 execuções do teste de lip-sync após a correção |

## 11. Primeiros passos sugeridos para a sessão nova

1. Restaurar o código (§4) e rodar a suíte em blocos (§5): espere **128/2/0**.
2. Ler `STATUS.md` (topo) e `ENTREGA.md` (rodada 12).
3. Perguntar ao usuário **qual é a ordem da rodada 13** — não presumir.
4. Se ele pedir push: seguir `PREPARO_PUSH.md`, **sem `--force`**, um único push.
