# Pippit — Vinculação de contas, Publicação e Agendamento (estrutura preservada)

Objetivo (pedido de 22/10/2026): guardar toda a estrutura observada do Publisher para uma implementação futura com **APIs oficiais e autorizações do próprio usuário**. Nada foi vinculado, autorizado ou publicado; nenhum crédito foi gasto. Tudo abaixo separa **observado**, **inferido** e **desconhecido**.

Código: `local_reconstruction/src/publishing.mjs` (modelo, validações, formatos observados, adaptadores planejados) · rotas locais em `app/server.mjs` · página `#/schedule` ("Publicador") · teste `test/publishing.test.mjs` (inclui asserção de **0 chamadas de rede externas**).

## Fontes de evidência
| Fonte | Conteúdo |
|---|---|
| REA 6.7.0 `ev_1204271935ec8fc1c0affd7c9900273705272c4f553f8999aea7a51ebf9690ec` (cenário Publisher) | chamadas `list_schedule_task`, `get_bind_account_list`, `account/limit`, `product/list` |
| `captures/skills_670/publisher/*` | corpo de cada requisição/resposta (5× `list_schedule_task`, `get_bind_account_list`, `list`) |
| `captures/skills_670/publisher_page/` | texto visível + screenshot do estado vazio |
| `captures/skills_670/analytics/captura.json` | Analytics: estado vazio / esqueleto do painel |
| Históricas REA 6.5.0 | `PIPPIT_SOCIAL_PUBLISHING.md`, `PIPPIT_NODES_AND_AVATAR_FLOWS.md` §9.2–9.3, `captures/auth/{social_accounts,schedule_publish,api_social,api_schedule}` (IDs antigos permanecem separados dos 6.7.0) |

## 1. Navegação (observado)
Menu **Mais** → Gerador de vídeos · Avatares e vozes · Análise (`/data-analytics`) · **Publicador** (`/schedule-publish`). O app local mantém também **Editor** (observado na captura 6.5.0; não vimos na 6.7.0 — pode ter mudado; ambos ficam).

## 2. Vinculação de contas
**Observado**
- Estado sem conta: botão **Vincular conta** → menu TikTok / Página do Facebook / Reels do Instagram.
- `POST /api/account/v1/get_bind_account_list` com `{platform_type:[1,301,311,3,101,201,401], tt_creator:true}` → `{ret,errmsg:"SUCCESS",data:{platform_user_info:{"<código>":[]}}}` (todas vazias).
- `POST /api/account/v1/limit {}` → limite **0/3** contas sociais (plano Free).
- Tela separada de Autorização de conta (histórico 6.5.0) lista também YouTube, TikTok Shop, Shopify, Google Drive, Dropbox.

**Inferido (não confirmado)**: 1 = TikTok, 301 = Página do Facebook, 311 = Reels do Instagram (pela ordem do menu e das chaves). Os códigos 3, 101, 201, 401 são pedidos mas **não aparecem no Publisher**.

**Desconhecido**: formato de um item de conta vinculada; endpoint/URL de início do OAuth; callback; desvinculação; renovação de token; significado do `tt_creator`.

## 3. Publicação e agendamento
**Observado**
- Diálogo **Programar**: seletor "Selecionar conta", data, hora (fuso do sistema), descrição `0/2200`; **sem conta vinculada o botão fica desabilitado**.
- `POST /api/biz/v1/publish/list_schedule_task` `{start_time, end_time (ms, janela ~90 dias), status_list:[1,2,3,4,6], platform_user_ids:{"1":[],"301":[],"311":[]}}` → `{ret:"0",errmsg:"",svr_time,log_id,data:[]}`.
- `POST …/publish/list` (produtos): `{keyword:"",page:1,size:10,sort_field:2,is_asc:false}`.
- Endpoints existentes nos bundles, **sem esquema observado**: `create_schedule_task`, `batchcreate_schedule_task`, `update_schedule_task`, `delete_schedule_task`, `list_task_by_asset`, `recommend_hashtags`, `products`, `product_add_verify`, `product_content_verify`.

**Desconhecido**: corpo de uma tarefa; significado de `status_list` 1,2,3,4,6 (provavelmente agendado/publicando/publicado/falho/cancelado — **não verificado**); regras de horário mínimo/máximo; limite de agendamentos; como `list_task_by_asset` liga ativo↔tarefa; formato de erro quando a plataforma recusa.

## 4. Analytics (observado)
Página `/data-analytics` mostra introdução e esqueleto do painel vazio ("por conta, por publicação, agregue e compare"). Sem contas, nenhuma métrica real foi vista. A tentativa de `capture_browser_scenario` nessa rota falhou (`execution_failure`) e não foi repetida sem mudança.

## 5. O que o PiperLine implementa hoje (tudo local)
- `GET /api/social/structure` — códigos, o que foi observado, limites e adaptadores planejados.
- `POST|GET /api/social/drafts`, `DELETE /api/social/drafts/:id` — **rascunho local** (ativo de vídeo, descrição ≤2200, plataformas ∈ {1,301,311}, horário futuro opcional, hashtags). Status `rascunho_local`; nada é enviado.
- Formatos Pippit somente-leitura: `/api/biz/v1/publish/list_schedule_task` (rascunhos só aparecem com `status_list` contendo 0, que é nosso código local) e `/api/account/v1/get_bind_account_list` (sempre vazio).
- `/api/social/connect` continua **501** e `/api/social/publish` **409**.

## 6. Plano para APIs oficiais (conhecimento do analista — verificar a documentação vigente antes de implementar)
Estado de cada adaptador em `OFFICIAL_ADAPTERS`: `nao_conectado`.
| Plataforma | API oficial | Autenticação | Pontos de atenção |
|---|---|---|---|
| TikTok | Content Posting API | OAuth 2.0 (Login Kit), app registrado | escopos `video.publish`/`video.upload`; app sem auditoria publica privado |
| Página do Facebook | Graph API (Pages) | OAuth 2.0 + App Review | `pages_manage_posts`; agendamento nativo via `scheduled_publish_time` |
| Reels do Instagram | Instagram Graph API (Content Publishing) | via Facebook Login, conta profissional | publicação em 2 etapas (contêiner + publicar) |
| YouTube (extra) | YouTube Data API v3 `videos.insert` | OAuth 2.0 Google | apps não verificados saem privados; cota |

Ordem sugerida: (1) registrar apps e guardar credenciais só em configuração do usuário, nunca no repositório; (2) fluxo OAuth local (redirect `http://127.0.0.1:5180/...`), tokens criptografados; (3) trocar `bindAccountList` por contas reais; (4) agendador local (fila persistente) ou agendamento nativo da API; (5) status de publicação consultável. Cada publicação exige confirmação explícita do usuário no app.

## 7. Incertezas registradas
Ver `notes/rea_unknowns.json` (domínio `publishing`, 2 IDs de 22/10/2026): esquemas de create/update/batch/delete, significado de `status_list`, mapa código→plataforma, fluxo OAuth, formato de conta vinculada, métricas do Analytics com contas.
