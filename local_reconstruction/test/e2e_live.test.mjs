// OPCIONAL (lento, fora do run-all): fluxo controlado ponta a ponta com o Ollama REAL (Qwen3 local), SEM gerar mídia e SEM gasto:
// projeto -> pedido ao agente -> temas e storyboard do LLM real -> confirmação -> tarefas de geração PREPARADAS (bloqueadas por falta de provedor)
// -> reabrir em outro processo e verificar persistência. Nada é "simulado": o que não roda (vídeo) é reportado como dependência exata.
// Uso: node test/e2e_live.test.mjs   (fase B é disparada automaticamente em um segundo processo sobre os mesmos dados)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const phase = process.argv[2] === 'verify' ? 'B' : 'A';
const dataDir = process.env.E2E_LIVE_DATA || path.join(here, '..', '..', 'captures', 'e2e_live', 'data'); const reportFile = path.join(dataDir, '..', 'e2e_live_report.json');
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM_WARMUP ??= 'on'; if (phase === 'B') process.env.PIPPIT_LLM = 'off'; else delete process.env.PIPPIT_LLM; // fase B não usa LLM
if (phase === 'A') {
  // Incluído no run-all (r20): sem Ollama real, SKIP explícito — nunca falha por dependência de rede.
  try { const r = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(3000) }); if (!r.ok) throw new Error('sem Ollama'); }
  catch { console.log('SKIP e2e_live: Ollama real indisponível (teste opcional ao vivo; fase A+B com LLM real é lenta)'); process.exit(0); }
}
const { server } = await import('../app/server.mjs'); const PORT = phase === 'A' ? 5194 : 5195; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const log = (...a) => console.log(`[${phase}]`, ...a); const timed = async (name, fn) => { const t0 = Date.now(); const v = await fn(); const s = +((Date.now() - t0) / 1000).toFixed(1); log(`${name}: ${s}s`); return { v, s }; };

if (phase === 'A') {
  fs.rmSync(path.join(dataDir, '..'), { recursive: true, force: true }); fs.mkdirSync(dataDir, { recursive: true }); // dados novos a cada execução (evidência fica na pasta)
  const rep = { startedAt: new Date().toISOString(), steps: [], timings: {} };
  const st0 = (await j('/api/llm/status')).body; log('LLM:', st0.label, st0.error || ''); if (!st0.reachable) { console.log('Ollama indisponível: dependência exata = servidor Ollama com modelo de chat (ollama serve). Teste ignorado.'); process.exit(0); }
  const balance0 = (await j('/api/state')).body.balance; rep.llm = st0.label;
  // configuração medida no benchmark (captures/perf/llm_bench_1.json): CPU-only carrega a frio em 15 s (vs 36 s com Vulkan) e gera na mesma velocidade
  assert.equal((await post('/api/llm/config', { options: { num_gpu: 0 } })).status, 200);
  // 1) criar projeto
  const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body; rep.steps.push('projeto criado'); rep.projectId = proj.id;
  // 2) pedido ao agente -> 3) temas do LLM real
  const t1 = await timed('pedido -> temas (LLM real)', async () => (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Crie um vídeo de 30 segundos sobre uma maçã vermelha que viaja pelo mundo' })).body);
  let last = t1.v.chat.messages.at(-1); assert.match(last.text, /LLM /, 'temas devem vir do LLM real, não das regras locais'); assert.ok(last.form.options.length >= 2); rep.themes = last.form.options; rep.timings.themes_s = t1.s;
  // planejamento + storyboard do LLM real
  const t2 = await timed('tema -> storyboard (LLM real)', async () => (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { answer: last.form.options[0] })).body);
  last = t2.v.chat.messages.at(-1); assert.equal(last.form.type, 'confirm_production'); assert.match(last.text, /Planejado por: LLM /, 'storyboard deve vir do LLM real'); rep.timings.storyboard_s = t2.s; rep.steps.push('temas + storyboard do LLM real');
  let pj = (await j(`/api/projects/${proj.id}`)).body; const titles = pj.canvas.nodes.map((n) => n.title); for (const need of ['creative_design.md', 'storyboard.md']) assert.ok(titles.includes(need), need);
  const sb = pj.canvas.nodes.find((n) => n.title === 'storyboard.md').text; assert.ok(sb.length > 80); rep.storyboardPreview = sb.slice(0, 400);
  // 4) preparar tarefas de geração (confirmação + crédito do Pippit NÃO é usado: é só o fluxo local)
  let m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { confirmation: { mode: 'sequencial' } })).body; last = m.chat.messages.at(-1); if (last.form?.type === 'credit_confirm') { m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { confirmation: { mode: 'sequencial', creditOk: true } })).body; last = m.chat.messages.at(-1); }
  assert.equal(last.steps.at(-1).state, 'warning'); assert.match(last.steps.at(-1).reason, /sem provedor de video configurado/); assert.match(last.text, /NÃO foram enviadas/); rep.steps.push('tarefas de geração preparadas e bloqueadas (sem provedor)');
  const jobs = (await j('/api/jobs')).body; assert.ok(jobs.length >= 2 && jobs.every((x) => x.state === 'blocked' && x.prompt.length > 40)); rep.jobs = jobs.map((x) => ({ id: x.id, state: x.state, seconds: x.params.seconds, prompt: x.prompt.slice(0, 160), error: x.error }));
  pj = (await j(`/api/projects/${proj.id}`)).body; assert.ok(pj.canvas.nodes.some((n) => n.title === 'generation_prompts.md'), 'prompts de geração gravados no canvas');
  // nada gerado, nada cobrado, nenhum vídeo apresentado
  assert.equal((await j('/api/state')).body.balance, balance0, 'nenhum crédito consumido'); const assets = (await j('/api/assets?cat=works')).body; assert.ok(!assets.some((a) => a.kind === 'video'), 'nenhum vídeo foi criado'); rep.steps.push('nada gerado, nada cobrado');
  // 5) o MESMO pedido de novo em outro projeto: etapas do LLM vêm do cache (sem regenerar)
  const proj2 = (await post('/api/projects', { type: 'canvas' })).body; const chat2 = (await post(`/api/projects/${proj2.id}/chats`)).body;
  const c1 = await timed('mesmo pedido em outro projeto (cache)', async () => (await post(`/api/projects/${proj2.id}/chats/${chat2.id}/messages`, { text: 'Crie um vídeo de 30 segundos sobre uma maçã vermelha que viaja pelo mundo' })).body);
  rep.timings.themes_cached_s = c1.s; assert.ok(c1.s < Math.max(5, rep.timings.themes_s / 5), `tema em cache deveria ser bem mais rápido (${c1.s}s vs ${rep.timings.themes_s}s)`);
  const stats = (await j('/api/llm/stats')).body; rep.llmStats = stats; log('LLM stats', JSON.stringify(stats.stats)); assert.equal(stats.native, true); assert.ok(stats.stats.cacheHits >= 1 && stats.stats.genTokens > 0);
  rep.finishedAt = new Date().toISOString(); fs.writeFileSync(reportFile, JSON.stringify(rep, null, 2)); fs.writeFileSync(path.join(dataDir, '..', 'ids.json'), JSON.stringify({ projectId: proj.id, jobIds: jobs.map((x) => x.id) }));
  log('fase A concluída; reabrindo em outro processo…'); server.close();
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'verify'], { encoding: 'utf8', env: { ...process.env, E2E_LIVE_DATA: dataDir }, timeout: 120000 }); process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || ''); setTimeout(() => process.exit(r.status ?? 1), 150);
} else {
  const ids = JSON.parse(fs.readFileSync(path.join(dataDir, '..', 'ids.json'), 'utf8')); const rep = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const pj = (await j(`/api/projects/${ids.projectId}`)).body; assert.equal(pj.id, ids.projectId); const titles = pj.canvas.nodes.map((n) => n.title); for (const need of ['creative_design.md', 'storyboard.md', 'generation_prompts.md']) assert.ok(titles.includes(need), `persistiu ${need}`);
  const jobs = (await j('/api/jobs')).body; for (const id of ids.jobIds) { const x = jobs.find((q) => q.id === id); assert.ok(x && x.state === 'blocked' && /sem provedor/.test(x.error), `tarefa ${id} persistiu bloqueada`); }
  const chats = (await j(`/api/projects/${ids.projectId}`)).body; assert.ok(JSON.stringify(chats).includes('NÃO foram enviadas'), 'conversa do agente persistiu');
  rep.persistence = 'ok: projeto, documentos do canvas, tarefas bloqueadas e conversa reabertos em um segundo processo'; rep.verifiedAt = new Date().toISOString(); fs.writeFileSync(reportFile, JSON.stringify(rep, null, 2));
  log(rep.persistence); console.log('OK e2e_live (parcial controlado):', rep.steps.join(' | '), '| dependência exata para o resto: provedor de vídeo configurado + autorização de gasto'); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 150);
}
