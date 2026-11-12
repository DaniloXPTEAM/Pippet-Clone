// Contrato `dynamic_questionnaire` (ferramenta de cliente do agente do Pippit, esquema recuperado do bundle async__159201): os formulários locais do agente ganham a mesma forma e são validados contra o esquema extraído.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skipMissingEvidence } from './support/browser.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)); const schemaPath = path.resolve(here, '../../notes/dynamic_questionnaire.schema.json');
if (skipMissingEvidence('questionnaire', [schemaPath])) process.exit(0);
const SCHEMA = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const { formToQuestionnaire, validateAgainst } = await import('../app/lib/questionnaire.mjs');
// esquema extraído: forma esperada
assert.deepEqual(SCHEMA.properties.questions.items.properties.type.enum, ['radio', 'checkbox', 'text', 'media']); assert.deepEqual(SCHEMA.required, ['questions']); assert.equal(SCHEMA.additionalProperties, false);
const forms = [{ type: 'question', options: ['Tema A', 'Tema B', 'Outro tema — descreva em uma frase.'] }, { type: 'confirm_production', options: { mode: ['Gerar em paralelo', 'Gerar em sequência'], autoContinue: ['Sim', 'Não'] }, segments: 2 }, { type: 'credit_confirm', estimatedCredits: 500, limit: 450 }, { type: 'skill_inputs', missing: [{ id: 'produto', label: 'Nome do produto', hint: 'ex.: tênis' }] }];
for (const f of forms) { const q = formToQuestionnaire(f); assert.ok(q, f.type); assert.deepEqual(validateAgainst(SCHEMA, q), [], f.type); }
assert.equal(formToQuestionnaire({ type: 'desconhecido' }), null); assert.equal(formToQuestionnaire(null), null);
// o validador rejeita violações do esquema
assert.ok(validateAgainst(SCHEMA, { questions: [] }).length, 'questions vazio'); assert.ok(validateAgainst(SCHEMA, { questions: [{ id: 'a', title: 'b', type: 'select' }] }).length, 'tipo fora do enum'); assert.ok(validateAgainst(SCHEMA, { questions: [{ id: 'a', title: 'b', type: 'text', extra: 1 }] }).length, 'campo extra'); assert.ok(validateAgainst(SCHEMA, { title: 'x' }).length, 'sem questions');
// integração: mensagens do agente com formulário trazem `questionnaire` válido
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-q-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5249; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const prj = (await post('/api/projects', { type: 'canvas', title: 'Q' })).body; const chat = (await post(`/api/projects/${prj.id}/chats`)).body;
const m = (await post(`/api/projects/${prj.id}/chats/${chat.id}/messages`, { text: 'Faça um vídeo curto de uma maçã girando', modelId: 'seedance-2.5' })).body; const msgs = (await j(`/api/projects/${prj.id}`)).body.chats[0].messages.filter((x) => x.form);
assert.ok(msgs.length >= 1, 'o agente fez uma pergunta'); for (const x of msgs) { assert.ok(x.questionnaire, 'questionnaire presente'); assert.deepEqual(validateAgainst(SCHEMA, x.questionnaire), []); }
console.log('OK questionnaire: esquema dynamic_questionnaire extraído, formulários locais convertidos e validados (', msgs.map((x) => x.form.type).join(','), '), validador rejeita violações'); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
