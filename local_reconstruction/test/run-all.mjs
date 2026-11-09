// Roda toda a suíte local em sequência (cada teste em processo próprio). Uso: node test/run-all.mjs [filtro]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ALL = ['pageview', 'credits', 'plans', 'workflow', 'canvas_avatar', 'studio3d', 'directgen', 'directgen_http', 'features', 'llm', 'agent_llm', 'imagegen', 'silence', 'skillpkg', 'skills', 'skills_official', 'agent_skill', 'nodetools', 'audio', 'llm_perf', 'providers', 'editor_audio', 'editor_speed', 'assets_menu', 'credits_pouches', 'editor_canvas', 'workflow_jobs', 'e2e', 'parity', 'ui', 'directgen_ui', 'features_ui', 'llm_ui', 'skills_ui', 'providers_ui', 'lote2_ui', 'lote3_ui', 'skills_official_ui', 'publishing', 'fidelity2_ui', 'fidelity3_ui', 'questionnaire', 'agent_contract', 'avatar_contract', 'talking_photo_contract', 'talkingphoto_provider', 'talkingphoto_ui'];
const only = process.argv[2]; const list = only ? ALL.filter((t) => t.includes(only)) : ALL; let bad = 0;
for (const t of list) {
  const t0 = Date.now(); const r = spawnSync(process.execPath, [path.join(here, `${t}.test.mjs`)], { encoding: 'utf8', timeout: 290000, env: { ...process.env, PIPPIT_LLM: process.env.PIPPIT_LLM ?? 'off' } });
  const ok = r.status === 0; if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${t} (${((Date.now() - t0) / 1000).toFixed(1)}s)${ok ? '' : '\n' + (r.stderr || r.stdout || '').split('\n').slice(0, 12).join('\n')}`);
}
console.log(bad ? `${bad} teste(s) falharam` : `todos os ${list.length} testes passaram`); process.exit(bad ? 1 : 0);
