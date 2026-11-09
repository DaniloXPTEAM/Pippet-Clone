// Offline: (1) diff por modulo entre cada bundle analisado e a sua versao nova (deploy de 28/10/2026, lida do cache local do Chrome);
// (2) sondas de contrato: strings dos contratos documentados continuam existindo nas versoes novas? Saida: notes/_drift_check.json. Sem rede.
import fs from 'node:fs';
import path from 'node:path';
const D = 'scripts/auth_bundles', C = 'scripts/current_20261029';
const drift = JSON.parse(fs.readFileSync('notes/_build_drift_cache.json', 'utf8')); const defRe = /[,{](\d{3,7})\((\w),(\w)(?:,(\w))?\)\{/g;
const mods = (t) => { const pos = []; let m; defRe.lastIndex = 0; while ((m = defRe.exec(t))) pos.push([m[1], m.index]); const o = new Map(); pos.forEach((p, i) => o.set(p[0], t.slice(p[1], pos[i + 1] ? pos[i + 1][1] : t.length))); return o; };
const oldFile = (c) => fs.readdirSync(D).find((f) => f.startsWith(`async__${c.name || c.id}.${c.antigo}`)); const newFile = (c) => fs.readdirSync(C).find((f) => f.startsWith(`async__${(c.name || c.id).replace(/[\\/]/g, '__')}.${c.novo}`));
const rows = []; const unavailable = [];
for (const c of drift.filter((x) => x.analisado)) {
  const of = oldFile(c), nf = newFile(c); if (!of || !nf) { unavailable.push(c.name || c.id); continue; }
  const O = mods(fs.readFileSync(path.join(D, of), 'utf8')), N = mods(fs.readFileSync(path.join(C, nf), 'utf8')); let changed = 0, added = 0, removed = 0; const chIds = [];
  for (const [id, s] of O) { if (!N.has(id)) removed++; else if (N.get(id) !== s) { changed++; chIds.push(id); } } for (const id of N.keys()) if (!O.has(id)) added++;
  rows.push({ chunk: c.name || c.id, antigo: of, novo: nf, modulos_antigos: O.size, modulos_novos: N.size, alterados: changed, adicionados: added, removidos: removed, ids_alterados: chIds.slice(0, 12) });
}
const sameSet = new Set(JSON.parse(fs.readFileSync('notes/_build_drift.json', 'utf8')).bundles_alterados.map((k) => `async__${k}.js`));
const oldCorpus = fs.readdirSync(D).filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync(path.join(D, f), 'utf8')]);
const newCorpus = [...oldCorpus.filter(([f]) => !sameSet.has(f)), ...fs.readdirSync(C).filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync(path.join(C, f), 'utf8')])];
const PROBES = ['front_tool', 'ai_agent', 'video_gen', 'image_gen', 'audio_gen', 'pre_activate_skills', 'pre_activate_skills_type', 'biz/preload_skill', 'biz/addon_skill', 'biz/x_data_direct_tool_call_req', 'biz/x_tool_name_video_part', 'pippit_video_part_agent', 'pippit_image_part_agent', 'pippit_audio_part_agent', 'pippit_nest_agent', 'web_video_direct', 'dynamic_questionnaire', 'marketing_agent', 'integrated_agent_canvas', '/api/biz/v1/agent/submit_run', '/api/biz/v1/videogen/script_segment', '/api/biz/v1/videogen/text_to_speech', '/commerce/v3/benefits/batch_check_withhold_deduct', '/api/biz/v1/omni/create_task_web', '/lv/v1/render_task/create', 'ai_talking_photo/pre_process_image', 'ai_talking_photo/pre_process_audio', '/api/biz/v1/videogen/recommend_digital_human_by_tag', '/api/biz/v1/videogen/search_platform_material', 'digital_human_filter_config', 'cc_biz_talking_photo', '/api/biz/v1/editor/create_tts_avatar_task', 'smart_tool_type:20007', '88320131', '1043788868', '573081', '348188', 'x-commerce-v2', 'MiniMax-H3-trial'];
const probes = PROBES.map((p) => { const o = oldCorpus.filter(([, t]) => t.includes(p)).map(([f]) => f); const n = newCorpus.filter(([, t]) => t.includes(p)).map(([f]) => f); return { probe: p, antigo: o.length, novo: n.length, situacao: n.length ? 'presente' : o.length && o.every((f) => unavailable.some((u) => f.includes(`async__${u}.`)) ) ? 'inconclusivo (so existia em chunk sem versao nova local)' : o.length ? 'AUSENTE no novo' : 'nunca presente nos chunks' }; });
const out = { gerado_em: '2026-10-29', chunks_comparados: rows.length, sem_versao_nova_local: unavailable, modulos_alterados_total: rows.reduce((s, r) => s + r.alterados, 0), modulos_adicionados_total: rows.reduce((s, r) => s + r.adicionados, 0), modulos_removidos_total: rows.reduce((s, r) => s + r.removidos, 0), por_chunk: rows, sondas: probes };
fs.writeFileSync('notes/_drift_check.json', JSON.stringify(out, null, 1));
console.log('chunks comparados', rows.length, '| sem versao nova local:', unavailable.join(' '), '| modulos alterados/adicionados/removidos:', out.modulos_alterados_total, out.modulos_adicionados_total, out.modulos_removidos_total);
console.log(rows.sort((a, b) => b.alterados - a.alterados).map((r) => `${r.chunk}: ${r.alterados} alt, +${r.adicionados}, -${r.removidos} de ${r.modulos_antigos}`).join('\n'));
console.log('--- sondas'); for (const p of probes) console.log(p.situacao.padEnd(14).slice(0, 14), String(p.antigo).padStart(3), String(p.novo).padStart(3), p.probe);
