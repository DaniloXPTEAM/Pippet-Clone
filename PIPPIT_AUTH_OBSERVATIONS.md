# Observações autenticadas (conta do usuário, plano gratuito) — via REA
Fonte: `captures/auth/*` (capturas REA em modo `connect` ao Chrome do perfil `C:\w\rea_chrome_profile`, login feito pelo usuário). Dados pessoais da conta não foram copiados para este documento. Classificação: **[V]** verificado por captura, **[C]** identificado no código/telas, **[?]** não verificável com esta conta.

## 1. Sessão e app autenticado [V]
- Após login, `https://www.pippit.ai/home` (título "Pippit: Smart Creative Agent for Scalable Content"). `/pt-br/pricing` redireciona para `/home` quando logado.
- Chamadas de sessão/conta: `GET /passport/web/account/info/`, `POST /lv/v1/user/web/user_info`, `POST /api/biz/v1/user/profile`, `GET /api/biz/v1/user/bui`, `POST /api/biz/v1/user/click_id`, `POST /api/account/v1/settings`, `POST /api/account/v1/get_bind_account_list`.
## 2. Inventário de APIs de produto vistas no `/home` (método, caminho) [V; corpos em `captures/auth/api_home/`, parciais]
Agente/modelos: `POST /api/biz/v1/agent/get_available_model_list`, `list_homepage_recommended_skill`, `user_subscribe_callback`; geração: `POST /api/biz/v2/common/generation_task_list` (4x), `POST /lv/v1/common_task/list` (4x), `POST /api/biz/v1/videogen/digital_human_filter_config`; home: `POST /api/biz/v1/home/recommend_video`, `POST /artist/v1/effect/user_favorite_list`.
Créditos/planos: `POST /commerce/v1/benefits/user_credit`, `/commerce/v3/benefits/batch_get_user_benefit`, `/commerce/v3/resource/benefit_metadata`, `/commerce/v1/subscription/cc_price_list` (body: `{aid:573081, scene:"vip", app_id:573081, pms_extra:"{redirect_from:main_subscribe_page}"}`), `/commerce/v1/common/start_up`, `/commerce/v1/resource_position` (4x), `POST /api/biz/v1/product/list` (observado: `products:[]`, page 1, size 10, total 0), `GET /jsonp/commerce/v1/subscription/user_info`.
Crescimento: `GET /api/biz/v1/reward_task/list` (5x), `GET /api/biz/v1/invite/invite_conf`, `POST /api/biz/v1/benefit/notice/list`, `POST /lv/v1/notice/get_notice_list`, `get_unread_count`.
Telemetria/config: ver `TELEMETRY_SPEC.md`; adicionalmente `POST vcs-sg.capcutapi.com/vc/setting`, `GET mssdk-sg.capcutapi.com/web/resource`, `GET starling-normal-sg.capcutapi.com/check_and_get_text/...`, `GET sf16-tcc-tos-sg.byteoversea.com/.../tcc-v2-data-capcut.business.api-default` (config remota), `POST mcs-normal-sg.../list` (6x), `POST mon-sg.../collect/batch/` (4x), `POST vmweb-normal-sg.../abtest_config/` (6x), WASM `ever_cloud_sdk` (`cc-remove-blob`).
Envelope de resposta observado: `{ret:"0", errmsg:"", svr_time, log_id, data:{...}}` [V].
## 3. UI do `/home` [V, texto de acessibilidade em `captures/auth/*.txt`]
Barra lateral: Criativo, Estúdio de marketing, Estúdio de histórias, Tela (NEW), Ativos, Habilidades, Criação inteligente, Mais; Histórico de projetos (lista de títulos com data), menu da conta, notificações. Centro: abas de tipo de agente (Criativo / Marketing / Histórias), caixa de prompt, "Carregar material de referência", "Marcar" (@), "Modo de criação" (Agente), "Habilidades", "Modelos e preferências" (Modelo / Preferência), alternância "Tela", botão enviar. "Skills recomendadas": Anúncios de drama SD 2.5, Vídeo de marketing GPT Image 2, Gerador de Vlog, Vídeo de avatar, Replicação Viral, Foto falante de IA. "Trabalhos em destaque" (galeria da comunidade, concurso de storytelling).
## 4. Créditos no plano gratuito [V, `captures/auth/credit_details_accessibility.txt`]
- Concessão diária "Créditos gratuitos": **+80** (em março/2026: +120), validade até 23:59:59 do mesmo dia; a UI diz "expiram às 00:00". Ao expirar surge a linha "Expired −N" com o restante não usado.
- "Créditos de bônus por criação de conta": +200, validade de 2 anos.
- Débitos observados: "Vídeo de marketing" −36/−44/−120; "Dreamina Seedance 2.0 Mini (teste)" −105 por geração.
- UI: botões "Convide e ganhe", "Atualizar", "Carregar mais" (paginação do histórico), "Ganhe créditos com tarefas" (reward_task), "Assine para obter mais créditos".
- Oferta exibida: até 90% de desconto nos planos; R$7,59 no primeiro mês; Seedance 2.5 em 720p a partir de R$0,18/s; Seedance 2.0 Fast a partir de R$0,04/s [V como texto de banner].
## 5. Planos pagos [? ainda não observado]
Os botões "Assine para obter mais créditos" e "Obter oferta" **expiraram (timeout) ao serem clicados pelo REA** (click não acionável); a resposta de `cc_price_list` não foi retida (`unavailable`). Portanto a matriz de planos (nomes, preços, créditos, limites, resoluções, recursos exclusivos) **não foi capturada ainda**. Fontes pendentes: modal de assinatura, `cc_price_list`, `benefit_metadata`, `batch_get_user_benefit`, e o app `kep/pricing` (JS já recuperado, tradução `pt-BR.89180`).
## 6. Não executado de propósito
Nenhuma geração, compra, upload, exportação ou alteração de conta foi disparada (consomem créditos/ou alteram dados). Pedem autorização explícita por ação.

## 7. Rotas e APIs por seção (navegação por clique do REA, `captures/auth/scenario_auth_sections*.json`) [V]
| seção | rota | APIs novas observadas | observação |
|---|---|---|---|
| Ativos | `/asset-management-material` | `POST /api/biz/v3/asset/search`, `POST /api/biz/v3/character/manage/page`, `GET /api/biz/v3/character/create/bootstrap` | biblioteca de ativos + personagens |
| Habilidades | `/skill` ("Loja de habilidades") | `POST /api/biz/v1/agent/get_web_agent_setting`, `list_skill_tag`, `list_skill_store` | abas Todos / Minhas skills / Favoritos, busca, "Criar skill" |
| Tela | `/nest-agent-project?entranceFrom=side_menu&projectId=<id>&generate_mod...` | `POST /api/biz/v1/agent/create_creative_project` | **clicar em "Tela" cria um projeto vazio na conta**; painel "Conversas do agente" (Novo chat, Histórico de chats, Compartilhar, Fechar) |
| Estúdio de marketing | `/marketing-agent` | — (carregamento tardio) | campos Produto / Personagem / materiais de referência, Gancho, Estilo visual, Modelos e preferências, botão Generate |
| Estúdio de histórias | `/story-studio/list?tab_name=home&enter_from=home_banner&entrance_from=home_tab` | — | lista de histórias |
| Home (carga) | `/home` | `get_pay_for_best_info`, `digital_human/get_item_list`, `benefits/credit_receive`, `account/v1/limit`, `sc/compliance_popup/fetch_all`, `sc/age_gate/log_in_age_check`, `record_resource_action`, `web_homepage/display_content/list`, `web_homepage/promo_slot/list`, `context/generate_light_infos`, `common/im_access`, `user/fetch_email_status` | `credit_receive` = recebimento do crédito diário (inferido pelo nome) [C] |
## 8. Efeito colateral a registrar
Durante a captura, o clique em **"Tela"** criou um projeto vazio ("PROJECT", projectId 1206033530372, aparece em "Hoje" no histórico). Não consumiu créditos. Pode ser apagado pelo usuário; o REA não deve voltar a clicar em "Tela" sem autorização.
## 9. Testes mínimos que exigem créditos (NÃO executados; aguardam autorização)
Saldo atual exibido: 125. Custos já observados no histórico: "Vídeo de marketing" 36–120 créditos; Seedance 2.0 Mini (teste) 105 créditos por geração. Candidatos: (a) geração de imagem mais barata (custo ainda não conhecido; o app mostra o custo antes de enviar), (b) um vídeo curto no modelo mais barato disponível. O custo exato é lido na tela antes de confirmar; só executo após você autorizar o valor.
