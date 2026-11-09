# Relatório consolidado de cobertura do Pippit (21/10/2026, após a geração real Auto Route)

Fonte única do inventário: `FEATURE_INVENTORY.md` (gerado por `notes/build_inventory.py`). Este relatório NÃO declara equivalência nem cobertura integral: só o que tem evidência citada. O inventário é um piso, não o limite da plataforma. REA `verify_reconstruction` NÃO produziu aprovação: ver "Verificação formal" no fim deste relatório.

## 1. Todas as funcionalidades identificadas

**121 funcionalidades** (58 no início de 21/10; nenhuma removida). Por estado: investigada 56, verificada (teste automatizado) 38, implementada 18, bloqueada 9. Por área: Plataforma 26, Agente 25, Canvas 14, Editor 12, Conta 10, Estúdios 8, Créditos 5, Planos 5, Avatares 5, Modelos 3, Social 3, Telemetria 3, Ativos 2. A lista completa, com evidência e observação por linha, está em `FEATURE_INVENTORY.md`.

Módulos achados só no código (sem tela observada): TitleBarAgentConnect, TitleBarExportTask, global-age-gate, us-ban-notify, pwa-installer, dev-panel, help-center, argus-builder-strategy; domínios de API sem alcance a partir das páginas: inspiration, remix_tools, ad_maker, workspace, template (`PIPPIT_API_CATALOG.md`, 645 endpoints / 250 bundles, 0 falhas de parse).

## 2. Funcionalidades completamente investigadas (no nível de interface/contrato observado)

Critério: estado investigada/implementada/verificada **e** sem pendência declarada na observação. 61 linhas. NÃO significa comportamento de serviço comprovado além do que a evidência cita.

- **Plataforma** — Sidebar (Criativo, Marketing, Histórias, Tela, Ativos, Habilidades, Criação inteligente, Mais)
- **Plataforma** — Mais: Gerador de vídeos / Avatares e vozes / Análise / Editor
- **Plataforma** — Histórico de projetos com menu … (Compartilhar, Renomear, Excluir)
- **Plataforma** — Compartilhar projeto (link de visualização do processo)
- **Plataforma** — Rotas e parâmetros de origem (entranceFrom etc.)
- **Conta** — Informações da conta, IDs, copiar, Excluir conta
- **Conta** — Configurações: confirmação de uso de créditos (limite 450 / ignorar)
- **Conta** — Tarefas concluídas (exportações, Publicar, Baixar)
- **Créditos** — Livro-razão: lotes, expiração diária 23:59:59, bônus de conta +200, débito por menor validade
- **Créditos** — Concessão diária 80 e recebimento (credit_receive)
- **Créditos** — Três bolsas (vip/gift/purchase)
- **Créditos** — Tarefas de recompensa e convite (120/200, máx. 5)
- **Planos** — Catálogo Gratuito/Starter/Plus/Pro, mensal e anual, créditos, recursos
- **Planos** — Restrições por plano (paywall: vídeo em avatar, voz personalizada, modelos)
- **Modelos** — Catálogo de modelos de vídeo/imagem/áudio, proporções, resoluções, custos observados
- **Modelos** — Provedor local ffmpeg (NÃO é IA): vídeo de cor/zoom de imagem, último quadro, concatenação
- **Agente** — creative_design.md e storyboard.md como nós do canvas
- **Agente** — Segmentação ≤15 s e continuidade pelo último quadro
- **Agente** — Chat legado (agent-chat) somente leitura
- **Agente** — Criação inteligente (consentimento + geração diária automática)
- **Canvas** — Paleta rápida e menu Adicionar nó (7 tipos), autosave, arestas
- **Canvas** — Nó Personagem (+ diálogo Descrição do personagem, voz)
- **Canvas** — Nó Cena (+ diálogo Informações da descrição da cena; Mais: Analisar/Recorte/Expandir)
- **Canvas** — Nós Vídeo / Imagem / Áudio / Texto: painéis de geração e ferramentas
- **Canvas** — Biblioteca de estilos, Compartilhar tela, minimapa, atalhos, zoom
- **Estúdios** — Estúdio de histórias (colar/carregar roteiro, Roteirista de IA, Tela criativa, Redesenhar)
- **Ativos** — Biblioteca (Trabalhos, Upload, Personagem, Produto, Rascunhos, busca, ordenar)
- **Ativos** — Menu … do ativo (Baixar, Selecionar, Adicionar personagem/produto, Vincular produto, Excluir)
- **Editor** — Timeline: clipes, corte (in/out), velocidade, proporção, texto e legenda manuais
- **Social** — Contas vinculáveis, limites (0/3), estados
- **Telemetria** — Erros e monitoramento de desempenho
- **Editor** — Exportar: diálogo "Export settings" (capa, nome, marca d’água, resolução, qualidade, taxa de quadros, formato, Download)
- **Plataforma** — Templates (Modelos → /pt-br/template-studio, Estúdio de marketing)
- **Plataforma** — Integrações de marketplace/loja (citadas na página de preços)
- **Plataforma** — Página pública de preços: FAQ, avaliações, seções de recursos
- **Plataforma** — Gerador de vídeos (ai-video-generator-v2) e ferramentas populares
- **Planos** — Promoções variáveis (banner: 90% em 20/10 vs 40% em 21/10; Seedance 2.5 R$0.18/s vs R$0.45/s; 2.0 Fast R$0.04/s vs R$0.2
- **Agente** — Controles do composer: Agente ▾, @, Habilidades ▾, Modelo/Preferência ▾, toggle Tela
- **Agente** — Composer da home: Modelos e preferências (Vídeo/Imagem), Tag (@), Skills, Regras de crédito, interruptor Canvas
- **Estúdios** — Marketing: Hook — itens por categoria
- **Estúdios** — Marketing: comportamento Expand/Select dos formatos
- **Canvas** — Barra e ferramentas do canvas (projeto existente)
- **Plataforma** — Análise estática do app autenticado (250 bundles lvweb/platform-business_online)
- **Plataforma** — Módulos de página do app logado (chunks nomeados)
- **Plataforma** — Feed Inspiration / desafios (curtir, remixar, publicados, atividades)
- **Plataforma** — Barra de título: agent-connect, export-task, assinatura, idioma, notificações, usuário
- **Canvas** — Painel do agente do canvas: Chat history
- **Editor** — Seletor de proporção (Ratio)
- **Plataforma** — Ferramenta de navegação por CDP v2 (notes/cdp_ui.mjs + rea_diff.py cdp)
- **Agente** — Skills: menu Create skill (Create with AI, Upload Skill, Create manually)
- **Estúdios** — Marketing: diálogos Product e Character
- **Agente** — Reabertura do canvas e recuperação do resultado (list_project_file, asset/query, mget_asset_info, get_thread/get_run)
- **Agente** — Geração direta Auto Route na reconstrução local (src/directgen.mjs, rotas com os caminhos do Pippit, UI composer → canva
- **Agente** — Gerações diretas integradas ao app: projeto no histórico (abre /direct/…), cancelar run, lista local de tarefas, notific
- **Planos** — Paywall ao enviar com modelo pago (vídeo/imagem) no plano Free, antes de qualquer requisição
- **Conta** — Idioma (18 opções observadas) e Aparência claro/escuro persistentes
- **Plataforma** — Central de notificações com ponto de não lidas e "Todas lidas"
- **Plataforma** — Criação Inteligente: consentimento, ideias de vídeo diárias/sob demanda a partir do histórico (LLM ou regras), notificaç
- **Conta** — Configurações > Assistente de IA: URL/modelo/chave do LLM e do provedor de imagem, teste de conexão, modelo Whisper
- **Canvas** — Geração de imagem no nó Imagem por provedor do usuário (API compatível com OpenAI /images/generations)
- **Editor** — Qualidade de exportação: enum observado faster_export=0 / recommended=1 / better_quality=2 e mapa de resolução {360,480,

## 3. Funcionalidades parcialmente investigadas

51 linhas com pendência declarada (o que falta está no campo observação):

- **Plataforma** — Home (agente: abas Criativo/Marketing/Histórias, composer, skills recomendadas) — Galeria "Trabalhos em destaque" não reproduzida (conteúdo do serviço).
- **Plataforma** — Notificações (central de anúncios) — Conteúdo editorial do serviço; não reproduzido.
- **Conta** — Configurações: Idioma, Aparência, Salvar sem marca d'água — Opções internas dos submenus não lidas; "Salvar sem marca d'água" não aberto (pode alterar configuração).
- **Conta** — Menu da conta > Mais: CLI, Lista de desejos, Atendimento — Páginas externas/CLI não abertas.
- **Agente** — Fluxo: habilidades → arquivo lido → pergunta → design/storyboard → confirmação → segmentos → render — Planejador local por regras; prompt/LLM interno do Pippit DESCONHECIDO.
- **Agente** — Falhas/gating por plano e mensagens de erro — Recuperação automática de modelo não observada.
- **Agente** — Seleção e criação de skills (Criar com IA/Enviar/Manual) — Formato interno das skills DESCONHECIDO; loja e detalhes reproduzidos.
- **Agente** — Protocolo do chat/agente (submit_run, subscribe_run/thread, get_run, cancel_run) — Estático: submit_run com agentName (padrão pippit_image_ai_editor_agent_v0), entranceFrom, requestId, message, runExtra{client_extra, babiParam{generate_id,user_message_id,section_id,scene_lv1=ai_agent,scene_lv2=front_tool,tool_id,sub_tool_
- **Canvas** — Nó Estúdio de direção 3D — Reconstruído localmente (studio3d.mjs + studio3d-ui.js): categorias, câmeras, movimentos, quadros-chave 30 fps, painel de cena, persistência. NÃO reproduzido: modelos/animações reais (só primitivos); presets de câmera aproximados. Aba Image
- **Canvas** — Persistência (canvas.json) e retomada — Formato interno do original DESCONHECIDO (apenas nome/namespace observados).
- **Estúdios** — Estúdio de marketing (produto, personagem, formatos, gancho, estilo, Generate) — Cartões "Remixar"/prévias do serviço não reproduzidos; Generate usa o agente (bloqueado sem provedor).
- **Avatares** — Foto em avatar: assistente de 3 etapas, validação JPG/PNG>256, consentimento, 3 usos gratuitos — Etapas Recortar/Verificar/Enviar (nome "My Avatar N" + voz padrão) observadas até antes de Enviar; critério de verificação do Pippit DESCONHECIDO; recorte livre só rotação reconstruído.
- **Avatares** — Menu … do avatar, Aplicar, prévia de áudio — Aplicar implementado como @menção. Em avatar de EXEMPLO o hover mostra ícone de alto-falante (prévia de áudio) e botão Apply, sem menu …; o menu … provavelmente existe só nos avatares do próprio usuário (conteúdo pessoal: não investigado).
- **Editor** — Menu: Mídia, Legendas, Avatares, Texto, Áudio, Elementos, Corte rápido — Elementos/efeitos/transições/filtros, músicas licenciadas: conteúdo do serviço não reproduzido.
- **Editor** — Exportação (MP4 real via ffmpeg) — Resoluções/formatos do original e marca d’água não reproduzidos.
- **Editor** — Painel direito (Básico, Plano de fundo, Ferramentas inteligentes, Áudio, Animação, Velocidade) — Conteúdo lido (Plano de fundo, Ferramentas inteligentes, Áudio, Animação, Velocidade; ver NODES_AND_AVATAR_FLOWS 9.4). Local: só velocidade/corte; efeitos de animação e ferramentas inteligentes não reproduzidos.
- **Editor** — Tour de balões (Recursos materiais / Alterar barra lateral) — Passo 1 e 2 vistos uma vez; não reproduzido.
- **Telemetria** — Page view GET /lv/v1/event/report (variantes cms/landing) + coletor local — Corpo da resposta original desconhecido.
- **Telemetria** — Slardar/MCS/A-B/GA/Bing/Clarity — Corpos desconhecidos; não reproduzidos.
- **Plataforma** — Botão de ajuda (?) / central de ajuda — Clique no botão (?) sem efeito visível em duas tentativas; a Central de ajuda pública é /pt-br/resource/help-center (link do rodapé, não aberta).
- **Estúdios** — Estúdio de marketing: seletores Ad formats e Hook (diálogos com busca e categorias) — Ad formats: busca "Search ad format", categorias (All, Trending Ads, UGC Ads, Product Demos, Visual Effects, Story-Driven Ads, Seedance 2.5, ASMR), cartões com Expand/Select (Shot-and-Drop Reveal, Secret Shelf Test, Living Garment Swap Reve
- **Plataforma** — Widget de ajuda (?): iframe kefu-im-i18n.byteintl.com (helpcenter_web e contact-im) — Central de atendimento hospedada em byteintl.com com identificação do usuário por token na URL (valor NÃO registrado). Conteúdo/chat do widget não lido; não reconstruído (serviço de terceiros).
- **Plataforma** — Notificações: diálogo com "All read" e 8 anúncios (jan–abr/2026) — Anúncios editoriais: GPT Image 2, 700+ avatares via @, pesquisa de satisfação (pt/es), descontinuação temporária de Nano Banana Pro/Veo 3.1 e Seedream 4.1, Seedream 5.0, geração agendada e mais tarefas de crédito. Conteúdo do serviço, não r
- **Conta** — Menu da conta: Completed tasks, Account management, Settings (EN), More, Terms and Policies, Sign out — Confirma rótulos; e-mail mascarado exibido. Sign out não clicado.
- **Estúdios** — Marketing: Visual style (diálogo com busca e categorias) — Busca "Search style"; 20 estilos em 5 categorias: Natural Living (7: Outdoor Forest Natural Light, Paris Street Film, Candid Social Film, Scandinavian Natural, Mediterranean Wellness, California Sunshine Lifestyle, French Countryside Natura
- **Plataforma** — Catálogo de endpoints do app logado (645 caminhos) — Só nomes de caminho e contagem de ocorrências nos bundles; métodos, parâmetros e respostas desconhecidos exceto os já capturados. Cobre áreas ainda sem captura (inspiration, omni, digital_human, remix_tools, ad_maker, age_gate, speech, temp
- **Avatares** — Omni / personalização de humano digital (omni/*, digital_human/*) — Endpoints: omni/{get_tone_list,get_hot_audio_list,text_to_speech,audio_to_text,image_object_detect,get_img_category_list,preprocess_submit_request,before_create_limit_check,try_task,retry_task,batch_delete_digital}. Corpo/estados não observ
- **Plataforma** — Portas de idade, aviso US, instalador PWA, painel dev — Módulos condicionais encontrados só no código (lv/v1/sc/age_gate/*). Condições de ativação desconhecidas.
- **Conta** — Menu da conta > More (CLI, Feature wishlist, Customer service) e Settings (Language, Appearance, Plans and pri — Language: 18 idiomas (Bahasa Indonesia, Bahasa Melayu, Deutsch, English [atual], Español, Filipino, Français, Italiano, Polski, Português, Tiếng Việt, Türkçe, Русский, ไทย, 日本語, 简体中文, 繁體中文, 한국어); Appearance: Light mode (atual) / Dark mode; 
- **Agente** — Skills: diálogo de detalhes (ex. Drama Ads) — Título, descrição, exemplo em vídeo (play/mudo/tela cheia), Add to favorites, Author (Pippit official), Favorites (32), Default models (Dreamina Seedance 2.5, GPT Image 2), categoria (Marketing Advertising), botão Use now (não clicado). Det
- **Plataforma** — Arquitetura de UI por contribuições (TitleBar): agent-connect e export-task — Estático: serviço de configuração de UI registra itens na barra de título — TitleBarAgentConnect (posição right, ordem 101, tipo Custom, NÃO renderiza em modo PC embutido) e TitleBarExportTask (ordem 4, painel de tarefas de exportação). Nen
- **Plataforma** — Domínios de API sem alcance a partir das páginas (inspiration, remix_tools, cc_web/ad_maker, workspace, templa — No grafo de módulos NENHUMA página do app logado alcança esses literais (inspiration ×46, remix_tools, ad_maker ×7, workspace, template): o SDK os define, mas o app deste bundle não os usa (ou são usados por outra superfície). NÃO tratar co
- **Agente** — Modos de criação do composer (Agent / Video / Image / Audio) e custo estimado ao lado do botão Canvas — Creation mode: Agent (vídeo longo: o agente refina e escolhe modelos; estimativa padrão 555 = 37 créditos/s × 15 s), Video, Image e Audio (escolha o modelo e gere direto). Modo Image com GPT Image 2, proporção Smart, 1K: custo exibido 6 cré
- **Plataforma** — Chamadas de API observadas em execução (leitura) em 8 páginas — 53 chamadas de API do app (de 69 distintas; as demais são telemetria/terceiros) — listagens, configuração, notificações e assinatura de ativos, todas 200; só método+caminho+status (sem corpos de resposta). Confirma a origem servidor dos dad
- **Agente** — Geração direta de vídeo pelo composer (modelo Auto Route → MiniMax-H3-trial, 12 créditos LimitFree) até o canv — Sequência completa observada (check de crédito, create_creative_project, namespace/assets, submit_run, SSE, polling, resultado por list_project_file/asset/query/mget_asset_info). Sucesso: vídeo 768x1344, 4,5 s, saldo 125→113. Falta: corpo d
- **Agente** — Validação de prompt de vídeo no servidor (mínimo 15 caracteres; erro em run.fail_reason.detail, UI mostra só m — Observada com prompt de 9 caracteres: run.state 4, code 99999, sem débito. Outros limites de validação desconhecidos.
- **Créditos** — Pré-checagem e débito de créditos na geração (batch_check_withhold_deduct, user_credit; débito no envio) — Check: credits_amount 12, consume_types LimitFree, paywall null. Débito visto na 1ª leitura de user_credit após submit_run (gift_credit 125→113). Regras de estorno, expiração e outros benefit_type desconhecidas.
- **Agente** — Conteúdo dos fluxos SSE (asset/sse_asset, agent/subscribe_thread lidos por replay; subscribe_run ao vivo NÃO l — Formato lido: ping/AssetJsonUpdate com patches do canvas (nós biz/video, generation.state.status failed/succeeded) e subscribe_thread message com run_list. DESCONHECIDO: blocos incrementais ao vivo, enable_chunk_stream, stream_cursor, subsc
- **Canvas** — Canvas como ativo JSON versionado com patches (content/nodes/<id>, generation.state failed/succeeded) e SSE po — Formato dos eventos copiado do replay observado; fluxo incremental ao vivo continua desconhecido (só atualizações de estado do run/ativo são emitidas).
- **Editor** — Diálogo Export settings (nome obrigatório ≤100, marca d’água, resolução 360p–4k, qualidade, fps 24–60, MP4/MOV — Opções e padrões copiados do original; mapeamento qualidade→CRF/preset e "2k"=1440 são locais (UNOBSERVED); capa não reproduzida; "Free for now" só rótulo.
- **Agente** — Skills: abas Todos/Minhas skills/Favoritos, favoritar, detalhes, criar manualmente e usar na Home — Formato local (nome, descrição, instruções); "Criar com IA" e "Enviar skill" continuam bloqueados (formato/serviço desconhecidos); contador Favoritos do original (32) não reproduzido.
- **Estúdios** — Marketing: seletores Ad formats, Hook e Visual style com busca, categorias, Expand/Select e chips no prompt — Visual style completo (20 estilos/5 categorias); Ad formats com os 8 cartões vistos (categoria de cada um NÃO capturada: só em "All"); itens de Hook não capturados; prévias/Remixar do serviço não reproduzidos.
- **Canvas** — Ferramentas de nó sem IA: Extrair quadro, Cortar, Extrair áudio, Recortar, Girar (ffmpeg; geram novo nó ligado — Só as ferramentas que não dependem de IA; as demais (Melhorar qualidade, Analisar, Amplificar, Preencher, Isolar camadas, Panorama…) respondem 501 com motivo. Resultado não destrutivo (novo nó) é decisão local: o comportamento do original (
- **Canvas** — Nó de Áudio com voz sintética local (Windows SAPI, não-IA, vozes en-US) quando o provedor local está ativo — NÃO é o Seed Audio 1.0 do Pippit (VIP); só Windows; sem provedor o nó segue bloqueado. Qualidade/idiomas diferentes do original.
- **Editor** — Painel direito: Áudio do clipe (volume dB, fade in/out, redução de ruído, mudo, velocidade) e Plano de fundo ( — Itens observados no painel; efeitos de Animação, Ferramentas inteligentes (Reenquadramento, Retoque, Remover fundo, Rastreio), Modificador de voz e Câmera lenta suave NÃO reproduzidos; mapeamentos para filtros ffmpeg são locais.
- **Agente** — Planejador do agente com LLM real (Ollama local qwen3-local ou servidor compatível com OpenAI): temas, design  — LLM é do usuário/local, NÃO o do Pippit (prompt interno e modelo desconhecidos): o conteúdo planejado não é equivalente. O render continua com o provedor local (cartões com a descrição do storyboard); geração de vídeo por IA segue dependend
- **Agente** — Criar skill com IA (LLM gera nome, descrição e instruções) e refinar prompt no Gerador de vídeos — Formato local de skill; o formato interno e o fluxo "Criar com IA" do Pippit são DESCONHECIDOS. "Enviar skill" continua sem formato de arquivo conhecido.
- **Canvas** — Melhorar qualidade (vídeo) e Amplificar (imagem) convencionais: ampliação 2x lanczos + ruído + nitidez — NÃO é o upscaler de IA do Pippit. Ferramentas de segmentação/visão (Isolar camadas, Preencher, Analisar, Panorama…) seguem 501.
- **Editor** — Corte rápido por silêncio (ffmpeg silencedetect) e legendas automáticas por Whisper (filtro whisper do ffmpeg, — Silêncio: real e testado. Whisper: comando, parse de SRT e 501 sem modelo testados; transcrição ponta a ponta NÃO testada (sem modelo ggml no PC; nada é baixado automaticamente). Corte rápido POR TEXTO do Pippit não reproduzido.
- **Agente** — Skills como pacotes SKILL.md em ZIP: formulário (nome ≤20, descrição ≤50, texto-guia ≤50, guia de mídia ≤12, c — Regras e mensagens copiadas dos bundles (formato de armazenamento = ZIP com SKILL.md na raiz, SKILL.md protegido, só Markdown criado na UI, sem scripts). UNOBSERVED: limite do identificador (40), tamanho máximo do ZIP (5 MB), extensões proi
- **Agente** — Estados do run (enum RunState) e do nó (generation.state.status) — Enum dos bundles: 0 Unspecified, 1 Submitted, 2 Working, 3 Completed, 4 Failed, 5 Canceled, 6 InputRequired, 7 Generating, 8 ProgramInterrupt, 9 Interrupt (1 e 4 vistos em execução). Status do nó: submitting/queued/running/generating/proces

## 4. Bloqueios por plano ou permissão

Plano Free da conta de teste; nenhum paywall foi contornado.

- **Conta** — Login e gerenciamento (Google/TikTok/Facebook) — Provedores de identidade do Pippit; usuário local único.
- **Planos** — Compra/assinatura real — Fora do escopo autorizado (pagamentos).
- **Modelos** — Geração por IA (vídeo/imagem/áudio/avatar) — Os modelos remotos do Pippit não existem localmente; sem provedor a geração falha explicitamente, sem débito e sem resultado fictício.
- **Avatares** — Vídeo em avatar (1999 créditos; paywall no gratuito) — Exige serviço de geração/assinatura.
- **Avatares** — Voz personalizada (180 créditos; paywall) — Paywall "uso ilimitado de Voz personalizada"; clonagem exige serviço. Referência de áudio local implementada.
- **Editor** — Legendas automáticas, Letras automáticas, Corte rápido por transcrição — Exigem reconhecimento de fala; retorno 501 explícito.
- **Social** — Vincular conta (OAuth TikTok/Facebook/Instagram/YouTube) — Redirecionamento TikTok → tiktok.com/login observado; callback/escopos não observados; requer app OAuth registrado.
- **Social** — Publicar / Publicação agendada / Análise — Diálogo "Programar publicação" capturado (conta, data/hora, descrição 0/2200); local replica o diálogo com Programar desabilitado; fluxo após selecionar conta NÃO observado (sem contas).
- **Agente** — Criação inteligente (/smart-creation): página de autorização — Só mostra a autorização: "Authorize Pippit to use chat history and assets to auto-create videos" em 3 passos (gerar com o Video agent; vídeos grátis criados automaticamente, por tempo limitado; ver no dia seguinte na pró
- **Paywall por modelo (client-side, antes de qualquer requisição)**: GPT Image 2 (6 créditos), Seedream 5.0 Pro (10), Seedance 2.0 Mini Trial (28 por 4 s) → modal "Go Starter now for unlimited use…" (`captures/audit/rea`, `PIPPIT_CAPTURE_STATUS.md`). **Exceção observada: Auto Route** (resolve para `MiniMax-H3-trial`, 12 créditos `LimitFree`, `paywall:null` em `batch_check_withhold_deduct`) executou normalmente.
- Compras, assinaturas, publicação/OAuth, exclusões e envio de conteúdo pessoal: fora do escopo autorizado.

## 5. Comportamentos ainda desconhecidos

- **SSE ao vivo**: blocos incrementais de `agent/subscribe_run` (e de `subscribe_thread`/`sse_asset` durante a geração), `enable_chunk_stream`, `stream_cursor`. Lidos só por replay de estado (ver §6); `subscribe_run` nunca lido.
- **Estados de run**: observados 1 (submetido) e 4 (falhou); concluído/cancelado/fila desconhecidos. `get_run` nunca visto num run bem-sucedido; `cancel_run` não observado.
- **Ligação run ↔ `generation_task_list`**: as respostas lidas não mostraram a tarefa do run (campos `id, task_type, status, result, meta, error_code, error_msg` conhecidos, mas sem correspondência comprovada). Códigos de erro além de 99999 e regras de moderação/fila (`get_user_queue_info`).
- **Créditos**: débito no envio observado (125→113); estorno em falha por validação (sem débito), expiração, `vip_credit`/`purchase_credit`, `consume_types` além de `LimitFree`, preços de outros modelos fora do plano Free.
- **Modelo/roteamento**: como o Auto Route escolhe o modelo (observado só `MiniMax-H3-trial` para vídeo curto) e como o agente de "Agent mode" planeja workflows.
- Corpos/respostas de quase todos os demais endpoints dos 645 (apenas 53 leituras + os do protocolo de geração foram observados); conteúdo servido pelo servidor (Hook, Visual style, Ad formats, templates, skills da loja, notificações).
- Condição de exibição de TitleBarAgentConnect/ExportTask, age-gate, us-ban-notify e domínios sem alcance (inspiration, remix_tools, ad_maker); opções internas de Settings (não clicadas); fluxos "Create skill".

## 6. Evidências que sustentam as conclusões

| Conclusão | Evidência |
|---|---|
| Interface e opções de cada tela | `captures/auth/cdp/t_*` (controlador v2, `report.json`), `captures/audit/rea/*` (cenários REA, ids `ev_…` no inventário e em `PIPPIT_CAPTURE_STATUS.md`) |
| Código do app (250 scripts) e catálogo de 645 endpoints / 333 esquemas de corpo / alcance página→endpoint | `scripts/auth_bundles/` (sha256 em `notes/auth_bundles_log.tsv`), `evidence_cli/auth_bundles/INDEX.md` (REA), `PIPPIT_API_CATALOG.md`, `notes/auth_api_calls.json`, `notes/auth_sdk_schemas.json`, `notes/auth_module_graph.json` |
| 53 leituras observadas em 8 páginas (método, caminho, status) | `captures/audit/rea/net_home.json` (ev_f0dca9be…ea44), `notes/observed_calls.json`, `notes/observed_contracts.json` |
| Protocolo de geração: `batch_check_withhold_deduct` → `create_creative_project` → `submit_run` → SSE → polling (`user_credit`, `generation_task_list`) → resultado | HARs `captures/auth/autoroute/send2.har` (sha256 92d8671a…), `send3.har` (35c6843f…), `erro_canvas.har`, `ok_canvas.har` (322b420f…); REA `inspect-web-network-capture` ev_68227c58…, ev_a5e0ff66…, ev_e3cb04c6…; detalhes em `PIPPIT_API_CATALOG.md` (seções "Protocolo de geração direta observado", "Contratos observados", "Conteúdo dos fluxos SSE") |
| `get_run`/`get_thread`: estado 4 e `fail_reason.detail` ("prompt ≥ 15 caracteres") | `erro_canvas.har` (entradas get_run/get_thread), `sse_erro_sse.json` |
| Débito 125→113 no envio, `LimitFree`, 12 créditos | `send3.har` (`user_credit` antes/depois do `submit_run`), UI (screenshots `captures/auth/cdp/t_autoroute_*`) |
| Estado do nó: `generation.state.status` failed/succeeded, canvas como asset JSON com patches | `sse_erro_sse.json`, `sse_ok_sse.json` (replay via CDP `Network.streamResourceContent`; **não** é o fluxo ao vivo) |
| Resultado de vídeo (768×1344, 4467 ms, mp4) | `ok_canvas.har` (`mget_asset_info`, `list_project_file`, `asset/query`) |
| Paywall do plano Free nos modelos pagos | `captures/audit/rea` (cenários de envio bloqueados no cliente, 0 créditos), `PIPPIT_CAPTURE_STATUS.md` |
| Reconstrução local funciona e é coerente com o observado | testes `local_reconstruction/test/*.test.mjs` (e2e, ui, parity 26/26 rótulos…) — autoridade menor que `verify_reconstruction` |
| Integridade dos artefatos | `MANIFEST_SHA256.csv` (`notes/build_manifest.py`) |

Ferramenta: o `capture_browser_scenario` do REA via MCP estoura o orçamento de eventos (~1900) no carregamento do app; por isso a rede do protocolo foi registrada pelo controlador (`notes/cdp_ui.mjs`, recurso `netlog` → HAR 1.2 sem cabeçalhos/cookies, parâmetros de assinatura removidos) e analisada pelo REA CLI. Dados dos HARs contêm ids da conta de teste (locais).

## 7. O que já temos de suficiente para implementar

Com evidência observada (não presumida):
- **Shell e telas já implementadas/verificadas** (home, sidebar, histórico, Marketing, Canvas, Avatares, Ativos, Editor com export, Skills, Notificações, Planos/créditos, Estúdio 3D etc. — ver inventário, estados IMP/VER).
- **Composer de geração**: modos Agent/Video/Image/Audio, seletor de modelos, custos exibidos, duração/resolução/proporção, Auto Route com padrão 9:16·4 s·768P e custo "12 (72 riscado)".
- **Contrato HTTP local de geração direta** (para um servidor local que simule o serviço): envelope `{ret, errmsg, log_id/svr_time, data}`; `batch_check_withhold_deduct` (corpo e resposta, `credits_amount`, `consume_types`, `paywall`); `create_creative_project`; `submit_run` (corpo completo: `agent_name`, `tool_name`, `param{prompt,ratio,resolution,model,duration_sec,…}`, `run_extra.babi_param/client_extra`, `concurrency_control`; resposta `run{state:1,…}`); `get_run`/`get_thread` (`scopes`); `generation_task_list`; `user_credit`; `asset/*` (namespace, batch_patch, mget_asset_info, list_project_file, query); formato de patches `AssetJsonUpdate` do canvas.
- **Regras observadas**: prompt de vídeo ≥ 15 caracteres (falha `code 99999` com `detail`), débito no envio, sem débito em falha de validação, estados de nó `failed`/`succeeded`, canvas reaberto sem `directGenerationIntent` não reenvia.
- **Paywall por plano**: comportamento client-side nos modelos pagos e `paywall` do servidor `null` quando o item é `LimitFree` (suficiente para simular planos locais).
- Catálogo de 645 endpoints com chaves de corpo estáticas como andaime para mocks adicionais (marcados como "estático", não validado em execução).

## 8. O que ainda não pode ser reproduzido com fidelidade comprovada

- A **geração em si** (saída do modelo, tempos/filas, progresso) — só é possível simular localmente; a duração observada foi ~84 s para 4 s de vídeo.
- O **fluxo SSE ao vivo** de `subscribe_run`/`subscribe_thread`/`sse_asset` durante a execução (blocos incrementais, cursor, chunking) e `cancel_run`.
- **Todos os estados de run** além de 1 e 4, erros além de 99999 e a correspondência run↔task em `generation_task_list`.
- **Fluxos de planos pagos** (Seedance 2.5, GPT Image 2, Seedream sem paywall, vídeo/voz em avatar, ferramentas de IA do gerador, exportações/IA do editor), **publicação e OAuth** (TikTok/Facebook/Instagram), compras e assinaturas.
- **Conteúdo do servidor** (listas de Hook/Visual style/Ad formats, templates, skills da loja, notificações, galeria) e o **planejamento do Agent mode**.
- **Equivalência formal**: não comprovada. A comparação passiva REA da Home (original × local) deu `changed` (DOM, acessibilidade, storage) e `unknown` nas demais dimensões; `verify_reconstruction` não pôde ser alimentado com a evidência (ver "Verificação formal").
- Qualquer item da §3 e §5 além do que as evidências da §6 sustentam.

## Cobertura real para autorizar a retomada da implementação

- **Comprovada**: 61 de 121 funcionalidades sem pendência declarada; 51 parciais; 9 bloqueadas por plano/permissão. Contrato de rede da geração direta (1 modelo: Auto Route/MiniMax-H3-trial) capturado de ponta a ponta, com exceção do SSE ao vivo.
- **Sugestão** (a decidir pelo usuário): retomar a implementação funcional na ordem: (1) servidor local de geração direta fiel ao contrato observado (check → projeto → submit_run → estados → assets/canvas patches → débito); (2) canvas como asset JSON com patches; (3) validações (≥15 caracteres) e erros com `fail_reason`; (4) planos/paywall; (5) pendências da §3 sem custo. Não afirmar equivalência enquanto a verificação formal estiver pendente.

## Verificação formal (REA, 21/10/2026)

- Capturas passivas da Home: original (aba logada do Pippit, CDP 9222) e reconstrução local (`http://127.0.0.1:5180/#/home`, Chrome próprio CDP 9333, perfil `C:\w\verify_chrome`), ambas 1440×900, via `rea inspect-web-page` (evidências ev_bbe0a4d5…, ev_952ea874…; `captures/verify/inspect_*_home.json`).
- `rea compare-web-captures` (evidência ev_f2a0a9a2…cc9d9; `captures/verify/compare_home.json`): **overall_status = changed**; DOM changed (2), acessibilidade changed (1), storage changed (1); scripts, resources, rede, metadata e WebMCP = **unknown** (capturas com cobertura limitada ou filtrada por política).
- `verify_reconstruction` (MCP) recusou a evidência da CLI ("Missing comparison Evidence": MCP e CLI não compartilham o repositório de evidências); alimentar `compare_web_captures` do MCP exigiria colar inline ~300 KB (DOM 206 KB + acessibilidade 111 KB) do original, não feito. Não existe comando `verify-reconstruction` na CLI. **Resultado: nenhuma alegação verificada; o resultado observável é "diferente".**
- **Alegação estreita (interação, 21/10)**: "abrir o menu de modo de criação na Home não navega". Cenários REA gravados nos dois lados (original `ev_ca4707f4…`, local `ev_fe944f7e…`, 3 passos alinhados por step_id, URL normalizada por regras literais) e comparados com `compare_web_captures` (`ev_04b0abf9…`): **overall_status = unknown** — (1) a seção `events` ficou `missing` nos dois lados (mesmo pedindo `page-errors`), (2) `capture_context_mismatch` inevitável porque a origem do cenário difere (`https://www.pippit.ai` × `http://127.0.0.1:5180`). Na tentativa de selecionar "Video" no menu do original o seletor foi ambíguo (2 itens contêm "Video") e a captura falhou; não repetida.
- **`verify_reconstruction` não aceita comparações web**: com `ev_04b0abf9…` devolveu "Comparison Evidence identity or authority disagrees" para `behavioral/interaction` e `structural-artifact/overall` (esses tipos exigem comparações de processo/artefato/função, não `rea.web-capture-diff`). **Conclusão: para esta reconstrução web o REA só oferece `compare_web_captures` (resultado `changed`/`unknown`), nunca uma aprovação formal; qualquer afirmação de equivalência continua proibida.**
- Esperado: a reconstrução é funcional/estrutural, não um clone DOM; a Home local omite a galeria da comunidade e usa componentes próprios. Para uma verificação formal útil faltam alegações comportamentais estreitas (ex.: sequência de requisições da geração direta) com cenários REA gravados dos dois lados e normalização declarada.

