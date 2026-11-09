# local_reconstruction

Reconstrução funcional **somente do que foi observado** (sem invenção). Rodar: `node test/pageview.test.mjs` (Node 18+).

## Reconstruído e verificado (contra captura + código recuperado)
- `src/pageview.mjs`: cliente de page view `GET /lv/v1/event/report` (variantes cms_consumer e landing). Teste compara URL e ordem de parâmetros com `captures/scenario_video-agent_bodies.json`, regras de não-envio (sem host/web_id, bots), transporte e erro engolido.
- Especificação: `../TELEMETRY_SPEC.md`.

## NÃO reconstruído: sem evidência (DESCONHECIDO)
Autenticação, projetos, geração (vídeo/imagem), agentes, editor, mídia, exportação, histórico, agendamento, canvas, créditos/planos. A navegação pública só mostrou textos de UI (60 chaves `Pippit_agent_*`) e `POST /lv/v1/user/web/user_info`; nenhuma API de geração foi chamada. Implementá-los seria inventar. Eles dependem de sessão autenticada (regra do projeto: não acessar áreas privadas nem contornar login) e de backend que o frontend público não expõe.
## Pendências de verificação
- Corpos dos POSTs de monitoramento (Slardar/MCS/Clarity/GA/Bing/abtest) e valor da constante de host de fallback (`ti.KR`).
- Verificação formal pelo REA (`verify_reconstruction`) exige evidências de comparação (`ev_...`) de uma captura da reconstrução; ainda não gerada. O teste acima é local, não do REA.

## Estado de verificação por funcionalidade (classificação pedida)
| funcionalidade | arquivo | classe | evidência |
|---|---|---|---|
| Page view `GET /lv/v1/event/report` | `src/pageview.mjs` | EQUIVALENTE (URL e ordem dos parâmetros; regras do código) | captura `scenario_video-agent_bodies` + `main.e32a6083.js`/`771` |
| Livro-razão de créditos do plano gratuito | `src/credits.mjs` | PARCIALMENTE EQUIVALENTE (3 sequências reproduzidas; lotes de março com horário de expiração diferente e a sequência de 14/09 com 315 créditos gastos não foram explicadas) | `captures/auth/credit_details_accessibility.txt` |
| Sessão/login, perfil, histórico, ativos, geração, agentes, editor, exportação, planos pagos | — | AINDA NÃO VERIFICÁVEL / não implementado | ver `../PIPPIT_AUTH_OBSERVATIONS.md` seção 5 e 6 |
| Planos (catálogo mensal) | `src/plans.mjs` | PARCIALMENTE EQUIVALENTE (valores da UI; aba anual, 2º botão "R$46" e demais níveis do Pro não vistos) | `../PIPPIT_PLANS.md` |
| Workflow do agente (segmentação ≤15 s, pergunta, confirmação, gating por plano, nós/arestas, custo 7/s) | `src/workflow.mjs` | PARCIALMENTE EQUIVALENTE (estrutura e regras observadas; o planejador/LLM e os prompts internos são DESCONHECIDOS e ficam como interface `planner`) | `../PIPPIT_WORKFLOW_OBSERVATIONS.md` |
Verificação formal `verify_reconstruction` do REA: não executada (exige captura comparável da reconstrução).


## Aplicação local (reconstrução funcional)
**Iniciar:** `node local_reconstruction/app/server.mjs` → abrir **http://127.0.0.1:5180** (Node 24; ffmpeg encontrado automaticamente em `PATH`/WinGet ou via `PIPPIT_FFMPEG`/`PIPPIT_FFPROBE`). Dados em `local_reconstruction/data/` (`PIPPIT_LOCAL_DATA` para trocar; `POST /api/reset` zera).
**Funciona de verdade:** projetos/histórico (renomear, compartilhar, excluir), canvas com os 7 tipos de nó e arestas (salvo automaticamente), agente com pergunta/design/storyboard/confirmação/segmentação, ativos (upload/lista/baixar/excluir), editor (clipes, corte, velocidade, proporção, texto e legenda manuais, **exportação MP4 real**), assistente de avatar de foto (validação real, consentimento, 3 usos), créditos (lotes/expiração/diário), planos (mensal/anual) e bloqueios, configurações, telemetria (coletor do GET observado).
**Não gera por IA:** sem provedor, qualquer geração (vídeo/imagem/áudio/avatar/voz) falha explicitamente, sem débito e sem resultado fictício. Em Configurações > Estratégia de confirmação de uso de créditos pode-se ligar o **provedor local ffmpeg (NÃO é IA)**, que gera vídeos de cor/zoom de imagem e monta o resultado de verdade.
**Testes:** `node test/pageview.test.mjs`, `credits`, `plans`, `workflow`, `canvas_avatar`, **`e2e.test.mjs`** (API + ffmpeg) e **`ui.test.mjs`** (Chrome real via playwright-core; prints em `test/ui-shots/`). Estado por funcionalidade: `../FEATURE_INVENTORY.md`.

## Paridade de rótulos (`node test/parity.test.mjs`)
Confere se rótulos observados no Pippit (capturas CDP) existem nas telas locais equivalentes: 26/26 em /home, /analytics, /editor. Mede só cobertura de texto — NÃO é equivalência visual nem comportamental, e não substitui o `verify_reconstruction` do REA.

## Geração direta (Auto Route) — 21/10/2026
`src/directgen.mjs` reproduz o contrato observado (HARs em `captures/auth/autoroute/`): `batch_check_withhold_deduct` → `create_creative_project` → `namespace_create` → `submit_run` → `get_run`/`get_thread`/`subscribe_thread` → ativos (`sse_asset`, `list_project_file`, `mget_asset_info`) e `user_credit`. Rotas montadas em `app/server.mjs` com os mesmos caminhos do Pippit; UI: Home → modo Vídeo → modelo Auto Route → canvas `/direct/<projeto>/<canvas>/<run>`. **Não há IA**: sem provedor o run falha (sem débito); com `settings.provider = local-ffmpeg` gera um vídeo não-IA. Regras observadas: prompt ≥ 15 caracteres, débito 12 créditos (4 s/768p) no envio. Itens `UNOBSERVED` no código são palpites mínimos, não comportamento comprovado. Testes: `node test/directgen.test.mjs`, `directgen_http.test.mjs`, `directgen_ui.test.mjs`.
