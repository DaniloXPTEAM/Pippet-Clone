# PIPPIT_RE_CLOSURE — estado da engenharia reversa do PiperLine (atualizado em 29/10/2026)

Estado da engenharia reversa do Pippit **que pode ser feita sem gastar créditos, sem gerar mídia e sem alterar a conta**. Ferramentas: REA 6.8.0 e Playwright MCP 0.0.83 / Chrome 156. **A RE não está encerrada** (diretriz permanente do usuário): este documento é um inventário do que foi provado, do que é parcial e do que continua desconhecido. Nada aqui declara equivalência formal com o servidor do Pippit.

## 1. Deriva de build (28/10/2026): números reconciliados

O Pippit foi reimplantado em 28/10/2026 (`runtime.5a88d8be46`; analisávamos `runtime.e9428809bf`). Medido offline por `notes/build_drift.mjs` → `notes/_build_drift.json`, `notes/contract_drift.mjs` → `notes/_contract_drift.json` e `notes/contract_context.mjs` → `notes/_contract_context.json`.

| Medida | Resultado |
|---|---|
| Chunks do site | 5.686 → 5.689; **5.626 idênticos**, **42 alterados**, 18 removidos, 21 adicionados |
| Nossos 246 bundles locais | **198 idênticos** + **32 alterados** + **16 removidos (re-empacotados)** = 246. Correção: o "1 sem correspondência" que eu havia contado (`home/page.e6f7b93173`) é o chunk `home/page` **alterado** (artefato de nome de arquivo), logo 31 + 1 = 32 |
| Os 16 removidos | 12 migraram integralmente para outros chunks (destinos em `_contract_drift.json`, ex.: `297147`→`394338`, `229704`→`602545`); 4 têm 1 módulo sem destino conhecido (`445075` 1 de 1, `450621` 1 de 198, `608542` 1 de 16, `691333` 1 de 514; `450621` migrou em sua maior parte para `745290` e `media-publish`, `691333` para `649969`). Módulo sem destino **não prova remoção de funcionalidade**: pode estar num chunk que não temos |
| Os 42 alterados | **Todos os 42 têm agora a versão nova local** (cache do Chrome ou download). 10 deles **não têm a versão antiga entre nossos 246 bundles**, então só se pode dizer o que contêm, não o que mudou (lista em §6) |
| Marcadores de contrato | **39** sondas (`notes/_drift_check.json`): **8** em chunk com hash idêntico; **28** inalterados após normalizar nomes minificados/ids (chunk re-empacotado ou renomeado); **2** com ocorrência alterada, ambas **fora do contrato de rede** (abaixo); **1** não localizado (`MiniMax-H3-trial`, dado de execução, nunca esteve em código) |
| SDK (`599038`, `889795`) | Comparação de esquemas: **333 endpoints sem adição, remoção ou alteração** (`notes/_sdk_drift_20261029.json`) |

As duas ocorrências alteradas:
1. `573081` (appId) em `450621`→`745290`: só mudou a string de versão embutida do SDK de comércio, `commerce@1.1860.76` → `commerce@1.1860.80`. O `appId` e o uso continuam iguais.
2. `audio_gen` em `616044` (Canvas, geração de áudio): a condição que habilita o botão mudou (antes, limites de contagem de referências `am.EG`/`am.TF`; agora `!a?.preparingReference`). A chamada de geração (`canvas_audio_generation`, `modelKind: Audio`, `durationSec`) continua igual. É regra de interface, não corpo de requisição.

> **Correção de um erro meu em versão anterior deste documento:** eu havia escrito que `297147`, `450621` e `691333` "não mudaram" e "34 de 38 marcadores". O correto é: foram **re-empacotados** (conteúdo dos módulos preservado, chunk com outro nome/hash), e são **39 sondas** classificadas acima. A classificação por id de módulo de `contract_drift.mjs` (que dava "21 ALTERADO") é um artefato do re-empacotamento e foi **superada** por `contract_context.mjs`, que compara o contexto do código ignorando nomes e ids.

**Lacuna declarada:** ausência de mudança nos marcadores **não** prova que o servidor se comporta igual; e para os 10 chunks sem versão antiga, não há base de comparação.

### Análise REA dos arquivos grandes
- `599038` e `Settings`: lidos e comparados (SDK e configurações).
- `889795` e `616044` (4 MB cada): o `analyze_javascript_application` do REA estourou 1.800.000 ms (`provider_timeout`); ficou apenas a evidência parcial `ev_ea4d6181…`. A comparação desses dois foi **estática** (literais de string, sondas, janelas de contexto), não semântica. Não foi repetida a mesma análise sem mudar parâmetros.

## 2. O que está concluído (estático, comprovado no código)

| Área | Documento | Código |
|---|---|---|
| Protocolo do agente (`submit_run`, `babi_param`, `client_extra`, `generate_mode`, `pre_activate_skills`, questionário) | `PIPPIT_AGENT_CONTRACT.md` | `app/lib/agent_contract.mjs` |
| Skills × agente × modelo declarado | idem §4 | `official_skills.json` |
| Avatar Video (catálogo, DSL, `script_segment`, TTS, exportação, tarefa inteligente) | `PIPPIT_AVATAR_SPEC.md`, `PIPPIT_AVATAR_CHUNKS.md` | `app/lib/avatar_contract.mjs` |
| Foto falante (3 etapas, fases 0–6, `pre_process_*`, TTS, benefício `cc_biz_talking_photo`, exportação) | `PIPPIT_TALKING_PHOTO.md` | `app/lib/talking_photo_contract.mjs` + página local |
| Exportação Omni | idem | `POST /lv/v1/render_task/create` com `smart_task_create_req` (provedor Omni, `smart_tool_type 20007`); `type = exportTaskType ?? 53`; `createExportTaskOmni` (`omni/create_task_web`) existe mas nenhum chunk local o chama |
| Provedor externo de Foto falante (lip-sync) | `LIPSYNC_PROVIDERS.md` | `src/providers.mjs`, `app/lib/talkingphoto.mjs`, `app/lib/jobs.mjs` |
| Publicação, Canvas, Style library, Skills, créditos | `PIPPIT_PUBLISHING_STRUCTURE.md`, `PIPPIT_FIDELITY_REVIEW_670.md`, `PIPPIT_REVERSE_MATRIX.md`, `FEATURE_INVENTORY.md` | app local |

## 3. Visual e paywall: captura passiva e decisão local

Capturas passivas (sem plano, sem assinatura, sem geração, sem alteração de conta; 125 créditos exibidos antes e depois): Home `captures/current_670/home_20261029.png` (`ev_db12e4d0…`) e loja de Skills `captures/current_670/skills_20261029.png` (`ev_a40cb054…`).

| Diferença provada no build novo | Situação local |
|---|---|
| Loja de Skills: card com a faixa do modelo; o card flutuante de hover foi removido | A faixa de modelo já existe localmente (`SKILL_MODELS`). Nada a corrigir |
| Home: carrossel/showcase mudou (chunks `565306`, `616044`, `HomePageV5`) | Apenas observado; sem divergência visual comprovada que justifique mexer |
| Paywall: subtítulo `web_m10n_paywall_subtitle_credits` ("Upgrade to get credits") nos tipos `subscribeGetCredits`/`upgradeGetCredits`; rastreio `vip_modal` | **Não alterei o app.** Só o texto padrão em inglês está no código; o texto em português não foi observado e o gatilho (créditos esgotados) não foi exercitado ao vivo. Inventar a tradução seria comportamento sem prova |

## 4. Residual que NÃO pode ser fechado sem custo, geração ou mudança na conta

Mantido como incerteza no REA (não é falha de análise):

| Incerteza (REA) | Por que não fecha | O que seria preciso |
|---|---|---|
| `unk_2463e9cb…` destino/corpo da exportação do Avatar (`create_tts_avatar_task`) | a exportação real exige créditos | autorização para observar uma exportação |
| `unk_791e5054…`, `unk_22c8f5af…` respostas reais/estados da Foto falante, crédito por segundo | só há análise estática | enviar uma foto real e exportar (créditos) |
| `unk_994e846c…` toolResp do questionário, texto em Agent mode, `conflict_key`, `sub_tool_id` 3D, modelo real por Skill | exigem executar o agente | uma execução paga em Agent mode |
| `unk_fdd6a509…` regra de cobrança do Avatar | uma única medida (5,88 s = 11 créditos) | editar o roteiro no drawer (altera a conta) |
| `unk_7414df5e…` "Edit more", legendas, favoritar | alteram dados da conta | autorização |
| `unk_9b0f0001…`, `unk_78af01bc…` Style library e efeitos do Canvas | alteram o projeto | projeto descartável + autorização |
| `unk_46c7855f…` ranking do catálogo / `mget_artist_item` | sem corpos de resposta sob REA | reabrir o drawer sob REA (passivo) |
| `unk_e4b75b1e…` (Omni) | análise feita; o REA não aceitou "resolvida" (erro de integridade) | — |
| `unk_66affa93…` deriva de build | agora comparada (§1); fica aberta pelos 10 chunks sem base antiga, pelos 2 arquivos de 4 MB sem análise semântica e por tudo que depende do servidor | observar o build antigo (não preservado) não é possível |
| Itens antigos (SSE ao vivo, estados de run, estorno de crédito, roteamento do servidor) | exigem execução/servidor | — |

## 5. Índice de evidências e bundles (preservados)

`captures/current_670/`: `rea_session_bundle_lote3`, `lote5`, `lote5b`, **`lote6`** (contrato do agente), **`lote7`** (3 chunks do drawer), **`lote8`** (13 dependências, Omni, 12 incertezas), **`lote9`** (182 MB; **não cabe no heap do REA para reimportar**), **`lote10`** (deriva de build, 2 MB) e **`lote11`** e **`lote12`** (68 MB cada, cumulativos do `lote10` + esta etapa; ver §8). IDs: `ev_4a258a38…`, `ev_deeae34d…`, `ev_c703e0fe…`/`ev_b60f7ca6…`, `ev_29c9e7c5…`, `ev_d2900180…`, `ev_db12e4d0…`, `ev_a40cb054…`, `ev_d14c3ccb…` (comparação do SDK), `ev_ea4d6181…` (parcial, 889795/616044).

Arquivos locais de apoio: `scripts/auth_bundles` (250), `scripts/cache_recovered` (16), `scripts/downloaded_omni` (3), `scripts/current_20261029` (build atual: 66 arquivos = 48 lidos do cache do Chrome + 18 baixados; inclui a versão nova dos 42 chunks alterados).

## 6. Inventário (diretriz permanente)

**Provado (código estático + captura):** contratos de §2; deriva de build e SDK (§1); estrutura da exportação Omni; que o appId 573081 e os endpoints do SDK (333) não mudaram.

**Parcialmente identificado:**
- `889795` e `616044`: comparação só estática (timeout do REA).
- Dez chunks alterados sem versão antiga preservada; o conteúdo novo é conhecido, a mudança não: `CanvasShare`, `asset-library-sdk-picker`, `activity-detail/(slug$)/page`, `home-page/page`, `364997`, `565447`, `$`, `replay/page`, `Replay`, `ActivityDetail`. Dois trazem marcadores de contrato: `asset-library-sdk-picker` (classificação de origem de `pre_activate_skills`: `pre_activate_skills_source`, que já existia em `53019`/`850206`/`975399`) e `565447` (modo **Áudio** da Home: handoff ao Canvas com `apply_home_generation_preset`, `generateMode "audio_gen"`, `creationMode "audio"`, `direct_benefit_unavailable`, criação de projeto; a string de rastreio "Home audio submission tracking" não existe nos bundles antigos). **Observação passiva da Home em 29/10 (`ev_416514ac…`): o modo Áudio da Home JÁ existia** (menu Agent: "Audio — Choose an audio model and generate directly", capturado em 22/10 em `home_dropdowns/probe.json`) e o app local já o tem (`Áudio` no seletor de modo, `audio_gen`/`pippit_audio_part_agent` em `agent_contract.mjs`). Logo `565447` é o código desse modo, **não** uma funcionalidade nova comprovada; o que não se sabe é se os presets/rastreio são novos. `home/page` (2.031 bytes): idêntico ao antigo, só mudou o hash do nome.
- Foto falante e Avatar: fluxo e contratos conhecidos, **respostas reais** não.

**Dependências não resolvidas:** corpo de `create_tts_avatar_task`; resposta de `pre_process_*`; `mget_artist_item`; destino de `createExportTaskOmni`.

**Inacessível sem custo/conta:** §4.

**Fluxos não observados:** geração real (agente, Avatar, Foto falante), exportação, aplicação de Style library, paywall por créditos esgotados, presets do modo Áudio da Home (corpo, custo).

**Contratos a investigar:** presets do modo Áudio da Home (`565447`); o 4º argumento (`label`) que o Canvas passa aos hooks `canvas_audio_generation` — nos dois builds; sem efeito de rede comprovado.

**Diferenças de versão:** §1.

## 7. Registro de downloads (autorizados em 29/10/2026; sem cookies, sem credenciais, sem redirecionamento)

Base: `https://sf16-web-login-neutral.capcutstatic.com/obj/capcut-web-login-static/ies/lvweb/platform-business_online/static/js/async/` + nome. 18 respostas HTTP 200 (`content-encoding: br`, `application/javascript`); 1 resposta 404 por erro meu de digitação do hash; 1 arquivo já existia. Logs brutos: `notes/_download_20261029.json`, `…b.json`, `…c.json`. Tamanho = bytes transferidos / bytes descomprimidos. Nenhum arquivo preservado foi rebaixado; nada foi sobrescrito.

| Arquivo | HTTP | Transferido | Descomprimido | SHA-256 | Obs. |
|---|---|---|---|---|---|
| Settings.82b161dbd1.js | 200 | 40717 | 168524 | `867a86466afdc59318f7fcb574a6ca4d8df174c0eafc3ce42108d02a70ad650e` |  |
| 599038.0ff5dc661b.js | 200 | 125276 | 456157 | `5733b052636a7af5aefa6bedddc2a0ced0b8671d6cd43f41a449035876ad662d` |  |
| 616044.97e91c7056.js | 200 | 1109099 | 4269012 | `ff298aa2da337c06a0d3ccf75d6734e3b53fcb50d10f87bd43007e9eada9b51f` |  |
| 889795.32938b46b8.js | 200 | 1080190 | 4163167 | `7bba3a46b5560f1f90231d9a15c30c245e6c0d6b77c64cd6abcfdf51415bba22` |  |
| AssetManagementMaterialV2.cea078addf.js | 200 | 23618 | 81848 | `1839f14e9289fdba0267fcdb0f2256f68e004d9c750e1694ba0a8963fab67e4c` |  |
| 428740.be0f71da8d.js | 200 | 8876 | 26338 | `42206e987b7f942c1eecce831711d1ac8da57ad30ec2baf16518be97e8d44648` |  |
| 509340.30b09d58ac.js | 200 | 8201 | 42611 | `61e355248de7fee10fe6b9f9ddaf79a4e9302e21a4153f349d9f914c237a3898` |  |
| 708215.5ae1e17e4d.js | 200 | 1075 | 2184 | `3db31be5a602915583f4b95be365336aa7c0135fe1b3b67d063ac20ce42461e4` |  |
| CanvasShare.a643396c1b.js | 200 | 8276 | 24443 | `b37d895efc752c84c3bd178bd8f62b5da3ab40d24890bf8e9b1cb7f3f8691771` |  |
| asset-library-sdk-picker.caf169df93.js | 200 | 11662 | 41308 | `94f1e41b9d7590cb7f08554518680502e854e817ea5db667cb03c26d2f31b961` |  |
| activity-detail/(slug$)/page.b1ff2caf1e.js | 200 | 469 | 914 | `d71cb8f56e0d88b56decbc14f3a592f6c742d4a028ec608851172b9f76b88344` |  |
| home-page/page.149c12e5ad.js | 200 | 1218 | 2046 | `53a4d0f619ed0038233923f40b7359cae1dc7c38f1690d275d3b0f9389bb5bc1` |  |
| 364997.338928e099.js | 200 | 6848 | 21544 | `e452ef2400a40eded69b75f666f895934daf3c49f87f49119880b9ee95626e6b` |  |
| home/page.5d9cc09adb.js | já existia | — | — | — |  |
| 565447.73fa5f1.js | 404 | 173 | 173 | `6678d7dc9f075fb83462303b4ec53b7d08d9e8a13515a3c4865ca908516ae229` | 404: erro meu de digitação do hash (refeito na linha seguinte), não é restrição de acesso |
| $.a4174b421f.js | 200 | 323 | 469 | `e7984f77fdb6ec33eece0302b41bae8ed23d9a35ec9462c142ee551a3dfa726c` |  |
| replay/page.0510768dea.js | 200 | 642 | 1293 | `ee64d3a24d797bf4f9e800279148140bed965a638c2684bfb3cb1cf53c7701d9` |  |
| Replay.ad0d3d4575.js | 200 | 404 | 695 | `b98fd4e68edefbadc6c220087f3cdb1a080a9e1a713715104573ebf3950af1c4` |  |
| ActivityDetail.630c23dfd9.js | 200 | 24908 | 92982 | `d364bd901989501017dd9ca7fd67d321aa03a991c306c1bb2d9965b10192c709` |  |
| 565447.73d43fa5f1.js | 200 | 13249 | 40994 | `5fe820d6794830163ddb3a66dca5dfb9c9b1c141c9c944adbd588ef7ad90d8c8` |  |

Os 4 JS pedidos (`599038`, `889795`, `Settings`, `616044`) estão na tabela; os demais foram baixados sob a diretriz de catalogar o que é acessível (3 chunks adicionados, `AssetManagementMaterialV2` e os 11 alterados sem cópia local).

## 8. Registro no REA e manifesto

- REA: a sessão do REA estava vazia; reimportei o `lote10` (2 MB; `lote9` não cabe no heap) e registrei duas incertezas novas: `unk_6b66468d…` (deriva de build reconciliada, com as lacunas) e `unk_95a29407…` (fluxo Home → áudio). A `unk_66affa93…` (texto antigo) continua aberta e foi **superada** pela `unk_6b66468d…`; não a editei para não arriscar o erro de integridade já visto. Bundle exportado: `captures/current_670/rea_session_bundle_lote11.json` (68 MB, 26 registros, 13 incertezas; contém o `lote10` + o novo). Depois da observação passiva da Home: `unk_95a29407…` passou a "investigating" (rev. 2, com `ev_416514ac…`) e exportei `captures/current_670/rea_session_bundle_lote12.json` (68 MB, 29 registros, 14 incertezas). Inspeção da Home salva em `captures/current_670/rea_inspect_home_audio_20261029.json` (a captura de texto do REA veio "não aprovada"; o texto visível foi lido por `notes/cdp_eval.mjs`, somente leitura). `lote6`–`lote10` preservados e não modificados.
- Manifesto SHA-256: `notes/build_manifest.py` → `MANIFEST_SHA256.csv` (regenerado em 29/10/2026 após estas alterações).

## 9. Próximas decisões (suas)

1. Um fluxo real pago (exportação de Avatar, Foto falante, execução do agente) fecharia a maior parte de §4; nada foi feito.
2. Home → Áudio: observada passivamente em 29/10 (navegação e leitura de texto; nada clicado, enviado ou gerado). O modo já existe no Pippit e no app local. Os presets só se conhecem abrindo o modo Áudio (interação de UI, sem gerar), o que depende de nova autorização.
3. Tradução do subtítulo de paywall: só com a observação do texto em português.
