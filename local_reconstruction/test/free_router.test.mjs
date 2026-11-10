import assert from 'node:assert/strict';
import { FREE_PROVIDER_CATALOG, ROUTER_TASKS, newFreeRouterConfig, planFreeRoute, publicFreeRouterConfig, validateFreeRouterConfig, createOpenAICompatibleFreeAdapter, createGeminiFreeAdapter, executeFreeRoute } from '../src/free_router.mjs';

const cfg = newFreeRouterConfig();
cfg.providers = [
  { id: 'ollama', enabled: true, baseUrl: 'http://127.0.0.1:11434/v1', priority: 1, models: [{ id: 'qwen-local', capabilities: ['text', 'vision'] }] },
  { id: 'nvidia-nim', enabled: true, freeTierConfirmed: true, quotaAvailable: true, dailyLimit: 10, secretEnv: 'NVIDIA_API_KEY', baseUrl: 'https://nim.invalid/v1', priority: 2, models: [{ id: 'free-chat', capabilities: ['text', 'vision'], freeTierConfirmed: true }, { id: 'explicit-free-video', capabilities: ['video-output'], freeTierConfirmed: true }] },
  { id: 'gemini', enabled: true, freeTierConfirmed: false, quotaAvailable: true, secretEnv: 'GEMINI_API_KEY', baseUrl: 'https://gemini.invalid/v1beta', models: [{ id: 'gemini-free', capabilities: ['text', 'vision', 'audio-input'] }] },
];
assert.equal(FREE_PROVIDER_CATALOG.length, 3);
assert.ok(ROUTER_TASKS.video_generation.requires.includes('video-output'));
assert.equal(planFreeRoute('text', cfg).providerId, 'ollama', 'local-first route');
assert.equal(planFreeRoute('vision', cfg).providerId, 'ollama');
assert.equal(planFreeRoute('audio_understanding', cfg).ok, false, 'Gemini quota not explicitly confirmed; no route');
assert.equal(planFreeRoute('video_generation', cfg).providerId, 'nvidia-nim', 'only explicitly free-confirmed candidate');
cfg.providers[1].freeTierConfirmed = false;
assert.equal(planFreeRoute('video_generation', cfg).ok, false, 'paid-only/video model cannot be routed without free confirmation');
cfg.providers[1].freeTierConfirmed = true;
cfg.taskPreferences.text = ['nvidia-nim/free-chat', 'ollama/qwen-local'];
assert.equal(planFreeRoute('text', cfg).providerId, 'nvidia-nim', 'per-task preference wins among free-eligible models');
cfg.paidFallback = true; assert.equal(planFreeRoute('text', cfg).ok, false, 'paid fallback rejected'); cfg.paidFallback = false;
assert.equal(planFreeRoute('made-up', cfg).ok, false);
assert.ok(validateFreeRouterConfig({ ...cfg, providers: [...cfg.providers, { id: 'openai', enabled: true }] }).some((x) => /fora da lista/.test(x)));
assert.ok(validateFreeRouterConfig({ ...cfg, providers: [{ id: 'ollama', apiKey: 'do-not-store', models: [] }] }).some((x) => /não envie nem armazene/.test(x)));
const pub = publicFreeRouterConfig({ ...cfg, providers: [{ id: 'ollama', apiKey: 'SECRET', token: 'TOKEN', secret: 'PASS', models: [{ id: 'm', capabilities: ['text'] }] }] });
assert.ok(!JSON.stringify(pub).includes('SECRET|TOKEN|PASS'.split('|')[0])); assert.ok(!JSON.stringify(pub).includes('TOKEN')); assert.ok(!JSON.stringify(pub).includes('PASS'));

let captured;
const openaiAdapter = createOpenAICompatibleFreeAdapter(async (url, init) => { captured = { url, init }; return new Response(JSON.stringify({ choices: [{ message: { content: 'feito' } }] }), { status: 200 }); });
const route = { ok: true, task: 'text', providerId: 'ollama', adapter: 'openai-compatible', locality: 'local', baseUrl: 'http://127.0.0.1:11434/v1', modelId: 'qwen-local' };
const out = await executeFreeRoute(route, { prompt: 'Teste local' }, { adapters: { 'openai-compatible': openaiAdapter } });
assert.equal(out.text, 'feito'); assert.equal(captured.url, 'http://127.0.0.1:11434/v1/chat/completions'); assert.equal(JSON.parse(captured.init.body).model, 'qwen-local'); assert.ok(!captured.init.headers.authorization);
await assert.rejects(executeFreeRoute({ ok: false, reason: 'sem rota grátis' }, {}, { adapters: {} }), /sem rota grátis/);
await assert.rejects(executeFreeRoute({ ...route, task: 'video_generation' }, {}, { adapters: { 'openai-compatible': openaiAdapter } }), /não implementa video_generation/);

let geminiUrl;
const geminiAdapter = createGeminiFreeAdapter(async (url, init) => { geminiUrl = url; assert.equal(init.headers['x-goog-api-key'], 'transient-test-key'); assert.equal(JSON.parse(init.body).contents[0].parts[0].text, 'Oi'); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Olá' }] } }] }), { status: 200 }); });
const gr = { ...route, task: 'text', providerId: 'gemini', adapter: 'gemini', baseUrl: 'https://gemini.invalid/v1beta', modelId: 'gemini-free', secretEnv: 'GEMINI_API_KEY', locality: 'cloud', freeTierConfirmed: true };
const gout = await executeFreeRoute(gr, { prompt: 'Oi' }, { adapters: { gemini: geminiAdapter }, credentials: { GEMINI_API_KEY: 'transient-test-key' } });
assert.equal(gout.text, 'Olá'); assert.equal(geminiUrl, 'https://gemini.invalid/v1beta/models/gemini-free:generateContent');
await assert.rejects(executeFreeRoute({ ...gr, freeTierConfirmed: false }, {}, { adapters: { gemini: geminiAdapter }, credentials: { GEMINI_API_KEY: 'transient-test-key' } }), /cota gratuita não confirmada/);
console.log('free_router.test.mjs: ok (routing mocked, no provider/network keys persisted, no paid fallback)');
