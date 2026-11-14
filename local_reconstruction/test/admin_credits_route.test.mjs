// 14/11/2026 — decisão do usuário: 2.000 créditos POR DIA para quem faz login e um login de ADMINISTRADOR sem limite.
// A credencial do admin vem SÓ do ambiente. Servidor real em porta efêmera, dados temporários, nada sai da máquina.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-admin-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
process.env.PIPPIT_ADMIN_EMAIL = 'Admin@Teste.Local'; process.env.PIPPIT_ADMIN_PASSWORD = 'senha-de-teste-forte-123';
const S = await import('../app/lib/store.mjs'); S.reset();
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
const jpost = (u, body, cookie) => fetch(base + u, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body ?? {}) });
const jget = async (u, cookie) => (await fetch(base + u, { headers: cookie ? { cookie } : {} })).json();
try {
  // 1) a tela sabe que existe login de administrador, sem revelar e-mail nem senha
  const a0 = await jget('/api/auth/state'); assert.equal(a0.adminLogin, true); assert.equal(a0.admin, false);
  assert.ok(!JSON.stringify(a0).includes('senha-de-teste-forte-123'), 'a senha nunca aparece em resposta de API');
  // 2) 2.000 créditos por dia para qualquer conta (conta nova: +200 de bônus; o dia soma 2.000)
  let st = await jget('/api/state'); assert.equal(st.balance, 200); assert.equal(st.unlimited, false);
  const dc = await (await jpost('/api/daily-claim')).json(); assert.equal(dc.claimed, true); assert.equal(dc.amount, 2000);
  st = await jget('/api/state'); assert.equal(st.balance, 2200, 'bônus 200 + 2.000 do dia');
  assert.equal((await (await jpost('/api/daily-claim')).json()).claimed, false, 'só uma concessão por dia');
  // 3) login comum (sem e-mail do admin) continua igual e NÃO vira admin
  const lc = await jpost('/api/auth/login', { password: '' }); assert.equal(lc.status, 200); assert.notEqual((await lc.json()).admin, true);
  // 4) senha errada do admin: 401 e nenhuma sessão de admin
  const bad = await jpost('/api/auth/login', { email: 'admin@teste.local', password: 'errada' }); assert.equal(bad.status, 401); assert.equal(bad.headers.get('set-cookie'), null);
  // 5) login do admin (e-mail sem diferenciar maiúsculas): cookie, créditos ilimitados
  const ok = await jpost('/api/auth/login', { email: ' ADMIN@teste.local ', password: 'senha-de-teste-forte-123' }); assert.equal(ok.status, 200);
  const body = await ok.json(); assert.equal(body.admin, true); assert.equal(body.unlimitedCredits, true); assert.equal(body.user.name, 'Administrador');
  const cookie = (ok.headers.get('set-cookie') || '').split(';')[0]; assert.match(cookie, /^piperline_session=/);
  const sa = await jget('/api/state', cookie); assert.equal(sa.unlimited, true); assert.equal(sa.admin, true); assert.equal(sa.balance, 1_000_000_000); assert.equal(sa.user.name, 'Administrador'); assert.equal(sa.user.role, 'admin');
  const as = await jget('/api/auth/state', cookie); assert.equal(as.admin, true); assert.equal(as.user.role, 'admin');
  // 6) sem o cookie, o mesmo servidor continua mostrando a conta comum (nada de ilimitado para quem não é admin)
  const sn = await jget('/api/state'); assert.equal(sn.unlimited, false); assert.equal(sn.balance, 2200);
  // 6b) conta que já tinha recebido os 80 antigos hoje (formato antigo de lastDailyClaim, sem valor): completa a diferença
  S.load().ledger.lastDailyClaim = new Date().toDateString(); const comp = S.claimDaily(); assert.equal(comp.claimed, true); assert.equal(comp.amount, 1920, '2.000 - 80 já concedidos'); assert.equal(S.claimDaily().claimed, false);
  // 7) tentativas erradas em série: bloqueio de 1 minuto (anti força bruta)
  let last = 0; for (let i = 0; i < 6; i++) last = (await jpost('/api/auth/login', { email: 'admin@teste.local', password: 'x' + i })).status;
  assert.equal(last, 429, 'depois de 5 erros, 429');
  console.log('OK admin_credits_route: 2.000 créditos/dia, login de administrador (credencial só do ambiente), saldo ilimitado só com a sessão do admin, anti força bruta');
} finally { await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true }); }
