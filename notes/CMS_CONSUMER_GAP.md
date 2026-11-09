# cms_consumer: o que sabemos e o que falta

Fontes usadas: capturas do REA (`captures/scenario_video-agent.json`), a lista `notes/MISSING_NETWORK_ASSETS.csv` (derivada dessas capturas) e o JSON público `pt-BR.a61aa.json`. Nenhum script do cms_consumer foi analisado: **nenhum deles foi baixado**. O REA não tem, nas ferramentas MCP, uma operação para consultar suas capturas salvas; os arquivos foram lidos diretamente (sem Node/Python). Toda função atribuída a um chunk abaixo vem do **nome do arquivo** e das **chaves de tradução**, não do código.

## 1. O que já conseguimos explicar

- **Pertencimento**: 62 URLs únicas sob `/growth/seeyou/cms_consumer/`: 43 scripts, 17 CSS, 1 imagem (ausentes) e o JSON de tradução `pt-BR.a61aa.json` (preservado, 3.119 chaves).
- **Rota**: todas aparecem **somente** em `https://www.pippit.ai/pt-br/tools/video-agent` (captura `scenario_video-agent`). Não apareceram em landing, pricing nem template-studio.
- **Requisições da página** (34 não-asset): documento, `manifest.json`, `GET /api/v1/web-cookie-privacy/config`, `GET …/cms_consumer/upload/locales/pt-BR.a61aa.json`, `GET /lv/v1/event/report`, **`POST /lv/v1/user/web/user_info`** (a única chamada de conta/produto) e o resto é telemetria (Slardar, MCS, Clarity, Bing, GA, DoubleClick).
- **APIs associadas**: só `user_info`, `event/report` e `web-cookie-privacy/config`. **Nenhuma API de geração, modelos ou projetos foi chamada na navegação anônima.**
- **Strings**: 60 chaves `Pippit_agent_*` mostram que a UI do agente vive neste app: caixa de prompt com marcador de posição, botões "criar imagem/vídeo", seletor de modelos e ferramentas, histórico, @menção de mídia enviada, upload com limites (quantidade, tamanho, resolução, duração, "rostos humanos reais não suportados"), agendamento ("receber vídeos em 24 h"), abrir canvas e descrições dos modelos (Seedance 1.0/2.0/2.0 fast, Nano Banana/Pro, Seedream 4.0/4.5/5.0 lite, Sora 2). Mais 239 chaves de consentimento de cookies (`CC_*`).
- **Telas**: `screenshots/04_tools_video-agent_desktop.png` e `_mobile.png`.
- **Fluxos observáveis sem os scripts**: abrir a página, ver a UI do agente (textos e marcadores), consentimento de cookies, chamada `user_info`. O fluxo de geração **não** é observável.

## 2. O que não conseguimos explicar

- O que cada um dos 43 chunks contém (17 deles são numéricos e anônimos).
- Como as rotas internas casam chunks e CSS; qual chunk monta a página.
- A lógica da entrada de criação (validação de upload, seleção de modelo, envio) e qual endpoint recebe o pedido de geração.
- Histórico, canvas, agendamento e @menção: só os textos existem; o comportamento não.
- Quais dos 17 CSS pertencem a quais blocos.

## 3. Arquivos ausentes exatamente necessários

| arquivo | lacuna que fecha |
|---|---|
| `builder-runtime.a49fc417.js` | mapa de chunks do cms_consumer; resolve os 17 numéricos |
| `route-manifest-main.a8e8c072.js` | rota → chunks e CSS |
| `main.e32a6083.js` | entrada do app |
| `byted-image-seeyou-cms-components-components-Pippit-AnyInput.e6734657.js` | entrada de criação (prompt/upload) |
| `$.1928e4ea.js` | rota coringa que renderiza a página por slug |
| `4017.b895d9bb.js` | único chunk numérico fora de `/async/` (núcleo compartilhado) |
| `wrappers-Pippit.e34d2f20.js` | layout da marca |
| `templates-landing-page.fb42b692.js` | composição da página por blocos |

## 4. Menor conjunto a recuperar

**Primeiro 2 arquivos**: `builder-runtime.a49fc417.js` e `route-manifest-main.a8e8c072.js`. Eles dizem quais dos 17 chunks numéricos importam e quais CSS entram, e decidem o resto. Depois, no mínimo `main.e32a6083.js` e o `AnyInput`, e os demais da tabela se os manifestos confirmarem.

Os 17 numéricos, os 12 blocos visuais, as bibliotecas (React, router, polyfill, axios) e os 17 CSS **não** entram agora.
