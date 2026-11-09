// Benchmark do Ollama local: separa carga do modelo, avaliacao do prompt (contexto) e geracao de tokens. Uso: node llm_bench.mjs [modelo] > captures/perf/llm_bench.json
const MODEL = process.argv[2] || 'qwen3-local'; const BASE = 'http://127.0.0.1:11434';
const SYS = '/no_think Você é um diretor de vídeos curtos. Responda somente JSON.';
const USER = 'Tema: Uma maçã viaja pelo mundo\nPedido: "Crie um vídeo de 30 segundos sobre uma maçã"\nCrie um storyboard com exatamente 2 segmentos (durações em segundos: 15, 15). Para cada um: "titulo" (até 6 palavras), "descricao" (1–2 frases visuais) e "fala" (narração curta ou vazio). Formato: {"estilo":"...","segmentos":[{"titulo":"...","descricao":"...","fala":"..."}]}';
const ns = (n) => Math.round(n / 1e6) / 1000;
async function call(options, label, extra = {}) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/chat`, { method: 'POST', body: JSON.stringify({ model: MODEL, stream: false, think: false, format: 'json', keep_alive: '10m', options: { temperature: 0.7, num_predict: 400, ...options }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: USER }], ...extra }) });
  const j = await r.json(); const wall = (Date.now() - t0) / 1000;
  return { label, options, wall_s: wall, total_s: ns(j.total_duration), load_s: ns(j.load_duration), prompt_tokens: j.prompt_eval_count, prompt_eval_s: ns(j.prompt_eval_duration), prompt_tok_s: j.prompt_eval_count ? Math.round(j.prompt_eval_count / (j.prompt_eval_duration / 1e9) * 10) / 10 : null, gen_tokens: j.eval_count, gen_s: ns(j.eval_duration), gen_tok_s: Math.round(j.eval_count / (j.eval_duration / 1e9) * 10) / 10, ok: (() => { try { JSON.parse(j.message.content); return true; } catch { return false; } })() };
}
const unload = () => fetch(`${BASE}/api/generate`, { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).then((r) => r.json()).catch(() => null);
const configs = JSON.parse(process.argv[3] || '[{"name":"default"},{"name":"cpu_only","options":{"num_gpu":0}},{"name":"cpu_t4","options":{"num_gpu":0,"num_thread":4}},{"name":"cpu_t8","options":{"num_gpu":0,"num_thread":8}},{"name":"ctx2048","options":{"num_ctx":2048}}]');
const out = [];
for (const c of configs) {
  await unload(); await new Promise((r) => setTimeout(r, 1500));
  const cold = await call(c.options || {}, `${c.name}:cold`); const warm = await call(c.options || {}, `${c.name}:warm`);
  out.push(cold, warm); console.error(`${c.name}: cold load=${cold.load_s}s total=${cold.total_s}s | warm total=${warm.total_s}s prompt=${warm.prompt_tokens}tok/${warm.prompt_eval_s}s gen=${warm.gen_tokens}tok/${warm.gen_s}s (${warm.gen_tok_s} tok/s)`);
}
console.log(JSON.stringify({ model: MODEL, when: new Date().toISOString(), results: out }, null, 1));
