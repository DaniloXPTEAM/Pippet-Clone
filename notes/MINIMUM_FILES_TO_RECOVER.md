# Menor conjunto de arquivos a recuperar (nada foi baixado ainda)

Critério: entra só o arquivo cuja ausência impede compreender ou reproduzir uma função observada. **Limite de evidência**: a função de cada arquivo vem do **nome na captura do REA** (URL e ordem de carga) e das chaves de tradução; o conteúdo nunca foi lido. Por isso nenhum item é "provado": 5 são necessários por papel estrutural (entrada/manifesto/runtime) e 6 por inferência de nome. Categorias abaixo = as de `notes/MISSING_SCRIPT_PRIORITY.csv` (VISUAL/UI = VISUAL; ANALYTICS/TELEMETRIA = TELEMETRIA).

"Recuperável por rota já conhecida": a URL foi observada pelo REA em `captures/`; o GET público da mesma URL é o mesmo meio usado para o `pt-BR.a61aa.json`. As ferramentas MCP do REA não baixam arquivos soltos (`export_web_scripts`/`analyze_web_bundle` exigem uma página viva no Chrome).

## Etapa 1: resolver ids e rotas (3 arquivos, pequenos)

| arquivo | app | funcionalidade | por que é necessário | lacuna que resolve | prioridade | observado antes | rota conhecida |
|---|---|---|---|---|---|---|---|
| `builder-runtime.a49fc417.js` | cms_consumer | runtime | contém o mapa de chunks (id → nome → hash) | nomeia os 17 chunks numéricos | P1 · RUNTIME | sim, `scenario_video-agent` | sim, URL da captura |
| `route-manifest-main.a8e8c072.js` | cms_consumer | roteamento | liga cada rota a seus chunks e CSS | quais chunks/CSS a página `/tools/video-agent` carrega | P1 · RUNTIME | sim, `scenario_video-agent` | sim |
| `route-manifest-templates.23ae9915.js` | kep | roteamento do estúdio de modelos | idem para a rota `template-studio` | quais chunks o estúdio usa (5 numéricos indeterminados do kep) | P1 · RUNTIME | sim, `scenario_template-studio` | sim |

## Etapa 2: entradas e código da página (5 arquivos)

| arquivo | app | funcionalidade | por que é necessário | lacuna que resolve | prioridade | observado antes | rota conhecida |
|---|---|---|---|---|---|---|---|
| `main.e32a6083.js` | cms_consumer | entrada do app | sem ela não há código das rotas | como o app monta e roteia | P1 · CRÍTICO FUNCIONAL | sim | sim |
| `byted-image-seeyou-cms-components-components-Pippit-AnyInput.e6734657.js` | cms_consumer | entrada de criação (prompt/upload) | as 60 chaves `Pippit_agent_*` descrevem prompt, upload e limites; o código está aqui (por nome) | validação de upload, envio do pedido, endpoint de geração | P1 · PROVAVELMENTE CRÍTICO | sim | sim |
| `marketing-studio.4edccd46.js` | kep | estúdio de modelos | app carregado em `template-studio`; o kep preservado só tem `pricing` | lógica de templates/busca | P1 · CRÍTICO FUNCIONAL | sim | sim |
| `$.1928e4ea.js` | cms_consumer | rota coringa | convenção de splat: renderiza a página por slug | como uma URL de ferramenta vira página | P2 · PROVAVELMENTE CRÍTICO | sim | sim |
| `templates-landing-page.fb42b692.js` | cms_consumer | composição de página | une os blocos de conteúdo | quais blocos formam a página de agente | P2 · PROVAVELMENTE CRÍTICO | sim | sim |

## Etapa 3: condicional (decidir depois dos manifestos)

| arquivo | app | observação |
|---|---|---|
| `wrappers-Pippit.e34d2f20.js` (cms) | cms_consumer | layout da marca; PROVAVELMENTE CRÍTICO por nome |
| `4017.b895d9bb.js` (cms) | cms_consumer | núcleo compartilhado (único numérico fora de `/async/`); PROVAVELMENTE CRÍTICO por posição |
| `26.cef62c1a.js` (kep) | kep | **NÃO VALIDADO PELO REA** (depende do mapa de chunks extraído com Node) |
| 17 chunks numéricos do cms_consumer e `541`, `109`, `244`, `475`, `846` do kep | ambos | INDETERMINADO; só entram se o manifesto/runtime os apontar |

## Total

- **Mínimo agora**: 3 (etapa 1).
- **Mínimo para fechar as lacunas funcionais**: 8 (etapas 1 e 2).
- **Teto provável**: 11 (com a etapa 3), de 63. Imagens, fontes, CSS, mídia e os 12 blocos visuais ficam de fora.
