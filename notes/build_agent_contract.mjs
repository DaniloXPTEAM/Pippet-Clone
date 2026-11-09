// Gera PIPPIT_AGENT_CONTRACT.md. A tabela por Skill vem de local_reconstruction/app/lib/official_skills.json; o resto e texto fixo com evidencias.
// Legenda de evidencia: [E] analise estatica de bundle autenticado (arquivo@offset em scripts/auth_bundles/, ver notes/bundle_ctx.mjs); [O] observado em execucao (notes/_submit_runs_observed.json).
import fs from 'node:fs';
const S = JSON.parse(fs.readFileSync('local_reconstruction/app/lib/official_skills.json', 'utf8'));
const rows = Object.entries(S).filter(([k]) => k !== '_fonte').map(([slug, k]) => {
  const tools = k.tools && k.tools.length ? k.tools.map((t) => '`' + (t.toolName || t.name || t) + '`').join(', ') : '— (não declaradas)';
  const dm = [k.defaultModels?.video && `vídeo \`${k.defaultModels.video}\``, k.defaultModels?.imagem && `imagem \`${k.defaultModels.imagem}\``].filter(Boolean).join(' · ') || '— (nenhum declarado)';
  const q = (k.tools || []).some((t) => (t.toolName || t.name || t) === 'dynamic_questionnaire') ? 'sim (`dynamic_questionnaire` declarado)' : 'não declarado';
  const route = k.skillType === 'ai_talking_photo' ? 'abre a feature Foto falante (não vai ao composer)' : k.skillType === 'avatar_video' ? 'abre a feature Avatar Video (não vai ao composer)' : '`biz/preload_skill` → `client_extra.pre_activate_skills`';
  return `| ${k.displayName} | \`${k.skillName}\` | \`${k.skillId}\` | ${k.skillType} | ${dm} | ${tools} | ${q} | ${route} |`;
});
const md = `# PIPPIT_AGENT_CONTRACT — contrato do agente (\`agent/submit_run\`)

Escopo: o que foi **provado** sobre a requisição que a interface do Pippit monta para o agente. Legenda de evidência: **[E]** análise estática dos bundles autenticados já recuperados (arquivo@posição em \`scripts/auth_bundles/\`; reabrir com \`node notes/bundle_ctx.mjs <prefixo> <texto>\`); **[O]** observado em execução real (2 \`submit_run\` capturados em \`captures/auth/autoroute/\`, extraídos em \`notes/_submit_runs_observed.json\`). **Nenhuma** chamada nova ao Pippit foi feita. Valores não provados aparecem como **desconhecido**. Nada aqui afirma equivalência formal do servidor: o *prompt interno* do agente e o roteamento no servidor continuam desconhecidos.

## 1. Forma da requisição

| Parte | Conteúdo | Evidência |
|---|---|---|
| URL | \`POST /api/biz/v1/agent/submit_run?babi_param=<JSON>\` — o \`babi_param\` também vai na query (sem \`generate_id\`) | [O] URL dos 2 casos; [E] 159201 \`_getSubmitRunRequestParams\` ~20758 |
| Corpo (chaves observadas) | \`project_id, message, user_info, agent_name, concurrency_control, entrance_from, run_extra, request_id\` | [O] |
| Corpo (chaves só estáticas) | \`business_scene\`, \`thread_extra\` (string JSON, só no Marketing), \`client_supported_tools[{tool_name}]\`, mais \`extraSubmitRunParams\`/\`requestBodyExtra\` mesclados | [E] 850206 @252854; 533601 @50809 |
| \`message\` | \`{content[], role, thread_id, run_id, created_at, message_id}\`; \`thread_id\` observado: \`canvas_thread_<id>_<agent_name>\` | [O] |
| \`user_info\` | \`{consumer_uid, workspace_id, space_id, app_id}\` | [O] + [E] 850206 |
| \`concurrency_control\` | \`{policy:1, conflict_key:"<número>"}\`; \`conflict_key\` observado **não** é o \`project_id\`; origem: **desconhecido** | [O] |
| \`run_extra\` | **string JSON** com exatamente 2 chaves: \`babi_param\` e \`client_extra\` | [O]; [E] 159201 \`_getRunExtra\` @17204 |

## 2. Campo a campo (valor, onde nasce, condição, relações, etapa, evidência)

| Campo | Onde é montado | Valores reais / constantes | Condição | Relações | Etapa |
|---|---|---|---|---|---|
| \`generate_mode\` (em \`client_extra\`) | HomePageV5 módulo 964076 (mapa) + módulo 2975 (\`generationType→categoria\`); validador 361865 em 159201 e 562045 | só \`agent\`, \`video_gen\`, \`image_gen\`, \`audio_gen\` (qualquer outro é descartado). Mapa: agent→\`agent\`, video→\`video_gen\`, image→\`image_gen\`, audio→\`audio_gen\`. \`generationType\`: \`agent\`/\`nest_agent\`/ausente→agent; \`image\`; \`audio\`; \`video\`/\`video_part\`/\`videoPart\`→video; outro → erro \`unsupported_generation_type\`. Fora de \`/home\`, vem da query \`generate_mode\`, ignorada se a entrada for \`history\`, \`history_entrance\` ou \`history_project_entrance\` | Sempre decidido pelo modo de criação escolhido na Home | casa com \`agent_name\` (agent→agente de Agent mode; \`*_gen\`→agente \`pippit_*_part_agent\`) e com \`target\`/\`run_source\` | no clique em enviar |
| \`entrance_from\` (corpo, \`client_extra\` e \`babi_param.enter_from\`) | 850206 @332367 (direto); constantes de marketing em 450621 | direto: \`web_video_direct\`, \`web_image_direct\`, \`web_audio_direct\`; observado no combo da Home: \`home_page_integrated_agent_combo_input_box\`; marketing: \`marketing_page_integrated_agent_combo_input_box\`, \`marketing_page_combo_input_box\` | por tela de origem | corpo e \`client_extra\` repetem o mesmo valor; \`enter_from\` do \`babi_param\` vem de \`babi.enter_from\`→\`enter_from\`→\`entrance_from\` | no envio |
| \`agent_name\` | 850206 @332367 (direto); módulo 323051 (\`pC\`, padrão do Agent mode); 478827 | **direto:** \`pippit_video_part_agent\`, \`pippit_image_part_agent\`, \`pippit_audio_part_agent\` [O só o de vídeo]. **Agent mode:** \`pippit_nest_agent\` [E]. Outros nomes vistos em código: \`pippit_image_ai_editor_agent_v0\`, \`pippit_image_agent_v2\` (tipo imagem), \`pippit_video_chat_agent\` (tipo vídeo/marketing), \`pippit_novel_agent_cn_v2\` (canvas batch render) | modo da Home / nó do Canvas | define \`tool_id\` do \`babi_param\` (ver abaixo) e o \`thread_id\` | no envio |
| \`business_scene\` | 533601 @50809 | Marketing: \`marketing_agent\`. Demais fluxos: **ausente** nos casos observados | só no módulo Marketing | repete em \`run_extra\` (\`businessScene\`, \`business_scene\`, \`position\`, \`tabName\`) e \`edit_type=product_marketing\` | no envio |
| \`thread_extra\` | 533601 @50809 | Marketing: \`JSON.stringify({business_scene:"marketing_agent"})\`. Outros fluxos: **ausente** (nenhuma montagem encontrada) | só Marketing | — | no envio |
| \`scene_lv2\` (\`babi_param\`) | 850206 @252868 | constante \`front_tool\` (único valor encontrado); \`scene_lv1\` = \`ai_agent\` | sempre | — | no envio |
| \`tool_id\` (\`babi_param\`) | 850206 @252868 | \`<f>_canvas\`, onde \`f\` = (\`business_scene\` mapeado) ou (\`canvas_type\` se \`integrated_agent\`/\`novel\`) ou mapa-por-agente (\`novel\`, \`instant_video\`) ou mapa-por-edit_type (\`audio_generation/canvas_batch_render/image_generation/video_gen→novel\`, \`marketing_agent→product_marketing\`, \`video_part→instant_video\`). [O] \`integrated_agent_canvas\` | derivado | = \`edit_type\`+\`_canvas\` | no envio |
| \`sub_tool_id\` (\`babi_param\`) | 850206 @249610 | só quando o chamador informa (\`roiSubToolId\`): nós \`scene3d-image-replicate\`, \`scene3d-scene-plan\`, \`scene3d-text-to-motion\` (agente \`d.DQ\`). **Strings exatas: desconhecido** (constantes em módulos não lidos). Ausente no caso observado | só ferramentas 3D/ROI | = \`edit_type\` desses nós | no envio |
| \`pre_activate_skills\` / \`_type\` / \`_source\` | 975399 @71931 | \`pre_activate_skills\` = nomes (\`skillName\` real) unidos por \`&\`; \`_type\`: \`official\` (de \`official\`/\`platform_recommend\`), \`personal\` (\`personal\`/\`custom\`/\`user_upload\`/\`ai_created\`), senão \`other\`; tipos mistos → \`other\`; \`_source\` (só ação \`set_skill\`): \`recommend\` (\`homepage_recommendation\`), \`slash\` (\`slash_suggestion\`), \`panel\` (\`skill_panel\`), \`skill_store\`, \`chat\`, senão \`other\` | só nas ações \`generate\` e \`set_skill\`; vem das partes \`biz/preload_skill\` (apenas com \`selection_source:"user_selected"\`) e \`biz/addon_skill\` (\`skill_name_list\`) | os nomes são os \`skillName\` da tabela do §4 | no envio; **ausente** nos casos observados (nenhum usou Skill) |
| \`runExtra\` / \`run_extra\` | 159201 @17204; 748861 (\`runExtraBuffer\`) | string JSON \`{babi_param, client_extra}\` [O]. Estático aceita extras do chamador (ex.: Marketing, §2 acima) | — | \`babi_param\` também vai na URL | no envio |
| \`client_extra\` | 159201 + 850206 | [O] chaves: \`current_page\` (\`/home\`), \`entrance_from\`, \`generate_mode\`, \`generate_position\` (\`home\`), \`canvas_type\` (\`integrated_agent\`), \`edit_type\` (\`integrated_agent\`), \`project_id\` (número), \`position\` (\`canvas\`), \`tab_name\` (\`canvas\`), \`target\` (\`video\`), \`run_source\` (\`video_part\`), \`placement_name\` (\`canvas\`). Para image/audio, \`run_source\` = constantes **desconhecidas** (não lidas) | — | \`target\`/\`run_source\` seguem o tipo direto | no envio |
| \`agentName\` (camelCase de código) | 159201 | é o \`agent_name\` do corpo | — | — | — |
| \`babi_param\` | 850206 @252868 | [O] \`{edit_type, tool_id, generate_id, user_message_id, section_id, scene_lv1, scene_lv2, tab_name, enter_from}\`; \`generate_id\` = \`section_id\` = UUID do run; fallback estático \`canvas_<ts>_<16 hex>\` e \`unknown\` quando falta valor | — | \`tool_id\`=\`edit_type\`+\`_canvas\` | URL e \`run_extra\` |
| \`dynamic_questionnaire\` | 159201 (esquema); 553635 mód. 829634 (resposta); 889795/298315 (\`sendToolMessage\`) | ver §5 | o agente chama a ferramenta; o cliente mostra o formulário (auto-envio após 30 s [E] 553635) | — | meio da conversa |
| \`prepend_messages\`, \`thread_extra\` fora do Marketing, \`scene_lv2\` ≠ \`front_tool\` | — | **desconhecido** (nenhuma montagem encontrada nos bundles recuperados) | — | — | — |

## 3. Modos de criação e agentes

- Enum de modos da Home (módulo 251785): \`auto\`, \`image\`, \`video\`, \`short_video\`, \`product_marketing\`; \`video\`/\`short_video\`/\`product_marketing\` contam como "vídeo" [E].
- Caminho **direto** (Auto Route de vídeo/imagem/áudio): o conteúdo é uma parte \`type:"data"\`, \`sub_type:"biz/x_data_direct_tool_call_req"\` cujo \`data\` é string JSON \`{tool_name, param (string JSON), extra}\`; \`tool_name\` = \`biz/x_tool_name_{video,image,audio}_part\`. Parâmetros de vídeo **observados**: \`prompt, images, ratio, resolution, videos, audios, model, duration_sec\`; \`extra\` = \`"{}"\` [O]. Modelo efetivamente usado nas execuções: \`MiniMax-H3-trial\` [O].
- Caminho **Agent mode**: \`agent_name=pippit_nest_agent\`, \`generate_mode=agent\`; o agente escolhe ferramentas sozinho (lista declarada por Skill, §4). Nenhuma execução desse caminho foi observada: tudo [E].
- O servidor devolve o fluxo (\`messages\`, tool calls); o cliente trata ferramentas "de cliente" como \`dynamic_questionnaire\` e responde com uma mensagem \`role:"tool"\`.

## 4. Skills × agentes × modelos × ferramentas

Modelo **declarado** = \`defaultModels\` de \`list_homepage_recommended_skill\` (campo recomendado pelo catálogo, não é prova de uso). Modelo **observado em execução**: nenhuma Skill foi executada; o único modelo visto em execução foi \`MiniMax-H3-trial\` (vídeo direto, sem Skill). Agente responsável em Agent mode: \`pippit_nest_agent\` [E] (não há campo por Skill que escolha outro agente); as Skills de avatar não passam pelo composer. A lista de ferramentas é a **declarada**; a ordem de execução **não** está provada (o agente decide).

| Skill | \`skillName\` (ativação) | \`skillId\` | Tipo | Modelo declarado | Ferramentas declaradas | Questionário | Ativação |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Passos de fluxo comprovados por Skill: **nenhum** em execução. Só há comprovação do protocolo de ativação (\`biz/preload_skill\` → \`pre_activate_skills\`) e da lista declarada. Chamadas de API relacionadas: \`list_homepage_recommended_skill\` (catálogo), \`agent/submit_run\` (execução), resposta de ferramenta de cliente (§5). O texto "Viral Replication = parser→análise→questionário→plano→geração" é só a ordem da lista declarada: **não é sequência provada**.

## 5. \`dynamic_questionnaire\` — formato da resposta

Esquema da chamada (agente→cliente): \`notes/dynamic_questionnaire.schema.json\` [E]. Resposta (cliente→agente) = mensagem \`role:"tool"\` com \`toolCallId\` (id da chamada), \`clientToolResp:[{toolId, toolResp}]\` e \`content\` com 2 partes \`text\` por pergunta [E 553635 mód. 829634; 298315 \`sendToolMessage\`]:

- \`Question: <título> \` (note o espaço final) e \`Answer: <resposta>\`, ambas \`subType:"plain/text"\` (em fio: \`sub_type\`).
- radio → rótulo (\`label\`) da opção cujo \`value\` foi escolhido; checkbox → rótulos unidos por \`", "\`; text → texto aparado; resposta vazia → nenhuma parte. media → parte de pergunta \`Question: <título>: \`, parte \`Answer\` e partes image/video.
- A leitura inversa usa a regex \`^Question:(.+?)\\s+Answer:(.+)$\` comparando o título.
- Formato interno de \`toolResp\`: **desconhecido** (não aparece nas capturas nem no trecho lido).

## 6. Exemplos de requisição (somente campos provados)

**6.1 Vídeo direto (Auto Route) — [O] estrutura observada.** Os valores entre \`<>\` não foram guardados/são do usuário.

\`\`\`json
{
  "project_id": "<id do projeto>",
  "agent_name": "pippit_video_part_agent",
  "entrance_from": "web_video_direct",
  "request_id": "<desconhecido>",
  "concurrency_control": { "policy": 1, "conflict_key": "<desconhecido>" },
  "user_info": { "consumer_uid": "<uid>", "workspace_id": "<id>", "space_id": "<id>", "app_id": "<id>" },
  "message": {
    "role": "user", "thread_id": "canvas_thread_<id>_pippit_video_part_agent", "run_id": "<uuid>", "message_id": "<uuid>", "created_at": "<ms>",
    "content": [ { "type": "data", "sub_type": "biz/x_data_direct_tool_call_req",
      "data": "{\\"tool_name\\":\\"biz/x_tool_name_video_part\\",\\"param\\":\\"{\\\\\\"prompt\\\\\\":..., \\\\\\"images\\\\\\":[...], \\\\\\"ratio\\\\\\":..., \\\\\\"resolution\\\\\\":..., \\\\\\"videos\\\\\\":[...], \\\\\\"audios\\\\\\":[...], \\\\\\"model\\\\\\":\\\\\\"MiniMax-H3-trial\\\\\\", \\\\\\"duration_sec\\\\\\":...}\\",\\"extra\\":\\"{}\\"}" } ]
  },
  "run_extra": "{\\"babi_param\\":{\\"edit_type\\":\\"integrated_agent\\",\\"tool_id\\":\\"integrated_agent_canvas\\",\\"generate_id\\":\\"<uuid>\\",\\"user_message_id\\":\\"<uuid>\\",\\"section_id\\":\\"<uuid>\\",\\"scene_lv1\\":\\"ai_agent\\",\\"scene_lv2\\":\\"front_tool\\",\\"tab_name\\":\\"canvas\\",\\"enter_from\\":\\"home_page_integrated_agent_combo_input_box\\"},\\"client_extra\\":{\\"current_page\\":\\"/home\\",\\"entrance_from\\":\\"home_page_integrated_agent_combo_input_box\\",\\"generate_mode\\":\\"video_gen\\",\\"generate_position\\":\\"home\\",\\"canvas_type\\":\\"integrated_agent\\",\\"edit_type\\":\\"integrated_agent\\",\\"project_id\\":<número>,\\"position\\":\\"canvas\\",\\"tab_name\\":\\"canvas\\",\\"target\\":\\"video\\",\\"run_source\\":\\"video_part\\",\\"placement_name\\":\\"canvas\\"}}"
}
\`\`\`

**6.2 Agent mode com Skill — [E] derivado do código; nenhuma execução observada.** Só as chaves de §2; o corpo do texto do usuário e o formato exato da parte de texto são **desconhecidos** nesta análise.

\`\`\`json
{
  "agent_name": "pippit_nest_agent",
  "entrance_from": "<desconhecido para Agent mode>",
  "message": { "role": "user", "content": [
    { "type": "data", "sub_type": "biz/preload_skill",
      "data": "{\\"skill_name\\":\\"storyline-advertisement\\",\\"selection_source\\":\\"user_selected\\",\\"pre_activate_skills_type\\":\\"official\\"}" },
    { "type": "<desconhecido: parte de texto do prompt>" } ] },
  "run_extra": "{\\"babi_param\\":{...},\\"client_extra\\":{\\"generate_mode\\":\\"agent\\",\\"pre_activate_skills\\":\\"storyline-advertisement\\",\\"pre_activate_skills_type\\":\\"official\\"}}"
}
\`\`\`

**6.3 Marketing — [E].** \`business_scene:"marketing_agent"\`, \`thread_extra:"{\\"business_scene\\":\\"marketing_agent\\"}"\`, \`run_extra\` com \`businessScene\`, \`business_scene\` (=\`marketing_agent\`), \`editType\`/\`edittype\` (=\`product_marketing\`), \`position\`, \`tabName\` (=\`marketing_agent\`).

**6.4 Resposta de questionário — [E].**

\`\`\`json
{ "role": "tool", "toolCallId": "<id da chamada dynamic_questionnaire>",
  "clientToolResp": [ { "toolId": "<desconhecido>", "toolResp": "<desconhecido>" } ],
  "content": [ { "type": "text", "sub_type": "plain/text", "data": "Question: Escolha o tema principal " },
               { "type": "text", "sub_type": "plain/text", "data": "Answer: <rótulo da opção>" } ] }
\`\`\`

## 7. O que cada propriedade faz (português simples)

- **\`agent_name\`**: qual "funcionário" do Pippit recebe o pedido. O de vídeo/imagem/áudio *direto* só executa uma ferramenta; o \`pippit_nest_agent\` conversa, planeja e chama várias ferramentas.
- **\`generate_mode\`**: diz ao app qual aba/modo estava ativa (agente, vídeo, imagem ou áudio). Valores fora dos 4 permitidos são ignorados.
- **\`entrance_from\` / \`enter_from\`**: de onde o clique veio (Home, Marketing, geração direta). Serve a roteamento e métricas.
- **\`business_scene\` / \`thread_extra\`**: marcam o módulo Marketing para o servidor tratar a conversa como "agente de marketing".
- **\`run_extra\`**: pacote de metadados da execução (texto JSON) com \`babi_param\` e \`client_extra\`.
- **\`babi_param\`**: rótulos de telemetria/roteamento (\`tool_id\`, \`edit_type\`, ids do run); identifica de qual ferramenta/tela veio a execução. Também vai na URL.
- **\`client_extra\`**: contexto do cliente (página, posição, projeto, tipo de alvo, origem da geração).
- **\`pre_activate_skills\`**: lista de Skills (\`nome1&nome2\`) que o agente já deve ativar antes de começar; \`_type\` e \`_source\` dizem se é oficial/pessoal e por onde o usuário a escolheu.
- **\`scene_lv1/lv2\`**: classificação fixa da cena (\`ai_agent\` / \`front_tool\`).
- **\`sub_tool_id\`**: subferramenta (só nós 3D/ROI do Canvas).
- **\`dynamic_questionnaire\`**: o agente "pergunta" ao usuário pelo cliente; a resposta volta como mensagem \`role:"tool"\`.
- **\`concurrency_control\`**: evita dois envios simultâneos conflitantes (política 1 + chave de conflito).

## 8. Desconhecido (mantido explícito)

Texto do prompt interno do agente; formato de \`toolResp\`/\`toolId\` na resposta de questionário; parte de texto do usuário em Agent mode; \`entrance_from\` do Agent mode fora da Home; \`conflict_key\`; strings de \`sub_tool_id\` (3D/ROI); \`run_source\` de image/audio; \`thread_extra\` fora do Marketing; \`prepend_messages\`; modelo realmente usado por cada Skill (nenhuma observada).

## 9. Efeito no PiperLine

\`local_reconstruction/app/lib/agent_contract.mjs\` implementa só o provado (mapa de \`generate_mode\`, agentes diretos, \`pre_activate_skills\`, \`biz/preload_skill\`, serialização "Question/Answer", \`babi_param\`). O agente local passa a anexar um campo **informativo** \`wire\` às mensagens (preload da Skill escolhida; resposta de questionário) — nada é enviado ao Pippit e nenhum mecanismo existente foi substituído. Teste: \`test/agent_contract.test.mjs\` (reconstrói \`babi_param\` idêntico ao observado).
`;
fs.writeFileSync('PIPPIT_AGENT_CONTRACT.md', md); console.log('PIPPIT_AGENT_CONTRACT.md', md.length, 'bytes;', rows.length, 'skills');
