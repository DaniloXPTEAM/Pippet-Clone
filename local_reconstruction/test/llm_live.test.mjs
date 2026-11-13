// OPCIONAL (lento, fora do run-all): usa o Ollama real (modelo qwen3-local) para validar os planejadores com um LLM de verdade. Pula se o Ollama não estiver rodando.
import assert from 'node:assert/strict';
import { LLM, llmThemeOptions, llmStoryboard, llmCreateSkill, llmRefinePrompt, llmSmartIdeas } from '../src/llm.mjs';
let models; try { models = await new LLM({ model: 'x', timeoutMs: 3000 }).models(); } catch { console.log('SKIP llm_live: Ollama real indisponível (teste opcional ao vivo; ver SEM_PAYWALL/STATUS r20 — incluído no run-all com skip)'); process.exit(0); }
const model = models.find((m) => /qwen3-local/.test(m)) || models.find((m) => !/embed/i.test(m)); if (!model) { console.log('SKIP llm_live: Ollama sem modelo de chat (teste opcional ao vivo)'); process.exit(0); }
const llm = new LLM({ model, timeoutMs: 600000 }); const t = async (name, fn) => { const t0 = Date.now(); const v = await fn(); console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(0)} s`, JSON.stringify(v).slice(0, 160)); return v; };
const themes = await t('temas', () => llmThemeOptions(llm, 'um vídeo de 30 segundos sobre uma maçã vermelha')); assert.ok(themes.length >= 2 && themes.every((x) => x.length > 5));
const sb = await t('storyboard', () => llmStoryboard(llm, { theme: themes[0], request: 'vídeo sobre uma maçã', segs: [{ seconds: 15 }, { seconds: 15 }] })); assert.equal(sb.segmentos.length, 2); assert.ok(sb.segmentos.every((s) => s.titulo && s.descricao));
const sk = await t('skill', () => llmCreateSkill(llm, 'skill para anúncios curtos de produtos de beleza com ritmo rápido')); assert.ok(sk.name && sk.instructions.length > 30);
const rp = await t('prompt', () => llmRefinePrompt(llm, 'maçã girando')); assert.ok(rp.length >= 15);
const ideas = await t('ideias', () => llmSmartIdeas(llm, ['vídeo de uma maçã', 'anúncio de café'])); assert.ok(ideas.length >= 1);
console.log(`OK llm_live (${model})`); process.exit(0);
