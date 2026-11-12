# Progresso — Cloudflare Workers AI (imagem/voz) + FreeLLMAPI (texto)

## 1) Adaptador da Cloudflare Workers AI

| Item | Valor implementado |
| --- | --- |
| Provedor no catálogo | `cloudflare` — nome **Cloudflare Workers AI**, adaptador `cloudflare-workers-ai`, localidade `cloud` |
| Base | `https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/<modelo>` |
| Credenciais | `CLOUDFLARE_API_TOKEN` (Bearer) e `CLOUDFLARE_ACCOUNT_ID` — **só de variável de ambiente** |
| Imagem | `@cf/black-forest-labs/flux-1-schnell`, body `{prompt, steps:4}`, resposta `result.image` (JPEG base64) — ~2,5 s medido |
| Voz | `@cf/myshell-ai/melotts`, body `{prompt, lang:'en'}`, resposta `result.audio` (WAV base64, **não MP3**) — ~1 s medido |
| Timeout padrão | 60 s (curto porque o medido é 1–2,5 s) |
| Cap local | `dailyLimit` 50 tentativas/dia por padrão (`CLOUDFLARE_DAILY_LIMIT`) |

Como a conta não pode ir para arquivo/log/relatório, a base guarda o **placeholder `{account}`** e a substituição acontece
só no momento da chamada, com o valor de `CLOUDFLARE_ACCOUNT_ID`. O id da conta e o token entram na lista de segredos de
`responseError`/mensagens (`redactSecrets` → `[redacted]`), e a API pública expõe apenas `hasKey` / `hasAccount`.

Classificação de erros usada no roteador: **401/403** = auth (sai de rotação), **402** = cota/pagamento exigido, **429** =
cota, **timeout** = 60 s da rota, **400 com “No such model”** = modelo indisponível (troca só o modelo). Qualquer falha
passa para o próximo provedor da ordem — nunca há fallback pago.

## 2) FreeLLMAPI (texto principal)

`freellmapi` em `src/free_router.mjs`: base `http://127.0.0.1:3001/v1` (nunca `localhost` — normalizado para 127.0.0.1 e
recusado pela validação se vier cru), modelo `auto`, Bearer de `FREELLMAPI_API_KEY`, adaptador OpenAI-compatível.

## 3) Ordem final da pilha

| Tarefa | Ordem |
| --- | --- |
| Texto | FreeLLMAPI (`auto`) → Omni Router (`auto/best-free`) → NVIDIA (`google/gemma-4-31b-it`) → NVIDIA (`minimaxai/minimax-m3.1-flash`) |
| Imagem | Cloudflare (`flux-1-schnell`, steps 4) → Omni (`flux.2-klein-4b`) |
| Voz na nuvem | Cloudflare (`melotts`, WAV) — **só com `voiceSource:"cloud"`**; o padrão é SAPI |
| Vídeo | PENDING (nenhum provedor gratuito válido) |

`POST /api/free-router/preset/stack` (botão **Usar pilha gratuita**) grava tudo isso sem JSON manual e devolve a ordem,
o que falta (`missing`) e os booleanos de credencial. `DEFAULT_TASK_PREFERENCES` fica em `src/free_router.mjs`.

## 4) Ligação no app

- **Nó de Imagem** e **composer em modo Imagem**: rota `image_generation` (Cloudflare primeiro). Em 401/402/429/timeout da
  Cloudflare, o Omni assume; o cache de disponibilidade marca o provedor e o relatório mostra o motivo.
- **Nó de Texto** e composer de texto: `freellmapi` primeiro, com Omni/NVIDIA como reservas.
- **Nó de Áudio**: SAPI continua o padrão. `voiceSource:"cloud"` usa a rota `audio_generation` (melotts) e grava `.wav`
  (mime lido dos bytes). Sem SAPI e sem pedido explícito → **409 com motivo** (nada é gerado, nada é cobrado).
- **Composer em modo Áudio**: idem; `POST /api/local-runs {mode:"audio", voiceSource:"cloud"}` cria o nó de Áudio no Canvas
  com o arquivo da nuvem, e sem `voiceSource` mantém o caminho SAPI (ou bloqueio explícito onde não há SAPI).
- **`GET /api/composer/audio-mode`** e **`GET /api/tts-voices`** passaram a declarar a opção de nuvem
  (`cloudVoice` / `cloudRouter`: configurada?, modelo, formato, `voiceSource:"cloud"`) mantendo `defaultEngine: sapi`.

## 5) Testes (todos com servidor falso em 127.0.0.1, sem rede externa)

| Teste | Cobre |
| --- | --- |
| `cloudflare_router` | ordem imagem/texto/voz/vídeo; URL com a conta da env; Bearer; `{prompt, steps:4}`; `{prompt, lang:'en'}`; JPEG×WAV pelo mime dos bytes; 401→reserva; 402→cota; 429→429; timeout→reserva; `success:false`; resposta sem bytes; redação de conta/token; credencial ausente sem chamada |
| `cloudflare_routes` | `preset/stack`; `hasKey`/`hasAccount`; nó de Imagem (steps 4, JPEG em disco); nó de Texto (FreeLLMAPI `auto`); nó de Áudio opt-in (WAV) e bloqueio sem pedido; composer Imagem/Áudio; vídeo 501; reserva Omni em 401 |
| `freellmapi_router` | 127.0.0.1:3001 e modelo `auto`; 200; 401/500/timeout caindo para o Omni; sem chave não chama; `localhost` recusado |
| `free_router_stack_ui` | botão **Usar pilha gratuita** no navegador: grava os quatro provedores, mostra a ordem e não expõe chave/conta |

Suíte completa: **`108 passaram, 2 skip explícito, 0 falharam (de 110)`**.

## 6) Smoke no PC do usuário (`tools/provider_smoke.mjs`)

Novas linhas: `FreeLLMAPI`, `Cloudflare (imagem)`, `Cloudflare (voz)`. Sem chave/conta elas saem como `sem chave` /
`sem CLOUDFLARE_ACCOUNT_ID` e **nada** é chamado; nenhum valor de chave ou de conta é impresso (só `presente/ausente`).

```powershell
$env:CLOUDFLARE_ACCOUNT_ID='...'; $env:CLOUDFLARE_API_TOKEN='...'
$env:FREELLMAPI_API_KEY='...'
node tools/provider_smoke.mjs
```

## 7) PENDENTE / não inventado

- **Vídeo**: nenhum provedor gratuito válido; composer responde 501 `pending:true` e o roteador não monta rota.
- Voz e vídeo do **Omni** seguem PENDING (sem combo informado).
- Presets/corpo/custo do modo Áudio do Pippit continuam `UNOBSERVED` (agora a rota de estado declara a opção de nuvem).
- Nada de chave/conta foi gravado: nem em `db.json`, nem em teste, nem neste relatório.
