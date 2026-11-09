// Contrato do agente (PIPPIT_AGENT_CONTRACT.md): funcoes puras conferidas contra os 2 submit_run OBSERVADOS (notes/_submit_runs_observed.json) e contra as regras estaticas dos bundles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const OBS = JSON.parse(fs.readFileSync(path.join(here, '../../notes/_submit_runs_observed.json'), 'utf8'));
const C = await import('../app/lib/agent_contract.mjs');
// generate_mode: so os 4 valores do validador; mapeamento categoria -> valor
assert.deepEqual(C.GENERATE_MODES, ['agent', 'video_gen', 'image_gen', 'audio_gen']);
assert.equal(C.generateModeFor(undefined), 'agent'); assert.equal(C.generateModeFor('nest_agent'), 'agent'); assert.equal(C.generateModeFor('image'), 'image_gen'); assert.equal(C.generateModeFor('audio'), 'audio_gen');
for (const v of ['video', 'video_part', 'videoPart']) assert.equal(C.generateModeFor(v), 'video_gen');
assert.throws(() => C.generateModeFor('story'), /unsupported_generation_type/);
// observado: geracao direta de video reproduz agent_name / entrance_from / tool_name / run_source / babi_param
for (const o of OBS) {
  const d = C.DIRECT.video; assert.equal(o.agent_name, d.agent_name); assert.equal(o.entrance_from, d.entrance_from); assert.equal(o.content[0].tool_name, d.tool_name); assert.equal(o.client_extra.run_source, d.run_source); assert.equal(o.client_extra.generate_mode, C.generateModeFor('video'));
  const b = C.babiParam({ editType: o.babi_param.edit_type, runId: o.babi_param.generate_id, messageId: o.babi_param.user_message_id, tabName: o.babi_param.tab_name, enterFrom: o.babi_param.enter_from });
  assert.deepEqual(b, o.babi_param, 'babi_param reconstruido deve ser identico ao observado');
}
// pre_activate_skills
assert.deepEqual(C.preActivateExtra('generate', ' storyline-advertisement ', 'official'), { pre_activate_skills: 'storyline-advertisement', pre_activate_skills_type: 'official' });
assert.deepEqual(C.preActivateExtra('set_skill', 'x', 'ai_created', 'homepage_recommendation'), { pre_activate_skills: 'x', pre_activate_skills_type: 'personal', pre_activate_skills_source: 'recommend' });
assert.deepEqual(C.preActivateExtra('other_action', 'x', 'official'), {}); assert.deepEqual(C.preActivateExtra('generate', '  ', 'official'), {});
assert.equal(C.skillTypeOf('platform_recommend'), 'official'); assert.equal(C.skillTypeOf('qualquer'), 'other');
// partes biz/preload_skill: so conta com selection_source=user_selected; biz/addon_skill junta com '&'; tipos mistos => other
assert.deepEqual(C.collectPreActivate([C.preloadSkillPart('url2video')]), { preActivateSkills: 'url2video', preActivateSkillsType: 'official' });
assert.deepEqual(C.collectPreActivate([{ type: 'data', sub_type: 'biz/preload_skill', data: { skill_name: 'a', selection_source: 'auto' } }]), {});
assert.deepEqual(C.collectPreActivate([C.preloadSkillPart('a'), { type: 'data', sub_type: 'biz/addon_skill', data: JSON.stringify({ skill_name_list: ['b', 'c'], pre_activate_skills_type: 'custom' }) }]), { preActivateSkills: 'a&b&c', preActivateSkillsType: 'other' });
assert.equal(C.officialSkillName('anuncios-de-drama'), 'storyline-advertisement'); assert.equal(C.officialSkillName('nao-existe'), undefined);
// respostas do questionario => partes "Question:/Answer:"
const radio = { id: 'theme', title: 'Escolha o tema', type: 'radio', options: [{ id: 'o1', label: 'Tema A', value: 'a' }] };
assert.deepEqual(C.questionnaireAnswerParts(radio, 'a'), [{ type: 'text', sub_type: 'plain/text', data: 'Question: Escolha o tema ' }, { type: 'text', sub_type: 'plain/text', data: 'Answer: Tema A' }]);
assert.equal(C.questionnaireAnswerParts({ ...radio, type: 'checkbox', options: [{ label: 'X', value: 1 }, { label: 'Y', value: 2 }] }, [1, 2])[1].data, 'Answer: X, Y');
assert.equal(C.questionnaireAnswerParts({ id: 't', title: 'T', type: 'text' }, '  oi ')[1].data, 'Answer: oi'); assert.deepEqual(C.questionnaireAnswerParts({ id: 't', title: 'T', type: 'text' }, '   '), []);
// integracao local: escolher skill gera wire de preload; responder pergunta gera wire Question/Answer (informativo, nada vai ao Pippit)
const { userMessage } = await import('../app/lib/agent.mjs');
const ctx = { skillGuide: () => null, addDoc: () => ({ id: 'd' }), addNode: () => ({ id: 'n' }), linkId() {}, llm: null, providers: {} };
const chat = { messages: [], state: {} };
await userMessage(ctx, { id: 'p' }, chat, { text: 'Anúncio curto de drama para meu café', skillId: 'anuncios-de-drama' }).catch(() => {});
const first = chat.messages.find((m) => m.role === 'user'); assert.ok(first?.wire?.[0]?.sub_type === 'biz/preload_skill', 'primeira mensagem com skill escolhida leva wire preload'); assert.equal(JSON.parse(first.wire[0].data).skill_name, 'storyline-advertisement');
console.log('agent_contract OK');
