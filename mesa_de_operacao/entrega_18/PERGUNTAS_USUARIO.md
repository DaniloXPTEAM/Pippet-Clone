# PERGUNTAS_USUARIO — rodada 18 (atualizado após a VERIFICAÇÃO dos zips, 12/11/2026)

Regra: só o que **só o usuário** destrava. A evidência do REA foi minerada em duas rodadas (`REVISAO_REA.md` + `VERIFICACAO_RELATORIO_PC.md`) — o que ela respondeu **não precisa mais ser respondido**. Restam **6 lacunas** (as 9 originais menos porta de idade, contratos e menus respondidos pela evidência).

| # | Pergunta (o que falta de verdade) | O que muda no inventário se respondida | Situação |
|---|---|---|---|
| 1 | Presets de **áudio**: os nomes exibidos na Home (o contrato já é conhecido: `formFields {audioModel,…}`, campo `tone` com cenas conversation/narration/voiceover/chat/Customer service/Storytelling; o catálogo vem do servidor em runtime) | linha 132 ganha os nomes reais | parcial — contrato resolvido pela mineração |
| 2 | **Inspiration**: como é o feed (cartões, curtidas, remix) | linha 91 ganha conteúdo CONFIRMED | parcial — itens são capabilities (`inspiration_id`/`tpl_id`, `transfer_material`); feed sem captura |
| 3 | Tela de **"needs_ui"** da porta de idade (o que `check_result:1` mostra) | linha 94 fecha | **quase toda respondida pela evidência**: `POST /lv/v1/sc/age_gate/log_in_age_check`, kick_out = "Can't access Pippit… Sign Out"; só falta a tela de needs_ui |
| 4 | **Provedor de lip-sync/voz** externo que devo preparar (nome do serviço) | linhas 6/7 ficam com provedor CONFIRMED | parcial — SAPI local implementado; aviso "Accurate lip-sync will be available after export" observado |
| 5 | **Credenciais** de cada rede, por variável de ambiente (nomes em `.env.example`) | linha 64 (OAuth) sai de bloqueada | aberta — só o usuário |
| 6 | **Marketplace**: existe tela no Pippit? (0 capturas em toda a evidência) | linha 77 sai de "0 telas UNOBSERVED" | aberta |

**Já respondidas pela evidência (não perguntar mais):** menu "Link account" (TikTok, Facebook Page, Instagram Reels — sem YouTube); dropdowns do compositor (Agent/Video/Image/Audio; Model|Preference com Smart match + 3 Seedance, Ratio/Resolution/Video length); drawer "Quickly create avatar video" completo (3 abas, 8 filtros, Edit script, 12 estilos de legenda, Show as captions, English, Edit more, Export ⚡11 2̶3̶, aviso de lip-sync); **porta de idade** (endpoint + textos do kick_out); **widget de ajuda** (URLs kefu-im.bytedance.com / summon.bytedance.com / helpdesk.bytedance.com + parâmetros); **SSE** (`/api/biz/v1/agent/subscribe_run?run_id=`, `subscribe_thread`); **omni** (26 endpoints com corpos; envelope `{ret,errmsg,logId,data}`); foto falante etapa 1; menu do histórico (compartilhar/renomear/excluir); galeria de avatares ("Aplicar", "2 usos gratuitos"); skills store; home autenticada.

**Residual do menu "…" dos avatares e prévia de áudio:** continuam sem captura, mas não travam nada — se você clicar neles no Pippit e mandar uma captura, a linha 56 fecha.

Fontes: `REVISAO_REA.md`, `VERIFICACAO_RELATORIO_PC.md` (mineração de `scripts.zip`, 911 bundles), `telas_internas_A.zip`/`screenshots.zip`/`rea_session_bundle_lote12.json`, `TABELA_LINHAS_NAO_PRONTAS.md` — todos no Drive (`PiperLine_REA_Evidencias/mesa_de_operacao`) ou no repositório.
