# Catálogo de endpoints do app autenticado do Pippit (extração estática)

Fonte: 250 bundles `…/lvweb/platform-business_online/static/js/` baixados em 21/10/2026 (`scripts/auth_bundles/`, `notes/auth_bundles_log.tsv`). Método: literais de caminho nos bundles (`notes/auth_api_paths.txt`), método HTTP inferido pelo código que precede o literal (`notes/extract_api_calls.py` → `notes/auth_api_calls.json`) e nomes de chaves das tabelas de endpoints (ex.: `characterGenerateQuery:"/api/biz/v1/character/generate/query"`).

**Confiança:** pistas estáticas, NÃO prova de funcionamento. Método = POST/GET quando o código ao lado o declara (407 de 645; vazio = não inferido). Corpo/resposta só onde há captura (`captures/auth/`). Envelope de resposta observado no cliente: `{ret:"0", errmsg, logId, data}` — `ret != "0"` vira erro com `errmsg`/`logId`.

Cliente: classes com `this._networkClient.post(path, body)`; chamadas do agente passam `babi_param` (derivado de `runExtra`) como query string em `/api/biz/v1/agent/submit_run`.


## api/biz/v1  (403)

- `?` `/api/biz/v1` ×3 — chave: baseURL
- `?` `/api/biz/v1/3d_director_platform/list_assets` ×2
- `POST` `/api/biz/v1/3d_director_platform/upload_file` ×3
- `POST` `/api/biz/v1/agent/cancel_run` ×3
- `POST` `/api/biz/v1/agent/change_thread_business_info` ×2
- `?` `/api/biz/v1/agent/clone_novel_project` ×2 — chave: cloneNovelProject
- `POST` `/api/biz/v1/agent/clone_thread` ×2
- `POST` `/api/biz/v1/agent/common/download_with_pay` ×2
- `POST` `/api/biz/v1/agent/create_creative_project` ×3 — chave: createCreativeProject
- `?` `/api/biz/v1/agent/create_creative_project_canvas` ×1
- `POST` `/api/biz/v1/agent/delete_thread` ×3
- `?` `/api/biz/v1/agent/download_with_pay` ×2
- `POST` `/api/biz/v1/agent/get_app_agent_setting` ×2
- `POST` `/api/biz/v1/agent/get_available_model_list` ×3 — chave: url
- `POST` `/api/biz/v1/agent/get_image_agent_setting` ×3
- `POST` `/api/biz/v1/agent/get_run` ×3
- `POST` `/api/biz/v1/agent/get_run_artifact` ×2
- `POST` `/api/biz/v1/agent/get_showcase_run_artifact` ×2
- `POST` `/api/biz/v1/agent/get_state` ×1
- `POST` `/api/biz/v1/agent/get_thread` ×5
- `POST` `/api/biz/v1/agent/get_thread_share` ×2
- `POST` `/api/biz/v1/agent/get_thread_share_id` ×3
- `POST` `/api/biz/v1/agent/get_user_queue_info` ×3 — chave: GET_USER_QUEUE_INFO
- `POST` `/api/biz/v1/agent/get_web_agent_setting` ×2
- `?` `/api/biz/v1/agent/init_canvas_asset_from_outer` ×1 — chave: initCanvasAssetFromOuter
- `POST` `/api/biz/v1/agent/list_creative_project` ×3 — chave: getCreativeProjectList
- `POST` `/api/biz/v1/agent/list_project_file` ×1
- `POST` `/api/biz/v1/agent/list_showcase` ×3 — chave: ListShowcase
- `POST` `/api/biz/v1/agent/list_thread_file` ×3
- `POST` `/api/biz/v1/agent/list_user_history` ×4
- `POST` `/api/biz/v1/agent/list_web_agent_sug` ×1
- `?` `/api/biz/v1/agent/novel/ai_script_reset_snapshot` ×1
- `?` `/api/biz/v1/agent/novel/delete_episode` ×2 — chave: deleteEpisode
- `?` `/api/biz/v1/agent/novel/erase_video_subtitle_for_novel_agent` ×2 — chave: eraseVideoSubtitleForNovelAgent
- `POST` `/api/biz/v1/agent/novel/generate_images` ×3 — chave: ImagesGenerate
- `?` `/api/biz/v1/agent/novel/generate_new_episode` ×2 — chave: generateEpisode
- `?` `/api/biz/v1/agent/novel/generate_new_story_board` ×1
- `?` `/api/biz/v1/agent/novel/generate_role_audio` ×1
- `?` `/api/biz/v1/agent/novel/get_dialogue_limit_free_info` ×1
- `POST` `/api/biz/v1/agent/novel/get_user_contract` ×3 — chave: GetUserContract
- `POST` `/api/biz/v1/agent/novel/novel_script_save` ×2
- `POST` `/api/biz/v1/agent/novel/set_user_contract` ×3 — chave: SetUserContract
- `?` `/api/biz/v1/agent/novel/update_ai_script_asset` ×2 — chave: updateAiScriptAsset
- `?` `/api/biz/v1/agent/novel/update_episode_video_list` ×2 — chave: updateEpisodeVideoList
- `?` `/api/biz/v1/agent/novel/update_novel_settings` ×2 — chave: updateNovelSettings
- `?` `/api/biz/v1/agent/novel/update_script_content` ×2 — chave: updateScriptContent
- `?` `/api/biz/v1/agent/novel_style/delete` ×1 — chave: deleteStyle
- `?` `/api/biz/v1/agent/novel_style/list` ×1 — chave: novelStyleList
- `?` `/api/biz/v1/agent/novel_style/resolve_snapshot` ×1 — chave: resolveStyleSnapshot
- `?` `/api/biz/v1/agent/novel_style/update` ×1 — chave: updateStyle
- `?` `/api/biz/v1/agent/novel_style_list` ×2 — chave: webNovelStyleList
- `POST` `/api/biz/v1/agent/pull_sandbox_session` ×2
- `POST` `/api/biz/v1/agent/query_sandbox_session_status` ×2
- `POST` `/api/biz/v1/agent/rewrite_prompt` ×3 — chave: url
- `POST` `/api/biz/v1/agent/speed_up_run_task` ×3 — chave: SET_SPEED_UP_RUN_TASK
- `POST` `/api/biz/v1/agent/speed_up_run_task_to_vip_channel` ×1
- `POST` `/api/biz/v1/agent/submit_run` ×4
- `POST` `/api/biz/v1/agent/subscribe_run` ×3
- `POST` `/api/biz/v1/agent/subscribe_thread` ×2
- `POST` `/api/biz/v1/agent/thread_mark_visible` ×3
- `POST` `/api/biz/v1/agent/update_creative_project` ×3 — chave: updateCreativeProject
- `POST` `/api/biz/v1/agent/update_run_artifact` ×2
- `POST` `/api/biz/v1/agent/update_state` ×1
- `POST` `/api/biz/v1/agent/update_thread` ×3
- `POST` `/api/biz/v1/agent/update_thread_file` ×4
- `POST` `/api/biz/v1/agent/user_action` ×3
- `POST` `/api/biz/v1/agent/user_subscribe_callback` ×3 — chave: USER_SUBSCRIBE_CALLBACK
- `POST` `/api/biz/v1/agent/video/mget_showcase_asset_info` ×3 — chave: mgetShowcaseAssetInfo
- `POST` `/api/biz/v1/agent/video/ref_image_generate` ×1
- `POST` `/api/biz/v1/agent/video/storyboard_21_modify` ×2 — chave: StoryBoard21ModifyWeb
- `POST` `/api/biz/v1/agent/video/storyboard_21_save` ×2 — chave: StoryBoardSave21Web
- `POST` `/api/biz/v1/agent/video/storyboard_modify` ×1
- `POST` `/api/biz/v1/agent/video/storyboard_save` ×1
- `POST` `/api/biz/v1/agent/video/upload_file` ×2
- `POST` `/api/biz/v1/agent/video/video_state_21_save` ×1
- `POST` `/api/biz/v1/agent/video/video_state_save` ×1
- `POST` `/api/biz/v1/agent_sug/fork` ×1
- `POST` `/api/biz/v1/agent_sug/list` ×1
- `POST` `/api/biz/v1/announcement/list` ×1
- `POST` `/api/biz/v1/asset/add_tag` ×3
- `POST` `/api/biz/v1/asset/aio_download` ×2 — chave: url
- `POST` `/api/biz/v1/asset/batch_generate_asset_id` ×4 — chave: batchGenerateAssetID
- `POST` `/api/biz/v1/asset/batch_patch_asset` ×4 — chave: batchPatchAsset
- `POST` `/api/biz/v1/asset/bind_canvas_root_asset` ×2
- `POST` `/api/biz/v1/asset/canvas_list` ×5 — chave: canvasList
- `POST` `/api/biz/v1/asset/create` ×3
- `POST` `/api/biz/v1/asset/create_tag` ×3
- `POST` `/api/biz/v1/asset/create_text` ×4 — chave: CreateTextAsset
- `POST` `/api/biz/v1/asset/create_v2` ×3
- `POST` `/api/biz/v1/asset/delete` ×6 — chave: materialDelete
- `POST` `/api/biz/v1/asset/delete_tag` ×3
- `POST` `/api/biz/v1/asset/detail` ×5
- `?` `/api/biz/v1/asset/detail_v2` ×1
- `POST` `/api/biz/v1/asset/history` ×3
- `POST` `/api/biz/v1/asset/list` ×4
- `POST` `/api/biz/v1/asset/list_tag` ×3
- `POST` `/api/biz/v1/asset/namespace_create` ×3
- `POST` `/api/biz/v1/asset/namespace_query` ×4 — chave: assetNamespaceQueryV1
- `POST` `/api/biz/v1/asset/query` ×12 — chave: AssetQuery, assetQueryPath, materialQuery
- `POST` `/api/biz/v1/asset/query_artifact` ×3
- `POST` `/api/biz/v1/asset/query_share_asset` ×2
- `POST` `/api/biz/v1/asset/search` ×2
- `POST` `/api/biz/v1/asset/showcase_detail` ×3
- `POST` `/api/biz/v1/asset/showcase_query` ×4
- `POST` `/api/biz/v1/asset/sse_asset` ×6 — chave: ssePath
- `POST` `/api/biz/v1/asset/subscribe_asset` ×4 — chave: subscribeAsset
- `POST` `/api/biz/v1/asset/unbind_canvas_root_asset` ×5 — chave: canvasUnbind
- `POST` `/api/biz/v1/asset/update` ×6 — chave: materialUpdate
- `POST` `/api/biz/v1/asset/update_artifact` ×3
- `POST` `/api/biz/v1/asset/update_text` ×4 — chave: UpdateTextAsset
- `?` `/api/biz/v1/asset/usage/record` ×1
- `POST` `/api/biz/v1/auth/check_web_platform_auth` ×1
- `?` `/api/biz/v1/benefit/notice/ack` ×1 — chave: ACK_CREDITS_NOTICE
- `?` `/api/biz/v1/benefit/notice/list` ×1 — chave: GET_CREDITS_NOTICE
- `POST` `/api/biz/v1/character/app/create/bootstrap` ×1
- `POST` `/api/biz/v1/character/app/mine/page` ×1
- `GET` `/api/biz/v1/character/app/tab/page` ×1
- `POST` `/api/biz/v1/character/create` ×4 — chave: characterCreate
- `POST` `/api/biz/v1/character/delete` ×4 — chave: characterDelete
- `POST` `/api/biz/v1/character/detail` ×4 — chave: characterDetail
- `POST` `/api/biz/v1/character/entity/create` ×2
- `POST` `/api/biz/v1/character/entity/delete` ×2
- `POST` `/api/biz/v1/character/entity/detail` ×2
- `GET` `/api/biz/v1/character/entity/list` ×2
- `POST` `/api/biz/v1/character/entity/realperson/create` ×2
- `POST` `/api/biz/v1/character/entity/realperson/create_op` ×2
- `POST` `/api/biz/v1/character/entity/realperson/get_me` ×2
- `POST` `/api/biz/v1/character/entity/realperson/query_op` ×2
- `POST` `/api/biz/v1/character/entity/realperson/update` ×2
- `POST` `/api/biz/v1/character/entity/update` ×2
- `POST` `/api/biz/v1/character/favorite` ×4 — chave: characterFavorite
- `POST` `/api/biz/v1/character/generate/confirm` ×4 — chave: characterGenerateConfirm
- `POST` `/api/biz/v1/character/generate/query` ×4 — chave: characterGenerateQuery
- `POST` `/api/biz/v1/character/generate/submit` ×4 — chave: characterGenerateSubmit
- `POST` `/api/biz/v1/character/update` ×4 — chave: characterUpdate
- `POST` `/api/biz/v1/character/use/resolve` ×4 — chave: characterUseResolve
- `?` `/api/biz/v1/character/voice/generate/query` ×3 — chave: characterVoiceGenerateQuery
- `?` `/api/biz/v1/character/voice/generate/submit` ×3 — chave: characterVoiceGenerateSubmit
- `?` `/api/biz/v1/cloud_storage/cancel_upload` ×1
- `?` `/api/biz/v1/cloud_storage/get_file_list` ×1
- `?` `/api/biz/v1/cloud_storage/get_upload_progress` ×1
- `?` `/api/biz/v1/cloud_storage/upload_file` ×1
- `POST` `/api/biz/v1/commerce/get_commerce_auth_info` ×2 — chave: url
- `POST` `/api/biz/v1/commerce/grant_user_credits` ×2
- `?` `/api/biz/v1/common` ×1
- `POST` `/api/biz/v1/common/get_odin_user_info` ×2
- `POST` `/api/biz/v1/common/get_tos_source_by_path` ×2
- `POST` `/api/biz/v1/common/get_upload_sign` ×2
- `POST` `/api/biz/v1/common/im_access` ×1
- `POST` `/api/biz/v1/common/mget_asset_info` ×6
- `POST` `/api/biz/v1/common/mget_video_info` ×2
- `POST` `/api/biz/v1/common/report` ×2
- `POST` `/api/biz/v1/common/security_check` ×1
- `POST` `/api/biz/v1/common/sync_asset_to_everphoto` ×2
- `POST` `/api/biz/v1/common/transfer_material` ×3 — chave: path
- `POST` `/api/biz/v1/context/generate_ids` ×3
- `POST` `/api/biz/v1/context/generate_infos` ×3
- `POST` `/api/biz/v1/context/generate_light_infos` ×4
- `POST` `/api/biz/v1/context/history` ×4
- `POST` `/api/biz/v1/context/history_delete` ×4
- `POST` `/api/biz/v1/context/history_update` ×3
- `POST` `/api/biz/v1/context/message` ×4
- `POST` `/api/biz/v1/creativity/exposure/write` ×1
- `POST` `/api/biz/v1/creativity/query` ×1
- `POST` `/api/biz/v1/creativity/strategy/detail` ×1
- `POST` `/api/biz/v1/debug/create_debug_task` ×1
- `POST` `/api/biz/v1/debug/create_tts_task` ×1
- `POST` `/api/biz/v1/debug/search_music` ×1
- `POST` `/api/biz/v1/debug/update_debug_task` ×1
- `?` `/api/biz/v1/digital_human/ai_talking_photo/pre_process_audio` ×1
- `?` `/api/biz/v1/digital_human/ai_talking_photo/pre_process_image` ×1
- `?` `/api/biz/v1/digital_human/create_item` ×1
- `POST` `/api/biz/v1/digital_human/create_pre_process_task` ×1
- `POST` `/api/biz/v1/digital_human/create_training_task` ×2
- `POST` `/api/biz/v1/digital_human/delete` ×1
- `POST` `/api/biz/v1/digital_human/filter_config` ×2
- `POST` `/api/biz/v1/digital_human/get_fixed_position` ×2
- `POST` `/api/biz/v1/digital_human/get_item_list` ×1
- `POST` `/api/biz/v1/digital_human/image_review` ×1
- `POST` `/api/biz/v1/digital_human/query_pre_process_task` ×1
- `?` `/api/biz/v1/digital_human/query_training_task` ×1
- `GET` `/api/biz/v1/digital_human/recommend_by_tag` ×2
- `POST` `/api/biz/v1/digital_human/update` ×1
- `?` `/api/biz/v1/digital_human/upload_sign` ×1
- `POST` `/api/biz/v1/editor/create_generate_videos` ×2
- `POST` `/api/biz/v1/editor/create_generate_videos_deduct` ×2
- `POST` `/api/biz/v1/editor/create_tts_avatar_task` ×2
- `POST` `/api/biz/v1/editor/get_bind_jianying_accounts` ×1
- `POST` `/api/biz/v1/editor/get_bind_pippit_accounts` ×1
- `POST` `/api/biz/v1/editor/get_package_info` ×2
- `POST` `/api/biz/v1/editor/get_package_info_lite` ×2 — chave: getPackageInfoLite
- `POST` `/api/biz/v1/editor/get_pippit_user_info` ×1
- `POST` `/api/biz/v1/editor/get_platform_material_detail` ×2
- `POST` `/api/biz/v1/editor/get_t2v_task_count` ×2
- `POST` `/api/biz/v1/editor/list_platform_category` ×2
- `POST` `/api/biz/v1/editor/list_platform_material` ×2
- `POST` `/api/biz/v1/editor/query_generate_videos` ×2
- `POST` `/api/biz/v1/editor/query_tts_avatar_task` ×2
- `POST` `/api/biz/v1/editor/re_transfer` ×1
- `POST` `/api/biz/v1/editor/search_platform_material` ×2
- `POST` `/api/biz/v1/editor/unbind_user` ×1
- `POST` `/api/biz/v1/editor/unbind_user_for_jianying` ×1
- `POST` `/api/biz/v1/editor/upload_file` ×2 — chave: uploadFile
- `?` `/api/biz/v1/entity/create` ×7 — chave: productCreate
- `?` `/api/biz/v1/entity/delete` ×4 — chave: productDelete
- `?` `/api/biz/v1/entity/update` ×3 — chave: productUpdate
- `POST` `/api/biz/v1/home/mweb_copy_link_send_mail` ×1
- `?` `/api/biz/v1/home/recommend_inspiration` ×1 — chave: GET_SUPPORT_FILM_CATEGORY
- `POST` `/api/biz/v1/home/recommend_video` ×1
- `POST` `/api/biz/v1/home/reward_email_return_user` ×1
- `POST` `/api/biz/v1/image/batch_detect_white_base_image` ×1
- `POST` `/api/biz/v1/image/recommend_preset_image` ×1
- `POST` `/api/biz/v1/inspiration/batch_get_interaction_status` ×2
- `POST` `/api/biz/v1/inspiration/batch_mark_badge_show_status` ×2
- `POST` `/api/biz/v1/inspiration/create_inspiration` ×2
- `POST` `/api/biz/v1/inspiration/create_inspiration_automatically` ×2
- `POST` `/api/biz/v1/inspiration/create_inspiration_for_image` ×2
- `POST` `/api/biz/v1/inspiration/create_inspiration_for_omni` ×2
- `GET` `/api/biz/v1/inspiration/create_ugc_inspiration` ×2
- `POST` `/api/biz/v1/inspiration/delete_ugc_inspiration` ×2
- `POST` `/api/biz/v1/inspiration/detail_list` ×2
- `POST` `/api/biz/v1/inspiration/details` ×2
- `POST` `/api/biz/v1/inspiration/feature_tab` ×2
- `POST` `/api/biz/v1/inspiration/feed` ×2
- `?` `/api/biz/v1/inspiration/get_drama_general_publish_info` ×1 — chave: url
- `POST` `/api/biz/v1/inspiration/get_drama_hot_topic` ×1
- `POST` `/api/biz/v1/inspiration/get_drama_sug_item` ×1
- `POST` `/api/biz/v1/inspiration/get_inspiration_detail` ×2
- `GET` `/api/biz/v1/inspiration/get_inspiration_tab_config` ×2
- `POST` `/api/biz/v1/inspiration/get_published_inspiration_detail` ×2
- `POST` `/api/biz/v1/inspiration/get_random_story_outline_template` ×1
- `POST` `/api/biz/v1/inspiration/get_user_business_extra_info` ×2
- `POST` `/api/biz/v1/inspiration/interactions` ×2
- `POST` `/api/biz/v1/inspiration/interactive/add_episode` ×2
- `POST` `/api/biz/v1/inspiration/interactive/delete_episodes` ×1
- `POST` `/api/biz/v1/inspiration/interactive/get_story_dag` ×2
- `POST` `/api/biz/v1/inspiration/interactive/update_episode` ×2
- `POST` `/api/biz/v1/inspiration/like` ×2
- `POST` `/api/biz/v1/inspiration/list_challenge_tools` ×2
- `POST` `/api/biz/v1/inspiration/list_feed_challenge` ×2
- `POST` `/api/biz/v1/inspiration/list_feed_inspiration` ×2
- `POST` `/api/biz/v1/inspiration/list_for_fission` ×2
- `POST` `/api/biz/v1/inspiration/list_inspiration_activity` ×2
- `POST` `/api/biz/v1/inspiration/list_published_inspiration` ×2
- `POST` `/api/biz/v1/inspiration/list_related_remix` ×2
- `POST` `/api/biz/v1/inspiration/list_supported_templates` ×2
- `POST` `/api/biz/v1/inspiration/locate_challenge_position` ×2
- `POST` `/api/biz/v1/inspiration/mylikes` ×2
- `?` `/api/biz/v1/inspiration/publish_drama_general` ×1 — chave: url
- `POST` `/api/biz/v1/inspiration/send_client_event` ×2
- `POST` `/api/biz/v1/inspiration/sug_words` ×2
- `POST` `/api/biz/v1/inspiration/update_inspiration` ×2
- `POST` `/api/biz/v1/inspiration_i18n/create_agent_inspiration` ×2
- `POST` `/api/biz/v1/inspiration_i18n/create_inspiration` ×2
- `POST` `/api/biz/v1/inspiration_i18n/update_inspiration` ×2
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_detail` ×1
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_feature_tab_config` ×1
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_feed_list` ×1
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_liked_list` ×1
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_tab_config` ×1
- `POST` `/api/biz/v1/inspiration_oversea/update_inspiration_like_status` ×1
- `?` `/api/biz/v1/invite/gen_invite_url` ×1
- `?` `/api/biz/v1/invite/invite_conf` ×1
- `?` `/api/biz/v1/invite/issued_rewards` ×1
- `?` `/api/biz/v1/marketing/batch_get_marketing_showcase_detail` ×1 — chave: path
- `?` `/api/biz/v1/marketing/get_marketing_hooks` ×1
- `?` `/api/biz/v1/marketing/get_marketing_showcases` ×1
- `?` `/api/biz/v1/marketing/get_marketing_video_visual_styles` ×1 — chave: path
- `?` `/api/biz/v1/marketing/mget_marketing_hooks` ×1 — chave: path
- `POST` `/api/biz/v1/material/ark_generate_callback` ×2
- `POST` `/api/biz/v1/material/batch_get` ×2
- `POST` `/api/biz/v1/material/create_task` ×2
- `?` `/api/biz/v1/material/lang_detect` ×1 — chave: url
- `POST` `/api/biz/v1/material/preprocess` ×2
- `POST` `/api/biz/v1/memory/get_user_memory` ×1
- `POST` `/api/biz/v1/montage/get_montage_sug` ×2
- `POST` `/api/biz/v1/notice/list` ×2
- `POST` `/api/biz/v1/notice/unread_count` ×2
- `POST` `/api/biz/v1/novel_agent/novel_script_save` ×2
- `POST` `/api/biz/v1/omni/audio_to_text` ×2
- `POST` `/api/biz/v1/omni/batch_delete_digital` ×2
- `POST` `/api/biz/v1/omni/before_create_limit_check` ×2
- `?` `/api/biz/v1/omni/create_task_web` ×1
- `POST` `/api/biz/v1/omni/get_fixed_position` ×2
- `POST` `/api/biz/v1/omni/get_hot_audio_list` ×2
- `POST` `/api/biz/v1/omni/get_img_category_list` ×2
- `POST` `/api/biz/v1/omni/get_img_list` ×2
- `POST` `/api/biz/v1/omni/get_tone_list` ×2
- `POST` `/api/biz/v1/omni/get_user_img_list` ×2
- `POST` `/api/biz/v1/omni/image_object_detect` ×2
- `GET` `/api/biz/v1/omni/preprocess_submit_request` ×2
- `POST` `/api/biz/v1/omni/retry_task` ×2
- `POST` `/api/biz/v1/omni/text_to_speech` ×2
- `POST` `/api/biz/v1/omni/try_task` ×3
- `GET` `/api/biz/v1/parse/check_input_valid` ×2
- `POST` `/api/biz/v1/preset/get_prompt_sug` ×2
- `POST` `/api/biz/v1/preset/image_example` ×2
- `GET` `/api/biz/v1/preset/video_example` ×2
- `?` `/api/biz/v1/product/get_asset_upload_status` ×1 — chave: GET_ASSET_UPLOAD_STATUS
- `?` `/api/biz/v1/product/get_product_by_asset_id` ×1
- `?` `/api/biz/v1/product/get_url_data` ×1
- `?` `/api/biz/v1/product/list` ×1 — chave: GET_PRODUCT_LIST
- `POST` `/api/biz/v1/publish/batchcreate_schedule_task` ×1
- `POST` `/api/biz/v1/publish/create_schedule_task` ×1
- `POST` `/api/biz/v1/publish/delete_schedule_task` ×1
- `POST` `/api/biz/v1/publish/list_schedule_task` ×1
- `?` `/api/biz/v1/publish/list_task_by_asset` ×1
- `POST` `/api/biz/v1/publish/product_add_verify` ×1
- `POST` `/api/biz/v1/publish/product_content_verify` ×1
- `GET` `/api/biz/v1/publish/products` ×1
- `GET` `/api/biz/v1/publish/recommend_hashtags` ×1
- `POST` `/api/biz/v1/publish/update_schedule_task` ×1
- `POST` `/api/biz/v1/remix/characters/get` ×2
- `POST` `/api/biz/v1/remix/get_build_info` ×2
- `POST` `/api/biz/v1/remix_tools/crop_image` ×2
- `POST` `/api/biz/v1/remix_tools/get_drama_sug_info` ×1
- `POST` `/api/biz/v1/remix_tools/list` ×2
- `?` `/api/biz/v1/reward_task` ×1
- `?` `/api/biz/v1/reward_task/claim` ×1
- `POST` `/api/biz/v1/security/async/batch_query` ×1
- `GET/POST` `/api/biz/v1/security/check` ×4
- `POST` `/api/biz/v1/share/info` ×2
- `POST` `/api/biz/v1/skill/get_skill_install_command` ×1
- `GET` `/api/biz/v1/skill/get_thread` ×1
- `POST` `/api/biz/v1/skill/list_thread_file` ×1
- `POST` `/api/biz/v1/skill/report_telemetry` ×1
- `POST` `/api/biz/v1/skill/submit_run` ×1
- `POST` `/api/biz/v1/smart_creation/list_offline_recommend` ×1
- `POST` `/api/biz/v1/smart_creation/report_user_action` ×1
- `POST` `/api/biz/v1/speech/asr_access_config` ×1
- `?` `/api/biz/v1/speech/speakers/favorite/set` ×1
- `?` `/api/biz/v1/speech/speakers/favorites/list` ×1
- `POST` `/api/biz/v1/speech/speakers/filter_options` ×1
- `POST` `/api/biz/v1/speech/speakers/list` ×1
- `POST` `/api/biz/v1/storage/load_pen_data` ×1
- `POST` `/api/biz/v1/storage/save_pen_data` ×1
- `?` `/api/biz/v1/subscribe/apply_free_trial` ×1
- `?` `/api/biz/v1/sug/list` ×1 — chave: GET_SEARCH_SUGGEST
- `POST` `/api/biz/v1/task/query` ×1
- `POST` `/api/biz/v1/tcc/get_config` ×2
- `POST` `/api/biz/v1/tcc/get_config_without_login` ×1
- `POST` `/api/biz/v1/template/category/list` ×1
- `POST` `/api/biz/v1/template/creative_works/list` ×1
- `POST` `/api/biz/v1/template/get` ×1
- `POST` `/api/biz/v1/template/homepage/creative_works/list` ×1
- `POST` `/api/biz/v1/template/list` ×1
- `POST` `/api/biz/v1/template_creative/batch_get_usage_count` ×2
- `POST` `/api/biz/v1/transfer/batch_get_image` ×2
- `POST` `/api/biz/v1/transfer/batch_get_video_url` ×2
- `POST` `/api/biz/v1/usage/get_web_daily_quota` ×1
- `?` `/api/biz/v1/user` ×1
- `POST` `/api/biz/v1/user/authorize_email` ×1
- `GET` `/api/biz/v1/user/bui` ×1
- `POST` `/api/biz/v1/user/check_user_beta_access` ×2
- `POST` `/api/biz/v1/user/click_id` ×2
- `POST` `/api/biz/v1/user/cold_start_activate` ×2
- `POST` `/api/biz/v1/user/delete_ak` ×2
- `GET` `/api/biz/v1/user/fetch_email_status` ×1
- `POST` `/api/biz/v1/user/generate_ak` ×2
- `POST` `/api/biz/v1/user/get_features` ×1
- `POST` `/api/biz/v1/user/get_perference` ×1
- `POST` `/api/biz/v1/user/get_prompt_intent` ×2
- `POST` `/api/biz/v1/user/get_user_app_setting` ×1
- `?` `/api/biz/v1/user/info` ×2
- `POST` `/api/biz/v1/user/mget_device_setting` ×1
- `POST` `/api/biz/v1/user/mget_user_setting` ×2
- `?` `/api/biz/v1/user/perference` ×1
- `POST` `/api/biz/v1/user/preset_prompts/get` ×1
- `POST` `/api/biz/v1/user/preset_prompts/save` ×1
- `?` `/api/biz/v1/user/profile` ×1 — chave: url
- `POST` `/api/biz/v1/user/query_ak` ×2
- `POST` `/api/biz/v1/user/save_email` ×1
- `POST` `/api/biz/v1/user/send_authorize_email` ×1
- `POST` `/api/biz/v1/user/set_bui` ×1
- `POST` `/api/biz/v1/user/unsubscribe_email` ×1
- `POST` `/api/biz/v1/user/update_ak` ×2
- `POST` `/api/biz/v1/user/update_device_setting` ×1
- `POST` `/api/biz/v1/user/update_user_setting` ×2
- `POST` `/api/biz/v1/videogen/batch_get_render_task` ×2
- `GET` `/api/biz/v1/videogen/create_video` ×2
- `POST` `/api/biz/v1/videogen/digital_human_filter_config` ×1
- `?` `/api/biz/v1/videogen/generate` ×1
- `POST` `/api/biz/v1/videogen/recommend_digital_human_by_tag` ×1
- `POST` `/api/biz/v1/videogen/regenerate_video` ×2
- `?` `/api/biz/v1/videogen/script_list` ×1
- `?` `/api/biz/v1/videogen/search_platform_material` ×1
- `POST` `/api/biz/v1/videogen/upload_audio_pre_check` ×1
- `?` `/api/biz/v1/voice/cancel_voice_clone_task` ×1 — chave: CANCEL_TASK
- `?` `/api/biz/v1/voice/check_voice_clone_auth` ×1 — chave: CHECK_CREATE_PERMISSION
- `?` `/api/biz/v1/voice/delete_clone_voice` ×1 — chave: DELETE_VOICE
- `?` `/api/biz/v1/voice/free_voice_clone_resource` ×1 — chave: RELEASE_VOICE
- `?` `/api/biz/v1/voice/get_voice_clone_task` ×1 — chave: QUERY_TASK
- `?` `/api/biz/v1/voice/get_voice_clone_text` ×1 — chave: GET_TEXT
- `?` `/api/biz/v1/voice/submit_voice_clone_task` ×1 — chave: CREATE_TASK
- `POST` `/api/biz/v1/web_homepage/background/list` ×1
- `POST` `/api/biz/v1/web_homepage/display_content/list` ×2
- `POST` `/api/biz/v1/web_homepage/homepage/display_content/list` ×1
- `POST` `/api/biz/v1/web_homepage/promo_slot/list` ×2
- `POST` `/api/biz/v1/work/search` ×1
- `POST` `/api/biz/v1/workspace/cancel_import_file_task` ×1
- `POST` `/api/biz/v1/workspace/get_import_file_task` ×1
- `POST` `/api/biz/v1/workspace/get_user_workspace` ×1
- `POST` `/api/biz/v1/workspace/import_file_to_workspace` ×1

## api/web/v1  (61)

- `POST` `/api/web/v1/agent/get_state` ×1
- `POST` `/api/web/v1/agent/get_thread_share` ×2
- `POST` `/api/web/v1/agent/get_thread_share_id` ×2
- `POST` `/api/web/v1/agent/list_web_agent_sug` ×1
- `POST` `/api/web/v1/agent/novel/ai_script_reset_snapshot` ×1 — chave: url
- `POST` `/api/web/v1/agent/novel/delete_episode` ×1
- `POST` `/api/web/v1/agent/novel/erase_video_subtitle_for_novel_agent` ×1
- `POST` `/api/web/v1/agent/novel/generate_images` ×1
- `POST` `/api/web/v1/agent/novel/generate_new_episode` ×1
- `POST` `/api/web/v1/agent/novel/generate_new_story_board` ×1
- `POST` `/api/web/v1/agent/novel/get_user_contract` ×1
- `POST` `/api/web/v1/agent/novel/novel_script_save` ×1
- `POST` `/api/web/v1/agent/novel/update_ai_script_asset` ×1
- `POST` `/api/web/v1/agent/novel/update_novel_settings` ×1
- `POST` `/api/web/v1/agent/novel/update_script_content` ×1
- `POST` `/api/web/v1/agent/update_state` ×1
- `POST` `/api/web/v1/agent/video/ref_image_generate` ×1
- `POST` `/api/web/v1/agent/video/storyboard_21_modify` ×1
- `POST` `/api/web/v1/agent/video/storyboard_21_save` ×1
- `POST` `/api/web/v1/agent/video/storyboard_modify` ×1
- `POST` `/api/web/v1/agent/video/storyboard_save` ×1
- `POST` `/api/web/v1/agent/video/video_state_21_save` ×1
- `POST` `/api/web/v1/agent/video/video_state_save` ×1
- `POST` `/api/web/v1/announcement/list` ×1
- `POST` `/api/web/v1/asset/search` ×5 — chave: materialSearch
- `?` `/api/web/v1/asset/usage/record` ×3 — chave: usageRecord
- `POST` `/api/web/v1/auth/check_web_platform_auth` ×1
- `POST` `/api/web/v1/auth/create_cli_login_grant` ×1
- `POST` `/api/web/v1/auth/exchange_cli_login_grant` ×1
- `POST` `/api/web/v1/character/create/bootstrap` ×4 — chave: characterCreateBootstrap
- `GET` `/api/web/v1/character/manage/page` ×4 — chave: characterManagePage
- `POST` `/api/web/v1/character/picker/page` ×4 — chave: characterPickerPage
- `?` `/api/web/v1/character/realperson/qr/callback` ×3 — chave: realPersonQrCallback
- `POST` `/api/web/v1/character/realperson/qr/confirm` ×4 — chave: realPersonQrConfirm
- `POST` `/api/web/v1/character/realperson/qr/create` ×4 — chave: realPersonQrCreate
- `POST` `/api/web/v1/character/realperson/qr/query` ×4 — chave: realPersonQrQuery
- `POST` `/api/web/v1/character/realperson/qr/scan` ×4 — chave: realPersonQrScan
- `POST` `/api/web/v1/common/mget_asset_info` ×1
- `POST` `/api/web/v1/common/mget_showcase_asset_info` ×1
- `POST` `/api/web/v1/common/upload_file` ×1
- `POST` `/api/web/v1/context/generate_light_infos` ×1
- `POST` `/api/web/v1/context/history` ×1
- `POST` `/api/web/v1/context/history_delete` ×1
- `POST` `/api/web/v1/context/message` ×1
- `POST` `/api/web/v1/debug/create_debug_task` ×1
- `POST` `/api/web/v1/debug/create_tts_task` ×1
- `POST` `/api/web/v1/debug/search_music` ×1
- `POST` `/api/web/v1/debug/update_debug_task` ×1
- `?` `/api/web/v1/entity/manage/page` ×7 — chave: productManagePage
- `?` `/api/web/v1/entity/mention/page` ×3 — chave: productMentionPage
- `?` `/api/web/v1/entity/picker/page` ×3 — chave: productPickerPage
- `POST` `/api/web/v1/memory/get_user_memory` ×1
- `POST` `/api/web/v1/novel_style_list` ×1
- `POST` `/api/web/v1/security/check` ×5 — chave: securityCheck
- `POST` `/api/web/v1/skill/list` ×1
- `POST` `/api/web/v1/tcc/get_config` ×2
- `POST` `/api/web/v1/usage/get_web_daily_quota` ×1
- `POST` `/api/web/v1/user/preset_prompts/get` ×1
- `POST` `/api/web/v1/user/preset_prompts/save` ×1
- `POST` `/api/web/v1/work/search` ×1
- `POST` `/api/web/v1/workspace/get_user_workspace` ×1

## lv/v1/intelligence  (20)

- `?` `/lv/v1/intelligence/cancel_timbre_clone` ×1 — chave: CANCEL_TASK
- `?` `/lv/v1/intelligence/check_popup` ×1
- `?` `/lv/v1/intelligence/confirm_popup` ×1
- `?` `/lv/v1/intelligence/create` ×1
- `?` `/lv/v1/intelligence/delete_clone_voice` ×1 — chave: DELETE_VOICE
- `?` `/lv/v1/intelligence/get_audio_snr` ×1
- `?` `/lv/v1/intelligence/image_highlight_analyse` ×1
- `?` `/lv/v1/intelligence/package_sync_status` ×1
- `?` `/lv/v1/intelligence/product/add` ×1 — chave: path
- `?` `/lv/v1/intelligence/product/list` ×1 — chave: path
- `?` `/lv/v1/intelligence/product/update` ×1 — chave: path
- `?` `/lv/v1/intelligence/prompt_sug` ×1
- `?` `/lv/v1/intelligence/prompt_to_text` ×1
- `?` `/lv/v1/intelligence/query` ×1
- `?` `/lv/v1/intelligence/query_clone_timbre_result` ×1 — chave: QUERY_TASK
- `?` `/lv/v1/intelligence/release_clone_timber` ×1 — chave: RELEASE_VOICE
- `?` `/lv/v1/intelligence/render_create` ×1
- `?` `/lv/v1/intelligence/save_timbre` ×2 — chave: SAVE_VOICE
- `?` `/lv/v1/intelligence/submit_clone_timbre` ×1 — chave: CREATE_TASK
- `?` `/lv/v1/intelligence/text2video_preset` ×1

## lv/v1/editor  (13)

- `?` `/lv/v1/editor/effect/recent_list` ×2 — chave: GET_RECENT_RESOURCE_BY_PANEL, url
- `?` `/lv/v1/editor/pack_resource` ×1
- `?` `/lv/v1/editor/plane/intelligence/create_batch_process_task` ×1
- `?` `/lv/v1/editor/plane/intelligence/query_batch_process_result` ×1
- `?` `/lv/v1/editor/plane/intelligence/query_social_media_size` ×1
- `?` `/lv/v1/editor/plane_draft/get_draft_detail` ×1 — chave: url
- `?` `/lv/v1/editor/plane_draft/save` ×1 — chave: url
- `?` `/lv/v1/editor/task/cancel` ×1
- `?` `/lv/v1/editor/task/new` ×1
- `?` `/lv/v1/editor/task/query` ×1
- `?` `/lv/v1/editor/use_report` ×3 — chave: ADD_RECENT_RESOURCE, url
- `?` `/lv/v1/editor/video_draft/delta_update` ×1 — chave: path
- `?` `/lv/v1/editor/video_draft/save` ×1 — chave: path

## commerce/v3/teamwork  (13)

- `?` `/commerce/v3/teamwork` ×1
- `?` `/commerce/v3/teamwork/check_create_team` ×2
- `?` `/commerce/v3/teamwork/get_join_team_approval_record_list` ×2
- `?` `/commerce/v3/teamwork/get_lite_team_list` ×2
- `?` `/commerce/v3/teamwork/get_team_info_by_invite_link` ×2
- `?` `/commerce/v3/teamwork/get_team_invitation_link` ×2
- `?` `/commerce/v3/teamwork/get_team_member_list` ×2
- `?` `/commerce/v3/teamwork/handle_join_team_approval` ×2
- `?` `/commerce/v3/teamwork/join_team_by_invite_link` ×2
- `?` `/commerce/v3/teamwork/remove_team_member` ×2
- `?` `/commerce/v3/teamwork/team_info` ×2
- `?` `/commerce/v3/teamwork/update_team_info` ×2
- `?` `/commerce/v3/teamwork/update_team_member_info` ×2

## lv/v1/asset  (11)

- `POST` `/lv/v1/asset/copy` ×1 — chave: path
- `POST` `/lv/v1/asset/create` ×1 — chave: path
- `?` `/lv/v1/asset/create_cloud_asset` ×1
- `POST` `/lv/v1/asset/delete` ×2 — chave: path
- `?` `/lv/v1/asset/detail` ×1
- `POST` `/lv/v1/asset/label_as_exported` ×1 — chave: path
- `POST` `/lv/v1/asset/list` ×1 — chave: path
- `?` `/lv/v1/asset/prepare_upload_cloud` ×2
- `?` `/lv/v1/asset/query` ×1
- `POST` `/lv/v1/asset/query_process` ×1 — chave: path
- `POST` `/lv/v1/asset/rename` ×1 — chave: path

## commerce/v3/trade  (9)

- `?` `/commerce/v3/trade/cancel_subscription` ×3 — chave: CANCEL_SUBSCRIPTION
- `?` `/commerce/v3/trade/init_trade` ×6 — chave: PURCHASE_ORDER
- `?` `/commerce/v3/trade/query_trade` ×4 — chave: QUERY_ORDER_STATUS
- `?` `/commerce/v3/trade/resume_subscription` ×3 — chave: RESUME_SUBSCRIPTION
- `?` `/commerce/v3/trade/subscription_infos` ×2
- `?` `/commerce/v3/trade/trade_records` ×3 — chave: GET_PAYMENT_LIST
- `?` `/commerce/v3/trade/user/apply_order_refund` ×3
- `?` `/commerce/v3/trade/user/can_refund_list` ×2
- `?` `/commerce/v3/trade/user/refund_record_list` ×2

## commerce/v1/invoice  (9)

- `?` `/commerce/v1/invoice/apply_invoice` ×2
- `?` `/commerce/v1/invoice/apply_refund_invoice` ×2
- `?` `/commerce/v1/invoice/batch_get_invoice_info` ×2
- `?` `/commerce/v1/invoice/fuzzy_query_enterprise_info` ×2
- `?` `/commerce/v1/invoice/invoice_history` ×2
- `?` `/commerce/v1/invoice/last_time_invoice_info` ×2
- `?` `/commerce/v1/invoice/re_send_invoice` ×2
- `?` `/commerce/v1/invoice/un_invoiced_order_record` ×2
- `?` `/commerce/v1/invoice/update_invoice` ×2

## commerce/v1/subscription  (8)

- `?` `/commerce/v1/subscription/batch_get` ×2
- `?` `/commerce/v1/subscription/cc_price_list` ×7 — chave: GET_SUBSCRIBE_SKU
- `?` `/commerce/v1/subscription/device/detect` ×1
- `?` `/commerce/v1/subscription/get_user_subscription_extra_info` ×4
- `?` `/commerce/v1/subscription/make_unauto_order` ×1
- `?` `/commerce/v1/subscription/prepay_price_list` ×1
- `?` `/commerce/v1/subscription/price_list` ×5
- `?` `/commerce/v1/subscription/user_info` ×6 — chave: GET_SUBSCRIBE_DETAIL

## lv/v1/sc  (7)

- `?` `/lv/v1/sc/age_gate/check_age_without_uid` ×1
- `?` `/lv/v1/sc/age_gate/get_age_gate_config` ×1
- `?` `/lv/v1/sc/age_gate/log_in_age_check` ×2
- `?` `/lv/v1/sc/age_gate/set_birthday_by_uid` ×1
- `?` `/lv/v1/sc/age_gate/set_birthday_with_check` ×1
- `POST` `/lv/v1/sc/compliance_popup/fetch_all` ×1 — chave: url
- `POST` `/lv/v1/sc/compliance_popup/submit_consent` ×1 — chave: url

## lv/v1/cc_web  (7)

- `?` `/lv/v1/cc_web/ad_maker/ecom/favorite` ×1 — chave: FAVORITE_TEMPLATES
- `?` `/lv/v1/cc_web/ad_maker/ecom/get_business_favorite_list` ×1 — chave: BATCH_GET_FAVORITE_TEMPLATES
- `?` `/lv/v1/cc_web/ad_maker/ecom/get_collection_templates` ×1 — chave: BATCH_GET_TEMPLATES_BY_CATEGORY
- `?` `/lv/v1/cc_web/ad_maker/ecom/get_collections` ×1 — chave: BATCH_GET_CATEGORY
- `?` `/lv/v1/cc_web/ad_maker/ecom/get_sug` ×1 — chave: SEARCH_TEMPLATES_SUG
- `?` `/lv/v1/cc_web/ad_maker/ecom/search_templates` ×1 — chave: SEARCH_TEMPLATES
- `?` `/lv/v1/cc_web/ad_maker/ecom/unfavorite` ×1 — chave: UNFAVORITE_TEMPLATES

## api/biz/v3  (6)

- `?` `/api/biz/v3/` ×3
- `POST` `/api/biz/v3/agent/get_thread_share` ×1
- `POST` `/api/biz/v3/agent/get_thread_share_id` ×1
- `?` `/api/biz/v3/asset/create_v2` ×3
- `?` `/api/biz/v3/asset/search` ×1
- `POST` `/api/biz/v3/context/generate_light_infos` ×1

## lv/v1/effect  (6)

- `?` `/lv/v1/effect/batch_by_resource` ×2 — chave: GET_RESOURCE_BY_ID, url
- `?` `/lv/v1/effect/get_all_fonts` ×1 — chave: url
- `?` `/lv/v1/effect/get_category_effects` ×2 — chave: GET_RESOURCES_BY_CATEGORY, url
- `?` `/lv/v1/effect/get_panel_info` ×2 — chave: GET_CATEGORY_BY_PANEL, url
- `?` `/lv/v1/effect/get_tag_tree` ×1 — chave: GET_TAG_TREE
- `?` `/lv/v1/effect/search` ×1 — chave: SEARCH

## api/account/v1  (6)

- `?` `/api/account/v1/add_relation` ×1
- `?` `/api/account/v1/deAuthorize` ×1
- `?` `/api/account/v1/del_relation` ×1
- `?` `/api/account/v1/get_bind_account_list` ×1
- `?` `/api/account/v1/limit` ×1
- `?` `/api/account/v1/multi_get_platform_account` ×1

## commerce/v3/benefits  (5)

- `?` `/commerce/v3/benefits/batch_check_withhold_deduct` ×3 — chave: BATCH_CHECK_WITHHOLD_DEDUCT
- `?` `/commerce/v3/benefits/batch_get_user_benefit` ×9 — chave: BATCH_GET_USER_BENEFIT_V3
- `?` `/commerce/v3/benefits/batch_report_usage` ×1
- `?` `/commerce/v3/benefits/check_qualification` ×1
- `?` `/commerce/v3/benefits/exchange` ×1

## lv/v1/ever_photo  (5)

- `?` `/lv/v1/ever_photo/get_external_download_url` ×1
- `?` `/lv/v1/ever_photo/get_token` ×1
- `?` `/lv/v1/ever_photo/get_user_space` ×1
- `POST` `/lv/v1/ever_photo/promote_asset` ×2 — chave: path
- `POST` `/lv/v1/ever_photo/update_package` ×1

## commerce/v1/benefits  (4)

- `?` `/commerce/v1/benefits/credit_receive` ×4 — chave: GET_BENEFIT_NOTICE_LIST
- `?` `/commerce/v1/benefits/team_credit_allocate` ×2
- `?` `/commerce/v1/benefits/user_credit` ×3 — chave: GET_USER_CREDITS
- `?` `/commerce/v1/benefits/user_credit_history` ×2

## lv/v1/render_task  (4)

- `?` `/lv/v1/render_task` ×1 — chave: baseURL
- `?` `/lv/v1/render_task/batch_get` ×1
- `?` `/lv/v1/render_task/cancel` ×1
- `?` `/lv/v1/render_task/create` ×2

## api/biz/v2  (4)

- `POST` `/api/biz/v2/common/generation_task_cancel` ×1
- `POST` `/api/biz/v2/common/generation_task_delete` ×1
- `POST` `/api/biz/v2/common/generation_task_list` ×2
- `POST` `/api/biz/v2/common/generation_task_retry` ×1

## lv/v1/user  (3)

- `?` `/lv/v1/user` ×3 — chave: baseURL
- `?` `/lv/v1/user/check_account_status_by_mobile` ×1
- `POST` `/lv/v1/user/web/add_questionnaire_record` ×1

## lv/v2/intelligence  (3)

- `?` `/lv/v2/intelligence/check_clone_voice_auth` ×1 — chave: CHECK_CREATE_PERMISSION
- `?` `/lv/v2/intelligence/get_voice_clone_text` ×1 — chave: GET_TEXT
- `?` `/lv/v2/intelligence/tts/curl_sync_everphoto` ×1 — chave: path

## lv/v1/recycle  (3)

- `POST` `/lv/v1/recycle/delete` ×1
- `POST` `/lv/v1/recycle/list` ×1
- `POST` `/lv/v1/recycle/restore` ×1

## lv/v1/product  (3)

- `?` `/lv/v1/product/create_from_file` ×1 — chave: CREATE_FROM_FILE
- `?` `/lv/v1/product/recommend_selling_point` ×1 — chave: RECOMMEND_SELLING_POINT
- `?` `/lv/v1/product/recommend_target_audience` ×1 — chave: RECOMMEND_TARGET_AUDIENCE

## lv/v1/notice  (3)

- `?` `/lv/v1/notice/get_notice_list` ×1
- `?` `/lv/v1/notice/get_unread_count` ×1
- `?` `/lv/v1/notice/mark_read` ×1

## commerce/v3/resource  (2)

- `?` `/commerce/v3/resource/benefit_metadata` ×8 — chave: BENEFIT_META
- `?` `/commerce/v3/resource/benefit_resource` ×2

## lv/edit/digital_human  (2)

- `POST` `/lv/edit/digital_human/reactivate` ×1
- `POST` `/lv/edit/digital_human/recustom` ×1

## commerce/v2/subscription  (2)

- `?` `/commerce/v2/subscription/make_unauto_order` ×1
- `?` `/commerce/v2/subscription/sign_and_pay` ×1

## lv/v1  (1)

- `?` `/lv/v1` ×10 — chave: baseURL

## commerce/v1/purchase  (1)

- `?` `/commerce/v1/purchase/price_list` ×8 — chave: GET_CREDIT_SKU

## lv/v1/commerce  (1)

- `?` `/lv/v1/commerce/get_entrances` ×7 — chave: GET_IS_SUBSCRIBE_REGION

## lv/v1/event  (1)

- `GET/POST` `/lv/v1/event/report` ×6

## commerce/v3/subscription  (1)

- `?` `/commerce/v3/subscription/get_user_lite_info` ×4

## lv/v1/upload_sign  (1)

- `?` `/lv/v1/upload_sign` ×3

## commerce/v1/student  (1)

- `?` `/commerce/v1/student/verify/status` ×3

## commerce/v1/resource_position  (1)

- `?` `/commerce/v1/resource_position` ×3

## commerce/v1/record_resource_action  (1)

- `?` `/commerce/v1/record_resource_action` ×2

## commerce/v1/appeal  (1)

- `?` `/commerce/v1/appeal/submit` ×2

## api/biz  (1)

- `?` `/api/biz` ×2

## lv/v2/oauth  (1)

- `?` `/lv/v2/oauth/access_token` ×1

## lv/v2/editor  (1)

- `?` `/lv/v2/editor/effect/recent_list` ×1 — chave: GET_RECENT_RESOURCE_BY_PANEL

## lv/v1/task  (1)

- `?` `/lv/v1/task` ×1 — chave: baseURL

## lv/v1/rick_control  (1)

- `?` `/lv/v1/rick_control/check_spam` ×1

## lv/v1/lite  (1)

- `?` `/lv/v1/lite/config/check_region` ×1 — chave: path

## lv/v1/draft  (1)

- `?` `/lv/v1/draft/get_package_info` ×1 — chave: path

## lv/v1/common_task  (1)

- `?` `/lv/v1/common_task` ×1

## commerce/v1/multi_resource_position  (1)

- `?` `/commerce/v1/multi_resource_position` ×1

## commerce/v1/common  (1)

- `?` `/commerce/v1/common/start_up` ×1 — chave: START_UP

## api/web/v3  (1)

- `POST` `/api/web/v3/common/upload_file` ×1

## api/v1/asset  (1)

- `POST` `/api/v1/asset/namespace_query` ×1

## api/internal  (1)

- `?` `/api/internal` ×1

## Protocolo do agente (estático; ordem e semântica ainda NÃO confirmadas em execução)

Evidência: `async__297147…js` (classe com `submitRun`), `async__599038…js` e `async__889795…js` (SDK `SubscribeRun`, `GetRun`, `CancelRun`, `SubscribeThread`).

- **Enviar execução** — `POST /api/biz/v1/agent/submit_run?babi_param=<json>`; corpo montado por `submitRun(e)`: `agentName` (padrão `pippit_image_ai_editor_agent_v0`), `entranceFrom` (padrão `direct`), `requestId` (gerado), `message`, `runExtra` (string JSON com `client_extra` e `babiParam`). `babiParam` recebe: `generate_id`, `user_message_id`, `section_id`, `scene_lv1:"ai_agent"`, `scene_lv2` (padrão `front_tool`), `tool_id` (+ sufixo `_canvas` em canvas), `sub_tool_id`, `tab_name`, `edit_type`, `enter_from`. Resposta: envelope `{ret:"0", errmsg, logId, data}`; `ret != "0"` → erro.
- **Acompanhar** — `POST /api/biz/v1/agent/subscribe_run` com `run_id`, `thread_id`, `start_message_id`, `stream_cursor`, `enable_chunk_stream` (sugere fluxo em blocos retomável por cursor); `POST …/subscribe_thread` com `thread_id`, `start_run_id`; `POST …/get_run` com `run_id`, `thread_id`, `scopes`, `is_need_fail_reason_detail`; `POST …/cancel_run` com `run_id`, `thread_id`.
- **Ativos em tempo real** — o cliente abre uma assinatura de eventos de ativos e valida `content-type: text/event-stream` (erro "Unexpected Pippit asset event source content-type"); política de sincronização `conflictPolicy:"remote-wins"` e `batchPatchAsset`.
- **Threads/histórico** — `get_thread`, `list_user_history`, `delete_thread`, `clone_thread`, `list_thread_file`, `update_thread_file`, `get_thread_share(_id)`, `/api/biz/v1/context/{history,history_delete,history_update,message,generate_ids,generate_light_infos}`.
- **Modelos/ajustes do agente** — `get_available_model_list`, `get_web_agent_setting`, `get_image_agent_setting`, `get_app_agent_setting`, `get_user_queue_info` (fila do usuário), `list_web_agent_sug` (sugestões).
- **Projetos criativos / novel (Estúdio de histórias)** — `create_creative_project(_canvas)`, `list_creative_project`, `agent/novel/*` (generate_images, generate_new_episode, generate_new_story_board, generate_role_audio, novel_script_save, set/get_user_contract, get_dialogue_limit_free_info, erase_video_subtitle_for_novel_agent, delete_episode).

## Esquemas de corpo extraídos do SDK do cliente (estático)

Fonte: métodos do tipo `Nome(e,t){let r=e||{},i=this.genBaseURL("/caminho"),a={chave:r.chave,…};return this.request({url:i,method:"POST",data:a},t)}` em `scripts/auth_bundles/` (script: `notes/extract_sdk_schemas.py`, saída bruta `notes/auth_sdk_schemas.json`, 333 endpoints). Mostra os NOMES das chaves do corpo; tipos, obrigatoriedade e respostas não são conhecidos. Não é prova de comportamento.

- `POST` `/api/biz/v1/3d_director_platform/upload_file` — Upload3DDirectorFile(extra_map, file, file_name)
- `POST` `/api/biz/v1/agent/cancel_run` — CancelRun(run_id, thread_id)
- `POST` `/api/biz/v1/agent/change_thread_business_info` — ChangeThreadBusinessInfo(business_info, thread_id)
- `POST` `/api/biz/v1/agent/clone_thread` — CloneThread(deep_clone_assets, thread_id)
- `POST` `/api/biz/v1/agent/common/download_with_pay` — DownloadWithPay(picture_id, render_task_id, run_id, task_id, thread_id, type, uri, with_watermark)
- `POST` `/api/biz/v1/agent/delete_thread` — DeleteThread(thread_id)
- `POST` `/api/biz/v1/agent/get_app_agent_setting` — GetAppAgentSetting(user_info)
- `POST` `/api/biz/v1/agent/get_available_model_list` — GetAvailableModelList(client_info, scene, source_model_key, user_info)
- `POST` `/api/biz/v1/agent/get_image_agent_setting` — GetImageAgentSetting(user_info)
- `POST` `/api/biz/v1/agent/get_run` — GetRun(is_need_fail_reason_detail, run_id, scopes, thread_id)
- `POST` `/api/biz/v1/agent/get_run_artifact` — GetRunArtifact(artifact_id, user_id)
- `POST` `/api/biz/v1/agent/get_showcase_run_artifact` — GetShowcaseRunArtifact(artifact_id, user_id)
- `POST` `/api/biz/v1/agent/get_state` — GetAgentStateWeb(agent_name, conversation_id, mode, stage)
- `POST` `/api/biz/v1/agent/get_thread` — GetThread(is_need_fail_reason_detail, limit, run_id, scopes, thread_id)
- `POST` `/api/biz/v1/agent/get_thread_share` — GetThreadShareWeb(scopes, share_id)
- `POST` `/api/biz/v1/agent/get_thread_share_id` — GetThreadShareIDWeb(expire_after_sec, thread_id)
- `POST` `/api/biz/v1/agent/get_user_queue_info` — GetUserQueueInfo(need_earliest_submitted_working_run, run_id, thread_id, uid)
- `POST` `/api/biz/v1/agent/get_web_agent_setting` — GetWebAgentSetting(user_info)
- `POST` `/api/biz/v1/agent/list_showcase` — ListShowcase(end_time, generate_types, page_size, page_token, scopes, start_time, user)
- `POST` `/api/biz/v1/agent/list_thread_file` — ListThreadFile(Base, PageNum, PageSize, path, thread_id, uid)
- `POST` `/api/biz/v1/agent/list_user_history` — ListUserHistory(end_time, generate_types, page_size, page_token, scopes, start_time, user)
- `POST` `/api/biz/v1/agent/list_web_agent_sug` — ListWebAgentSugWeb(agent_name)
- `POST` `/api/biz/v1/agent/novel/generate_images` — ImagesGenerate(asset_namespace, generate_type, node_id, overview_pippit_asset_id, pippit_asset_id)
- `POST` `/api/biz/v1/agent/novel/get_user_contract` — GetUserContract(consumer_uid)
- `POST` `/api/biz/v1/agent/novel/novel_script_save` — NovelScriptSaveWeb(artifact_id, modify, uid, workspace_id)
- `POST` `/api/biz/v1/agent/novel/set_user_contract` — SetUserContract(consumer_uid, user_contract)
- `POST` `/api/biz/v1/agent/pull_sandbox_session` — PullSandboxSession(base, must_start, thread_id)
- `POST` `/api/biz/v1/agent/query_sandbox_session_status` — QuerySandboxSessionStatus(base, thread_id)
- `POST` `/api/biz/v1/agent/rewrite_prompt` — RewritePrompt(Base, params, prompt, scene, user_materials)
- `POST` `/api/biz/v1/agent/speed_up_run_task` — SpeedUpRunTask(run_extra, run_id, task_id, thread_id, uid)
- `POST` `/api/biz/v1/agent/speed_up_run_task_to_vip_channel` — SpeedUpRunTaskToVipChannel(run_extra, run_id, task_id, thread_id, uid)
- `POST` `/api/biz/v1/agent/submit_run` — SubmitRun(agent_name, client_supported_tools, entrance_from, message, prepend_messages, project_id, request_id, run_extra, thread_extra, user_info)
- `POST` `/api/biz/v1/agent/subscribe_run` — SubscribeRun(enable_chunk_stream, run_id, start_message_id, stream_cursor, thread_id)
- `POST` `/api/biz/v1/agent/subscribe_thread` — SubscribeThread(start_run_id, thread_id)
- `POST` `/api/biz/v1/agent/thread_mark_visible` — ThreadMarkVisible(mark_visible, thread_id)
- `POST` `/api/biz/v1/agent/update_run_artifact` — UpdateRunArtifact(artifact, run_id)
- `POST` `/api/biz/v1/agent/update_state` — UpdateAgentStateWeb(agent_name, conversation_id, mode, stage, state)
- `POST` `/api/biz/v1/agent/update_thread` — UpdateThread(thread, thread_id)
- `POST` `/api/biz/v1/agent/update_thread_file` — UpdateThreadFile(Base, content, file_path, pippit_asset_id, thread_id)
- `POST` `/api/biz/v1/agent/user_action` — UserAction(artifact_list, like_action, message_id, run_id, thread_id)
- `POST` `/api/biz/v1/agent/user_subscribe_callback` — UserSubscribeCallback(uid)
- `POST` `/api/biz/v1/agent/video/mget_showcase_asset_info` — MGetShowcaseAssetInfo(app_id, asset_ids, need_transcode, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/ref_image_generate` — RefImageGenerateWeb(scene_type, tasks, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/storyboard_21_modify` — StoryBoard21ModifyWeb(artifact_id, operations, pippit_asset_id, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/storyboard_21_save` — StoryBoardSave21Web(artifact_id, overview_pippit_asset_id, pippit_asset_id, save_mode, storyboard, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/storyboard_modify` — StoryBoardModifyWeb(artifact_id, operations, pippit_asset_id, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/storyboard_save` — StoryBoardSaveWeb(artifact_id, audio_material_extra_data, storyboard, uid, workspace_id)
- `POST` `/api/biz/v1/agent/video/upload_file` — UploadFileWeb(asset_type, file)
- `POST` `/api/biz/v1/agent/video/video_state_21_save` — VideoState21SaveWeb(artifact_id, save_mode, uid, video_state, workspace_id)
- `POST` `/api/biz/v1/agent/video/video_state_save` — VideoStateSaveWeb(artifact_id, save_mode, uid, video_state, workspace_id)
- `POST` `/api/biz/v1/agent_sug/fork` — ForkAgentSug(sug_id, thread_id, uuid)
- `POST` `/api/biz/v1/agent_sug/list` — ListAgentSug(page, page_size, platform)
- `GET` `/api/biz/v1/announcement/list` — ListAnnouncementsWeb()
- `POST` `/api/biz/v1/asset/add_tag` — AddTag(Base, pippit_asset_id, tag)
- `POST` `/api/biz/v1/asset/batch_generate_asset_id` — BatchGenerateAssetID(Base, count)
- `POST` `/api/biz/v1/asset/batch_patch_asset` — BatchPatchAsset(Base, batch_id, client_id, transactions)
- `POST` `/api/biz/v1/asset/bind_canvas_root_asset` — BindCanvasRootAsset(Base, pippit_asset_id)
- `POST` `/api/biz/v1/asset/canvas_list` — CanvasList(Base, PageNum, PageSize)
- `POST` `/api/biz/v1/asset/create` — AssetCreate(Base, asset_source_id, asset_source_type, asset_type)
- `POST` `/api/biz/v1/asset/create_tag` — CreateTag(Base, tag)
- `POST` `/api/biz/v1/asset/create_text` — CreateTextAsset(Base, category, content, file_name, team_name, thread_id)
- `POST` `/api/biz/v1/asset/create_v2` — AssetCreateV2(Base, asset_source_id, asset_source_type, asset_type)
- `POST` `/api/biz/v1/asset/delete` — AgentAssetDelete(Base, GenerateID, PippitAssetIDS, ThreadID)
- `POST` `/api/biz/v1/asset/delete_tag` — DeleteTag(Base, pippit_asset_id, tag)
- `POST` `/api/biz/v1/asset/detail` — AssetDetail(AssetSourceID, AssetSourceType, Base, ConsumerUID, PippitAssetID)
- `POST` `/api/biz/v1/asset/history` — AssetHistory(Base, pippit_asset_ids)
- `POST` `/api/biz/v1/asset/list` — AssetList(Base, PageNum, PageSize, asset_type, category, tag)
- `POST` `/api/biz/v1/asset/list_tag` — ListTag(Base)
- `POST` `/api/biz/v1/asset/namespace_create` — AssetNamespaceCreate(Base, namespace_data)
- `POST` `/api/biz/v1/asset/query` — AssetQuery(Base, namespace_alias, pippit_asset_ids, uid)
- `POST` `/api/biz/v1/asset/query_artifact` — QueryArtifact(Base, artifact_id, consumer_uid, run_id, thread_id)
- `POST` `/api/biz/v1/asset/query_share_asset` — QueryPippitShareAssetInfo(ArtifactID, Base)
- `POST` `/api/biz/v1/asset/search` — AssetSearch(Base, asset_types, begin_time, categories, count, cursor, end_time, query, recent_only, source_types)
- `POST` `/api/biz/v1/asset/showcase_detail` — ShowcaseAssetDetail(AssetSourceID, AssetSourceType, Base, ConsumerUID, PippitAssetID)
- `POST` `/api/biz/v1/asset/showcase_query` — ShowcaseAssetQuery(Base, namespace_alias, pippit_asset_ids, uid)
- `POST` `/api/biz/v1/asset/sse_asset` — SSEAsset(session_id)
- `POST` `/api/biz/v1/asset/subscribe_asset` — SubscribeAsset(action_type, pippit_asset_id, pippit_asset_ids, session_id)
- `POST` `/api/biz/v1/asset/unbind_canvas_root_asset` — UnbindCanvasRootAsset(Base, pippit_asset_id)
- `POST` `/api/biz/v1/asset/update` — AssetUpdate(Base, asset)
- `POST` `/api/biz/v1/asset/update_artifact` — UpdateArtifact(Base, artifact, consumer_uid)
- `POST` `/api/biz/v1/asset/update_text` — UpdateTextAsset(Base, content, extra, extra_update_mode, pippit_asset_id)
- `GET` `/api/biz/v1/auth/check_web_platform_auth` — CheckWebPlatformAuthWeb(uid)
- `GET` `/api/biz/v1/character/app/create/bootstrap` — CharacterCreateBootstrap(Base, scene)
- `POST` `/api/biz/v1/character/app/mine/page` — AppCharacterMinePage(Base, count, cursor, need_real_person, query)
- `POST` `/api/biz/v1/character/app/recommended-prompt/list` — CharacterRecommendedPromptList(Base, client_type, count, locale, scene, style_id)
- `POST` `/api/biz/v1/character/app/tab/page` — AppCharacterTabPage(Base, count, cursor, query, scene, tab_id)
- `POST` `/api/biz/v1/character/create` — CharacterCreateV2(Base, character, create_method, idempotent_key, image_url, material_asset_id, name, portrait_asset_id, prompt, style_id, visibility)
- `POST` `/api/biz/v1/character/delete` — CharacterDeleteV2(Base, character_id)
- `POST` `/api/biz/v1/character/detail` — CharacterDetailV2(Base, character_id, scene)
- `POST` `/api/biz/v1/character/entity/create` — CharacterEntityCreate(Base, Character, biz_type, extra, is_public, snaked_character)
- `POST` `/api/biz/v1/character/entity/delete` — CharacterEntityDelete(Base, CharacterID, snaked_character_id)
- `POST` `/api/biz/v1/character/entity/detail` — CharacterEntityDetail(Base, EntityID, snaked_entity_id)
- `POST` `/api/biz/v1/character/entity/list` — CharacterEntityList(Base, biz_type, character_name, create_type, cursor, is_test, page_size, scope)
- `POST` `/api/biz/v1/character/entity/realperson/create` — CreateRealPersonCharacter(Base, biz_type, character_desc, character_name, extra, is_public, portrait_video_url)
- `POST` `/api/biz/v1/character/entity/realperson/create_op` — AsyncDoRealPersonOperate(Base, biz_type, character_desc, character_id, character_name, is_public, portrait_video_url)
- `POST` `/api/biz/v1/character/entity/realperson/get_me` — GetMyRealPersonCharacter()
- `POST` `/api/biz/v1/character/entity/realperson/query_op` — QueryRealPersonOperation(Base, task_id)
- `POST` `/api/biz/v1/character/entity/realperson/update` — UpdateRealPersonCharacter(Base, character_desc, character_id, character_name, extra, is_public, portrait_video_url)
- `POST` `/api/biz/v1/character/entity/update` — CharacterEntityUpdate(Base, CharacterEntity, snaked_character_entity)
- `POST` `/api/biz/v1/character/favorite` — CharacterFavoriteV2(Base, character_id, favorite, is_favorite)
- `POST` `/api/biz/v1/character/generate/confirm` — CharacterGenerateConfirm(Base, candidate_id, character_name, idempotent_key, task_id)
- `POST` `/api/biz/v1/character/generate/query` — CharacterGenerateQuery(Base, task_id)
- `POST` `/api/biz/v1/character/generate/submit` — CharacterGenerateSubmit(Base, commerce_key, idempotent_key, prompt, ref_asset_id, ref_asset_id_type, ref_pippit_asset_id, ref_source_asset_id, reference_image_url, scene, style_id)
- `POST` `/api/biz/v1/character/update` — CharacterUpdateV2(Base, character, character_id, image_url, material_asset_id, name, portrait_asset_id, prompt, replace_subjects, visibility)
- `POST` `/api/biz/v1/character/use/resolve` — CharacterUseResolve(Base, character_id, scene)
- `POST` `/api/biz/v1/commerce/get_commerce_auth_info` — GetCommerceAuthInfo(agent_name, asset_type, commerce_key, duration, has_refer_image, has_refer_video, immition_videos_durations, model_name, resolution, scene, used_quota_count, video_durations)
- `POST` `/api/biz/v1/commerce/grant_user_credits` — GrantUserCredits(scene)
- `POST` `/api/biz/v1/common/get_odin_user_info` — GetOdinUserInfo()
- `POST` `/api/biz/v1/common/get_tos_source_by_path` — GetTosSourceByPath(file_id, path)
- `GET` `/api/biz/v1/common/get_upload_sign` — GetUploadSign(biz)
- `POST` `/api/biz/v1/common/mget_asset_info` — MGetAssetInfo, MGetAssetInfoWeb(app_id, asset_ids, need_transcode, uid, workspace_id)
- `POST` `/api/biz/v1/common/mget_video_info` — MGetVideoInfo(biz, vids)
- `POST` `/api/biz/v1/common/report` — Report(description, item_id, scene, tag_list, task_detail, task_id)
- `POST` `/api/biz/v1/common/sync_asset_to_everphoto` — SyncAssetToEverPhoto(asset_type, invisible, need_transcode, no_occupy, source_type, uid, url, vid, workspace_id)
- `POST` `/api/biz/v1/common/transfer_material` — TransferMaterial(asset_id, id, scene, workspace_id)
- `POST` `/api/biz/v1/context/generate_ids` — GetContextGenerateIDs(page, page_size, uid)
- `POST` `/api/biz/v1/context/generate_infos` — GetContextGenerateInfos(generate_id_list, uid)
- `POST` `/api/biz/v1/context/generate_light_infos` — ListGenerateLightInfos, ListGenerateLightInfosWeb(generate_ids, generate_type, generate_type_list, offset, size, title, uid)
- `POST` `/api/biz/v1/context/history` — GetContextHistory, GetContextHistoryWeb(generate_id, page, page_size, uid, with_latest)
- `POST` `/api/biz/v1/context/history_delete` — DelContextHistory, DeleteContextHistoryWeb(delete_all, generate_id, uid)
- `POST` `/api/biz/v1/context/history_update` — UpdateContextHistoryBusinessInfo(business_info, generate_id, generate_version, if_notify_meta, not_notify, uid)
- `POST` `/api/biz/v1/context/message` — GetContextHistoryMessage, GetContextHistoryMessageWeb(generate_id, generate_version, sequence_end, sequence_start, uid, with_latest)
- `POST` `/api/biz/v1/creativity/exposure/write` — WriteCreativeExposure(items)
- `POST` `/api/biz/v1/creativity/query` — QueryCreatives(homepage_sub_scene, is_new_user, page, query_conditions, scene)
- `POST` `/api/biz/v1/creativity/strategy/detail` — GetCreativeStrategies(extra, strategy_names)
- `POST` `/api/biz/v1/debug/create_debug_task` — CreateDebugTaskWeb(agent_config, agent_version, debug_config, env, generate_count, generate_id, inspiration_id, is_web, prompt_sug_id, req_extra, scene, sug_words, task_config, user_config)
- `POST` `/api/biz/v1/debug/create_tts_task` — CreateTTSTaskWeb(script, tone_id)
- `POST` `/api/biz/v1/debug/search_music` — SearchMusic(count, offset, scene, user_input)
- `POST` `/api/biz/v1/debug/update_debug_task` — UpdateDebugTaskWeb(agent_version, content, env, extra, generate_id, is_new_task, is_web, scene, stage, user_config)
- `POST` `/api/biz/v1/digital_human/filter_config` — DigitalHumanFilterConfig()
- `POST` `/api/biz/v1/digital_human/get_fixed_position` — GetFixedPositionDigitalHuman(uid)
- `POST` `/api/biz/v1/digital_human/recommend_by_tag` — RecommendDigitalHumanByTag(count, cursor, dsl_filter_query, ratio_list, region, req_id)
- `POST` `/api/biz/v1/editor/create_generate_videos` — CreateGenerateVideos(Option, PostbackArgs, RenderTaskId, Scene, StoryboardNumber, UserInfo, UserPromptInfos, storyboardID)
- `POST` `/api/biz/v1/editor/create_generate_videos_deduct` — CreateGenerateVideosDeduct(Option, PostbackArgs, RenderTaskId, Scene, StoryboardNumber, UserInfo, UserPromptInfos, storyboardID)
- `POST` `/api/biz/v1/editor/create_tts_avatar_task` — CreateTtsAvatarTask(digital_human_id, digital_human_type, draft_sub_type, is_lip_sync, lip_sync_video, no_digital_human, render_task_id, storyboard_id, storyboard_number, time_range, tts_avatar_info_list, tts_avatar_type, tts_global_options, user_info, vimo_id)
- `POST` `/api/biz/v1/editor/get_bind_jianying_accounts` — GetBindJianyingAccounts()
- `POST` `/api/biz/v1/editor/get_bind_pippit_accounts` — GetBindPippitAccounts(jianying_uid, token)
- `POST` `/api/biz/v1/editor/get_package_info` — GetPackageInfo(draft_key, entrance_from, novel_extra, package_id, render_task_id)
- `POST` `/api/biz/v1/editor/get_package_info_lite` — GetPackageInfoLite(draft_key, entrance_from, novel_extra, package_id, render_task_id, uid, workspace_id)
- `POST` `/api/biz/v1/editor/get_pippit_user_info` — GetPippitUserInfo(jianying_uid, pippit_uid, token)
- `POST` `/api/biz/v1/editor/get_platform_material_detail` — GetPlatformMaterialDetail(material_ids, material_type, source_platform)
- `POST` `/api/biz/v1/editor/get_t2v_task_count` — GetT2vTaskCount(user_id)
- `POST` `/api/biz/v1/editor/list_platform_category` — ListPlatformCategory(source_platform)
- `POST` `/api/biz/v1/editor/list_platform_material` — ListPlatformMaterial(ConditionList, Count, Cursor)
- `POST` `/api/biz/v1/editor/query_generate_videos` — QueryGenerateVideos(task_id)
- `POST` `/api/biz/v1/editor/query_tts_avatar_task` — QueryTtsAvatarTask(task_id)
- `POST` `/api/biz/v1/editor/re_transfer` — ReTransfer(data, jianying_uid, pippit_uid, token)
- `POST` `/api/biz/v1/editor/search_platform_material` — SearchPlatformMaterial(condition_list, count, cursor)
- `POST` `/api/biz/v1/editor/unbind_user` — UnBindUser(jianying_uid)
- `POST` `/api/biz/v1/editor/unbind_user_for_jianying` — UnBindUserForJianying(jianying_uid, pippit_uid, token)
- `POST` `/api/biz/v1/editor/upload_file` — UploadFile(file_content, file_name)
- `POST` `/api/biz/v1/inspiration/batch_get_interaction_status` — BatchGetInspirationInteractionStatus(action, inspiration_id_list)
- `POST` `/api/biz/v1/inspiration/batch_mark_badge_show_status` — BatchMarkBadgeShowStatus(badge_id_list)
- `POST` `/api/biz/v1/inspiration/create_inspiration` — CreateInspiration(generate_id, inspiration_id, material_list, uid, workspace_id)
- `POST` `/api/biz/v1/inspiration/create_inspiration_automatically` — CreateInspirationAutomatically(auth_key, extension, generate_id, inspiration_id, inspiration_type, material_list, uid, workspace_id)
- `POST` `/api/biz/v1/inspiration/create_inspiration_for_image` — CreateInspirationForImage(generate_id, inspiration_id, material_list, uid, workspace_id)
- `POST` `/api/biz/v1/inspiration/create_inspiration_for_omni` — CreateInspirationForOmni(generate_id, inspiration_id, material_list, uid, workspace_id)
- `POST` `/api/biz/v1/inspiration/create_ugc_inspiration` — CreateUgcInspiration(activity_id_list, challenge_topic, inspiration_type, is_public_material, report_event_info, source_task_info, special_setting, specified_result_id, specified_result_platform, title, version, workspace_id)
- `POST` `/api/biz/v1/inspiration/delete_ugc_inspiration` — DeleteUgcInspiration(inspiration_id)
- `POST` `/api/biz/v1/inspiration/detail_list` — GetDetailInspirationList(inspiration_ids, req_type, req_version, with_image_watermark_info, with_video_watermark_info)
- `POST` `/api/biz/v1/inspiration/details` — GetDetailInspirations(cursor, direction, inspiration_pool_id, num, req_version, tab, with_image_watermark_info, with_video_watermark_info)
- `POST` `/api/biz/v1/inspiration/feature_tab` — GetInspirationFeatureTab(tab)
- `POST` `/api/biz/v1/inspiration/feed` — GetInspirations(cursor, direction, inspiration_pool_id, num, req_version, tab)
- `POST` `/api/biz/v1/inspiration/get_drama_hot_topic` — GetDramaHotTopic()
- `POST` `/api/biz/v1/inspiration/get_drama_sug_item` — GetDramaSugItem()
- `POST` `/api/biz/v1/inspiration/get_inspiration_detail` — GetInspirationDetail(inspiration_id_list, with_image_watermark_info, with_video_watermark_info)
- `POST` `/api/biz/v1/inspiration/get_inspiration_tab_config` — GetInspirationTabConfig()
- `POST` `/api/biz/v1/inspiration/get_published_inspiration_detail` — GetPublishedInspirationDetail(inspiration_id_list, with_image_watermark_info, with_video_watermark_info)
- `POST` `/api/biz/v1/inspiration/get_random_story_outline_template` — GetRandomStoryOutlineTemplate(count, with_cover)
- `POST` `/api/biz/v1/inspiration/get_user_business_extra_info` — GetUserBusinessExtraInfo()
- `POST` `/api/biz/v1/inspiration/interactions` — GetInspirationInteractions(inspiration_id)
- `POST` `/api/biz/v1/inspiration/interactive/add_episode` — AddInteractDramaEpisode(episode, parent)
- `POST` `/api/biz/v1/inspiration/interactive/delete_episodes` — DeleteInteractDramaEpisodes(episode_ids)
- `POST` `/api/biz/v1/inspiration/interactive/get_story_dag` — GetInteractDramaStoryDag(story_id, story_namespace)
- `POST` `/api/biz/v1/inspiration/interactive/update_episode` — UpdateInteractDramaEpisode(episode)
- `POST` `/api/biz/v1/inspiration/like` — InspirationLike(action, inspiration_id, tab)
- `POST` `/api/biz/v1/inspiration/list_challenge_tools` — ListChallengeTools()
- `POST` `/api/biz/v1/inspiration/list_feed_challenge` — ListFeedChallenge(count, inspiration_pool_id, offset)
- `POST` `/api/biz/v1/inspiration/list_feed_inspiration` — ListFeedInspiration(count, inspiration_pool_id, stream_type, tab)
- `POST` `/api/biz/v1/inspiration/list_for_fission` — ListInspirationForFission(inspiration_ids)
- `POST` `/api/biz/v1/inspiration/list_inspiration_activity` — ListInspirationActivity(page_num, page_size)
- `POST` `/api/biz/v1/inspiration/list_published_inspiration` — ListPublishedInspiration(count, offset, scene)
- `POST` `/api/biz/v1/inspiration/list_related_remix` — ListRelatedRemix(challenge_group_id, count, direction, enter_from, inspiration_pool_id, offset)
- `POST` `/api/biz/v1/inspiration/list_supported_templates` — ListSupportedTemplates(ref_tpl_id)
- `POST` `/api/biz/v1/inspiration/locate_challenge_position` — LocateChallengePosition(challenge_group_id, inspiration_id)
- `POST` `/api/biz/v1/inspiration/mylikes` — GetMyLikeInspirations(cursor, direction, max_time_seconds, num)
- `POST` `/api/biz/v1/inspiration/send_client_event` — SendClientEvent(branch_select_info, event_type, inspiration_id_list, session_id, tab)
- `POST` `/api/biz/v1/inspiration/sug_words` — GetInspirationSugs(type)
- `POST` `/api/biz/v1/inspiration/update_inspiration` — UpdateInspiration(app_id, auth_key, changed_field_name, changed_field_value, inspiration_id, manual_upload_resource_info, operate_type)
- `POST` `/api/biz/v1/inspiration_i18n/create_agent_inspiration` — CreateAgentInspirationForI18n(auth_key, image, input_url_list, prompt, type)
- `POST` `/api/biz/v1/inspiration_i18n/create_inspiration` — CreateInspirationForI18n(auth_key, image, prompt, type)
- `POST` `/api/biz/v1/inspiration_i18n/update_inspiration` — UpdateInspirationForI18n(app_id, auth_key, changed_field_name, changed_field_value, inspiration_id, manual_upload_resource_info, operate_type)
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_detail` — GetInspirationDetailOversea(inspiration_id_list)
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_feature_tab_config` — GetInspirationFeatureTabConfigOversea()
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_feed_list` — GetInspirationFeedListOversea(count, cursor, inspiration_pool_id, stream_type, tab_type)
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_liked_list` — GetInspirationLikedListOversea(count, cursor)
- `POST` `/api/biz/v1/inspiration_oversea/get_inspiration_tab_config` — GetInspirationTabConfigOversea()
- `POST` `/api/biz/v1/inspiration_oversea/update_inspiration_like_status` — UpdateInspirationLikeStatusOversea(action_type, inspiration_id)
- `POST` `/api/biz/v1/material/ark_generate_callback` — ArkCallback(content, created_at, duration, error, execution_expires_after, frames, frames_per_second, id, model, ratio, resolution, revised_prompt, seed, service_tier, status, updated_at)
- `POST` `/api/biz/v1/material/batch_get` — BatchGetMaterial(material_ids, material_type, source_platform)
- `POST` `/api/biz/v1/material/create_task` — CreateTask(action_list, material_list, scene, user_info, user_input)
- `POST` `/api/biz/v1/material/preprocess` — PreprocessMaterial(material_list, scene, user_info)
- `POST` `/api/biz/v1/memory/get_user_memory` — GetUserMemoryWeb(scene, uid)
- `POST` `/api/biz/v1/montage/get_montage_sug` — GetMontageSug(assets)
- `POST` `/api/biz/v1/notice/list` — GetNoticeList(count, cursor, notice_type_list)
- `POST` `/api/biz/v1/notice/unread_count` — GetNoticeUnreadCount(notice_type_list)
- `POST` `/api/biz/v1/novel_agent/novel_script_save` — NovelScriptSave(artifact_id, modify, uid, workspace_id)
- `POST` `/api/biz/v1/omni/audio_to_text` — AudioToText(audio_url, duration, md5, workspace_id)
- `POST` `/api/biz/v1/omni/batch_delete_digital` — DeleteDigital(img_list)
- `POST` `/api/biz/v1/omni/before_create_limit_check` — CheckOmniTaskLimit(commercial_config)
- `POST` `/api/biz/v1/omni/get_fixed_position` — GetFixedPositionOmniImgList()
- `POST` `/api/biz/v1/omni/get_hot_audio_list` — GetOmniAudioList(count, cursor)
- `POST` `/api/biz/v1/omni/get_img_category_list` — GetOmniHotImgCategoryList()
- `POST` `/api/biz/v1/omni/get_img_list` — GetOmniHotImgList(count, cursor, id, image_list, recommend)
- `POST` `/api/biz/v1/omni/get_tone_list` — GetToneList(count, cursor)
- `POST` `/api/biz/v1/omni/get_user_img_list` — GetUserOmniImgList(count, cursor)
- `POST` `/api/biz/v1/omni/image_object_detect` — ImageObjectDetect(img_info, workspace_id)
- `POST` `/api/biz/v1/omni/preprocess_submit_request` — PreprocessSubmitRequest(preprocess_material_list)
- `POST` `/api/biz/v1/omni/retry_task` — RetryOmniTask(commercial_config, generate_id, task_input, task_output)
- `POST` `/api/biz/v1/omni/text_to_speech` — TextToSpeech(timbre_info)
- `POST` `/api/biz/v1/omni/try_task` — TryOmniTask(all_mask_image_list, all_object_image_list, audio_info, commercial_config, event_info, generate_id, generate_pipeline, img_info, inspiration_id, is_retry, uid, use_wrap, workspace_id)
- `POST` `/api/biz/v1/parse/check_input_valid` — CheckUserInputParse(need_caption, type, uid, user_input, user_prompt)
- `GET` `/api/biz/v1/preset/get_prompt_sug` — GetPromptSug(gen_type)
- `POST` `/api/biz/v1/preset/image_example` — GetImageExample(generate_id, image_creative_context, image_generate_context, image_intent_context, planning, prompt_sug_id, task_name)
- `POST` `/api/biz/v1/preset/video_example` — GetVideoExample(generate_id, planning, prompt_sug_id, task_name, video_creative_context, video_generate_context, video_intent_context)
- `POST` `/api/biz/v1/remix/characters/get` — GetRemixCharactersList(cursor, inspiration_id, is_test, page_size, search_name, settings)
- `POST` `/api/biz/v1/remix/get_build_info` — GetRemixBuildInfo(thread_id)
- `POST` `/api/biz/v1/remix_tools/crop_image` — CropImage(image_url, target_ratio)
- `POST` `/api/biz/v1/remix_tools/get_drama_sug_info` — GetDramaSugInfo(drama_ending_hook_id, drama_sug_link_id, drama_summary_link_id, inspiration_id, is_end)
- `POST` `/api/biz/v1/remix_tools/list` — ListSupportedTools(context)
- `POST` `/api/biz/v1/security/async/batch_query` — SecurityCheckAsyncBatchQuery(query_list)
- `POST` `/api/biz/v1/security/check` — SecurityCheck, SecurityCheckWeb(agent_name, audio_list, file_list, image_list, pippit_asset_id, scene, skip_face_detection, text_list, video_list)
- `POST` `/api/biz/v1/share/info` — GetShareInfo(for_app, share_id)
- `POST` `/api/biz/v1/skill/get_skill_install_command` — GetSkillInstallCommand(base)
- `POST` `/api/biz/v1/skill/get_thread` — GetThreadForSkill(after_seq, limit, run_id, scopes, thread_id, version)
- `POST` `/api/biz/v1/skill/list_thread_file` — ListThreadFileForSkill(base, page_num, page_size, thread_id)
- `POST` `/api/biz/v1/skill/report_telemetry` — ReportSkillTelemetry(arch, base, cli_version, event, platform, skill_name, source)
- `POST` `/api/biz/v1/skill/submit_run` — SubmitRunForSkill(agent_name, asset_ids, message, thread_id)
- `POST` `/api/biz/v1/speech/asr_access_config` — GetSpeechASRAccessConfig(base, client_version, device_platform, entry_id, extra, language, region, scene, task_type, user_info)
- `POST` `/api/biz/v1/task/query` — GetTaskQuery(run_id)
- `POST` `/api/biz/v1/tcc/get_config` — GetTCCConfig(config_names)
- `POST` `/api/biz/v1/tcc/get_config_without_login` — GetTCCConfigWithoutLogin(config_names)
- `POST` `/api/biz/v1/template/category/list` — ListPromptTemplateDomesticCategoryExternal(language)
- `POST` `/api/biz/v1/template/creative_works/list` — ListCreativeWorksExternal()
- `POST` `/api/biz/v1/template/get` — GetPromptTemplateDomesticExternal(language, template_id)
- `POST` `/api/biz/v1/template/homepage/creative_works/list` — ListHomepageCreativeWorks()
- `POST` `/api/biz/v1/template/list` — ListPromptTemplateDomesticExternal(category_id, generation_mode, page_num, page_size, status)
- `POST` `/api/biz/v1/template_creative/batch_get_usage_count` — BatchGetTemplateUsageCount(tpl_ids)
- `POST` `/api/biz/v1/transfer/batch_get_image` — BatchGetImageByURI(task_ids)
- `POST` `/api/biz/v1/transfer/batch_get_video_url` — BatchGetVideoURL(task_ids, uid)
- `GET` `/api/biz/v1/usage/get_web_daily_quota` — GetWebDailyQuotaWeb(consumer_uid)
- `GET` `/api/biz/v1/user/check_user_beta_access` — CheckUserBetaAccess(device_id)
- `POST` `/api/biz/v1/user/cold_start_activate` — UserColdStartActivate()
- `POST` `/api/biz/v1/user/delete_ak` — DeleteAk(ak_ids)
- `POST` `/api/biz/v1/user/generate_ak` — GenerateAk(expired_at, token_desc, token_name)
- `GET` `/api/biz/v1/user/get_prompt_intent` — GetUserPromptIntent(prompt)
- `POST` `/api/biz/v1/user/get_user_app_setting` — GetUserAppSetting()
- `GET` `/api/biz/v1/user/info` — GetUserInfo()
- `POST` `/api/biz/v1/user/mget_device_setting` — MGetDeviceSettings(device_id)
- `POST` `/api/biz/v1/user/mget_user_setting` — MGetUserSettings()
- `GET` `/api/biz/v1/user/preset_prompts/get` — GetUserPresetPromptsWeb(uid)
- `POST` `/api/biz/v1/user/preset_prompts/save` — SaveUserPresetPromptsWeb(preset_prompts, uid)
- `POST` `/api/biz/v1/user/query_ak` — QueryAk()
- `POST` `/api/biz/v1/user/update_ak` — UpdateAk(access_token_list)
- `POST` `/api/biz/v1/user/update_device_setting` — UpdateDeviceSettings(device_settings)
- `POST` `/api/biz/v1/user/update_user_setting` — UpdateUserSettings(user_settings)
- `POST` `/api/biz/v1/videogen/batch_get_render_task` — BatchGetRenderTask(render_task_ids, uid)
- `POST` `/api/biz/v1/videogen/create_video` — CreateVideo(app_id, device_id, payload, product_id, service, user_id)
- `POST` `/api/biz/v1/videogen/regenerate_video` — RegenerateVideo(app_id, device_id, payload, product_id, service, user_id)
- `POST` `/api/biz/v1/videogen/upload_audio_pre_check` — UploadAudioPreCheck(audio_url)
- `POST` `/api/biz/v1/web_homepage/background/list` — ListWebHomepageBackgroundExternal()
- `POST` `/api/biz/v1/web_homepage/display_content/list` — ListWebHomepageDisplayContentExternal(generation_mode, page, page_size)
- `POST` `/api/biz/v1/web_homepage/homepage/display_content/list` — ListHomepageDisplayContent(generation_mode, page, page_size)
- `POST` `/api/biz/v1/web_homepage/promo_slot/list` — ListWebHomepagePromoSlotExternal()
- `POST` `/api/biz/v1/work/search` — WorkSearch(Base, agent_names, begin_time, count, cursor, end_time, query, work_types)
- `POST` `/api/biz/v1/workspace/get_user_workspace` — GetUserWorkspaceWeb(uid)
- `POST` `/api/v1/asset/namespace_query` — AssetNamespaceQueryV1(Base, file_name, first_directory, page_num, page_size, pippit_asset_id, second_directory, team, uid, update_time)
- `POST` `/api/web/v1/agent/get_state` — GetAgentStateWeb(agent_name, conversation_id, mode, stage)
- `POST` `/api/web/v1/agent/get_thread_share` — GetThreadShareWeb(scopes, share_id)
- `POST` `/api/web/v1/agent/get_thread_share_id` — GetThreadShareIDWeb(expire_after_sec, thread_id)
- `POST` `/api/web/v1/agent/list_web_agent_sug` — ListWebAgentSugWeb(agent_name, prompt)
- `POST` `/api/web/v1/agent/novel/delete_episode` — DeleteEpisode(episode_id, overview_pippit_asset_id)
- `POST` `/api/web/v1/agent/novel/erase_video_subtitle_for_novel_agent` — EraseVideoSubtitleForNovelAgent(pippit_asset_id, shot_id, uid, workspace_id)
- `POST` `/api/web/v1/agent/novel/generate_images` — ImagesGenerate(appearance_asset_id, appearance_pippit_asset_ids, asset_namespace, force_generate, generate_scope, generate_type, node_id, overview_pippit_asset_id, pippit_asset_id)
- `POST` `/api/web/v1/agent/novel/generate_new_episode` — GenerateEpisode(episode_name, episode_title, overview_pippit_asset_id)
- `POST` `/api/web/v1/agent/novel/generate_new_story_board` — GenerateStoryBoard(episode_name, episode_title, overview_pippit_asset_id)
- `POST` `/api/web/v1/agent/novel/get_user_contract` — GetUserContract(consumer_uid)
- `POST` `/api/web/v1/agent/novel/novel_script_save` — NovelScriptSaveWeb(artifact_id, modify, uid, workspace_id)
- `POST` `/api/web/v1/agent/novel/update_ai_script_asset` — UpdateAIScriptAsset(ai_script_asset_id, overview_pippit_asset_id, patch_operations)
- `POST` `/api/web/v1/agent/novel/update_novel_settings` — UpdateNovelSettings(novel_settings, pippit_asset_id)
- `POST` `/api/web/v1/agent/novel/update_script_content` — UpdateScriptContent(only_read, overview_pippit_asset_id, thread_id)
- `POST` `/api/web/v1/agent/update_state` — UpdateAgentStateWeb(agent_name, conversation_id, mode, stage, state)
- `POST` `/api/web/v1/agent/video/ref_image_generate` — RefImageGenerateWeb(scene_type, style_snapshot, tasks, uid, workspace_id)
- `POST` `/api/web/v1/agent/video/storyboard_21_modify` — StoryBoard21ModifyWeb(artifact_id, operations, pippit_asset_id, uid, workspace_id)
- `POST` `/api/web/v1/agent/video/storyboard_21_save` — StoryBoardSave21Web(artifact_id, overview_pippit_asset_id, pippit_asset_id, save_mode, storyboard, uid, workspace_id)
- `POST` `/api/web/v1/agent/video/storyboard_modify` — StoryBoardModifyWeb(artifact_id, operations, pippit_asset_id, uid, workspace_id)
- `POST` `/api/web/v1/agent/video/storyboard_save` — StoryBoardSaveWeb(artifact_id, audio_material_extra_data, storyboard, uid, workspace_id)
- `POST` `/api/web/v1/agent/video/video_state_21_save` — VideoState21SaveWeb(artifact_id, save_mode, uid, video_state, workspace_id)
- `POST` `/api/web/v1/agent/video/video_state_save` — VideoStateSaveWeb(artifact_id, save_mode, uid, video_state, workspace_id)
- `GET` `/api/web/v1/announcement/list` — ListAnnouncementsWeb()
- `POST` `/api/web/v1/asset/search` — WebAssetSearch(Base, asset_types, begin_time, categories, count, cursor, end_time, query, recent_only, source_types)
- `GET` `/api/web/v1/auth/check_web_platform_auth` — CheckWebPlatformAuthWeb(uid)
- `POST` `/api/web/v1/auth/create_cli_login_grant` — CreateCliLoginGrantWeb(callback_url, random_secret_key, scene)
- `POST` `/api/web/v1/auth/exchange_cli_login_grant` — ExchangeCliLoginGrantWeb(grant, random_secret_key)
- `GET` `/api/web/v1/character/create/bootstrap` — WebCharacterCreateBootstrap(Base, scene)
- `POST` `/api/web/v1/character/manage/page` — WebCharacterManagePage(Base, client_type, count, create_methods, cursor, query, scene, scope, selected_character_id, tab_id)
- `POST` `/api/web/v1/character/picker/page` — WebCharacterPickerPage(Base, client_type, count, create_methods, cursor, query, scene, scope, selected_character_id, tab_id)
- `POST` `/api/web/v1/character/realperson/qr/confirm` — WebRealPersonQRConfirm(Base, confirmed, portrait_video_url, session_id, token)
- `POST` `/api/web/v1/character/realperson/qr/create` — WebRealPersonQRCreate(Base, character_desc, character_id, character_name, is_public)
- `POST` `/api/web/v1/character/realperson/qr/query` — WebRealPersonQRQuery(Base, session_id, token)
- `POST` `/api/web/v1/character/realperson/qr/scan` — WebRealPersonQRScan(Base, session_id, token)
- `POST` `/api/web/v1/common/mget_asset_info` — MGetAssetInfoWeb(app_id, asset_ids, need_transcode, uid, workspace_id)
- `POST` `/api/web/v1/common/mget_showcase_asset_info` — MGetShowcaseAssetInfo(app_id, asset_ids, need_transcode, uid, workspace_id)
- `POST` `/api/web/v1/common/upload_file` — UploadFileWeb(asset_type, file, scene)
- `POST` `/api/web/v1/context/generate_light_infos` — ListGenerateLightInfosWeb(generate_ids, generate_type, generate_type_list, offset, size, title, uid)
- `POST` `/api/web/v1/context/history` — GetContextHistoryWeb(generate_id, page, page_size, uid, with_latest)
- `POST` `/api/web/v1/context/history_delete` — DeleteContextHistoryWeb(delete_all, generate_id, uid)
- `POST` `/api/web/v1/context/message` — GetContextHistoryMessageWeb(generate_id, generate_version, sequence_end, sequence_start, uid, with_latest)
- `POST` `/api/web/v1/debug/create_debug_task` — CreateDebugTaskWeb(agent_config, agent_version, debug_config, env, generate_count, generate_id, inspiration_id, is_web, prompt_sug_id, req_extra, scene, sug_words, task_config, user_config)
- `POST` `/api/web/v1/debug/create_tts_task` — CreateTTSTaskWeb(script, tone_id)
- `POST` `/api/web/v1/debug/search_music` — SearchMusic(count, offset, scene, user_input)
- `POST` `/api/web/v1/debug/update_debug_task` — UpdateDebugTaskWeb(agent_version, content, env, extra, generate_id, is_new_task, is_web, scene, stage, user_config)
- `POST` `/api/web/v1/memory/get_user_memory` — GetUserMemoryWeb(scene, uid)
- `POST` `/api/web/v1/novel_style_list` — WebNovelStyleList(page, page_size, status)
- `POST` `/api/web/v1/security/check` — SecurityCheckWeb(agent_name, audio_list, file_list, image_list, pippit_asset_id, scene, skip_face_detection, text_list, video_list)
- `GET` `/api/web/v1/skill/list` — ListPresetSkillsWeb()
- `POST` `/api/web/v1/tcc/get_config` — GetTCCConfig(config_names)
- `GET` `/api/web/v1/usage/get_web_daily_quota` — GetWebDailyQuotaWeb(consumer_uid)
- `GET` `/api/web/v1/user/preset_prompts/get` — GetUserPresetPromptsWeb(uid)
- `POST` `/api/web/v1/user/preset_prompts/save` — SaveUserPresetPromptsWeb(preset_prompts, uid)
- `POST` `/api/web/v1/work/search` — WebWorkSearch(Base, agent_names, begin_time, count, cursor, end_time, query, work_types)
- `POST` `/api/web/v1/workspace/get_user_workspace` — GetUserWorkspaceWeb(uid)
- `GET/OPTIONS/POST` `/lv/v1/event/report` — EventReport, EventReportMethodGet, EventReportMethodOptions(custom_info, event_name, params)

## Endpoints por módulo de página (literais presentes no próprio chunk; endpoints usados via SDK compartilhado não aparecem aqui)

- **AgentChat** (11 KB): 0 caminhos
- **AssetManagementMaterialV2** (84 KB): 2 caminhos — /entity/create, web:/entity/manage/page
- **AvatarAndVoice** (44 KB): 0 caminhos
- **HomePageV5** (59 KB): 2 caminhos — /asset/detail, /api/biz/v3/asset/create_v2
- **MarketingAgent** (7 KB): 2 caminhos — /asset/detail, /api/biz/v3/asset/create_v2
- **NestAgentProject** (78 KB): 0 caminhos
- **Novel** (4 KB): 0 caminhos
- **SchedulePublish** (41 KB): 0 caminhos
- **Settings** (164 KB): 1 caminhos — /lv/v1
- **Skill** (24 KB): 0 caminhos
- **SmartCreation** (123 KB): 0 caminhos
- **argus-builder-strategy** (20 KB): 0 caminhos
- **bundle_business-authorization-service** (28 KB): 0 caminhos
- **bundle_common-thirdparty-upload-service** (35 KB): 0 caminhos
- **commerce-customize-digital-human** (19 KB): 0 caminhos
- **common-reporter** (4 KB): 0 caminhos
- **cookie-banner** (0 KB): 0 caminhos
- **customize-digital-human** (6 KB): 0 caminhos
- **dev-panel** (1 KB): 0 caminhos
- **ever_cloud_sdk** (93 KB): 0 caminhos
- **global-age-gate** (4 KB): 1 caminhos — /lv/v1/sc/age_gate/log_in_age_check
- **global-user-email** (1 KB): 0 caminhos
- **help-center** (7 KB): 0 caminhos
- **home-submit-lifecycle** (8 KB): 0 caminhos
- **home** (1 KB): 0 caminhos
- **lazy-creative-works-component** (0 KB): 0 caminhos
- **lib-polyfill** (61 KB): 0 caminhos
- **lib-router** (91 KB): 0 caminhos
- **media-publish** (224 KB): 3 caminhos — /publish/product_add_verify, /publish/product_content_verify, /publish/products
- **pwa-installer** (2 KB): 0 caminhos
- **splash-resource-popup** (20 KB): 0 caminhos
- **title-bar-agent-connect** (1 KB): 0 caminhos
- **title-bar-export-task** (1 KB): 0 caminhos
- **title-bar-language** (1 KB): 0 caminhos
- **title-bar-notification** (1 KB): 0 caminhos
- **title-bar-subscribe** (5 KB): 0 caminhos
- **title-bar-user** (1 KB): 0 caminhos
- **us-ban-notify** (1 KB): 0 caminhos

### Chunks genéricos com mais caminhos (SDKs/clientes compartilhados)

- `async__889795.256f74ebdf.js`: 305 caminhos
- `async__599038.863e145e5b.js`: 220 caminhos
- `async__450621.76fe1df8ae.js`: 199 caminhos
- `async__141985.681aa9d9ef.js`: 92 caminhos
- `async__691333.a6f2d6cec4.js`: 59 caminhos
- `async__148472.1deaf815b3.js`: 34 caminhos
- `async__948162.8eb53cf747.js`: 34 caminhos
- `async__973395.f4cda13762.js`: 29 caminhos
- `async__297147.ff7dafe8ef.js`: 25 caminhos
- `async__643916.4be081c651.js`: 9 caminhos
- `async__850206.e38ec15e55.js`: 7 caminhos
- `async__143136.4167321aba.js`: 5 caminhos

## Vínculo página → endpoint (limite da análise estática)
Tentativa: procurar nomes de métodos do SDK (`SubscribeRun`, `GetThread`…) nos chunks de página (MarketingAgent, NestAgentProject, SmartCreation, Skill, AvatarAndVoice, Novel…): **0 ocorrências**. As páginas acessam o SDK por ids numéricos de módulo webpack em chunks compartilhados (`889795`, `599038`, `450621`, `141985`, `691333`), e o REA declara que NÃO resolve relações entre arquivos analisados separadamente. Portanto o mapa "funcionalidade → endpoints" abaixo é indireto (por domínio do caminho e por captura de rede), não por grafo de chamadas. Próximo passo viável: analisar a PASTA inteira de uma vez (grafo de módulos) ou seguir os ids de módulo (`__webpack_require__`) manualmente a partir de cada página.

## Alcance estático página → endpoints (grafo de módulos rspack)

Método: `notes/module_graph.py` divide cada chunk em módulos (`id(e,t,r){…}`), liga `r(<id>)` entre módulos de TODOS os chunks e segue até 12 níveis a partir dos módulos do chunk de cada página; lista os endpoints literais em módulos alcançados (`notes/auth_module_graph.json`). **Alcançável ≠ chamado**: inclui utilitários compartilhados; não foi possível isolar um conjunto "comum" (a página Novel não alcança nenhum literal); por isso as listas abaixo incluem os endpoints compartilhados de commerce (c:v3/c:v1) em quase todas as páginas e só os DOMÍNIOS mais frequentes são mostrados. Lista completa por página: `notes/auth_module_graph.json`. 6.232 módulos; 61 contêm literais de endpoint (clientes SDK).

- **AgentChat** — 132 específicos; por domínio: c:v3×30, c:v1×27, digital_human×12, ×11, lv:effect×6, asset×5, marketing×5, videogen×5, lv:editor×5, speech×4
- **AssetManagementMaterialV2** — 110 específicos; por domínio: c:v3×30, c:v1×26, character×11, web:character×8, asset×7, speech×4, ×3, entity×3, web:entity×3, lv:product×3
- **AvatarAndVoice** — 98 específicos; por domínio: c:v3×30, c:v1×27, digital_human×10, ×6, videogen×5, lv:effect×5, lv:product×3, asset×2, product×2, c:v2×2
- **HomePageV5** — 101 específicos; por domínio: c:v3×30, c:v1×27, digital_human×10, ×7, videogen×5, lv:effect×5, asset×3, lv:product×3, product×2, c:v2×2
- **MarketingAgent** — 134 específicos; por domínio: c:v3×30, c:v1×27, digital_human×12, ×11, asset×6, lv:effect×6, marketing×5, videogen×5, lv:editor×5, speech×4
- **NestAgentProject** — 166 específicos; por domínio: c:v3×30, c:v1×27, ×13, digital_human×12, character×11, asset×9, web:character×8, lv:effect×6, marketing×5, videogen×5
- **SchedulePublish** — 9 específicos; por domínio: publish×5, videogen×2, product×1, reward_task×1
- **Settings** — 67 específicos; por domínio: c:v3×30, c:v1×26, user×4, c:v2×2, ×2, reward_task×1, lv:commerce×1, lv:user×1
- **Skill** — 15 específicos; por domínio: ×3, lv:product×3, asset×2, product×2, videogen×2, agent×1, reward_task×1, lv:render_task×1
- **SmartCreation** — 73 específicos; por domínio: c:v3×30, c:v1×26, lv:product×3, ×2, asset×2, product×2, videogen×2, c:v2×2, common×1, reward_task×1
- **commerce-customize-digital-human** — 61 específicos; por domínio: c:v3×30, c:v1×26, c:v2×2, digital_human×1, lv:commerce×1, lv:upload_sign×1
- **help-center** — 4 específicos; por domínio: videogen×2, common×1, product×1
- **media-publish** — 6 específicos; por domínio: publish×3, videogen×2, product×1
- **title-bar-agent-connect** — 63 específicos; por domínio: c:v3×30, c:v1×26, user×4, c:v2×2, lv:commerce×1
- **title-bar-export-task** — 20 específicos; por domínio: ×6, lv:product×3, asset×2, digital_human×2, product×2, videogen×2, omni×1, reward_task×1, lv:common_task×1
- **title-bar-language** — 1 específicos; por domínio: user×1
- **title-bar-notification** — 6 específicos; por domínio: lv:notice×3, videogen×2, product×1
- **title-bar-subscribe** — 60 específicos; por domínio: c:v3×30, c:v1×26, c:v2×2, reward_task×1, lv:commerce×1
- **title-bar-user** — 60 específicos; por domínio: c:v3×30, c:v1×26, c:v2×2, reward_task×1, lv:commerce×1

## Domínios sem alcance estático (não presumir funcionalidade ativa)
Pelo grafo `notes/module_graph.py`, nenhuma página do app logado alcança literais de `inspiration` (46), `remix_tools`, `cc_web/ad_maker` (7), `workspace`, `template` e `skill/*` do SDK. Alcançam: `omni` (AgentChat, MarketingAgent, NestAgentProject, export-task), `digital_human` (AgentChat, AvatarAndVoice, HomePageV5, MarketingAgent, NestAgentProject), `speech` (AgentChat, AssetManagementMaterialV2, MarketingAgent, NestAgentProject), `marketing` (AgentChat, MarketingAgent, NestAgentProject), `publish` (SchedulePublish, media-publish). Arquitetura: itens da barra de título são contribuições registradas num serviço de configuração de UI (`TitleBarAgentConnect` ordem 101 à direita, oculto em PC embutido; `TitleBarExportTask` ordem 4).

## Chamadas OBSERVADAS em execução (somente leitura; REA, 21/10/2026)

Capturas de rede do REA (`events:["network"]`) ao abrir 8 páginas: home, marketing-agent, skill, asset-management-material, avatar-and-voice, story-studio/list e o projeto de Canvas existente (evidências `ev_f0dca9be…`, `ev_a69677f0…`, `ev_f373a49c…`, `ev_2c46c3fc…`, `ev_b13f01b4…`, `ev_fe5846b5…`, `ev_c92211e2…`). Fonte dos nomes/status: requisições diretas e eventos `http` embutidos na telemetria da própria página (só método, caminho e status — corpos de resposta NÃO foram retidos). 53 chamadas distintas, todas HTTP 200. Nenhuma inicia geração ou altera dados: são listagens, configurações, notificações e assinaturas de ativos. Arquivo bruto: `notes/observed_calls.json`.

| método | caminho | status | páginas |
|---|---|---|---|
| GET | `/api/biz/v1/invite/invite_conf` | 200 | assets, avatar, canvas, marketing, skill, story |
| GET | `/api/biz/v1/reward_task/list` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| GET | `/api/biz/v1/user/bui` | 200 | assets, avatar, marketing, skill, story |
| GET | `/api/biz/v1/user/fetch_email_status` | 200 | assets, avatar, canvas, marketing, skill, story |
| GET | `/api/biz/v3/character/create/bootstrap` | 200 | assets |
| GET | `/jsonp/commerce/v1/subscription/user_info` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| POST | `/api/account/v1/get_bind_account_list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/account/v1/limit` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/account/v1/settings` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/agent/get_available_model_list` | 200 | assets, canvas, home, marketing |
| POST | `/api/biz/v1/agent/get_web_agent_setting` | 200 | marketing, skill |
| POST | `/api/biz/v1/agent/list_creative_project` | 200 | canvas |
| POST | `/api/biz/v1/agent/list_project_file` | 200 | canvas |
| POST | `/api/biz/v1/agent/list_showcase` | 200 | story |
| POST | `/api/biz/v1/agent/list_skill_store` | 200 | marketing, skill |
| POST | `/api/biz/v1/agent/list_skill_tag` | 200 | skill |
| POST | `/api/biz/v1/agent/list_user_history` | 200 | canvas |
| POST | `/api/biz/v1/agent/novel_style_list` | 200 | story |
| POST | `/api/biz/v1/agent/user_subscribe_callback` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/asset/namespace_query` | 200 | canvas |
| POST | `/api/biz/v1/asset/query` | 200 | canvas |
| POST | `/api/biz/v1/asset/sse_asset` | 200 | canvas |
| POST | `/api/biz/v1/asset/subscribe_asset` | 200 | canvas |
| POST | `/api/biz/v1/benefit/notice/list` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| POST | `/api/biz/v1/commerce/get_commerce_auth_info` | 200 | marketing |
| POST | `/api/biz/v1/common/get_pay_for_best_info` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/common/im_access` | 200 | assets, avatar, skill, story |
| POST | `/api/biz/v1/digital_human/get_item_list` | 200 | avatar, canvas, marketing |
| POST | `/api/biz/v1/home/recommend_video` | 200 | assets, avatar, marketing, skill, story |
| POST | `/api/biz/v1/marketing/get_marketing_hooks` | 200 | marketing |
| POST | `/api/biz/v1/marketing/get_marketing_showcases` | 200 | marketing |
| POST | `/api/biz/v1/product/list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/smart_creation/list_offline_recommend` | 200 | canvas, home, marketing, skill, story |
| POST | `/api/biz/v1/user/click_id` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/user/profile` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v1/videogen/digital_human_filter_config` | 200 | canvas, marketing |
| POST | `/api/biz/v2/common/generation_task_list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/api/biz/v2/videogen/check` | 200 | story |
| POST | `/api/biz/v3/asset/search` | 200 | assets |
| POST | `/api/biz/v3/character/manage/page` | 200 | assets |
| POST | `/api/biz/v3/context/generate_light_infos` | 200 | assets, avatar, marketing, skill, story |
| POST | `/commerce/v1/benefits/credit_receive` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| POST | `/commerce/v1/benefits/user_credit` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| POST | `/commerce/v1/common/start_up` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/commerce/v1/record_resource_action` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/commerce/v1/resource_position` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/commerce/v1/subscription/cc_price_list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/commerce/v3/benefits/batch_get_user_benefit` | 200 | assets, avatar, canvas, home, marketing, skill, story |
| POST | `/commerce/v3/resource/benefit_metadata` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/lv/v1/common_task/list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/lv/v1/notice/get_notice_list` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/lv/v1/notice/get_unread_count` | 200 | assets, avatar, canvas, marketing, skill, story |
| POST | `/lv/v1/sc/age_gate/log_in_age_check` | 200 | assets, avatar, canvas, marketing, skill, story |

Não observado (exigiria gerar conteúdo/créditos): `agent/submit_run`, `subscribe_run`, `get_run`, `cancel_run`, `get_thread`, `context/message`, criação de avatar/voz, exportação. Ligações novas por evidência: as listas de Hook/Visual style/Ad formats vêm de `marketing/get_marketing_hooks` e `get_marketing_showcases`; a loja de skills de `agent/list_skill_store` + `list_skill_tag`; o Estúdio de histórias usa `agent/novel_style_list`, `list_showcase`, `videogen/check`; o Canvas assina eventos de ativos (`asset/subscribe_asset`, `asset/sse_asset`) e lista histórico/projetos (`list_user_history`, `list_project_file`, `list_creative_project`).


## Teste de envio autorizado (21/10/2026, REA `ev_b826a57b7c141a5a797ac088bbbf4df3e9c4bb31d76dbea11cc5ea3d8b903a73`)
Modo Image, GPT Image 2, 1K, prompt curto, clique em Submit (conta Free): **nenhuma geração foi iniciada e nenhum crédito foi cobrado**; a interface abriu o modal de assinatura ("Subscribe To Boost Your Business… Go Starter now for unlimited use of GPT Image2 Low 1K"; planos Starter/Plus/Pro com 40% de desconto), ou seja, o bloqueio por plano acontece NO CLIENTE, antes de qualquer `submit_run`. Rede durante o teste: apenas leituras (`generation_task_list` ×4, `common_task/list` ×4, `resource_position` ×4, `render_task/count`, preços `cc_price_list`, `batch_get_user_benefit`). Portanto o protocolo `submit_run/subscribe_run/get_run/cancel_run` continua NÃO observado em execução. Para observá-lo é preciso escolher um modelo permitido ao plano Free (ex. Seedream 5.0 Pro, "1 free use", 10 créditos/imagem exibidos).

### 2º e 3º testes de envio (21/10/2026)
- `ev_46bb095d…be80`: Seedream 5.0 Pro com texto via `fill` → o botão Submit não reagiu (nenhuma requisição após o clique); o editor do compositor só reconhece digitação por teclas.
- `ev_380a6aa9…e5c6`: mesmo teste digitando "red apple" tecla a tecla → o clique em Submit abriu o modal de assinatura ("Go Starter now for unlimited use of Dreamina Seedream 5.0 Pro 1K"), sem requisição de geração e sem cobrança (saldo 125 inalterado).
- Custos exibidos no compositor: imagem GPT Image 2 = 6, Seedream 5.0 Pro = 10 créditos/imagem; vídeo Seedance 2.0 Mini (Trial) 10 s 720p = 70. O bloqueio por plano ocorre no cliente antes de `submit_run`. O protocolo do agente continua sem observação em execução.
- `ev_b7e42671…9938` (autorizado, 28 créditos exibidos): vídeo Seedance 2.0 Mini (Trial), 4 s, 720p (o Trial só tem 720p; slider 4–15 s) → clique em Submit abriu o modal de assinatura "Go Starter now for unlimited use of Dreamina Seedance 2.0 Mini (Trial)"; nenhuma requisição de geração, saldo 125 inalterado. **Conclusão:** nesta conta Free o `submit_run` não pode ser exercitado pelos modos diretos do compositor (todos têm paywall no cliente). Para observar o protocolo é preciso um plano pago ou outra rota que a conta Free permita (a testar sem custo: modo Agent com 555 créditos estimados excede o saldo, portanto também inviável).

## Observado em execução: geração direta de vídeo (21/10/2026)
Ver `PIPPIT_CAPTURE_STATUS.md`, seção "Protocolo do agente OBSERVADO em execução": batch_check_withhold_deduct → create_creative_project → submit_run (agent_name pippit_video_part_agent, tool_name biz/x_tool_name_video_part) → subscribe_run/subscribe_thread (SSE, corpo não lido). Evidência: `captures/auth/autoroute/send2.har` + `rea_har_inspect.json`.

## Protocolo de geração direta observado — relação entre endpoints (21/10/2026)
Fonte: HARs `captures/auth/autoroute/{send2,send3,erro_canvas,ok_canvas}.har` (controlador `cdp_ui.mjs netlog`, sem cabeçalhos/cookies; leitura pelo REA CLI `inspect-web-network-capture`, evidências ev_68227c58…, ev_a5e0ff66…, ev_e3cb04c6…). Cenário: vídeo Auto Route (→ `MiniMax-H3-trial`), 9:16, 4 s, 768P, plano Free, saldo 125 → 113. Falha (prompt de 9 caracteres): run `state 4`; sucesso (prompt de 37): vídeo no canvas.

**Ordem e papel (observado):**
1. `batch_check_withhold_deduct` (×2) — pré-checagem de crédito/benefício por item (`resource_id`, `benefit_type`, `amount`, `high_precision_amount`); resposta `credits_amount:12`, `consume_types:["LimitFree", …]`, `paywall:null`, `status:1`. É o ponto onde o plano decide o paywall (nos modelos GPT Image 2/Seedream/Mini Trial o paywall apareceu no cliente antes de qualquer requisição; aqui não).
2. `create_creative_project` — cria o projeto (`project_id`, `status:1`, `title:""`, `current_thread_id:null`); o título vira "red apple video part" depois (definido pelo servidor/agente).
3. `asset/namespace_create` (`canvas.json` do projeto) e `asset/batch_patch_asset` (`create_canvas_<canvasId>` → `status:"ack"`), `asset/batch_generate_asset_id` (lote de 1000 ids), `asset/subscribe_asset` + `asset/sse_asset` (SSE, conteúdo desconhecido). O `canvasId` vira o sufixo do `thread_id`: `canvas_thread_<canvasId>_pippit_video_part_agent`.
4. `agent/get_thread` antes do envio devolve `ret:"8", errmsg:"Something went wrong. Try again.", data:null` (a thread ainda não existe; não é erro do fluxo); depois do envio devolve `thread.run_list[0]` com estado e `fail_reason`.
5. `agent/submit_run` — cria o run (`run.state:1`, `execute_task_id`, `agent_name`, `run_number:1`, `extra.model_type:"auto"`). `run_id`, `message_id`, `request_id` são UUIDs gerados no cliente; `concurrency_control{policy:1, conflict_key:<canvasId>}`.
6. **O débito ocorre no envio**: `benefits/user_credit` passou de `gift_credit:125` para `113` na primeira chamada após `submit_run` (antes da conclusão do vídeo). Na falha por prompt curto o saldo permaneceu 125 (sem débito).
7. `agent/subscribe_thread` e `agent/subscribe_run` — SSE (`text/event-stream`), sem corpo de requisição legível no HAR; **conteúdo desconhecido** (o 2º `subscribe_run` terminou com erro de protocolo na leitura do Playwright).
8. Polling: `benefits/user_credit` (~2–5 s, `{}` → `data.credit{vip_credit,gift_credit,purchase_credit}`) e `common/generation_task_list` (`{limit:30, cursor:"0", with_meta:true, task_status_list:[6,1,2,4], task_type_list:[1,4,2,3,6]}` → `data.task_results[]{id,task_type,status,result,meta,type,error_code,error_msg}`, `paginator{next_cursor,has_more,total}`; a resposta não mudou de forma entre falha e sucesso nas amostras lidas — a ligação do task ao run não foi comprovada).
9. `agent/get_run` (`{scopes:["entry_list"], run_id, thread_id}`) só foi observado na reabertura do canvas com falha: `run.state:4`, `completed_at`, `fail_reason{code:99999, message, is_not_retryable:false, starling_key:"server_passthrough_content_key", payload:"null", fallback_message, detail}`; a entrada do assistente tem `sub_type:"biz/error"`. O valor de `state` de **sucesso** NÃO foi capturado (não houve get_run/get_thread após o sucesso).
10. Resultado (sucesso): reabertura do canvas lê `agent/list_project_file` (`Files[].Raw.AgentAsset{AssetType:2, PippitAssetID, Video{…}}`, `Filepath:"/workspace/assets/<id>.<n>"`, `IconType:".mp4"`), `asset/query` e `common/mget_asset_info` (768×1344, 4467 ms, `video/mp4`, ~970 KB, `download_url`/`cover_url`/`preview_video_480p`).

**Estados de run conhecidos:** 1 = submetido/em execução (resposta do submit); 4 = falhou (get_run/get_thread). Outros valores (concluído, cancelado, em fila) **desconhecidos**.
**Identificadores:** `project_id` (numérico), `canvasId` (numérico, na URL e no `thread_id`), `run_id`/`message_id`/`request_id` (UUID cliente), `execute_task_id` (numérico servidor), `PippitAssetID` (numérico), `SourceID` (id da mídia no storage). `directGenerationIntent` (UUID na URL `/nest-agent-project`) só existe para disparar o envio ao abrir o canvas; recarregar sem ele não reenvia.
**Validação de servidor observada:** prompt de vídeo ≥ 15 caracteres (`fail_reason.detail`).


## Contratos observados em execução (HARs `captures/auth/autoroute/*.har`; formas, não valores; ids → `<id>`)

### `batch_check_withhold_deduct` — 4 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/commerce/v3/benefits/batch_check_withhold_deduct` · status [200]
- Requisição: `{"action_type": 1, "strict": true, "item_list": [{"resource_type": "aigc", "resource_id": "cc_biz_video_agent_minimaxh3_768p", "benefit_type": "cc_biz_video_agent_minimaxh3_trial_768p", "amount": 1, "high_precision_amount": 4, "submit_id": ""}, "...n=1"], "client_check_group": []}`
- Resposta: `{"ret": "0", "errmsg": "success", "systime": "<id>", "log_id": "20261022013910E1580E16FE79A632F44D", "response": {"json-string": {"status": 1, "action_type": 1, "item_list": [{"resource_type": "aigc", "resource_id": "cc_biz_video_agent_minimaxh3_768p", "benefit_type": "cc_biz_video_agent_minimaxh3_trial_768p", "status": 1, "credits_amount": 12, "benefit_log_id": "", "consume_types": ["LimitFree", "...n=2"], "starling_key": "cc_biz_video_novel_video_generate_minimaxh3_768p_trial", "missing_role": ""}, "...n=1"], "paywall": null, "paywall_type": null, "missing_max_role": "", "target_purchase_type": ""}}, "sign": "<assinatura>", "data": {"status": 1, "action_type": 1, "item_list": [{"resource_type": "aigc", "resource_id": "cc_biz_video_agent_minimaxh3_768p", "benefit_type": "cc_biz_video_agent_minimaxh3_trial_768p", "status": 1, "credits_amount": 12, "benefit_log_id": "", "consume_types": ["LimitFree", "...n=2"], "starling_key": "cc_biz_video_novel_video_generate_minimaxh3_768p_trial", "missing_role": ""}, "...n=1"], "paywall": null, "paywall_type": null, "missing_max_role": "", "target_purchase_type": ""}}`

### `create_creative_project` — 2 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/api/biz/v1/agent/create_creative_project` · status [200]
- Requisição: `{"user_info": {"app_id": "573081", "consumer_uid": "<id>", "space_id": "<id>", "workspace_id": "<id>"}}`
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "20261022013912422EAD647A9E5036E34C", "data": {"project_id": "<num>", "project_info": {"project_id": "<num>", "title": "", "status": 1, "create_time": "<num>", "update_time": "<num>", "team_id": null, "creator_uid": "<id>", "cover_asset_id": null, "cover_source": null, "last_operator_uid": "<id>", "cover_url": null, "current_thread_id": null, "project_credit_summary": null, "current_thread_credit_summary": null, "project_type": "", "creator_nickname": null, "last_operator_nickname": null, "creator_avatar_url": null, "last_operator_avatar_url": null, "visible_novel_thread_ids": null, "clone_run": null, "novel_meta_info": null}}}`

### `get_thread` — 3 ocorrência(s) em ['erro_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v1/agent/get_thread` · status [200]
- Requisição: `{"scopes": ["run_list.entry_list", "...n=1"], "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent"}`
- Resposta: `{"data": null, "errmsg": "Something went wrong. Try again.", "log_id": "2026102201392551C3A7BCA9B8C03692B4", "ret": "8", "svr_time": "<num>"}`
- `run.state` observados: [4]

### `submit_run` — 2 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/api/biz/v1/agent/submit_run` · status [200]
- Requisição: `{"project_id": "<num>", "message": {"content": [{"type": "data", "data": {"json-string": {"param": {"json-string": "{...}"}, "extra": {"json-string": "{...}"}, "tool_name": "biz/x_tool_name_video_part"}}, "sub_type": "biz/x_data_direct_tool_call_req"}, "...n=1"], "role": "user", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent", "run_id": "<uuid>", "created_at": "<num>", "message_id": "<uuid>"}, "user_info": {"consumer_uid": "<id>", "workspace_id": "<id>", "space_id": "<id>", "app_id": "573081"}, "agent_name": "pippit_video_part_agent", "concurrency_control": {"policy": 1, "conflict_key": "<id>"}, "entrance_from": "web_video_direct", "run_extra": {"json-string": {"babi_param": {"edit_type": "integrated_agent", "tool_id": "integrated_agent_canvas", "generate_id": "<uuid>", "user_message_id": "<uuid>", "section_id": "<uuid>", "scene_lv1": "ai_agent", "scene_lv2": "front_tool", "tab_name": "canvas", "enter_from": "home_page_integrated_agent_combo_input_box"}, "client_extra": {"current_page": "/home", "entrance_from": "home_page_integrated_agent_combo_input_box", "generate_mode": "video_gen", "generate_position": "home", "canvas_type": "integrated_agent", "edit_type": "integrated_agent", "project_id": "<num>", "position": "canvas", "tab_name": "canvas", "target": "video", "run_source": "video_part", "placement_name": "canvas"}}}, "request_id": "<uuid>"}`
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "20261022013925361E682725E55134A2E6", "data": {"run": {"run_id": "<uuid>", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent", "state": 1, "entry_list": [{"type": 1, "message": {"message_id": "<uuid>", "role": "user", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent", "run_id": "<uuid>", "content": ["{...}", "...n=1"], "created_at": "<num>", "context_data": {"locale": "", "llm_output_cache": null, "avatar_param": null, "is_pay_for_best": null}, "user_action": {"like_action": 0}, "client_tool_calls": [], "client_tool_resp": [], "sub_agent_info": null}, "artifact": null, "score": null}, "...n=1"], "created_at": "<num>", "updated_at": "<num>", "completed_at": null, "fail_reason": null, "execute_task_id": "<num>", "user_id": "<id>", "agent_name": "pippit_video_part_agent", "extra": {"json-string": {"agent_version": "default", "x_client_info": {"json-string": {"device_id": "0", "os": null, "app_version": "", "os_version": "", "language": "EN", "client_ip": "<ip>", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "sdk_version": null, "sdk_lib": null, "region": null, "platform": "web", "app_version_minor": "0", "custom": "", "channel": null}}, "_TaskBizType": 11, "_trusted_run_execute_performance_sync_stages": {"json-string": []}, "_trusted_run_execute_performance_root_type": "project", "x_user_info": {"json-string": {"workspace_id": "<id>", "space_id": "<id>", "consumer_uid": "<id>", "team_id": 0, "space_idc": "sg1", "app_id": "573081", "business_user_id": "<id>", "device_id": "0", "region": "", "language": "en", "business_region": "BR"}}, "_trusted_run_execute_performance_is_vip": "0", "_trusted_tracking_generate_mode": "video_gen", "request_env": "canary",`
- `run.state` observados: [1]

### `get_run` — 1 ocorrência(s) em ['erro_canvas.har']

- POST `/api/biz/v1/agent/get_run` · status [200]
- Requisição: `{"scopes": ["entry_list", "...n=1"], "run_id": "<uuid>", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent"}`
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "20261022015232D858518ECE2BCA36B4A3", "data": {"run": {"run_id": "<uuid>", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent", "state": 4, "entry_list": [{"type": 1, "message": {"message_id": "<uuid>", "role": "user", "thread_id": "canvas_thread_1219047169540_pippit_video_part_agent", "run_id": "<uuid>", "content": ["{...}", "...n=1"], "created_at": "<num>", "context_data": {"locale": "", "llm_output_cache": null, "avatar_param": null, "is_pay_for_best": false}, "user_action": {"like_action": 0}, "client_tool_calls": [], "client_tool_resp": [], "sub_agent_info": null}, "artifact": null, "score": null}, "...n=2"], "created_at": "<num>", "updated_at": "<num>", "completed_at": "<num>", "fail_reason": {"code": 99999, "message": "Message provided by the server.", "extra": null, "is_not_retryable": false, "starling_key": "server_passthrough_content_key", "payload": "null", "fallback_message": "Message provided by the server.", "detail": "Your prompt must contain at least 15 characters. Please prov"}, "execute_task_id": "<num>", "user_id": "<id>", "agent_name": "pippit_video_part_agent", "extra": {"json-string": {"_trusted_run_execute_performance_sync_stages": {"json-string": []}, "babi_param": {"enter_from": "home_page_integrated_agent_combo_input_box", "tool_id": "integrated_agent_canvas", "generate_id": "<uuid>", "user_message_id": "<uuid>", "scene_lv1": "ai_agent", "tab_name": "canvas", "edit_type": "integrated_agent", "section_id": "<uuid>", "scene_lv2": "front_tool"}, "agent_version": "default", "task_callback_log_id": "20261022013925361E682725E55134A2E6", "request_env": "canary", "_trusted_run_execute_performance_is_vip": "0", "_trusted_run_execute_performance_enabled": true, "execute_log_id_20261`
- `run.state` observados: [4]

### `subscribe_run` — 3 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/api/biz/v1/agent/subscribe_run` · status [200]
- Requisição: (sem corpo)
- Resposta: text/event-stream: corpo nao lido — **conteúdo desconhecido**

### `subscribe_thread` — 3 ocorrência(s) em ['erro_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v1/agent/subscribe_thread` · status [200]
- Requisição: (sem corpo)
- Resposta: text/event-stream: corpo nao lido — **conteúdo desconhecido**

### `generation_task_list` — 28 ocorrência(s) em ['erro_canvas.har', 'ok_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v2/common/generation_task_list` · status [200]
- Requisição: `{"limit": 30, "cursor": "0", "with_meta": true, "task_status_list": [6, "...n=4"], "task_type_list": [1, "...n=5"]}`
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "202610220139057EEEC0BC72D40836F970", "data": {"task_results": [], "paginator": {"next_cursor": "30", "has_more": false, "total": null}}}`

### `user_credit` — 33 ocorrência(s) em ['erro_canvas.har', 'ok_canvas.har', 'send2.har', 'send3.har']

- POST `/commerce/v1/benefits/user_credit` · status [200]
- Requisição: `{}`
- Resposta: `{"ret": "0", "errmsg": "success", "systime": "<id>", "log_id": "20261022013902AA6D96C8C8AEF23136CF", "response": {"json-string": {"credit": {"vip_credit": 0, "gift_credit": 125, "purchase_credit": 0}}}, "sign": "<assinatura>", "data": {"credit": {"vip_credit": 0, "gift_credit": 125, "purchase_credit": 0}}}`

### `sse_asset` — 4 ocorrência(s) em ['erro_canvas.har', 'ok_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v1/asset/sse_asset` · status [200]
- Requisição: (sem corpo)
- Resposta: text/event-stream: corpo nao lido — **conteúdo desconhecido**

### `subscribe_asset` — 8 ocorrência(s) em ['erro_canvas.har', 'ok_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v1/asset/subscribe_asset` · status [200]
- Requisição: (sem corpo)
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "20261022013922A8A7A71729036D2F897E"}`

### `batch_patch_asset` — 8 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/api/biz/v1/asset/batch_patch_asset` · status [200]
- Requisição: (sem corpo)
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "202610220139199286C1EF1D1268382F8A", "data": {"results": [{"transaction_id": "create_canvas_1219047169540", "status": "ack"}, "...n=1"]}}`

### `namespace_create` — 2 ocorrência(s) em ['send2.har', 'send3.har']

- POST `/api/biz/v1/asset/namespace_create` · status [200]
- Requisição: `{"Base": {"Client": "web"}, "namespace_data": [{"FileName": "canvas.json", "PippitAssetID": "<id>", "ProjectID": "<num>"}, "...n=1"]}`
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "2026102201392051C3A7BCA9B8C0368FC0", "data": {"Team": "pippit_asset", "FileName": "canvas.json", "PippitAssetID": "<id>", "ProjectID": "<num>", "team_id": null}}`

### `batch_generate_asset_id` — 6 ocorrência(s) em ['erro_canvas.har', 'ok_canvas.har', 'send2.har', 'send3.har']

- POST `/api/biz/v1/asset/batch_generate_asset_id` · status [200]
- Requisição: (sem corpo)
- Resposta: `{"ret": "0", "errmsg": "", "svr_time": "<num>", "log_id": "2026102201391945180EE00CCF0030C1D4", "data": {"ids": ["<id>", "...n=1000"]}}`


## Conteúdo dos fluxos SSE — lido por replay, sem custo (21/10/2026)
Método: `cdp_ui.mjs` com `Network.streamResourceContent` (CDP) ao reabrir canvases já existentes (sem gerar); arquivos `captures/auth/autoroute/sse_erro_sse.json` e `sse_ok_sse.json` (+ HARs `sse_erro.har`, `sse_ok.har`). **Limite:** é o replay de estado ao conectar, NÃO o fluxo incremental ao vivo durante uma geração (isso exigiria nova geração; não feito). Blocos incrementais de progresso, `enable_chunk_stream` e `stream_cursor` seguem DESCONHECIDOS.
- **`asset/sse_asset`** (`text/event-stream`): `event:ping` `data:connected`; depois `event:AssetJsonUpdate` com `data:{pippit_asset_id, version, content:"<json-string {patches:[{assetId, baseAssetVersion, op:"add", path, value}]}>", start_version, extra:{asset_content_version}}`; termina com `event:ping`. O canvas é um asset JSON versionado (`/content/nodes/<nodeId>` = `{id, type:"biz/video", x, y, w, h, order, parentId:null, data:{}}`); o nó é outro asset com `/content/{assetId, name, source:"generated", subType:"biz/x_data_video", generation, metadata, pippitAssetId}` e `/history/<artifactId>`.
- **`generation` do nó (estado da geração mora aqui):** `{agentName, catalogParameters{aspectRatio,duration,durationSec,ratio,resolution}, catalogScene:"web_video_agent", catalogSource:"home_mode", count, createdAt, durationMs, generateId, modelKey:"MiniMax-H3-trial", prompt, ratio, references[], resolution, runId, runSource:"video_part", source:"generated", state{runId, status, submittedAt, target:"video", threadId, updatedAt, errorMessage?}, submitRunClientExtra{edit_type:"other", entrance_from, generate_mode, model_type:"MiniMax-H3-trial", placement_name}, submittedPrompt, successfulGenerationCount?, lastSuccessfulGenerationRunId?, threadId, videoRatioUpdatedAt}`. **`state.status` observados: `"failed"` (com `errorMessage`) e `"succeeded"`.** Duração do run de sucesso: `submittedAt` 17:56:05,883 → `updatedAt` 17:57:29,778 (≈84 s) para 4 s de vídeo.
- Metadados do vídeo no nó: `{durationMs:4467, width:768, height:1344, …}` (demais campos vazios/0 no nó; os valores reais vêm de `mget_asset_info`).
- **`agent/subscribe_thread`**: `event:message` `data:{run:null, thread:{thread_id, title:"red apple video", run_list:[{run_id, thread_id, state, entry_list:null, created_at, updated_at, completed_at, fail_reason{…}, execute_task_id, user_id, agent_name, extra:"<json-string>"}], extra{thread_message_version:"V3"}}}`; 2 eventos `message` + `event:ping`. `run.state` 4 = falha (confirmado também aqui).
- `agent/subscribe_run`: ainda não lido (a conexão só abre durante a execução do run; na reabertura de canvas concluído não é aberta).
