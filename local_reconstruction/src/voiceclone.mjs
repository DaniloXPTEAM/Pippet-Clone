// Voz personalizada / clonagem de voz (#7) — adaptadores `huggingface-space` (Gradio) e `local-command`,
// completos e testados contra servidor falso. Mesmo contrato dos adaptadores de talkingphoto:
//   validateConfig(cfg) → erro | null; submit(cfg, entradas) → { jobId, accepted, ignored };
//   poll(cfg, { jobId }) → { state: queued|running|succeeded|failed, progress, error, result };
//   download(cfg, { result }) → bytes; cancel(cfg, { jobId }) → { requested, reason? }.
// Configuração SÓ local (settings.voiceclone): `space: dono/nome` (+ `apiName`) ou `baseUrl` do Space,
// e `command` para o executor local. HF_TOKEN opcional, só do ambiente (nunca arquivo/log/tela).
// Contrato do Space = documentado (upload Gradio, call com fila SSE, file=) e testado com servidor falso;
// não verificado contra um Space real nesta rodada (UNOBSERVED).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';

const loopbackOk = () => process.env.PIPPERLINE_ALLOW_LOOPBACK_MEDIA === '1';
const root = (u) => String(u).trim().replace(/\/+$/, '');
const esc = (s) => String(s).replace(/'/g, `'\\''`);
const hfToken = () => process.env.HF_TOKEN || '';
const hfAuth = () => (hfToken() ? { authorization: `Bearer ${hfToken()}` } : {});

function vcBase(cfg) {
  const explicit = String(cfg?.baseUrl || '').trim();
  if (explicit) return root(explicit);
  const space = String(cfg?.space || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(space)) throw new Error('informe o Space do Hugging Face (dono/space) ou uma baseUrl do Space');
  const [owner, name] = space.split('/');
  const slug = (s) => s.toLowerCase().replace(/[._]/g, '-');
  return `https://${slug(owner)}-${slug(name)}.hf.space`;
}
// Arquivo de saída só da MESMA origem do Space e por https (http só em loopback com permissão explícita).
const fileUrlAllowed = (url, base) => {
  let u; try { u = new URL(String(url)); } catch { return false; }
  const b = new URL(base);
  const secure = u.protocol === 'https:' || (loopbackOk() && u.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(u.hostname));
  return u.hostname === b.hostname && secure;
};
const parseSse = (text) => {
  const events = []; let ev = null; const data = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (line.startsWith('event:')) { if (ev && data.length) events.push({ event: ev, data: data.join('\n') }); ev = line.slice(6).trim(); data.length = 0; }
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (ev && data.length) events.push({ event: ev, data: data.join('\n') });
  return events;
};

export const ADAPTERS = Object.freeze({
  'huggingface-space': Object.freeze({
    id: 'huggingface-space', label: 'Hugging Face Space (Gradio) — clonagem de voz', requiresTaskConsent: true, freeExecution: true, allowRemote: true,
    timeoutMs: () => 300_000,
    configured: (cfg) => !!(String(cfg?.baseUrl || cfg?.space || '').trim() && cfg?.apiName),
    validateConfig(cfg = {}) {
      if (!String(cfg.baseUrl || cfg.space || '').trim()) return 'defina o dono/nome do Space (dono/nome) ou baseUrl';
      if (cfg.space && !/^[\w.-]+\/[\w.-]+$/.test(String(cfg.space))) return 'o Space precisa ser dono/nome';
      if (!cfg.apiName) return 'defina o nome da função no Space (apiName)';
      return null;
    },
    describe(cfg, req = {}) {
      const fields = { sample: 0, text: 1, ...(cfg.fields || {}) };
      const accepted = []; const ignored = [];
      for (const k of ['sample', 'text']) if (req[k]) (fields[k] != null ? accepted : ignored).push(k);
      return { accepted, ignored, fields };
    },
    async submit(cfg, { sample, text = '', fetchImpl = fetch }) {
      if (!sample?.bytes) throw new Error('amostra de voz ausente');
      const base = vcBase(cfg); const apiName = String(cfg.apiName || 'predict').replace(/^\/+/, '');
      // 1) upload da amostra (multipart Gradio)
      const fd = new FormData(); fd.set('files', new Blob([sample.bytes], { type: sample.mime || 'application/octet-stream' }), sample.name || 'amostra.wav');
      let r; try { r = await fetchImpl(`${base}/gradio_api/upload`, { method: 'POST', headers: hfAuth(), body: fd }); }
      catch (e) { throw Object.assign(new Error(`falha de rede no upload para o Space: ${e.message}`), { network: true }); }
      if (!r.ok) throw new Error(`upload falhou no Space (HTTP ${r.status})`);
      const b = await r.json().catch(() => null);
      const p = Array.isArray(b) ? b[0] : b?.files?.[0] ?? b?.path;
      if (!p) throw new Error('o Space não devolveu o caminho do arquivo enviado');
      const sampleData = { path: p, url: `${base}/gradio_api/file=${p}`, orig_name: sample.name || 'amostra.wav', mime_type: sample.mime || 'application/octet-stream', meta: { _type: 'gradio.FileData' } };
      // 2) chamada com fila: [amostra, texto]
      const desc = this.describe(cfg, { sample, text });
      const data = []; data[desc.fields.sample] = sampleData; if (desc.fields.text != null) data[desc.fields.text] = String(text || '').slice(0, 4000);
      let c; try { c = await fetchImpl(`${base}/gradio_api/call/${encodeURIComponent(apiName)}`, { method: 'POST', headers: { 'content-type': 'application/json', ...hfAuth() }, body: JSON.stringify({ data }) }); }
      catch (e) { throw Object.assign(new Error(`falha de rede na chamada do Space: ${e.message}`), { network: true }); }
      if (!c.ok) throw new Error(`o Space recusou a chamada (HTTP ${c.status})`);
      const { event_id: eventId } = await c.json();
      return { jobId: eventId, accepted: desc.accepted, ignored: desc.ignored };
    },
    async poll(cfg, { jobId, fetchImpl = fetch }) {
      const base = vcBase(cfg); const apiName = String(cfg.apiName || 'predict').replace(/^\/+/, '');
      let res; try { res = await fetchImpl(`${base}/gradio_api/call/${encodeURIComponent(apiName)}/${encodeURIComponent(jobId)}`, { headers: { accept: 'text/event-stream', ...hfAuth() } }); }
      catch (e) { return { state: 'failed', progress: 0, error: `falha de rede ao acompanhar o Space: ${e.message}`, result: null }; }
      if (!res.ok) return { state: 'failed', progress: 0, error: `falha ao acompanhar o Space (HTTP ${res.status})`, result: null };
      const events = parseSse(await res.text());
      const complete = events.find((e) => e.event === 'complete');
      if (!complete) return { state: 'running', progress: 0, error: null, result: null };
      let payload = null; try { payload = JSON.parse(complete.data); } catch { payload = null; }
      const out = payload?.data?.[0];
      const url = typeof out === 'string' ? out : out?.url || null;
      const p = typeof out === 'object' && out ? out.path || null : null;
      if (!url && !p) return { state: 'failed', progress: 0, error: 'o Space terminou sem devolver o áudio', result: null };
      const finalUrl = url || `${base}/gradio_api/file=${p}`;
      if (!fileUrlAllowed(finalUrl, base)) return { state: 'failed', progress: 0, error: `arquivo veio de origem estranha e foi recusado: ${new URL(finalUrl).origin}`, result: null };
      return { state: 'succeeded', progress: 100, error: null, result: { url: finalUrl, path: p, meta: (typeof out === 'object' && out) ? out.meta || null : null } };
    },
    async download(cfg, { result, fetchImpl = fetch }) {
      const res = await fetchImpl(result.url, { headers: hfAuth() });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    },
    cancel() { return { requested: false, reason: 'o fluxo do Space não expõe cancelamento (pedido registrado)' }; },
  }),
  'local-command': Object.freeze({
    id: 'local-command', label: 'Comando local — clonagem de voz', requiresTaskConsent: true, freeExecution: true, allowRemote: false,
    timeoutMs: () => 300_000,
    configured: (cfg) => !!cfg?.command,
    validateConfig(cfg = {}) {
      if (!cfg.command) return 'defina o comando local (command)';
      if (!/\{(sample|text|out|workdir)\}/.test(cfg.command)) return 'o comando precisa usar pelo menos um marcador {sample} {text} {out} {workdir}';
      return null;
    },
    async submit(cfg, { sample, text = '' }) {
      if (!sample?.bytes) throw new Error('amostra de voz ausente');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceclone-'));
      const samplePath = path.join(dir, sample?.name || 'amostra.wav'); const out = path.join(dir, 'voz_clonada.wav'); const log = path.join(dir, 'execucao.log');
      fs.writeFileSync(samplePath, Buffer.from(sample.bytes));
      const command = cfg.command.replace(/\{(sample|text|out|workdir)\}/g, (_, k) => esc({ sample: samplePath, text: String(text || ''), out, workdir: dir }[k]));
      const fd = fs.openSync(log, 'w'); let child;
      try { child = cp.spawn(command, { shell: true, cwd: dir, stdio: ['ignore', fd, fd] }); }
      catch (e) { fs.closeSync(fd); throw new Error(`não foi possível executar o comando local: ${e.message}`); }
      finally { try { fs.closeSync(fd); } catch {} }
      const jobId = `vc-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
      const entry = { child, out, log, dir, startedAt: Date.now(), state: 'running', error: null };
      localRuns.set(jobId, entry);
      child.on('error', (e) => { entry.state = 'failed'; entry.error = `falha ao iniciar o comando local: ${e.message}`; });
      child.on('close', (code) => { if (entry.state === 'running') { if (entry.cancelRequested) { entry.state = 'failed'; entry.error = 'cancelada pelo usuário'; return; } entry.state = code === 0 ? 'done' : 'failed'; if (code !== 0) entry.error = `o comando local terminou com código ${code}`; } });
      return { jobId, accepted: ['sample', 'text'], ignored: [] };
    },
    async poll(cfg, { jobId }) {
      const entry = localRuns.get(jobId);
      if (!entry) return { state: 'failed', progress: 0, error: 'execução local não encontrada (o app foi reiniciado?)', result: null };
      if (entry.state === 'running' && Date.now() - entry.startedAt > this.timeoutMs(cfg)) {
        try { entry.child.kill('SIGTERM'); } catch {}
        localRuns.delete(jobId); return { state: 'failed', progress: 0, error: `o comando local não terminou em ${Math.round(this.timeoutMs(cfg) / 1000)} s`, result: null };
      }
      if (entry.state === 'running') return { state: 'running', progress: 0, error: null, result: null };
      if (entry.state === 'failed') {
        let tail = ''; try { tail = fs.readFileSync(entry.log, 'utf8').trim().split('\n').slice(-3).join(' | ').slice(-300); } catch {}
        localRuns.delete(jobId); return { state: 'failed', progress: 0, error: `${entry.error}${tail ? `: ${tail}` : ''}`, result: null };
      }
      if (!fs.existsSync(entry.out)) { localRuns.delete(jobId); return { state: 'failed', progress: 0, error: 'o comando local terminou sem gerar o áudio de saída', result: null }; }
      localRuns.delete(jobId);
      return { state: 'succeeded', progress: 100, error: null, result: { path: entry.out, url: null } };
    },
    async download(cfg, { result }) {
      try { return fs.readFileSync(result.path); } catch { return null; }
    },
    cancel(cfg, { jobId }) {
      const entry = localRuns.get(jobId);
      if (!entry) return { requested: false };
      if (entry.state !== 'running') return { requested: false, reason: entry.state === 'done' ? 'a execução local já terminou com sucesso' : 'a execução local não está mais em andamento' };
      entry.cancelRequested = true;
      try { entry.child.kill('SIGTERM'); } catch {}
      entry.state = 'failed'; entry.error = 'cancelada pelo usuário';
      return { requested: true };
    },
  }),
});

const localRuns = new Map(); // jobId → { child, out, log, dir, startedAt, state, error, cancelRequested }

export const adapterFor = (name) => ADAPTERS[name] || null;
export const contractSummary = () => ({
  kind: 'voiceclone', line: '#7 voz personalizada (clonagem)',
  adapters: Object.values(ADAPTERS).map((a) => ({ id: a.id, label: a.label, requiresTaskConsent: a.requiresTaskConsent, freeExecution: a.freeExecution, allowRemote: a.allowRemote, timeoutMs: a.timeoutMs({}) })),
  note: 'Contrato documentado e testado com servidor falso; não verificado contra Space/provedor real nesta rodada (UNOBSERVED). HF_TOKEN opcional, só no ambiente.',
});
