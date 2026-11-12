// Linha #7 — voz personalizada (clonagem): adaptadores `huggingface-space` e `local-command` COMPLETOS e
// testados contra SERVIDOR FALSO (upload → call → stream → download; erros e cancelamento honestos).
// Nada chama a internet; HF_TOKEN opcional do ambiente e nunca vaza. Contrato do Space = documentado;
// não verificado contra um Space real nesta rodada (UNOBSERVED).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-vc-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.PIPPERLINE_ALLOW_LOOPBACK_MEDIA = '1';
process.env.HF_TOKEN = 'hf-secreto-de-mentira';

const WAV = Buffer.from('RIFF....WAVEfmt fake-amostra-de-voz');
const OUT_AUDIO = Buffer.from('RIFF....WAVEfmt voz-clonada-de-mentira');

// ---------- servidor falso do Gradio (Space) ----------
const gradio = { uploads: 0, calls: [], streams: 0, mode: 'ok', completeAt: 2 };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1'); const root = `http://127.0.0.1:${fake.address().port}`;
    const raw = Buffer.concat(chunks);
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/gradio_api/upload' && req.method === 'POST') {
      gradio.uploads += 1; gradio.lastUpload = { contentType: req.headers['content-type'] || '', body: raw.toString('latin1'), auth: req.headers.authorization || null };
      if (gradio.mode === 'upload_error') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ detail: 'fila de upload do Space indisponível' })); }
      return json(200, [`/tmp/gradio/voz-${gradio.uploads}.wav`]);
    }
    if (url.pathname.startsWith('/gradio_api/call/') && req.method === 'POST') {
      const b = JSON.parse(raw.toString() || '{}'); gradio.calls.push({ path: url.pathname, data: b.data, auth: req.headers.authorization || null });
      return json(200, { event_id: `ev-${gradio.calls.length}` });
    }
    if (url.pathname.startsWith('/gradio_api/call/') && req.method === 'GET') {
      gradio.streams += 1;
      const id = url.pathname.split('/').pop();
      if (gradio.mode === 'error') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ detail: 'fila do Space indisponível' })); }
      const done = gradio.streams >= gradio.completeAt;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('event: generating\ndata: {"msg":"na fila"}\n\n');
      if (done) {
        const url_ = gradio.mode === 'foreign' ? 'https://evil.example/out.wav' : gradio.mode === 'gone' ? `${root}/gradio_api/file=/tmp/gradio/out-${id}-gone.wav` : `${root}/gradio_api/file=/tmp/gradio/out-${id}.wav`;
        res.write(`event: complete\ndata: ${JSON.stringify({ data: [{ path: `/tmp/gradio/out-${id}.wav`, url: url_, meta: { _type: 'gradio.FileData' } }] })}\n\n`);
      }
      return res.end();
    }
    if (url.pathname.includes('-gone.wav')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'arquivo expirado no Space' })); }
    if (url.pathname.startsWith('/gradio_api/file=') || url.pathname.startsWith('/files/')) { res.writeHead(200, { 'content-type': 'audio/wav' }); return res.end(OUT_AUDIO); }
    return json(404, { error: `rota falsa ${url.pathname}` });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const fakeBase = `http://127.0.0.1:${fake.address().port}`;

const { server: app } = await import('../app/server.mjs');
const VC = await import('../src/voiceclone.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
process.env.PIPERLINE_PUBLIC_ORIGIN = base;

const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 300);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };

try {
  // ---------- contrato declarado ----------
  assert.deepEqual(Object.keys(VC.ADAPTERS).sort(), ['huggingface-space', 'local-command']);
  const H = VC.adapterFor('huggingface-space'); const L = VC.adapterFor('local-command');
  for (const a of [H, L]) { assert.equal(a.requiresTaskConsent, true, 'consentimento por tarefa obrigatório'); assert.equal(a.freeExecution, true, 'execução gratuita declarada'); assert.ok(a.timeoutMs({}) >= 300_000); }
  assert.equal(H.allowRemote, true); assert.equal(L.allowRemote, false);
  assert.match(H.validateConfig({}), /dono\/nome/); assert.match(H.validateConfig({ space: 'dono/voz' }), /apiName/);
  assert.match(H.validateConfig({ space: 'ruim', apiName: 'x' }), /dono\/nome/);
  assert.match(L.validateConfig({}), /comando local/); assert.match(L.validateConfig({ command: 'echo oi' }), /marcador/);
  const ct = ok(await api('/api/voiceclone/contract', undefined, 'GET'), 'contrato');
  assert.equal(ct.kind, 'voiceclone'); assert.match(ct.line, /#7/);
  assert.ok(ct.adapters.length === 2); assert.match(ct.note, /UNOBSERVED/);
  assert.ok(!JSON.stringify(ct).includes('hf-secreto-de-mentira'), 'HF_TOKEN nunca em resposta');

  // ---------- configuração ----------
  const cfgErr = await api('/api/voiceclone/config', { adapter: 'huggingface-space', space: 'dono/voz' });
  assert.equal(cfgErr.status, 400); assert.match(cfgErr.body.error, /apiName/);
  ok(await api('/api/voiceclone/config', { adapter: 'huggingface-space', space: 'dono/voz', apiName: 'clone', baseUrl: fakeBase }), 'config do Space (baseUrl = servidor falso)');

  // ---------- fluxo completo no Space: upload → call → stream → download ----------
  const up = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent('amostra.wav'), 'content-type': 'audio/wav', 'x-cat': 'upload' }, body: WAV });
  assert.equal(up.status, 200); const sample = await up.json();
  gradio.mode = 'ok'; gradio.streams = 0; gradio.completeAt = 2;
  const run1 = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id, text: 'Fale isto com a minha voz' }), 'criar execução');
  assert.equal(run1.run.state, 'running');
  assert.equal(gradio.uploads, 1); assert.match(gradio.lastUpload.contentType, /multipart\/form-data/, 'upload multipart do Gradio');
  assert.ok(gradio.lastUpload.body.includes('files'), 'campo files do Gradio');
  assert.equal(gradio.lastUpload.auth, 'Bearer hf-secreto-de-mentira', 'HF_TOKEN do ambiente no upload');
  assert.equal(gradio.calls.length, 1);
  assert.equal(gradio.calls[0].data[0].meta._type, 'gradio.FileData');
  assert.equal(gradio.calls[0].data[0].orig_name, 'amostra.wav');
  assert.equal(gradio.calls[0].data[1], 'Fale isto com a minha voz');
  assert.equal(gradio.calls[0].auth, 'Bearer hf-secreto-de-mentira');
  assert.deepEqual(run1.run.accepted, ['sample', 'text']);

  let run = null;
  for (let i = 0; i < 30; i++) { const t = ok(await api(`/api/voiceclone/runs/${run1.run.id}/tick`, {}), 'tick'); run = t.run; if (run.state !== 'running') break; await new Promise((x) => setTimeout(x, 30)); }
  assert.equal(run.state, 'succeeded', run.error || '');
  assert.ok(run.resultAssetId, 'áudio clonado virou asset');
  const saida = await fetch(`${base}/api/assets/${run.resultAssetId}/file`);
  assert.equal(saida.status, 200);
  assert.deepEqual(Buffer.from(await saida.arrayBuffer()), OUT_AUDIO, 'bytes do áudio baixado do Space');

  // ---------- erros honestos ----------
  gradio.mode = 'foreign'; gradio.streams = 0; gradio.completeAt = 1;
  const runF = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id }), 'execução (origem estranha)');
  let rf = null;
  for (let i = 0; i < 30; i++) { const t = await api(`/api/voiceclone/runs/${runF.run.id}/tick`, {}); rf = t.body.run; if (rf.state !== 'running') break; await new Promise((x) => setTimeout(x, 30)); }
  assert.equal(rf.state, 'failed'); assert.match(rf.error, /origem estranha/);
  assert.equal(rf.resultAssetId, null, 'sem sucesso inventado');

  gradio.mode = 'gone'; gradio.streams = 0; gradio.completeAt = 1;
  const runG = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id }), 'execução (arquivo expirado)');
  let rg = null;
  for (let i = 0; i < 30; i++) { const t = await api(`/api/voiceclone/runs/${runG.run.id}/tick`, {}); rg = t.body.run; if (rg.state !== 'running') break; await new Promise((x) => setTimeout(x, 30)); }
  assert.equal(rg.state, 'failed'); assert.match(rg.error, /baixar/);

  gradio.mode = 'upload_error';
  const upErr = await api('/api/voiceclone/runs', { sampleAssetId: sample.id });
  assert.equal(upErr.status, 502); assert.match(upErr.body.error, /upload/);

  // ---------- executor local ----------
  const script = path.join(tmp, 'clonar_falso.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs'; fs.writeFileSync(process.argv[4], Buffer.from(${JSON.stringify([...OUT_AUDIO])}));\n`);
  ok(await api('/api/voiceclone/config', { adapter: 'local-command', command: `"${process.execPath}" "${script}" {sample} {text} {out}` }), 'config do executor local');
  const runL = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id, text: 'oi' }), 'execução local');
  let rl = null;
  for (let i = 0; i < 60; i++) { const t = await api(`/api/voiceclone/runs/${runL.run.id}/tick`, {}); rl = t.body.run; if (rl.state !== 'running') break; await new Promise((x) => setTimeout(x, 30)); }
  assert.equal(rl.state, 'succeeded', rl.error || '');
  assert.ok(rl.resultAssetId);

  // comando que não gera saída → falha honesta
  const semSaida = path.join(tmp, 'sem_saida.mjs'); fs.writeFileSync(semSaida, 'process.exit(0);\n');
  ok(await api('/api/voiceclone/config', { adapter: 'local-command', command: `"${process.execPath}" "${semSaida}" {sample} {text} {out}` }), 'config sem saída');
  const runS = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id }), 'execução sem saída');
  let rs = null;
  for (let i = 0; i < 60; i++) { const t = await api(`/api/voiceclone/runs/${runS.run.id}/tick`, {}); rs = t.body.run; if (rs.state !== 'running') break; await new Promise((x) => setTimeout(x, 30)); }
  assert.equal(rs.state, 'failed'); assert.match(rs.error, /sem gerar o áudio/);

  // cancelamento: execução longa cancelada → "cancelada pelo usuário"
  const lenta = path.join(tmp, 'lenta.mjs'); fs.writeFileSync(lenta, `setTimeout(() => {}, 60000);\n`);
  ok(await api('/api/voiceclone/config', { adapter: 'local-command', command: `"${process.execPath}" "${lenta}" {sample} {text} {out}` }), 'config demorada');
  const runC = ok(await api('/api/voiceclone/runs', { sampleAssetId: sample.id }), 'execução demorada');
  const canc = ok(await api(`/api/voiceclone/runs/${runC.run.id}/cancel`, {}), 'cancelar');
  assert.equal(canc.requested, true);
  assert.equal(canc.run.state, 'failed'); assert.match(canc.run.error, /cancelada pelo usuário/);

  // poll de job desconhecido (app reiniciado) → motivo claro
  const lost = await L.poll({}, { jobId: 'vc-que-nao-existe' });
  assert.equal(lost.state, 'failed'); assert.match(lost.error, /não encontrada/);

  console.log('ok (test/voiceclone_adapters.test.mjs)');
} finally {
  await new Promise((r) => app.close(r)); await new Promise((r) => fake.close(r));
}
