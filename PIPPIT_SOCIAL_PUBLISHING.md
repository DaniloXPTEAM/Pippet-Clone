# Conexão de redes sociais, publicação e análise — prioridade do projeto
Fonte: `captures/auth/social_accounts`, `account_pages*`, `schedule_publish`, `more_menu_pages`, `api_social/`, `api_schedule/`. Leitura apenas: **nenhuma conta foi vinculada, nenhuma publicação feita; o botão "Publicar" não foi clicado** (o clique foi bloqueado pelo classificador de permissões por poder publicar conteúdo numa conta conectada). **[V]** observado; **[?]** não verificado; **[I]** inferido.

## 1. Onde fica
- `Configurações > Gerenciamento da conta > Autorização de conta` → `/settings?tab_key=account_authorization` [V].
- `Configurações > Login e gerenciamento` → `/settings?tab_key=sign_management` (login por Google/TikTok/Facebook: Vincular/Desvincular/Alterar e-mail) [V]. Outras abas: `personal_information` (nome, e-mail, IDs, copiar, **Excluir conta**), `points_prompt_settings` (confirmação de créditos).
- Páginas de produto: **`/schedule-publish`** (publicação agendada), **`/data-analytics`** (Análise), botões **Publicar** e **Baixar** em "Tarefas concluídas" (cada exportação aparece como "Exportado"; só os 10 mais recentes) [V].

## 2. Contas vinculáveis (tela "Autorização de conta") [V]
- **Contas de redes sociais (0/3)**: TikTok, YouTube, Facebook, Instagram (cada um com "Detalhes" e contador "N conta vinculada"). O "(0/3)" indica um limite de contas sociais no plano atual [I].
- **Contas corporativas**: Criador da TikTok Shop (0/1), Vendedor da TikTok Shop, Shopify (0/1).
- **Armazenamento em nuvem**: Google Drive (0/1), Dropbox (0/1).
- "Habilitar o Pippit para usar Criações inteligentes → Ativos" (permissão ligada à Criação inteligente).
- **Menu "Vincular conta" em /schedule-publish**: TikTok · Página do Facebook · Reels do Instagram [V] (YouTube só aparece na tela de configurações).

## 3. API de contas [V]
`POST /api/account/v1/get_bind_account_list`: corpo `{"platform_type":[1,301,311,3,101,201,401],"tt_creator":true}`; resposta `{ret:"0", errmsg:"SUCCESS", data:{platform_user_info:{"1":[],"101":[],"201":[],"3":[],"301":[],"311":[],"401":[]}}}` (uma lista de contas por código de plataforma). São 7 códigos para as 7 entradas sociais/corporativas listadas; **o mapeamento código→plataforma é [?]** (sem conta vinculada, o formato de cada item não apareceu). Login social (Google já vinculado) vem de `GET /passport/web/account/info/` (`connects[]` com plataforma, expiração do token e nome) e `/passport/web/cancel_user_check`.
O fluxo OAuth de "Vincular" (redirecionamentos, escopos, armazenamento do token) **não foi observado**: exigiria iniciar a autorização numa rede social real, com a sua conta.

## 4. Publicação agendada e análise
- `/schedule-publish` [V texto]: "Gerencie suas publicações nas plataformas sociais em um só lugar"; criar, editar e publicar; "Programe para publicar conteúdo automaticamente sempre que desejar". Sem contas vinculadas, só mostra o convite "Vincular conta". Com contas, o calendário/fila é **[?]**.
- Recompensa ligada [V]: tarefa **10004 "publicar conteúdo"** (+80 créditos), botão "Ir" → `/schedule-publish`, depois "Resgatar" (`CLAIM`) e "Resgatado".
- `/data-analytics` ("Análise") [V texto]: painel das publicações em todas as plataformas: **por conta** (engajamento), **por publicação** (stories, posts, reels) e **agregar e comparar**.

## 5. O que o projeto local precisa reproduzir (derivado do observado)
Conta vinculada por plataforma (código) com limite por plano; publicação = (vídeo exportado, conta, horário, legenda); fila de agendamento; coletor de métricas por conta e por publicação; recompensa de créditos pelo primeiro uso; permissão separada para a Criação inteligente.
**Continua desconhecido [?]**: o diálogo "Publicar" (campos, legenda, hashtags, horário, escolha de conta), a chamada de agendamento/publicação, o tratamento de erros dos conectores TikTok/Instagram/Facebook/YouTube e o fluxo OAuth. Essa é a parte difícil que você descreveu (permissões e revisão de app em cada rede); o front-end sozinho não a resolve.

## Atualização 20/10/2026
Diálogo "Programar publicação" e redirecionamento do TikTok documentados em `PIPPIT_NODES_AND_AVATAR_FLOWS.md` §9.2–9.3. Sem conta vinculada, "Programar" fica desabilitado; nada foi publicado nem autorizado.
