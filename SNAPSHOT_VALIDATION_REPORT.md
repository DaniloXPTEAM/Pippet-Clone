# Relatório de validação do snapshot do Pippit

Gerado em 16/10/2026 por `notes/build_validation_report.py`; todos os números abaixo vêm dos arquivos da pasta (manifesto, tabelas de cobertura e listas de ativos), não foram digitados à mão. Nenhum arquivo foi apagado ou movido nesta etapa.

## Conclusão

**O snapshot está tecnicamente íntegro para o que foi coletado**: os arquivos listados existem, os hashes foram calculados, os 31 scripts salvos têm correspondência em `scripts/raw/`, inventário AST e `evidence_cli/`, e as saídas verificadas não têm truncamento. **Mas o snapshot não é um espelho completo do site**: a pasta tem só 37 dos 293 ativos de rede observados (ver "O que falta").

## Números

| item | valor |
|---|---|
| Total de arquivos (exceto o próprio `MANIFEST_SHA256.csv`) | **431** |
| Tamanho total | **2,67 GB** (2.669.520.800 bytes; o relatório faz parte do manifesto, por isso o valor pode diferir em alguns bytes do somatório final do `MANIFEST_SHA256.csv`) |
| Scripts encontrados (baixados e salvos em `scripts/raw/`) | **31** (31 JS; mais 2 CSS e 4 JSON no mesmo diretório, total 37 arquivos estáticos) |
| Scripts preservados (com hash em `MANIFEST_SHA256.csv`) | **31 de 31** |
| Scripts analisados (grafo completo em `evidence_cli/`) | **31 de 31**: 26 inteiros + 5 em peças |
| Scripts divididos em peças | **5** (`lib-polyfill` da landing e do kep, `uifid-fingerprint-init`, `771`, `69`) |
| Quantidade de peças | **29** (em `evidence_cli/pecas/`) |
| Inventário por AST | 31 de 31 (1.180.685 nós, 0 erros de parse) |
| Ativos de rede encontrados (URLs únicas, sem query) | **293**, em 26 domínios |
| Ativos de rede preservados | **37** |
| Ativos de rede faltantes (não preservados) | **228** (+ 26 telemetria/beacon "não aplicável" e 2 que nem carregaram) |
| Rotas de página identificadas | **55** caminhos únicos (`notes/PAGINAS_PUBLICAS.md`) + **28** códigos de idioma no roteador |
| Caminhos de API no código do cliente | **17** (seção 14.1 do relatório); a maioria não apareceu na rede anônima |
| Requisições observadas nas capturas | **411** retidas em 3 capturas (a 1ª descartou 1.326 eventos; ver limitações) |
| Telas capturadas | 18 PNG; estrutura de UI de 15 páginas em `notes/pages/` |
| Arquivos duplicados (mesmo SHA-256) | **17 grupos**, 19 cópias extras, 0,8 MB |


**Duplicados por hash**: 11 grupo(s): cópia em scripts/export idêntica ao arquivo de scripts/raw (esperado); 1 grupo(s): mesmo arquivo salvo por dois hosts em scripts/raw (pt-BR.89180.json); 5 grupo(s): peças idênticas em divisões auxiliares de scripts/split (sobras de experimentos). Lista completa em `notes/_duplicates_by_hash.json`. Todos pequenos.

### Scripts em rede x scripts salvos

| situação | URLs de script |
|---|---|
| nao preservado | 63 |
| preservado | 31 |
| nao aplicavel | 6 |

"não aplicável" = scripts de terceiros de telemetria/anúncios (GTM, Clarity, Bing, DoubleClick etc.), classificados por domínio; não é arquivo do produto.

## Níveis de cobertura (não confundir)

1. **Arquivo completamente processado**: lido inteiro e gravado sem corte. É o caso de 26 dos 31 inteiros e das 29 peças.
2. **`partial` por código dinâmico**: o REA escreve `partial` em todos; decorre de chamadas dinâmicas, propriedades computadas e alvos ambíguos (`unknown`). É inerente à análise estática, **não é falha de cobertura**.
3. **Saída truncada**: corte por limite de recurso. Só ocorreu nas execuções inteiras dos 5 scripts que estouram o teto da CLI (~990 MB), guardadas em `evidence_cli/_truncados_NAO_USAR/`, e foi resolvido com as peças. Nenhuma das 55 saídas aceitas tem `truncated: true` nem `Resource constraint`.

## Tabela de cobertura por script

Fonte completa (com hash e URL): `notes/COVERAGE_BY_SCRIPT.csv`.

| script | `scripts/raw/` | AST | `evidence_cli/` | peças | nós (REA) |
|---|---|---|---|---|---|
| `bat` | sim | sim | inteiro | — | 15.471 |
| `landing_modern-inline` | sim | sim | inteiro | — | 305 |
| `landing_modern-run-window-fn` | sim | sim | inteiro | — | 5 |
| `landing_react-inline-csp` | sim | sim | inteiro | — | 1.056 |
| `landing_route-manifest-main` | sim | sim | inteiro | — | 44 |
| `landing_argus-builder-strategy` | sim | sim | inteiro | — | 5.579 |
| `landing_builder-runtime` | sim | sim | inteiro | — | 2.734 |
| `landing_async-921` | sim | sim | inteiro | — | 3.407 |
| `landing_lv-user-login-sdk` | sim | sim | inteiro | — | 716 |
| `kep_user-tracking` | sim | sim | inteiro | — | 1.597 |
| `kep_route-manifest-marketing-studio` | sim | sim | inteiro | — | 48 |
| `kep_builder-runtime` | sim | sim | inteiro | — | 1.972 |
| `kep_171` | sim | sim | inteiro | — | 4.485 |
| `kep_386` | sim | sim | inteiro | — | 7.063 |
| `kep_lib-router` | sim | sim | inteiro | — | 20.665 |
| `kep_lib-axios` | sim | sim | inteiro | — | 22.301 |
| `privacy_devtools` | sim | sim | inteiro | — | 17.991 |
| `privacy_core` | sim | sim | inteiro | — | 34.749 |
| `privacy_index` | sim | sim | inteiro | — | 39.647 |
| `kep_pricing` | sim | sim | inteiro | — | 31.689 |
| `kep_200` | sim | sim | inteiro | — | 35.061 |
| `landing_lib-router` | sim | sim | inteiro | — | 32.357 |
| `landing_lib-react` | sim | sim | inteiro | — | 63.356 |
| `kep_lib-react` | sim | sim | inteiro | — | 46.545 |
| `kep_lv-cookie-consent` | sim | sim | inteiro | — | 65.316 |
| `landing_lib-polyfill` | sim | sim | peças | 4 | 91.335 |
| `kep_lib-polyfill` | sim | sim | peças | 5 | 91.518 |
| `uifid-fingerprint-init` | sim | sim | peças | 6 | 97.861 |
| `landing_main` | sim | sim | inteiro | — | 86.574 |
| `landing_771` | sim | sim | peças | 8 | 197.838 |
| `kep_69` | sim | sim | peças | 6 | 158.240 |

## O que falta

- **Ativos de rede**: `notes/MISSING_NETWORK_ASSETS.md` lista cada um. Resumo dos não preservados: document 4, fetch 1, font 14, image 108, media 12, other 4, script 63, stylesheet 21, xhr 1.
- Entre eles estão **63 scripts**, incluindo **todo o app `cms_consumer`** (página do agente de vídeo) e os chunks assíncronos do `kep`. **Os 31 scripts analisados não são todos os scripts que as páginas carregam.**
- `pt-BR.a61aa.json` foi baixado nesta etapa (337.561 bytes, 3.119 chaves); o servidor informa modificação em 16/10/2026, então pode diferir da versão capturada.
- Relações entre peças que ficaram indeterminadas (chamadas `n(expressão)`, carga de chunks `n.e`, IDs de outros chunks, variáveis do escopo externo): `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md`.

## Espaço e redundância (nada foi apagado)

| item | tamanho | situação |
|---|---|---|
| `rea_evidence_bundle_5.json` | 1,06 GB | **redundante em cobertura**: todos os scripts já estão em `evidence_cli/`. Não comparei registro a registro; só tem valor como registro da sessão do MCP. |
| `evidence_cli/_truncados_NAO_USAR/` (5 arquivos) | 10,7 MB | **não redundante** para `landing_lib-polyfill`, `uifid-fingerprint-init` e `landing_771` (guardam módulos e arestas `imports` que as peças não têm). **Redundante na prática** para `kep_lib-polyfill` e `kep_69` (0,7 MB). |
| divisões auxiliares de tentativas via MCP (`scripts/split/{landing_main,landing_react,landing_router,landing_771_big,landing_771_mod04}` e subpastas de `kep_69/`) | 3,3 MB | reprodutíveis a partir de `scripts/raw/` com `notes/split_*.mjs`; servem só às análises do bundle 5 |
| cópias duplicadas por hash | 0,8 MB | ver `notes/_duplicates_by_hash.json` |

**Poderia ser liberado depois, com sua decisão: cerca de 1,06 GB** (praticamente só o bundle 5).

## Limitações conhecidas

1. Só o frontend público e anônimo; backend e fluxos pós-login são inferência.
2. Das 3 capturas de rede, só `scenario_template-studio` está marcada como completa pelo REA; `scenario_multi_pages` descartou 1.326 eventos e `scenario_video-agent` está marcada incompleta (seção de eventos; 0 descartados; 1 requisição não finalizada). A lista de ativos é um **mínimo**.
3. Eventos de rede não trazem tamanho de resposta; o tamanho dos ativos faltantes é desconhecido (não foram feitas requisições para medir).
4. Nas peças o REA não reconhece módulos (`modules: 0`); as arestas de import entre módulos foram reconstruídas por AST e conferidas contra o REA onde havia comparação (`landing_lib-polyfill` 2.677 = 2.677; `uifid` 750 vs 749; `771` 381 vs 394 sem reconciliar). Para `kep_lib-polyfill` e `kep_69` não há comparação possível.
5. Relações via variáveis do escopo externo (não via `require`) e via código dinâmico não foram resolvidas.
6. Duas contagens de nós diferentes (acorn: 1.180.685; REA: `visited_ast_nodes`); não comparáveis nó a nó.
7. Screenshots: 3 das 14 de desktop mostram só a tela inicial (900 px); mobile só 4 páginas.
8. Termos de uso do Pippit podem restringir uso automatizado: o material em `scripts/raw/` e `captures/` é cópia pública de terceiros, só para estudo local.

## Nível de confiança

| área | confiança | motivo |
|---|---|---|
| Integridade dos arquivos da pasta | **alta** | hashes SHA-256 calculados para todos; manifesto do REA confere com `scripts/raw/` (11 de 11) |
| Cobertura dos 31 scripts salvos | **alta** | 31 de 31 em raw, AST e `evidence_cli/`, sem truncamento nas saídas aceitas |
| Cobertura do código que o site realmente carrega | **média-baixa** | 63 scripts vistos na rede não foram baixados (inclui `cms_consumer`) |
| Mapa de rotas e de rede | **média** | capturas incompletas; lista de ativos é um mínimo |
| Relações entre peças | **média** | provadas por `n(literal)`; indeterminadas listadas; sem comparação para dois scripts |
| Backend e fluxos pós-login | **baixa** | inferência a partir de textos e do código do cliente |
