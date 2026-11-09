
## Atualização: repetição com heap ampliado (as 5 análises inteiras agora completas)
O truncamento NÃO era falta de RAM nem o limite `--max-semantic-nodes` (já em 1.000.000; os arquivos visitaram só 90-200 mil nós). Era o orçamento de resultado do processo-pai da CLI, limitado pelo heap padrão do Node. Repetindo com `NODE_OPTIONS=--max-old-space-size=6144` e `--max-heap-mb 6144` (script `notes/run_retry_heap.ps1`), as cinco saíram **inteiras, com truncated=0 e Resource constraint=0**, em `evidence_cli/recovered_retry/` (log `_run_log.tsv`): gtm (142 MB), gtag (436 MB), cookie banner TikTok (417 MB), cms lib-polyfill (268 MB), cms 4017 (576 MB). Elas substituem as saídas inteiras truncadas para o grafo completo; as peças e as saídas truncadas continuam no disco (nada foi apagado).

## Atualização (complemento do snapshot)
- Os 63 scripts antes ausentes foram recuperados (captura do REA + GET público das URLs exatas observadas) e processados pela CLI: 60 completos inteiros; 3 (cms `4017`, cms `lib-polyfill`, banner de cookies TikTok) truncaram inteiros e foram cobertos por peças limpas. Extras: `gtm.js` e `gtag.js` (URLs exatas com query), também por peças.
- Detalhes: `evidence_cli/recovered/INDEX.md`; tabela por script: `notes/RECOVERY_STATUS.csv`.
- Ativos de rede restantes sem arquivo: apenas as chamadas `POST /lv/v1/event/report` (xhr/fetch, telemetria; não são arquivos baixáveis por GET).

# Grafo do REA: estado final (leia só esta parte; o histórico está no fim)

## Estado
- **31 de 31 scripts** com o grafo salvo em disco em `evidence_cli/` (CLI `rea-agents@6.5.0`, que grava a saída sem o orçamento de resposta do MCP). Detalhe por script: `notes/COVERAGE_BY_SCRIPT.csv`; lista e tamanhos: `evidence_cli/INDEX.md`.
- **26 arquivos inteiros** (`evidence_cli/*.json`) e **5 arquivos em 29 peças** (`evidence_cli/pecas/*.json`): `lib-polyfill` (landing), `lib-polyfill` (kep), `uifid-fingerprint-init`, `771` (landing), `69` (kep). Esses 5 estouram o teto de resultado da própria CLI (~990 MB por execução) quando analisados inteiros.
- Verificação: 60 arquivos de saída, nenhum com `truncated: true`, nenhum com `Resource constraint`, formato JSON íntegro, 1,56 GB.

## Três coisas diferentes (não misturar)
1. **Arquivo completamente processado**: lido inteiro e gravado sem corte.
2. **`partial`**: o REA escreve `partial` em tudo porque código dinâmico (chamadas dinâmicas, propriedades computadas, alvos ambíguos) vira `unknown`. É inerente à análise estática; **não** é falha de cobertura.
3. **Saída truncada**: corte por limite de recurso (`truncated: true`, `Resource constraint`). Só ocorreu nas execuções inteiras dos 5 scripts acima (guardadas em `evidence_cli/_truncados_NAO_USAR/`) e nas tentativas antigas via MCP.

## Limites que continuam valendo
- Nas peças o REA **não recupera módulos** (`modules: 0`) nem as arestas `imports` entre módulos. Essas arestas foram reconstruídas por AST em `evidence_cli/pecas/PIECES_CROSS_REFS.csv`; as indeterminadas estão em `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md`.
- Em `landing_lib-polyfill`, `uifid` e `771`, a saída inteira truncada **tem** o grafo de módulos e `imports` (o grafo semântico é que veio cortado); por isso ela **não é redundante**.
- `rea_evidence_bundle_5.json` é a evidência cumulativa da sessão do MCP (cobertura parcial); o REA guarda evidência entre reinícios, o que fez o orçamento do MCP cair a cada lote. A CLI não tem esse problema.

---

# HISTÓRICO (arquivo; contém números de épocas anteriores e não descreve o estado atual)

# Grafo do REA (analyze_javascript_application): status por arquivo (2ª rodada, após reiniciar o REA)

Parâmetros: um arquivo por chamada, `max_semantic_nodes` e `max_semantic_nodes_per_file` = 1.000.000, `integrity_policy: record-and-continue`, `detail: summary`. `max_heap_mb` 8192 na 1ª rodada e **3072** na 2ª (reduzir o heap ajudou a poupar memória).

**"Completo" = arquivo inteiro parseado e grafo semântico retido sem truncar por limite de recurso.** O REA ainda escreve `partial` porque análise estática sempre deixa "fronteiras desconhecidas" (código dinâmico). Isso é inerente, não é falha de cobertura.

## Resumo
| | Arquivos |
|---|---|
| **Completos** | **31 de 31** (inclui o `771`, 8 de 8 peças) |
| Parcial | 0 |
| Truncados ou pendentes | 0 |

## Por que alguns truncam
O REA **guarda cada análise na memória** e o orçamento de resultado acompanha a memória livre. A máquina tem **11,9 GB de RAM e ~1,6 GB livres**; o processo do REA chegou a **1,7 GB**. Resultado: o orçamento caiu de ~731 MB (1ª chamada) para ~285 MB após 8 análises, e arquivos maiores deixam de caber. **Reiniciar o REA devolve o orçamento; liberar RAM (fechar Discord, ChatGPT, `wsl --shutdown`) também ajuda.**

## COMPLETOS (24)
| Arquivo | Nós de AST |
|---|---|
| kep `pricing.ec3e7ac7.js` (**código próprio do app de preços**, 25 relações de requisição) | 31.689 |
| landing `771` peça `mods_05` e peça `mods_06` (ver "Parcial") | 40.850 e 34.071 |
| landing `main.f77ba7085c.js` | 86.574 |
| landing `lib-react.ac0c27841f.js` | 63.356 |
| landing `lib-router.e2ea4c581e.js` | 32.357 |
| landing, 8 pequenos (argus-builder-strategy, builder-runtime, async/921, async/lv-user-login-sdk, route-manifest-main, modern-inline, modern-run-window-fn, react-inline-csp) | 13.846 |
| kep `69.885e370e.js` (dividido em 6 peças, **todas completas**) | 158.210 |
| kep `200.63bb53fe.js` | 35.061 |
| kep `lib-axios.29bed537.js` | 22.301 |
| kep `builder-runtime`, `route-manifest-marketing-studio`, `171`, `386`, `lib-router` (5 arquivos) | ~36.000 |
| kep `upload/side-code/user-tracking-EKBFCCXL.js` | 1.597 |
| `bat.js` (Bing UET) | 15.471 |
| privacy `1.0.0.965/devtools.js` | 17.991 |
| privacy `1.0.0.965/core.js` | 34.749 |

## LOTE 2 (feito, com 1 truncamento)
- landing `771.5a26a240f4.js` (633 KB, 163 módulos): **8 de 8 peças completas**. A peça 04 (módulo único `64791`, 199 KB) foi dividida por instruções em `scripts/split/landing_771_mod04/` (4 pedaços de 39–58 KB): 14.844 + 16.029 + 14.981 + 10.899 nós, todos sem truncar.
- privacy `index.js` (143 KB): **completo**, 39.647 nós, `truncated: false` (na 1ª rodada tinha truncado).
- kep `lv-cookie-consent.8b26699e.js`: truncou na 1ª tentativa; **repetido após reiniciar o REA: completo** (65.316 nós, 8 relações de requisição).

## LOTE 3
- kep `lib-react.48190763.js`: **completo** (46.545 nós).
- `uifid-fingerprint-init.6709749a.js` (369 KB, 218 módulos): truncou inteiro (97.831 nós, 0 relações); dividido por módulos em 6 peças em `scripts/split/uifid/`; **6 de 6 completas** (39.611 + 35.410 + 10.746 + 9.411 + 2.544 + 139 nós, sem truncar).

## LOTE 4: polyfills (feito, 9 de 9 peças completas)
- landing `lib-polyfill.28d1c202ec.js` (231 KB, 659 módulos), 4 peças em `scripts/split/landing_polyfill/`: 43.317 + 39.781 + 7.344 + 893 nós, sem truncar.
- kep `lib-polyfill.086083a9.js` (231 KB, 680 módulos), 5 peças em `scripts/split/kep_polyfill/`: 23.979 + 24.161 + 24.081 + 19.276 + 21 nós, sem truncar.

## PENDENTES
Nenhum. **Os 31 arquivos têm grafo completo** (sem truncamento por limite de recurso).

## Plano
Todos os lotes (1 a 4) concluídos. Nada pendente.

## O que NÃO depende do REA
A **leitura completa por AST** (`notes/ast_inventory/`) cobre **todos os 31 scripts**: 1.180.685 nós, 0 erros, sem limite de memória. É a base da seção 14 do relatório.

## Refação para os bundles de evidência (em andamento)
O REA guarda as análises só na memória da sessão; para ter tudo em disco, cada lote é exportado com `export_evidence_bundle` antes de reiniciar.
- Bundle 1 `rea_evidence_bundle.json`: lv-cookie-consent, kep lib-react, uifid (6 peças), os 2 polyfills (9 peças).
- Bundle 2 `rea_evidence_bundle_2.json`: landing `main` (12 peças: 9 do módulo grande em `landing_main/mod02_body/` + mods_01, mods_03, rest; 7.286 + 4.034 + 7.395 + 11.969 + 5.118 + 10.918 + 9.440 + 8.265 + 10.410 + 9.894 + 977 + 946 nós, todas sem truncar), kep `pricing` (31.689 nós).
- Truncou no bundle 2 (refazer): landing `lib-react.ac0c27841f.js` (orçamento do REA caiu para 402 MB).
- Faltam para o bundle 3 em diante (após reiniciar o REA): landing `lib-react`, `lib-router`, `771` (11 peças: 7 em `landing_771/` + 4 em `landing_771_mod04/`), 8 arquivos pequenos da landing, kep `69` (6 peças), `200`, `171`, `386`, `lib-axios`, kep pequenos, `user-tracking`, `bat.js`, privacy `index.js`, `core`, `devtools`.
- Bundle 3 `rea_evidence_bundle_3.json` (924 MB): landing `lib-react` (7 peças completas: 11.896 + 13.958 + 16.399 + 14.333 + 1.219 + 4.698 + 893 nós); 771: `mods_07` (1.568), `rest` (891), `mods_01` (14.676), `mods_03` (17.185), `mods_04` partes 1 a 4 (14.844 + 16.029 + 14.981 + 10.899), `mods_06` (`landing_771_big/g06`: 13.259 + 11.700 + 8.245 + 883), `mods_05` parcial (`g05`: mods_01 6.365 + mods_03 7.253).
- Truncou no bundle 3 (refazer após reiniciar): landing `lib-router` (módulo único de 103 KB; peças em `scripts/split/landing_router/`), `771 mods_05/mods_02` (`landing_771_big/g05/...mods_02.js`, 27.244 nós, 1 instrução só: precisa de REA recém-reiniciado e de nada mais retido), e **ainda não rodado**: `771 mods_02` em 3 partes (`landing_771_big/mods_02/`).
- Depois: 8 arquivos pequenos da landing, kep `69` (6 peças), `200`, `171`, `386`, `lib-axios`, kep pequenos, `user-tracking`, `bat.js`, privacy `index.js`, `core`, `devtools`.
- Nota: `771 mods_05/rest` e `mods_06/rest` (14 bytes cada) não foram analisados; são invólucros vazios.
- Bundle 4 `rea_evidence_bundle_4.json` (1,05 GB): `771 mods_05/mods_02` = lodash, que o REA não cabia inteiro: dividido por IIFE em 4 peças (`g05/lodash/`: 2.869 + 12.961 + 11.323 + 56 nós, todas completas); `771 mods_02` em 3 partes (13.309 + 12.675 + 5.892); landing `lib-router` em 4 peças (2.856 + 13.845 + 11.910 + 2.868). **Com isso o `771` (todas as peças) fica completo.** Observação: ao dividir o lodash, o cabeçalho de atribuição da IIFE interna (poucos bytes) não entra em nenhuma peça.
- **Ainda sem bundle** (faltam): 8 arquivos pequenos da landing, kep `69` (6 peças), `200`, `171`, `386`, `lib-axios`, kep pequenos, `user-tracking`, `bat.js`, privacy `index.js`, `core`, `devtools`.
- Bundle 5 `rea_evidence_bundle_5.json`: kep `69` peças `mods_01` (2.187 nós), `rest` (19), `body_02/part_01` (1.531) completas; `body_02/part_02` truncou (orçamento do REA 168 MB). Para o kep `69` as divisões estão prontas em `scripts/split/kep_69/` (`body_02/` 7 partes; `pr03/` + `pr03/b02/` 3 partes; `pr04/` + `pr04/lodash/` (+ `inner/`); `pr05/`). Faltam rodar: body_02 part_02..07, pr03 p_01 e b02 part_01..03, pr04 p_01 e lodash (4 peças), pr05 p_01 e p_02. Depois: kep `200`, `171`, `386`, `lib-axios`, kep pequenos, `user-tracking`, `bat.js`, privacy `index.js`/`core`/`devtools`, 8 pequenos da landing.
- **Descoberta (após o bundle 5)**: o REA **guarda a evidência entre reinícios** (bundles cumulativos; o orçamento seguiu caindo: 731 -> 513 -> 475 -> 339 -> 291 -> 168 -> 149 MB mesmo com 3,2 GB de RAM livre). Logo, reiniciar não devolve o orçamento; o que o consome é o histórico acumulado. Enquanto esse histórico não for descartado, peças novas ficam truncadas. Onde o REA guarda isso: não localizado (busca só leitura em AppData/LocalAppData/perfil).

## FECHAMENTO (CLI do REA, saída em disco)
Usando a CLI `rea-agents@6.5.0` (já em cache), os **31 scripts têm o grafo completo salvo em `evidence_cli/`** (ver `evidence_cli/INDEX.md`): 26 arquivos inteiros e 29 peças para os 5 que passam do teto de resultado da CLI (`lib-polyfill` x2, `uifid`, `771`, `kep_69`). Verificação: 60 arquivos, 0 truncados, 0 "Resource constraint", formato JSON íntegro, 1,56 GB. Soma de nós: 540.733 (26 inteiros) + 636.792 (peças) = 1.177.525, contra 1.180.685 da leitura por AST (contagem por métodos diferentes; as peças acrescentam poucos nós de invólucro).
