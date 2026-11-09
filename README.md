# PiperLine — auditoria técnica do frontend público do Pippit

Estudo de produto e benchmarking para a implementação própria da Opportunity. Navegação **pública, sem login**; nada foi contornado e nenhum endpoint foi chamado à mão.

## Leia nesta ordem
1. `PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md` — o que foi observado (stack, rotas, recursos, rede, funcionalidades, interface, limitações).
2. `OPPORTUNITY_IMPLEMENTATION_BLUEPRINT.md` — requisitos **independentes** para construirmos nossa solução (sem copiar nada do Pippit).
3. `SNAPSHOT_VALIDATION_REPORT.md` — o que está íntegro, o que falta, espaço e confiança.
4. `evidence_cli/INDEX.md` e `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md` — onde está o grafo de cada script.
5. `notes/MISSING_NETWORK_ASSETS.md` — o que as páginas carregam e não está na pasta.

## Pastas
| Pasta | Conteúdo |
|---|---|
| `screenshots/` | 14 páginas em desktop (11 de página inteira; 3 só da tela inicial, 900 px) + 4 em celular (2 delas curtas) |
| `captures/` | 3 capturas de rede do REA (JSON): landing+preços, estúdio de modelos, agente de vídeo |
| `scripts/raw/` | **37** arquivos estáticos públicos (31 JS, 2 CSS, 4 JSON de tradução/manifest), **só para estudo local**. Atenção: as páginas carregam ~228 outros ativos que **não** estão aqui (ver `notes/MISSING_NETWORK_ASSETS.md`) |
| `scripts/export/` | exportação do REA (arquivos pequenos + manifesto; hashes conferem com `scripts/raw/`) |
| `scripts/split/` | bundles grandes divididos em peças (771, kep 69, uifid e os dois polyfills) por módulo, para o grafo do REA caber na memória |
| `notes/` | `PAGINAS_PUBLICAS.md` (55 caminhos únicos de página), `network_catalog*.csv`, `pages/*.json` (estrutura de UI por página) e os scripts de apoio |
| `notes/ast_inventory/` | leitura completa por AST dos **31 scripts** (1.180.685 nós, 0 erros): `*.js.json`, `notes/ast_inventory/_resumo.json`, `notes/ast_inventory/_consolidado.txt` |
| `notes/REA_GRAFO_STATUS.md` | status do grafo do REA: **31 de 31 arquivos completos, salvos em `evidence_cli/`** |
| `notes/VERIFICACAO_INTEGRIDADE.txt` | conferência de integridade (JSON, PNG, hashes, links, contagens) |
| `rea_evidence_bundle_5.json` | **único bundle mantido** (1,06 GB, cumulativo): evidência da sessão do MCP do REA; os bundles 1 a 4 foram apagados a seu pedido por serem redundantes (conferido: o 5 contém registros dos 1 a 4). **Redundante em cobertura** com `evidence_cli/` (não comparado registro a registro); apagar ou não é decisão sua |
| `evidence_cli/` | **grafo completo dos 31 scripts em disco** (1,56 GB): 26 arquivos inteiros + 29 peças dos 5 que passam do teto da CLI. Índice, parâmetros e contagens em `evidence_cli/INDEX.md`. Saídas inteiras com o grafo **semântico** truncado ficam em `_truncados_NAO_USAR/` (**não são redundantes**: três delas guardam o grafo de módulos e `imports` que as peças não têm; ver `evidence_cli/pecas/INDICE_MODULOS_POR_PECA.md`). |
| `evidence_cli/pecas/` | 29 peças dos 5 scripts que estouram o teto da CLI + `INDICE_MODULOS_POR_PECA.md`, `PIECES_MODULES.csv` e `PIECES_CROSS_REFS.csv` |
| `TELEMETRY_SPEC.md` | telemetria/monitoramento observados: `GET /lv/v1/event/report` (não POST), variantes, parâmetros, erros, e demais coletores |
| `PIPPIT_AUTH_OBSERVATIONS.md` + `captures/auth/` | observações com sessão autenticada (conta gratuita): APIs, UI do /home, regras de créditos; planos pagos ainda não capturados |
| `PIPPIT_PLANS.md` | matriz dos planos Gratuito/Starter/Plus/Pro (aba mensal, BRL) |
| `PIPPIT_FEATURE_CATALOG.md` | catálogo consolidado de funcionalidades (agente, modos, modelos/parâmetros, skills, Criação inteligente, ativos, conta) com lacunas explícitas |
| `PIPPIT_SITEMAP_AND_BUTTONS.md` | mapa de rotas e de cada tela/botão observado (editor, estúdios, ativos, skills, avatares, conta), com destino e estado |
| `PIPPIT_NODES_AND_AVATAR_FLOWS.md` | nós do canvas (Personagem, Cena, Estúdio 3D, Vídeo, Imagem, Texto, Áudio), painéis de geração e custos, assistente de avatar de foto, paywall do vídeo em avatar |
| `PIPPIT_CAPTURE_STATUS.md` | estado das capturas automáticas pelo REA CLI (lotes 1–6), falhas e pendências |
| `PIPPIT_SOCIAL_PUBLISHING.md` | prioridade: conexão de TikTok/Instagram/Facebook/YouTube, publicação agendada, análise; o que foi observado e o que depende de OAuth/Publicar |
| `PIPPIT_WORKFLOW_OBSERVATIONS.md` | projetos existentes da conta: tipos, workflow do agente, design doc, nós/arestas, gating por plano; observável × desconhecido |
| `local_reconstruction/` | **aplicação local executável** (`node local_reconstruction/app/server.mjs` → http://127.0.0.1:5180) + módulos e testes; ver `local_reconstruction/README.md` |
| `FEATURE_INVENTORY.md` | inventário integral: estado de cada funcionalidade (não investigada/investigada/especificada/implementada/verificada/bloqueada) e diferenças |
| `evidence_cli/recovered/` e `evidence_cli/recovered_pecas/` | **70 scripts recuperados** (63 antes ausentes + gtm/gtag) analisados pela CLI do REA; saídas inteiras e peças dos 4+2 que truncam. Índice: `evidence_cli/recovered/INDEX.md`; tabela por script: `notes/RECOVERY_STATUS.csv` |
| `scripts/recovered/` | arquivos recuperados por captura do REA e por GET público das URLs observadas (`get/`: 194+3 arquivos; log em `notes/get_log.tsv`) |
| `notes/COVERAGE_BY_SCRIPT.csv` | cobertura dos 31 scripts: raw × sha256 × AST × evidência × documentação |
| `notes/MISSING_NETWORK_ASSETS.md` / `.csv` | ativos de rede vistos nas capturas e não preservados |
| `MANIFEST_SHA256.csv` | caminho, tamanho, sha256 e origem de cada arquivo da pasta |
| `SNAPSHOT_VALIDATION_REPORT.md` | resumo de validação do snapshot (contagens, limitações, confiança) |

## Avisos
- `scripts/raw/` e `captures/` contêm **cópias de arquivos públicos de terceiros**. Não redistribuir e **não usar no produto**.
- Os termos de uso do Pippit podem restringir uso automatizado: confirmar antes de reutilizar o material.
- Tudo que exige login foi apenas **registrado como referência**. A arquitetura de backend é **inferência**.

- `PIPPIT_API_CATALOG.md` — 645 caminhos de API do app logado extraídos estaticamente dos 250 bundles (`scripts/auth_bundles/`); análise REA em lote em `evidence_cli/auth_bundles/` (`python notes/run_auth_bundles.py`, retomável).
- `PIPPIT_COVERAGE_REPORT.md` — relatório consolidado de cobertura (gerado por `notes/build_coverage_report.py` a partir de `FEATURE_INVENTORY.md`): totais, concluídas, incompletas, bloqueadas, interface↔código↔endpoints, evidências, testes que gastariam créditos e o que segue desconhecido.
- `notes/cdp_ui.mjs` (controlador CDP v2: `node notes/cdp_ui.mjs run notes/cdp_steps/<fluxo>.json`) + `python notes/rea_diff.py cdp <fluxo>`.

## Estado de encerramento e retomada (21/10/2026)
**Pausa combinada com o usuário.** Nada em execução do PiperLine; auditoria de cobertura concluída; implementação funcional retomada e testada; equivalência formal com o Pippit **NÃO comprovada**.

**Reconstrução funcional (exato):** `local_reconstruction/` implementa as telas e fluxos do inventário marcados IMP/VER em `FEATURE_INVENTORY.md` (101 linhas: 18 implementadas, 18 verificadas por teste local, 56 investigadas, 9 bloqueadas) e, nesta sessão, a **geração direta de vídeo (Auto Route)**: `src/directgen.mjs` (contrato observado), rotas com caminhos do Pippit em `app/server.mjs`, UI Home → Vídeo → Auto Route → canvas `/direct/<projeto>/<canvas>/<run>`. Sem IA: sem provedor o run falha sem débito; `settings.provider = local-ffmpeg` gera vídeo não-IA sem débito. Itens `UNOBSERVED` no código (run `succeeded`=3, status `running` do nó, regra com tentativas gratuitas esgotadas, formato de `subscribe_run`, título do thread, corpo de `batch_patch_asset`) são palpites, não comportamento comprovado.

**Testes locais (todos passaram em 21/10):** `node test/<pageview|credits|plans|workflow|canvas_avatar|studio3d|directgen|directgen_http|directgen_ui|e2e|ui|parity>.test.mjs` em `local_reconstruction/`. Provam coerência com o contrato/observações, não equivalência com o serviço.

**Comparações da Home e limites do REA 6.5.0:** `rea compare-web-captures` (original × local) = `changed` (DOM 2, acessibilidade 1, storage 1; demais `unknown`) — `captures/verify/compare_home.json`. Cenário estreito (menu de modo) = `unknown` (events ausente; origem do cenário difere → `capture_context_mismatch` inevitável). `verify_reconstruction` (só MCP) rejeitou a evidência da CLI (repositórios de evidência separados) e **não aceita** `rea.web-capture-diff` (erro "identity or authority disagrees" em behavioral/interaction e structural-artifact). A CLI não tem `verify-reconstruction`. Isso é limitação de ferramenta, **não** falha da implementação e **não** prova equivalência. Não repetir sem mudança técnica fundamentada (ex.: outro tipo de evidência suportado).

**Evidências e arquivos desta sessão (todos em C:\w\PiperLine):**
- Geração Auto Route: `captures/auth/autoroute/` — `send2.har` (falha), `send3.har` (sucesso), `erro_canvas.har`, `ok_canvas.har`, `sse_erro.har`+`sse_erro_sse.json`, `sse_ok.har`+`sse_ok_sse.json`, `rea_*_inspect.json`, `observe_session.json`; prints em `captures/auth/cdp/t_autoroute*`, `t_sse_*`.
- Verificação: `captures/verify/` (inspeções, normalizados, compare, spec).
- Análise: `PIPPIT_API_CATALOG.md` (protocolo, contratos, SSE), `PIPPIT_CAPTURE_STATUS.md`, `FEATURE_INVENTORY.md`, `PIPPIT_COVERAGE_REPORT.md`; scripts `notes/cdp_ui.mjs` (recurso `netlog`), `notes/protocol_from_har.py`, `notes/build_inventory.py`, `notes/build_coverage_report.py`; fluxos em `notes/cdp_steps/` (`t_autoroute*`, `t_sse_*`, `t_estado`, `t_home_ref`).
- Código novo/alterado: `local_reconstruction/src/directgen.mjs`, `app/server.mjs`, `app/public/app.js`, `test/directgen*.test.mjs`, `README.md` local.
- Scripts autenticados: `scripts/auth_bundles/` (250) e `evidence_cli/auth_bundles/`.
- Observações: `MANIFEST_SHA256.csv` foi gerado às 15:13 e **não inclui** os arquivos posteriores (HARs/verify/código novo) — regenerar com `python notes/build_manifest.py` (lento, ~10 GB, em background) na próxima sessão. A pasta não é repositório git (sem commits).
- Saldo do Pippit: **113 créditos**. Nenhuma nova geração sem autorização específica. CineForma: não iniciar.

**Próxima sessão (prioridades, nesta ordem):**
1. Conferir o estado dos módulos: rodar a suíte de testes acima e `node local_reconstruction/app/server.mjs`.
2. Continuar as funcionalidades pendentes do inventário (linhas "parciais" em `PIPPIT_COVERAGE_REPORT.md` §3): opções internas de Settings, Skills "Criar habilidade", menu "…" do avatar, Programar pós-conta, 3D "Imagem de IA", TitleBar AgentConnect/ExportTask etc., respeitando bloqueios de plano.
3. Corrigir divergências visuais/comportamentais **comprovadas** (comparar screenshots/a11y por tela com `captures/auth/cdp/t_*`; só corrigir o que a evidência mostra).
4. Testes de integração e ponta a ponta (e2e, ui, directgen*) antes de dar qualquer mudança como pronta.
5. Verificações compatíveis com o que o REA realmente suporta (`compare_web_captures` por tela, `inspect-web-network-capture` de HARs, `evaluate_reconstruction_coverage`), sem declarar equivalência não comprovada.
Não reiniciar a auditoria; não refazer capturas concluídas; Chrome do Pippit em CDP 9222 (1 aba, perfil `C:\w\rea_chrome_profile`) segue aberto e logado para uso do usuário.

## Retomada da implementação (21/10/2026, após a pausa)
Verificado no início: Chrome 9222 logado (1 aba), REA MCP ativo, manifesto regenerado (`notes/build_manifest.py`, reexecutado ao fim da sessão). Nenhuma geração; saldo 113. Suíte local: `node local_reconstruction/test/run-all.mjs` (17 testes; todos passam).
**Novo nesta etapa (todos com teste; ver `FEATURE_INVENTORY.md`, linhas VER novas):**
- Editor: diálogo **Export settings** (nome obrigatório ≤100, marca d'água, 360p–4k, qualidade, 24–60 fps, MP4/MOV) com reencode real (`media.finalize`); painel direito com **Áudio do clipe** (volume dB, fade in/out, redução de ruído, mudo, velocidade) e **Plano de fundo** (preto/cor/desfoque); a exportação agora mantém o áudio dos clipes.
- Geração direta integrada: projetos diretos no histórico (abre `/direct/…`), **cancel_run**, lista local de tarefas (`/api/direct/runs`, página Tarefas), **notificações** (sino com ponto, "Todas lidas"), **paywall** ao enviar com modelo pago no plano Free (antes de qualquer requisição, como observado).
- Canvas: **ferramentas de nó sem IA** (Extrair quadro, Cortar, Extrair áudio, Recortar, Girar) via `POST /api/projects/:id/nodes/:nid/tool`; ferramentas de IA respondem 501 com motivo. Nó de **Áudio** com voz local do Windows (SAPI, não-IA) quando `provider = local-ffmpeg`.
- Conta/Skills/Marketing: **18 idiomas** (só a escolha persiste) e **modo escuro**; skills com **Favoritos / Minhas skills / criar manualmente**; seletores de marketing (**Ad formats, Hook, Visual style**) com busca, categorias, Expand/Select e chips no prompt.
**Palpites locais (UNOBSERVED) a revisar se houver evidência nova:** estado de run `cancelled`=5 e `succeeded`=3, título do projeto "<thread> part", mapeamento qualidade→CRF, "2k"=1440, resultado não destrutivo das ferramentas de nó, formato local de skills.
**Ainda pendente:** "Criar com IA"/"Enviar skill", menu "…" do avatar, "Programar" pós-conta, 3D "Imagem de IA", SSE ao vivo/`subscribe_run`, planos pagos, conteúdo editorial do serviço (galeria, anúncios, prévias), animações/ferramentas inteligentes do editor, "Salvar sem marca d'água" (Settings), tradução da interface para os outros 17 idiomas.

## Segunda retomada (21/10/2026): IA real, skills em pacote e revisão de fidelidade
**Suíte:** `node local_reconstruction/test/run-all.mjs` (25 testes). `test/llm_live.test.mjs` (opcional, lento) valida os planejadores com o Ollama real (`qwen3-local`, 24–103 s por chamada).
**IA integrada de forma legítima (sem depender de endpoints privados do Pippit):**
- **LLM** (`src/llm.mjs`): Ollama local autodetectado (modelo já instalado `qwen3-local`) ou qualquer servidor compatível com OpenAI (URL/modelo/chave em Configurações > Assistente de IA; chaves só em data/db.json). Usado em: planejador do agente (temas, design doc, storyboard por segmento, com fallback para regras e aviso), Criar skill com IA, Refinar prompt (Gerador), Criação Inteligente (ideias diárias/sob demanda a partir do histórico + notificação). **Não é o LLM do Pippit.**
- **Imagem** (`src/imagegen.mjs`): provedor do usuário via `/images/generations` (nó Imagem). Testado só com servidor de mentira (sem chave real).
- **Voz** local (Windows SAPI, nó Áudio), **corte por silêncio** (ffmpeg), **legendas** por Whisper do ffmpeg (exige modelo ggml baixado pelo usuário; nada é baixado automaticamente; transcrição ponta a ponta NÃO testada), **Melhorar qualidade/Amplificar** convencionais (não-IA).
- **Vídeo por IA:** continua exigindo provedor externo (nenhum local viável: GPU MX150 2 GB, sem torch/diffusers). O render local é cartão/zoom com a descrição do storyboard — não é geração por IA.
**Skills = pacotes SKILL.md** (achado nos bundles autenticados: `notes/auth_skill_strings.json`): ZIP com SKILL.md na raiz, regras e mensagens do original (ver linha do inventário).
**Revisão dos UNOBSERVED com os 250 scripts:** (1) estados do run: enum RunState completo encontrado (Canceled=5, Completed=3 corretos); status do nó confirmados (`cancelled` com dois "l"); (2) "2k" = 1440 confirmado; enum de qualidade 0/1/2 confirmado; CRF segue local; (3) formato das skills resolvido (pacote SKILL.md); (4) título automático do projeto: NÃO está nos bundles (gerado no servidor); heurística local mantida.
### Matriz de fidelidade (local × observado × equivalência)
| Funcionalidade | Implementação local | Observado no Pippit (evidência) | Equivalência |
|---|---|---|---|
| Export settings | diálogo + reencode ffmpeg real | campos, listas, padrões, validação do nome (REA ev_225fdc3d…, ev_a3b7b81d…; bundles: 2k=1440, qualidade 0/1/2) | opções iguais; encoder/marca d'água/CRF locais — NÃO comprovada |
| Editor (áudio do clipe, fundo) | filtros ffmpeg | rótulos/abas do painel (§9.4) | parcial; efeitos do serviço ausentes |
| Nós do Canvas | 7 ferramentas reais (quadro, corte, áudio, recorte, giro, melhorar/amplificar convencionais) | listas de ferramentas por nó | resultado ao clicar no original NÃO observado |
| Geração direta Auto Route | contrato HTTP/estados/canvas por patches; sem IA | HARs reais, SSE por replay, enum RunState | contrato comprovado nas partes observadas; SSE ao vivo e geração real NÃO |
| Histórico/tarefas | projeto direto, tarefas locais, notificações | histórico real (títulos do servidor), enum de status de tarefa | parcial |
| Agente | fluxo observado + planejador LLM do usuário | fluxo/rótulos observados; prompts internos desconhecidos | fluxo sim, conteúdo NÃO |
| Criação Inteligente | ideias diárias por LLM/regras | só a tela de consentimento | mecanismo local diferente do serviço |
| Skills | pacote SKILL.md/ZIP com regras dos bundles | strings i18n e regras de validação dos bundles | formato e regras sim; backend/CLI NÃO |
| Marketing | seletores com busca/categorias | diálogos observados (Ad formats parcial, Hook sem itens, Visual style completo) | parcial |
| Configurações | 18 idiomas, claro/escuro, aba de IA local | listas observadas; tradução/valores internos não | parcial |
**Ainda 501/bloqueado por falta de serviço, evidência ou autorização:** ferramentas de visão/segmentação dos nós (Isolar camadas, Preencher, Analisar, Panorama…), vídeo em avatar e clonagem de voz, vincular conta/publicar (OAuth), Corte rápido por texto, geração de vídeo por IA, SSE ao vivo, planos pagos.

## Terceira retomada (21/10/2026): provedores, tarefas de geração, composição e desempenho do LLM

**Feito (código + testes locais com servidores de mentira; NADA foi gerado de verdade, nenhum crédito/serviço pago foi usado):**
- `src/providers.mjs`: adaptadores configuráveis de vídeo (`openai-videos`, `replicate`), áudio (`openai-speech`, `sapi-local`) e imagem (`openai-images`); chaves só em `settings.providers` (mascaradas na API). Sem provedor/chave/autorização o recurso fica identificado como dependente de configuração.
- `app/lib/jobs.mjs`: tarefas persistentes (`db.jobs`) com estados blocked/queued/running/succeeded/failed/canceled, sequência com último quadro como referência, cancelar/tentar de novo. **Só envia ao provedor com `allowSpend === true`** ("Autorizo chamadas pagas").
- `app/lib/compose.mjs`: após todas as tarefas terminarem, narração, legendas, projeto no editor e exportação de `final.mp4` a partir de resultados reais.
- Agente: etapa/documento `generation_prompts.md`; sem provedor as tarefas ficam **bloqueadas com o motivo exato**; o provedor local-ffmpeg gera um **animatic** (prévia do storyboard) rotulado "NÃO é vídeo gerado" — nunca `final.mp4`. UI: aviso amarelo, etiqueta "PRÉVIA (animatic)", link para Tarefas, configuração de provedores em Configurações > Assistente de IA.
- Desempenho do LLM (`notes/llm_bench.mjs`, `captures/perf/llm_bench_1.json`, Qwen3-4B Q4_K_M, i7-8550U, MX150 2 GB): a **geração de tokens (~3–4 tok/s) é o gargalo**; processar o prompt (~460 tok/s) é desprezível; carga a frio 15 s (CPU) vs 36 s (Vulkan) e a GPU não acelera. Implementado em `src/llm.mjs`: caminho nativo do Ollama (`/api/chat`, `think:false`, `format:json`, `keep_alive` 30m, `options` num_gpu/num_thread/num_ctx), `warmup()` ao detectar, cache persistente por entrada (`db.llmCache`, 200 itens), deduplicação de chamadas idênticas, estatísticas por etapa (`GET /api/llm/stats`, `POST /api/llm/cache/clear`). Modelo mantido (sem substituição justificada/testada).
- Testes: `providers`, `llm_perf` novos; `agent_llm`, `e2e`, `ui` atualizados ao novo comportamento (bloqueio + animatic). `run-all.mjs` inclui os novos.

**Ainda não feito / dependências exatas:** geração real de vídeo exige provedor de vídeo configurado + autorização de gasto (por decisão do usuário, geração só depois do app pronto); teste ponta a ponta com Ollama real e reabertura do projeto; testes HTTP/UI das rotas de provedores e da página Tarefas; revisão de fidelidade vs. evidências do REA; manifesto só ao fim.

**Teste ponta a ponta controlado (21/10/2026, Qwen3 real, 	est/e2e_live.test.mjs, relatório em captures/e2e_live/):** projeto -> pedido -> temas (63,5 s) e storyboard (51,4 s) do LLM real -> tarefas de geração preparadas e bloqueadas (sem provedor) -> reabertura em outro processo com persistência confirmada; repetir o mesmo pedido veio do cache (0 s). Nada gerado, nenhum crédito. Dependência exata para geração/composição/exportação reais: provedor de vídeo configurado + autorização de gasto (adiado por decisão do usuário).

**Comparação passiva por tela (21/10/2026, REA inspect-web-page + compare-web-captures, 
otes/compare_screens.mjs/ecompare.mjs, saídas em captures/verify/screens/):** Marketing Studio, Story Studio, Assets e Skills do Pippit logado vs. telas locais = **changed** nas quatro (evidências ev_8c45e5c3…, ev_59fd5209…, ev_2984de7e…, ev_74d86783…): dom_structure changed(2), accessibility changed(1), storage changed(150); scripts/resources/network/metadata/webmcp = unknown (observação de 500 ms, sem eventos). Os números idênticos nas quatro telas indicam diferença dominada por estrutura/armazenamento global, não por conteúdo de cada tela; a ferramenta não mede o conteúdo visível. Sem aprovação formal possível (verify_reconstruction não aceita web); nenhuma equivalência afirmada. Nada gerado.

## Lote 2 (21/10/2026): proporção do editor, menu de ativos, bolsas de créditos e Canvas → Editor

Validação do lote 1 antes de mexer: suíte completa (30 testes) passou na versão corrigida (`captures/perf/runall_4.log`).

**Implementado (tudo local, sem gerar mídia e sem tocar em créditos/contas do Pippit):**
- **A. Ratio do editor** (`captures/auth/cdp/t_editor/editor_ratio.png`): sete opções observadas com divisores e "Original aspect ratio" como padrão; botão "Ratio" no lugar do `<select>`; pré-visualização com `aspect-ratio`; exportação real nas dimensões certas (Original = primeiro clipe, lado menor 720), letterbox sem distorção; persistência; API recusa proporção não observada. `21:9` saiu das opções do editor (existe só nos estúdios/agente). Código: `app/lib/media.mjs` (`EDITOR_RATIOS`, `sizeForTimeline`), `app/server.mjs`, `app/public/app.js`.
- **B. Menu "…" de ativos** (`captures/auth/cdp/asset_menu/1_menu.png`): Baixar, Selecionar (seleção em lote), Adicionar personagem, Adicionar produto, Vincular produto existente, Excluir (confirmação com lista de uso); filtros Tudo/Imagens/Vídeos/Áudio, ordem e "Ver". **Os diálogos de personagem/produto/vincular do Pippit nunca foram abertos**: regras locais (só imagens, nome ≤60, sem nome repetido). API: `/api/characters`, `/api/products`, `/api/assets/:id/(character|product|link-product|usage)`; excluir ativo limpa vínculos.
- **C. Três bolsas** (`benefits/user_credit`): lotes com bolsa, saldo por bolsa em `/api/state`, `/api/ledger`, no `user_credit` local e no diálogo de créditos; histórico indica a bolsa. Gratuitos/bônus = gift; vip/purchase = 0 (assinatura e compra bloqueadas). **Ordem de consumo entre bolsas é desconhecida** (REA: `unk_c170f02f…`).
- **D. Canvas → Editor** (extensão local, **não observada no Pippit**): botão "Editar no editor" no nó de vídeo; o vídeo real vira o clipe; vínculo nó↔edição; o resultado exportado volta ao Canvas como novo nó ligado ao original; recusas para nó sem vídeo, geração incompleta, ativo/arquivo ausente e mídia inválida.

**Testes novos:** `editor_canvas`, `assets_menu`, `credits_pouches`, `lote2_ui` (todos em `run-all.mjs`). Aprovação nos testes locais **não** é equivalência formal ao Pippit.

**Suíte final do lote 2 (21/10/2026):** `node local_reconstruction/test/run-all.mjs` → todos os 34 testes passaram na versão final (`captures/perf/runall_7.log`). Antes disso, falhas de expectativas antigas (`credits`, `ui`) foram corrigidas e o encerramento do `agent_llm` foi endurecido (crash libuv do Windows). Aprovação nos testes locais não é equivalência formal ao Pippit.

## Lote 3 (21/10/2026): painel direito do editor, Velocidade e tour

**Evidência usada** (sem recapturar): `captures/auth/cdp/editor_right_panel/*.png` (trilho de 6 abas, estado vazio, Velocidade, Animação) e `captures/auth/inspect_editor_live1.txt` / `editor_page/w0.txt` (tour 1/2).

**Implementado:**
- Painel direito do editor reorganizado como no Pippit: trilho Básico / Plano de fundo / Ferramentas inteligentes / Áudio / Animação / Velocidade; sem clipe selecionado mostra "Selecione um item para fazer ajustes"; clicar num clipe da timeline o seleciona. Coluna direita alargada.
- **Velocidade** (captura 5_6): Normal | Curvo (desabilitado: conteúdo não capturado), Velocidade em x ↔ Duração (recalculam uma à outra), Tom, Câmera lenta suave, redefinir. Exportação real (`media.exportTimeline`): Tom = altura acompanha a velocidade (440→880 Hz medido); Câmera lenta suave = `minterpolate` ao desacelerar. Faixa 0,1x–10x validada no servidor (decisão local).
- Proporção também dentro de Plano de fundo; Áudio com Volume/Fade/Redução de ruído/Mudo; Animação (Entrada/Saída/Combinação) e Ferramentas inteligentes/Modificador de voz listados com os nomes vistos, **desabilitados e identificados como não reproduzidos** (só "Nenhum" ativo).
- Tour de balões de 2 passos (uma vez por navegador): passo 1 com o texto observado; passo 2 só o título; rótulo "Concluir" e o bloco no topo são locais.
- Corrigido bug do lote 2: um comentário `//` engolia o handler do título do editor (`#etitle`).

**Não feito por falta de evidência (registrado no REA):** "Salvar sem marca d'água" (pode alterar a conta: exige autorização), conteúdo da Biblioteca de estilos do Canvas, aba Básico com clipe, Curvo, resultado visual dos efeitos de Animação, corpo do passo 2 do tour.

**Testes novos:** `editor_speed` (ffmpeg real), `lote3_ui`; `ui` adaptado ao clipe selecionado.

## Migração para REA 6.7.0 (22/10/2026)

Atualizado de 6.5.0 para 6.7.0 (setup do Claude Code + skill; `rea update` não aplica: instalação via cache do npx). Notas lidas: 6.6.0 (nunca publicada; incluída na 6.7.0) e 6.7.0. **Quebras relevantes:** Evidence/snapshots/inventários exigem `relationship_coverage` explícito e inventários exigem cobertura com escopo + `integrity_contradictions` (`coverage_status` removido; arquivos antigos não são migrados); resultados de captura de navegador guardam limites, famílias de eventos e omissões; acessibilidade só é comparada com cobertura observada. **Teste de compatibilidade (sem recapturar):** `compare-web-captures` 6.7.0 sobre as capturas normalizadas de Marketing da 6.5.0 → mesmas dimensões (`changed`; scripts/recursos/rede/metadados/webmcp `unknown`; DOM, acessibilidade e armazenamento `changed`), porém `evidence_id` diferente (`ev_9b2425c3…` vs `ev_8c45e5c3…`). Portanto os IDs da 6.5.0 são referência histórica, não equivalentes. Evidências antigas preservadas; saída nova em `captures/verify/migracao_670/`. O MCP do REA ficou desconectado nesta sessão: reconectar (`/mcp`) e conferir a versão antes de usar as ferramentas.

## Skills com REA 6.7.0: catálogo de prompts e integração (22/10/2026)

**Confirmado:** MCP do REA = 6.7.0 (`binary_session.server_identity`: pacote e servidor 6.7.0, instalação global em `Roaming\npm`), distinto do cache do `npx` da CLI (6.5.0/6.7.0). `inspect_analysis_view` com views `javascript`/`javascript-facts` disponível e usado (Evidence `ev_3873f917…`).

**O que foi recuperado** (`PIPPIT_SKILLS_PROMPTS_CATALOG.md` / `.json`, gerados por `notes/build_skills_catalog.mjs`): o payload do servidor `POST /api/biz/v1/agent/list_skill_store` capturado com `capture_browser_scenario` 6.7.0 (Evidence `ev_ea421de9…`, aba logada, somente leitura) entrega, para as **13 skills oficiais**: `guide_words` e `material_guide_words` (textos integrais), `metadata.tools` (ferramentas declaradas), modelos padrão, categorias, `content_version`/`content_hash`, `fornax_key`, cenas/agentes. **Não entrega o corpo da skill** (md_type tos; instruções privadas). Os views `javascript*` do REA retornam estrutura (módulos/referências), não literais: as strings dos bundles (11.029 pares i18n; schema de skill do usuário, etapas Roteiro/Storyboard/Ativos do Estúdio de histórias, prompts de Hook e vitrine do Marketing) vêm de varredura offline (`notes/scan_skill_strings.mjs`), com sha256 e evidência histórica 6.5.0 por bundle.

**Integrado no PiperLine** (`app/lib/skilldefs.mjs` + `official_skills.json`): catálogo enriquecido (tags, ferramentas, modelos, guia), detalhes com guia/ferramentas/entradas/etapas, guia e pedido pré-preenchido no compositor (Batch, URL, Tradução), conferência de entradas por skill com "continuar assim mesmo", planejamento por skill no LLM (texto do PiperLine inspirado no guia, NÃO a instrução privada), aprovação com prompts exatos (Marketing Video), folha 3 vistas (documento + nó de imagem, sem gerar), modo só análise (Viral) e desvios (Criar skill/avatar). Testes `skills_official` e `skills_official_ui`.

**Suíte final (22/10/2026, após skills + REA 6.7.0):** `run-all.mjs` → todos os 38 testes passaram (`captures/perf/runall_10.log`). Correções antes: `agent_skill` adaptado ao novo gate de entradas das skills oficiais e `lote3_ui` com repetição contra corrida de re-render (intermitente sob carga). Aprovação nos testes locais não é equivalência formal ao Pippit.

## Botão Use e Publicação (22/10/2026, REA 6.7.0)

**Use (13 skills):** capturado em `captures/skills_670/use` e resumido em `PIPPIT_SKILLS_PROMPTS_CATALOG.md` (`uso_botao_use`). O compositor mostra chip da skill (+ Remover), placeholder exato = `guide_words`, tile de upload = `material_guide_words`; não há prompt de sistema na tela. O PiperLine reproduz isso no compositor.

**Publicação:** `PIPPIT_PUBLISHING_STRUCTURE.md` preserva vinculação de contas, publicação e agendamento (observado × inferido × desconhecido) para APIs oficiais futuras. Código em `src/publishing.mjs`; página `#/schedule` (Publicador) com rascunhos locais; `test/publishing.test.mjs` garante 0 chamadas externas. Nenhuma conta vinculada, nada publicado, nenhum crédito gasto. Menu Mais agora tem Editor e Publicador.

## Revisão de fidelidade ao Pippit atual (22/10/2026)

`PIPPIT_FIDELITY_REVIEW_670.md`: comparação das capturas atuais (`captures/current_670`, somente leitura) com o app local (`captures/fidelity`). Ajustados More (sem Editor), Publisher/Analytics, Home (banner, 37 /s, selos, ordem), Marketing Studio, Story Studio, Video generator, Smart creation, Assets e Avatares e vozes. Suíte: 39/39 (`captures/perf/runall_12.log`) + UI de Avatares reexecutada. Manifesto NÃO regenerado (decisão do usuário: só em marco maior).

## Lote 5 — especificação de avatares, matriz de engenharia reversa e contratos estáticos (23/10/2026)
`PIPPIT_AVATAR_SPEC.md`, `PIPPIT_REVERSE_MATRIX.md` (gerada por `notes/build_reverse_matrix.mjs`), `notes/dynamic_questionnaire.schema.json`. REA: 9 incertezas registradas (`notes/rea_unknowns.json`, bundles `captures/current_670/rea_session_bundle_lote5*.json`). O agente local passou a emitir `questionnaire` (contrato recuperado do bundle). Contrato do agente (`submit_run`, Skills × agentes × modelos, exemplos JSON): `PIPPIT_AGENT_CONTRACT.md`; mensagens do agente local ganham o campo informativo `wire` (`app/lib/agent_contract.mjs`). Execução real: filtros de avatar funcionam; estilos só selecionáveis (não aplicados); Foto falante = prévia local sem animação; avatar selecionado não gera vídeo.

## Retomada PiperLine — SSE e cancelamento local (09/11/2026)

A revisão do passo inicial conferiu o servidor com o contrato que as capturas realmente documentam: replay de `subscribe_thread` = `message/message/ping`; replay de `sse_asset` = `ping: connected`, `AssetJsonUpdate` com JSON de patches e `ping` final. **O fluxo incremental ao vivo de `subscribe_run` continua sem evidência do Pippit**; a rota local usa um fallback que reemite o snapshot do thread e não deve ser tratado como formato original.

Ajustes locais: o fechamento dos streams é ligado à resposta (evita listener órfão); estados Working/Generating também notificam SSE; ffmpeg local agora roda sem bloquear o servidor e aceita abort ao cancelar. Testes cobrem as atualizações ao vivo locais, cancelamento antes do processamento e cancelamento com renderer injetado, verificando que o resultado cancelado não é publicado. O caminho HTTP de cancelamento durante ffmpeg é executado apenas quando ffmpeg está disponível. Nenhuma geração foi enviada ao Pippit, nenhum crédito foi gasto e nenhuma autorização externa foi usada.

**Limite de prova:** testes locais validam a implementação local, não o formato ao vivo do Pippit nem os contratos remotos de `cancel_run` e run↔tarefa; equivalência não foi demonstrada. O usuário não tem acesso à conta Pippit disponível ao agente: observações de custo/exportação/respostas reais do Avatar ficam **PENDENTE DE OBSERVAÇÃO HUMANA**; não tentar acesso nem solicitar autorização.

## Retomada local — telas e roteador gratuito (09/11/2026)

Implementado o seletor local de Produto/Personagem no Marketing (cadastros locais, busca, ordenação, seleção e criação a partir de um ativo de imagem); catálogo recomendado não capturado permanece indisponível. Canvas: diálogo `Chat history` com histórico por projeto local e `No history yet` quando vazio; os dados não são compartilhados com o Pippit. Os detalhes dos 10 templates continuam incompletos: só oito nomes foram preservados, dois são desconhecidos e nenhum texto pré-preenchido ausente foi inventado. As telas de criação/detalhes de Skills já existiam.

Adicionado `local_reconstruction/src/free_router.mjs`: configuração sem segredo persistido, catálogo limitado a adaptadores locais/possíveis cotas gratuitas, roteamento por capacidades e preferência de tarefa, bloqueio do fallback pago e adaptadores OpenAI-compatible/Gemini com testes de fetch falso. Free tiers cloud são condicionais e exigem confirmação de disponibilidade/quota; nenhuma chamada real de provedor foi feita.

Suíte completa: `PIPPIT_LLM=off` com caminhos `PIPPIT_FFMPEG`/`PIPPIT_FFPROBE` temporários → **33 passaram, 16 SKIP explícitos, 0 falharam (49)**. Dois skips por evidência REA ausente, 14 por Chromium não executável neste sandbox. Ver classificação detalhada em `ARENA_STATUS.md`.
