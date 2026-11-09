// Contrato do agente do Pippit (submit_run) — SOMENTE o que foi provado. Fonte: analise estatica dos bundles autenticados (notes/bundle_ctx.mjs)
// + 2 submit_run observados (notes/_submit_runs_observed.json). Detalhes e evidencias: PIPPIT_AGENT_CONTRACT.md.
// Aqui ficam funcoes puras; nada e enviado ao Pippit. Valores desconhecidos nao sao inventados (ficam fora ou 'undefined').
import fs from 'node:fs';
const OFFICIAL = JSON.parse(fs.readFileSync(new URL('./official_skills.json', import.meta.url), 'utf8'));

// generate_mode: validador (async__159201 mod 361865) aceita so estes 4. Mapa categoria->valor: async__HomePageV5 mod 964076.
export const GENERATE_MODES = ['agent', 'video_gen', 'image_gen', 'audio_gen'];
const MODE_BY_CATEGORY = { agent: 'agent', audio: 'audio_gen', image: 'image_gen', video: 'video_gen' };
// generationType -> categoria (HomePageV5 mod 2975 fn s); qualquer outro valor => erro 'unsupported_generation_type'
export function generateModeFor(generationType) {
  const cat = (() => { switch (generationType ?? 'agent') { case 'agent': case 'nest_agent': return 'agent'; case 'image': return 'image'; case 'audio': return 'audio'; case 'video': case 'video_part': case 'videoPart': return 'video'; default: throw new Error('unsupported_generation_type'); } })();
  return MODE_BY_CATEGORY[cat];
}

// Agentes de geracao direta (async__850206 @332367): agent_name, entrance_from e tool_name por tipo
export const DIRECT = {
  video: { agent_name: 'pippit_video_part_agent', entrance_from: 'web_video_direct', tool_name: 'biz/x_tool_name_video_part', edit_type: 'video_part', run_source: 'video_part' },
  image: { agent_name: 'pippit_image_part_agent', entrance_from: 'web_image_direct', tool_name: 'biz/x_tool_name_image_part', edit_type: 'image_generation' },
  audio: { agent_name: 'pippit_audio_part_agent', entrance_from: 'web_audio_direct', tool_name: 'biz/x_tool_name_audio_part', edit_type: 'audio_generation' },
};

// pre_activate_skills_type (async__975399 @71931 fn o): official <- official|platform_recommend; personal <- personal|custom|user_upload|ai_created; senao other
export function skillTypeOf(t) { return t === 'official' || t === 'platform_recommend' ? 'official' : ['personal', 'custom', 'user_upload', 'ai_created'].includes(t) ? 'personal' : 'other'; }
const SOURCES = { homepage_recommendation: 'recommend', slash_suggestion: 'slash', skill_panel: 'panel', skill_store: 'skill_store', panel: 'panel', slash: 'slash', chat: 'chat', recommend: 'recommend' };
// client_extra.pre_activate_skills* gerado a partir de UMA skill escolhida (fn d): so existe nas acoes 'generate' e 'set_skill'; _source so em 'set_skill'
export function preActivateExtra(action, skillName, type, selectionPlace) {
  const name = typeof skillName === 'string' ? skillName.trim() : '';
  if (!name || (action !== 'generate' && action !== 'set_skill')) return {};
  return { pre_activate_skills: name, pre_activate_skills_type: skillTypeOf(type), ...(action === 'set_skill' ? { pre_activate_skills_source: SOURCES[selectionPlace] || 'other' } : {}) };
}
// Parte de mensagem que pre-carrega a skill. Parte 'data' com sub_type biz/preload_skill; so conta se selection_source==='user_selected' (fn l).
export function preloadSkillPart(skillName, type = 'official') {
  return { type: 'data', sub_type: 'biz/preload_skill', data: JSON.stringify({ skill_name: skillName, selection_source: 'user_selected', pre_activate_skills_type: skillTypeOf(type) }) };
}
// partes da mensagem -> {preActivateSkills:'a&b', preActivateSkillsType} (fn l): biz/preload_skill (user_selected) e biz/addon_skill (skill_name_list)
export function collectPreActivate(parts) {
  const map = new Map(); const obj = (x) => { if (typeof x === 'string') { try { return obj(JSON.parse(x)); } catch { return undefined; } } return x && typeof x === 'object' && !Array.isArray(x) ? x : undefined; };
  for (const p of parts || []) {
    const e = obj(p); const d = obj(e?.data); const st = e?.subType ?? e?.sub_type;
    if (!d || ((st !== 'biz/preload_skill' || (d.selection_source ?? d.selectionSource) !== 'user_selected') && st !== 'biz/addon_skill')) continue;
    const names = st === 'biz/addon_skill' ? d.skill_name_list ?? d.skillNameList : [d.skill_name ?? d.skillName];
    for (const n of Array.isArray(names) ? names : []) if (typeof n === 'string' && n.trim()) map.set(n.trim(), skillTypeOf(d.pre_activate_skills_type ?? d.preActivateSkillsType));
  }
  if (!map.size) return {};
  const types = new Set(map.values());
  return { preActivateSkills: [...map.keys()].join('&'), preActivateSkillsType: types.size === 1 ? [...types][0] : 'other' };
}
// slug local (official_skills.json) -> skill_name real usado em pre_activate_skills
export function officialSkillName(slug) { const k = OFFICIAL[slug]; return k && k.skillName ? k.skillName : undefined; }

// Resposta do dynamic_questionnaire -> partes de texto (async__553635 mod 829634). Cada pergunta vira 2 partes plain/text.
// radio: rotulo da opcao cujo value == resposta; checkbox: rotulos unidos por ', '; text: texto aparado. (media nao implementado: sem upload local ao Pippit)
export function questionnaireAnswerParts(q, value) {
  if (!q?.title || !q?.id || value == null) return [];
  const pair = (a) => [{ type: 'text', sub_type: 'plain/text', data: `Question: ${q.title} ` }, { type: 'text', sub_type: 'plain/text', data: `Answer: ${a}` }];
  if (q.type === 'text') { const r = String(value).trim(); return r ? pair(r) : []; }
  if (!Array.isArray(q.options)) return [];
  if (q.type === 'radio') return pair(q.options.find((o) => o?.value === value)?.label || String(value));
  if (q.type === 'checkbox') { const v = (Array.isArray(value) ? value : [value]).filter((x) => x != null); const l = v.map((x) => q.options.find((o) => o?.value === x)?.label || String(x)).filter(Boolean); return l.length ? pair(l.join(', ')) : []; }
  return [];
}

// babi_param no formato do builder do Canvas (async__850206 @252800). Entradas ja resolvidas pelo chamador; sem inventar: generate_id so se informado.
// tool_id = `${edit_type}_canvas` (ex.: integrated_agent -> integrated_agent_canvas); scene_lv1/scene_lv2 sao constantes ('ai_agent'/'front_tool').
export function babiParam({ editType, runId, messageId, tabName, enterFrom, subToolId }) {
  const U = 'unknown';
  return { edit_type: editType || U, tool_id: editType ? `${editType}_canvas` : U, ...(runId ? { generate_id: runId } : {}), ...(messageId ? { user_message_id: messageId } : {}), section_id: runId || U, scene_lv1: 'ai_agent', scene_lv2: 'front_tool', ...(subToolId ? { sub_tool_id: subToolId } : {}), tab_name: tabName || U, enter_from: enterFrom || U };
}
