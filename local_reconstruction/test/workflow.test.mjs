import assert from 'node:assert/strict'; import { planSegments, checkModelAccess, estimateCredits, AgentSession } from '../src/workflow.mjs';
// 45 s -> 3 x 15 s, continuidade pelo ultimo quadro (observado)
const s = planSegments(45); assert.deepEqual(s.map((x) => x.seconds), [15, 15, 15]); assert.equal(s[1].continuesFrom, 'shot_01_lastframe'); assert.equal(s[0].continuesFrom, null);
assert.equal(planSegments(8).length, 1);
assert.equal(estimateCredits(15), 105); // = debito observado por geracao Seedance 2.0 Mini
assert.equal(checkModelAccess({ requiresPlan: 'starter' }, 'free').ok, true); // r20: todo modelo é livre, sem paywall
const planner = { themeOptions: () => ['A lição da amizade', 'O pequeno milagre', 'A aventura na floresta', 'Outro tema'] };
let a = await new AgentSession({ planner }).run({ seconds: 45, attachments: ['bible.png'] }, { model: {} });
assert.equal(a.awaiting.type, 'question'); assert.equal(a.awaiting.options.length, 4);
a = await new AgentSession({ planner }).run({ seconds: 45 }, { model: {}, answer: 'A aventura na floresta' }); assert.equal(a.awaiting.type, 'confirm_production');
a = await new AgentSession({ planner }).run({ seconds: 45, theme: 'x', confirmation: { mode: 'parallel', autoContinue: true } }, { plan: 'free', model: { requiresPlan: 'starter' } });
assert.notEqual(a.steps.at(-1).state, 'failed', 'r20: modelo com requiresPlan não bloqueia (paywall não reproduzido)');
a = await new AgentSession({ planner }).run({ seconds: 45, theme: 'x', confirmation: { mode: 'sequential_lastframe', autoContinue: true } }, { plan: 'free', model: {} });
assert.equal(a.result.segments, 3); assert.equal(a.result.credits, 315); assert.equal(a.nodes.filter((n) => n.kind === 'video').length, 4);
console.log('OK workflow: segmentacao 15 s, pergunta, confirmacao, gating por plano, custo e nos/arestas conforme observado');
