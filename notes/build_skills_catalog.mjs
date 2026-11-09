// Gera PIPPIT_SKILLS_PROMPTS_CATALOG.json e .md a partir de: (1) payload do servidor capturado com o REA MCP 6.7.0 (list_skill_store/list_skill_tag), (2) diálogos "Details" lidos pelo controlador CDP,
// (3) varredura OFFLINE dos bundles (notes/skill_strings_scan.json) com sha256 e evidência histórica da 6.5.0. Não inventa instruções: cada item traz CLASSE e FONTE. Uso: node notes/build_skills_catalog.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
const R = 'C:/w/PiperLine'; const rd = (p) => JSON.parse(fs.readFileSync(`${R}/${p}`, 'utf8'));
const store = rd('captures/skills_670/skills_store_extract_670.json'); const ui = rd('captures/skills_670/skills_observed.json'); const scan = rd('notes/skill_strings_scan.json');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(`${R}/${p}`)).digest('hex');
const EV670 = { scenario_list_skill_store: 'ev_ea421de9207ed0d11f7f73535d25dfd4aa8041762c10264892d55b55c92f052a', inspect_pagina_skill: 'ev_2bd23653952ae050858d0158ebc25592f126095b9c6823ab9cc969b4b03988bc', lista_alvos_cdp: 'ev_959294fba3de1aa58ce0ec6e2ce25e013bbb159b22defd6f4f4e1f03de9c096f', analise_js_bundle_Skill_pai: 'ev_3aa762df1a0d17c04ba64285f04904204a79748706dc92950e5f1f6c06fbcc4a', analise_js_bundle_Skill_resumo: 'ev_6f9e7abc38a68aef9de1db1535e150c24b776f985aeb90131f71b40dc56f08d5', visao_javascript_facts: 'ev_3873f917daef7172267b081251921373ea3e4533094633d18a242f3fd97fc701' };
const hist650 = (file) => { try { const j = JSON.parse(fs.readFileSync(`${R}/evidence_cli/auth_bundles/${file}.json`, 'utf8')); return (j.data || j).evidence_id || null; } catch { return null; } };
const uiByName = Object.fromEntries(ui.detalhes.map((d) => [d.cartao, d.dialogo]));
const CLASSES = {
  guide_words: 'TEXTO INTEGRAL do servidor (campo guide_words): orientação de uso mostrada ao usuário/composer. NÃO é a instrução privada (SKILL.md) da skill.',
  prefill: 'TEMPLATE PARAMETRIZADO: texto que o servidor entrega como pedido pré-preenchido (inclui marcador a completar).',
  tools: 'WORKFLOW COMPROVADO (parcial): lista de ferramentas do agente declarada em metadata.tools. A ORDEM de execução NÃO está comprovada.',
  inferido: 'COMPORTAMENTO INFERIDO a partir de guide_words/tools/descrição (não é instrução original).',
  privado: 'INSTRUÇÃO PRIVADA NÃO ACESSÍVEL: o corpo da skill fica no servidor (md_type tos, hash/versão e fornax_key visíveis, conteúdo não).',
  descricao: 'DESCRIÇÃO COMERCIAL (texto de vitrine), não prompt.',
  i18n: 'STRING DE INTERFACE embutida no bundle (texto padrão da chave i18n); pode ser rótulo, mensagem ou modelo de pedido.',
};
const INFER = {
  'storyline-advertisement': ['Entradas exigidas: nome do produto + pontos fortes, imagem do produto, gênero de drama e proporção (sem algum deles, a skill pergunta antes de produzir).', 'Opcional: referência de pessoa para fixar o rosto.', 'Fórmula declarada: gancho nos 2 primeiros segundos, escalada rápida, uma virada limpa, desfecho em que o produto é a razão da virada.', 'Saída em inglês americano por padrão.'],
  story_short_film: ['Entradas: história (roteiro completo ou ideia de uma linha), formato (duração, proporção, idioma, público), itens a preservar, fotos de personagens, imagens de locais/objetos, amostra de voz.', 'Pausa para aprovação em cada etapa-chave antes de construir.'],
  'seedance-vlog-maker-v2': ['Entradas: fotos, clipes curtos, música/som real; melhor momento vira o gancho; opcional tema, plataforma (16:9/9:16), duração.', 'Dica declarada: poucos planos fortes valem mais que 30 fotos parecidas.'],
  'expert-product-promotion': ['Obrigatório: nome do produto e ao menos uma foto clara. Opcional: pontos fortes, público/mercado, estilo do criador (experimentar/unboxing/demo/review/indicação), duração/proporção, CTA.', 'Mantém o produto fiel à foto e não inventa alegações; criadores ocidentais/latino-americanos por padrão; roteiro em inglês coloquial.'],
  'character-reference-sheet': ['Entrada: imagem do personagem (frontal/corpo inteiro; laterais ajudam) ou descrição; detalhes assimétricos com o lado; preservação de traços se for pessoa real.', 'Saída declarada: uma folha 16:9 com close do rosto à esquerda e frente, lateral e costas à direita. Só usa geração de imagem.'],
  imitation_video: ['Entradas: um vídeo de referência (upload, ativo da tarefa ou link completo) e a direção (refazer no mesmo estilo / manter o gancho trocando pessoa-cena-tema / divergir livremente); ativos a substituir; modo só-análise sem gerar.', 'Pipeline sugerido pela lista de ferramentas: analisar link → engenharia reversa do vídeo → questionário → plano → gerar vídeo → renderizar; vídeos multi-segmento são gerados em ordem e unidos num corte final (guide_words).'],
  'batch-marketing-video-generator-r1': ['Pedido pré-preenchido pede 3 roteiros de anúncio e variações de vídeo do produto.', 'Conjunto de ferramentas agente amplo (todo_write, tarefas assíncronas async_task_*, load_skill, sandbox bash/read/write/edit, busca omni): execução em lote com tarefas assíncronas e outras skills.'],
  url2video: ['Pedido pré-preenchido com marcador [Paste URL]; extrai imagens e textos do produto a partir do link (ferramentas pippit_tool_url_parse e sandbox_read).'],
  'video-language-localization': ['Pedido pré-preenchido: traduzir o vídeo e trocar o ator por avatar de IA local mantendo ganchos e ritmo; termina em "Target market/language:" a completar.', 'Ferramentas: análise de vídeo de marketing, geração de vídeo/áudio/imagem, questionário dinâmico.'],
  nest_skills_marketing_video_v2: ['Entradas: fatos do produto + prompts de Hook/Style/Play; constrói roteiro de anúncio (gancho → ponte → corpo centrado no produto → CTA).', 'Ranqueia pontos fortes numa promessa + prova; mostra o storyboard completo e os prompts exatos e ESPERA aprovação antes de gerar (mudança material reabre a aprovação).', 'metadata.tools = null: ferramentas não declaradas no payload.'],
  'skill-creator': ['Meta-skill de criação: o guia pede "Skill Ideas" a serem consolidadas; liga-se ao fluxo "Create with AI" (chat de criação separado) vistos nos bundles.'],
  ai_talking_photo: ['Skill de tipo especial (skill_type ai_talking_photo): sem guia nem ferramentas no payload; fluxo próprio de foto falante.'],
  avatar_video_skill: ['Skill de tipo especial (skill_type avatar_video): sem guia nem ferramentas no payload; fluxo próprio de vídeo com avatar.'],
};
const PREFILL = new Set(['batch-marketing-video-generator-r1', 'url2video', 'video-language-localization']);
const skills = store.skills.map((s) => {
  const dlg = uiByName[s.display_name] || uiByName[s.display_name === 'Avatar Video' ? 'Avatar video' : s.display_name] || null; const dtext = dlg?.texto || '';
  const entry = {
    skill_id: s.skill_id, skill_name: s.skill_name, display_name: s.display_name, categorias: s.categories, tipo: s.skill_type, genero_saida: s.output_genre, origem: s.source, status: s.status, publica: s.is_public,
    versao_conteudo: s.content_version, hash_conteudo_sha256: s.content_hash, fornax_key: s.fornax_key, md_type: s.md_type, visibilidade: { agentes: s.agent_names, cenas: s.scenes, regioes: s.regions }, favoritos: s.favorite_count, fixada: s.is_pinned, prioridade: s.priority,
    ferramentas: s.tools ? { classe: 'tools', lista: s.tools } : { classe: 'tools', lista: null, nota: 'metadata.tools = null no payload' }, modelos_padrao: { video: s.video_model || null, imagem: s.image_model || null },
    descricao_comercial: { classe: 'descricao', texto: s.description },
    guide_words: s.guide_words ? { classe: PREFILL.has(s.skill_name) ? 'prefill' : 'guide_words', texto: s.guide_words } : null,
    material_guide_words: s.material_guide_words ? { classe: 'guide_words', texto: s.material_guide_words } : null,
    comportamento_inferido: { classe: 'inferido', itens: INFER[s.skill_name] || [] },
    instrucoes_privadas: { classe: 'privado', detalhe: `md_type=${s.md_type}; content_version=${s.content_version}; content_hash=${(s.content_hash || '').slice(0, 16)}…; fornax_key=${s.fornax_key}` },
    dialogo_ui: dlg ? { autor: dlg.termos?.find((t) => t[0] === 'Author')?.[1] || null, favoritos_ui: dlg.termos?.find((t) => t[0] === 'Favorites')?.[1] || null, modelos_padrao_ui: dtext.includes('Default models') ? dtext.split('Default models')[1].split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3).filter((x) => !/^[A-Z][a-z].*\.$/.test(x)) : null, tem_exemplo_em_video: (dlg.midia || []).some((m) => m.tag === 'VIDEO'), tem_conteudo_completo_da_skill: /Full skill content/i.test(dtext) } : null,
    classificacao_resumo: { prompt_integral_privado: false, guide_words_integral: !!s.guide_words, template_parametrizado: PREFILL.has(s.skill_name), workflow_comprovado: s.tools ? 'lista de ferramentas (ordem não comprovada)' : 'não declarado', instrucoes_privadas_acessiveis: false },
    evidencia_670: { servidor: `${EV670.scenario_list_skill_store} (transação request-201, POST /api/biz/v1/agent/list_skill_store)`, dialogo_ui: 'skills_observed.json (controlador CDP, sem Evidence REA)', pagina: EV670.inspect_pagina_skill },
  };
  return entry;
});
// ---- o que acontece ao clicar em "Use" (captura somente leitura via controlador CDP em 22/10/2026; nada foi enviado/gerado)
const useJ = rd('captures/skills_670/use/skills_use_capture.json'); const avJ = rd('captures/skills_670/use_avatar12/skills_use_capture.json'); const norm = (x) => (x || '').split(/\s+/).join(' ').trim();
for (const s of skills) {
  const r = useJ.resultados.find((x) => x.skill.toLowerCase() === s.display_name.toLowerCase()); if (!r) continue; const av = s.skill_name === 'avatar_video_skill' ? avJ.resultados[0] : null; const b = r.estado.body.split('\n'); const a = b.findIndex((x) => /turn ideas into videos/i.test(x)); const z = b.findIndex((x) => /^Recommended skills/.test(x)); const seg = b.slice(a + 1, z).filter(Boolean);
  const ph = [...(av || r).estado.phEls.map((x) => x.ph || ''), ...(r.estado.edit[0] ? [r.estado.edit[0].dph, r.estado.edit[0].ph, r.estado.edit[0].aph] : [])].filter(Boolean).sort((x, y) => y.length - x.length)[0] || ''; const g = s.guide_words?.texto || '';
  const sha = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; } };
  s.uso_botao_use = {
    classe: 'comportamento observado ao clicar em Use (não é prompt privado)', destino: av ? 'modal de criação do fluxo Avatar video (carrega com skeleton; conteúdo não renderizou na captura)' : 'compositor da Home (/home)',
    chip_da_skill: r.estado.btns.includes('Remove Skill'), botao_remover_skill: r.estado.btns.includes('Remove Skill'), placeholder_do_campo: { texto: ph, igual_ao_guide_words: !!g && norm(ph) === norm(g), observacao: g ? 'o guide_words aparece como placeholder esmaecido; o campo fica vazio' : 'sem guide_words: placeholder padrão do compositor' },
    bloco_de_upload: s.material_guide_words ? { texto: s.material_guide_words.texto, igual_ao_material_guide_words: seg.includes(s.material_guide_words.texto) } : null, botao_upload_referencia: r.estado.btns.includes('Upload reference material'),
    controles_do_compositor: ['Agent', 'Skills', 'Custom models', 'Preference', 'Canvas', 'Credit rules', 'Submit'].filter((x) => r.estado.btns.some((y) => y.startsWith(x))), custo_exibido: seg.join(' ').match(/\b\d+ \/s\b/)?.[0] || null,
    chamadas_ao_clicar: [...new Set((av || r).rede.map((n) => `${n.m} ${n.u.replace('https://www.pippit.ai', '')}`))], evidencia: { captura_json: 'captures/skills_670/use/skills_use_capture.json', screenshot: r.screenshot.replace('C:/w/PiperLine/', '').replace(/\\/g, '/'), screenshot_sha256: sha(r.screenshot), ...(av ? { captura_avatar: 'captures/skills_670/use_avatar12/skills_use_capture.json' } : {}) },
  };
}
const pick = (re) => scan.itens.filter((i) => re.test(i.key)); const sref = (i) => ({ chave: i.key, texto: i.text, classe: 'i18n', arquivos: i.files.map((f) => ({ arquivo: f.file, sha256: f.sha256, deslocamento: f.offset, evidencia_650_historica: hist650(f.file) })) });
const bundles = {
  esquema_skill_do_usuario: { descricao: 'Campos e regras do formulário de criação/edição de skill (bundle Skill/AgentSkill).', itens: pick(/agentskill_(create|edit|detail|btn|label)|Pippit_skill_create/).map(sref) },
  skill_de_fluxo_do_estudio_de_historias: { descricao: 'Configuração de skill por ETAPA do workflow do Estúdio de histórias: Roteiro (剧本生成), Storyboard (分镜设计), Ativos (资产设计); campos: nome, uma frase, "规则与生成策略" (como planejar um conjunto de storyboards) e "单分镜提示词格式" (estrutura de campos do prompt de cada storyboard).', itens: pick(/workflowskill/).map(sref) },
  prompts_de_hook_do_estudio_de_marketing: { descricao: 'Textos de prompt dos Hooks (botão "Ver prompt"); idioma original zh.', itens: pick(/marketingagent_hook_prompt_/).map(sref) },
  prompts_de_vitrine_do_estudio_de_marketing: { descricao: 'Pedidos de exemplo da vitrine do Estúdio de marketing; idioma original zh.', itens: pick(/marketingagent_showcase_prompt_/).map(sref) },
  modelos_de_prompt_de_ferramentas: { descricao: 'Strings com marcador {…} ou prompts fixos de ferramentas de tela/imagem/vídeo.', itens: pick(/seedream50pro_prompt_|xyqcanvas_legacy_prompt_|xyqcanvas_videominitool_prompt_|prompt_extend|refinevideocopy/).map(sref) },
};
const uniqFiles = new Set(); for (const g of Object.values(bundles)) for (const i of g.itens) for (const f of i.arquivos) uniqFiles.add(f.arquivo);
const out = {
  catalogo: 'PIPPIT_SKILLS_PROMPTS_CATALOG', versao: 1, gerado_em: new Date().toISOString(),
  rea: { mcp_usado: '6.7.0 (binary_session: server rea 6.7.0, pacote rea-agents 6.7.0)', observacao: 'Evidências 6.7.0 e evidências históricas 6.5.0 ficam separadas; IDs antigos NÃO foram substituídos e não são reproduzidos pela 6.7.0 (ver CLAUDE.md).' },
  evidencias_670: EV670,
  evidencias_historicas_650: { bundles_analisados: [...uniqFiles].map((f) => ({ arquivo: f, evidence_id_650: hist650(f) })), indice: 'evidence_cli/auth_bundles/INDEX.md' },
  arquivos_derivados: { skills_store_extract_670: { caminho: 'captures/skills_670/skills_store_extract_670.json', sha256: sha('captures/skills_670/skills_store_extract_670.json') }, resposta_servidor: { caminho: 'captures/skills_670/api/list_skill_store_request-201_response.json', sha256: sha('captures/skills_670/api/list_skill_store_request-201_response.json') }, dialogos_ui: { caminho: 'captures/skills_670/skills_observed.json', sha256: sha('captures/skills_670/skills_observed.json') }, varredura_bundles: { caminho: 'notes/skill_strings_scan.json', sha256: sha('notes/skill_strings_scan.json') }, bundle_exportado_rea: { caminho: 'captures/skills_670/session_bundle_670_a.json', sha256: sha('captures/skills_670/session_bundle_670_a.json') } },
  classes: CLASSES, categorias_da_loja: [{ nome: 'Short Drama', id: 'tag_9274d6aa0115b433' }, { nome: 'Marketing Advertising', id: 'tag_7bd0932bcf16379e' }, { nome: 'Professional film and television', id: 'tag_f4a4186216673946' }],
  loja: { total: store.total, has_more: store.has_more, observacao: 'A lista completa tem 13 skills oficiais (has_more=false). "GPT Image 2"/"SD 2.5" são modelos padrão, não skills.' },
  skills, bundles,
  lacunas: [
    'O corpo (SKILL.md) das skills oficiais NÃO é entregue ao cliente: md_type=tos com content_hash/content_version e fornax_key (plataforma de prompts). Nenhum prompt de sistema integral foi encontrado.',
    'O diálogo Details das skills oficiais não mostra "Full skill content"; só descrição, modelos padrão, autor, favoritos, exemplo em vídeo e categoria.',
    'A ordem de execução das ferramentas de cada skill e as regras de aprovação não estão comprovadas além dos textos de guide_words.',
    'Marketing Video, AI talking photo e Avatar Video não declaram ferramentas no payload (tools=null).',
    'Observar uma execução real de skill (load_skill, tool calls, SSE) exigiria gerar com créditos: não feito.',
    'Os views javascript/javascript-facts do REA 6.7.0 retornam estrutura (módulos, exports, referências), não literais de texto: as strings i18n vêm de varredura offline do código dos bundles (sha256 registrados). Só o chunk Skill (24 KB) foi reanalisado na 6.7.0.',
    'Conteúdo servido do Estúdio de marketing (listas de Hook/Style/Play completas) e das skills de fluxo do Estúdio de histórias por etapa não foi lido da API.',
  ],
};
fs.writeFileSync(`${R}/PIPPIT_SKILLS_PROMPTS_CATALOG.json`, JSON.stringify(out, null, 1));
// ---- Markdown
const L = []; const h = (s) => L.push(s);
h('# Catálogo de Skills do Pippit: prompts, guias, ferramentas e workflows'); h('');
h(`Gerado em ${out.gerado_em} por \`notes/build_skills_catalog.mjs\` (dados completos em \`PIPPIT_SKILLS_PROMPTS_CATALOG.json\`). **Instruções privadas das skills oficiais NÃO foram encontradas**; abaixo está tudo o que o servidor/cliente realmente entrega, com a CLASSE de cada item.`); h('');
h('## Classes (como ler cada item)'); h(''); for (const [k, v] of Object.entries(CLASSES)) h(`- **${k}**: ${v}`); h('');
h('## Método e versões do REA'); h('');
h(`- Captura do servidor com o **REA MCP 6.7.0** (\`capture_browser_scenario\`, conectado à aba logada do usuário, somente leitura): Evidence \`${EV670.scenario_list_skill_store}\`; página \`${EV670.inspect_pagina_skill}\`; alvos \`${EV670.lista_alvos_cdp}\`. Bundle exportado: \`captures/skills_670/session_bundle_670_a.json\`.`);
h(`- Chunk Skill (24 KB) reanalisado na 6.7.0: análise \`${EV670.analise_js_bundle_Skill_pai}\`; resumo \`${EV670.analise_js_bundle_Skill_resumo}\`; view \`javascript-facts\` \`${EV670.visao_javascript_facts}\` (104 fatos estruturais).`);
h('- Evidências **históricas 6.5.0** (250 bundles) permanecem intactas em `evidence_cli/auth_bundles/` e são citadas por arquivo; seus `evidence_id` NÃO são reproduzidos pela 6.7.0.'); h('- Strings de interface: varredura offline dos 250 bundles já baixados (`notes/skill_strings_scan.json`: 11.029 pares i18n, 2.703 relacionados), sem reanálise e sem executar código.'); h('');
h('## Skills oficiais da loja (13)'); h(''); h('| Skill | skill_name | Categorias | Ferramentas | Modelos padrão | guide_words | v |'); h('|---|---|---|---|---|---|---|');
for (const s of skills) h(`| ${s.display_name} | \`${s.skill_name}\` | ${(s.categorias || []).join(', ') || '-'} | ${s.ferramentas.lista ? s.ferramentas.lista.length : 'n/d'} | ${[s.modelos_padrao.video, s.modelos_padrao.imagem].filter(Boolean).join(' + ') || '-'} | ${s.guide_words ? (s.guide_words.classe === 'prefill' ? 'template' : 'integral') : '-'} | ${s.versao_conteudo} |`);
h(''); h('## O que o botão Use mostra (compositor da Home)'); h('');
h('Capturado nas 13 skills (`captures/skills_670/use/`, screenshots por skill; referência do usuário `captures/skills_670/user_screenshot_use_marketing_video.png`). **Selecionar uma skill não gera nada**: o compositor mostra, antes de qualquer envio: (1) chip com o nome da skill e “Remove Skill”; (2) o `guide_words` EXATO como placeholder esmaecido do campo (campo vazio); (3) quando existe `material_guide_words`, um bloco de upload com esse texto (Drama Ads, Vlog Generator, Creator Commerce, Viral Replication, Marketing Video); (4) botões Agent, Skills, Custom models | Preference, Canvas, custo (“37 /s”), Credit rules, Submit. Calls ao clicar: `agent/get_available_model_list` (scene web_unified_agent), `agent/list_homepage_recommended_skill` (limit 20; devolve 6 skills no mesmo formato do store), `benefits/user_credit` e `credit_receive`. **AI talking photo** volta à Home sem chip (placeholder padrão “Describe your ideas, Pippit will create with you.”); **Avatar video** abre um modal de criação (chamadas `videogen/digital_human_filter_config`, `digital_human/get_item_list`, `videogen/recommend_digital_human_by_tag`, `commerce/get_commerce_auth_info`, `videogen/check`). Na Home, “Recommended skills” mostra 6 (Drama Ads, Marketing Video, Vlog Generator, Avatar video, Viral Replication, AI talking photo) com ↵ (usa no compositor) ou ↗ (abre outro fluxo: Avatar video e AI talking photo). Submenu More da barra lateral: Video generator, Avatars and voices, Analytics, **Publisher**.'); h('');
h('## Detalhe por skill'); h('');
for (const s of skills) {
  h(`### ${s.display_name} (\`${s.skill_name}\`)`); h('');
  h(`- ID \`${s.skill_id}\`; tipo \`${s.tipo}\`; origem \`${s.origem}\`; versão do conteúdo ${s.versao_conteudo}; hash \`${(s.hash_conteudo_sha256 || '').slice(0, 16)}…\`; fornax_key \`${s.fornax_key}\`; favoritos ${s.favoritos ?? 'n/d'}; autor na UI: ${s.dialogo_ui?.autor || 'n/d'}.`);
  h(`- **Descrição comercial** (classe descricao): ${s.descricao_comercial.texto}`);
  h(`- **Ferramentas** (classe tools): ${s.ferramentas.lista ? s.ferramentas.lista.map((t) => `\`${t}\``).join(', ') : '_não declaradas (tools = null)_'}`);
  h(`- **Modelos padrão**: vídeo ${s.modelos_padrao.video || '-'}; imagem ${s.modelos_padrao.imagem || '-'}`);
  if (s.guide_words) { h(`- **${s.guide_words.classe === 'prefill' ? 'Template parametrizado (pedido pré-preenchido)' : 'guide_words (texto integral do servidor)'}**:`); h(''); h(s.guide_words.texto.split('\n').map((x) => `  > ${x}`).join('\n')); h(''); }
  if (s.material_guide_words) h(`- **material_guide_words** (guia de ativos): ${s.material_guide_words.texto}`);
  if (s.comportamento_inferido.itens.length) { h('- **Comportamento inferido** (não é instrução original):'); for (const i of s.comportamento_inferido.itens) h(`  - ${i}`); }
  if (s.uso_botao_use) { const u = s.uso_botao_use; h(`- **Ao clicar em Use** (observado, somente leitura): destino ${u.destino}; chip da skill ${u.chip_da_skill ? 'sim (com “Remove Skill”)' : 'não'}; placeholder do campo ${u.placeholder_do_campo.igual_ao_guide_words ? '= guide_words exato' : u.placeholder_do_campo.observacao}; ${u.bloco_de_upload ? `bloco de upload “${u.bloco_de_upload.texto}”` : 'sem bloco de upload'}; botão “Upload reference material” ${u.botao_upload_referencia ? 'sim' : 'não'}; custo exibido ${u.custo_exibido || 'n/d'}.`); }
  h(`- **Instruções privadas**: não acessíveis (${s.instrucoes_privadas.detalhe}).`); h('');
}
h('## Strings embutidas nos bundles (classe i18n)'); h('');
for (const [k, g] of Object.entries(bundles)) { h(`### ${k}`); h(''); h(g.descricao); h(''); h(`${g.itens.length} itens. Amostra:`); h(''); for (const i of g.itens.slice(0, 14)) h(`- \`${i.chave}\` → ${i.texto.replace(/\n/g, ' ⏎ ').slice(0, 220)}`); if (g.itens.length > 14) h(`- … (+${g.itens.length - 14}; todos no JSON)`); h(''); }
h('## Lacunas'); h(''); for (const x of out.lacunas) h(`- ${x}`); h('');
fs.writeFileSync(`${R}/PIPPIT_SKILLS_PROMPTS_CATALOG.md`, L.join('\n'));
console.log({ skills: skills.length, bundlesEvidencias: [...uniqFiles].length, grupos: Object.fromEntries(Object.entries(bundles).map(([k, g]) => [k, g.itens.length])) });

// ---- dados estruturados para o app local (somente campos observados no servidor; sem instruções privadas)
const LOCAL_ID = { 'skill-creator': 'criar-habilidades', 'storyline-advertisement': 'anuncios-de-drama', story_short_film: 'shorts-de-historia', 'seedance-vlog-maker-v2': 'gerador-de-vlog', 'expert-product-promotion': 'creator-commerce', 'character-reference-sheet': 'renderizacao-3-visualizacoes', imitation_video: 'replicacao-viral', 'batch-marketing-video-generator-r1': 'geracao-em-lote', url2video: 'url-do-video', 'video-language-localization': 'traducao-de-video', nest_skills_marketing_video_v2: 'video-de-marketing', ai_talking_photo: 'foto-falante-de-ia', avatar_video_skill: 'video-de-avatar' };
const official = { _fonte: { evidencia_670: EV670.scenario_list_skill_store, resposta_sha256: store.fonte.resposta_sha256, observacao: 'Campos observados no payload list_skill_store. guideWords/materialGuide são textos do servidor entregues ao usuário (não as instruções privadas).' } };
for (const s of skills) { const id = LOCAL_ID[s.skill_name]; if (!id) continue; official[id] = { skillName: s.skill_name, skillId: s.skill_id, displayName: s.display_name, categories: s.categorias, tools: s.ferramentas.lista, defaultModels: s.modelos_padrao, guideWords: s.guide_words?.texto || '', guideKind: s.guide_words?.classe || null, materialGuide: s.material_guide_words?.texto || '', contentVersion: s.versao_conteudo, outputGenre: s.genero_saida, skillType: s.tipo, favorites: s.favoritos }; }
fs.writeFileSync(`${R}/local_reconstruction/app/lib/official_skills.json`, JSON.stringify(official, null, 1)); console.log('official_skills.json:', Object.keys(official).length - 1, 'skills');
