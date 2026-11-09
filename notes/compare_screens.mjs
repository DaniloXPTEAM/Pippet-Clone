// Comparação PASSIVA por tela (REA: inspect-web-page + compare-web-captures) entre o Pippit original (Chrome 9222, logado) e o app local (Chrome headless 9333).
// Não clica em nada que gere/gaste; só navega por URL e observa. Saída: captures/verify/screens/<tela>_{original,local,compare}.json + 1 linha-resumo por tela.
// Uso: node compare_screens.mjs "<nome>=<url original>|<url local>" ...
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const REA = 'C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents'; const out = 'C:/w/PiperLine/captures/verify/screens'; fs.mkdirSync(out, { recursive: true });
const rea = (args) => spawnSync(process.execPath, ['scripts/rea.mjs', ...args, '--format', 'json', '--full-output'], { cwd: REA, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=6144' } });
async function nav(port, url) {
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const tab = tabs.find((t) => t.type === 'page'); const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } })); await new Promise((r) => setTimeout(r, 7000)); ws.close(); return tab.id;
}
for (const spec of process.argv.slice(2)) {
  const [name, rest] = spec.split('='); const [uo, ul] = rest.split('|'); const row = { name };
  for (const [side, port, url] of [['original', 9222, uo], ['local', 9333, ul]]) {
    const id = await nav(port, url); const r = rea(['inspect-web-page', `http://127.0.0.1:${port}`, id, '--include-accessibility-text', '--include-storage-keys']); const f = path.join(out, `${name}_${side}.json`); fs.writeFileSync(f, r.stdout || '');
    let j; try { j = JSON.parse(r.stdout); } catch { row[side] = `erro: ${(r.stderr || r.stdout || '').slice(0, 120)}`; continue; }
    const norm = { inspection: j.data.normalized_result }; fs.writeFileSync(path.join(out, `${name}_${side}_norm.json`), JSON.stringify(norm)); row[side] = 'ok';
  }
  if (row.original === 'ok' && row.local === 'ok') {
    const r = rea(['compare-web-captures', path.join(out, `${name}_original_norm.json`), path.join(out, `${name}_local_norm.json`)]); fs.writeFileSync(path.join(out, `${name}_compare.json`), r.stdout || ''); let j; try { j = JSON.parse(r.stdout); } catch { row.compare = `erro: ${(r.stderr || r.stdout || '').slice(0, 160)}`; }
    if (j) { const n = j.data?.normalized_result ?? {}; row.compare = n.overall_status ?? (j.error?.message || 'sem status'); row.dimensions = Object.fromEntries(Object.entries(n).filter(([, v]) => v && typeof v === 'object' && v.status).map(([k, v]) => [k, v.status])); row.evidence = j.data?.evidence_id?.slice(0, 15); }
  }
  console.log(JSON.stringify(row));
}
process.exit(0);
