# Entrega 4 — local, sem push

Data: 2026-11-09 · Branch: `arena/a14d8a49-pippet-clone` · HEAD: topo do histórico publicado (ver `log.txt`); último commit de código: `88a72db`
Nada foi empurrado: sem push, sem chave real, sem crédito Pippit consumido.

## Aviso primeiro: histórico reconstruído

O sandbox reiniciou duas vezes nesta rodada. Na segunda, `/tmp`, `node_modules` e `~/.cache` foram apagados e o `.git` voltou sem `config`, o que fez o repositório ser re-clonado em `48ca7bb`. Desta vez o objeto `1443745` (base dos lotes 3 e 4) **não sobreviveu**, então o bundle fino publicado antes não podia mais ser aplicado.

Estado atual, sem enfeite: **a árvore de trabalho está completa e verificada** — suíte 90/92, 0 falhas — mas o histórico local foi **reconstruído** com 3 commits sobre `48ca7bb`:

| Commit | Conteúdo |
|---|---|
| `0e2b088` | Restauração de toda a reconstrução acumulada (rotas, telas, testes e tabela dos lotes 3 e 4) |
| `115106c` | Linha 79 — ferramentas do gerador |
| `ce678cf` | Linha 56 — menu do avatar com evidência separada e observação humana pendente |
| `de03ceb` | Linha 76 — templates: 8 nomes de 10, imagens e fluxo Gerar `UNOBSERVED` |
| `4c28132` | Linha 90 — barra do canvas: 5 ações observadas × 9 ferramentas locais, ícones/dimensões `UNOBSERVED` |
| `5b3e1d8` | STATUS da entrega 4 |
| `66b415f` | Linha 22 — destinos da conta que nunca foram capturados (CLI, wishlist, atendimento) |
| `a47a1ca` | Linha 78 — perguntas do FAQ de preços sem inventar as respostas |
| `f1bac4c` | Linha 92 — nomes dos endpoints omni/digital_human, sem uma única chamada |
| `88a72db` | Correção do título do projeto revertendo para valor já salvo (replay do `change`) |
| `d65a4fd` | STATUS com os itens 22, 78 e 92 |

As mensagens e a granularidade dos 18 commits anteriores não são recuperáveis sem o objeto base; por isso não estão fingindo existir. Nenhum `--force`, nenhum push.

## Itens do lote 4 (todos `parcial`, com motivo registrado)

Três itens entraram depois do primeiro fechamento do lote (linhas 22, 78 e 92), no mesmo padrão: rota local que expõe **só o observado**, `UNOBSERVED` explícito no resto, teste de rota + asserção de tela, e um commit por item.

| Linha | Superfície | O que ficou pronto |
|---|---|---|
| 22 | Conta / menu More | `GET /api/account/unobserved` devolve 3 destinos (`cli` "CLI", `wishlist` "Feature wishlist", `support` "Customer service"), todos `UNOBSERVED` com a nota de que não foram capturados, `openedDestinations:0` e `externalCalls:false`; o menu More mostra "Lacunas da conta" e o modal lista os três. Testes `account_unobserved_route` + `account_more_language_ui`. |
| 78 | Página de preços / FAQ | `GET /api/pricing/faq` devolve as **6 perguntas preservadas** com `answers`, `ratings` e `featureSections` em `UNOBSERVED` e `planComparison:'local'`; a tela mostra a contagem e o que falta em `#faqEvidence`. Testes `pricing_faq_route` + `pricing_faq_ui`. Segue `parcial`: as respostas completas não existem no checkout. |
| 92 | Omni / humano digital | `GET /api/capabilities/omni` (fora do prefixo `/api/omni`, que o teste proíbe chamar) expõe os **11 endpoints nomeados** nos bundles — `get_tone_list`, `get_hot_audio_list`, `text_to_speech`, `audio_to_text`, `image_object_detect`, `get_img_category_list`, `preprocess_submit_request`, `before_create_limit_check`, `try_task`, `retry_task`, `batch_delete_digital` — com `bodies`/`screen`/`execution` em `UNOBSERVED`, `createsRealAvatar:false`; a tela mostra em `#omniEvidence`. Testes `omni_capabilities_route` + `omni_ui`. Segue `parcial`: nenhum corpo foi capturado. |

| Linha | Superfície | O que ficou pronto |
|---|---|---|
| 74 | Export settings | `GET /api/editor/:id/cover` extrai o **primeiro quadro do primeiro clipe** com `PIPPIT_FFMPEG` e cache por ativo; o diálogo mostra essa miniatura real e declara que clicar não abre seletor (`UNOBSERVED`). Teste `export_cover_route`. |
| 77 | Página de preços | `GET /api/integrations` registra a frase de marketing capturada, marca marketplace com **0 telas** e `UNOBSERVED`, e lista só TikTok/Facebook/Instagram como canais confirmados (OAuth `UNOBSERVED`). Aviso na tela: `#integrationsNote`. Testes `integrations_route` + `pricing_faq_ui`. |
| 56 | Avatares | `GET /api/avatar/menu` separa `Aplicar` (`CONFIRMED`, via @menção) do menu "…" e da prévia de áudio (`UNOBSERVED`), com `humanObservation:PENDING`; o menu local mostra a evidência. Testes `avatar_menu_route` + `avatar_menu_ui`. |
| 76 | Templates | `GET /api/templates/state` devolve os 8 nomes preservados de 10, `missingNames:2`, imagens/texto/Gerar `UNOBSERVED`; a tela repete em `#templateEvidence`. Testes `templates_route` + `templates_ui`. |
| 90 | Barra do canvas | `GET /api/canvas/toolbar` lista 5 ações observadas e 9 ferramentas locais, com ícones/dimensões/contratos/árvore por nó `UNOBSERVED`; a barra mostra em `#cvToolbarNote`. Testes `canvas_toolbar_route` + `canvas_toolbar_ui`. |
| 79 | Gerador / ferramentas populares | `GET /api/generator/tools` devolve os 5 nomes preservados no inventário com os detalhes observados (3 passos da foto falante, JPG/PNG > 256×256, ~20 exemplos, diálogo Upload video, transcrição do Quick cut), os 3 presets e `chiplist.observed:false`. Aviso na tela: `#genToolsNote`. Testes `generator_tools_route` + `llm_ui`. |
| 80 | Home | `GET /api/promotions` registra as duas capturas datadas (20/10 90%, 21/10 40%) com preços por segundo vistos, sempre `current:false`; banner abre o diálogo de ofertas observadas. Teste `promotions_route`. |
| 81 | Composer | `GET /api/composer/controls` lista os 5 rótulos observados com o seletor local de cada um, marca 4 sem opções internas capturadas e o custo por geração `UNOBSERVED`; o painel Modelo\|Preferência mostra a contagem (`#costnote`). Testes `composer_controls_route` + `composer_dropdowns_ui`. |
| 91 | Inspiration | `GET /api/inspiration/state` devolve só as 6 funções estáticas, todas `UNOBSERVED`, `feedCaptured:false`, `externalCalls:false`; a página consome a rota. Teste `inspiration_route`. |

Além disso, dois **defeitos reais** foram corrigidos no caminho:

1. O `change` do título do projeto reenviava o valor antigo quando um re-render acontecia antes do blur, sobrescrevendo o título salvo. O handler agora fixa `CUR.title` e ignora título vazio; a API local responde `cache-control: no-store`.
2. O mesmo campo `#ttl` podia disparar de novo com um valor **já visto** (replay do re-render), revertendo o título recém-salvo. O handler passou a manter `TTL_SEEN`/`TTL_LAST`/`TTL_AT` e a ignorar a repetição de um valor visto há menos de 3 s — mitigação explícita, não a solução ideal (o ideal é o input ficar não-controlado durante a edição); registrada como tal em vez de escondida.

O teste `canvas_existing_project_ui` também deixou de usar `page.waitForFunction` com função `async`: o Playwright não espera a promise, o valor devolvido é uma Promise (sempre *truthy*) e o teste "passava" e flakeava. Agora usa um helper `poll(fn,label)` com `await` explícito a cada 500 ms.

## Suíte completa

```
96 passaram, 2 skip explícito, 0 falharam (de 98)
```

Arquivo com a saída integral: `suite_final.txt`.

- Skips legítimos e inalterados: `pageview` (falta `captures/scenario_video-agent_bodies.json`) e `parity` (faltam dois arquivos de CDP).
- Flake registrado: `talkingphoto_ui` falhou uma vez em carga total com "duração da prévia local: 4.88" (espera 2,9–3,1 s) e passou 2/2 isolado e na rodada final. É pré-existente, não introduzido por estes itens; ficou anotado aqui em vez de afrouxar a asserção.

## Documentação consolidada (fim da entrega 4)

- `TABELA_LINHAS_NAO_PRONTAS.md` — resumo reescrito por estado: 18 `parcial`, 9 `bloqueada`, 26 `investigada` (13 fora de escopo), com o motivo de cada `parcial` na própria linha.
- `mesa_de_operacao/PROGRESSO_2026-11-09_1645_ENTREGA_4.md` — registro desta rodada (itens 22/78/92, as duas correções reais, a suíte, o histórico e o que sobrou).
- `mesa_de_operacao/PROGRESSO_2026-11-09_1222.md` — recebeu um ponteiro para o arquivo acima, sem reescrever o registro original.
- `STATUS.md` — estado consolidado: entrega 4 fechada, números da suíte, pacote publicado e o que resta na tabela.

## Arquivos no pacote

- `lote4_full_<hash>.bundle` — bundle **autossuficiente** (topo do histórico, sem base externa; o hash no nome é o do `HEAD` do bundle). Aplicar:
  ```
  git bundle list-heads lote4_full_<hash>.bundle
  git bundle verify lote4_full_<hash>.bundle
  git fetch lote4_full_<hash>.bundle arena/a14d8a49-pippet-clone:lote4
  ```
- `estado_progresso_2.zip` — arquivos alterados em `48ca7bb..HEAD` + `log.txt`, `suite_final.txt` e este relatório.
- `log.txt` — `git log --oneline` do histórico reconstruído.
- `suite_final.txt` — saída integral da suíte.

## Ferramentas reerguidas (só hosts permitidos)

`@sparticuz/chromium` traz `chromium.br` e `al2023.tar.br` com as libs NSS/NSPR; decompostos com `zlib.brotliDecompressSync` em `~/.cache/chromium/{chromium,lib}` e usados via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` + `LD_LIBRARY_PATH`. ffmpeg vem do wheel `imageio-ffmpeg` (PyPI, em venv) e ffprobe do npm `ffprobe-static`.
