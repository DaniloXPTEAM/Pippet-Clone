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
