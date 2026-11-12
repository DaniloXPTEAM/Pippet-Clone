# ENTREGA — rodada 15 (2026-11-12)

## O que a rodada 15 foi

Ordem do usuário: terminar o projeto. (1) dois ajustes primeiro (ffmpeg do WinGet sem caminho fixo; espera do lipsync 60 s); (2) TODAS as linhas investigada/parcial/bloqueada possíveis, uma por uma, cada uma com teste automatizado; (3) `BLOQUEIOS_R15.md` com motivo exato e perguntas objetivas; (4) recontagem rigorosa; (5) entrega atualizada em `mesa_de_operacao/entrega_15`.

## Commits (cada item, com teste)

| commit | item |
|---|---|
| `eea9b74` | 1a — media.mjs varre `Gyan.FFmpeg_*` em qualquer versão, sem nome de usuário (test/winget_ffmpeg.test.mjs) |
| `14033c5` | 1b — lipsync_adapters: teto de espera 60 s |
| `5791db5` | linha 29 — campo de ideia do Chat history (chat_history_idea_ui.test.mjs) |
| `50e29c0` | linha 15 — preços: seções observadas + carrossel de avaliações (pricing_reviews_ui.test.mjs) |
| `b27abcc` | central de notificações — 8 anúncios observados por tema (notifications_editorial_route.test.mjs) |
| `17ad175` | linhas 26/31 — painéis title-bar com metadados observados (titlebar_panels_route.test.mjs) |
| `bafd80c` | linha 24 — Inspiration: áreas nomeadas pelos endpoints dos bundles |
| `6078452` | linha 5 — 9 atalhos do canvas como extensões locais (19/20) |
| `2a8b0c9` | itens 2–4 — FEATURE_INVENTORY atualizado + BLOQUEIOS_R15.md |
| `bb59ae3`/`6c30124` | item 5 — entrega_15 (docs, provas, SHA256SUMS, MANIFESTO) |
| `2d282d7` | revisão pós-entrega — 2 bugs dos testes de UI novos só detectáveis no navegador (rota de chats; innerText vs tags) |

## Recontagem (critério rigoroso: teste automatizado = verificada)

- Escopo reproduzível: **122 linhas** (+12 fora de escopo; 134 no catálogo).
- **Prontas: 30 implementadas + 75 verificadas = 105/122 = 86,1%** (r14: 83/122 = 68,0%).
- Restantes: 9 parciais (falta evidência/externo) + 8 bloqueadas (motivo em BLOQUEIOS_R15.md).
- As 39 linhas-alvo da rodada: 26 verificadas novas, 2 parciais (falta evidência), 8 bloqueadas, 3 já estavam prontas e subiram de estado por auditoria.

## Suíte completa (sandbox Linux, ffmpeg 9.0.2 estático via PIPPIT_FFMPEG/PIPIPIT_FFPROBE)

**Placar: 79 passaram · 56 skip explícito · 0 falharam (de 135).**

Os 112 skips são todos de navegador (Chromium não existe no sandbox; downloads bloqueados) e **rodam no Windows do usuário**.

**Placar: 79 passaram · 56 skip explícito · 0 falharam (de 135).**

Os 56 skips são todos de navegador (Chromium não existe no sandbox; downloads bloqueados) e **rodam no Windows do usuário**.

### Passaram (79)

- account_unobserved_route
- agent_contract
- agent_llm
- agent_skill
- assets_menu
- audio
- auth_structure
- avatar_contract
- avatar_menu_route
- canvas_avatar
- canvas_shortcuts_route
- canvas_toolbar_route
- chat_history_route
- cloudflare_router
- cloudflare_routes
- cloudflare_transcribe
- composer_audio_mode
- composer_controls_route
- credits
- credits_pouches
- directgen
- directgen_http
- e2e
- editor_audio
- editor_canvas
- editor_speed
- env_file
- export_cover_route
- features
- flow_e2e_providers
- free_router
- free_router_blocked_default
- free_router_fallback
- free_router_http
- freellmapi_router
- generator_tools_route
- help_center_route
- imagegen
- inspiration_route
- integrations_route
- lipsync_adapters
- llm
- llm_perf
- local_runs_http
- marketing_ad_formats_route
- marketing_catalog_contract
- no_versioned_writes
- node_generation_route
- nodetools
- notifications_editorial_route
- novai_router
- omni_capabilities_route
- omni_router
- passo_a_passo
- plans
- pricing_faq_route
- promotions_route
- prompt_validation_route
- provider_smoke
- providers
- questionnaire
- router_llm
- silence
- skillpkg
- skills
- skills_official
- studio3d
- supabase_auth
- talking_photo_contract
- talkingphoto_provider
- templates_route
- titlebar_panels_route
- voice_default
- watermark_export
- watermark_preferences
- whisper_local
- winget_ffmpeg
- workflow
- workflow_jobs

### Skip explícito — navegador (56)

- account_more_language_ui
- audio_mode_ui
- auth_google_ui
- auth_ui
- avatar_gallery_ui
- avatar_menu_ui
- billing_structure
- browser_probe
- canvas_existing_project_ui
- canvas_panel_ui
- canvas_shortcuts_ui
- canvas_toolbar_ui
- chat_history_idea_ui
- chat_history_ui
- composer_dropdowns_ui
- directgen_ui
- features_ui
- fidelity2_ui
- fidelity3_ui
- free_router_stack_ui
- free_router_ui
- inspiration_ui
- llm_ui
- local_run_page_recovery
- lote2_ui
- lote3_ui
- marketing_ad_formats_ui
- marketing_entities_ui
- marketing_hooks_ui
- marketing_visual_style_ui
- node_generation_audio_ui
- node_generation_image_ui
- node_generation_text_ui
- node_generation_video_ui
- notifications_ui
- novai_video_ui
- omni_router_ui
- omni_ui
- pageview
- parity
- pricing_faq_ui
- pricing_reviews_ui
- providers_panel
- providers_ui
- publish_queue
- publishing
- route_single_render
- settings_internal_ui
- skill_create_ui
- skills_details_ui
- skills_official_ui
- skills_ui
- talkingphoto_ui
- templates_ui
- titlebar_panels_ui
- ui

### Falharam (0)

(nenhuma)

## Revisão pós-entrega

Antes da sua suíte do Windows, os 5 testes de UI novos foram relidos contra o código: `chat_history_idea_ui` (usava rota inexistente `GET /api/projects/:id/chats`) e `titlebar_panels_ui` (comparava `innerText` com tags HTML) foram corrigidos (`2d282d7`). Textos/atalhos/seletores dos demais conferidos contra a implementação (en-dash dos anúncios, headings de preços, `data-k`/`kstate` do diálogo de atalhos).

## Limites honestos

- Os 112 testes de UI não rodaram aqui: a validação final é o placar do Windows (histórico r13: 126/2/2 de 130).
- UNOBSERVED onde a evidência não existe — nada foi inventado; cada caso está em FEATURE_INVENTORY.md e BLOQUEIOS_R15.md.
- Nenhum push nesta rodada (só com "PUSH AUTORIZADO"); nenhum `--force`; nenhuma chave em lugar nenhum.
- Nada depende de GPU, provedor pago, OAuth ou créditos do Pippit.

## Conteúdo da pasta `entrega_15`

- `STATUS.md` — estado atual + histórico.
- `FEATURE_INVENTORY.md` — inventário atualizado (75 verificadas; recontagem no resumo).
- `BLOQUEIOS_R15.md` — pendências com motivo exato + perguntas objetivas.
- `ENTREGA.md` — este arquivo.
- `suite_rodada15_final.txt` — log completo da suíte.
- `LEIA_PRIMEIRO_NOVA_SESSAO.md` / `PREPARO_PUSH.md` — atualizados.
- `piperline_rodada15.bundle` + `piperline_rodada15.zip` + `SHA256SUMS.txt` — pacote autossuficiente (prova: clone em pasta vazia).
