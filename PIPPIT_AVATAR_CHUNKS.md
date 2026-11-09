# PIPPIT_AVATAR_CHUNKS — os 3 chunks do drawer de Avatar Video

Data: 27/10/2026. **Nenhum download de rede foi feito.** Os três chunks (e 13 dependências) já estavam no **cache HTTP do Chrome do perfil do Pippit** (`C:\w\rea_chrome_profile\Default\Cache\Cache_Data`, gravados em 22/10/2026 quando o drawer foi aberto). Foram lidos localmente por `notes/extract_chrome_cache_chunks.mjs` (somente leitura; `Content-Length` do cabeçalho = bytes do corpo nos 16 casos) e salvos em `scripts/cache_recovered/`. Metadados: `notes/_cache_chunks.json`. REA: na primeira tentativa o servidor `rea` (Windows) estava desconectado (o `rea-linux` não enxerga arquivos do Windows). Com o `rea` de volta, `analyze_javascript_application` (3 chunks, `record-and-continue`) gerou o Evidence **`ev_4a258a38…`** (resumo; pai `ev_deeae34d…`): 3 arquivos JS, 11 módulos, 0 falhas de parse, **0 relações de request** (fetch/WebSocket) — coerente com as chamadas de API passarem pelo SDK. A incerteza `unk_2463e9cb…` (exportação do avatar) passou a `investigating` (rev. 2). Bundle: `captures/current_670/rea_session_bundle_lote7.json`. As 13 dependências ficaram fora desta análise do REA; o restante usou os scripts de `notes/` (`bundle_ctx.mjs`, `module_resolution.mjs`, `chunk_info.mjs`, `cache_probe.mjs`).

Origem comum: `https://sf16-web-login-neutral.capcutstatic.com/obj/capcut-web-login-static/ies/lvweb/platform-business_online/static/js/async/<nome>.<hash>.js` (`publicPath` do `runtime.e9428809bf.js`; nome/hash do mapa `i.u`; IDs do `route-manifest-main`).

| Arquivo | Tamanho (cache = transferido, `br`) → descompactado | Evidência da finalidade (código lido) | Funcionalidades relacionadas | Ainda desconhecido | Benefício de analisar |
|---|---|---|---|---|---|
| `bundle_avatar-editor-service.76367e03ff.js` (chunk 283684; última modificação 09/10/2026) | **2.385 B → 6.644 B** | Lido por inteiro. Módulo 819351 `AvatarEditorService`: `openAvatarEditor(opts, extra)`, `openAvatarEditorByDraftId(draftId, extra)`, `preload()` (28 chunks + módulo 806908 `preloadVeResources`), `_initializeDigitalHumanFilterManager` (chunks 280000+711343 → módulo 710339 `createDigitalHumanFilterManager(container, categoryId, {tabName, editType:"ai_character", currentPage:"avatar_editor"}, true)` e `filterDigitalHuman()`), `_loadAvatarBasedGeneratorFlow` (31 chunks → módulo 629281 `AvatarBasedGeneratorFlow`), checagens de memória/suporte do editor (módulo 753339), trava (mutex), render em `#avatar-editor-root`, auto-abrir por `?open_avatar_editor=`, voltar à Home ao fechar, pré-carregar as 14 primeiras capas (`bigPicture`). **Categoria do catálogo de avatares: `"88320131"`, ou `"1043788868"` quando um teste A/B está ativo.** Carregado por `async__450621` (classe `pT`: `import(283684)`→819351); acionado por HomePageV5 (`{tabName:"home", entranceFrom}`), AvatarAndVoice (`entranceFrom:"video_avatar"` + `{filter:"All"|"MyAvatar", digitalHumanId, needFetchDigitalHuman}`), Skill Use (787640) e AssetManagementMaterialV2 (`openAvatarEditorByDraftId(key,{tabName:"cloud"})`) | Abertura do drawer, catálogo/filtros (orquestração), rascunho existente | **Não faz chamadas de API.** Decisão do A/B (módulo 660622) | Já extraído. Dá o ponto de entrada, os parâmetros de abertura e o ID de categoria que faltava na spec (não consta em `PIPPIT_AVATAR_SPEC.md`) |
| `digital-human-managers.e6d5c9f2cb.js` (chunk 711343; última modificação 20/09/2026) | **678 B → 1.424 B** | Lido por inteiro: só a classe `DevReporter` (módulo 538400, `reportDevEvent` + `console.log`) e 3 helpers lodash (22290, 966157, 20018). **Não contém os gerenciadores.** Os gerenciadores (`createDigitalHumanFilterManager`, `createCustomizeDigitalHumanManager`, `createFavoriteDigitalHumanManager`, `createPanelDigitalHumanManager`, módulo 710339; estado com `filters2DigitalHumanListMap`, `queryToken`, `ownerFilter`; `getDigitalHumanList({...,category, appID:573081})`) estão no chunk **280000**, que já era local (`async__280000.f57b818571.js`) | Telemetria de desenvolvimento apenas | — | Nenhum: esse chunk não tem lógica de produto. O que interessa (filtros, paginação, favoritos) já está no 280000 e ainda **não foi lido a fundo** |
| `avatar-based-generator.d1db384db7.js` (chunk 300527; última modificação 20/09/2026) | **44.016 B → 204.951 B** | Um módulo de 195 KB (629281 `AvatarBasedGeneratorFlow`) + 2 pequenos. Código lido por busca: rascunho (`createDraft`, `DraftSaveManager`, `renderDraft`, `updateDraft`), segmentação do roteiro (`scriptSegmentService.scriptSegment({script})` → `segmentedScript`), voz: `createTtsTask(segmentedScript, {speakerId: toneSpeaker‖toneType, voiceName, effectName, effectId, resourceId, tonePlatform, volume}, previewVideo)`, `_fetchPreviewVideo`, `fetchTtsVoice` (voz da plataforma ou clone via `_cloneVoiceDataService`/`_toneDataService`; recursos `type:"tone"`/`"digital-human"`, `source:1`, `appId:573081` sob A/B), `DigitalHumanTtsUploader`, e **exportação** `startExportProcessByDataSdkWithOmni({draftId, packageId, fileNamePrefix, videoMeta:{editType:"ai_talking_photo", currentEditType:"light_editor"}, exportTaskType:0, …})` com `scriptInfo` = JSON do roteiro + pausas `<break time="Nms" />` → `{rank, duration}`; telemetria `editType:"ai_character"`; flag `enable_ai_talking_photo_with_export` | Avatar Video: seleção de avatar e voz, roteiro com pausas, prévia, exportação; reaproveita o pipeline de exportação "Omni" | Chamada exata a `create_tts_avatar_task`/`query_tts_avatar_task` (nenhum chunk local cita o método por nome; passa por serviços genéricos de exportação em `async__450621`); corpo/resposta; estados e custo; onde nasce o lip-sync (a palavra não aparece neste chunk; só `TaskType.LipSync=26` no chunk 815009); API do `scriptSegment` e do preview | **Alto.** Dos 297 módulos que ele importa, **292 já resolvem nos bundles locais** (só 2 IDs sem definição: 629019, 10008, provavelmente constantes). Permite reconstruir o fluxo do drawer (roteiro→voz→prévia→exportar) com campos reais |

## Dependências (todas também no cache local e já extraídas)

13 chunks listados no `route-manifest` para o `avatar-based-generator`: 827585, 668795, 321089, 815009 (378.797 B → 1,86 MB, motor de edição), 32306, 802702, 988390, 892877, 545639, 828557, 650725, 989157, 907969 — soma dos 16 arquivos: **815.994 B transferidos → 3.722.432 B descompactados**. O ID 76588 não tem hash (não é arquivo JS). Antes disso, 134 dos módulos do gerador estavam sem definição local; com elas, restam 2.

## O que isso muda nas lacunas

- **Avatar Video / seleção de avatar e voz / exportação:** recuperáveis do que já está local (`scripts/cache_recovered/`). Ainda falta ler a fundo o módulo 629281 e o 280000.
- **Lip-sync:** não está implementado no cliente; a UI avisa que a sincronização precisa vem após exportar, coerente com `is_lip_sync`/`lip_sync_video` do corpo de `create_tts_avatar_task`. Isso é inferência: o corpo real continua desconhecido.
- **Foto falante, etapas 2 e 3: NÃO estão nestes 3 chunks** (o gerador só usa `ai_talking_photo` como `editType` na exportação). A página é o chunk **`Omni`** (693197) mais 30538 e 549630; os três **não** estão em `scripts/` e, ao contrário do que eu havia escrito antes, **também não estão recuperáveis do cache do Chrome** (entradas expulsas; ver a correção abaixo). `customize-photo-digital-human` (294361) e `text-to-speech` (287384) **não** estão no cache.

## CORREÇÃO (27/10/2026): a página Omni NÃO está no cache

Eu havia dito que os chunks da página `Omni` (693197 `Omni.22227907e5.js`, 30538 `30538.9543fa0369.js`, 549630 `549630.cc8177d2bb.js`) estavam no cache do Chrome. **Estava errado**: o índice (`data_1`) tem só as *chaves*; as 3 entradas estão com estado **evicted** (expulsas), tamanhos 0 e endereços 0. Não há cópia em `local_chrome_profile` nem em `scripts/`. As 16 entradas do drawer (3 + 13) estavam com estado normal. A incerteza foi registrada no REA: `unk_e4b75b1e…` (relacionada a `unk_791e5054…`). **Consequência:** as etapas 2 e 3 da Foto falante continuam sem componente, estados, corpos ou regras. Obter esses 3 arquivos exige download de rede (público, estático), que **depende de autorização**.

## As 13 dependências do drawer (REA: `ev_c703e0fe…`, pai `ev_b60f7ca6…`; 828557 também em `ev_5dcd7d89…`/`ev_ef4d08f4…`)

Análise REA dos 13 arquivos: 13 JS lidos, 469 módulos, 0 falhas de parse, 0 relações de request (fetch/WebSocket). O grafo semântico ficou parcial (limite de orçamento do REA; fatos estáticos e de módulos foram retidos). Os 9.282/20.469 "pontos sem resolução" são limitações do grafo, não erros individuais. Função = inferida de exports, palavras-chave e uso pelo gerador (módulos do gerador que resolvem em cada arquivo).

| Chunk | Cache → descompactado | Módulos (usados pelo gerador) | Papel (evidência) | Classe |
|---|---|---|---|---|
| `828557.fc7ea3772e` | 149.477 → 692.410 B | 89 (**74**) | Núcleo do editor/avatar: exporta `DigitalHumanCreator`, `DigitalHumanTtsUploader`, `CurrentVoiceStore`, `ExportManager`, `ExportReportManager`, `ExportHelperCreator`, `DraftSaveManager`, `DraftInfoQueryUtils`, `CloudMetaManager`, `RegenerateManager`, `VideoEditorLauncher`… Contém os endpoints abaixo | **Essencial** |
| `802702.66a1fa3257` | 92.125 → 381.000 B | 195 (14) | Camada de dados do editor (`dataSdk`: `recoveryDraft`, `updateDataVersion`, `onChangeDiff`; `api.invokeBatch/undoRedo/text/template`) | **Essencial** |
| `815009.615e76d780` | 378.797 → 1.855.926 B | 14 (1) | Modelo de dados do rascunho (tipos `AdDraft*`, enums de ação; `TaskType.LipSync=26`, `AIExpressionDriven=33`, `AIMotionDriven=34`) | **Essencial** (tipos) |
| `892877.612b19584d` | 22.663 → 85.051 B | 51 (16) | Exportação e relatório (`export`/`report`; `dataSdk.getDraftStr`) | **Essencial** |
| `988390.b2e3f39879` | 23.411 → 90.362 B | 14 (6) | Operações do rascunho com humano digital (`dataSdk.api.track/template/audio/video/text`) | **Essencial** |
| `907969.65b04ec890` | 7.384 → 26.568 B | 7 (5) | TTS + legendas no rascunho (`TtsGenerating`/`TtsUploading`, erros `web_tts_*`) | **Essencial** |
| `989157.f320e0cb24` | 2.526 → 7.695 B | 6 (6) | Auxiliar de legendas (`api.invokeBatch`) | Auxiliar usado |
| `650725.784d4f7220` | 2.218 → 6.336 B | 4 (4) | Endpoints de roteiro: `script_list`, `text_rewrite`, `query_visible_main_title`, `detect_language`, `translate_text` | **Essencial** (roteiro) |
| `321089.a78c3d94d9` | 59.139 → 258.605 B | 61 (3) | Componentes de Canvas/ícones (UI) | Auxiliar |
| `545639.62761070e0` | 13.970 → 52.409 B | 9 (1) | Player/clipe de vídeo (UI) | Auxiliar |
| `32306.db26445510` | 5.602 → 22.399 B | 6 (2) | Player (WebGL) | Auxiliar |
| `827585.67228d32b2` | 8.592 → 19.666 B | 2 (0) | Sem palavra-chave reconhecível; biblioteca compartilhada | Auxiliar (função não identificada) |
| `668795.00a94e3cbf` | 3.011 → 10.986 B | 9 (0) | Utilitários de DOM (`querySelectorAll`) | Auxiliar |

## Caminho das chamadas (Etapa 3): componente → função → SDK → endpoint → resposta → UI

Todos os pares abaixo foram lidos no código; o que não pôde ser provado está marcado. O cliente de rede é injetado (`networkClient.post`), por isso o REA não vê `fetch`. Resposta padrão: `ret === "0"` é sucesso, senão erro `{ret, errmsg}`.

1. **Abertura:** HomePageV5 / AvatarAndVoice / Skill Use / Assets → `AvatarEditorService.openAvatarEditor(opts, {filter, digitalHumanId, needFetchDigitalHuman})` (chunk `bundle_avatar-editor-service`) → carrega as dependências e o `AvatarBasedGeneratorFlow`.
2. **Catálogo:** `createDigitalHumanFilterManager` (chunk 280000, módulo 710339) → `filterDigitalHuman()` → repositório (`async__973395`) → `POST /api/biz/v1/videogen/recommend_digital_human_by_tag` com `{dslFilterQuery, reqId, cursor, count (50), region}` → `data.{materialList[{resourceId}], nextCursor, hasMore, reqId}` → ids → loja `filters2DigitalHumanListMap` + `queryToken` (paginação) → grade. Filtro sem recomendação: `POST /api/biz/v1/videogen/search_platform_material` com `source:6`, `cursor` string e `categoryId`. Opções de filtro: `POST /api/biz/v1/videogen/digital_human_filter_config` → `data.filterConfigList[{configValue, configNameStarlingKey, subConfigList[…]}]`. A DSL é `{op:"and", conds:[{op:"must", field:"tag", conds:["<grupo>/<valor>"]}]}`. *Os detalhes dos avatares vêm de outra chamada (`mget_artist_item`, só observada).*
3. **Roteiro:** `scriptSegmentService.scriptSegment({script})` (módulo 636979 no 828557) → `POST /api/biz/v1/videogen/script_segment` com `{script, segmentSymbols}` (as pausas `<break time="Nms" />`) → `segmentedScript`. Roteiro/tradução: endpoints do chunk 650725.
4. **Voz/TTS:** `createTtsTask(segmentedScript, {speakerId, voiceName, effectName, effectId, resourceId, tonePlatform, volume}, previewVideo)` → `generate-tts-data-service` (token em `async__973395`). **Destino da requisição NÃO provado** (a implementação do serviço não foi achada). Troca de voz de áudio: `POST {web_domain}/lv/v2/intelligence/create|query` com `smart_tool_type: 40`.
5. **Tarefas inteligentes genéricas:** `POST {web_domain}/lv/v1/intelligence/create` (`{...params, app_id:348188, submit_id:"<ts>_<random>"}`, cabeçalho `x-commerce-v2: 1`) e `/query` (`{task_id, workspace_id, tmp_id, smart_tool_type, history_id}`), com polling: sucesso quando `status ∈ {1,2}`, `speed = 100` e `task_detail[0].md5` (logado); progresso limitado a 99; falha após 10 erros seguidos ou código 204402. Resultado: `task_detail[{md5, resource_id, resource_name, transcode_video_infos[…], transcode_audio_info[…]}]`.
6. **Legendas:** `POST /api/biz/v1/videogen/recommend_subtitle_template` com `{count, cursor, reqId, productInput, script}` → `subtitle_template_list`, `has_more`, `req_id`. Detecção de objeto em imagem: `POST /api/biz/v1/omni/image_object_detect`.
7. **Exportação:** botão → `startExportProcessByDataSdkWithOmni({draftId, packageId, fileNamePrefix, videoMeta:{editType:"ai_talking_photo", currentEditType:"light_editor"}, exportTaskType:0, …})` (`async__450621`) → `ExportManager.createExportTask` (828557) com o provedor de parâmetros Omni. **Qual endpoint recebe a exportação (`create_tts_avatar_task` ou outro) NÃO foi provado**: nenhum chunk local cita o método pelo nome.

Evidência REA do endpoint literal: `ev_4534d82a…` (visão `javascript-facts`) confirma, com fonte exata no 828557 (linha 4, col. 399417), o literal `/api/biz/v1/videogen/recommend_subtitle_template`. Os demais caminhos desta seção foram lidos por busca textual no mesmo arquivo (offsets em `PIPPIT_AVATAR_CHUNKS.md`/`CLAUDE.md`), pois o grafo semântico do 828557 não foi gerado pelo REA (limite de orçamento).

## Implementado no PiperLine

`local_reconstruction/app/lib/avatar_contract.mjs` (+ teste `avatar_contract`): DSL e corpos do catálogo, `script_segment`, `scriptInfo`, protocolo de tarefa inteligente e troca de voz. Funções puras; nada é enviado ao Pippit.

## Participação das 13 dependências nos fluxos (módulos que cada página usa de cada arquivo)

Resolução offline (`notes/module_resolution.mjs`, resultados em `notes/_module_resolution_generator.json` e `_omni.json`): o gerador do drawer resolve 292/297 módulos e a página Omni 266/276 (os 2 IDs sem definição, 629019 e 10008, são literais numéricos, p.ex. o id da tarefa de onboarding 10008). Nada precisa ser baixado de novo.

| Dependência | Gerador (Avatar) | Omni (Foto falante) | Papel |
|---|---|---|---|
| 828557 | 74 | 13 | Essencial: TTS, `script_segment`, exportação, rascunho |
| 802702 | 14 | 2 | Essencial: camada de dados do editor |
| 907969 | 5 | 5 | Essencial: TTS/legendas e **provedor de parâmetros Omni (módulo 91321)** |
| 988390 | 6 | 2 | Essencial: operações do rascunho com humano digital |
| 892877 | 16 | 1 | Essencial: exportação/relatório |
| 321089 | 3 | 2 | Auxiliar (UI) |
| 545639 | 1 | 3 | Auxiliar (player) |
| 815009 | 1 | 1 | Essencial só para tipos/enums do rascunho |
| 989157 | 6 | 0 | Auxiliar (legendas) |
| 650725 | 4 | 0 | Roteiro (só Avatar) |
| 32306 | 2 | 0 | Auxiliar (player) |
| 827585, 668795 | 0 | 0 | Sem uso direto pelas duas páginas (carregados como pré-requisito) |

## Omni baixada (27/10/2026, com autorização expressa)

Os 3 arquivos da página Omni foram baixados (3 requisições HTTP 200, sem credenciais) para `scripts/downloaded_omni/`: `Omni.22227907e5.js` (48.188 B → 202.780 B), `30538.9543fa0369.js` (8.294 → 56.359 B) e `549630.cc8177d2bb.js` (1.473 → 2.950 B); URLs, cabeçalhos e sha256 em `notes/_omni_download.json`. REA: `ev_29c9e7c5…` (3 arquivos, 50 módulos, 0 falhas de parse). Conteúdo e contratos: **`PIPPIT_TALKING_PHOTO.md`**. Resumo: só o `Omni` tem a lógica (etapas, fases 0–6, abas roteiro/áudio, gesto, exportação, créditos); `30538` é biblioteca de UI e `549630` são auxiliares de foto/proporção. Nenhum dos três cita `create_tts_avatar_task`: esse destino segue não provado.
