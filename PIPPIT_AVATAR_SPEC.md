# Pippit — Avatares: especificação comprovável (consolidada em 23/10/2026)

Legenda de origem de cada afirmação: **[PW]** observação por Playwright (CDP) na sessão logada do usuário, somente leitura · **[REA]** Evidence do REA 6.7.0 (IDs reais abaixo) · **[EST]** análise estática dos 250 bundles recuperados (`scripts/auth_bundles`, `notes/auth_sdk_schemas.json`) · **[LOCAL]** implementação do PiperLine (não é o Pippit). Nada aqui foi inferido a partir de nomes de avatar.
Contexto da observação: conta Free, região **BR**, 22/10/2026; nenhuma exportação, favorito, edição ou geração foi executada no Pippit.

## 1. Evidências
| Item | Origem | Local |
|---|---|---|
| Drawer "Avatar video" aberto (texto, abas, filtros) | [REA] `ev_26b3398dc27420bcd8152ce67cd2327ae118d46ba0473e6ae19bd897d6148889` | `captures/current_670/avatar_drawer/rea_inspect_web_page.json`; bundle `rea_session_bundle_lote5.json` |
| Menu Link account / Story canvas | [REA] `ev_d2589bc2545db8209e77c5acff8499312bb38b9d75a1faa481631259ebdc6ed0`, `ev_36d6305dea3226c1b2c842eda52d1ab7d68b14991c7edffe47bad69a2060fb8e` | idem |
| Varredura dos 48 filtros + combinações (rede) | [PW] **sem Evidence REA** | `captures/current_670/avatar_filters2/sweep2.json`, `avatar_filters2b/sweep2.json`, `avatar_filters2_run.log` |
| Seleção de avatar (sem POST) | [PW] sem Evidence REA | `avatar_filters2/select_probe.json` |
| Payload de filtros do servidor (`digital_human_filter_config`) | [PW] corpo de resposta capturado | `captures/skills_670/use_avatar_loaded/skills_use_capture.json` |
| Nomes de campos do SDK / serviço da Foto falante | [EST] | `notes/auth_sdk_schemas.json`; `async__450621.76fe1df8ae.js` (módulo 466973) |
Incertezas registradas no REA: ver `notes/rea_unknowns.json` (IDs `unk_2463e9cb…`, `unk_791e5054…`, `unk_fdd6a509…`, `unk_46c7855f…`, `unk_9b0f0001…`).

## 2. Chamadas feitas pelo drawer (nesta ordem, ao abrir e ao filtrar) [PW]
| Endpoint | Corpo da requisição | Resposta (chaves observadas) |
|---|---|---|
| `POST /api/biz/v1/videogen/digital_human_filter_config` | `{}` | `{ret,errmsg,svr_time,log_id,data:{filter_config_list:[{config_name_starling_key, config_value, sub_config_list:[{config_name_starling_key, config_value, sub_config_list:null}]}]}}` |
| `POST /api/biz/v1/digital_human/get_item_list` (avatares do usuário) | `{"offset":0,"count":50,"action_type":73,"effect_type":60}` | `data:{has_more,next_offset,total_count,effect_item_list:[{common_attr:{id,effect_id,effect_type(=60),title,description,cover_url,create_time,extra(JSON em string),sub_type}, digital_human:{gender,tone_type,voice_type,low_version_voice,low_version_voice_type,request_id,cv_lab_key,face_shot,has_real_bg,preview_image}}]}` |
| `POST /api/biz/v1/videogen/recommend_digital_human_by_tag` | `{"cursor":0,"count":50,"region":"BR","req_id":"","dsl_filter_query":"<JSON em string, opcional>"}` | `data:{material_list:[{resource_id,source_platform:1,material_type:3,detail:null,extra:null}], next_cursor, has_more, req_id, extra_smart_recommend:{}}` — **só ids** |
| `POST /artist/v1/effect/mget_artist_item` | `{"id_list":[<resource_id>…]}` | `data:{effect_item_list:[{common_attr:{id,effect_id,effect_type(=58),source(=1),title,description(uuid),cover_url:{small,…},…}, …}]}` — nomes e capas dos ids |
Observações: (a) o app não usa o `digital_human/recommend_by_tag` do SDK, e sim a variante `videogen/…`; o SDK [EST] declara `RecommendDigitalHumanByTag(count, cursor, dsl_filter_query, ratio_list, region, req_id)` — **`ratio_list` nunca foi visto em uso**. (b) Chamar o endpoint fora do app (fetch simples) devolve `ret:"1014" "system busy"`: o app envia cabeçalhos assinados; nenhuma tentativa de forjá-los foi feita.

## 3. Filtros: taxonomia, DSL e semântica [PW]
- **Interface:** cada filtro é uma lista de **caixas de seleção** (multi-escolha) com "Reset (n)"; o botão passa a mostrar a(s) opção(ões) marcada(s).
- **Requisição:** `dsl_filter_query = {"op":"and","conds":[{"op":"must","field":"tag","conds":[<tag>…]}, …]}`.
  - **Dentro do mesmo campo → OU:** marcar Female e Male gerou uma única condição `conds:["gender/female","gender/male"]` e devolveu os **331** avatares (todos).
  - **Entre campos → E:** Female + Young gerou duas condições (`gender/female`, `age/young`) e devolveu **120**.
- **Tags** = `<config_value do pai>/<config_value da opção>` (do `filter_config_list`) — total e contagem completa no catálogo (331 avatares):
| Campo (UI) | Pai (tag) | Opção → tag (nº de avatares) |
|---|---|---|
| Gender | `gender` | Female → `gender/female` (183); Male → `gender/male` (148) |
| Age | `age` | Young (187); Mature (105); Elderly (16) |
| Figure | `body_shape` | Average → `average` (252); Large → `large_size` (22) |
| Name | `actor_name` | Thandi 10; Ahmed 9; Henry 8; Fatima 9; Grace 8; Amina 8; Omar 5; Charlotte 5; **Alex, Lelia, Riley, Carmen, Brian, Asha, Max = 0** (confirmado duas vezes) |
| Industry | `industry` | E-commerce → `e-comm` (179); Gaming (164); Finance (128); Education → `edu` (107) |
| Scene | `scene` | Living room → `indoor_living_room` 74; Bedroom → `in_the_bedroom` 39; Bathroom → `in_the_bathroom` 32; Outdoors → `outside` 47; Kitchen → `indoor_kitchen` 22; Inside car → `in_car` 24; Esports room → `e-sports_room` 25; Makeup table → `at_the_makeup_table` 11; Cloakroom → `in_the_cloakroom` 10; No background → `no_background_(green_screen_video)` **0**; Office → `in_the_office` 23; Solid color background → `solid_color_background` 9 |
| Pose | `body_gesture` | Sit upright 136; Stand facing forward → `standing_frontally` 95; Take selfies while sitting 46; Sit sideways → `sitting_sideways` 21; **"Take selfies while talking" → `taking_a_selfie_while_walking`** 12 (rótulo e tag divergem no original); Stand sideways 9 |
| Outfit style | `clothing_style` | Casual 240; Sporty 29; Formal 35; Traditional 8 |
- **Relação tags ↔ avatar:** a filtragem é **do servidor**; o cliente só recebe ids. Os metadados (tags por avatar) foram **reconstruídos medindo, para cada opção, o conjunto completo de ids devolvido** (paginado até `has_more=false`) e cruzando com `mget_artist_item`. Verificação cruzada: Female (183) + Male (148) = 331, sem interseção. Não há dado de gênero/idade/etc. no payload visível de `mget_artist_item` além do `title`.

## 4. Paginação [PW]
`count=50`, `cursor` numérico; resposta traz `next_cursor` (50, 100, …) e `has_more`. O grid carrega a próxima página ao **rolar**. Observado: Female = 4 páginas, Male = 3; catálogo completo = 331 ids (≈7 páginas de 50, derivado). `req_id` volta vazio/ecoa; semântica desconhecida.

## 5. Seleção, favoritos, prévia [PW]
- **Selecionar** um tile: **nenhuma chamada POST**; só troca a prévia em vídeo; o custo exibido não muda (observado). A conta não é alterada.
- **Favoritar:** ao passar o mouse aparece um ícone `icon-fav` e um botão primário no tile; **o clique não foi executado** (alteraria a conta). Aba Favorites vazia: "No favorite avatar yet / Bookmark your favorite avatars to see them here."
- **My avatars:** "Create your own avatars with photos or videos", "Create now", entrada "AI talking photo" (abre `/ai-talking-photo?tab_name=…&enter_from=create_ai_talking_photo` em nova aba [EST async__240450]) e os avatares do usuário (`get_item_list`).
- **Edit script:** "Show as captions" (switch ligado), roteiro padrão editável (Edit → Cancel/Save), 31 idiomas, "Change caption style" (efeito não observado). "Edit more": destino desconhecido.

## 6. Custos [PW/REA]
Observado **uma vez**: roteiro padrão (5,88 s) → "11" com "23" riscado e tooltip "5.88 second = 11 credits". **Não existe regra de cobrança conhecida** (nem por segundo, nem por avatar/idioma/legendas/plano).

## 7. Exportação e Foto falante (contratos estáticos) [EST]
- **Export do avatar:** `POST /api/biz/v1/editor/create_tts_avatar_task` com campos `digital_human_id, digital_human_type, draft_sub_type, is_lip_sync, lip_sync_video, no_digital_human, render_task_id, storyboard_id, storyboard_number, time_range, tts_avatar_info_list, tts_avatar_type, tts_global_options, user_info, vimo_id` e `POST /api/biz/v1/editor/query_tts_avatar_task {task_id}`. O aviso do drawer ("Accurate lip-sync will be available after export") combina com `is_lip_sync`, mas **a ligação do botão a essas chamadas não foi observada** e a estrutura interna dos campos é desconhecida (chunks do drawer `avatar-based-generator`, `digital-human-managers`, `bundle_avatar-editor-service` não foram recuperados).
- **Foto falante:** serviço `ai-talking-photo-data-service` (módulo 466973 de `async__450621`): `processImageWithVoice/WithoutVoice → POST /api/biz/v1/digital_human/ai_talking_photo/pre_process_image`; `processTTSAudioWithMerge / processTTSAudioCheckText / processTTSAudioWithoutMerge / processUploadedAudio → POST …/pre_process_audio`; `tryOmniTask → POST /api/biz/v1/omni/try_task`; token de upload ImageX `{key_version:"v5", biz:"replicate_v5"}`. Sequência deduzida do serviço: imagem → áudio (TTS com checagem de texto/merge, ou áudio enviado) → `try_task`. **Corpos e respostas: desconhecidos** (componente da página Omni não recuperado).
- **Skills de avatar:** `kind` = `ai_talking_photo`/`avatar_video` ativam a feature (`activationPort.execute({feature, skill, type})`, `openFeature`) em vez de preencher o compositor [EST async__218907, async__787640]; um filtro (`B`, rotulado `p:"pippit_marketing_agent"`) exclui `novel, canvas, ai_talking_photo, avatar_video, smart_long_video` [EST async__24986] — leitura provável: skills desses tipos não aparecem na lista do agente de marketing (coerente com a lista observada); o vínculo exato não foi provado.

## 8. O que ainda é desconhecido
Contrato de exportação (corpo aninhado, estados, custo) · corpos da Foto falante · ordem/ranking do `recommend` e papel de `req_id`, `extra_smart_recommend`, `ratio_list`, `get_fixed_position` · como as tags são atribuídas · campos de voz/idioma por avatar · efeito de favoritar · "Edit more" e "Change caption style" · limites do roteiro.

## 9. Implementação local (PiperLine) × observado
| Aspecto | Pippit | PiperLine |
|---|---|---|
| Lista e filtros | servidor, por tags | **cliente**, sobre `app/lib/avatar_catalog.json` (331 avatares × tags medidas; OU no campo, E entre campos; 50 por página). **Funciona de verdade** para as 48 opções; é um espelho do estado de 22/10/2026 (não acompanha mudanças do catálogo) |
| Seleção | sem POST | só estado do drawer; **nenhum vídeo é gerado** |
| Favoritos | ação real desconhecida | `/api/avatar-favorites` (persistência local **inferida**) |
| Custo | só 1 observação | mostra "11 (23)" **apenas** para o roteiro padrão; "–" nos demais |
| Exportar | cria tarefa (contrato desconhecido) | **bloqueado**: "sem provedor local; nada debitado" — apenas interface |
| Foto falante | pre_process + try_task (IA) | prévia local foto + voz SAPI (MP4), **sem animação labial**; extensão não observada |
Arquivos: `local_reconstruction/app/lib/avatar_catalog.json`, `avatar_drawer_data.json`, `app/public/app.js` (`avatarDrawer`, `pageTalkingPhoto`), rotas `/api/avatar-drawer`, `/api/avatar-favorites`, `/api/talking-photo/*`; geradores `notes/avatar_filter_sweep2.mjs`, `notes/build_avatar_catalog.mjs`. Testes: `fidelity2_ui`, `fidelity3_ui`.
