// 14/11/2026 — o agente (skills, Marketing, Histórias, modo Agente) gera vídeo pelo ROTEADOR GRATUITO quando não há
// provedor de vídeo "do usuário". Antes ele criava tarefas bloqueadas por "sem provedor de vídeo" e o roteador (NovAI)
// nunca era usado. Contexto simulado: nada sai desta máquina.
import assert from 'node:assert/strict';
import { userMessage } from '../app/lib/agent.mjs';

const db = { settings: { provider: 'none', creditConfirm: { mode: 'ignore', limit: 450 } }, user: { plan: 'free' } };
const made = [];
const mkCtx = (routerVideo) => ({ skillGuide: () => null, addDoc: () => ({ id: 'd' }), addNode: () => ({ id: 'n' }), linkId() {}, link() {}, llm: null, providers: {}, db, jobs: { create: () => { throw new Error('não deveria criar tarefa do provedor do usuário'); }, tick: async () => {} }, ...(routerVideo ? { routerVideo } : {}) });

async function drive(ctx, text) {
  const project = { id: 'p1', canvas: { nodes: [] } }; const chat = { id: 'c1', messages: [], state: {} };
  await userMessage(ctx, project, chat, { text });
  for (let i = 0; i < 8; i++) {
    const a = chat.state.awaiting; if (!a) break;
    if (a.type === 'question') await userMessage(ctx, project, chat, { answer: a.options[0] });
    else if (a.type === 'confirm_production') await userMessage(ctx, project, chat, { confirmation: { mode: a.options.mode[0], autoContinue: a.options.autoContinue[0] } });
    else if (a.type === 'credit_confirm') await userMessage(ctx, project, chat, { confirmation: { creditOk: true } });
    else if (a.type === 'skill_inputs') await userMessage(ctx, project, chat, { text: 'continuar assim mesmo' });
    else break;
  }
  return { chat, text: chat.messages.map((m) => m.text || '').join('\n') };
}

// 1) com rota de vídeo no roteador: cria 1 run por segmento e NÃO cria tarefa do provedor do usuário
const ctx1 = mkCtx({ available: () => true, create: (p, chat, prompt, extra) => { made.push({ prompt, extra }); return { id: 'run' + made.length }; }, reason: () => null });
const r1 = await drive(ctx1, 'Crie um vídeo curto de 15 segundos sobre um gato astronauta explorando a Lua.');
assert.ok(made.length >= 1, 'pelo menos um clipe enviado ao roteador');
assert.ok(made.every((m) => m.prompt.length >= 15), 'prompt do clipe respeita o mínimo de 15 caracteres');
assert.match(r1.text, /roteador gratuito/, 'a mensagem diz que foi pelo roteador gratuito');
assert.doesNotMatch(r1.text, /sem provedor de v[ií]deo/i, 'não cai mais no bloqueio "sem provedor de vídeo"');
assert.equal(r1.chat.state.runIds.length, made.length, 'ids dos runs guardados no estado do chat');

// 2) mensagem repetida depois da geração não envia de novo
const antes = made.length; await userMessage(ctx1, { id: 'p1', canvas: { nodes: [] } }, r1.chat, { confirmation: { creditOk: true } });
assert.equal(made.length, antes, 'não reenvia a geração');

// 3) sem roteador de vídeo: o comportamento antigo continua (tarefa do provedor do usuário), sem inventar vídeo
made.length = 0; let jobCreated = 0;
const ctx3 = mkCtx(null); ctx3.jobs = { create: () => { jobCreated++; return { id: 'j1', state: 'blocked', error: 'sem provedor de video configurado' }; }, tick: async () => {} };
const r3 = await drive(ctx3, 'Crie um vídeo curto de 15 segundos sobre um gato astronauta explorando a Lua.');
assert.equal(made.length, 0); assert.ok(jobCreated >= 1, 'sem roteador, usa o caminho antigo');
console.log('agent_router_video.test.mjs: ok (agente envia ao roteador gratuito; sem roteador mantém o caminho antigo; sem reenvio)');
