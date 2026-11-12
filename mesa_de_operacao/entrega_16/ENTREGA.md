# ENTREGA 16 — 2026-11-12 (rodada 16)

A entrega 16 é o resultado da rodada 16 (correção dos 4 defeitos que a validação do pacote r15 no Windows revelou). Esta entrega **inclui as 4 correções** e a régua de contagem honesta.

## O que a entrega 16 contém

- `LEIA_PRIMEIRO.md` — contrato do projeto (inalterado).
- `STATUS.md` — estado atual; placar honesto da r16.
- `ENTREGA.md` — este documento.
- `FEATURE_INVENTORY.md` — inventário regenerado com a régua r16 (423 linhas granulares; recapitulação calculada).
- `REVISAO_WINDOWS.md` — os 4 defeitos do Windows e as correções (um commit por item).
- `PREPARO_PUSH.md` — opções de push (não executadas; aguarda autorização).
- `pippet-clone-r16.bundle` — bundle git (criado com `git bundle create … HEAD arena/d9cee29f-pippet-clone`), **provado por `git clone`**.
- `pippet-clone-r16.zip` — pacote completo (tudo exceto `.git`, `.claude`, `node_modules`).
- `SHA256SUMS` — formato `hash  arquivo` (2 espaços).
- `MANIFESTO.md` — lista de arquivos e conferências.

## Placar honesto desta máquina (Linux, sem navegador)

`node test/run-all.mjs` (com `PIPPIT_FFMPEG` 9.0.2 e `PIPPIT_FFPROBE`): **79 passaram, 56 skip explícito, 0 falharam (de 135)**.

**Os 56 testes de tela NÃO executaram nesta máquina** (sem Chromium — SKIP por "Playwright não carregou" ou "evidência local não inclui"). Não se declara "0 falhas" sobre eles. Lista exata:

`templates_ui, settings_internal_ui, skills_details_ui, skill_create_ui, avatar_menu_ui, omni_ui, inspiration_ui, notifications_ui, pricing_faq_ui, composer_dropdowns_ui, audio_mode_ui, pageview, parity, ui, directgen_ui, features_ui, llm_ui, skills_ui, providers_ui, lote2_ui, lote3_ui, skills_official_ui, publishing, chat_history_ui, canvas_panel_ui, canvas_existing_project_ui, account_more_language_ui, titlebar_panels_ui, avatar_gallery_ui, marketing_entities_ui, marketing_ad_formats_ui, marketing_visual_style_ui, fidelity2_ui, fidelity3_ui, talkingphoto_ui, free_router_ui, local_run_page_recovery, browser_probe, omni_router_ui, canvas_shortcuts_ui, node_generation_video_ui, node_generation_image_ui, node_generation_audio_ui, node_generation_text_ui, chat_history_idea_ui, marketing_hooks_ui, canvas_toolbar_ui, pricing_reviews_ui, free_router_stack_ui, route_single_render, novai_video_ui, providers_panel, auth_ui, auth_google_ui, publish_queue, billing_structure`

A execução real desses 56 é a do Windows (r15), que reprovou 4 — todos corrigidos nesta rodada (ver `REVISAO_WINDOWS.md`). **Recomenda-se rodar a suíte no Windows após esta entrega** para confirmar as correções; até lá, os 56 seguem **não verificados**.

## Como restaurar

```bash
unzip pippet-clone-r16.zip
cd pippet-clone-r16   # ou: git clone pippet-clone-r16.bundle
cd local_reconstruction && node test/run-all.mjs   # Windows: roda os 56 de tela também
```

## Quanto falta para terminar (pergunta do item 6)

Com a evidência atual do repositório:
- **Para terminar o reproduzível**: falta pouco — **~2 pontos percentuais** (as 2 linhas "não verificada" granulares + a validação dos 56 testes de tela no Windows após as 4 correções). Com isso, o que é possível fica fechado.
- **Para o catálogo inteiro (423 linhas)**: 272 linhas (64%) são conteúdo **apagado/não documentado** — irreproduzíveis sem evidência nova do Pippit; não há trabalho nosso que as recupere. Máximo alcançável sem evidência nova: 151/423 = 36%.

## O que mudou em relação à entrega 15

1. Os 4 defeitos do Windows corrigidos (um commit por item, cada um com teste).
2. `browser_probe` não apaga mais arquivo versionado (git status limpo após a suíte).
3. Regra: conteúdo UNOBSERVED/inventado com teste = "implementada (conteúdo UNOBSERVED)", nunca "verificada"; os 56 de tela não contam até passarem.
4. FEATURE_INVENTORY regenerado (423 linhas granulares; a r15 reportava 229 agrupadas) com recapitulação calculada.
5. `pippet-clone-r16.bundle` (prova de `git clone` incluída), `pippet-clone-r16.zip`, `SHA256SUMS`, `MANIFESTO.md`.
