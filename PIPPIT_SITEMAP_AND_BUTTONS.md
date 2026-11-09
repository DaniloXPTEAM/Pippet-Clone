# Mapa do site e dos botões (conta gratuita, pt-BR) — para comparar com a reconstrução
Fonte: capturas REA autenticadas em `captures/auth/` (`editor_menus/`, `crawl1/`, `avatar_flows/`, `account_pages*/`, `more_menu_pages/`, `schedule_publish/`, `social_accounts/`, `step_*.txt`). Só leitura: nada foi gerado, comprado, publicado nem vinculado. **[V]** visto; **[?]** não aberto/não visível.
Legenda de destino: rota = navega; modal = abre painel na mesma rota; api = chamada vista.

## 1. Rotas conhecidas
| rota | como se chega | conteúdo |
|---|---|---|
| `/home` | login, logo | agente (abas Criativo/Marketing/Histórias), skills recomendadas, galeria |
| `/nest-agent-project?projectId=…` | "Tela" (cria projeto vazio), histórico | canvas + chat do agente |
| `/agent-chat?threadId=…&editType=smart_ad_…` | histórico (chats antigos) | chat legado somente leitura |
| `/marketing-agent` | Estúdio de marketing | ver 3 |
| `/story-studio/list` | Estúdio de histórias | ver 4 |
| `/asset-management-material` | Ativos | ver 5 |
| `/skill` | Habilidades | Loja de habilidades (ver 6) |
| `/smart-creation` | Criação inteligente | consentimento (3 passos) + botão Autorizar |
| `/ai-video-generator-v2` | Mais > Gerador de vídeos | gerador direto + "ferramentas populares" |
| `/avatar-and-voice` | Mais > Avatares e vozes | avatares/vozes (ver 7) |
| `/data-analytics` | Mais > Análise | painel de redes sociais |
| `/schedule-publish` | tarefa de recompensa, Mais | publicação agendada |
| `/editor?tab_name=video_generator&sub_tab=video&edit_type=edit` | Mais > Editor / ferramentas | editor de vídeo (ver 2) |
| `/editor?...edit_type=remove_background` (`activeSmartTool=1002`), `...quick_cut` (`activeSmartTool=20003`), `...action=addDigitalHuman&edit_type=ai_character&scale=9:16` | "Ferramentas populares" | editor aberto já numa ferramenta |
| `/ai-talking-photo?tab_name=video_generator&enter_from=…` | Foto falante de IA | página carrega vazia por GET direto [?] (provável dependência de parâmetros/estado) |
| `/settings?tab_key=personal_information | account_authorization | points_prompt_settings | sign_management` | menu da conta > Gerenciamento/Configurações | ver 8 |
Observação de URL: o app carrega parâmetros de origem (`entranceFrom`, `enter_from`, `page_from`, `tab_name`) em quase toda navegação [V] (telemetria de funil).

## 2. Editor de vídeo [V]
- **Menu esquerdo** (7 abas): **Mídia** (biblioteca da conta + Carregar; arrastar e soltar; mostra todos os vídeos/imagens dos projetos e avatares personalizados), **Legendas**, **Avatares**, **Texto**, **Áudio**, **Elementos**, **Corte rápido**.
- **Legendas** → aba "Gerar legendas": *Legendas automáticas* (reconhece a fala; escolher "Idioma usado no vídeo"; botão Gerar), *Legendas manuais* (inserir à mão), *Letras automáticas* (reconhece letras de música; idioma; Gerar).
- **Avatares**: "Crie um avatar personalizado" (botão **Criar o seu**) e lista **Recomendado** com avatares nomeados (Elena, Isabella, Marco, Mateo, Maya, Mei, Mason, Khalid, Lisa, Andrew, Pallo, Cherry, Nadia, Jeff, Brian… em cenários: cozinha, sala, escritório, mesa de maquiagem, externa).
- **Texto**: abas *Modelos de texto* (Todos / Comercial / Básico; "Adicionar cabeçalho", "Adicionar corpo de texto"; coleções Populares, Ramadan, Valentines, New Year, Black Friday, Halloween, Natal, Título, Vlog, Marcados, cada uma com "Ver todos") e *Efeitos de texto*.
- **Áudio**: abas *Música* (Categorias, Recomendado: faixas com duração e artista, p. ex. "Future Bass", "Muscle Cars", "Serenity", licenciadas por editoras) e *Efeitos sonoros*.
- **Elementos**: busca "Pesquisar elementos"; seções Stickers, Biblioteca local, Fotos, Efeitos (Brilho saltitante, Gravação antiga, Flash neon, Boneca trêmula…), Transições (Dissolver e dar zoom, Cintilação, Queimar, Deslizar para a esquerda…), Filtros (Oppenheimer, Natty, Dolce, Ensolarado…), cada uma com "Ver todos".
- **Corte rápido**: "Rapidamente editar vídeos transcrevendo e editando o texto": escolher idioma falado, escolher faixa a transcrever, botão **Transcrever** (desabilitado sem faixa). Edição por texto (semiautomática) [V descrição; resultado [?]].
- **Área central**: pré-visualização, **Proporção** (seletor), controles de tempo `00:00:00`, linha do tempo (botões de reprodução/desfazer/zoom/dividir; vários desabilitados sem clipe), título do projeto (padrão = data/hora) e **Exportar** (zoom 100%).
- **Painel direito** (precisa de clipe selecionado: "Selecione um item para fazer ajustes"): **Básico · Plano de fundo · Ferramentas inteligentes · Áudio · Animação · Velocidade** [V nomes; conteúdo [?]].
- **Tour de primeiro uso** (balões): passo 1 "Recursos materiais — você pode carregar a sua própria mídia ou usar os materiais que fornecemos" (1/2, botão **Avançar**); passo 2 **"Alterar barra lateral"** (botão **OK**; a barra lateral é reordenável/personalizável) [V pelos dois balões que você abriu; recarregar a página não repete o tour].
- **Recursos por plano**: aviso fixo "Você está usando um recurso Starter — Assine para desbloquear".
- **Motor**: renderização/edição local em WebAssembly (VE SDK), redução de ruído (rnnoise), fontes; arquivo de edição identificado por UUID gerado no cliente; workspace `cc/v1/workspace/*`.

## 3. Estúdio de marketing `/marketing-agent` [V]
Título "Nunca fique sem boas ideias"; campos **Produto** e **Personagem** (+ "Expand/Add reference materials"), caixa "Adicione um produto e seus argumentos de venda e deixe o agente criar o plano", Habilidades, grupo **Formatos de anúncio / Gancho / Estilo visual**, Modelos e preferências, alternância Tela, **Generate** (desabilitado até preencher). Skills recomendadas (Anúncios de drama, Geração em lote, URL do vídeo, Tradução de vídeo, Vídeo de marketing). **Explore marketing capabilities**: abas Tudo · Anúncios em alta · Anúncios UGC · Demonstrações de produtos · Efeitos visuais · Anúncios guiados por histórias · Seedance 2.5 · ASMR; cada cartão tem *Preview*, *Play com som* e **Remixar** (recriar um modelo de anúncio; ex.: "Revelação com disparo e queda", "Teste da prateleira secreta") [V].

## 4. Estúdio de histórias `/story-studio/list` [V]
"Seu agente de histórias com IA para dramas curtos, filmes com IA e muito mais". Entradas: **Carregar roteiro** (.txt/.docx até 100 mil caracteres; **25 créditos por 1000 caracteres**; "Colar roteiro"; "Pular para a tela"), **Roteirista de IA**, **Tela criativa**, **Redesenhar (NEW)** com aviso do novo recurso "refazer e redesenhar". "Meus projetos" com exemplos de 5 episódios (marcados "Amostra"). Observação de direitos: "Você precisa ter direitos de uso de qualquer roteiro que adicionar".

## 5. Ativos `/asset-management-material` ("Biblioteca de ativos") [V]
Abas: **Trabalhos** (gerações/exportações com duração e data), **Carregar histórico**, **Personagem**, **Produto**, **Rascunhos**; filtros Tudo/Imagens/Vídeos/Áudio; **Ordenar** (Descendente), **Ajustar visualização**, **Adicionar**, busca; cada item tem checkbox de seleção e "Detalhes". APIs: `lv/v1/asset/query` (`asset_types`, `parent_id`, `order_by`, `workspace_id`, paginação `offset/count`), `biz/v3/asset/search`, `character/manage/page`, `character/create/bootstrap`.

## 6. Loja de habilidades `/skill` [V]
Abas Todos / Minhas skills / Favoritos e categorias (Drama curto, Marketing Publicidade, Cinema e televisão profissionais); busca; **Criar skill**; cada skill tem *Adicionar aos favoritos*, **Usar**, **Detalhes** e uma descrição do que faz, p. ex.: *Criar habilidades* (habilidades reutilizáveis), *Anúncios de drama* (produto dentro de um mini-drama de alta tensão), *Shorts de história* (roteiro/ideia → curta-metragem com personagens consistentes e diálogo fiel), *Gerador de Vlog* (fotos, clipes e áudios → vlog com gancho e final), *Creator Commerce* (foto do produto → vídeo estilo criador: unboxing, prova, demo), *Renderização de 3 Visualizações* (folha de referência 16:9 frente/lado/verso), *Replicação Viral* (engenharia reversa do gancho de um vídeo de referência). APIs: `agent/list_skill_store`, `list_skill_tag`, `get_web_agent_setting`.

## 7. Avatares e vozes `/avatar-and-voice` [V]
Cartões: **Vídeo em avatar — 1999 créditos/vez** (amostras: Emily-Fashion-Bedroom-Sitting, Kavi-Marketing-Office-Standing), **Foto em avatar — 3 usos gratuitos** (Malcolm, Helena), **Vozes personalizadas — Criar nova, 180 créditos/vez** (amostra "Olivia in the kitchen2"); botão "Amostra" por item. Os cliques nos cartões pelo REA não abriram nenhum fluxo visível [?]: o assistente de criação (upload de vídeo/foto/áudio de consentimento) **não foi observado**. API: `digital_human/get_item_list` (`offset`, `count`, `action_type: 73`, `effect_type: 60`, `is_sample`), `digital_human_filter_config`. No editor, **Criar o seu** é o mesmo ponto de entrada.

## 8. Conta e configurações [V]
Menu da conta: Tarefas concluídas (lista de exportações com **Publicar**/**Baixar**; só os 10 últimos; "Veja mais em Recursos"), Gerenciamento da conta (Informações da conta | Autorização de conta), Configurações (Idioma, Aparência, Planos e preços, Salvar sem marca d'água, Estratégia de confirmação de uso de créditos, Login e gerenciamento), Mais (CLI, Lista de desejos de recursos, Atendimento ao cliente), Termos e Políticas, Sair. Detalhes de cada aba: `PIPPIT_SOCIAL_PUBLISHING.md`, `PIPPIT_AUTH_OBSERVATIONS.md`.

## 9. Não aberto por segurança/limite (ver catálogo, seção L)
Publicar, Vincular conta (OAuth), Autorizar, Salvar sem marca d'água, Excluir conta, Sair, geração/exportação reais, aba Anual dos planos, "Detalhes" de plataformas, painel direito do editor (precisa de clipe na linha do tempo), criação de avatar/voz (cliques sem efeito visível), CLI/Lista de desejos/Atendimento.
