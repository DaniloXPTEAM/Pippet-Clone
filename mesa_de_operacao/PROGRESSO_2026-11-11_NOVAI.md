# Progresso — NovAI (vídeo `cogvideox-flash`, imagem `cogview-3-flash`, texto `glm-4.7-flash`)

Rodada 5 · 2026-11-11 · commit **local** (sem push) · suíte **110 ok + 2 skips = 112** · inventário **81/120 = 67,5%** (mesma fórmula)

## 1) O que faltava e o que passou a existir

| Antes | Agora |
| --- | --- |
| Vídeo era **PENDING**: nó de Vídeo devolvia o objeto do provedor/501, composer respondia 501, Foto falante só tinha a prévia local | Vídeo **real** pela NovAI (`cogvideox-flash`, 5 s) em **fila assíncrona**, com progresso por SSE; nada de PENDING |
| Nenhum provedor de vídeo no catálogo | 7º provedor `novai` no catálogo, com `video-output`, `image-output` e `text` |
| Imagem: Cloudflare → Omni | Cloudflare → Omni → **NovAI `cogview-3-flash`** (reserva) |
| Texto: FreeLLMAPI → Omni → NVIDIA (2 modelos) | … → **NovAI `glm-4.7-flash`** (reserva) |

## 2) Regras medidas pelo usuário (implementadas à risca)

| Item | Valor implementado |
| --- | --- |
| Base | `https://aiapi-pro.com/v1` (const `NOVAI_BASE`) |
| Credencial | `Authorization: Bearer ${NOVAI_API_KEY}` — **só variável de ambiente**; `hasKey` é o único booleano exposto |
| Vídeo — submit | `POST /video/generations` `{model:'cogvideox-flash', prompt, duration:5}` → `{id, status:'queued'}` |
| Vídeo — consulta | `GET /video/generations/{id}?model=cogvideox-flash` **a cada 12 s** (`NOVAI_POLL_MS`) |
| Estados | `SUCCESS`/`COMPLETED`/`SUCCEEDED` = concluído · `PROCESSING`/`QUEUED`/`PENDING`/`RUNNING`/`IN_PROGRESS` = em andamento · `FAILED`/`ERROR`/`CANCELED`/`CANCELLED`/`REJECTED`/`MODERATION`/`TIMEOUT` = erro · **qualquer outro = status inesperado → erro** (nunca vira sucesso) |
| MP4 | `video_result[0].url` **ou** `video_url` |
| Download | **só https** em `aiapi-pro.com` ou `*.ufileos.com`; a URL **final** (depois de redirecionamentos, via `response.url`) é conferida de novo; fora da lista → arquivo descartado |
| Timeout | `240000` por padrão com **piso de 180000** no provedor e no executor (`NOVAI_TIMEOUT_MS`) |
| Teto | **5 gerações/dia** (`NOVAI_VIDEO_DAILY_LIMIT`); `dailyLimit` no provedor + contagem por dia no servidor |
| 429 | tratado como **cota/taxa** → `markUnavailable` por 1 h, `blocked` na contagem → **a chamada não é repetida**; o próximo vídeo recebe 501 explicando a cota, sem tocar na rede |
| Medição | 72 s, H.264, 1792×1024, 5 s, 1,5 MB |
| Imagem | `POST /images/generations` `cogview-3-flash` → `data[0].url` (JPEG, ~12 s), também com allowlist de download |
| Texto | `POST /chat/completions` `glm-4.7-flash` |

## 3) Ligação com o app

- **Nó de Vídeo do Canvas** (`POST /api/projects/:id/nodes/:nid/generate`): prompt ≥ 15 caracteres é validado **antes** de qualquer chamada; resposta **202** com o run (`queued`); o MP4 é salvo em `files/` e vira `assetId` do nó; a UI mostra `Vídeo: em andamento · 42% · fila 1 · PROCESSING` e, ao terminar, repinta o Canvas **só se o nó ainda estiver na tela** (bug corrigido: o repintar tardio roubava a tela de outra página).
- **Composer de Vídeo**: o toast de PENDING saiu; `POST /api/local-runs {mode:'Vídeo'}` cria o run, a página da tarefa mostra `#runProgress` (fase, %, fila, status do provedor) e termina com `<video id="runAsset">` apontando para o MP4 salvo.
- **Foto falante**: botão *Gerar clipe de IA (NovAI, 5 s)* em `POST /api/talking-photo/ai-video`. Escolha explícita e declarada: **sem lip-sync** — a API aceita apenas prompt, então a foto e o áudio **não** são enviados (`source.sendsImage=false`, `sendsAudio=false`) e a tela avisa isso em vez de prometer sincronia.
- **Fila**: `MAX_RUNNING_VIDEO_RUNS = 1`; `queuePosition` aparece na tarefa; cancelar funciona na fila e durante o polling (aborta o `fetch` e o `sleep`).
- **Preset da pilha**: devolve `video {provider, seconds, pollMs, dailyLimit, queue}` e `order.video`; reaplicar a pilha libera bloqueio temporário (401/429/timeout) **sem** zerar a contagem do dia.

## 4) Testes (sempre servidor falso em 127.0.0.1, nenhuma chamada real)

- `test/novai_router.test.mjs` — catálogo e piso de timeout; estados; allowlist (`https` exigido, sufixo falso `evil-ufileos.com` recusado); texto/imagem; imagem com URL fora da lista; vídeo `queued → processing → success` com `?model=cogvideox-flash` e `duration:5`; falta de chave sem chamada; 401; **429 sem repetir**; status inesperado; falha do provedor; timeout no adaptador e no executor; **cap de 5/dia**; servidor: 202 no nó, fila de 1, MP4 em disco e no nó, SSE com `submitting`/`polling`/`progress:100`, URL fora da lista, timeout, 429 → 501 sem nova chamada, Foto falante sem lip-sync e prompt curto 400; nenhuma chave em resposta.
- `test/novai_video_ui.test.mjs` — Playwright: nó de Vídeo aceita 202 e recebe o MP4; composer em modo Vídeo mostra progresso/fila e termina com `<video>`; sem erros de página.
- `test/provider_smoke.test.mjs` — três linhas NovAI com modelo/base/timeout corretos e `skip`/`sem chave` sem chamar nada.
- Ajustes de contagem/ordem nos testes existentes: `free_router`, `cloudflare_router`, `cloudflare_routes`, `free_router_stack_ui`, `freellmapi_router` (7 provedores; vídeo deixa de ser PENDING; `missing` agora lista `novai: chave ausente` pelo **nome** da variável).

## 5) Arquivos tocados

`local_reconstruction/src/free_router.mjs` · `local_reconstruction/app/server.mjs` · `local_reconstruction/app/public/app.js` · `tools/provider_smoke.mjs` · `local_reconstruction/test/novai_router.test.mjs` (novo) · `local_reconstruction/test/novai_video_ui.test.mjs` (novo) · `local_reconstruction/test/run-all.mjs` · `local_reconstruction/test/{free_router,cloudflare_router,cloudflare_routes,free_router_stack_ui,freellmapi_router,provider_smoke}.test.mjs` · `STATUS.md` · `FEATURE_INVENTORY.md` · `PASSO_A_PASSO_CLAUDE.md` · este arquivo.

## 6) O que NÃO foi feito (honestidade)

- **Nenhuma chamada real** à NovAI a partir do sandbox (ele não alcança os provedores): tudo contra servidor falso. A validação com a API de verdade é o `node tools/provider_smoke.mjs` no PC do usuário, com `NOVAI_API_KEY` só na sessão.
- **Não há sincronia labial** no clipe da Foto falante: a API de vídeo aceita somente prompt.
- O vídeo é sempre **5 s** nesta rodada (a API aceita `duration`, mas só 5 s foi medido).
- Nada de chave, conta ou token foi gravado em arquivo, teste, log, relatório ou Drive.
