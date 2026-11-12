# PROGRESSO 2026-11-09 — roteador gratuito com as APIs reais + os 3 testes que falharam

Branch `arena/a14d8a49-pippet-clone`, sem push. Nada de chave em arquivo: todas as chaves entram por variável de ambiente de sessão e nunca são impressas.

## Aviso: o sandbox resetou de novo (2ª vez nesta sessão)

`.git` voltou em `48ca7bb` sem os objetos dos commits anteriores e `node_modules`, Chromium e ffmpeg foram apagados. A **árvore de trabalho sobreviveu intacta**, então ela foi re-registrada num único commit de restauração (`Restore the full reconstruction after the sandbox reset`) sobre a única base viva. O bundle publicado no Drive (`lote4_full_*`) continua com o histórico granular anterior; o histórico local, não. Ferramentas reerguidas: `playwright` + `@sparticuz/chromium` (153.0.0, decomposto em `~/.cache/chromium`, libs `al2023`), ffmpeg do wheel `imageio-ffmpeg` (PyPI) e `ffprobe-static` (npm).

## 1. Roteador gratuito (`local_reconstruction/src/free_router.mjs`)

- **Defaults reais por provedor** (`FREE_PROVIDER_DEFAULTS`, tudo sobrescrevível por env): NVIDIA `https://integrate.api.nvidia.com/v1` + `/chat/completions`, modelo `google/gemma-4-31b-it`, reserva `minimaxai/minimax-m3.1-flash`, timeout 60 s; Gemini `https://generativelanguage.googleapis.com/v1beta` (`:generateContent` e rota OpenAI-compatível), `x-goog-api-key` por padrão; Ollama local `http://127.0.0.1:11434` (`/api/chat`) e Cloud `https://ollama.com` com `OLLAMA_API_KEY`.
- **Lista configurável de modelos candidatos** (`defaultModelCandidates`): o `NVIDIA_MODEL` escolhido entra na frente e a reserva continua na lista.
- **Cache de disponibilidade** (`markUnavailable`/`availabilityOf`/`availabilitySnapshot`/`clearAvailability`): auth 10 min, cota 60 min, timeout 60 s, modelo morto 24 h. O cache nunca bloqueia a tarefa inteira — se tudo estiver marcado, as rotas são tentadas mesmo assim.
- **Classificação de erro** (`classifyFreeRouterError`): 404 "Function not found" e 410 → **modelo** indisponível (troca de modelo, sem repetir); 401/403 — inclusive `ACCESS_TOKEN_TYPE_UNSUPPORTED` → “indisponível (tipo de chave não aceito)” e passa ao próximo provedor; 429 → cota; `TimeoutError` → timeout. Uma falha de um provedor nunca derruba a tarefa se houver outro ativo.
- **Timeout por rota** aplicado no laço (`AbortSignal.timeout` combinado com o sinal de cancelamento do usuário).
- **Gemini**: `GEMINI_AUTH_MODE` = `x-goog-api-key` | `query` (`?key=`) | `bearer`; chave `AQ.` (autorização, desde 28/05/2026) **não** é recusada por prefixo — só tamanho mínimo (`isValidGeminiKeyShape`); rota OpenAI-compatível via `geminiApi: 'openai'`.
- **Ollama**: novo adaptador `ollama` com `/api/chat` (nativo) e `/v1/chat/completions`, chave Cloud opcional (`optionalSecretEnv`); Cloud sem chave e 401 desabilitam o provedor.
- Servidor: `/api/free-router/config` e `/api/free-router/execute` passaram a devolver `availability` e `attempts`; o estado de cada provedor é registrado na `usage`.

## 2. `tools/provider_smoke.mjs`

Reescrito para os padrões reais: `NVIDIA_BASE_URL/NVIDIA_MODEL/NVIDIA_TIMEOUT_MS`, `GEMINI_BASE_URL/GEMINI_MODEL/GEMINI_AUTH_MODE/GEMINI_API`, `OLLAMA_BASE_URL/OLLAMA_MODEL`. Saída por provedor com `tentativas=N` e uma linha final `resumo:`. Antes o script **parava** no primeiro 429; agora marca e segue, como o roteador. Coberto por `test/provider_smoke.test.mjs` (servidor falso: 200, 404, 410, 401, 429, timeout, chave ausente, Cloud sem chave, modos de auth, rota OpenAI) e por `test/free_router_fallback.test.mjs` (11 cenários, incluindo cache e não-repetição do modelo morto).

## 3. Os três testes que falharam no PC do usuário

| Teste | O que falhou lá | O que foi feito | Intermitente? |
|---|---|---|---|
| `editor_audio` | `ffmpeg … libx264: Generic error in an external library` | `media.mjs` agora **sonda o codificador uma vez** (`ensureEncoder`): se o libx264 falhar, cai para **mpeg4 + yuv420p** (com `-q:v` derivado do crf) e guarda o stderr real em `ENCODER_STATE.error`. `-preset/-crf/-tune` só são passados no libx264. A fonte do teste também usa `videoEncodeArgs()`, e a linha final imprime `codec=`. | **Não** — é determinístico naquela máquina (o build de ffmpeg não tem x264 funcional). Aqui passou 3/3 isolado e 3/3 na suíte. Prova do fallback: rodei com um wrapper que recusa `libx264` e o teste passou com `codec=mpeg4 (fallback registrado)`, imprimindo `Error while opening encoder: Generic error in an external library`. |
| `canvas_existing_project_ui` | timeout de 60 s esperando o título salvo | Duas causas atacadas. (a) **UI**: o `change` do `#ttl` podia receber um valor já salvo (re-render atrasado do SSE/refresh) e regravar/reverter o título; agora só uma **digitação real** (evento `input`) autoriza o PATCH, o valor persistido fica em `data-saved` + memória por projeto, e um re-render atrasado não volta ao texto velho. (b) **Teste**: a espera é pelo **evento** `pippit:title-saved` (disparado pela aplicação depois do 200), não por tempo; as demais esperas ganharam diagnóstico (hash, `#cv`, `#ttl`, `#saveState`, texto de `#main`) e falham com o elemento nomeado. | **Sim, no começo**: 1 falha em 7 execuções, exatamente 60 s, na primeira execução "fria" (antes do helper de diagnóstico). Depois disso: **10/10 isolado** e **3/3 na suíte** com 0 falhas. |
| `free_router_ui` | `locator.click` timeout após 30 s | Não reproduzi aqui (3/3 isolado, 3/3 suíte, 1,3 s cada). O caminho que explica o sintoma é **cobertura**: `#toast` é fixo, `z-index:100`, sem `pointer-events:none` — qualquer botão que caia sob a notificação recebe o clique e o Playwright espera para sempre. Corrigido no CSS (`pointer-events:none`) e o teste agora **afirma** isso. O outro suspeito — a página de Settings se re-renderiza 300 ms depois de salvar — foi removido da espera do teste (nada de `waitForTimeout`), e cada clique passou a usar `clickReady()`, que informa qual dos três motivos impediu o clique: *não visível (com a caixa)*, *desabilitado* ou *coberto por `<tag>#id.classe`*. | **Não confirmado como intermitente** aqui; a hipótese da cobertura é a que casa com "timeout de 30 s" e está corrigida e coberta por asserção. |

## 4. Suíte

```
97 passaram, 2 skip explícito, 0 falharam (de 99)
```

- Rodada 3× íntegra: as três rodadas deram o mesmo resultado e os três testes passaram nas três.
- Skips legítimos: `pageview` e `parity` (evidência de captura fora do checkout).
- Saída integral em `mesa_de_operacao/entrega_3/suite_final.txt`.

## 5. O que continua valendo

Nenhuma asserção foi afrouxada: o teste do título ficou **mais** estrito (um único PATCH, valor antigo rejeitado, servidor não regride), o do `free_router_ui` ganhou a asserção do toast, e o `editor_audio` continua medindo áudio/pixel de verdade com ffmpeg.
