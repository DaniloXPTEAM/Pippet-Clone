# Progresso — Omni Router no roteador gratuito (2026-11-09)

## O que foi feito

| Item | Onde | Estado |
| --- | --- | --- |
| Provedor `omni-router` no catálogo (local, `OMNIROUTER_API_KEY`) | `local_reconstruction/src/free_router.mjs` | feito |
| Base **`http://127.0.0.1:20128/v1`**, `localhost` normalizado e recusado na validação | `normalizeLocalBase` / `validateFreeRouterConfig` | feito |
| Texto `auto/best-free` em `POST /chat/completions` com `Authorization: Bearer` | adaptador OpenAI-compatible | feito |
| Imagem `nvidia/black-forest-labs/flux.2-klein-4b` em `POST /images/generations` (`data[0].b64_json`) | adaptador OpenAI-compatible | feito |
| Timeout local **180 s** (>= 120 s exigido) | `FREE_PROVIDER_DEFAULTS['omni-router'].timeoutMs` + `publicRoute` | feito |
| Mime real dos bytes (`sniffImageMime`) → JPEG salvo como `.jpg` | `free_router.mjs` + nó de Imagem + `/api/local-runs` | feito |
| Modelos INDISPONÍVEL sem derrubar o roteador | `OMNI_ROUTER_UNAVAILABLE` + filtro em `routeCandidates` | feito |
| Nó de Imagem do Canvas usando o adaptador | rota `nodes/:id/generate` (mime por bytes) | feito |
| Composer em modo Imagem usando o adaptador | `#send`/`#freeSend` → `POST /api/local-runs {mode}` | feito |
| Vídeo e voz | `POST /api/local-runs` responde **501 PENDING** sem chamar o provedor | **PENDENTE** (combo não informado) |
| Preset na UI + endpoint | `POST /api/free-router/preset/omni`, botão *Usar Omni Router* | feito |
| 401 para falha de autenticação no `/api/free-router/execute` | `app/server.mjs` | feito |
| Smoke com as duas linhas do Omni | `tools/provider_smoke.mjs` (+ teste) | feito |
| Testes novos | `test/omni_router.test.mjs`, `test/omni_router_ui.test.mjs` | feito |

## Modelos marcados INDISPONÍVEL (dados do usuário — não re-testados aqui)

| Modelo | Sintoma medido pelo usuário |
| --- | --- |
| `nvidia/flux.1-schnell` | timeout |
| `huggingface/FLUX.1-schnell` | HTTP 403 |
| `gemini/imagen-4.0` | erro do provedor |
| `huggingface/Kokoro-82M` | HTTP 500 |
| `veo-free/veo` | timeout de 150 s |

Eles ficam fora da rotação; se forem colados na configuração, `planFreeRoutes` não os roteia e o roteador segue com o modelo bom.

## Evidência

- Suíte completa: **`99 passaram, 2 skip explícito, 0 falharam (de 101)`** (`node test/run-all.mjs`).
- `omni_router` e `omni_router_ui` rodados **3× isolados**: 3/3 verdes (servidor falso em 127.0.0.1, nenhuma chamada real, nenhuma chave em arquivo).
- Nenhuma saída de teste/smoke contém `OMNIROUTER_API_KEY` (asserção explícita nos dois testes e no `provider_smoke`).
- Skips continuam legítimos: `pageview` e `parity` (evidência fora do checkout).

## Como usar no PC do usuário

1. Subir o Omni Router (porta 20128) e exportar só na sessão: `$env:OMNIROUTER_API_KEY='...'` (PowerShell).
2. Configurações → Assistente de IA (LLM) → Roteador de modelos gratuitos → **Usar Omni Router (127.0.0.1:20128)**.
3. Composer em modo **Imagem** → `↑` ou **Executar grátis**; nó de Imagem do Canvas também usa o adaptador.
4. Smoke opcional: `node tools/provider_smoke.mjs` (sem chave, as linhas do Omni saem `chave ausente` e nada é chamado).

## PENDENTE / UNOBSERVED

- **Vídeo** e **voz** do Omni: aguardando o combo de modelos confirmado pelo usuário. Nada foi gerado, nada foi simulado; a API responde 501 com `pending: true`.
- Não houve chamada real ao Omni nesta sandbox (sem serviço e sem chave): os números de tempo usados são os do usuário (texto ~21 s, imagem 6–25 s) e aparecem apenas como padrão de timeout.
