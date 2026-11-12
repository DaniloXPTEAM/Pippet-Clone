# PASSO A PASSO — smoke dos provedores (Claude)

Roteador gratuito: FreeLLMAPI (texto principal), Cloudflare Workers AI (imagem e voz), NVIDIA NIM, Gemini (AI Studio), Ollama (local e Cloud), Omni Router (serviço local do usuário) e **NovAI** (vídeo `cogvideox-flash`, imagem `cogview-3-flash`, texto `glm-4.7-flash`). Nenhuma chave ou conta é lida de arquivo nem impressa.

### Voz local (SAPI) — padrão da instalação

1. O nó de **Áudio** do Canvas, a **Foto falante** (prévia local) e o modo **Áudio** do composer usam a voz do Windows (**SAPI**) por padrão: não precisam de provedor configurado e nunca debitam crédito.
2. O **provedor de voz do usuário** é opção: em Configurações → Assistente de IA → Provedores configure o áudio (endpoint local + "Autorizo chamadas pagas") e peça explicitamente (`voiceSource:"cloud"` / seletor de voz do painel). Sem SAPI na máquina, ele é usado como alternativa; pedir SAPI ausente **não** cai para nuvem em silêncio.
3. `GET /api/tts-voices` informa `sapiAvailable`, `defaultEngine`, vozes instaladas e o motivo. Smoke/testes: `node test/voice_default.test.mjs` (regra pura + provedor falso em 127.0.0.1).

### Cloudflare Workers AI (imagem + voz na nuvem)

1. Exporte **só na sessão** (nunca em arquivo, relatório ou Drive):
   - PowerShell: `$env:CLOUDFLARE_ACCOUNT_ID='...'; $env:CLOUDFLARE_API_TOKEN='...'`
   - Opcionais: `CLOUDFLARE_AI_BASE_URL` (padrão `https://api.cloudflare.com/client/v4/accounts/{account}/ai/run`), `CLOUDFLARE_IMAGE_MODEL` (padrão `@cf/black-forest-labs/flux-1-schnell`), `CLOUDFLARE_AUDIO_MODEL` (padrão `@cf/myshell-ai/melotts`), `CLOUDFLARE_TIMEOUT_MS` (padrão 60000), `CLOUDFLARE_DAILY_LIMIT` (padrão 50 tentativas/dia no cap local).
2. Na UI: Configurações → Assistente de IA (LLM) → **Usar pilha gratuita (FreeLLMAPI + Cloudflare + Omni + NVIDIA)**. Grava base com `{account}` (a conta **não** é gravada), modelos e a ordem; responde só `hasKey`/`hasAccount`.
3. O que é chamado: `POST <base>/<modelo>` com `Authorization: Bearer <token>`.
   - Imagem: `{prompt, steps:4}` → `result.image` (JPEG base64). Medido pelo usuário: ~2,5 s.
   - Voz: `{prompt, lang:'en'}` → `result.audio` (WAV base64, **não MP3**). Medido: ~1 s.
4. Ordem da imagem: **Cloudflare flux-1-schnell → Omni flux.2-klein**. Texto: **FreeLLMAPI (`auto`) → Omni → NVIDIA**. Voz: **SAPI é o padrão**; a Cloudflare só entra com `voiceSource:"cloud"` (nó de Áudio e composer de Áudio). Vídeo: **NovAI `cogvideox-flash` (5 s) em fila** — ver a seção NovAI abaixo.
5. Smoke com as variáveis: `node tools/provider_smoke.mjs` — linhas `Cloudflare (imagem)` e `Cloudflare (voz)`; sem `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` saem como `sem …` e nada é chamado. Testes sem rede: `node local_reconstruction/test/cloudflare_router.test.mjs` e `node local_reconstruction/test/cloudflare_routes.test.mjs` (servidor falso: 200, 400 com `success:false`, 401, 402, 429, timeout, resposta sem bytes, redação de conta/token).

### FreeLLMAPI (texto principal, 127.0.0.1:3001)

1. Exporte `FREELLMAPI_API_KEY` só na sessão; opcionais `FREELLMAPI_BASE_URL` (padrão `http://127.0.0.1:3001/v1` — **use 127.0.0.1, `localhost` pode travar por IPv6**) e `FREELLMAPI_MODEL` (padrão `auto`).
2. Ele é o **primeiro** do texto no roteador; Omni Router e NVIDIA são as reservas. Sem a chave, a rota é pulada com motivo e a reserva assume (nada é chamado sem chave).
3. Teste sem rede: `node local_reconstruction/test/freellmapi_router.test.mjs` (200, 401, 500 e timeout caindo para o Omni; `localhost` recusado).

### NovAI (aiapi-pro.com) — vídeo gratuito, imagem e texto de reserva

1. Exporte **só na sessão** (nunca em arquivo, relatório, teste, log ou Drive):
   - PowerShell: `$env:NOVAI_API_KEY='...'`
   - Opcionais: `NOVAI_BASE_URL` (padrão `https://aiapi-pro.com/v1`), `NOVAI_VIDEO_MODEL` (`cogvideox-flash`), `NOVAI_IMAGE_MODEL` (`cogview-3-flash`), `NOVAI_MODEL` (`glm-4.7-flash`), `NOVAI_POLL_MS` (padrão `12000`), `NOVAI_TIMEOUT_MS` (padrão `240000`; o piso é 180000), `NOVAI_DAILY_LIMIT` (padrão 5, cap local).
2. Na UI: Configurações → Assistente de IA (LLM) → **Usar pilha gratuita** (o preset passou a incluir a NovAI) e confira `video` na resposta: `provider=novai/cogvideox-flash`, `seconds=5`, `pollMs=12000`, `dailyLimit=5`.
3. O que é chamado (vídeo, o que faltava):
   - `POST /video/generations` com `{model:'cogvideox-flash', prompt, duration:5}` → `{id, status:'queued'}`.
   - `GET /video/generations/{id}?model=cogvideox-flash` **a cada 12 s** até `SUCCESS`/`COMPLETED` (`PROCESSING`/`QUEUED`/`PENDING`/`RUNNING` = em andamento; `FAILED`/`ERROR`/`CANCELED`/`MODERATION` = fim com erro; status desconhecido **não** é sucesso).
   - O MP4 vem em `video_result[0].url` **ou** `video_url` e **só** é baixado de `https` em `aiapi-pro.com` ou `*.ufileos.com` (a URL final depois de redirecionamentos também é conferida).
   - Medição do usuário: 72 s, H.264, 1792×1024, 5 s, 1,5 MB. **Teto de 5 gerações/dia**; **429 = cota ou taxa** → o provedor fica indisponível por 1 h e **não é repetido**.
4. Onde aparece: **nó de Vídeo** do Canvas (202 + run, MP4 no nó), **composer em modo Vídeo** (fila com progresso/posição) e **Foto falante** → *Gerar clipe de IA (NovAI, 5 s)*. A foto falante **não tem lip-sync** nesse caminho: a API aceita só prompt, então foto e áudio não são enviados (a tela avisa).
5. Smoke com as variáveis: `node tools/provider_smoke.mjs` — linhas `NovAI (texto)`, `NovAI (imagem)` e `NovAI (vídeo 5 s)`. **A linha de vídeo gera um vídeo de verdade e consome 1 das 5 do dia**; se não quiser gastar, rode sem `NOVAI_API_KEY` (as três saem como `skip`/`sem chave` e nada é chamado) ou apague a linha de vídeo do `providerSpecs` localmente.
6. Testes sem rede (recomendado): `node local_reconstruction/test/novai_router.test.mjs` e `node local_reconstruction/test/novai_video_ui.test.mjs` (servidor falso em 127.0.0.1: queued→processing→success, 401, 429 sem repetir, status inesperado, URL fora da lista, timeout, fila de 1, cap de 5/dia).

### Omni Router (127.0.0.1:20128)

1. Suba o Omni Router no PC e exporte a chave **só na sessão**: PowerShell `$env:OMNIROUTER_API_KEY='...'`. Opcionais: `OMNIROUTER_BASE_URL` (padrão `http://127.0.0.1:20128/v1` — **use 127.0.0.1, `localhost` pode travar por IPv6**), `OMNIROUTER_MODEL` (padrão `auto/best-free`), `OMNIROUTER_IMAGE_MODEL` (padrão `nvidia/black-forest-labs/flux.2-klein-4b`), `OMNIROUTER_TIMEOUT_MS` (padrão 180000; nunca abaixo de 120000 nos testes).
2. Na UI: Configurações → Assistente de IA (LLM) → Roteador de modelos gratuitos → **Usar Omni Router (127.0.0.1:20128)**. Isso grava base, modelos e timeout (sem chave). A chave fica no ambiente ou no campo de segredo em memória.
3. Medições do usuário: texto ~21 s; imagem 6–25 s (JPEG 1024×1024 em `data[0].b64_json`). O roteador usa `POST /chat/completions` e `POST /images/generations`.
4. **INDISPONÍVEL (não roteado, sem derrubar o roteador)**: `nvidia/flux.1-schnell` (timeout), `huggingface/FLUX.1-schnell` (403), `gemini/imagen-4.0` (erro), `huggingface/Kokoro-82M` (500), `veo-free/veo` (timeout 150 s).
5. **Vídeo e voz: PENDING no Omni** — o Omni não tem combo confirmado de vídeo/voz; o vídeo do app agora vai pela NovAI (seção acima) e a voz pelo SAPI/Cloudflare.
6. Smoke: `node tools/provider_smoke.mjs` inclui as linhas `Omni Router` (texto) e `Omni Router (imagem)`; sem `OMNIROUTER_API_KEY` elas saem como `chave ausente` e nada é chamado. Testes sem rede: `node local_reconstruction/test/omni_router.test.mjs` e `node local_reconstruction/test/omni_router_ui.test.mjs` (servidor falso).

1. Windows/PowerShell, com a(s) chave(s) só na sessão:
   - `$env:NVIDIA_API_KEY='...'; $env:GEMINI_API_KEY='...'; $env:OLLAMA_API_KEY='...'; node tools/provider_smoke.mjs`
   - Sem chave, o provedor que exige chave sai como `chave ausente` e **nada** é chamado; o Ollama local (127.0.0.1:11434) é chamado sem chave.
2. Saída por provedor: `provedor=… | chave presente/ausente | HTTP=… | tempo=…ms | modelo=… | tentativas=… | resposta=…` (resposta truncada em 80 caracteres), e uma última linha `resumo: …` com o estado de cada provedor (`ok`, `modelo-indisponivel`, `indisponivel-tipo-de-chave`, `indisponivel-cota`, `indisponivel-timeout`, `skip`).
3. Variáveis (todas opcionais; os padrões estão em `tools/provider_smoke.mjs` e em `local_reconstruction/src/free_router.mjs`):
   - **NVIDIA**: `NVIDIA_API_KEY`, `NVIDIA_BASE_URL` (padrão `https://integrate.api.nvidia.com/v1`), `NVIDIA_MODEL` (padrão `google/gemma-4-31b-it`), `NVIDIA_TIMEOUT_MS` (padrão 60000 — nunca abaixo de 60 s por padrão). A reserva `minimaxai/minimax-m3.1-flash` continua na lista de candidatos mesmo quando `NVIDIA_MODEL` é definido.
   - **Gemini**: `GEMINI_API_KEY`, `GEMINI_BASE_URL` (padrão `https://generativelanguage.googleapis.com/v1beta`), `GEMINI_MODEL`, `GEMINI_AUTH_MODE` = `x-goog-api-key` (padrão) | `query` (`?key=`) | `bearer`, e `GEMINI_API` = `native` (padrão, `:generateContent`) | `openai` (rota OpenAI-compatível `/openai/chat/completions`). **Chave começando com `AQ.` é válida**: o prefixo não é checado, só o tamanho mínimo.
   - **Ollama**: `OLLAMA_API_KEY` (só para o Cloud), `OLLAMA_BASE_URL` (padrão local `http://127.0.0.1:11434`; `https://ollama.com` ativa o Cloud), `OLLAMA_MODEL`. Rota nativa `/api/chat` por padrão; base terminando em `/v1` usa `/v1/chat/completions`.
4. O que o roteador faz quando um provedor falha:
   - HTTP **404 "Function not found"** ou **410**: o **modelo** é marcado indisponível (cache de 24 h) e o próximo modelo candidato é tentado — o modelo morto nunca é repetido.
   - HTTP **401** (inclusive `ACCESS_TOKEN_TYPE_UNSUPPORTED`), **429** e **timeout**: o **provedor** sai de rotação por um tempo (auth 10 min, cota 60 min, timeout 60 s) e o próximo provedor elegível assume. A tarefa só falha se nenhum provedor concluir — e nunca usa fallback pago.
7. Suíte: `cd local_reconstruction; node test/run-all.mjs` (todos, **116 testes: 114 ok + 2 skips**) ou `node test/run-all.mjs provider_smoke` / `free_router_fallback` / `omni_router` / `novai_router` (só os de roteador).
8. Testar sem gastar cota nem tocar a rede real: `node local_reconstruction/test/provider_smoke.test.mjs` (servidor falso: 200, 404, 410, 401, 429, timeout, chave ausente) e `node local_reconstruction/test/free_router_fallback.test.mjs` (troca de modelo, troca de provedor, cache de disponibilidade, modos de autenticação).
9. Importar a branch: `git fetch origin arena/a14d8a49-pippet-clone; git switch arena/a14d8a49-pippet-clone`.
10. Recuperar tudo depois de um reset do sandbox, em 1 comando: `./local_reconstruction/recuperar_ambiente.sh` (ou `... --bundle rodada6.bundle`, restaurando o código baixado da pasta do Drive `1FKoC6t1gcXjI4zSc4vqC_M_dx_bMDZT6`). O script instala as dependências em `local_reconstruction/.deps/node_modules` (fora da árvore versionada; `node_modules` é só o atalho do ESM), encontra ffmpeg/ffprobe/Chromium, grava `.deps/env.sh` e roda a suíte. Definição e detalhes em `local_reconstruction/README.md`.
11. Configurações > Assistente de IA agora começa pela **tela única de provedores**: 7 provedores com estado (configurado/ausente/indisponível, com motivo e horário de volta), pilha por tipo (texto, imagem, voz, vídeo, transcrição), nomes das variáveis de ambiente e botão **Testar** por provedor. `Testar vídeo` só roda depois da confirmação, porque gasta 1 das 5 gerações gratuitas do dia. Nenhuma chave aparece na tela: só `hasKey`.
