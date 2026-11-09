// Contratos do drawer de Avatar Video recuperados dos chunks do Pippit (PIPPIT_AVATAR_CHUNKS.md). Funcoes puras; nada e enviado ao Pippit.
// Fontes: async__973395 (catalogo), cache_recovered/828557 (script_segment, tarefas inteligentes), avatar-based-generator (scriptInfo/exportacao).

// DSL de filtro do catalogo (973395 @122321): cada grupo selecionado vira {op:"must", field:"tag", conds:["<grupo>/<valor>"...]}; grupos vazios sao ignorados.
export function dslFilterQuery(id2SelectedMap = {}) {
  const conds = Object.entries(id2SelectedMap).filter(([, v]) => v.length > 0).map(([k, v]) => ({ op: 'must', field: 'tag', conds: v.map((x) => `${k}/${x}`) }));
  return conds.length ? JSON.stringify({ op: 'and', conds }) : undefined;
}
// POST /api/biz/v1/videogen/recommend_digital_human_by_tag — corpo; resposta: data.{materialList[{resourceId}], nextCursor, hasMore, reqId}
export function recommendByTagBody({ id2SelectedMap, offset = 0, limit = 50, requestId = '', region } = {}) {
  return { dslFilterQuery: dslFilterQuery(id2SelectedMap), reqId: requestId, cursor: offset, count: limit, region };
}
// POST /api/biz/v1/videogen/search_platform_material — mesmo filtro, source:6 e cursor como STRING
export function searchPlatformMaterialBody({ id2SelectedMap, offset = 0, limit = 50, ...rest } = {}) {
  return { ...rest, dslFilterQuery: dslFilterQuery(id2SelectedMap), source: 6, cursor: `${offset}`, count: limit };
}
// POST /api/biz/v1/videogen/script_segment (cache_recovered/828557 @590120): segmentSymbols = pausas <break time="Nms" /> (N pode ter decimais) ou undefined
export function scriptSegmentBody(script) {
  return { script, segmentSymbols: script.match(/<break time="\d+(\.\d+)?ms" \/>/g) || undefined };
}
// scriptInfo enviado na exportacao do avatar (avatar-based-generator @30374): JSON [{script}, {rank, duration(s)}...]; so pausas com N inteiro
export function scriptInfo(script) {
  return JSON.stringify([{ script }, ...(script.match(/<break time="\d+ms" \/>/g)?.map((e, t) => ({ rank: t + 1, duration: Number(e.match(/\d+/)?.[0]) / 1e3 })) ?? [])]);
}
// Tarefa inteligente generica (828557 @637785): POST {web_domain}/lv/v1/intelligence/create e /query; app_id fixo 348188, cabecalho x-commerce-v2: 1
export const SMART_TASK = { appId: 348188, headers: { 'x-commerce-v2': '1' }, createPath: '/lv/v1/intelligence/create', queryPath: '/lv/v1/intelligence/query' };
export const smartTaskCreateBody = (params, submitId) => ({ ...params, app_id: SMART_TASK.appId, submit_id: submitId });
export const smartTaskQueryBody = ({ taskId, workspaceId, tmpId, smartToolType, historyId }) => ({ task_id: taskId, workspace_id: workspaceId, tmp_id: tmpId, smart_tool_type: smartToolType, history_id: historyId });
// Interpretacao da consulta (mesma regra do cliente): status 1|2 e speed 100 e (logado: task_detail[0].md5 | anonimo: resource_id) = sucesso; 1|2 sem isso = progresso (max 99); outro status = falha
export function smartTaskState(value, hasLogin = true) {
  const t = value?.status;
  if (t === 1 || t === 2) { const d = value.task_detail?.[0]; return value.speed === 100 && (!hasLogin || d?.md5) && (hasLogin || d?.resource_id) ? { state: 'success' } : { state: 'progress', progress: Math.min(99, value.speed) }; }
  return { state: 'failed' };
}
// Troca de voz (828557 @564950): smart_tool_type 40; params e req_json sao STRINGS JSON
export function voiceChangeCreateBody({ assetId, platform, voice, resourceType, workspaceId, scene = 1 }) {
  return { asset_id: assetId, params: JSON.stringify({ resource_type: resourceType, item_id: voice.effectId, speaker_source: voice.isCloneVoice ? 2 : 1 }), req_json: JSON.stringify({ speaker: voice.extra?.speaker_id }), platform, workspace_id: workspaceId, smart_tool_type: 40, scene, is_from_editor: true };
}
