// Adendo r19 (13/11/2026) — paywall de Áudio (plano Free): a UI chama `POST /api/biz/v2/videogen/check`
// com {"generate_source":1} e recebe data.is_allowed:true; DEPOIS abre o modal de assinatura. O provedor
// gratuito local fica atrás da configuração nossa PIPPIT_FREE_AUDIO_PROVIDER (padrão desligado = observado).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-videogen-check-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off'; delete process.env.PIPPIT_FREE_AUDIO_PROVIDER;
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };

try {
  const c = await api('/api/biz/v2/videogen/check', { generate_source: 1 });
  assert.equal(c.status, 200);
  assert.equal(c.body.ret, '0');
  assert.equal(c.body.data.is_allowed, true, 'espelho do observado: is_allowed true');
  assert.equal(c.body.data.generate_source, 1);
  assert.ok(c.body.unobserved.some((u) => /resposta da API real/.test(u)), 'demais campos = UNOBSERVED');
  assert.match(c.body.note, /observado \(13\/11\)/);

  const a1 = await api('/api/composer/audio-mode');
  assert.equal(a1.body.freeLocalProvider.enabled, true, 'r20: gerador gratuito LIGADO por padrão (sem paywall)');
  assert.equal(a1.body.freeLocalProvider.config, 'PIPPIT_FREE_AUDIO_PROVIDER');

  process.env.PIPPIT_FREE_AUDIO_PROVIDER = '0';
  const a2 = await api('/api/composer/audio-mode');
  assert.equal(a2.body.freeLocalProvider.enabled, false, 'desligar é opção nossa, nunca paywall');
  assert.match(a2.body.freeLocalProvider.reason, /desligada por configuração/, 'sem provedor: o motivo é mostrado, nunca a tela de planos');
  delete process.env.PIPPIT_FREE_AUDIO_PROVIDER;

  console.log('videogen_check_route.test.mjs: ok (check espelha is_allowed:true e nunca bloqueia; r20: gerador gratuito ligado por padrão; PIPPIT_FREE_AUDIO_PROVIDER=0 desliga mostrando o motivo)');
} finally { app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); }
