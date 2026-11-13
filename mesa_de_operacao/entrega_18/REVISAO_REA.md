# REVISÃO DO REA — evidências × PERGUNTAS_USUARIO (12/11/2026)

Pedido do usuário: revisar todo o REA antes de responder às 9 perguntas, porque "muito dahi tem nas evidências do rea". Este documento é essa revisão: o que a evidência **já responde**, com fonte, e o que **continua aberto**.

## Fontes revistas

| Fonte | Onde | O que tem |
|---|---|---|
| `PiperLine_REA_Evidencias/mesa_de_operacao` (79 itens) | Drive | TABELA_LINHAS_NAO_PRONTAS (mapeia linha → evidência → REA id), stage reports, RELATORIO_E7_*, PROGRESSO, STATUS, bundles |
| `telas_internas_A.zip` (9.696.863 B) | Drive (`mesa_de_operacao`) | **25 capturas internas autenticadas do Pippit build 670** (`current_670/`): home, dropdowns do compositor, drawer de avatar, foto falante, Publisher/Analytics com "Link account", canvas, marketing-agent |
| `screenshots.zip` (25.876.463 B) | Drive | 39 imagens = landing pública + `auth/` (galeria de avatares, menu do histórico, canvas do usuário, b1_avatar_voice) |
| `captures.zip` (200.014.367 B) | Drive | **Inacessível**: acima do limite de 100 MiB do conector (registrado em STATUS/relatórios) |
| `captures/current_670/rea_session_bundle_lote12.json` | repo | Registro REA (lote 12): 29 records, 14 unknowns, providers (CDP browser, JS analyzer), 5 árvores de acessibilidade + **2 screenshots** extraídos do próprio bundle |
| `TABELA_LINHAS_NAO_PRONTAS.md` + stage reports | Drive | O que cada linha tem de observado vs UNOBSERVED, com o motivo linha a linha |

## O que a evidência JÁ RESPONDE (com fonte)

1. **Publicação/contas (perguntas 6 e 9, parcialmente)** — `telas_internas_A/link_account/publisher_link_menu.png` e `analytics_link_menu.png` + árvore a11y `ev_d2589bc…` do lote12: menu **"Link account" = TikTok, Facebook Page, Instagram Reels** (3 canais, **sem YouTube**). Páginas Publisher ("Manage your posts across social platforms in one place" + calendário "Publishing" com agendamento) e Analytics ("One dashboard…" — Followers/Impression/Engagement) observadas. Sidebar "More" = **Video generator, Avatars and voices, Analytics, Publisher**.
2. **Compositor — modos e painéis (pergunta complementar; resolve UNOBSERVED das linhas 81/103)** — `home_dropdowns/Agent.png`: **Agent ▾ = Agent (chip "Long-form video": "Describe your idea. Agent refines it and chooses the right models.") / Video / Image / Audio**. `Model.png` e `Preference.png` (mesmo painel): abas **Video | Image**; Modelos: ✓ **Smart match** ("Automatically selects a video model when the Agent detects a video generation request"), **Dreamina Seedance 2.5** (30s video generation, precise segment editing), **Dreamina Seedance 2.0 Fast** (Enhanced details and quality, affordable costs), **Dreamina Seedance 2.0** (More precise reference, realistic, up to 4K) — os 3 com marcador 💎; **Ratio**: Smart, 9:16, 3:4, 1:1, 4:3, 16:9 (com seta "mais"); **Resolution**: 480p, 720p; **Video length**: Smart duration | Custom duration.
3. **Drawer "Quickly create avatar video" (pergunta 1, parcialmente)** — `avatar_drawer_*` + `avatar_modal/modal_50s.png`: abas **Choose avatar | Edit script**; Choose avatar = **Recommended avatars | Favorites | My avatars** + filtros **Gender, Age, Figure, Name, Industry, Scene, Pose, Outfit style** (8) + grade com nomes ("Victor in the kitchen" selecionado, Amelia-Beauty-Makeup Room, Lily-Lifestyle-Bathroom, Stella-Beauty-Makeup Room, Charlotte-Lifestyle, Aurora-Beauty-Standing); Favorites vazio = "No favorite avatar yet — Bookmark your favorite avatars to see them here."; Edit script = textarea ("Hello, I'm your avatar. You can choose your favorite avatar on your right and click on the script in the video to edit it."), toggle **Show as captions**, seletor **English ▾**, botão **Edit**, **Change caption style** com **12 estilos** ("The quick brown fox" em 12 grafias); preview 00:05|00:05 (volume, TikTok, fullscreen); topo: undo/redo, **Edit more**, **Export video ⚡11 2̶3̶** e aviso **"Accurate lip-sync will be available after export."**
4. **Foto falante (pergunta complementar; etapa 1 confirmada)** — `ai_talking_photo_page/pagina.png`: passos **1 Upload photo | 2 Add voiceover | 3 Export**; "Drop your photo here or click to upload — Upload photo with one or multiple characters — Format: JPG / PNG, Size: >256*256, Uploading tips"; 5 exemplos; checkbox de direitos + "Learn more" + **Next** (desabilitado). Confirma a etapa 1 já registrada; **2 e 3 continuam sem captura** (avançar exige foto real = autorização).
5. **Skills store (linha do catálogo)** — `skills_20261029.png` + `shot_ev_a40cb05`: abas All/My skills/Favorites; busca; **Create skill**; chips All/Short Drama/Marketing Advertising/Professional film and television; cards com modelos ("GPT Image 2 · SD 2.5"): Create skills, Drama Ads, Story Shorts, Vlog Generator, Creator Commerce, 3-View Rendering, Viral Replication, Batch Generation, URL to Video, Video Translation, Marketing Video; banner "Subscribe now … 60% off … 1575 credits!".
6. **Home autenticada** — `home_now/pagina.png` + `shot_ev_db12e4d`: "With Pippit | Creative | Marketing | Story", placeholder "Describe your ideas, Pippit will create with you.", controles +/Skills/Model|Preference/Canvas toggle, **125 créditos**, Recommended skills (Drama Ads SD 2.5, Marketing Video GPT Image 2, Vlog Generator, Avatar video, Viral Replication, AI talking photo), Featured works (Creative Partner Program Sep 2026–Dec 2026, AI STORYTELLING CONTEST — Featuring Dreamina Seedance 2.5, TOWER OF 100 DEMONS, ECHOES). Card hover do "AI talking photo" = "Make a photo talk very naturally with a script or audio clip" + chip **Video** (`ai_photo/modal.png`).
7. **Menu "…" do histórico (linha 97/105)** — `auth/historico_menu_mais_usuario.png` (via stage report): **compartilhar, renomear, excluir** (ícones, abre à esquerda, dentro da sidebar).
8. **Galeria "Crie os seus avatares e vozes" (linha 56)** — `auth/b3_existing_avatar_w03.png`/`b3_sample_avatar_w03.png` (via stage report): avatares Emily/Kavi, foto Crys, amostras Malcolm/Helena com hover **Aplicar**, slots vazios, "2 usos gratuitos".
9. **Widget de ajuda (pergunta 19)** — botão **"?" roxo** no canto inferior direito em **todas** as capturas internas (comportamento global observado; conteúdo do painel nunca aberto).
10. **Promoções (linha 80)** — banner "BEST DEAL — Up to 40% OFF plans + Seedance 2.5 at 720p from R$0.45/sec & 2.0 Fast from R$0.22/sec — Get offer" (BR, conta Free, 125 créditos) e banner "Subscribe now … 1575 credits".

## As 9 perguntas de PERGUNTAS_USUARIO.md — resolução

| # | Pergunta | Veredito da evidência | Fonte | O que falta (só o usuário) |
|---|---|---|---|---|
| 1 | Menu do avatar "…" | **QUASE TODA RESPONDIDA**: drawer completo observado (3 abas de galeria, 8 filtros, Edit script, 12 estilos de legenda, Show as captions, English, Edit more, Export ⚡11 2̶3̶, aviso de lip-sync). Continuam sem captura: o **menu "…" dos itens da galeria** (a amostra só mostra hover **Aplicar**) e a **prévia de áudio** | `telas_internas_A/avatar_*`, `auth/b3_*` | clique no "…" e na prévia, se quiser o conteúdo exato |
| 2 | Presets de áudio | **PARCIAL**: painel Model\|Preference observado só com abas **Video/Image** (sem aba de áudio); o chunk 565447 registra `apply_home_generation_preset` com `generateMode:'audio_gen'`, mas **nomes/conteúdo dos presets de áudio nunca foram capturados** | `home_dropdowns/Model.png`, unknown `ev_22510b4bd79…` | se houver captura da Home logada com o modo Áudio aberto; ou os nomes que você lembrar |
| 3 | Inspiration | **ABERTA** (para a tela): só as 6 funções estáticas do catálogo (feed/tendências/curtidas/remix…), `feedCaptured:false` | TABELA linha 91 | captura do feed ou descrição |
| 4 | Omni | **PARCIAL**: 11 endpoints nomeados (`get_tone_list` … `batch_delete_digital`) por análise estática; a página Omni existe ("/ai-talking-photo" é parte do Omni); **corpos/valores nunca capturados** | TABELA linha 92, unknowns `ev_6ffaa326dab…` | nada novo — corpos exigem execução (créditos) |
| 5 | SSE | **PARCIAL**: protocolo `submit_run`/`subscribe_run` descrito estaticamente; **replay de SSE capturado**; leitura ao vivo nunca feita | TABELA linhas 39/108 | nada — execução exige serviço |
| 6 | Integrações | **RESPONDIDA**: "Link account" = **TikTok, Facebook Page, Instagram Reels** (sem YouTube); Publisher/Analytics observados; marketplace **sem nenhuma tela** (0 capturas) | `link_account/*`, a11y `ev_d2589bc…` | tela do marketplace, se existir no Pippit |
| 7 | Portas de idade | **ABERTA**: só nomes de chunk (age gate/US/PWA/dev-panel); **nenhuma captura mostra as telas das portas**; as capturas internas mostram conta logada sem porta | TABELA linha 94 | captura das telas de idade/US, ou os textos |
| 8 | Provedor de lip-sync/voz | **PARCIAL**: aviso observado **"Accurate lip-sync will be available after export."**; campos `is_lip_sync`/`lip_sync_video` no SDK (estático); decisão local = voz SAPI do Windows; **o provedor externo nunca foi nomeado em evidência** | drawer `Edit_script.png`, `LIPSYNC_PROVIDERS.md`, rodada de voz 2026-11-09 | qual provedor você usa/quer (ElevenLabs? MiniMax? outro) |
| 9 | Credenciais de cada rede | **ABERTA** (só o usuário): o menu de vínculo está observado; **o fluxo OAuth/credenciais nunca foi capturado** (não clicado, sem conta) | TABELA linha 64 | as credenciais no ambiente (nomes já em `.env.example`) |

## Correções de rumo que a revisão traz

- **YouTube**: o menu real tem **3 canais** (TikTok, Facebook Page, Instagram Reels). O adaptador YouTube do item 2a veio do catálogo estático ("YouTube: resumable"); a evidência de tela **não mostra YouTube**. Manter o adaptador (pedido genérico "publicação direta nas redes") mas registrar: **menu observado = 3**; se for para parear 1:1, o seletor deve listar só os 3 observados com YouTube como opcional/`UNOBSERVED`.
- **Seedance**: os modelos observados são **Dreamina Seedance 2.5 / 2.0 Fast / 2.0** (com 💎) + **Smart match**; o `pippit_gen.mjs` tem uma lista ligeiramente diferente (2.5-fast/2.5-lite/…) — conferir com o usuário qual lista vale (modelos gratuitos = decisão aceita).
- **Linhas 81/103** (dropdowns do compositor): o conteúdo interno **FOI observado** — podem sair de "opções internas UNOBSERVED" para o conteúdo descrito acima.
- **Linhas 56/90/97/132**: ganham os fatos novos do drawer/avatar (8 filtros, 12 estilos, Edit more) e do menu do histórico.
- **Widget "?"**: presença global observada (todas as capturas); conteúdo do painel segue UNOBSERVED.

## Mineração de `scripts.zip` (12/11/2026 — verificação do relatório do PC)

O `scripts.zip` do Drive (62.725.625 B; 911 bundles = contagem do manifesto) foi baixado e minerado. Contratos extraídos que fecham lacunas: **porta de idade** (`POST /lv/v1/sc/age_gate/log_in_age_check`, `check_result` 2=kick_out com textos "Can't access Pippit…" / "Sign Out", 1=needs_ui), **widget** (kefu-im.bytedance.com/im/summon_falcon + summon.bytedance.com/hibot/web + helpdesk.bytedance.com), **SSE** (`/api/biz/v1/agent/subscribe_run?run_id=`, `subscribe_thread`), **omni/digital_human** (26 endpoints com corpos; envelope `{ret,errmsg,logId,data}`), **presets de áudio** (contrato `formFields {audioModel,…}` + campo `tone`; cenas conversation/narration/voiceover/chat/Customer service/Storytelling), **Inspiration** (capabilities com `inspiration_id`/`tpl_id`, `transfer_material`). Detalhe e verificação item a item do relatório do PC: `VERIFICACAO_RELATORIO_PC.md`. `captures.zip` (200 MB) e `evidence_cli.zip` (1,57 GB) excedem o limite de 100 MiB do conector — precisam ser divididos no PC.

## O que NÃO existe em evidência nenhuma (continua pedindo o usuário)

1. Presets/modelos de **áudio** (nomes e comportamento).
2. Feed do **Inspiration**.
3. Telas das **portas de idade/US** e textos.
4. **Provedor** de lip-sync/voz externo.
5. **Credenciais** OAuth das redes (TikTok/Meta/Google) no ambiente.
6. Tela do **marketplace** (se existir).
7. Menu "…" da galeria de avatares + prévia de áudio (conteúdo exato).
8. Captura do **`captures.zip`** (200 MB, acima do limite do conector) — se o usuário mover para ≤100 MB ou dividir, mais lacunas fecham.
