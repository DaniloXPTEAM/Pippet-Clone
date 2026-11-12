# Relatório final — ORDEM B/C

Data: 2026-11-09. Este pacote reúne os arquivos presentes no workspace para reconstrução/separação posterior em commits no PC do usuário. Nenhuma operação Git foi feita para preparar esta entrega; nenhum push foi feito. O inventário de paths abaixo é operacional e pode ter arquivos compartilhados entre mais de um item.

## Implementação por item

**B — geração de nós Canvas pelo roteador gratuito.** Nós Vídeo, Imagem, Áudio e Texto encaminham a ação Gerar ao roteador gratuito/configurável e persistem o resultado no nó/ativo local; sem provedor disponível, a geração fica bloqueada, sem cobrança e sem resultado fictício. Os testes usam provedores/servidores falsos; geração real com provedor não foi executada.

**C1 — Marketing > Ad formats.** Implementado seletor com busca, categorias observadas, Expand/Collapse, Select e chip no composer. Os nomes/controles observados são locais; associação de cada cartão às categorias, descrições completas e prévias reais permanecem não observadas.

**C2 — Marketing > Visual style.** Implementado seletor com busca, cinco categorias e catálogo local de 20 estilos; busca, filtro e seleção são exercitados. Não foram inventados previews nem descrições específicas do serviço.

**C3 — Canvas de projeto existente.** A rota query-compatible abre o projeto/canvas existente; Return to previous page usa o histórico quando disponível; título editável persiste, estado Saved é exibido e reabrir não repete a geração. O teste usa provedor falso e confirma uma única geração.

**C4 — Conta > More e Settings > Language.** More lista CLI, Feature wishlist e Customer service; destinos/ações originais não observados são marcados `UNOBSERVED`. Settings > Language apresenta os 18 idiomas observados e persiste localmente a seleção; não se alega tradução global da interface.

**C5 — painéis da barra de título.** Agent connect e Export tasks abrem painéis-placeholder explicitamente marcados `UNOBSERVED`. Não se inventaram conteúdo, ações ou estados, e os placeholders não iniciam chamadas externas.

## Testes novos por item

- **B:** `free_router.test.mjs`, `free_router_blocked_default.test.mjs`, `free_router_http.test.mjs`, `free_router_ui.test.mjs`, `node_generation_video_ui.test.mjs`, `node_generation_image_ui.test.mjs`, `node_generation_audio_ui.test.mjs`, `node_generation_text_ui.test.mjs`, `node_generation_route.test.mjs`.
- **C1:** `marketing_ad_formats_ui.test.mjs` (contrato de catálogo comum também em `marketing_catalog_contract.test.mjs`).
- **C2:** `marketing_visual_style_ui.test.mjs`.
- **C3:** `canvas_existing_project_ui.test.mjs`.
- **C4:** `account_more_language_ui.test.mjs`.
- **C5:** `titlebar_panels_ui.test.mjs`.

## Resultado da suíte completa

Resultado validado após as alterações de C5 e estabilização do teste `lote3_ui`: **78 passaram, 2 skips explícitos, 0 falhas (80 testes)**. O teste direcionado `titlebar_panels_ui` também passou. Os skips são somente por capturas ausentes no checkout; não contam como aprovação:

- `free_router.test.mjs` — PASS
- `free_router_blocked_default.test.mjs` — PASS
- `marketing_catalog_contract.test.mjs` — PASS
- `templates_ui.test.mjs` — PASS
- `settings_internal_ui.test.mjs` — PASS
- `skills_details_ui.test.mjs` — PASS
- `skill_create_ui.test.mjs` — PASS
- `avatar_menu_ui.test.mjs` — PASS
- `omni_ui.test.mjs` — PASS
- `inspiration_ui.test.mjs` — PASS
- `notifications_ui.test.mjs` — PASS
- `pricing_faq_ui.test.mjs` — PASS
- `composer_dropdowns_ui.test.mjs` — PASS
- `audio_mode_ui.test.mjs` — PASS
- `pageview.test.mjs` — SKIP explícito
- `credits.test.mjs` — PASS
- `plans.test.mjs` — PASS
- `workflow.test.mjs` — PASS
- `canvas_avatar.test.mjs` — PASS
- `studio3d.test.mjs` — PASS
- `directgen.test.mjs` — PASS
- `directgen_http.test.mjs` — PASS
- `features.test.mjs` — PASS
- `llm.test.mjs` — PASS
- `agent_llm.test.mjs` — PASS
- `imagegen.test.mjs` — PASS
- `silence.test.mjs` — PASS
- `skillpkg.test.mjs` — PASS
- `skills.test.mjs` — PASS
- `skills_official.test.mjs` — PASS
- `agent_skill.test.mjs` — PASS
- `nodetools.test.mjs` — PASS
- `audio.test.mjs` — PASS
- `llm_perf.test.mjs` — PASS
- `providers.test.mjs` — PASS
- `editor_audio.test.mjs` — PASS
- `editor_speed.test.mjs` — PASS
- `assets_menu.test.mjs` — PASS
- `credits_pouches.test.mjs` — PASS
- `editor_canvas.test.mjs` — PASS
- `workflow_jobs.test.mjs` — PASS
- `e2e.test.mjs` — PASS
- `parity.test.mjs` — SKIP explícito
- `ui.test.mjs` — PASS
- `directgen_ui.test.mjs` — PASS
- `features_ui.test.mjs` — PASS
- `llm_ui.test.mjs` — PASS
- `skills_ui.test.mjs` — PASS
- `providers_ui.test.mjs` — PASS
- `lote2_ui.test.mjs` — PASS
- `lote3_ui.test.mjs` — PASS
- `skills_official_ui.test.mjs` — PASS
- `publishing.test.mjs` — PASS
- `chat_history_ui.test.mjs` — PASS
- `canvas_panel_ui.test.mjs` — PASS
- `canvas_existing_project_ui.test.mjs` — PASS
- `account_more_language_ui.test.mjs` — PASS
- `titlebar_panels_ui.test.mjs` — PASS
- `avatar_gallery_ui.test.mjs` — PASS
- `marketing_entities_ui.test.mjs` — PASS
- `marketing_ad_formats_ui.test.mjs` — PASS
- `marketing_visual_style_ui.test.mjs` — PASS
- `fidelity2_ui.test.mjs` — PASS
- `fidelity3_ui.test.mjs` — PASS
- `questionnaire.test.mjs` — PASS
- `agent_contract.test.mjs` — PASS
- `avatar_contract.test.mjs` — PASS
- `talking_photo_contract.test.mjs` — PASS
- `talkingphoto_provider.test.mjs` — PASS
- `talkingphoto_ui.test.mjs` — PASS
- `free_router_http.test.mjs` — PASS
- `free_router_ui.test.mjs` — PASS
- `node_generation_video_ui.test.mjs` — PASS
- `node_generation_image_ui.test.mjs` — PASS
- `node_generation_audio_ui.test.mjs` — PASS
- `node_generation_text_ui.test.mjs` — PASS
- `node_generation_route.test.mjs` — PASS
- `local_runs_http.test.mjs` — PASS
- `whisper_local.test.mjs` — PASS
- `watermark_preferences.test.mjs` — PASS

Comando usado na suíte integral:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib PIPPIT_FFMPEG=/tmp/pippet-ffmpeg-py/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2 PIPPIT_FFPROBE=/tmp/pippet-ffmpeg-py/ffprobe npm test
```

## Arquivos modificados/novos agrupados para separação

O manifesto `arquivos_por_item.txt` contém uma linha por arquivo, com `ITEM<TAB>caminho`. Arquivos compartilhados aparecem com item composto no manifesto e são listados em todos os itens aplicáveis abaixo. A classificação corresponde aos arquivos identificados no workspace para esta continuação; os caminhos são fornecidos para facilitar a separação manual dos commits.

### B
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/lib/catalog.mjs`
- `local_reconstruction/app/lib/media.mjs`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/app/server.mjs`
- `local_reconstruction/src/directgen.mjs`
- `local_reconstruction/src/free_router.mjs`
- `local_reconstruction/test/directgen.test.mjs`
- `local_reconstruction/test/directgen_http.test.mjs`
- `local_reconstruction/test/directgen_ui.test.mjs`
- `local_reconstruction/test/free_router.test.mjs`
- `local_reconstruction/test/free_router_blocked_default.test.mjs`
- `local_reconstruction/test/free_router_http.test.mjs`
- `local_reconstruction/test/free_router_ui.test.mjs`
- `local_reconstruction/test/local_runs_http.test.mjs`
- `local_reconstruction/test/node_generation_audio_ui.test.mjs`
- `local_reconstruction/test/node_generation_image_ui.test.mjs`
- `local_reconstruction/test/node_generation_route.test.mjs`
- `local_reconstruction/test/node_generation_text_ui.test.mjs`
- `local_reconstruction/test/node_generation_video_ui.test.mjs`
- `local_reconstruction/test/run-all.mjs`
- `local_reconstruction/test/support/node-generation-ui.mjs`

### C1
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/test/marketing_ad_formats_ui.test.mjs`
- `local_reconstruction/test/marketing_catalog_contract.test.mjs`
- `local_reconstruction/test/run-all.mjs`

### C2
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/test/marketing_visual_style_ui.test.mjs`
- `local_reconstruction/test/run-all.mjs`

### C3
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/app/server.mjs`
- `local_reconstruction/test/canvas_existing_project_ui.test.mjs`
- `local_reconstruction/test/run-all.mjs`

### C4
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/app/server.mjs`
- `local_reconstruction/test/account_more_language_ui.test.mjs`
- `local_reconstruction/test/run-all.mjs`
- `local_reconstruction/test/settings_internal_ui.test.mjs`

### C5
- `FEATURE_INVENTORY.md`
- `local_reconstruction/app/public/app.js`
- `local_reconstruction/app/public/style.css`
- `local_reconstruction/test/run-all.mjs`
- `local_reconstruction/test/titlebar_panels_ui.test.mjs`

### Outros
- `.gitignore`
- `ARENA_STATUS.md`
- `CLAUDE.md`
- `PIPPIT_API_CATALOG.md`
- `README.md`
- `STATUS.md`
- `local_reconstruction/app/lib/media.mjs`
- `local_reconstruction/app/public/assets/avatar-samples/crys.png`
- `local_reconstruction/app/public/assets/avatar-samples/emily-fashion-bedroom.png`
- `local_reconstruction/app/public/assets/avatar-samples/helena.png`
- `local_reconstruction/app/public/assets/avatar-samples/kavi-marketing.png`
- `local_reconstruction/app/public/assets/avatar-samples/malcolm.png`
- `local_reconstruction/package-lock.json`
- `local_reconstruction/package.json`
- `local_reconstruction/test/agent_contract.test.mjs`
- `local_reconstruction/test/audio_mode_ui.test.mjs`
- `local_reconstruction/test/avatar_gallery_ui.test.mjs`
- `local_reconstruction/test/avatar_menu_ui.test.mjs`
- `local_reconstruction/test/canvas_panel_ui.test.mjs`
- `local_reconstruction/test/chat_history_ui.test.mjs`
- `local_reconstruction/test/composer_dropdowns_ui.test.mjs`
- `local_reconstruction/test/features_ui.test.mjs`
- `local_reconstruction/test/fidelity2_ui.test.mjs`
- `local_reconstruction/test/fidelity3_ui.test.mjs`
- `local_reconstruction/test/inspiration_ui.test.mjs`
- `local_reconstruction/test/llm_ui.test.mjs`
- `local_reconstruction/test/lote2_ui.test.mjs`
- `local_reconstruction/test/lote3_ui.test.mjs`
- `local_reconstruction/test/marketing_entities_ui.test.mjs`
- `local_reconstruction/test/notifications_ui.test.mjs`
- `local_reconstruction/test/omni_ui.test.mjs`
- `local_reconstruction/test/pageview.test.mjs`
- `local_reconstruction/test/parity.test.mjs`
- `local_reconstruction/test/pricing_faq_ui.test.mjs`
- `local_reconstruction/test/providers_ui.test.mjs`
- `local_reconstruction/test/publishing.test.mjs`
- `local_reconstruction/test/questionnaire.test.mjs`
- `local_reconstruction/test/skill_create_ui.test.mjs`
- `local_reconstruction/test/skills_details_ui.test.mjs`
- `local_reconstruction/test/skills_official_ui.test.mjs`
- `local_reconstruction/test/skills_ui.test.mjs`
- `local_reconstruction/test/support/browser.mjs`
- `local_reconstruction/test/support/ui-fixture.mjs`
- `local_reconstruction/test/talkingphoto_provider.test.mjs`
- `local_reconstruction/test/talkingphoto_ui.test.mjs`
- `local_reconstruction/test/templates_ui.test.mjs`
- `local_reconstruction/test/ui-shots/07_avatar_upload_empty.png`
- `local_reconstruction/test/ui-shots/94_canvas_chat_controls.png`
- `local_reconstruction/test/ui-shots/95_avatar_gallery.png`
- `local_reconstruction/test/ui-shots/96_marketing_hooks.png`
- `local_reconstruction/test/ui-shots/97_export_settings.png`
- `local_reconstruction/test/ui.test.mjs`
- `local_reconstruction/test/watermark_preferences.test.mjs`
- `local_reconstruction/test/whisper_local.test.mjs`

## Não feito / `UNOBSERVED`

- Geração real com um provedor remoto/gratuito; a suíte usa fakes e não chama serviços externos.
- Conteúdo real, estados e ações dos painéis Agent connect e Export tasks.
- Descrições/previews completos e mapeamento individual de cartões para categorias em Ad formats.
- Destinos externos reais de CLI, Feature wishlist e Customer service.
- Tradução integral da interface ao trocar idioma, bem como qualquer comportamento não demonstrado pela evidência local.
- Capturas exigidas por `pageview` e `parity`; não foram fabricadas nem adicionadas ao pacote como evidência REA.
- Nenhuma chave/credencial foi incluída intencionalmente. O empacotador exclui `.env*`, arquivos de chave/certificado, `captures/`, `google_drive/`, `.git`, dependências `node_modules`, arquivos `.zip` e `.bundle`.

## Conteúdo e tamanho do ZIP

`estado_B-C_2026-11-09.zip` inclui `local_reconstruction/` (sem `node_modules`), `notes/`, todos os Markdown da raiz, `.gitignore` e `tools/` se existir. Neste workspace `tools/` não existe, portanto não há conteúdo dessa pasta para adicionar. Foram incluídos 83 paths do inventário de alterações, mas o ZIP também contém os demais arquivos elegíveis das pastas pedidas. Tamanho verificado após criação: 5,887,070 bytes (limite: 100 MB).
