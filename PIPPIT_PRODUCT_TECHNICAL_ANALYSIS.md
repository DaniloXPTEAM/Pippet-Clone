# Pippit — Análise técnica do frontend público

**Objetivo:** estudo de produto, benchmarking e planejamento de uma implementação própria (Opportunity).
**Alvo:** `https://www.pippit.ai` (versão pt-BR). **Data:** 16/10/2026.
**Método:** apenas navegação pública normal, **sem login**, sem contornar nada, sem clicar em "Gerar" e **sem enviar nenhuma requisição manual a endpoints**. As ferramentas usadas foram o REA (captura de rede e inventário de scripts), um Chrome headless (screenshots) e leitura do DOM.
**Convenção:** **[Observado]** = visto diretamente. **[Inferência]** = conclusão minha a partir de nomes ou padrões. Nada aqui é código copiado.

---

## 1. Visão geral
- **O que é:** um "agente criativo" de IA para gerar **vídeos e imagens de marketing**. O rodapé diz *"Com tecnologia CapCut, o Pippit AI turbina a sua criação de conteúdo"* **[Observado]**. Tem selo "#1 Product of the Week" do Product Hunt **[Observado]**.
- **Posicionamento:** "gerador de vídeos de IA gratuito" (título da página), voltado a e-commerce, redes sociais e agências **[Observado]**.
- **Ligação com o CapCut:** infraestrutura, login e namespace de API compartilhados com o CapCut (seção 6). Chaves de tradução com prefixo `cc4b` e `rebrand` sugerem que é uma marca nova sobre a base do "CapCut for Business" **[Inferência]**.
- **Modelo de negócio visível:** plano **Grátis + Starter + Plus + Pro**, créditos, fila rápida para assinantes, programa de indicação e de afiliados **[Observado]**.
- **Restrição regional:** há texto de interface dizendo que o Pippit está "temporariamente indisponível nos EUA devido a requisitos de conformidade" **[Observado, nas traduções]**.
- **PWA:** tem `manifest.json` (nome Pippit, tema escuro `#121217`, `start_url` `/home?is_pwa=1…`) **[Observado]**.

## 2. Stack observada
| Camada | Observação | Tipo |
|---|---|---|
| **Framework web** | **Modern.js** (framework React da ByteDance): variáveis `window._MODERNJS_ROUTE_MANIFEST`, `__MODERN_ROUTER_DATA__`, `_ROUTER_DATA`, arquivos `route-manifest-*.js`, `modern-inline.js`, chunks `lib-react/lib-router/lib-polyfill/lib-axios`, `builder-runtime` | Observado (nomes) / Inferência (atribuição) |
| **React** | **19.2.7** na landing; **18.3.1** no app de marketing (preços) | Observado |
| **Roteamento** | `react-router` (versão não extraída) com carregamento de dados por rota | Observado |
| **Renderização** | **SSR com streaming** (script `react-inline` trata marcadores de Suspense) | Inferência |
| **HTTP client** | **axios 1.13.2** (app de marketing) | Observado |
| **Bundler** | Rspack/Webpack-compatível (fábricas de módulo recuperadas pelo REA) | Observado |
| **Apps separados** | (a) `landing_page` (páginas públicas/SEO); (b) `kep` (preços, "marketing-studio"); (c) `cms_consumer` (páginas de ferramentas guiadas por CMS) | Observado |
| **Componentes compartilhados** | `PippitHeader`, `PippitFooter`, `CTABlock`, `CopyrightModal`, `LanguageSelectorModal` carregados sob demanda | Observado (nomes) |
| **i18n** | Arquivo JSON por idioma e app (pt-BR: ~400 KB, **4.201 chaves**), plataforma de textos "Starling" (script `fetch_starling_text` e domínio `starling-normal-sg.capcutapi.com`). **7 idiomas no seletor, mas 28 códigos de idioma no roteador** (seção 14.3) | Observado |
| **Gerenciamento de estado** | Procurei por redux, zustand, mobx, recoil/jotai e react-query nos bundles e **não achei ocorrência**. Não identifiquei a solução (pode estar minificada ou ser nativa do React/Modern.js) | Não identificado |
| **Autenticação (frontend)** | SDK de login carregado sob demanda (`lv-user-login-sdk`). Provedores citados nas traduções: **TikTok, Facebook, Google, e-mail com código, CapCut**. Sondagem de sessão `POST /lv/v1/user/web/user_info` (200 mesmo anônimo) | Observado |
| **Consentimento/privacidade** | `lv-cookie-consent`, configuração em `GET /api/v1/web-cookie-privacy/config`, "TikTok privacy protection framework" (loader `atsx`, runtime `PNS`) | Observado |
| **Analytics e monitoramento** | Google Tag Manager, GA4, DoubleClick, **Bing UET**, **Microsoft Clarity**, monitoramento ByteDance (`monitor_browser`, `monitor_web`), coleta de eventos (`mcs`), **teste A/B** (`abtest_config`), script de **fingerprint** do dispositivo (`uifid-fingerprint-init`, pelo nome) | Observado |
| **Mídia** | CDN de imagens/vídeos da ByteDance (`ibyteimg.com`), vídeos de vitrine com resposta `206` (streaming parcial) | Observado |

## 3. Estrutura do frontend
```
www.pippit.ai  (HTML + manifest + 2 chamadas de API próprias)
   ├─ App "landing_page"   → sf16-ug-neutral.capcutstatic.com/.../seeyou-us/growth/pippit/landing_page/
   │     rotas: main, lv-user-login-sdk, lv_user_info
   ├─ App "kep / marketing-studio" → sf16-web-login-neutral.capcutstatic.com/.../growth/pippit/kep/
   │     rotas: pricing   (chunks: 69, 171, 200, 386, pricing.js, lib-axios)
   ├─ App "cms_consumer" (páginas /tools/*, /models/*, /create/*)  → .../growth/seeyou/cms_consumer/
   ├─ SDKs de terceiros/ByteDance: login, cookie consent, privacy framework, monitor, A/B
   └─ i18n: <idioma>.json carregado por fetch (tiktokcdn.com e capcutstatic.com)
```
- **Divisão em chunks:** bibliotecas (`lib-*`), runtime (`builder-runtime`), módulos numerados e chunks por rota. O manifesto da rota `pricing` lista exatamente os 10 arquivos que ela precisa **[Observado]**.
- **Tamanhos principais (landing):** `771` ≈ 633 KB, `main` ≈ 488 KB, `lib-polyfill` ≈ 231 KB, `lib-react` ≈ 188 KB, `lib-router` ≈ 100 KB.
- **Inventário do REA (landing):** 13 arquivos, 758 itens no inventário, **862 módulos**, 485 mil nós de AST, sem falha de parse. O grafo semântico ficou **parcial** (limite de memória).

## 4. Páginas e rotas públicas
Lista completa em `notes/PAGINAS_PUBLICAS.md` (**55 caminhos únicos de página**). Resumo:
- **Raiz:** `/pt-br/` · `/pt-br/pricing` · `/pt-br/template-studio` ("Estúdio de marketing") · `/pt-br/meet-pippit`.
- **Ferramentas (`/tools/*`):** video-agent, ai-image-generator, ai-design-generator, ai-avatar-generator, ai-talking-photo, ai-video-generator, ai-image-to-video, ai-text-to-video-generator, ugc-content-creator, ai-video-translator, ai-dubbing-video, ai-voice-generator, talking-avatar, custom-avatar, product-showcase-design, ai-background-generator, photo-layout, image-resizer, upscale-image, story-studio, ai-film, ai-movie-maker, 4k-video-maker, cinematic-video-editing, social-media-analytics, schedule-posting, ai-content-creator, social-media-management-tools, marketing-management.
- **Modelos (`/models/*`):** seedance 2.5, seedream (5.0 Pro), sora-2, seedance-ai, nano-banana-pro, veo-3-1, ai-models.
- **Criar (`/create/*`):** short-dramas, ai-script-writer, e-commerce-platform.
- **Recursos (`/resource/*`, `/partners/*`):** help-center, ai-movie-workflow, ai-marketing-agency, powerlabcommunity, 4 histórias de clientes, programa de afiliados.
- **Legais:** `/clause/pippit-privacy-policy`, `/clause/cookies-policy`, `/clause/terms-of-service`.
- **Idiomas:** prefixo `/pt-br/`. O seletor mostra 7 idiomas, mas o código do roteador lista **28 códigos** (seção 14.3).

## 5. Recursos carregados pelo navegador
Contagens por captura (requisições observadas pelo REA):

| Captura | Req. | HTML | JS | CSS | Imagens | Vídeo | Fontes | Manifest | Fetch/XHR/ping |
|---|---|---|---|---|---|---|---|---|---|
| Landing | 105 | 2 | 16 | 1 | 55 | 24 | 2 | 1 | 2 |
| Landing → Preços | 154 | 2 | 34 | 2 | 74 | 24 | 10 | 2 | 4 |
| Estúdio de modelos | 93 | 1 | 39 | 5 | 16 | 0 | 8 | 1 | 21 |
| Agente de vídeo | 164 | 1 | 62 | 18 | 49 | 0 | 1 | 1 | 30 |

- **Fontes:** Instrument Serif (Regular e Italic), em `tiktokcdn.com`.
- **Manifest:** `/manifest.json` (PWA).
- **Arquivos de tradução:** `pt-BR.89180.json` (≈400 KB) e `pt-BR.a61aa.json` (app CMS, ≈337 KB, 3.119 chaves; visto na rede e **baixado depois** para `scripts/raw/` — o servidor informa `Last-Modified` de 16/10/2026, então pode diferir da versão da captura).
- **JSON públicos:** tradução, manifest, `web-cookie-privacy/config`, `browser-settings` de monitoramento.
- **Arquivos salvos:** 37 estáticos públicos (≈5 MB) em `scripts/raw/`, mais 3 capturas em `captures/` (a primeira, `scenario_multi_pages`, está marcada como **incompleta** pelo REA). Das 293 URLs únicas vistas nas capturas, **só 37 foram salvas**; as demais estão em `notes/MISSING_NETWORK_ASSETS.md`.
- **Vídeos de vitrine:** 24 em `ibyteimg.com`, entregues em partes (`206`).

## 6. Domínios externos
| Domínio | Papel observado |
|---|---|
| `www.pippit.ai` | HTML, manifest e 2 chamadas de API próprias (`/lv/v1/…` e `/api/v1/…`) |
| `sf16-ug-neutral.capcutstatic.com` | JS/CSS do app da landing |
| `sf16-web-login-neutral.capcutstatic.com` | JS/CSS do app de marketing, login SDK, privacidade, CMS |
| `sf16-web-tos-buz.capcutstatic.com`, `…capcutcdn-us.com` | logos, favicons, fontes (`cc4b_web`) |
| `sf16-sg.tiktokcdn.com`, `p16-common-sign.tiktokcdn.com` | fontes, traduções, favicons, imagens assinadas |
| `p16-seeyou-sg.ibyteimg.com` | imagens e vídeos de vitrine (maior volume) |
| `sf16-website-login.neutral.ttwstatic.com` | estáticos de login |
| `mon-sg.capcutapi.com`, `mon.tiktokv.com` | monitoramento de erros e desempenho |
| `mcs-normal-sg.capcutapi.com` | coleta de eventos (`/list`) |
| `vmweb-normal-sg.capcutapi.com` | configuração de teste A/B |
| `edit-api-sg.capcut.com` | relatório de eventos (`/lv/v1/event/report`) |
| `www.googletagmanager.com`, `analytics.google.com`, `stats.g.doubleclick.net` | Google (GTM, GA4, DoubleClick) |
| `bat.bing.com`, `z.clarity.ms`, `k.clarity.ms` | Bing UET e Microsoft Clarity |

## 7. Chamadas de rede observadas (dinâmicas)
Só o que o navegador chama sozinho em páginas públicas. **Nenhuma foi repetida à mão.**

| Método | Domínio | Caminho | Tipo | Função aparente | Status |
|---|---|---|---|---|---|
| POST | www.pippit.ai | `/lv/v1/user/web/user_info` | fetch | sondagem de sessão/usuário | 200 |
| GET | www.pippit.ai | `/api/v1/web-cookie-privacy/config` | xhr | configuração do banner de cookies | 200 |
| GET | sf16-web-login-neutral.capcutstatic.com | `…/kep/upload/locales/pt-BR.*.json` | fetch | tradução | 200 |
| GET | sf16-sg.tiktokcdn.com | `…/seeyoujs/i18n/…/pt-BR.*.json` | fetch | tradução | 200 |
| POST | vmweb-normal-sg.capcutapi.com | `/service/2/abtest_config/` | xhr | atribuição de teste A/B | 200 |
| POST | mcs-normal-sg.capcutapi.com | `/list` | xhr | coleta de eventos de analytics | 200 |
| GET | edit-api-sg.capcut.com | `/lv/v1/event/report` | fetch | relatório de evento | 200 |
| GET | mon-sg.capcutapi.com / mon.tiktokv.com | `/monitor_web/settings/browser-settings` | xhr | configuração do monitoramento | 200 |
| POST | mon-sg.capcutapi.com / mon.tiktokv.com | `/monitor_browser/collect/batch/` (e `/security/`) | ping/fetch | envio de métricas e erros | 204 |
| POST | analytics.google.com | `/g/collect` | fetch | GA4 | 204 |
| POST | stats.g.doubleclick.net | `/g/collect` | ping | DoubleClick | 204 |
| POST | bat.bing.com | `/actionp/0` | ping | Bing UET | 204 |
| POST | z.clarity.ms / k.clarity.ms | `/collect` | xhr | Microsoft Clarity | 204 |

- **Sem WebSocket** e **sem worker** nas páginas capturadas.
- **Nenhuma chamada de geração, upload, projeto ou exportação** aparece nas páginas públicas.
- Catálogo completo (257 linhas) em `notes/network_catalog_pages.csv` e `notes/network_catalog.csv`.

## 8. Funcionalidades identificadas
Origem: menus, páginas de ferramenta, textos da interface (arquivo de tradução). O que exige login está marcado **(referência no frontend)**.

| Área | O que foi visto |
|---|---|
| **Agente de vídeo** | Entrada por **prompt, link, mídia e documento**; modos "Agent" e "Lite" (mais rápido); progresso em %; limites de **imagem < 20 MB e vídeo < 50 MB** (referência) |
| **Agente de imagem** | Geração de imagem com modelo "GPT Image 2"; botão **converter em vídeo**; editor com download (formato e tamanho) (referência) |
| **Estúdio de marketing** | Modelos de roteiro (ex.: "Teste da prateleira secreta"), **upload de imagem do personagem**, campo "Qual é a história?", configuração de geração (modelo e idioma), botão Gerar **[Observado na página pública]** |
| **Gerar vídeo por texto, imagem, UGC** | Páginas `ai-video-generator`, `image-to-video`, `text-to-video`, `ugc-content-creator` |
| **Tradução e dublagem de vídeo, voz de IA** | Páginas `ai-video-translator`, `ai-dubbing-video`, `ai-voice-generator` |
| **Avatares e foto falante** | Avatar digital e **personalizado** (a partir de foto/vídeo); foto falante com áudio (mp3/wma/flac) ou vídeo de até 17 s (referência) |
| **Showcase de produto / e-commerce** | Gera vídeos e imagens de produto, com locução e declaração de que o usuário é dono da mídia (referência) |
| **Design e imagem** | Design de IA, plano de fundo, layout de fotos, redimensionar, ampliar (upscale) |
| **Estúdio de histórias** | Roteiro de IA, drama curto, filme de IA, storyboard (13 chaves), fluxo de trabalho de filme |
| **Chat de edição ("sandbox")** | Pré-visualizar, gerar novamente, **renderizar o vídeo completo**, mencionar item no prompt (referência) |
| **Catálogo de modelos** | Seedance 2/2.5 (Dreamina), Seedream 5.0 Pro, Sora 2, Veo 3.1, Nano Banana Pro, GPT Image 2, MiniMax H3 |
| **Créditos e planos** | Grátis, Starter, Plus, Pro; mensal/anual; **créditos diários grátis**, **200 créditos de boas-vindas**, créditos comprados válidos 2 anos e **não reembolsáveis**; expiração de créditos |
| **Fila** | Fila comum com espera estimada e posição (n/total) e **"fila rápida"** para assinantes |
| **Crescimento** | Indicação de amigos (dia grátis + créditos), programa de afiliados, histórias de clientes |
| **Publicação e analytics** | Publicar no **TikTok, Facebook, YouTube**; agendar por dia da semana; painel de análise de dados (referência) |
| **Espaço e equipe** | Workspace, convite, limite de armazenamento e upgrade de espaço (referência) |
| **Conformidade** | Rótulo de conteúdo gerado por IA, declaração de direitos, conteúdo de marca no TikTok, bloqueio regional (EUA), exclusão de conta |

## 9. Interface (screenshots em `screenshots/`)
**Estrutura global.** Faixa de aviso no topo (promoção do Seedance 2.5, com fechar) → cabeçalho fixo: logo, **Início, Soluções▾, Produtos▾, Modelos, Preços, Seedance 2.5**, seletor de idioma, **Login**, botão **Começar gratuitamente** → conteúdo → rodapé em 5 colunas (Soluções, IA, Criar, Recursos, redes sociais) e links legais. Tema escuro na landing e no estúdio; claro (lilás) nas páginas de ferramenta.

| Página | Organização |
|---|---|
| **Landing** | Título "Pippit AI" + **caixa de prompt central** (placeholder rotativo, botão **+** de upload, seletor **Modelo**, alternância **Vídeo/Imagem**, **Gerar**) → "Sem ideia? Experimente as seguintes ideias" (5 cartões) → barra lateral de pontos → seções "Qualquer coisa em vídeo / Vídeo de referência / Tradução de vídeo", "Agente de imagem" (Eficiência, Variedade, Criatividade, estilos), avatares, foto falante → FAQ (5 perguntas) → CTA final |
| **Preços** | Alternância **Mensal/Anual** → 4 cartões (Grátis, Starter, Plus, Pro; o Pro tem **controle deslizante de créditos**) → tabela "Detalhes do plano" → "Por que escolher o Pippit" → depoimentos em carrossel → FAQ (6) → CTA |
| **Estúdio de marketing** | 3 colunas: **lista de 10 modelos** à esquerda, **prévia vertical em vídeo** no centro, **formulário** à direita (upload do personagem, história, configurações, Gerar) |
| **Agente de vídeo** | Breadcrumb → título → **caixa de prompt** com seletor de modo ("Pippit Standard") e chips **Link / Mídia / Documento** → chips de sugestão |
| **Demais ferramentas** | Mesmo padrão de página de SEO: título, prompt/CTA, exemplos, FAQ, rodapé |

Preços vistos no momento (BRL, Brasil, lidos do screenshot; conferir): Starter ≈ 513/ano, Plus ≈ 1.252/ano, Pro ≈ 11.180/ano, com cerca de 1.575, 3.885 e 35.500 créditos por mês.

**Fluxo de navegação [Inferência]:** anúncio/SEO → página de ferramenta ou landing → escreve o prompt → **Gerar** → pede login (TikTok, Facebook, Google, e-mail ou CapCut) → ganha 200 créditos → app de criação → fila → resultado → editar no chat → exportar ou publicar.

## 10. Dependências aparentes
Modern.js, React 18/19, react-router, axios, plataforma de i18n "Starling", SDKs de login e consentimento da ByteDance, TikTok privacy framework, monitoramento ByteDance, Google (GTM/GA4/DoubleClick), Bing UET, Microsoft Clarity, CDN da ByteDance, fonte Instrument Serif, e provedores de modelo de geração (Seedance, Seedream, Sora, Veo, Nano Banana, GPT Image, MiniMax) **[o catálogo é Observado; de onde vem cada modelo é Inferência]**.

## 11. Arquitetura provável do produto [Inferência]
- **Frontend** em vários apps Modern.js sobre CDN, com SEO por SSR e conteúdo guiado por CMS.
- **Gateway próprio** (`www.pippit.ai/lv/v1/*` e `/api/v1/*`), no mesmo namespace `lv` da API do CapCut (`edit-api-sg.capcut.com/lv/v1/*`): **identidade e backend compartilhados com o CapCut**.
- **Geração assíncrona:** a interface mostra progresso, posição na fila e tempo estimado, o que indica **fila de jobs** com prioridade (comum x rápida) e **render final separado** da prévia.
- **Créditos** como ledger (diário, bônus, comprado, expiração).
- **Armazenamento de mídia** por espaço de trabalho, com cotas.
- **Orquestração de vários modelos** de geração por tipo (vídeo, imagem, voz), escolhidos pelo usuário ou automaticamente.
- **Integrações de publicação** (TikTok, Facebook, YouTube) e **conformidade** (marca d'água/rótulo de IA, bloqueio regional, consentimento).
- **Experimentação e observabilidade** pesadas (A/B, analytics, gravação de sessão).

## 12. Limitações da análise
1. **Só o frontend público.** Backend, modelos, filas e armazenamento **não são observáveis** por aqui; tudo na seção 11 é hipótese.
2. **Sem login:** tudo que exige conta foi apenas **registrado como referência** (principalmente pelos textos de tradução). O fluxo pós-login é **inferido**.
3. **Não** cliquei em "Gerar", não preenchi formulários e **não abri o modal de login** (a tentativa nem chegou a abrir no tamanho de janela usado).
4. **Cobertura de rede:** a 1ª captura estourou o limite de eventos do REA (1.326 descartados). Refiz estúdio e agente de vídeo em capturas separadas; as outras páginas **não** tiveram rede capturada.
5. **JavaScript:** o REA exportou só scripts pequenos (limite de 64 KiB); os bundles principais foram salvos a partir dos mesmos endereços públicos que o navegador carrega, e **os 11 arquivos que o REA exportou têm hash idêntico aos baixados**. **Todos os 31 scripts foram lidos por inteiro com um parser (1.180.685 nós de AST, 0 erros)**: ver seção 14. O **grafo semântico do REA** está completo em **24 dos 31 arquivos**: o REA guarda cada análise na memória da sessão e o orçamento encolhe a cada chamada (731 MB → ~285 MB), e a máquina tem poucos GB livres. Status por arquivo e como retomar em `notes/REA_GRAFO_STATUS.md`. Código dinâmico continua sendo "fronteira desconhecida" em qualquer análise estática.
6. **Mapas de código (source maps):** não foram buscados.
7. **Screenshots (desktop, 1440 px):** 14 páginas; **11 são de página inteira** (de 1.633 a 11.621 px de altura) e **3 mostram só a tela inicial (900 px)**: `09_models_ai-models`, `10_models_seedance-2-5` e `12_tools_story-studio` (essas páginas travaram o navegador headless em duas tentativas). **Celular (390 px): 4 páginas** (landing, preços, estúdio, agente de vídeo); a da landing (874 px) e a do agente de vídeo (844 px) ficaram só com a tela inicial. **Faltam** `meet-pippit` e `ai-video-generator`.
8. **Idioma e região:** só pt-BR a partir do Brasil. Preços, textos e bloqueios podem variar.
9. **Atenção legal:** os termos de uso do Pippit podem restringir uso automatizado ou engenharia reversa. Esta análise ficou em navegação pública comum; **confirme os termos** antes de reutilizar o material.
10. Todo material salvo em `scripts/raw/` é **cópia de arquivos públicos para estudo local**. **Não os redistribua e não os use no produto.**
11. **Os 31 scripts analisados são os que foram baixados, não todos os que as páginas carregam.** As capturas mostram **63 scripts a mais** que não foram salvos (chunks assíncronos do app `kep`, todo o app `cms_consumer` da página do agente de vídeo, SDKs de monitoramento), além de 21 CSS e 14 fontes; ver `notes/MISSING_NETWORK_ASSETS.md`. Conclusões sobre o código cobrem só o conjunto salvo.
12. **Duas contagens de nós:** a leitura por AST (acorn) soma 1.180.685 nós; o REA reporta `visited_ast_nodes` por outra contagem (ex.: `uifid` 97.973 vs 97.831). Não são comparáveis nó a nó.

## 13. Arquivos desta análise
| Pasta/arquivo | Conteúdo |
|---|---|
| `PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md` | este relatório |
| `OPPORTUNITY_IMPLEMENTATION_BLUEPRINT.md` | requisitos independentes para a solução própria |
| `screenshots/` | páginas públicas, desktop e celular |
| `captures/` | 3 capturas completas do REA (JSON) |
| `scripts/raw/` | 37 arquivos estáticos públicos (31 JS, 2 CSS, 4 JSON); as páginas carregam ~228 ativos a mais que não foram salvos (`notes/MISSING_NETWORK_ASSETS.md`) |
| `scripts/export/` | exportação do REA (arquivos pequenos e manifesto) |
| `scripts/split/` | 5 scripts grandes divididos por módulo (`lib-polyfill` x2, `uifid`, `771`, `69`), mais divisões auxiliares de tentativas anteriores; índice em `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md` |
| `notes/ast_inventory/` | inventário por AST de cada um dos 31 scripts (`*.js.json`), `notes/ast_inventory/_resumo.json` e `notes/ast_inventory/_consolidado.txt` |
| `notes/REA_GRAFO_STATUS.md` | status do grafo do REA por arquivo e como retomar |
| `notes/VERIFICACAO_INTEGRIDADE.txt` | resultado da conferência de integridade do pacote |
| `notes/` | catálogo de páginas, catálogo de rede (CSV), estrutura de UI por página (`notes/pages/*.json`) e scripts usados |

---

## 14. Leitura completa dos scripts públicos (por AST)
**Escopo:** os **31 scripts** salvos em `scripts/raw/` foram percorridos **nó a nó** com um parser (acorn 8.19): **1.180.685 nós, 0 erros de parse**. Isso também prova que **nenhum arquivo está truncado**. Nada foi executado. Strings com cara de segredo (chave, token, senha) **não foram gravadas** (apenas contadas). Dados por arquivo: `notes/ast_inventory/`.

| Maiores arquivos | Nós de AST | Módulos |
|---|---|---|
| landing `771` | 198.211 | 163 |
| kep `69` | 158.362 | 108 |
| `uifid-fingerprint-init` | 97.973 | 218 |
| `lib-polyfill` (2 cópias) | ~92.000 cada | 659 e 680 |
| landing `main` | 86.607 | 25 |
| `lv-cookie-consent` | 65.385 | 10 |
| `lib-react` (landing / kep) | 63.365 / 46.553 | 15 / 12 |
| privacy loader `index.js` | 39.896 | 8 |
| `200`, `core`, `lib-router`, `pricing`, `lib-axios`, `bat` e demais | 2.000 a 35.000 | — |

### 14.1 Caminhos de API presentes no código do cliente
São textos que existem nos scripts. **Quase todos não apareceram no tráfego das páginas anônimas** (podem ser chamados só depois do login ou de uma interação). **Nenhum foi chamado à mão.**

| Caminho | App | Função aparente | Visto na rede? |
|---|---|---|---|
| `/api/biz/v1/agent/get_available_model_list` | landing | lista de modelos disponíveis para o agente | não |
| `/api/biz/v1/user/click_id` | landing | atribuição de clique de anúncio | não |
| `/commerce/v1/subscription/cc_price_list` · `/template/api/subscribe/cc-price-list` · `…/subscribe/detail` · `…/subscribe/location` · `…/subscribe/region` · `/lv/v1/commerce/get_entrances` | preços (kep) | preços e planos **por região/localização**, entradas de compra | não confirmado |
| `/lv/v1/cc_web/ad_maker/ecom/seo_get_collection_templates` · `…/seo_search_templates` | kep | **coleções e busca de modelos de e-commerce** (módulo "ad maker") | não |
| `/lv/v1/event/report` | kep | relatório de eventos | **sim** |
| `/service/2/abtest_config/` · `/service/2/web_sdk_settings/` | SDKs | testes A/B e configuração do SDK | A/B **sim** |
| `/v1/list` · `/v1/list_test` · `/v1/user/webid` · `/event` | SDK de analytics | coleta de eventos e identificador web | `list` **sim** |
| `/monitor_browser/collect/batch/` · `/npm-monitoring` | SDKs | monitoramento | **sim** |
| `/login` · `/login-embed` | landing | rotas de login (modal incorporado) | não |

### 14.2 Rede no código
- **Nenhum** `new WebSocket` e **nenhum** `XMLHttpRequest.open` com URL literal. As chamadas `fetch` usam URL montada em tempo de execução (única com forma legível: `<base>/<…>/list`, do SDK de analytics).
- **`window.fetch` é reatribuído** por 3 scripts (`69`, `771`, `index`) e `window.XMLHttpRequest` pelo carregador de privacidade: os SDKs **instrumentam a rede** (monitoramento).

### 14.3 Roteamento e idiomas
O roteador contém **28 códigos de idioma**: `ar-eg, cs-cz, de-de, el-gr, es-es, es-la, fi-fi, fr-fr, he-il, hu-hu, id-id, it-it, ja-jp, ko-kr, ms-my, nl-nl, pl-pl, pt-br, ro-ro, ru-by, sv-se, th-th, tl-ph, tr-tr, uk-ua, vi-vn, zh-cn, zh-tw`, mais as rotas `/`, `/pricing` e o curinga `*`. O seletor da interface mostra só 7. Ou seja, o código está preparado para muito mais idiomas do que a interface oferece hoje.

### 14.4 Armazenamento e privacidade no cliente
- **localStorage:** `auto_fill_info` (landing; natureza do conteúdo não verificada), `__GPC_AND_PRIVACY_UNIQUE_KEY__` (sinal de **Global Privacy Control**), e chaves de teste de SDK (`_applogtest-test-key`, `_ranger-test-key`, `_localforage_support_test`) usadas só para detectar suporte.
- **Cookies:** o código lê `document.cookie`. **Consentimento:** `ccWebCookieConsentSingleton`, eventos `getConsent`, `bannerEvents`, `customBannerEvents`.
- **Eventos do navegador** usados: 44 tipos (ex.: `visibilitychange`, `pagehide`, `securitypolicyviolation` para relatar violações de CSP, `webglCreateContextError` no script de fingerprint).

### 14.5 Variáveis globais e instrumentação
`_SSR_DATA`, `_ROUTER_DATA`, `_MODERNJS_ROUTE_MANIFEST` (SSR e roteamento), `__LOADABLE_LOADED_CHUNKS__` (divisão de código), **`rspackChunkpippit_landing_page`** (nome do chunk do Rspack), `assetsRetry` e `assetsRetryStatistics` (nova tentativa de arquivos que falham), `__STARLING_*` (edição de textos no contexto), `TEAVisualEditor` e `LogPluginObject` (analytics), `__assetPrefix__`, **`BUILD_BRANCH` e `BUILD_VERSION`** (informação de build exposta no cliente), `__locationInfo` e `__locationCountryCode` (preço por país), `__is_kep` e `__request__` (app de preços), `dataLayer`/`gtag` (Google), `UET*` (Bing), `ccWebCookieConsentSingleton`.

### 14.6 Domínios citados no código (43 strings, filtradas)
| Grupo | Domínios |
|---|---|
| APIs ByteDance/CapCut | `edit-api-sg.capcut.com`, `mcs-normal-sg.capcutapi.com`, `mon-sg.capcutapi.com`, `vmweb-normal-sg.capcutapi.com`, `ttwid-normal-sg.capcutapi.com`, **`starling-normal-sg.capcutapi.com`** (textos de i18n) |
| CDN e estáticos | `sf16-ug-neutral.capcutstatic.com`, `sf16-web-login-neutral.capcutstatic.com`, `sf16-web-tos-buz.capcutstatic.com`, `sf16-sg.tiktokcdn.com`, `sf16-website-login.neutral.ttwstatic.com`, `lf-global-static.iapplogcdn.com`, `p16-capcut-sg.capcut.com` |
| Monitoramento | `sf16-short-sg.bytedapm.com` |
| Fingerprint | `m1.openfpcdn.io` (citado pelo script `uifid-fingerprint-init`; domínio associado à biblioteca aberta FingerprintJS, **conhecimento meu**) |
| Atribuição/app | `pippit.onelink.me`, `capcut-yt.onelink.me` (links de instalação/atribuição do app móvel; OneLink é do AppsFlyer, **conhecimento meu**) |
| Login e terceiros | `accounts.google.com` (login Google), `clarity.microsoft.com`, `ui.ads.microsoft.com`, `www.tiktok.com`, `www.facebook.com` |
| Redes e vitrine | `discord.com`, `www.instagram.com`, `x.com`, `www.youtube.com`, `www.producthunt.com` |
| Dados estruturados | `schema.org` (JSON-LD para SEO) |
| Outros | `www.countain.com` (no script de consentimento; **não identifiquei o que é**), `github.com`, `react.dev`, `reactjs.org`, `www.w3.org`, `localhost`, `test.com` (strings de bibliotecas e testes) |

### 14.7 Grafo do REA
Status por arquivo (completo, truncado, pendente) e como retomar: **`notes/REA_GRAFO_STATUS.md`**. Resumo: **os 31 arquivos têm o grafo semântico completo e salvo em disco** em `evidence_cli/` (1,56 GB; índice em `evidence_cli/INDEX.md`), gerado pela CLI do REA: 26 arquivos inteiros e, para os 5 que passam do teto de resultado da CLI (`lib-polyfill` da landing e do kep, `uifid-fingerprint-init`, `771`, `69` do kep), 29 peças divididas por módulo (relações que cruzam peças ficam como desconhecidas). Nenhuma saída truncada nem com `Resource constraint`. O REA segue marcando `partial` por causa de fronteiras dinâmicas, o que é inerente à análise estática. O `rea_evidence_bundle_5.json` guarda a evidência da sessão do MCP (cobertura parcial).

**Níveis de cobertura (não confundir):**
1. *Arquivo completamente processado pela ferramenta*: o arquivo inteiro foi lido e o grafo foi gravado sem corte (26 arquivos inteiros; 5 em peças).
2. *Análise estrutural parcial por código dinâmico*: o REA escreve `partial` em todos, porque chamadas dinâmicas, propriedades computadas e alvos ambíguos ficam como `unknown`. É inerente à análise estática, **não** falha de cobertura.
3. *Saída truncada*: o REA cortou o resultado por limite de recurso (`truncated: true` / `Resource constraint`). Ocorreu só nas execuções dos 5 scripts inteiros que estouraram o teto da CLI; essas saídas ficam em `evidence_cli/_truncados_NAO_USAR/` e **foram substituídas pelas 29 peças** (`evidence_cli/pecas/`). O índice de módulos por peça e as relações indeterminadas entre peças estão em `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md`.
