# Catálogo de Skills do Pippit: prompts, guias, ferramentas e workflows

Gerado em 2026-10-22T11:58:31.157Z por `notes/build_skills_catalog.mjs` (dados completos em `PIPPIT_SKILLS_PROMPTS_CATALOG.json`). **Instruções privadas das skills oficiais NÃO foram encontradas**; abaixo está tudo o que o servidor/cliente realmente entrega, com a CLASSE de cada item.

## Classes (como ler cada item)

- **guide_words**: TEXTO INTEGRAL do servidor (campo guide_words): orientação de uso mostrada ao usuário/composer. NÃO é a instrução privada (SKILL.md) da skill.
- **prefill**: TEMPLATE PARAMETRIZADO: texto que o servidor entrega como pedido pré-preenchido (inclui marcador a completar).
- **tools**: WORKFLOW COMPROVADO (parcial): lista de ferramentas do agente declarada em metadata.tools. A ORDEM de execução NÃO está comprovada.
- **inferido**: COMPORTAMENTO INFERIDO a partir de guide_words/tools/descrição (não é instrução original).
- **privado**: INSTRUÇÃO PRIVADA NÃO ACESSÍVEL: o corpo da skill fica no servidor (md_type tos, hash/versão e fornax_key visíveis, conteúdo não).
- **descricao**: DESCRIÇÃO COMERCIAL (texto de vitrine), não prompt.
- **i18n**: STRING DE INTERFACE embutida no bundle (texto padrão da chave i18n); pode ser rótulo, mensagem ou modelo de pedido.

## Método e versões do REA

- Captura do servidor com o **REA MCP 6.7.0** (`capture_browser_scenario`, conectado à aba logada do usuário, somente leitura): Evidence `ev_ea421de9207ed0d11f7f73535d25dfd4aa8041762c10264892d55b55c92f052a`; página `ev_2bd23653952ae050858d0158ebc25592f126095b9c6823ab9cc969b4b03988bc`; alvos `ev_959294fba3de1aa58ce0ec6e2ce25e013bbb159b22defd6f4f4e1f03de9c096f`. Bundle exportado: `captures/skills_670/session_bundle_670_a.json`.
- Chunk Skill (24 KB) reanalisado na 6.7.0: análise `ev_3aa762df1a0d17c04ba64285f04904204a79748706dc92950e5f1f6c06fbcc4a`; resumo `ev_6f9e7abc38a68aef9de1db1535e150c24b776f985aeb90131f71b40dc56f08d5`; view `javascript-facts` `ev_3873f917daef7172267b081251921373ea3e4533094633d18a242f3fd97fc701` (104 fatos estruturais).
- Evidências **históricas 6.5.0** (250 bundles) permanecem intactas em `evidence_cli/auth_bundles/` e são citadas por arquivo; seus `evidence_id` NÃO são reproduzidos pela 6.7.0.
- Strings de interface: varredura offline dos 250 bundles já baixados (`notes/skill_strings_scan.json`: 11.029 pares i18n, 2.703 relacionados), sem reanálise e sem executar código.

## Skills oficiais da loja (13)

| Skill | skill_name | Categorias | Ferramentas | Modelos padrão | guide_words | v |
|---|---|---|---|---|---|---|
| Create skills | `skill-creator` | - | n/d | - | integral | 2 |
| Drama Ads | `storyline-advertisement` | Marketing Advertising | 4 | Seedance_2.5 + gpt_image_2 | integral | 6 |
| Story Shorts | `story_short_film` | Short Drama, Professional film and television | 4 | - | integral | 7 |
| Vlog Generator | `seedance-vlog-maker-v2` | Professional film and television | 3 | - | integral | 9 |
| Creator Commerce | `expert-product-promotion` | Marketing Advertising | 3 | Seedance_2.5 + gpt_image_2 | integral | 12 |
| 3-View Rendering | `character-reference-sheet` | Professional film and television | 1 | Seedance_2.5 + gpt_image_2 | integral | 8 |
| Viral Replication | `imitation_video` | Short Drama, Marketing Advertising, Professional film and television | 6 | - | integral | 5 |
| Batch Generation | `batch-marketing-video-generator-r1` | Marketing Advertising | 19 | - | template | 6 |
| URL to Video | `url2video` | Marketing Advertising | 2 | - | template | 13 |
| Video Translation | `video-language-localization` | Marketing Advertising | 5 | - | template | 7 |
| Marketing Video | `nest_skills_marketing_video_v2` | Marketing Advertising | n/d | gpt_image_2 | integral | 9 |
| AI talking photo | `ai_talking_photo` | Marketing Advertising | n/d | - | - | 10 |
| Avatar Video | `avatar_video_skill` | Marketing Advertising | n/d | - | - | 7 |

## O que o botão Use mostra (compositor da Home)

Capturado nas 13 skills (`captures/skills_670/use/`, screenshots por skill; referência do usuário `captures/skills_670/user_screenshot_use_marketing_video.png`). **Selecionar uma skill não gera nada**: o compositor mostra, antes de qualquer envio: (1) chip com o nome da skill e “Remove Skill”; (2) o `guide_words` EXATO como placeholder esmaecido do campo (campo vazio); (3) quando existe `material_guide_words`, um bloco de upload com esse texto (Drama Ads, Vlog Generator, Creator Commerce, Viral Replication, Marketing Video); (4) botões Agent, Skills, Custom models | Preference, Canvas, custo (“37 /s”), Credit rules, Submit. Calls ao clicar: `agent/get_available_model_list` (scene web_unified_agent), `agent/list_homepage_recommended_skill` (limit 20; devolve 6 skills no mesmo formato do store), `benefits/user_credit` e `credit_receive`. **AI talking photo** volta à Home sem chip (placeholder padrão “Describe your ideas, Pippit will create with you.”); **Avatar video** abre um modal de criação (chamadas `videogen/digital_human_filter_config`, `digital_human/get_item_list`, `videogen/recommend_digital_human_by_tag`, `commerce/get_commerce_auth_info`, `videogen/check`). Na Home, “Recommended skills” mostra 6 (Drama Ads, Marketing Video, Vlog Generator, Avatar video, Viral Replication, AI talking photo) com ↵ (usa no compositor) ou ↗ (abre outro fluxo: Avatar video e AI talking photo). Submenu More da barra lateral: Video generator, Avatars and voices, Analytics, **Publisher**.

## Detalhe por skill

### Create skills (`skill-creator`)

- ID `sk_official_0262a8335ad3b832`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 2; hash `9c8ea194df87e6f5…`; fornax_key `pippit.nest.skill_creator`; favoritos 30; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Develop reusable skills to complete specific tasks more stably.
- **Ferramentas** (classe tools): _não declaradas (tools = null)_
- **Modelos padrão**: vídeo -; imagem -
- **guide_words (texto integral do servidor)**:

  > Please enter the Skill Ideas that need to be precipitated:

- **Comportamento inferido** (não é instrução original):
  - Meta-skill de criação: o guia pede "Skill Ideas" a serem consolidadas; liga-se ao fluxo "Create with AI" (chat de criação separado) vistos nos bundles.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=2; content_hash=9c8ea194df87e6f5…; fornax_key=pippit.nest.skill_creator).

### Drama Ads (`storyline-advertisement`)

- ID `sk_official_2a12c090f4a408a4`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 6; hash `0406083772a96747…`; fornax_key `nest.skill.qingjie_guanggao_`; favoritos 34; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Drops your product inside a high-tension mini-drama so viewers stay for the plot and leave wanting the product.
- **Ferramentas** (classe tools): `sandbox_generate_image`, `render_video`, `sandbox_generate_video`, `sandbox_process_video`
- **Modelos padrão**: vídeo Seedance_2.5; imagem gpt_image_2
- **guide_words (texto integral do servidor)**:

  > 📦 Give the essentials - product name + key selling points, a product image, your chosen drama genre, and the video ratio. Miss any, and it'll ask before building.
  > 🎭 Pick a genre - CEO romance, second-chance glow-up, revenge, love triangle, family drama, workplace power play, twist reveal, fake dating, enemies-to-lovers, and more.
  > 🖼️ Upload a person reference to lock a face - bound characters keep their real looks (ethnicity, features, skin tone, hair)
  > ⚡ Trust the formula - a hook in the first 2 seconds, fast escalation, one clean twist, and a payoff where the product is why things turn around.
  > 🇺🇸 Output is English by default (spoken American English); ask explicitly for any other language.

- **material_guide_words** (guia de ativos): Please upload the product image.
- **Comportamento inferido** (não é instrução original):
  - Entradas exigidas: nome do produto + pontos fortes, imagem do produto, gênero de drama e proporção (sem algum deles, a skill pergunta antes de produzir).
  - Opcional: referência de pessoa para fixar o rosto.
  - Fórmula declarada: gancho nos 2 primeiros segundos, escalada rápida, uma virada limpa, desfecho em que o produto é a razão da virada.
  - Saída em inglês americano por padrão.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; bloco de upload “Please upload the product image.”; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=6; content_hash=0406083772a96747…; fornax_key=nest.skill.qingjie_guanggao_).

### Story Shorts (`story_short_film`)

- ID `sk_official_5d662d3f6b6bb9d5`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 7; hash `0c41aebd4808a6f9…`; fornax_key `nest.skill.duanju_shengcheng_`; favoritos 56; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Turn a script or a simple idea into a complete, cinematic short film - with consistent characters, faithful dialogue, and studio-style storytelling from start to finish.
- **Ferramentas** (classe tools): `sandbox_generate_image`, `sandbox_generate_video`, `sandbox_generate_audio`, `render_video`
- **Modelos padrão**: vídeo -; imagem -
- **guide_words (texto integral do servidor)**:

  > 🎬 Let's bring your story to life! Share a few things and I'll film it for you:
  > 📖 Your story - a full script, or just a one-line idea (premise, main characters, the ending or feeling you want) ⚙️ The format - length, aspect ratio, language, and who it's for 🔒 Your must-keeps - any exact lines to keep, or notes like "no subtitles, no music" "🖼️ Character photos - I'll preserve their real look across every shot 🏠 Location & prop images - keeps your scenes consistent Throughout 🎙️ A voice sample - for any speaking character or narrator
  > ✨ The more you share, the closer it gets to the story in your head. ✅ Heads-up: I'll pause for your OK at each key step, so nothing's built before you're happy with it.

- **Comportamento inferido** (não é instrução original):
  - Entradas: história (roteiro completo ou ideia de uma linha), formato (duração, proporção, idioma, público), itens a preservar, fotos de personagens, imagens de locais/objetos, amostra de voz.
  - Pausa para aprovação em cada etapa-chave antes de construir.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=7; content_hash=0c41aebd4808a6f9…; fornax_key=nest.skill.duanju_shengcheng_).

### Vlog Generator (`seedance-vlog-maker-v2`)

- ID `sk_official_07e5b267beb6e667`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 9; hash `8c6daa2aa8444e93…`; fornax_key `nest.skill.vlog_shengcheng_`; favoritos 24; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Turn your photos, clips, and audio into a story-driven vlog - with a real hook, natural pacing, and a satisfying ending, not just a slideshow.
- **Ferramentas** (classe tools): `render_video`, `sandbox_generate_video`, `sandbox_process_video`
- **Modelos padrão**: vídeo -; imagem -
- **guide_words (texto integral do servidor)**:

  > Vlog Maker turns your photos, clips, and audio into a story-driven vlog - not just a slideshow.
  > For the best result, share: 📷 Photos, 🎬 short clips, 🎵 any music or real sound ✨ Include your best moment - a reaction, a result, a before/after, a surprise. That becomes your hook.
  > Optional, but helps a lot: tell me the theme, platform (YouTube 16:9/Reels 9:16), length, and the one moment you want to stand out.
  > Tip: fewer strong shots beat 30 lookalike photos. Moments with action and emotion make the best vlogs.

- **material_guide_words** (guia de ativos): Please upload portrait/landscape or other material images.
- **Comportamento inferido** (não é instrução original):
  - Entradas: fotos, clipes curtos, música/som real; melhor momento vira o gancho; opcional tema, plataforma (16:9/9:16), duração.
  - Dica declarada: poucos planos fortes valem mais que 30 fotos parecidas.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; bloco de upload “Please upload portrait/landscape or other material images.”; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=9; content_hash=8c6daa2aa8444e93…; fornax_key=nest.skill.vlog_shengcheng_).

### Creator Commerce (`expert-product-promotion`)

- ID `sk_official_455aeefb40a3f65d`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 12; hash `806f673aa437f602…`; fornax_key `nest.skill.daihuo_daren_`; favoritos 35; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Turn one product photo into an authentic creator-style video - unboxing, try-on, demo, or review - that looks like a real influencer filmed it and is ready to sell.
- **Ferramentas** (classe tools): `render_video`, `sandbox_generate_video`, `sandbox_process_video`
- **Modelos padrão**: vídeo Seedance_2.5; imagem gpt_image_2
- **guide_words (texto integral do servidor)**:

  > 🎬 Creator Product Promo - let's make your product video!
  > ✅ Required (need these to start): 📦 Product name 📸 At least one clear product photo (multiple angles help a lot!)
  > ⭐ Optional but recommended (makes it way better): 💡 Key selling points 🎯 Target audience & market 🎭 Creator style - try-on/unboxing/demo/review/friend rec ⏱️ Length & aspect ratio 🔗 Your call to action
  > ℹ️ Good to know: 🔒 I keep your product true to the photo and won't invent any claims 🌎 Creators default to a Western/Latin American look - unless you upload a specific person 💬 Scripts are in conversational English by default - just tell me if you'd like another language

- **material_guide_words** (guia de ativos): Please upload the product image.
- **Comportamento inferido** (não é instrução original):
  - Obrigatório: nome do produto e ao menos uma foto clara. Opcional: pontos fortes, público/mercado, estilo do criador (experimentar/unboxing/demo/review/indicação), duração/proporção, CTA.
  - Mantém o produto fiel à foto e não inventa alegações; criadores ocidentais/latino-americanos por padrão; roteiro em inglês coloquial.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; bloco de upload “Please upload the product image.”; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=12; content_hash=806f673aa437f602…; fornax_key=nest.skill.daihuo_daren_).

### 3-View Rendering (`character-reference-sheet`)

- ID `sk_official_fa50769c17c9c8cb`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 8; hash `07462714d81106ae…`; fornax_key `nest.skill.san_shitu_`; favoritos 21; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Turn a character image or description into a polished 16:9 reference sheet with a face close-up and consistent front, side, and back views.
- **Ferramentas** (classe tools): `sandbox_generate_image`
- **Modelos padrão**: vídeo Seedance_2.5; imagem gpt_image_2
- **guide_words (texto integral do servidor)**:

  > 📸 Upload a character image
  > A clear front-facing or full-body image is enough. Add side or back references if the hairstyle, outfit, or accessories are complex.
  > ✍️ Or describe your character
  > Include their appearance, hairstyle, outfit, body type, accessories, and visual style.
  > ↔️ Call out asymmetrical details
  > Tell us which side each detail belongs on, such as a mechanical right arm, a bag on the left shoulder, or a one-sided hairstyle.
  > 🔍 Need an exact likeness?
  > If you upload a real person, specify whether their face, body type, skin tone, and other visible traits should be preserved.
  > ✨ What you'll get
  > One clean 16:9 character sheet with a large face close-up on the left and matching front, true side, and back full-body views on the right.
  > Usage example: Generate a close-up of the character's face and full-body three-view drawings.

- **Comportamento inferido** (não é instrução original):
  - Entrada: imagem do personagem (frontal/corpo inteiro; laterais ajudam) ou descrição; detalhes assimétricos com o lado; preservação de traços se for pessoa real.
  - Saída declarada: uma folha 16:9 com close do rosto à esquerda e frente, lateral e costas à direita. Só usa geração de imagem.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=8; content_hash=07462714d81106ae…; fornax_key=nest.skill.san_shitu_).

### Viral Replication (`imitation_video`)

- ID `sk_official_0ee6791bc6c069a5`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 5; hash `baa812b8dbb53ac7…`; fornax_key `nest.skill.fuke_baokuan_`; favoritos 27; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Give it one reference video, and it reverse-engineers the hook, then builds a brand-new sample-style or remixed video from your requests and assets.
- **Ferramentas** (classe tools): `pippit_video_tool_share_url_parser_sandbox`, `pippit_video_tool_imitation_reverse_analyze_sandbox`, `dynamic_questionnaire`, `pippit_video_tool_imitation_plan_sandbox`, `sandbox_generate_video`, `render_video`
- **Modelos padrão**: vídeo -; imagem -
- **guide_words (texto integral do servidor)**:

  > 🎥 Provide one reference - upload a video, use an in-task asset, or paste a full shared link/URL (local paths and broken links won't parse). If you give several, name the main one.
  > 🎯 State your direction - "imitate" or "remix" alone isn't enough. Say whether to keep the core for a same-style remake, keep the hook but swap person/scene/theme, or diverge freely.
  > 🖼️ Upload assets to swap - to replace a specific person, product, or shot, upload that asset first and say what it replaces. Text-only changes (e.g. "make the background a night beach") need no upload.
  > 🧑‍🤝‍🧑 Bound identities are kept - uploaded people keep their real looks; text-generated casts default to natural North American/European/Latin American faces.
  > 🔍 Want analysis only? - say so, and it'll break down the hook and remixable points without generating.
  > 🇺🇸 Output is English by default; ask explicitly for any other language.
  > ⏳ Be patient - multi-segment videos generated in order, then merged into one final cut.

- **material_guide_words** (guia de ativos): Upload the image/video you want to replicate.
- **Comportamento inferido** (não é instrução original):
  - Entradas: um vídeo de referência (upload, ativo da tarefa ou link completo) e a direção (refazer no mesmo estilo / manter o gancho trocando pessoa-cena-tema / divergir livremente); ativos a substituir; modo só-análise sem gerar.
  - Pipeline sugerido pela lista de ferramentas: analisar link → engenharia reversa do vídeo → questionário → plano → gerar vídeo → renderizar; vídeos multi-segmento são gerados em ordem e unidos num corte final (guide_words).
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; bloco de upload “Upload the image/video you want to replicate.”; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=5; content_hash=baa812b8dbb53ac7…; fornax_key=nest.skill.fuke_baokuan_).

### Batch Generation (`batch-marketing-video-generator-r1`)

- ID `sk_official_3df75762b83fa30c`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 6; hash `4e87652523b7ae4e…`; fornax_key `nest.skills.batch_mkt_video_gen_r1`; favoritos n/d; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Turn one product into multiple video variations instantly. Built for rapid A/B testing to find your winning ads.
- **Ferramentas** (classe tools): `todo_write`, `dynamic_questionnaire`, `present_sandbox_file`, `sandbox_generate_image`, `sandbox_generate_audio`, `sandbox_generate_video`, `sandbox_bash`, `sandbox_read`, `sandbox_write`, `sandbox_edit`, `sandbox_process_video`, `render_video`, `pippit_omni_search`, `pippit_tool_ask_echo_search`, `async_task_create`, `async_task_poll`, `async_task_resume`, `async_task_kill`, `load_skill`
- **Modelos padrão**: vídeo -; imagem -
- **Template parametrizado (pedido pré-preenchido)**:

  > Please generate 3 different ad scripts and video variations for my product.

- **Comportamento inferido** (não é instrução original):
  - Pedido pré-preenchido pede 3 roteiros de anúncio e variações de vídeo do produto.
  - Conjunto de ferramentas agente amplo (todo_write, tarefas assíncronas async_task_*, load_skill, sandbox bash/read/write/edit, busca omni): execução em lote com tarefas assíncronas e outras skills.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=6; content_hash=4e87652523b7ae4e…; fornax_key=nest.skills.batch_mkt_video_gen_r1).

### URL to Video (`url2video`)

- ID `sk_official_cdba2456af6cda4b`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 13; hash `36f02ce62bf12c58…`; fornax_key `nest.skills.url2video`; favoritos 6; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Just drop your product URL or website, and we'll auto-extract your product images and text to generate ready-to-post videos.
- **Ferramentas** (classe tools): `pippit_tool_url_parse`, `sandbox_read`
- **Modelos padrão**: vídeo -; imagem -
- **Template parametrizado (pedido pré-preenchido)**:

  > Please generate a fast-paced, engaging promotional video suitable for TikTok Shorts. Highlight the main features and make it high-converting.
  > Here is my product/website link: [Paste URL]

- **Comportamento inferido** (não é instrução original):
  - Pedido pré-preenchido com marcador [Paste URL]; extrai imagens e textos do produto a partir do link (ferramentas pippit_tool_url_parse e sandbox_read).
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=13; content_hash=36f02ce62bf12c58…; fornax_key=nest.skills.url2video).

### Video Translation (`video-language-localization`)

- ID `sk_official_9ba4f9e7692ead76`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 7; hash `395671d772615ea4…`; fornax_key `nest.skills.video_language_localization`; favoritos 7; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Take your viral videos global in a click. Upload your original footage and auto-translate into multiple languages while perfectly preserving your original hooks and pacing. Unlock global traffic with a single asset and explode your cross-border sales at zero extra cost.
- **Ferramentas** (classe tools): `marketing_video_analysis`, `sandbox_generate_video`, `dynamic_questionnaire`, `sandbox_generate_audio`, `sandbox_generate_image`
- **Modelos padrão**: vídeo -; imagem -
- **Template parametrizado (pedido pré-preenchido)**:

  > Translate this video and replace the actor with a local AI avatar. Keep the original hooks and pacing completely intact. Target market/language:

- **Comportamento inferido** (não é instrução original):
  - Pedido pré-preenchido: traduzir o vídeo e trocar o ator por avatar de IA local mantendo ganchos e ritmo; termina em "Target market/language:" a completar.
  - Ferramentas: análise de vídeo de marketing, geração de vídeo/áudio/imagem, questionário dinâmico.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; sem bloco de upload; botão “Upload reference material” não; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=7; content_hash=395671d772615ea4…; fornax_key=nest.skills.video_language_localization).

### Marketing Video (`nest_skills_marketing_video_v2`)

- ID `sk_official_79de493e9f147462`; tipo `normal`; origem `platform_recommend`; versão do conteúdo 9; hash `e3b0c44298fc1c14…`; fornax_key `nest.skills.marketing_video_v2`; favoritos 20; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): The core marketing-video engine that turns your product info plus a Hook/Style /Play brief into a commercial-ready video, from script and storyboard all the way to the final cut
- **Ferramentas** (classe tools): _não declaradas (tools = null)_
- **Modelos padrão**: vídeo -; imagem gpt_image_2
- **guide_words (texto integral do servidor)**:

  > 📦 Give product facts + a Hook - product name, selling points, and any Hook/Style/Play prompts. It builds a real ad script (hook → bridge → product-led body → CTA), not a neutral shot summary.
  > 🎯 One spine, not a feature dump - it ranks your selling points into one memorable promise + proof path, so the video sells instead of listing everything evenly.
  > ✅ Approve before it generates - it discloses the full storyboard and exact prompts and waits for your go; any material change re-triggers approval.
  > 🇺🇸 Output is English by default (spoken American English); ask explicitly for another language.

- **material_guide_words** (guia de ativos): Please upload the product image.
- **Comportamento inferido** (não é instrução original):
  - Entradas: fatos do produto + prompts de Hook/Style/Play; constrói roteiro de anúncio (gancho → ponte → corpo centrado no produto → CTA).
  - Ranqueia pontos fortes numa promessa + prova; mostra o storyboard completo e os prompts exatos e ESPERA aprovação antes de gerar (mudança material reabre a aprovação).
  - metadata.tools = null: ferramentas não declaradas no payload.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill sim (com “Remove Skill”); placeholder do campo = guide_words exato; bloco de upload “Please upload the product image.”; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=9; content_hash=e3b0c44298fc1c14…; fornax_key=nest.skills.marketing_video_v2).

### AI talking photo (`ai_talking_photo`)

- ID `sk_official_52871f154122fe43`; tipo `ai_talking_photo`; origem `platform_recommend`; versão do conteúdo 10; hash `e3b0c44298fc1c14…`; fornax_key `ai_talking_photo`; favoritos 12; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Make pictures move with AI.
- **Ferramentas** (classe tools): _não declaradas (tools = null)_
- **Modelos padrão**: vídeo -; imagem -
- **Comportamento inferido** (não é instrução original):
  - Skill de tipo especial (skill_type ai_talking_photo): sem guia nem ferramentas no payload; fluxo próprio de foto falante.
- **Ao clicar em Use** (observado, somente leitura): destino compositor da Home (/home); chip da skill não; placeholder do campo sem guide_words: placeholder padrão do compositor; sem bloco de upload; botão “Upload reference material” sim; custo exibido 37 /s.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=10; content_hash=e3b0c44298fc1c14…; fornax_key=ai_talking_photo).

### Avatar Video (`avatar_video_skill`)

- ID `sk_official_1ebbd2c4efb79e46`; tipo `avatar_video`; origem `platform_recommend`; versão do conteúdo 7; hash `e3b0c44298fc1c14…`; fornax_key `avatar_video_skill`; favoritos 17; autor na UI: Pippit official.
- **Descrição comercial** (classe descricao): Digital Human Video
- **Ferramentas** (classe tools): _não declaradas (tools = null)_
- **Modelos padrão**: vídeo -; imagem -
- **Comportamento inferido** (não é instrução original):
  - Skill de tipo especial (skill_type avatar_video): sem guia nem ferramentas no payload; fluxo próprio de vídeo com avatar.
- **Ao clicar em Use** (observado, somente leitura): destino modal de criação do fluxo Avatar video (carrega com skeleton; conteúdo não renderizou na captura); chip da skill não; placeholder do campo sem guide_words: placeholder padrão do compositor; sem bloco de upload; botão “Upload reference material” não; custo exibido n/d.
- **Instruções privadas**: não acessíveis (md_type=tos; content_version=7; content_hash=e3b0c44298fc1c14…; fornax_key=avatar_video_skill).

## Strings embutidas nos bundles (classe i18n)

### esquema_skill_do_usuario

Campos e regras do formulário de criação/edição de skill (bundle Skill/AgentSkill).

130 itens. Amostra:

- `Pippit_businesscomponents_agentskill_btn_createskill` → Create Skill
- `Pippit_businesscomponents_agentskill_btn_close` → Close
- `Pippit_businesscomponents_agentskill_btn_deleteskill` → Delete Skill
- `Pippit_businesscomponents_agentskill_detail_title_fullcontent` → Full skill content
- `Pippit_businesscomponents_agentskill_btn_favoriteskill` → Favorite Skill
- `Pippit_businesscomponents_agentskill_btn_openskills` → Skills
- `Pippit_businesscomponents_agentskill_btn_retry` → Retry
- `Pippit_businesscomponents_agentskill_btn_selected` → Selected
- `Pippit_businesscomponents_agentskill_label_suggestions` → Skill suggestions
- `Pippit_businesscomponents_agentskill_label_skilllist` → Skill list
- `Pippit_businesscomponents_agentskill_btn_removefavorite` → Remove from favorites
- `Pippit_businesscomponents_agentskill_btn_useskill` → Use now
- `Pippit_businesscomponents_agentskill_btn_viewdetails` → View details
- `Pippit_businesscomponents_agentskill_label_categories` → Categories
- … (+116; todos no JSON)

### skill_de_fluxo_do_estudio_de_historias

Configuração de skill por ETAPA do workflow do Estúdio de histórias: Roteiro (剧本生成), Storyboard (分镜设计), Ativos (资产设计); campos: nome, uma frase, "规则与生成策略" (como planejar um conjunto de storyboards) e "单分镜提示词格式" (estrutura de campos do prompt de cada storyboard).

46 itens. Amostra:

- `Pippit_shortdrama_workflowskill_badge_active` → 当前生效
- `Pippit_shortdrama_workflowskill_stage_asset` → 资产设计
- `Pippit_shortdrama_workflowskill_button_cancel` → 取消
- `Pippit_shortdrama_workflowskill_button_clear` → 清空当前配置
- `Pippit_shortdrama_workflowskill_button_close` → 关闭
- `Pippit_shortdrama_workflowskill_status_comingsoon` → 即将上线
- `Pippit_shortdrama_workflowskill_button_copy` → 复制
- `Pippit_shortdrama_workflowskill_name_copy` → {text} 副本
- `Pippit_shortdrama_workflowskill_button_create` → 新建配置
- `Pippit_shortdrama_workflowskill_button_delete` → 删除
- `Pippit_shortdrama_workflowskill_desc_deleteactive` → 请先启用其他配置或清空当前配置，再删除此技能。
- `Pippit_shortdrama_workflowskill_dialog_description` → 为工作流的不同阶段配置技能规则与输出格式。
- `Pippit_shortdrama_workflowskill_error_detail_description` → 当前配置详情加载失败，请重试。
- `Pippit_shortdrama_workflowskill_error_detail_title` → 无法加载配置详情
- … (+32; todos no JSON)

### prompts_de_hook_do_estudio_de_marketing

Textos de prompt dos Hooks (botão "Ver prompt"); idioma original zh.

6 itens. Amostra:

- `Pippit_marketingagent_hook_prompt_conflictopening` → 开头 3 秒用强冲突制造悬念，快速呈现用户痛点。
- `Pippit_marketingagent_hook_prompt_resultfirst` → 开头 3 秒先展示使用结果，再回到产品如何解决问题。
- `Pippit_marketingagent_hook_prompt_questionopening` → 开头 3 秒用一个与目标人群高度相关的问题吸引注意。
- `Pippit_marketingagent_hook_prompt_producthit` → 让商品突然飞入画面，用人物反应立刻拉住注意力。
- `Pippit_marketingagent_hook_prompt_closeup` → 用超近景细节开场，再慢慢揭示完整商品。
- `Pippit_marketingagent_hook_prompt_interview` → 以真实问答切入用户痛点，顺势带出商品卖点。

### prompts_de_vitrine_do_estudio_de_marketing

Pedidos de exemplo da vitrine do Estúdio de marketing; idioma original zh.

6 itens. Amostra:

- `Pippit_marketingagent_showcase_prompt_industrytrend` → 结合我的行业和商品，分析近期营销趋势并生成一条有传播潜力的视频。
- `Pippit_marketingagent_showcase_prompt_viralremake` → 参考当前热门内容结构，为我的商品复刻一条原创营销视频。
- `Pippit_marketingagent_showcase_prompt_storyad` → 围绕我的商品写一支剧情广告：开头制造冲突，中段自然植入卖点，结尾给出转化动作。
- `Pippit_marketingagent_showcase_prompt_talentsales` → 让选中的达人用真实体验和场景化表达介绍商品，并给出明确购买理由。
- `Pippit_marketingagent_showcase_prompt_brandfilm` → 为我的品牌生成一支强调质感、价值观和产品核心利益点的品牌短片。
- `Pippit_marketingagent_showcase_prompt_festival` → 结合近期节日氛围和商品卖点，策划一条具备活动感和转化力的营销视频。

### modelos_de_prompt_de_ferramentas

Strings com marcador {…} ou prompts fixos de ferramentas de tela/imagem/vídeo.

5 itens. Amostra:

- `Pippit_seedream50pro_prompt_inpaintnumber` → Inpaint {number}
- `Pippit_seedream50pro_prompt_inpaintnumber` → 局部{number}
- `Pippit_seedream50pro_prompt_isolatelayers` → Isolate the layers of the image
- `Pippit_xyqcanvas_videominitool_prompt_refinevideocopy` → 帮我提炼这条视频的创作文案
- `Pippit_xyqcanvas_legacy_prompt_extend_video_backward` → 将 {asset} 向后延长

## Lacunas

- O corpo (SKILL.md) das skills oficiais NÃO é entregue ao cliente: md_type=tos com content_hash/content_version e fornax_key (plataforma de prompts). Nenhum prompt de sistema integral foi encontrado.
- O diálogo Details das skills oficiais não mostra "Full skill content"; só descrição, modelos padrão, autor, favoritos, exemplo em vídeo e categoria.
- A ordem de execução das ferramentas de cada skill e as regras de aprovação não estão comprovadas além dos textos de guide_words.
- Marketing Video, AI talking photo e Avatar Video não declaram ferramentas no payload (tools=null).
- Observar uma execução real de skill (load_skill, tool calls, SSE) exigiria gerar com créditos: não feito.
- Os views javascript/javascript-facts do REA 6.7.0 retornam estrutura (módulos, exports, referências), não literais de texto: as strings i18n vêm de varredura offline do código dos bundles (sha256 registrados). Só o chunk Skill (24 KB) foi reanalisado na 6.7.0.
- Conteúdo servido do Estúdio de marketing (listas de Hook/Style/Play completas) e das skills de fluxo do Estúdio de histórias por etapa não foi lido da API.
