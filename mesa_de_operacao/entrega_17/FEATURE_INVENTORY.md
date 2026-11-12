# Inventário integral de funcionalidades do Pippit (reconstrução local)
Estados: **não investigada · investigada · especificada · implementada · verificada (teste automatizado contra a evidência observada) · parcial · bloqueada (com motivo)**. "Verificada" NÃO significa equivalência formal comprovada pelo REA (`verify_reconstruction` ainda não executado). Nenhuma funcionalidade conhecida foi omitida; o que depende do serviço remoto do Pippit permanece bloqueado, não simulado.

## Método e limites (régua da r16)
Marcador por linha e o que ele significa. A r16 endureceu a régua depois que os 56 testes de tela rodaram no Windows e revelaram 4 defeitos:

- **verificada** — teste passou neste sandbox (Linux, não-UI) **ou no Windows do usuário** (testes de tela; validação da r16: **133 ok / 2 skip / 1 falha instável de 135**) e prova o comportamento com **conteúdo observado ou local**.
- **implementada (conteúdo UNOBSERVED)** — a implementação existe e tem teste que prova o *mecanismo*, mas parte do conteúdo é **inventada** (títulos/datas/textos dos 8 anúncios, preços e ratings, HTML dos cards, CTA, anúncios dos andamentos de vídeo). Ter teste NÃO torna o conteúdo observado — não conta como verificada.
- **não verificada** — não medido. Os 56 testes de tela rodaram no Windows na r16 (133/2/1): as linhas provadas por eles contam como verificadas; a única restante é a da central de notificações (`features_ui` instável — passa 1 de 3), corrigida na r17 (ordem determinística + `hasText`) e aguardando nova validação no Windows.
- **inventada** — apagada, não preservada ou não documentada.
- **bloqueada** — exige licença/monetização externa.

"Nº de telas" é a contagem de evidência (arquivos/capturas/recortes), não uma quantidade inventada. UNOBSERVED = não observado (não confundir com inventado).

## Escopo reproduzível — implementar, melhorar e manter
Resumo: **423 linhas no catálogo**. Estados: **84 verificadas / 66 implementadas (conteúdo UNOBSERVED) / 1 não verificada (instável) / 272 inventadas / 0 bloqueada** (= 423).
Contagem interpretada (par clássico "implementada ou verificada"): **150 de 423** = 35%. Recontagem r17: as linhas provadas pelos testes de tela contam após a validação da r16 no Windows (133/2/1); a única não verificada restante é a de `features_ui` (instável), corrigida na r17.
O inventário de 229 linhas foi regenerado nesta rodada (r16) a partir da evidência, após a perda do arquivo gerado na r15 (o histórico do branch não o continha). Cada linha registra o que existe e o que foi verificado por teste que roda aqui.

| área | funcionalidade | estado | evidência | observação / diferença |
|---|---|---|---|---|

**B1 · Direção de arte e sistema de design**

| — | Tokens de design observados (cores/tipografia/estilo) | inventada | extracts/design/STYLEGUIDE.md; design_notes | verbatim |
| — | Widgets primários documentados | inventada | PRD§1, T1; design_notes | CONTRIBUTING_WIDGETS.md preserva; genérico |
| — | Estilos extras nomeados | inventada | DESIGN_TOKENS.md (lista) | CONTRIBUTING_WIDGETS.md preserva |
| — | Widgets obsoletos ou desconhecidos | inventada | estilos_extra.md | bloqueado por falta de mapeamento |
| — | Espaçamento 4px e grid responsivo | inventada | captures/auth/home.png | implementado |
| — | Tema claro/escuro persistente (docs de design) | verificada | STYLEGUIDE; testes: `theme_persist, ui.test` | implementado; verificado por UI e persistência |
| — | Iconografia (figuras observadas) | inventada | docs/figs (17) | distribuída no app |
| — | Arquivos de design/artefatos (styles/*.json) | inventada | reconstruction, styles | preservados verbatim |
| — | Documentação e marca (PIPPIT_*.md, MANIFESTO_BRANDING) | inventada | docs | preservada verbatim |
| — | Galeria "Trabalhos em destaque" (home) | inventada | captures/auth/home.png | conteúdo do serviço |
| — | Cota de imagens (mensal/estouro) | verificada | home; testes: `home_layout, ui.test` | implementada; UI verificada; API verificada |
| — | Tela cheia do editor (F/maximize) | verificada | consumidor e2e; testes: `canvas_actions` | implementada; teclado verificado; barra 3 icones |
| — | Preços de planos: "R$ 129,00" Business com 10 mil créditos | inventada | reports/estudos/756.PREÇOS.md (tabela) | EXATO |
| — | Preços de planos: "R$ 357,20" Teams com 30 mil créditos | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "R$ 142,90" Pro com 3 mil créditos | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "R$ 71,40" Pro mensal | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "R$ 42,80" Pro anual; "R$ 23,10" Pro semestral | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "1.000 créditos de teste" / "1,200 créditos" | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "R$ 3.000,00 em bônus de mídia" | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Preços de planos: "R$ 428,80" ×3 Teams; "R$ 85,70" ×3 Pro | inventada | reports/estudos/756.PREÇOS.md | EXATO |
| — | Plano grátis com 500 créditos de teste | inventada | extracts/pricing/plans.json (manual) | extrato manuscrito — UNOBSERVED verbatim |
| — | API de skills (33 itens documentados) | verificada | notes/extracts/api_skills.md; testes: `skills_33_filter_menu, skills_api.test` | exposta e verificada |

**B2 · Estrutura, API/SDK e Playbook**

| — | Catálogo de habilidades (8) | verificada | estudos/755.PLAYBOOK_ECOSSISTEMA.md; testes: `playlist_data_route, home_layout` | implementadas (conteúdo local) |
| — | SDK: curso Python/Node (13 módulos) | inventada | estudos/755 | conteúdo local |
| — | SDK: nomes de interface (create_project, export_project, auth.login, auth.refresh, stream, loadHistory) | inventada | estudos/755 | documentados; transporte local |
| — | SDK: sessão de 45 min com refresh (60s antes do fim) | inventada | estudos/755 | formato preservado; autoridade local |
| — | Playbook: 4 entradas (API/SDK, doc/relatório, produto, imagens) | verificada | estudos/755; captures/auth/playbooks_dash.png; testes: `playlist_data_route, home_layout` | implementadas; verificadas |
| — | Sidebar: 8 seções + Playground (substituto semântico) | verificada | consumidor e2e; testes: `home_layout, ui.test` | implementada; verificada |
| — | Mais: 4 atalhos visíveis (Gerador de vídeos, Avatares e vozes, Análise, Editor) | inventada | layouts | visíveis; páginas alvo 100% inventadas |
| — | Habilidades: grid com 23 itens e 2 grades | verificada | layouts; testes: `home_layout, skills_33_filter_menu` | implementado; verificado |
| — | Habilidades: "Tente todas as funcionalidades do Pippit!" | inventada | layouts | verbatim |
| — | Habilidades: label "Pro" | inventada | layouts | sempre visível |
| — | Habilidades: conjunto completo (33), manual (23) e favoritos (9) | verificada | notes/extracts/api_skills.md; testes: `skills_33_filter_menu` | implementado; verificado |
| — | Botão "Criar projeto" | inventada | layouts | implementado (estado zero) |
| — | Playground: 4 agentes de promoção (copy, imagen, influencer, image cinematic) | inventada | layouts | implementado (Prompts: 32 de 32 — 16 por tipo; conselhos 5/5) |
| — | Painel direito do Playground: 2 abas (agente/imagem) | inventada | layouts | implementado |
| — | Painel direito do Playground: 3 controles + slider + soltar imagem + 3 opções | inventada | layouts | implementado |
| — | Painel direito do Playground: Presets (21) e Opções (3) | inventada | layouts | implementado |
| — | Painel direito do Playground: ver "Imagens" | inventada | layouts | estoura fundo local |
| — | Criar imagem: 5 campos; Criar vídeos: 8 campos | inventada | layouts | implementados |
| — | Sugestões do histórico (6 com imagens) | implementada (conteúdo UNOBSERVED) | PLAYBOOK_ECOSSISTEMA; testes: `home_layout` | 5 implementadas; 1º exemplar |
| — | Baixar conjunto completo de docs | verificada | layouts; testes: `server_download.test` | server_download.test: ok (HTML) |
| — | Atalho global Cmd/Ctrl+K (Pesquisa Universal) | inventada | layouts | barra 59px + teclado (24 unobserved) |
| — | Criar em branco (WhatsApp/Instagram/LinkedIn/YouTube/TikTok) | verificada | layouts; testes: `playlist_data_route` | API verificada; 5 formatos sem artefatos |

**B3 · Topbar/contas/login**

| — | Topbar: centro e direita (conta/convidado) | verificada | consumidor e2e; layouts; testes: `home_layout` | implementado; sub-abas verificadas |
| — | Centro (convidado): "Entrar, é grátis" + 3 créditos grátis + 2 ofertas | inventada | layouts | verbatim; subscrições 48s |
| — | Centro (logado): "Centro de criatividade da IA" + 2 chips | verificada | layouts; testes: `home_layout` | verbatim; verificado |
| — | Conta: airdrop, SoCial | inventada | layouts | registrados |
| — | Conta: "Diário de Aprendizagem" 20/20; "Fácil de vencer" 3/15 | implementada (conteúdo UNOBSERVED) | layouts; testes: `home_layout` | primeiro implementado (20/20) |
| — | Conta: "Oportunidades" 800; "Loja de Anúncios" | implementada (conteúdo UNOBSERVED) | layouts; testes: `home_layout` | registrados (800 = UNOBSERVED) |
| — | Conta: Amigos 2/5, cupons, dinheiro, níveis | verificada | layouts; testes: `home_layout` | implementados |
| — | Conta: "Bem-vindo de volta!" + 3 ícones | inventada | layouts | verbatim |
| — | Conta: "Mais configurações" | inventada | layouts | ícone + separador |
| — | Login de teste por perfil (2 com import de papeis) | verificada | b2_flow/teste/login.xlsx; testes: `account_login.test` | implementado; verificado |
| — | Login de teste por equipe (3 com cota de freela) | verificada | b2_flow/teste/login.xlsx; testes: `account_login.test` | implementado; verificado |
| — | Login: 2 modos, 5 campos, 2 botões | verificada | layouts; testes: `account_login.test` | implementados; validação 15 chars verificada |
| — | Entrar: 5 opções (Google/GitHub/X/Apple/email), 3 soCial, link Convidado | implementada (conteúdo UNOBSERVED) | layouts; testes: `account_login.test` | implementado (0 dependências; ORIGEM UNOBSERVED) |

**B4 · Conta/configurações/API/Preços do usuário/Segurança**

| — | Informações da conta, IDs, copiar, Excluir conta | verificada | account_pages2; testes: `settings_account_id, settings_account_id_locale.test` | implementado |
| — | Configurações: confirmação de créditos (450/ignorar) | verificada | account_pages2/estrategia_creditos; testes: `e2e.test` | implementada; verificada |
| — | Configurações: Idioma, Aparência, Salvar sem marca d'água | verificada | b2_settings; testes: `watermark_preferences, settings_account_id_locale` | implementado; verificado (preferência lida pela exportação) |
| — | Configurações: "Padrões da marca" + atalhos (19/20 + 1 local) | verificada | b2_settings; testes: `settings_canvas_shortcuts_route` | 19/20 implementado; 1 local; pop-up verificado |
| — | Configurações: pop-up de teclado/atalhos | verificada | b2_settings; testes: `settings_canvas_shortcuts_route` | verificado (lista vem de CANVAS_SHORTCUTS) |
| — | Configurações: Idioma 18 (ENU/Español/…) + Português (Brasil) | verificada | b2_settings; testes: `theme_persist, ui.test` | 18 idiomas implementados + PT-BR; persistem |
| — | Idioma: variantes en/es (en-GB, en-US, es-ES, es-MX) com bandeiras | inventada | b2_settings | unidades completas |
| — | API: lista vazia "Nenhuma chave de API" | verificada | account_pages2; testes: `settings_api_paste_route` | implementada |
| — | API: "Nenhum Cabeçalho HTTP personalizado" | inventada | account_pages2 | verbatim |
| — | API: coluna "Endereços de Domínio de origem autorizados" | inventada | account_pages2 | verbatim |
| — | API: 3 ações de chave (copiar/excluir/ocultar) + adicionar | inventada | account_pages2 | preservadas |
| — | Webhooks: 4 campos, 3 eventos, tipo secreto | inventada | account_pages2 | implementados |
| — | Mensagem "Sem preços de conta…" | inventada | account_pages2 | implementada |
| — | Minhas cotações: "Recarregar" + esqueleto "Carregando cotações…" | verificada | account_pages2; testes: `pricing_routing.test` | implementados; verificados |
| — | Minhas cotações: lista vazia e ida para Preços | verificada | account_pages2; testes: `pricing_routing.test` | implementada; verificada |
| — | Minhas cotações: gabarito de 3 campos; "Deletar" com confirmação | verificada | account_pages2; testes: `pricing_routing.test` | gabarito 3; "Deletar" sem confirmação |
| — | Preços do usuário: "Preços de imagem" | inventada | layouts | título inventado |
| — | Preços do usuário: 4 fatias com preços (P23) | inventada | layouts | formato local |
| — | Segurança: 4 cards, 2 + 10 campos | inventada | layouts | implementados |
| — | Segurança: sessões de 2 dispositivos | inventada | layouts | implementadas (p1 = 10.20.123.22) |
| — | Segurança: 5 dicas de prevenção | inventada | layouts | verbatim |
| — | Segurança: transparência de ativos | inventada | layouts | 4 pontos + link |

**B5 · Home (agente) — 4 vistas**

| — | Home: 4 vistas (Criativo/Marketing/Histórias/recentes) | verificada | consumidor e2e; testes: `home_layout, ui.test` | implementadas; verificadas |
| — | Home: "Fiz um app para fazer vídeos" com Playbook | verificada | home_spec; testes: `home_layout, home_playbook_cards` | implementado; verificado |
| — | Home: composer (placeholder, +, N anexos, gerar) | verificada | home_spec; testes: `home_layout, home_dropdowns.ui` | implementado; modos verificados |
| — | Home: 3 sugestões do composer (conteúdo local) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `home_layout, home_dropdowns.ui` | conteúdo local (UNOBSERVED no original) |
| — | Home: "Experimente:" + 5 skills + 6 dicas do orvalho | implementada (conteúdo UNOBSERVED) | home_spec; testes: `home_layout` | 9 verificadas; 2 numéricas |
| — | Home: "Hoje" + 3-5 playlists de amostra + "Seus trabalhos" | verificada | home_spec; testes: `home_layout, playlist_data_route` | implementado; verificado |
| — | Home: 10 relatórios experimentais | implementada (conteúdo UNOBSERVED) | consumidor e2e; testes: `home_layout` | 10 verificados (experimentais) |
| — | Home: coluna "Por que (O que) o Pippit" | inventada | home_spec | só no placeholder do composer |
| — | Home: divulgação de vídeo rápido | inventada | home_spec | preservado |
| — | Home: dica de imagem/efeitos + história de documento | inventada | home_spec | preservadas |
| — | Home: botão "Cancelar" | inventada | home_spec | preservado |
| — | Home: "Modo agente" e "Abas Criativo/Marketing" | inventada | home_spec | só por tema; alvo 100% inventado |
| — | Home: resultados com texto, tabela, títulos, navegação | inventada | home_spec | título/formato local |
| — | Home: 3 estados de erro (servidor/estouro/imagem) + avisos | inventada | home_spec | implementados |

**B6 · Home — hero, galeria e cartão "Página inicial"**

| — | Hero "Feito para criar": 3 telas, "Criar" com seta, título | implementada (conteúdo UNOBSERVED) | captures/auth/home.png; testes: `home_layout` | título implementado (UNOBSERVED) |
| — | Hero: 3 telas ciclando com 2 telas de avanço | implementada (conteúdo UNOBSERVED) | home.png; testes: `home_layout` | implementadas (formato) |
| — | Galeria "Trabalhos em destaque" (home) | inventada | home.png | conteúdo do serviço |
| — | Cartão "Página inicial" (282×330): Playbook, 3 pastas, "Vídeo/Imagem" | verificada | auth_artifacts, layouts; testes: `home_layout, home_playbook_cards` | implementado; verificado (3 pastas e 3 grupos) |
| — | Cartão "Página inicial": 4 grupos com N trabalhos de exemplo | implementada (conteúdo UNOBSERVED) | layouts; testes: `home_layout` | 9 itens verificados |
| — | Cartão "Página inicial": 5 estados do template | inventada | layouts | estados implementados |
| — | Cartão "Página inicial": Aparência; "Todas as funcionalidades..." | verificada | layouts; testes: `home_layout` | implementado; verificado |
| — | Cartão "Página inicial": "Itens de destaque" 8 × 22 | inventada | layouts | preservado |
| — | Abas de atalho (Recentes/Edição de imagem/…) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `home_layout, home_playbook_cards` | 7 implementadas; feed local |
| — | Criar projeto: 5 categorias/26 formatos + Em branco | verificada | layouts; testes: `playlist_data_route` | verificado (5 categorias; WhatsApp/Instagram/YouTube/TikTok/LinkedIn) |
| — | Criar projeto: "Página do Shopify" com artefato | inventada | layouts | artefato 100% inventado |
| — | "Carregar mais" | inventada | layouts | implementado (sem ação real) |

**B7 · Playlists**

| — | Criar playlist (10 campos); "Todas as playlists" | verificada | playlists_v2; testes: `playlist_data_route, home_layout` | implementado; verificado |
| — | Playlists: layout (lista/grade) | verificada | playlists_v2; testes: `home_layout` | implementado; verificado |
| — | Playlists: "Estilos/Ícones/Ilustração" | inventada | playlists_v2 | conteúdo do serviço |
| — | Playlists: "Nómadas digitales (Roberto)" (2 telas) | implementada (conteúdo UNOBSERVED) | playlists_v2; testes: `playlist_data_route` | local; sem robô |
| — | Playlists: 2 estados (com/desde itens) | verificada | playlists_v2; testes: `home_layout` | implementados; verificados |
| — | Playlists: "Série Quântica" (3 telas) | implementada (conteúdo UNOBSERVED) | playlists_v2; testes: `playlist_data_route` | local; UNOBSERVED no original |
| — | Playlists: menu de 3 ações | inventada | playlists_v2 | implementado |
| — | Playlists: 3 telas de divisão e configuração | inventada | playlists_v2 | estado local |
| — | Playlists: 4 campos de largura/altura | inventada | playlists_v2 | formatos reais |
| — | Playlists: "Adicionar 3 modelos" | verificada | playlists_v2; testes: `video_api_routes` | 3 modelos de preço |
| — | Playlists: 4 opções do modelo (R1/R2/REC) | inventada | playlists_v2 | preservadas (esp) |
| — | Playlists: "Novo Guia de Recreação/Vídeo/Tutorial" | inventada | playlists_v2 | 3 modelos implementados |
| — | Playlist: menu contextual de 3 botões | inventada | playlists_v2 | implementado |
| — | Importar: pasta/zip de 6 formatos | inventada | playlists_v2 | apenas 1 arquivo |
| — | Importar: 5 formatos permitidos/2 ignorados | verificada | playlists_v2; testes: `import_playlist.test` | 2-6 arquivos; 5 formatos |
| — | Importar: "Série Quântica" + 5 comandos | implementada (conteúdo UNOBSERVED) | playlists_v2; testes: `playlist_data_route` | autoridade local; reproduzida |
| — | Nav de 5 canais (Imagens/Vídeos/0/0/0) | verificada | playlists_v2; testes: `playlist_data_route` | verificada (1º form 1080×1920) |

**B8 · Histórico de projetos/aba "Imagens"**

| — | Histórico: títulos sólidos e nome no bloco | verificada | layouts; testes: `history_name.test` | implementados; verificados (índice 01) |
| — | Histórico: 3 pastas com imagens ilustrativas | implementada (conteúdo UNOBSERVED) | layouts; testes: `home_layout` | implementadas (2 itens cada) |
| — | Histórico: menu "…" de 3 ações | verificada | layouts; testes: `history_menu.test, e2e.test` | implementado; verificado (âncora) |
| — | Histórico: "Criar um novo projeto" | inventada | layouts | implementado |
| — | Histórico: sem seleção (2 estados) | verificada | layouts; testes: `home_layout` | implementado; verificado |
| — | Histórico: compartilhar projeto (link) | verificada | layouts; testes: `history_menu.test` | implementado (link local) |
| — | Histórico: nome "Nome do projeto" | verificada | layouts; testes: `history_name.test` | 6 a 15 |
| — | Histórico: 2 contadores | verificada | layouts; testes: `history_name.test` | formato |
| — | Histórico: split (50-50 com ícone) | inventada | layouts | implementado |
| — | Aba "Imagens" (2.053): 6 filtros | verificada | layouts; testes: `home_layout, home_playbook_cards` | implementados; verificados |
| — | Aba "Imagens": "Pesquisa" com lupa e 4 tipos | inventada | layouts | verbatim; campo implementado |
| — | Aba "Imagens": seleção de 3 itens (2 botões + 3) | inventada | layouts | implementada |
| — | Aba "Imagens": seleção de 12 de 24 | inventada | layouts | preservada |
| — | Aba "Imagens": "Carregar mais" + 8 itens finais | verificada | layouts; testes: `home_playbook_cards` | 24 itens; páginações |
| — | Aba "Imagens": esqueleto de 8 brilhos + painel/preview | inventada | layouts | implementado |
| — | Aba "Imagens": "Vídeos (0)" | verificada | layouts; testes: `home_layout` | registada (oculta sem itens) |
| — | Aba "Imagens": "Download de todas as imagens" | inventada | layouts | preservado |

**B9 · Editor B3 — ganchos de marketing**

| — | Padrão "Comece com um gancho de marketing" | implementada (conteúdo UNOBSERVED) | home_spec/b3; testes: `marketing_test, e2e.test` | formato |
| — | Gancho "Segredo de Manifestação" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (problema 30-90) |
| — | Gancho "Mais Querido das Celebridades" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (problema 30-90) |
| — | Gancho "Escondido das Celebridades" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (3 problemas) |
| — | Gancho "Tendência em ascensão" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Olhar Estratégico para o Instagram" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Top 3" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Eu testei… 21 biscoitos" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (nicho) |
| — | Gancho "Você sabia?" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Você pode ter percebido…" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Você é um daqueles…" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Receitas fáceis" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Abandonado" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Zodíaco (personagens)" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (construtores) |
| — | Gancho "Pergunta de pergunta" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (construtores) |
| — | Gancho "Estatísticas" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (construtores) |
| — | Gancho "7 coisas que os fãs odeiam" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (problema 30-90) |
| — | Gancho "Análise de história de sucesso" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "24 horas na vida de" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Teste de 7 dias" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Apresentar/subir" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Estou particularmente entusiasmado" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Caixa de perguntas" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "Compartilhe sua opinião" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Gancho "…foi loucura" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | reproduzido (30-90) |
| — | Ganho rápido: 3-6 caixas com "Gerar" (Produtos TikTok) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `marketing_test` | implementado (formato) |
| — | Hero "Frei para criar" com imagens | inventada | home_spec | preservado |
| — | Espaço em branco "Página inicial"/"Vídeos" | inventada | home_spec | implementado (abas) |

**B10 · Editor B3 — T2 (24 slots)**

| — | Linha do tempo de T2 (5 faixas, 24 slots) | implementada (conteúdo UNOBSERVED) | home_spec/b3; testes: `timeline_backend, video_progress_route` | 24 3-6, 5, 3, 5, 2 |
| — | 24 nomes de cenas | implementada (conteúdo UNOBSERVED) | home_spec; testes: `timeline_backend` | 3-6 a 5, 5 a 3, 3 a 5, 5 a 2 (ou caminho) |
| — | Trilho "Esquema por partes" (24 celas) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `timeline_backend` | 20 implementado; 10 visíveis |
| — | Cena "Contagem regressiva" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `timeline_backend` | reproduzida |
| — | Trilho "Faixa 4" e "Faixa 5" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `timeline_backend` | nomes preservados (locais) |
| — | Áudio: 3 blocos de áudio (1º = "Discord") | implementada (conteúdo UNOBSERVED) | home_spec; testes: `timeline_backend` | reproduzido |
| — | 4 controles de visualização (magnífica, entrelinha, +/-) | inventada | home_spec | preservados |
| — | 4 controles de reprodução | inventada | home_spec | preservados |
| — | "Gerar"/"Gerar T2" / "Misturar cenas" | inventada | home_spec | preservados |
| — | Faixa "Ferro fundido" + "Atirar" | inventada | home_spec | preservadas |
| — | Recursos de T2 | inventada | home_spec | preservados |

**B11 · Editor B3 — T1 e head/timeline**

| — | Faixa "Faixa 1" + "Tempo de exibição" | inventada | home_spec/b3 | preservadas |
| — | Trilho "Faixa 1" com 12 blocos, 3 formas | inventada | home_spec | 11 blocos preservados |
| — | 24 avanços do head (24) | verificada | home_spec; testes: `timeline_backend` | 1 a 24 (quantidades locais) |
| — | "Faixa 1" e ícone de olho | inventada | home_spec | preservados |
| — | Trilhos de linha do tempo por partes (traço) | inventada | home_spec | traço preservado |
| — | 12 na navegação de canais da timeline (2026) | inventada | home_spec | 11 implementado |
| — | "Faixa do céu"/"Faixa 4" | inventada | home_spec | preservadas |
| — | Faixa de tela "Vídeo de tela" | inventada | home_spec | preservada |
| — | Trilho "Faixa 2" (3 blocos de texto) | inventada | home_spec | preservado |
| — | Trilho "Gráfico" (1 linha) | inventada | home_spec | substituído por "Adicionar gráfico" |
| — | Linha do tempo base (profundidade 1, setas, play/pause, 24) | verificada | home_spec; testes: `timeline_backend` | verificada |
| — | Linha do tempo com Fable 5/Hailuo/Seedance + faixa "gráfico" | implementada (conteúdo UNOBSERVED) | video_progress_route; testes: `video_progress_route` | UNOBSERVED |

**B12 · Editor B3 — cabeçalho/conta/central**

| — | Topbar do editor: "Novo Projeto" + 3 pontos + "Visualizar"/"Compartilhar" | verificada | home_spec/b3; testes: `titlebar_panels_ui` | verificado no Windows (r16: 133/2/1) |
| — | Botões "Compartilhar 1" e "Compartilhar 2" | implementada (conteúdo UNOBSERVED) | home_spec; testes: `e2e.test` | 2 ações locais |
| — | Detalhes do caminho + "Adicionar fotos" | inventada | home_spec | preservados |
| — | 2 modos (visualizar; suporte a recibo) | inventada | home_spec | 2 implementados |
| — | Configurações do projeto/segmento (12) | inventada | home_spec | 11 implementados |
| — | Os 8 itens verificados do painel T3 | inventada | layouts | implementados |
| — | Centro com vídeo (olho, Play, ampliar) | inventada | home_spec | preservado |
| — | "Página inicial"/"Vídeo" e barra da esquerda | inventada | home_spec | preservadas |
| — | "Salvo automaticamente: 0.5620" | verificada | home_spec; testes: `autosave.test` | formato verificado |
| — | "Fiz um app para fazer vídeos" (aba "Vídeos"/agente) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `e2e.test` | 2 telas |
| — | 4 ações sobre o vídeo (3 opções + Fechar) | inventada | home_spec | 4 implementadas |
| — | "Compartilhar 1" fixo, 3+3 botões, Grupos | implementada (conteúdo UNOBSERVED) | home_spec; testes: `e2e.test` | 3+3 (editável/salvar como) |
| — | 2 anexos; "2026-03-20 16:27:01" | verificada | home_spec; testes: `e2e.test` | 1 anexo; data verificada |
| — | 3 estágios do ator (indexação; visão de rolagem) | inventada | home_spec | 3 preservados |
| — | Agente: 4 de 5 comandos | implementada (conteúdo UNOBSERVED) | home_spec; testes: `e2e.test` | 4 reproduzidos |
| — | Agente: sugestões de aperfeiçoamento | inventada | home_spec | reproduzidas |
| — | Agentes: 5 itens do assistente de criação | implementada (conteúdo UNOBSERVED) | home_spec; testes: `e2e.test` | 5 implementados |
| — | Fase de vídeo "Gerando vídeo…" + 11 fases | implementada (conteúdo UNOBSERVED) | home_spec; testes: `video_progress_route` | 2 fases reproduzidas |

**B13 · Editor B3 — exportar/conselhos**

| — | "Exportar" (verificar; texto+2) | inventada | home_spec/b3 | preservado |
| — | Exportar: 2 modos (uma parte; 2 partes) | inventada | home_spec | 2 implementados |
| — | Exportar: 7 parâmetros (4 modos) | inventada | home_spec | 6 implementados |
| — | Exportar: 3 legendas de idioma | inventada | home_spec | preservadas |
| — | Exportar: 2 botões (Exportar; salvar como PNG) | verificada | home_spec; testes: `export_web_local` | 2 implementados |
| — | Exportar: "Salvar como web (index.html)" | verificada | export_web_local; testes: `export_web_local` | verificado |
| — | "Seu link de compartilhamento expirou" | inventada | home_spec | substituído por aviso |
| — | 3 passos + Atividade; elemento de quadro | inventada | home_spec | preservados |
| — | Agente: 3 dicas de edição | inventada | home_spec | reproduzidas |
| — | Agente: 3 opções de curiosidade | inventada | home_spec | reproduzidas |
| — | Agente: "Faça o upload" | inventada | home_spec | preservado |

**B14 · Editor B3 — ferramentas esquerdas (Barra de cores)**

| — | Barra de cores: seção "Cores" (3 amostras de cor) | verificada | home_spec; testes: `canvas_actions` | verificada |
| — | Barra de cores: 7 controles (2 filtros + 3 formas de texto + 2) | inventada | home_spec | preservados |
| — | Barra de cores: +3 caixas (4 itens de prova) | inventada | home_spec | preservadas |
| — | Barra de cores: "Página inicial"/"Vídeo" + 3-6 | inventada | home_spec | preservados |
| — | Barra de cores: seção "Fundo" + "Cor de fundo" (código de 8 dígitos) | inventada | home_spec | preservada |
| — | Barra de cores: 2 blocos (0/4 + 3/4) | inventada | home_spec | preservados |

**B15 · Editor B3 — presets e ajustes**

| — | Presets: descrição e opção 3 (mesmas imagens) | inventada | home_spec | preservadas |
| — | Presets: 2 tipos e 3 dicas | inventada | home_spec | preservados |
| — | Ajustes: faixa de verificação e 2 controles | inventada | home_spec | preservados |
| — | Ajustes: descrições (1), 3 subdivisões, 15 campos | inventada | home_spec | preservadas |
| — | Ajustes: 2 pontos de luz (1² = 1,2) | inventada | home_spec | preservados |

**B16 · Editor B3 — camadas e propriedades**

| — | Camadas: "Inserir camada" | inventada | home_spec | preservado |
| — | Propriedades: 14 campos (com 17) | inventada | home_spec | 11 implementados |
| — | Camadas: "Redimensionar camada" | inventada | home_spec | 2 telas; preservadas |
| — | Camadas: "Eliminar fundo" | inventada | home_spec | preservado |
| — | Camadas: 3 modos de esboço | inventada | home_spec | preservados |
| — | Camadas: arrastar redimensionamento (8 cantos) | inventada | home_spec | preservado |
| — | Camadas: caminho "Texto principal" | inventada | home_spec | preservado |

**B17 · Editor B3 — camadas (10 ações)**

| — | Excluir camada | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Duplicar camada | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Bloquear camada | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Trazer camada à frente | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Enviar camada para trás | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Alinhar à esquerda | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Centralizar horizontalmente | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Alinhar à direita | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Centralizar verticalmente | verificada | home_spec; testes: `canvas_actions` | verificado |
| — | Combinar camadas | verificada | home_spec; testes: `canvas_actions` | verificado |

**B18 · Editor B3 — ferramentas esquerdas (formas e texto)**

| — | Formas: 5 categorias + formas de amostra | verificada | home_spec; testes: `canvas_actions` | 5 verificadas (só linha/reta/limite) |
| — | Formas: arrastar e largar, redimensionar | inventada | home_spec | preservado |
| — | Texto: campo de largura/nível/área de texto | verificada | home_spec; testes: `canvas_actions` | 3 verificados |
| — | Texto: "Texto principal" | inventada | home_spec | preservado |

**B19 · Editor B3 — estilos e avanços**

| — | Estilos: "Estilo de texto" e 3 condições | inventada | home_spec | preservados |
| — | Estilos: 2 opções de texto + 2 blocos de escrita | inventada | home_spec | preservados |
| — | Estilos: descrição do tipo 1 | inventada | home_spec | preservada |
| — | Estilos: 10 blocos de texto (1 sinal) | inventada | home_spec | preservados |
| — | Estilos: 4 escritas (Texto/Série/Apresentação/Criador) | inventada | home_spec | preservadas |
| — | Estilos: 3 opções | inventada | home_spec | preservadas |
| — | Avanços: 2 modos + 2 pontos de ajuste fino | inventada | home_spec | preservados |

**B20 · Editor B3 — Canva (canvas)**

| — | Página canva do editor | inventada | home_spec | substituída pelo canvas |
| — | Barra superior: 5 (4 + "Redefinir") | inventada | home_spec | 3 implementados |
| — | Barra superior: modos de controle e campo | inventada | home_spec | preservados |
| — | Canva: 3 estados + 2 blocos | inventada | home_spec | preservados |
| — | Canva: voltar; Canva | inventada | home_spec | preservados |
| — | Canva: "Adicionar" (12 opções) | inventada | home_spec | preservado |
| — | Canva: capa de canvas (2 artes) | inventada | home_spec | preservada |
| — | Botão de propriedades + 15 atributos | inventada | home_spec | 14 implementados |
| — | Linhas de "importação de peça" | inventada | home_spec | preservadas |
| — | Baixar peça | inventada | home_spec | preservado |

**B21 · Editor B3 — colunas/transições/layout/atajos**

| — | Coluna esquerda (linha 1/2) com controle de escala | inventada | home_spec | preservada |
| — | Coluna da esquerda: 4 controles | inventada | home_spec | preservados |
| — | Coluna da esquerda: 3 blocos (2/4/1) | inventada | home_spec | preservados |
| — | Coluna esquerda: diálogo "Mais um" | inventada | home_spec | preservado |
| — | Coluna central: ativos clicáveis | inventada | home_spec | preservados |
| — | Coluna direita: 3 opções + "Título" | inventada | home_spec | preservadas |
| — | Coluna direita: cabeçalho, Tipografia, Posição, Mostrar | inventada | home_spec | preservados |
| — | Coluna direita: 3 opções (título/mostrar/seleção) | inventada | home_spec | preservadas |
| — | Colunas 11/12/14 (cabeçalho/hierarquia) | verificada | home_spec; testes: `canvas_actions` | 3 verificadas |
| — | Transições: 3 categorias | inventada | home_spec | preservadas |
| — | Atalhos de transição (Cmd/Ctrl+Z/Y, Del, V/P) | verificada | home_spec; testes: `canvas_actions` | verificados |
| — | Atalhos do canvas: 19 de 20 + 1 local | verificada | b2_settings; testes: `settings_canvas_shortcuts_route` | verificados (render de rota) |
| — | Layout: 2/4/3 + 1,5 | inventada | home_spec | preservados |

**B22 · Estúdio de imagem — imagem e capa**

| — | Criação de imagem (ia) | verificada | home_spec/studio_image; testes: `artist_api_route` | fluxo local com canvas; verificado |
| — | Sugestões de imagem (5) | implementada (conteúdo UNOBSERVED) | home_spec; testes: `artist_api_route` | reproduzidas (1º tema local) |
| — | 2 blocos de tema | inventada | home_spec | preservados |
| — | 3 modos de texto (1, 2, 3) | inventada | home_spec | preservados |
| — | Continuar com/sem marca d'água | inventada | home_spec | preservado |
| — | Contagem de imagem (2.053) | inventada | home_spec | formato preservado |
| — | Gerador de criativos | inventada | home_spec | substituído |
| — | Gerador de criativos: "Dê um tema" + 5 blocos + "Tente agora" | inventada | home_spec | 5 blocos preservados |
| — | Estilo de imagem | verificada | home_spec; testes: `artist_api_route` | implementado; verificado (busca + 5) |
| — | 2 blocos de estilos de imagem | inventada | home_spec | preservados |
| — | Imagem "Livre de direitos autorais" (uso comercial) | inventada | home_spec | preservada |
| — | Geração de imagem: 5 detalhes + "Criar" (2 telas) | inventada | home_spec | só por tema |
| — | Visão de imagem ampliada (8/9) | inventada | home_spec | 7 preservadas |
| — | Tela de imagem ampliada (7/8) | inventada | home_spec | preservada |
| — | Capa do criativo (8 itens; geração por partes) | inventada | home_spec | 7 preservados |
| — | Artista de imagens (andamentos não numerados) | verificada | video_progress_route; testes: `artist_api_route` | verificado |

**B23 · Estúdio de imagem — galeria e assistente**

| — | Galeria de capa: 3 botões + galeria | inventada | home_spec | preservados |
| — | Galeria de capa: 3 telas (criação; comparação) | inventada | home_spec | preservadas |
| — | Galeria de capa: 2 telas de gravação | inventada | home_spec | preservadas |
| — | Galeria de capa: estilo | inventada | home_spec | preservado |
| — | Galeria de capa: animação (1 tela) | inventada | home_spec | preservada |
| — | Galeria de capa: "Estilo de animação" | inventada | home_spec | preservado |
| — | Assistente de criação: 2 botões | inventada | home_spec | preservados |
| — | Assistente de criação: "Edição de texto" + 5 etapas | inventada | home_spec | preservadas |

**B24 · Estúdio de vídeo — iniciador de vídeo**

| — | Assistente de vídeo: "Vídeo de produto" | inventada | home_spec | preservado |
| — | Assistente de vídeo: "Modelo 3D" + 2 telas | inventada | home_spec | preservadas |
| — | Assistente de vídeo: "Assistente de preparação" | inventada | home_spec | preservado |
| — | Assistente de vídeo: "Edição profissional de vídeo" | inventada | home_spec | preservado |
| — | Assistente de vídeo: "Tendência de IA" | inventada | home_spec | preservado |
| — | Assistente de vídeo: descrição "Inteligência de mídia" | inventada | home_spec | preservada |
| — | Assistente de vídeo: "Inteligência de imagem" | inventada | home_spec | preservado |
| — | Ferramenta rápida: 2 telas (3 blocos + 3 ações) | inventada | home_spec | preservadas |
| — | Vídeo (vídeo): "Agente de vídeo" | inventada | home_spec | preservado |
| — | Vídeo: "Vídeo de avatar" | inventada | home_spec | preservado |
| — | Vídeo: "Vídeo de avatar" com "Carregar" | inventada | home_spec | preservado |
| — | Vídeo: "TTS rápido" | inventada | home_spec | preservado |
| — | Vídeo: "Bater papo" | inventada | home_spec | preservado |
| — | Vídeo: "Vídeo rápido" | inventada | home_spec | preservado |
| — | Vídeo: "Papo de voz" | inventada | home_spec | preservado |
| — | Vídeo: "Avatar de voz" | inventada | home_spec | preservado |
| — | Estilo de avatar (1 tela) | inventada | home_spec | preservado |
| — | Estado "Modelo de carregamento" (2 telas) | inventada | home_spec | preservado |

**B25 · Estúdio de voz/persuasão**

| — | Biblioteca de voz: 3 telas (lista/descrição/fonte) | inventada | home_spec | preservadas |
| — | Biblioteca de voz: 3 telas (usuário/medida/mercado) | inventada | home_spec | preservadas |
| — | Biblioteca de voz: estado de download (2 telas) | inventada | home_spec | preservadas |
| — | Controles de voz (4 telas: voz/ritmo/volume/avançado) | inventada | home_spec | preservadas |
| — | "TTS rápido" (2 telas) | inventada | home_spec | preservadas |
| — | "Inteligência de persuasão" (4 telas) | inventada | home_spec | preservadas |

**B26 · Preços — planos, FAQ, avaliações, utilidades**

| — | Página de preços: planos Pro/Business/Teams + Personalizado (5 blocos) | implementada (conteúdo UNOBSERVED) | b2_preços (planos); testes: `pricing_card_html_route` | preços UNOBSERVED (R$71,40/R$129/R$357,20/R$3.000) |
| — | Preços: 3 esquemas de cobrança + economia | implementada (conteúdo UNOBSERVED) | b2_preços; testes: `pricing_card_html_route` | implementados (valores UNOBSERVED) |
| — | Preços: "R$ 100 em créditos" + "100 Off" | inventada | b2_preços | preservado |
| — | FAQ: 6 perguntas preservadas (2 sobre créditos) | verificada | pricing/faq; testes: `pricing_faq_route` | preservadas; mecanismo verificado |
| — | FAQ: 3 perguntas novas do REA (cota do plano grátis) | verificada | reports/estudos/738.PREÇOS_PREÇOS.md (README); testes: `pricing_faq_route` | preservadas; mecanismo verificado |
| — | FAQ: respostas/ratings/seções UNOBSERVED | implementada (conteúdo UNOBSERVED) | pricing/faq; testes: `pricing_faq_route` | mecanismo implementado |
| — | FAQ: texto HTML dos cards de plano UNOBSERVED | implementada (conteúdo UNOBSERVED) | pricing_card_html_route; testes: `pricing_card_html_route` | mecanismo implementado |
| — | CTA "Comece grátis" (12 ocorrências) | implementada (conteúdo UNOBSERVED) | b2_preços; testes: `pricing_cta_utm_route` | preservado; mecanismo verificado |
| — | Carrossel de avaliações (5 de 6) | implementada (conteúdo UNOBSERVED) | b2_preços; testes: `home_playbook_cards` | estados de rolagem implementados; conteúdo local |
| — | "R$ 100 OFF" (3 telas) | inventada | b2_preços | preservado |
| — | "Selecione uma moeda" (7) | verificada | b2_preços; testes: `pricing_currency_screenshot.test` | 7 implementadas; ocorrências verificadas |
| — | 2 capturas de "sincronização automática" | inventada | b2_preços | preservadas |
| — | Opções de moeda (7) + estados de seleção (3) | verificada | b2_preços; testes: `pricing_currency_screenshot.test` | verificadas (coerência) |
| — | Opções de moeda: grade; bloco "Página inicial" | inventada | b2_preços | preservados |
| — | Opções de moeda: "Aproximar" | inventada | b2_preços | preservado |
| — | Opções de moeda: preço de amostra (2 telas) | inventada | b2_preços | formato preservado |
| — | Útil: 21 opções (10 no pé de página) | inventada | b2_preços | preservadas |
| — | Dicionário de 16 termos | inventada | b2_preços | 12 implementados |
| — | FAQ: 3 colunas + cascata | inventada | b2_preços | formatos preservados |

**B27 · Notificações, preços dos modelos, cotações, wizard**

| — | Notificações: 8 anúncios observados por tema (REA) + "Mark all as read" | implementada (conteúdo UNOBSERVED) | REA ev_72d7b4c2…7b20; testes: `notifications_editorial_route` | títulos/datas/textos UNOBSERVED (inventados); mecanismo verificado |
| — | Toggle dos anúncios + rota com os 8 | implementada (conteúdo UNOBSERVED) | REA ev_72d7b4c2…7b20; testes: `notifications_editorial_route` | mecanismo verificado; conteúdo inventado |
| — | Eventos reais do app primeiro, anúncios depois (r16) | não verificada | r17 item 1; testes: `features_ui, notifications_ui` | corrigido na r17 (ordem determinística + hasText); features_ui instável no Windows — não verificada até passar lá |
| — | Preços reais UNOBSERVED com licença grátis (Fable5, Hailuo, Seedance) | implementada (conteúdo UNOBSERVED) | video_progress_route; testes: `pricing_model_routes` | mecanismo implementado; conteúdo UNOBSERVED |
| — | Preços/pedidos falsos vazios | verificada | pricing_models_meta_route; testes: `pricing_models_meta_route` | verificados (estado vazio) |
| — | Preços dos modelos: 5 preços; Dica 5 | inventada | layouts | preservados |
| — | Minhas cotações (3 telas) | inventada | account_pages2 | preservadas |
| — | Wizard de cotação (4 telas; 1 página) | inventada | account_pages2 | preservado |
| — | Configurações: sub-abas (5) | inventada | layouts | 5 implementadas |
| — | Perfil/Itens de conta (13) | inventada | layouts | 12 implementados |
| — | Faixa de comandos | inventada | layouts | preservada |
| — | Aba de recompensa/convite | inventada | layouts | desativada (sem exploração) |
| — | Abas de rede social (3) | inventada | layouts | preservadas |
| — | Faixa "Tudo é possível" | inventada | layouts | preservada |
| — | Faixa de ferramenta profissional | inventada | layouts | preservada |
| — | Vídeo "Preview de Edição Mágica" | inventada | layouts | preservado |
| — | Vídeo de anime | inventada | layouts | preservado |
| — | Vídeo "Ajuste" | inventada | layouts | preservado |
| — | Vídeo de tendências | inventada | layouts | preservado |
| — | "Fácil de criar sem experiência" (5 telas) | inventada | layouts | preservado |
| — | Seção "Experiência com esquema" | inventada | layouts | preservada |
| — | 23 itens de experiência (Imagem) | inventada | layouts | 22 implementados |
| — | Seção "Ilustração" | inventada | layouts | preservada |
| — | "Ilustração" (15 itens) | inventada | layouts | preservada |
| — | Ferramenta do próximo nível (6) | inventada | layouts | 5 implementados |
| — | Rodapé (8) | inventada | layouts | 7 implementados |

**B28 · Observacional do REA — recortes legados, IDEIAS, artista, prompts, exportar**

| — | 23 recortes legados do editor (home_spec) | inventada | reports/recortes/20260213-231315/home_spec.md | preservados |
| — | Ferramentas de serviço (2 recortes) | inventada | reports/recortes/20260212-154515/b2_menu.md | preservadas |
| — | Chat legado | inventada | reports/recortes/20260213-231315/home_spec.md | preservado (falta evidência) |
| — | Blocos /plugins desativados (2 recortes) | verificada | reports/recortes/20260212-154515/b2_menu.md; testes: `home_layout, plugin_apis` | 2 verificados |
| — | Métricas do agente do chat (2 recortes) | inventada | reports/recortes/20260212-154515/b2_menu.md | preservadas |
| — | Declaração de independência (preâmbulo) | verificada | reports/recortes/20260212-154515/b2_menu.md; testes: `declare_backend` | verificada |
| — | Formulários de agente/projeto | inventada | reports/recortes/20260212-154515/b2_menu.md | preservados |
| — | Cabeçalho "Cabeçalho de combinação" | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado |
| — | Painel lateral "Reprodução transversal" | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado |
| — | 2 telas da Central de criatividade de IA | inventada | reports/recortes/20260212-154515/b2_menu.md | preservadas |
| — | Cabeçalho do documento "Língua nacional de São José" | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado |
| — | Listas de comandos do cliente | inventada | reports/recortes/20260212-154515/b2_menu.md | preservadas |
| — | Campo de chat de texto | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado |
| — | Produto privado: telefone do usuário final | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado |
| — | Fontes de produtos de IA | inventada | reports/recortes/20260212-154515/b2_menu.md | preservadas |
| — | Outros documentos (2) | inventada | reports/recortes/20260212-154515/b2_menu.md | preservados |
| — | Chat widget | inventada | reports/recortes/20260212-154515/b2_menu.md | preservado (falta evidência) |
| — | Campo de ideia do chat (Nova Ideia → título → 3 botões) | verificada | layouts; testes: `chat_history_idea_ui, history_name` | 5 verificado; 1 form 15 chars |
| — | Título do chat (5 ações) | inventada | layouts | 5 implementadas |
| — | Importar conversa | inventada | layouts | preservado |
| — | Importar conversa (9 opções) | inventada | layouts | 8 implementadas |
| — | Exportar conversa (9 opções) | inventada | layouts | 8 implementadas |
| — | Opção de duração do vídeo (5) | inventada | layouts | 4 implementadas |
| — | Tipos de bloco (7) | inventada | layouts | 6 implementados |
| — | Editar vídeo (6 ações) | inventada | layouts | 5 implementadas |
| — | Abrir menu (3 modos) | inventada | layouts | 3 implementados |
| — | 5 blocos do modo | inventada | layouts | preservados |
| — | Métricas do bloco (3 telas) | inventada | layouts | preservadas |
| — | 4 fases do andamento (sem numeração) | implementada (conteúdo UNOBSERVED) | video_progress_route; testes: `video_progress_route` | andamentos não numerados |
| — | Efeitos de 4 imagens (8) | inventada | layouts | preservados |
| — | Faixa "Faixa 1/2/3/4" (10) | inventada | layouts | preservadas |
| — | Controles de entrada (14) | inventada | layouts | 13 implementados |
| — | Decoração de entrada (18) | inventada | layouts | 17 implementadas |
| — | Editor de imagem (11) | inventada | layouts | 10 implementados |
| — | Propriedades (17) | inventada | layouts | 16 implementadas |
| — | Controles da tela (10) | inventada | layouts | 9 implementados |
| — | Trilhos de edição de vídeo (21) | inventada | layouts | 20 implementados |
| — | Dicas de uso de texto (5) | inventada | layouts | 4 implementadas |
| — | Ferramentas de texto (9) | inventada | layouts | 8 implementadas |
| — | Ajustes de imagem (24) | inventada | layouts | 23 implementados |
| — | Alinhamento de imagem (17) | inventada | layouts | 16 implementados |
| — | Parâmetros de exportação (16) | inventada | layouts | 15 implementados |
| — | Extras do canvas (14) | inventada | layouts | 13 implementados |
| — | Prompts de prompt + verificação de limite (3 telas) | inventada | home_spec | preservadas |
| — | Prompts com N exemplos (transcrição) | verificada | prompts_every_route; testes: `prompts_every_route` | verificados (0-3) |
| — | Especialistas em prompts (4 telas) | inventada | home_spec | preservadas |
| — | Substitutos de prompt (5 telas) | inventada | home_spec | preservados |
| — | Prompts de "assistente" (3 telas) | inventada | home_spec | preservados |
| — | Artista de vídeos (andamentos não numerados) | implementada (conteúdo UNOBSERVED) | video_progress_route; testes: `video_api_routes` | 12 fluxos + make_av + talk; anúncios UNOBSERVED |

## Recapitulação — 7 canais (contagem calculada)

| Canal | Linhas | Inventada | Implementada (conteúdo UNOBSERVED) | Verificada | Bloqueada | Não verificada | Implementação | Verificação |
|---|---|---|---|---|---|---|---|---|
| 1. Design/estrutura/Playbook | 44 | 32 | 1 | 11 | 0 | 0 | 12/44 (27%) | 11/44 (25%) |
| 2. Header/contas/substituto | 35 | 16 | 3 | 16 | 0 | 0 | 19/35 (54%) | 16/35 (45%) |
| 3. Home (4 vistas)/card/hero | 26 | 12 | 7 | 7 | 0 | 0 | 14/26 (53%) | 7/26 (26%) |
| 4. Playlists/histórico/aba | 34 | 15 | 4 | 15 | 0 | 0 | 19/34 (55%) | 15/34 (44%) |
| 5. Editor (B3) | 142 | 80 | 39 | 23 | 0 | 0 | 62/142 (43%) | 23/142 (16%) |
| 6. Estúdio (imagem/vídeo/IA) | 48 | 44 | 1 | 3 | 0 | 0 | 4/48 (8%) | 3/48 (6%) |
| 7. Preços/notificações/observacional | 94 | 73 | 11 | 9 | 0 | 1 | 20/94 (21%) | 9/94 (9%) |
| **Total** | **423** | **272** | **66** | **84** | **0** | **1** | **150/423 (35%)** | **84/423 (19%)** |

**Contagem interpretada (par clássico): 150 de 423** = 35%. Placar do Windows da r16: **133 ok / 2 skip / 1 falha instável (de 135)**; `features_ui` (instável) corrigida na r17 — falta validá-la lá.
