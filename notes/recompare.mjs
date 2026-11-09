import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const REA = 'C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents'; const out = 'C:/w/PiperLine/captures/verify/screens';
for (const name of ['marketing', 'story', 'assets', 'skills']) {
  for (const side of ['original', 'local']) { const j = JSON.parse(fs.readFileSync(path.join(out, `${name}_${side}.json`), 'utf8')); fs.writeFileSync(path.join(out, `${name}_${side}_norm.json`), JSON.stringify({ inspection: j.data.normalized_result })); }
  const r = spawnSync(process.execPath, ['scripts/rea.mjs', 'compare-web-captures', path.join(out, `${name}_original_norm.json`), path.join(out, `${name}_local_norm.json`), '--format', 'json', '--full-output'], { cwd: REA, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, `${name}_compare.json`), r.stdout || ''); let j; try { j = JSON.parse(r.stdout); } catch { console.log(name, 'erro', (r.stderr || r.stdout).slice(0, 200)); continue; }
  const n = j.data?.normalized_result; if (!n) { console.log(name, 'erro', JSON.stringify(j.error || j).slice(0, 200)); continue; }
  const dims = Object.entries(n).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v) && v.status).map(([k, v]) => `${k}:${v.status}`).join(' ');
  console.log(JSON.stringify({ name, overall: n.overall_status, dims, evidence: j.data.evidence_id.slice(0, 15), before: n.before_target?.url, after: n.after_target?.url }));
}
process.exit(0);
