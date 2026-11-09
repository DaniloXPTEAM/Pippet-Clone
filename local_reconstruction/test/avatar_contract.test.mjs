// Contratos do drawer de Avatar (PIPPIT_AVATAR_CHUNKS.md): funcoes puras conferidas contra as regras lidas nos chunks e contra o catalogo local.
import assert from 'node:assert/strict';
const C = await import('../app/lib/avatar_contract.mjs');
// DSL: grupos vazios ignorados; um grupo = um "must" com varias condicoes (OU dentro do grupo, E entre grupos)
assert.equal(C.dslFilterQuery({}), undefined); assert.equal(C.dslFilterQuery({ gender: [] }), undefined);
assert.deepEqual(JSON.parse(C.dslFilterQuery({ gender: ['female'], age: ['young', 'middle'], industry: [] })), { op: 'and', conds: [{ op: 'must', field: 'tag', conds: ['gender/female'] }, { op: 'must', field: 'tag', conds: ['age/young', 'age/middle'] }] });
// corpos do catalogo
assert.deepEqual(C.recommendByTagBody({ offset: 50, requestId: 'r1', region: 'BR' }), { dslFilterQuery: undefined, reqId: 'r1', cursor: 50, count: 50, region: 'BR' });
const s = C.searchPlatformMaterialBody({ id2SelectedMap: { gender: ['male'] }, offset: 100, limit: 20, categoryId: '88320131' }); assert.equal(s.cursor, '100'); assert.equal(s.source, 6); assert.equal(s.count, 20); assert.equal(s.categoryId, '88320131');
// roteiro com pausas
const script = 'Ola <break time="500ms" /> mundo <break time="1200ms" /> fim <break time="1.5ms" />';
assert.deepEqual(C.scriptSegmentBody(script).segmentSymbols, ['<break time="500ms" />', '<break time="1200ms" />', '<break time="1.5ms" />']); assert.equal(C.scriptSegmentBody('sem pausas').segmentSymbols, undefined);
assert.deepEqual(JSON.parse(C.scriptInfo(script)), [{ script }, { rank: 1, duration: 0.5 }, { rank: 2, duration: 1.2 }]); assert.deepEqual(JSON.parse(C.scriptInfo('x')), [{ script: 'x' }]);
// tarefa inteligente
assert.deepEqual(C.smartTaskCreateBody({ a: 1 }, 's1'), { a: 1, app_id: 348188, submit_id: 's1' });
assert.deepEqual(C.smartTaskQueryBody({ taskId: 't', workspaceId: 'w', smartToolType: 40 }), { task_id: 't', workspace_id: 'w', tmp_id: undefined, smart_tool_type: 40, history_id: undefined });
assert.deepEqual(C.smartTaskState({ status: 1, speed: 100, task_detail: [{ md5: 'x' }] }), { state: 'success' });
assert.deepEqual(C.smartTaskState({ status: 2, speed: 100, task_detail: [{}] }), { state: 'progress', progress: 99 }); assert.deepEqual(C.smartTaskState({ status: 1, speed: 40 }), { state: 'progress', progress: 40 });
assert.deepEqual(C.smartTaskState({ status: 2, speed: 100, task_detail: [{ resource_id: 'r' }] }, false), { state: 'success' }); assert.deepEqual(C.smartTaskState({ status: -1 }), { state: 'failed' });
// troca de voz
const v = C.voiceChangeCreateBody({ assetId: 'a', platform: 'p', voice: { effectId: 'e1', isCloneVoice: true, extra: { speaker_id: 'sp' } }, resourceType: 'voice-change', workspaceId: 'w' });
assert.equal(v.smart_tool_type, 40); assert.deepEqual(JSON.parse(v.params), { resource_type: 'voice-change', item_id: 'e1', speaker_source: 2 }); assert.deepEqual(JSON.parse(v.req_json), { speaker: 'sp' }); assert.equal(v.scene, 1);
console.log('avatar_contract OK');
