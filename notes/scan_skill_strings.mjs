// Varredura OFFLINE (sem reanálise) dos 250 bundles já baixados em scripts/auth_bundles: extrai pares chave i18n -> texto padrão (formato .t("Chave",{},"Texto"))
// e filtra os relacionados a Skills/prompts/workflows. Saída: notes/skill_strings_scan.json. Não executa nenhum código dos bundles.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = 'C:/w/PiperLine/scripts/auth_bundles'; const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const RE = /\.t\(\s*"([A-Za-z0-9_]+)"\s*,\s*(\{[^{}]*\}|\{\})\s*,\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*\)/g;
const KEY = /skill|drama|vlog|commerce|viral|batch|3.?view|storyboard|prompt|workflow|template|agent_?mode|creative_?design|script|hook|ugc/i; const out = []; let total = 0;
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f)); const s = buf.toString('utf8'); const sha = crypto.createHash('sha256').update(buf).digest('hex'); let m;
  while ((m = RE.exec(s))) { total++; let txt; try { txt = JSON.parse(m[3].startsWith('`') ? JSON.stringify(m[3].slice(1, -1)) : m[3]); } catch { txt = m[3].slice(1, -1); } if (KEY.test(m[1]) || KEY.test(txt)) out.push({ file: f, sha256: sha, key: m[1], text: txt, offset: m.index }); }
}
const byKey = new Map(); for (const o of out) { const k = o.key + '|' + o.text; if (!byKey.has(k)) byKey.set(k, { key: o.key, text: o.text, files: [] }); byKey.get(k).files.push({ file: o.file, sha256: o.sha256, offset: o.offset }); }
const uniq = [...byKey.values()]; fs.writeFileSync('C:/w/PiperLine/notes/skill_strings_scan.json', JSON.stringify({ geradoEm: new Date().toISOString(), bundles: files.length, paresI18nTotal: total, filtrados: uniq.length, itens: uniq }, null, 1));
console.log({ bundles: files.length, total, filtrados: uniq.length });
const groups = {}; for (const u of uniq) { const g = u.key.split('_').slice(0, 3).join('_'); groups[g] = (groups[g] || 0) + 1; } console.log(Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}:${v}`).join(' '));
