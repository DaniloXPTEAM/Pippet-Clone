# Arena status — 09/11/2026

Branch: `arena/a14d8a49-pippet-clone` (active). Nenhum push. Nenhuma chave, cookie ou token gravado. Não houve acesso ao Pippit real, gasto de crédito, OAuth ou publicação.

## Decisão do usuário e observação humana pendente

O usuário esclareceu que não precisa autorizar ações no Pippit porque o agente não tem acesso à conta logada. **Não acessar nem tentar observar o Pippit real; não voltar a perguntar.** Todas as ações que exigiriam abrir/alterar a conta real — custo do Avatar por duração, exportação do Avatar e respostas reais, SSE/cancelamento remoto, execução/validação de mídia real e presets/custos não visíveis no material — ficam marcadas `PENDENTE DE OBSERVAÇÃO HUMANA` em `CLAUDE.md`. Continuar somente com código/evidência local; quando a evidência faltar, não inventar comportamento.

## Ambiente de testes

- FFmpeg foi instalado sem alterar dependências de produção: `imageio-ffmpeg` (wheel PyPI) em `/tmp/piperline-pytools`; `ffprobe-static` via npm em `/tmp/piperline-tools`. Confirmado: `ffmpeg version n9.0.2...` e `ffprobe version 4.0.2-static`. Os testes recebem os caminhos via `PIPPIT_FFMPEG` e `PIPPIT_FFPROBE`.
- `npm install --prefix notes` concluiu (`acorn`). `local_reconstruction/package.json` agora declara Playwright como dependência de desenvolvimento para os testes.
- `npx playwright install --with-deps chromium` e `npx playwright install chromium` foram tentados. Downloads de `cdn.playwright.dev` e pacotes Debian de `apt.debian.org` não são acessíveis neste sandbox. Chromium empacotado por npm também não inicializa porque faltam `libnspr4` e `libnss3`, não instaláveis via apt neste ambiente.
- Os testes Playwright agora resolvem Playwright/Chrome sem caminhos de REA/Windows e fazem `SKIP` explícito com motivo quando o browser não é executável. Isso não desabilita os asserts quando o browser estiver instalado.

## Tabela de classificação das 23 falhas originais

| Teste | Classe da falha original | Correção/resultado atual |
|---|---|---|
| `pageview` | Captura REA ausente: `captures/scenario_video-agent_bodies.json` | `SKIP` explícito quando a captura não está no checkout. |
| `skills_official` | FFmpeg ausente (`media.FFMPEG === null`) | FFmpeg/ffprobe instalados fora do Git; passou na suíte. |
| `editor_speed` | FFmpeg ausente | Passou com FFmpeg/ffprobe instalados. |
| `assets_menu` | FFmpeg ausente | Passou com FFmpeg/ffprobe instalados. |
| `editor_canvas` | FFmpeg ausente | Passou com FFmpeg/ffprobe instalados. |
| `workflow_jobs` | FFmpeg ausente | Passou com FFmpeg/ffprobe instalados. |
| `e2e` | FFmpeg ausente | Passou com FFmpeg/ffprobe instalados. |
| `parity` | Caminhos `C:/w/...` e screenshots de captura ausentes | Caminho convertido para raiz do repo; `SKIP` explícito para screenshots ausentes. |
| `ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Resolução portátil via helper; `SKIP` explícito porque Chromium não inicializa neste sandbox. |
| `directgen_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `features_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `llm_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `skills_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `providers_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `lote2_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `lote3_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `skills_official_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `publishing` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem; teste não chama publicação real. |
| `fidelity2_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `fidelity3_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Idem. |
| `questionnaire` | Defeito de portabilidade: `.pathname.replace(/^\//, '')` removia a raiz `/` em Linux | Corrigido para `fileURLToPath`; passou usando o schema existente. |
| `agent_contract` | Defeito de portabilidade pelo mesmo cálculo de caminho | Corrigido para `fileURLToPath`; passou usando a fixture existente. |
| `talkingphoto_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Resolução portátil; `SKIP` explícito porque Chromium não inicializa. |

Falha adicional encontrada ao habilitar FFmpeg: `talkingphoto_provider` assumia que MP3 codificado como 3,00 s seria medido exatamente em 3,00 s; ffprobe reporta a duração real de 3,03 s. Corrigido o assert para conferir o orçamento a partir da duração medida. Passou.

## Última suíte (09/11/2026, após roteador e chat history)

Com `PIPPIT_LLM=off`, FFmpeg e ffprobe instalados: `node local_reconstruction/test/run-all.mjs` → **33 passaram, 16 SKIP explícitos, 0 falharam (49 no total)**. Skips: `pageview`, `parity` e 14 testes de UI, incluindo `chat_history_ui`. Dois skips dependem de arquivos de captura ausentes; os outros 14 precisam de Chromium funcional. O skip não é aprovação de UI. Os testes focados `free_router`, `directgen` e `directgen_http` passaram; no HTTP, o renderer FFmpeg foi exercitado com binário configurado.

## Trabalho nesta continuação

- SSE local e rota de tarefas, com relação run↔tarefa exclusivamente local e backfill de runs preexistentes.
- Marketing: seletor local de Produto/Personagem. Canvas: diálogo `Chat history` com estado vazio observado `No history yet` e navegação só pelos chats locais; há teste UI mas ficou SKIP por Chromium indisponível.
- Roteador grátis isolado em `src/free_router.mjs`, com capacidades por tarefa, preferência de rota, recusa de fallback pago, confirmação da cota cloud, adaptadores OpenAI-compatible/Gemini e fetches falsos; não fez requisições externas.
- `generation_task_list` do Pippit, live `subscribe_run`, estados/reações remotos, custos/exportação/respostas do Avatar e detalhes ausentes de templates continuam `PENDENTE DE OBSERVAÇÃO HUMANA`.

