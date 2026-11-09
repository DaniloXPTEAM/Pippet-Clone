// Extrai TODAS as requisições agent/submit_run já capturadas (HARs/JSONs em captures/) e decodifica run_extra/babi_param/client_extra.
// Somente leitura, offline. Saída: notes/_submit_runs_observed.json. Uso: (cd captures && node ../notes/extract_submit_runs.mjs)
import fs from 'node:fs';
import path from 'node:path';
const out = []; const seen = new Set(); const BS = String.fromCharCode(92);
const clean = (u) => String(u || '').split(BS).join('/').replace(/^.*captures\//, 'captures/');
function describeContent(c) {
  const r = { type: c.type, sub_type: c.sub_type };
  if (typeof c.data === 'string') { try { const d = JSON.parse(c.data); let pk = null; try { pk = Object.keys(JSON.parse(d.param)); } catch {} r.tool_name = d.tool_name; r.param_keys = pk; r.extra = d.extra; } catch { r.data_head = c.data.slice(0, 80); } }
  return r;
}
function tryBody(s, file, url) {
  if (typeof s !== 'string' || !s.includes('run_extra')) return; let b; try { b = JSON.parse(s); } catch { return; }
  if (!b.run_extra && !b.runExtra) return;
  const key = (b.request_id || '') + (b.message && b.message.run_id || '') + String((b.run_extra || '').length); if (seen.has(key)) return; seen.add(key);
  let re = {}; try { re = JSON.parse(b.run_extra || b.runExtra); } catch {}
  out.push({ file: clean(file), url: String(url || '').replace(/&(msToken|X-Bogus|X-Gnarly)=[^&]*/g, ''), agent_name: b.agent_name, entrance_from: b.entrance_from, business_scene: b.business_scene, thread_extra: b.thread_extra, has_project_id: b.project_id != null, thread_id_shape: String(b.message && b.message.thread_id || '').replace(/[0-9]{6,}/g, '<id>'), client_supported_tools: b.client_supported_tools ? b.client_supported_tools.map((t) => t.tool_name) : undefined, concurrency_control: b.concurrency_control, user_info_keys: b.user_info ? Object.keys(b.user_info) : undefined, body_keys: Object.keys(b), babi_param: re.babi_param, client_extra: re.client_extra, run_extra_keys: Object.keys(re), message_keys: b.message ? Object.keys(b.message) : undefined, content: (b.message && b.message.content || []).map(describeContent) });
}
function visit(o, file, url) {
  if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { for (const x of o) visit(x, file, url); return; }
  const u = o.url || url; if (o.postData && o.postData.text) tryBody(o.postData.text, file, o.url); if (o.request && o.request.postData && o.request.postData.text) tryBody(o.request.postData.text, file, o.request.url);
  for (const v of Object.values(o)) { if (typeof v === 'string') tryBody(v, file, u); else visit(v, file, u); }
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!/screenshots|verify/.test(e.name)) walk(p); } else if (/[.](har|json)$/.test(e.name) && fs.statSync(p).size < 150e6) { try { visit(JSON.parse(fs.readFileSync(p, 'utf8')), p, ''); } catch {} } }
}
walk('.'); fs.writeFileSync('../notes/_submit_runs_observed.json', JSON.stringify(out, null, 1)); console.log('submit_run distintos:', out.length);
for (const o of out) console.log(o.file.slice(-44), '|', o.agent_name, '|', o.entrance_from, '| tool_id', o.babi_param && o.babi_param.tool_id, '| mode', o.client_extra && o.client_extra.generate_mode, '| lv2', o.babi_param && o.babi_param.scene_lv2, '|', o.content.map((c) => (c.sub_type || c.type) + ':' + (c.tool_name || '')).join(','));
