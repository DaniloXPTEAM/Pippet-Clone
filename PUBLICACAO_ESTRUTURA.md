# PUBLICACAO_ESTRUTURA — publicação nas redes (estrutura pronta)

Contrato **interno do PiperLine**, escrito em 09/11/2026 para o item 4 da rodada 7. Os quatro adaptadores (TikTok, Instagram Reels, Página do Facebook, YouTube) estão **finalizados como contrato**, com fila, agendamento e máquina de estados. **Nenhum está conectado, nenhuma chamada é feita**: `/api/social/connect` continua **501** e `/api/social/publish` continua **409** até existir credencial real.

## 1. Peças

| Peça | Arquivo | Papel |
|---|---|---|
| Adaptadores | `local_reconstruction/src/publishing.mjs` (`PUBLISH_ADAPTERS`) | Por plataforma: versão de OAuth, `authorizeUrl`, `tokenUrl`, **escopos**, exigência de revisão, endpoint de publicação, método, observações e as variáveis de ambiente esperadas (`*_CLIENT_ID`/`*_CLIENT_SECRET`/`*_REDIRECT_URL`). Nenhum valor de credencial no código. |
| Fila e estados | mesmo arquivo (`PUBLISH_STATES`, `createTask`, `transition`, `attemptPublish`, `dueForPublish`, `queueSummary`) | `rascunho → agendado → publicando → publicado` / `falhou`; transições inválidas recusadas; tentativa sem conta vinculada **nunca** passa por `publicando`/`publicado`. |
| Rotas | `local_reconstruction/app/server.mjs` | `GET /api/social/adapters`, `GET/POST /api/social/queue`, `POST /api/social/queue/:id/attempt\|cancel`, `DELETE /api/social/queue/:id`, além de `/connect` (501) e `/publish` (409), agora com o contrato no corpo. |
| Tela | `local_reconstruction/app/public/app.js` | Publicador → “Fila de publicação (estrutura)”: contadores por estado, tarefas com motivo da falha, “Enfileirar (estrutura)” nos rascunhos e a tabela dos quatro adaptadores com estado/escopos/o que falta. |
| Teste | `test/publish_queue.test.mjs` | Contrato dos 4 adaptadores, matriz de transições, fila/agendamento, 501/409, persistência, comparação de rede (zero saídas) e tela. |

## 2. Estados

| estado | significado local |
|---|---|
| `rascunho` | salvo só neste computador, sem horário |
| `agendado` | tem data/hora futura e está na fila local; nada foi enviado |
| `publicando` | só existe quando **todas** as contas das plataformas da tarefa estão conectadas (hoje: nunca) |
| `publicado` | só com adaptador conectado de verdade; o teste usa um adaptador falso injetado para provar a máquina |
| `falhou` | tentativa bloqueada, com `reason` explícito (ex.: “nenhuma conta vinculada em TikTok: falta aplicativo registrado…”) |

## 3. O que falta para publicar de verdade

1. Aplicativo registrado e aprovado em cada rede (TikTok for Developers, Meta App Review, Google Cloud/YouTube) — decisão e conta do usuário.
2. Definição das credenciais **no ambiente** (nunca em arquivo/commit/log/tela) e o fluxo de OAuth (autorização → código → token).
3. Escolher o modo de envio (upload direto x URL), tratar cota/limite de cada API e só então permitir `publicando/publicado`.
4. Enquanto isso, a fila e o agendamento funcionam como **estrutura local** — com a verdade escrita na tela e nos estados.

## 4. Garantias desta rodada

- `/api/social/connect` → **501** (com `adapter.oauth`, `env` e `missing` no corpo).
- `/api/social/publish` → **409** (com `missing` dos adaptadores no corpo).
- Toda tentativa da fila sem conta vinculada termina em **`falhou`** e responde **409**; `publicado` nunca é inventado.
- Teste intercepta `fetch`/`http`/`https` fora do servidor local e exige **zero** chamadas.
