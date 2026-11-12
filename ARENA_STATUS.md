# Arena status — 09/11/2026

Branch: `arena/a14d8a49-pippet-clone` (active). O push dos quatro commits da etapa anterior ocorreu antes da correção do usuário; desde a correção não houve novos pushes. Nenhuma chave, cookie ou token real foi gravado. Não houve acesso ao Pippit real, gasto de crédito, OAuth ou publicação.

## Decisão do usuário e observação humana pendente

O usuário esclareceu que não precisa autorizar ações no Pippit porque o agente não tem acesso à conta logada. **Não acessar nem tentar observar o Pippit real; não voltar a perguntar.** Todas as ações que exigiriam abrir/alterar a conta real — custo do Avatar por duração, exportação do Avatar e respostas reais, SSE/cancelamento remoto, execução/validação de mídia real e presets/custos não visíveis no material — ficam marcadas `PENDENTE DE OBSERVAÇÃO HUMANA` em `CLAUDE.md`. Continuar somente com código/evidência local; quando a evidência faltar, não inventar comportamento.

## Ambiente de testes

- FFmpeg foi instalado sem alterar dependências de produção: `imageio-ffmpeg` (wheel PyPI) em `/tmp/piperline-pytools`; `ffprobe-static` via npm em `/tmp/piperline-tools`. Confirmado: `ffmpeg version n9.0.2...` e `ffprobe version 4.0.2-static`. Os testes recebem os caminhos via `PIPPIT_FFMPEG` e `PIPPIT_FFPROBE`.
- `npm install --prefix notes` concluiu (`acorn`). `local_reconstruction/package.json` agora declara Playwright como dependência de desenvolvimento para os testes.
- `npx playwright install --with-deps chromium` falhou: `apt.debian.org` inacessível. `npx playwright install chromium`, `npx playwright install firefox`, `apt-get install -y chromium` e `apt-get install -y chromium-browser` também falharam (CDNs inacessíveis ou sem permissão dpkg).
- Alternativa funcional, fora do Git: pacote `@sparticuz/chromium` obtido do npm registry em `/tmp/piperline-tools`; binário Chromium 153.0.8010.0 extraído para `/tmp/chromium`. As bibliotecas `libnspr4`, `libnss3` e demais foram extraídas de `al2023.tar.br` do mesmo pacote para `/tmp/al2023/lib`. O Playwright 1.65 executou todos os testes com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib`. O helper reconhece agora o nome `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pedido pelo usuário.
- Os testes Playwright resolvem Chromium e não fazem skip quando o binário executa. `node test/run-all.mjs ui` → **25/25 testes de UI passaram**, 0 skips. O teste `publishing` também usa UI e passou na suíte completa.

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
| `ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `directgen_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `features_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `llm_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `skills_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `providers_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `lote2_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `lote3_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `skills_official_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `publishing` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `fidelity2_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `fidelity3_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |
| `questionnaire` | Defeito de portabilidade: `.pathname.replace(/^\//, '')` removia a raiz `/` em Linux | Corrigido para `fileURLToPath`; passou usando o schema existente. |
| `agent_contract` | Defeito de portabilidade pelo mesmo cálculo de caminho | Corrigido para `fileURLToPath`; passou usando a fixture existente. |
| `talkingphoto_ui` | Caminho absoluto do Playwright/Chrome do Windows/REA | Passou com Chromium 153 extraído do pacote npm temporário; teste de UI executado. |

Falha adicional encontrada ao habilitar FFmpeg: `talkingphoto_provider` assumia que MP3 codificado como 3,00 s seria medido exatamente em 3,00 s; ffprobe reporta a duração real de 3,03 s. Corrigido o assert para conferir o orçamento a partir da duração medida. Passou.

## Última suíte (09/11/2026, Chromium ativo)

Com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib`, `PIPPIT_LLM=off` e FFmpeg/ffprobe configurados: **59 passaram, 2 SKIP explícitos, 0 falharam (61 no total)**. Os **25 testes do filtro `ui` passaram (25/25)** e o teste de UI `publishing` também passou; total de UI exercitado na suíte: **26**. Nenhum teste de UI ficou em skip.

Os 2 skips são exclusivamente por arquivos de evidência que não existem neste checkout (conforme restrição do usuário; não remover nem mascarar):
1. `pageview`: `captures/scenario_video-agent_bodies.json`.
2. `parity`: `captures/auth/cdp/oauth_redirect/2_pagina_0.txt` e `captures/auth/cdp/editor_right_panel/5_1_Básico.txt`.

Falhas corrigidas ao tirar os testes de UI do skip: `fidelity2_ui` agora aciona o drawer de avatar por click DOM (`HTMLElement.click`, evitando interceptação pelo canvas); `fidelity3_ui` usa `fileURLToPath`, espera a atualização do estilo e aguarda resposta ao desfavoritar; `talkingphoto_ui` confere orçamento calculado pela duração efetiva do MP3; `publishing` espera o salvamento assíncrono do rascunho. `marketing_entities_ui` cobre busca, ordenação, criação de Produto via ativo, seleção de Personagem, recomendado indisponível e remoção. `chat_history_ui` passou em Chromium real.

## Trabalho nesta continuação

- Telas locais com testes próprios: Templates (8 nomes confirmados; 2 desconhecidos e prompts não inventados); Settings internos (idioma/aparência, opção de watermark inerte/UNOBSERVED); detalhes e criação manual de Skills; menu `…` de avatar próprio como placeholder explícito (ações desconhecidas); Omni e Inspiration como visões estáticas/UNOBSERVED sem operações; notificações; FAQ de preços com 6 perguntas, respostas marcadas UNOBSERVED; dropdowns do composer; modo Áudio com presets/custos não inventados.
- Seletor local Produto/Personagem e histórico local de chats também têm testes de UI que passaram.
- Roteador gratuito permanece isolado em `src/free_router.mjs`, com adaptadores falsos; nenhuma chamada real.
- `generation_task_list`/`subscribe_run`/`cancel_run` remotos, custo/exportação/respostas reais do Avatar e detalhes não capturados seguem **PENDENTE DE OBSERVAÇÃO HUMANA**.
