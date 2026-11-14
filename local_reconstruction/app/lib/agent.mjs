// Agente/Workflow local. Fluxo observado: habilidades -> arquivo lido -> pergunta (se faltar tema) -> design doc -> storyboard ->
// confirmacao de producao -> segmentos (<= limite do modelo, continuidade pelo ultimo quadro) -> render final.
// PLANEJADOR: LLM configurado (Ollama/compativel com OpenAI; ctx.llm) quando disponivel, com FALLBACK para regras locais; NAO e o LLM do Pippit (prompt interno desconhecido).
// GERACAO: tarefas enviadas ao provedor de VIDEO configurado pelo usuario (JobManager, src/providers.mjs); sem provedor/autorizacao as tarefas ficam BLOQUEADAS (nao simuladas).
// 'local-ffmpeg' gera apenas um ANIMATIC (cartoes com a descricao do storyboard) claramente rotulado — NAO e video gerado.
import { formToQuestionnaire } from './questionnaire.mjs';
import { officialSkillName, preloadSkillPart, questionnaireAnswerParts } from './agent_contract.mjs';
import path from 'node:path';
import { planSegments, checkModelAccess } from '../../src/workflow.mjs';
import { VIDEO_MODELS, SKILLS, videoCost, NEEDS } from './catalog.mjs';
import * as media from './media.mjs';
import { llmThemeOptions, llmStoryboard } from '../../src/llm.mjs';
import { skillDef, missingInputs } from './skilldefs.mjs';
import { isConfigured } from '../../src/providers.mjs';
const now = () => new Date().toISOString();
const msg = (role, o) => { const m = { id: String(Math.random()).slice(2), t: now(), role, ...o }; if (m.form) { const q = formToQuestionnaire(m.form); if (q) m.questionnaire = q; } return m; };

export function parseRequest(text) {
  const sec = /(\d{1,3})\s*(s\b|seg|segundos?)/i.exec(text); const ratio = /(9:16|16:9|1:1|3:4|4:3|21:9)/.exec(text);
  return { seconds: sec ? Math.min(Number(sec[1]), 300) : 15, ratio: ratio ? ratio[1] : '9:16', lang: /english|inglês/i.test(text) ? 'English' : 'Português (Brasil)', subtitles: /legenda/i.test(text) ? 'Ativadas' : 'Unspecified' };
}
export function pickSkill(text) {
  const t = text.toLowerCase();
  const rules = [['vlog', 'gerador-de-vlog'], ['unbox|produto|anúncio|anuncio', 'creator-commerce'], ['drama', 'anuncios-de-drama'], ['viral|replic', 'replicacao-viral'], ['história|historia|roteiro|curta', 'shorts-de-historia']];
  for (const [re, id] of rules) if (new RegExp(re).test(t)) return SKILLS.find((s) => s.id === id);
  return SKILLS.find((s) => s.id === 'shorts-de-historia');
}
export function themeOptions(text) {
  const subj = (text.match(/(?:com|sobre|de)\s+([^,.\n]{3,40})/i) || [])[1] || 'o personagem';
  return [`A lição da amizade — ${subj} ajuda um novo amigo e aprende a compartilhar.`, `O pequeno milagre — ${subj} encontra uma situação difícil e descobre uma mensagem de esperança.`, `A aventura — ${subj} segue uma luz misteriosa e ajuda alguém.`, 'Outro tema — descreva em uma frase.'];
}
export function designDoc(req, theme, model, maxSeg, attachments, story, skill = null) {
  return `# Design Criativo\n\n## Estilo Geral\nUnspecified\n\n## Restrições Rígidas do Usuário\n- Duração total: ${req.seconds} segundos\n- Idioma: ${req.lang}\n- Legendas: ${req.subtitles}\n- BGM: Unspecified\n- Proporção do vídeo: ${req.ratio}\n- Uso de ativos: ${attachments.length ? 'usar diretamente a referência visual enviada' : 'nenhum ativo enviado'}\n\n## Requisitos Adicionais do Usuário\n- Tema: ${theme}\n- Modelo: ${model.name}\n- Limite por chamada: ${maxSeg} segundos\n\n## Linha da História\n${theme}\n\n## Estilo\n${story?.estilo || 'Unspecified'}\n\n## Elementos do Roteiro\n${story ? story.segmentos.map((g, i) => `- ${i + 1}. ${g.titulo}${g.fala ? ` — fala: "${g.fala}"` : ''}`).join('\n') : '(Personagens, cenas e voz derivados do pedido; veja storyboard.md)'}\n${skill ? `\n## Habilidade\n- ${skill.name}\n- Aprovação: ${skill.approval || 'storyboard'}\n- Etapas: ${skill.stages.join(' → ')}\n` : ''}`;
}
// Prompt de geracao de cada segmento (vira o `prompt` enviado ao provedor; >= 15 caracteres como exige o Pippit)
export function segmentPrompt({ story, i, req, theme, segs }) {
  const sg = story?.segmentos?.[i]; const style = story?.estilo ? `Estilo: ${story.estilo}. ` : '';
  const base = sg ? `${sg.titulo}. ${sg.descricao}` : `${theme} — parte ${i + 1} de ${segs.length}`; const prompt = `${style}${base}`.replace(/\s+/g, ' ').trim();
  return prompt.length >= 15 ? prompt : `${prompt} — plano cinematográfico`;
}
export function promptsDoc(segs, ctx2) {
  return `# Prompts de geração\n\n` + segs.map((s, i) => `## ${s.id} (${s.seconds}s)\n${segmentPrompt({ ...ctx2, i, segs })}\n`).join('\n');
}
export function storyboardDoc(segs, theme, story) {
  return `# Storyboard\nTema: ${theme}\n\n` + segs.map((s, i) => `## ${s.id} (${s.seconds}s)${story ? ` — ${story.segmentos[i].titulo}` : ''}\n${i ? `Continua de ${s.continuesFrom}` : 'Abertura'}\n${story ? story.segmentos[i].descricao + '\n' : ''}`).join('\n');
}
// ctx: { db, addDoc(project,title,text)->node, addNode(project,type,title,extra)->node, link(project,a,b), linkId(project,aId,bId), addAsset(name,file,kind,cat)->asset, assetPath(id), mediaDir }
// executa uma etapa de planejamento por LLM; qualquer falha vira aviso (steps) e o chamador cai nas regras locais
async function tryLLM(ctx, steps, label, fn) {
  if (!ctx.llm) return null;
  try { return await fn(); } catch (e) { steps.push({ label: `Planejamento por IA indisponível (${label})`, state: 'warning', reason: String(e.message || e).slice(0, 200) }); return null; }
}
export async function userMessage(ctx, project, chat, body) {
  const { text = '', attachments = [], answer, confirmation, modelId, skillId } = body; const st = (chat.state ||= {});
  const steps = []; const model = VIDEO_MODELS.find((m) => m.id === (modelId || st.modelId || 'seedance-2.5')) || VIDEO_MODELS[1];
  // `wire`: como o Pippit serializaria esta mensagem (contrato estatico, PIPPIT_AGENT_CONTRACT.md); informativo, nada e enviado ao Pippit
  const skillWire = !st.skill && skillId && officialSkillName(skillId) ? [preloadSkillPart(officialSkillName(skillId))] : undefined;
  if (text) chat.messages.push(msg('user', { text, attachments, ...(skillWire ? { wire: skillWire } : {}) }));
  if (!st.request) { st.request = { text, ...parseRequest(text), attachments }; st.modelId = model.id; }
  const req = st.request;
  if (!st.skill) { st.skillChosen = !!skillId; st.skill = skillId || pickSkill(req.text).id; st.skillGuide = ctx.skillGuide?.(st.skill) || null; steps.push({ label: 'Habilidades carregadas', state: 'completed', skill: st.skill, skillName: st.skillGuide?.name, chosenByUser: st.skillChosen }); attachments.forEach(() => steps.push({ label: 'Arquivo lido', state: 'completed' })); }
  // Skill escolhida pelo usuário com definição própria (app/lib/skilldefs.mjs): confere entradas, desvia saídas especiais e registra etapas/aprovação
  const def = st.skillChosen ? skillDef(st.skill) : null; const skName = SKILLS.find((x) => x.id === st.skill)?.name || st.skillGuide?.name || '';
  if (st.awaiting?.type === 'skill_inputs' && (text || attachments.length)) {
    if (/continuar assim mesmo|prosseguir assim|seguir assim/i.test(text)) st.skillInputsAck = true; else { req.text = `${req.text}\n${text}`.trim(); req.attachments = [...(req.attachments || []), ...attachments]; Object.assign(req, parseRequest(req.text)); }
    st.awaiting = null;
  }
  if (def && (def.output === 'skill' || def.output === 'special')) { st.done = true; chat.messages.push(msg('agent', { text: def.output === 'skill' ? 'Esta skill cria skills: abra Habilidades > Criar skill > Criar com IA e descreva a ideia (o LLM local escreve nome, descrição e instruções).' : 'Esta skill usa um fluxo próprio de avatar (Avatares), que depende da geração em avatar do Pippit e não está disponível localmente. Nada foi gerado.', steps, link: def.output === 'skill' ? '#/skills' : '#/avatars' })); return chat; }
  if (def && !st.plan && !st.skillGateDone) {
    const miss = st.skillInputsAck ? [] : missingInputs(def, { text: req.text, attachments: req.attachments || [] });
    if (miss.length) { st.awaiting = { type: 'skill_inputs', missing: miss.map((m) => ({ id: m.id, label: m.label, hint: m.hint || '' })) }; steps.push({ label: 'Entradas da skill conferidas', state: 'warning', reason: `faltam: ${miss.map((m) => m.label).join('; ')}` }); chat.messages.push(msg('agent', { text: `Para a skill “${skName}” ainda preciso de: ${miss.map((m) => `${m.label}${m.hint ? ` (${m.hint})` : ''}`).join(' · ')}. Envie o que falta (texto e/ou anexos) ou responda “continuar assim mesmo”. (A conferência é por palavras-chave e anexos e pode errar.)`, steps, form: st.awaiting })); return chat; }
    st.skillGateDone = true; steps.push({ label: 'Entradas da skill conferidas', state: 'completed' });
  }
  if (def?.output === 'image_sheet' && !st.sheetDone) {
    const prompt = `${def.sheet} Personagem: ${req.text.replace(/\s+/g, ' ').trim().slice(0, 600)}`; const nRefs = (req.attachments || []).length;
    const doc = ctx.addDoc(project, 'character_sheet.md', `# Folha de referência (3 vistas)\n\n${def.planning}\n\n## Prompt de imagem\n${prompt}\n\n## Entradas\n${nRefs ? `${nRefs} imagem(ns) de referência anexada(s).` : 'Sem imagem anexada: usar a descrição.'}\n`); const node = ctx.addNode(project, 'Imagem', 'folha_3_vistas', {}); if (node.panel) node.panel.prompt = prompt; ctx.linkId(project, doc.id, node.id);
    st.sheetDone = true; st.done = true; const has = ctx.providers?.image && ctx.providers.image.adapter; steps.push({ label: 'Prompt da folha 16:9 criado', state: 'completed' }, { label: 'Geração da imagem', state: 'warning', reason: has ? 'aguardando você gerar pelo nó (provedor de imagem configurado)' : 'sem provedor de imagem configurado' });
    chat.messages.push(msg('agent', { text: 'Preparei a folha de referência 16:9 (rosto em close + frente, lateral e costas) no documento character_sheet.md e no nó “folha_3_vistas”. NADA foi gerado: gerar a imagem exige um provedor de imagem configurado e a sua autorização de gasto (Configurações > Assistente de IA > Provedores).', steps })); return chat;
  }
  if (def?.analysisOnly && def.analysisOnly.test(req.text) && !st.analysisDone) {
    ctx.addDoc(project, 'analise_referencia.md', `# Análise da referência (modo só análise)\n\n${def.planning}\n\n## Pedido\n${req.text.slice(0, 800)}\n\n## O que seria analisado\n- Gancho de abertura\n- Estrutura e ritmo\n- Pontos remixáveis (pessoa, cena, tema, produto)\n\n> A análise do CONTEÚDO do vídeo exige um modelo de visão/áudio; sem provedor, este documento só registra o pedido e o roteiro de análise.\n`);
    st.analysisDone = true; st.done = true; steps.push({ label: 'Roteiro de análise criado', state: 'completed' }, { label: 'Análise do vídeo de referência', state: 'warning', reason: 'exige modelo de visão (sem provedor)' }); chat.messages.push(msg('agent', { text: 'Modo só análise: registrei o roteiro de análise em analise_referencia.md. Analisar o conteúdo do vídeo exige um modelo de visão; nada foi gerado.', steps })); return chat;
  }
  if (answer && st.awaiting?.type === 'question') { st.theme = answer; st.awaiting = null; const qn = [...chat.messages].reverse().find((m) => m.questionnaire)?.questionnaire; const wire = qn ? qn.questions.flatMap((q) => questionnaireAnswerParts(q, answer)) : []; chat.messages.push(msg('user', { text: answer, ...(wire.length ? { wire } : {}) })); }
  if (!st.theme && req.text.trim().length < 140) {
    const ai = await tryLLM(ctx, steps, 'temas', () => llmThemeOptions(ctx.llm, req.text, st.skillChosen ? st.skillGuide : null)); st.planner = ai ? `LLM ${ctx.llm.label}` : 'regras locais';
    st.awaiting = { type: 'question', options: ai ? [...ai, 'Outro tema — descreva em uma frase.'] : themeOptions(req.text) };
    chat.messages.push(msg('agent', { text: `Para criar ${req.seconds} segundos com uma narrativa clara, preciso definir o tema principal. Escolha uma opção: (sugestões: ${st.planner})`, steps, form: st.awaiting })); return chat;
  }
  st.theme ||= req.text;
  const maxSeg = Math.min(model.maxSeconds || 15, 15);
  if (!st.plan) {
    const segs = planSegments(req.seconds, maxSeg); st.plan = { segs, maxSeg };
    const story = await tryLLM(ctx, steps, 'storyboard', () => llmStoryboard(ctx.llm, { theme: st.theme, request: req.text, segs, skill: st.skillChosen ? st.skillGuide : null })); st.story = story; st.planner = story ? `LLM ${ctx.llm.label}` : (st.planner || 'regras locais');
    const design = ctx.addDoc(project, 'creative_design.md', designDoc(req, st.theme, model, maxSeg, req.attachments, story, def ? { name: skName, approval: def.approval, stages: def.stages } : null)); const sb = ctx.addDoc(project, 'storyboard.md', storyboardDoc(segs, st.theme, story));
    const pr = ctx.addDoc(project, 'generation_prompts.md', promptsDoc(segs, { story, req, theme: st.theme })); ctx.link(project, design, sb); ctx.link(project, sb, pr);
    steps.push({ label: 'Planos criados', state: 'completed' }, { label: 'Prompts de geração criados', state: 'completed' }, { label: 'Solicitação executada', state: 'completed' });
    st.docs = { design: design.id, storyboard: sb.id, prompts: pr.id };
  }
  const cost = ctx.db.settings.provider === 'local-ffmpeg' ? 0 : videoCost(model.id, req.seconds); // provedor local nao cobra creditos
  if (!confirmation && !st.confirmed) {
    st.awaiting = { type: 'confirm_production', options: { mode: ['Gerar os segmentos em paralelo', 'Gerar em sequência usando o último quadro como referência', 'Quero revisar o storyboard'], autoContinue: ['Sim, continuar automaticamente', 'Não, confirmar cada segmento'] }, segments: st.plan.segs.length, estimatedCredits: cost };
    chat.messages.push(msg('agent', { text: `O storyboard está pronto: serão ${st.plan.segs.length} segmento(s) de até ${maxSeg} s, totalizando ${req.seconds} s. (Planejado por: ${st.planner || 'regras locais'})${def?.approval === 'storyboard-e-prompts' ? ' Antes de gerar, revise o storyboard e os prompts exatos em generation_prompts.md: qualquer mudança material pede nova aprovação.' : ''}`, steps, form: st.awaiting })); return chat;
  }
  if (confirmation) { st.confirmed = confirmation; st.awaiting = null; }
  const conf = ctx.db.settings.creditConfirm;
  if (cost && conf.mode === 'threshold' && cost > conf.limit && !st.creditOk && !(confirmation && confirmation.creditOk)) {
    st.awaiting = { type: 'credit_confirm', estimatedCredits: cost, limit: conf.limit };
    chat.messages.push(msg('agent', { text: `Esta tarefa custa cerca de ${cost} créditos, acima do limite de ${conf.limit}. Confirmar?`, steps, form: st.awaiting })); return chat;
  }
  st.creditOk = true; return runGeneration(ctx, project, chat, st, model, steps);
}
async function runGeneration(ctx, project, chat, st, model, steps) {
  const req = st.request; const plan = st.plan; const access = checkModelAccess(model, ctx.db.user.plan);
  const provider = ctx.db.settings.provider || 'none'; const vcfg = ctx.providers?.video; const real = isConfigured(vcfg, 'video');
  if (!access.ok && !real) { steps.push({ label: access.error, state: 'failed', upsell: access.upsell }); chat.messages.push(msg('agent', { text: 'A geração foi bloqueada porque o modelo exige assinatura. Nenhum crédito foi consumido.', steps })); return chat; }
  if (st.jobIds?.length || st.runIds?.length) { chat.messages.push(msg('agent', { text: 'As tarefas de geração deste projeto já foram criadas. Acompanhe em Tarefas.', steps })); return chat; }
  // 0) Sem provedor de vídeo "do usuário" e sem o animatic local escolhido: usa o ROTEADOR GRATUITO (NovAI). Um clipe de 5 s
  // por segmento, um de cada vez (fila do servidor); cada resultado entra no Canvas deste projeto. Se o roteador estiver
  // bloqueado (cota do provedor), a própria tarefa mostra o motivo exato no chat — nada é simulado.
  if (!real && provider !== 'local-ffmpeg' && ctx.routerVideo?.available()) {
    const runs = plan.segs.map((s, si) => ctx.routerVideo.create(project, chat, segmentPrompt({ story: st.story, i: si, req, theme: st.theme, segs: plan.segs }), { segId: s.id, index: si }));
    st.runIds = runs.map((x) => x.id); st.workflow = { state: 'generating', mode: 'roteador', startedAt: now() };
    steps.push({ label: 'Vídeos enviados ao roteador gratuito', state: 'completed', count: runs.length });
    chat.messages.push(msg('agent', { text: `Geração iniciada pelo roteador gratuito: ${runs.length} clipe(s) de 5 s (NovAI · cogvideox-flash), um de cada vez. O progresso aparece em Tarefas e cada vídeo entra no Canvas ao terminar. Obs.: o provedor gratuito limita a poucos vídeos por dia; se a cota acabar, a tarefa mostra o motivo.`, steps, runs: st.runIds })); return chat;
  }
  // 1) provedor de VIDEO real (ou ainda nao configurado): cria as tarefas; elas ficam bloqueadas com o motivo exato se faltar provedor/autorizacao
  if (real || provider !== 'local-ffmpeg') {
    const sequential = /sequ/i.test(JSON.stringify(st.confirmed || '')); const jobs = []; let prev = null;
    for (const [si, s] of plan.segs.entries()) {
      const job = ctx.jobs.create({ title: `${project.id}_${s.id}`, prompt: segmentPrompt({ story: st.story, i: si, req, theme: st.theme, segs: plan.segs }), params: { seconds: s.seconds, ratio: req.ratio }, source: { type: 'agent', projectId: project.id, chatId: chat.id, segId: s.id, index: si }, after: sequential ? prev?.id : undefined, referenceAssetId: !sequential && si === 0 && req.attachments?.[0] ? req.attachments[0] : undefined });
      jobs.push(job); prev = job;
    }
    st.jobIds = jobs.map((j) => j.id); st.workflow = { state: 'generating', mode: sequential ? 'sequencial' : 'paralelo', startedAt: now() }; await ctx.jobs.tick();
    const blocked = jobs.find((j) => j.state === 'blocked');
    steps.push({ label: 'Tarefas de geração criadas', state: 'completed', count: jobs.length });
    if (blocked) { steps.push({ label: 'Aguardando provedor de vídeo', state: 'warning', reason: blocked.error }); chat.messages.push(msg('agent', { text: `${jobs.length} tarefa(s) de geração de vídeo foram preparadas com os prompts do storyboard, mas NÃO foram enviadas: ${blocked.error}. Configure o provedor e elas seguem automaticamente (nada foi gerado nem cobrado).`, steps, jobs: st.jobIds })); return chat; }
    chat.messages.push(msg('agent', { text: `Geração iniciada: ${jobs.length} tarefa(s) enviadas ao provedor ${vcfg.adapter} (${vcfg.model}), modo ${st.workflow.mode}. Quando todas terminarem, o app narra (se houver voz), compõe o vídeo, cria o projeto no editor e exporta o resultado.`, steps, jobs: st.jobIds })); return chat;
  }
  // 2) ANIMATIC local (nao-IA): so uma previa do storyboard — nunca apresentada como video gerado
  if (!media.available()) { steps.push({ label: 'ffmpeg indisponível', state: 'failed' }); chat.messages.push(msg('agent', { text: 'ffmpeg não encontrado.', steps })); return chat; }
  const files = []; let prevFrame = req.attachments?.[0] ? ctx.assetPath(req.attachments[0]) : null;
  for (const [si, s] of plan.segs.entries()) {
    const f = path.join(ctx.mediaDir, `${project.id}_animatic_${s.id}.mp4`); const ref = prevFrame; const sg = st.story?.segmentos[si];
    media.generateLocalVideo(f, { seconds: s.seconds, ratio: req.ratio, image: ref, caption: sg ? `${sg.titulo}: ${sg.descricao}` : undefined });
    const a = ctx.addAsset(`animatic_${s.id}.mp4`, f, 'video', 'works'); const n = ctx.addNode(project, 'Vídeo', `animatic_${s.id}.mp4`, { assetId: a.id, animatic: true }); ctx.linkId(project, st.docs.storyboard, n.id);
    steps.push({ label: 'Animatic gerado (prévia, não é vídeo gerado)', state: 'completed', duration: s.seconds, provider: 'animatic local (não-IA)' }); files.push(f);
    const lf = path.join(ctx.mediaDir, `${project.id}_${s.id}_lastframe.png`); media.lastFrame(f, lf); prevFrame = lf; ctx.addNode(project, 'Imagem', `${s.id}_lastframe.png`, {});
  }
  const out = path.join(ctx.mediaDir, `${project.id}_animatic.mp4`); const info = media.concat(files, out);
  const fa = ctx.addAsset('animatic.mp4', out, 'video', 'works'); const fn = ctx.addNode(project, 'Vídeo', 'animatic.mp4', { assetId: fa.id, animatic: true });
  steps.push({ label: 'Animatic montado', state: 'completed', duration: Math.round(info.duration * 10) / 10 });
  chat.messages.push(msg('agent', { text: `Animatic concluído: ${Math.round(info.duration * 10) / 10} s, ${info.width}×${info.height}, ${plan.segs.length} segmento(s). ATENÇÃO: é uma prévia do storyboard (cartões com a descrição de cada cena), NÃO um vídeo gerado por IA. Para gerar vídeo de verdade, configure um provedor de vídeo em Configurações > Assistente de IA.`, steps, artifacts: [{ assetId: fa.id, nodeId: fn.id, animatic: true }] }));
  st.done = true; st.animatic = true; return chat;
}
