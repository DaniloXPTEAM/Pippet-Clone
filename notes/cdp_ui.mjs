// Operador de interface por CDP (playwright-core do pacote rea-agents): hover, clique por coordenadas, screenshots e texto de sobreposicoes.
// Somente leitura/abrir menus: nunca confirma, envia, exclui, publica nem autoriza. Saida: captures/auth/cdp/<tarefa>/
// Uso: node cdp_ui.mjs <tarefa> [...]   (tarefas em TASKS)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const OUT = 'C:/w/PiperLine/captures/auth/cdp';
const REA_TAB = fs.readFileSync('C:/w/PiperLine/notes/_rea_tab.txt', 'utf8').trim();

// v2 (21/10/2026): escolhe a aba do Pippit pela URL (o id fixo da aba mudava), trava o viewport em 1440x900 e usa bloqueio de arquivo
// para nao competir com capturas do REA. Camada confiavel (locate/rclick/step/runSteps) abaixo; as TASKS antigas continuam funcionando.
const VIEW = { width: 1440, height: 900 };
const LOCK = 'C:/w/PiperLine/notes/_cdp.lock';
async function acquireLock(maxMs = 120000) {
  const t0 = Date.now();
  while (fs.existsSync(LOCK) && Date.now() - t0 < maxMs) { if (Date.now() - fs.statSync(LOCK).mtimeMs > 600000) break; await new Promise((r) => setTimeout(r, 1000)); }
  fs.writeFileSync(LOCK, String(process.pid));
}
process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch {} });
async function connect() {
  await acquireLock();
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = browser.contexts().flatMap((c) => c.pages());
  const page = pages.filter((p) => /pippit\.ai/.test(p.url()))[0] || pages.find((p) => !/^chrome/.test(p.url())) || pages[0];
  if (!page) throw new Error('nenhuma aba do Pippit em 127.0.0.1:9222');
  const vs = page.viewportSize();
  if (!vs || vs.width !== VIEW.width || vs.height !== VIEW.height) await page.setViewportSize(VIEW).catch(() => {});
  return { browser, page };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Registro de rede das chamadas do app (/api, /commerce, /lv) em HAR 1.2 para o REA analisar (inspect-web-network-capture). Sem valores de cabecalho/cookie; parametros de assinatura da URL removidos.
function startNetlog(page) {
  const entries = []; const pending = [];
  // SSE (subscribe_run/thread, sse_asset): Network.streamResourceContent entrega os blocos enquanto a conexao fica aberta (Playwright so le o corpo ao fechar).
  const sse = new Map(); const sseNames = new Map(); let cdp = null;
  (async () => {
    cdp = await page.context().newCDPSession(page); await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', (ev) => { if (/subscribe_(run|thread)|sse_asset/.test(ev.request.url)) sseNames.set(ev.requestId, ev.request.url.split('?')[0].split('/').pop()); });
    cdp.on('Network.responseReceived', async (ev) => { if (!sseNames.has(ev.requestId)) return; try { const r = await cdp.send('Network.streamResourceContent', { requestId: ev.requestId }); sse.set(ev.requestId, { name: sseNames.get(ev.requestId), status: ev.response.status, parts: r.bufferedData ? [r.bufferedData] : [] }); } catch (e) { sse.set(ev.requestId, { name: sseNames.get(ev.requestId), error: String(e).slice(0, 120), parts: [] }); } });
    cdp.on('Network.dataReceived', (ev) => { const c = sse.get(ev.requestId); if (c && ev.data) c.parts.push(ev.data); });
  })().catch(() => {});
  const clean = (u) => u.replace(/([?&])(msToken|X-Bogus|X-Gnarly|_signature)=[^&]*/g, '$1$2=REDACTED');
  page.on('response', (res) => {
    const req = res.request(); const url = req.url();
    if (!/pippit\.ai\/(api|commerce|lv|jsonp)\//.test(url) || /\/lv\/v1\/event|monitor|report/.test(url)) return;
    pending.push((async () => {
      const ct = res.headers()['content-type'] || '';
      let text = null; let note = '';
      { const sse = /event-stream/.test(ct); try { text = await Promise.race([res.text(), new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), sse ? 25000 : 6000))]); } catch (e) { note = (sse ? 'SSE ' : '') + 'corpo indisponivel: ' + String(e).slice(0, 60); } }
      entries.push({ startedDateTime: new Date().toISOString(), time: 0, request: { method: req.method(), url: clean(url), httpVersion: 'h2', headers: [], queryString: [], cookies: [], headersSize: -1, bodySize: -1, postData: req.postData() ? { mimeType: req.headers()['content-type'] || '', text: req.postData().slice(0, 200000) } : undefined }, response: { status: res.status(), statusText: '', httpVersion: 'h2', headers: [], cookies: [], content: { size: text ? text.length : -1, mimeType: ct, text: text ? text.slice(0, 200000) : undefined, comment: note || undefined }, redirectURL: '', headersSize: -1, bodySize: -1 }, cache: {}, timings: { send: 0, wait: 0, receive: 0 } });
    })());
  });
  return { async save(file) { await Promise.allSettled(pending); fs.mkdirSync(path.dirname(file), { recursive: true });
    const streams = [...sse.values()].map((c) => ({ name: c.name, status: c.status, error: c.error, bytes: c.parts.reduce((n, p) => n + Buffer.from(p, 'base64').length, 0), text: Buffer.concat(c.parts.map((p) => Buffer.from(p, 'base64'))).toString('utf8').slice(0, 400000) }));
    fs.writeFileSync(file.replace(/\.har$/, '_sse.json'), JSON.stringify(streams, null, 1)); fs.writeFileSync(file, JSON.stringify({ log: { version: '1.2', creator: { name: 'cdp_ui.mjs netlog', version: '1' }, entries } }, null, 1)); return file + ' (' + entries.length + ' entradas)'; } };
}
async function snap(page, task, name) {
  const d = path.join(OUT, task); fs.mkdirSync(d, { recursive: true });
  await page.screenshot({ path: path.join(d, name + '.png') });
  // texto de sobreposicoes (dialog/menu/popover) + texto visivel curto
  const txt = await page.evaluate(() => {
    const sel = '[role=dialog],[role=menu],[role=listbox],[role=tooltip],[data-radix-popper-content-wrapper],[class*=popover],[class*=modal],[class*=Modal],[class*=dropdown],[class*=Dropdown]';
    const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
    return els.map((e) => (e.innerText || '').trim().replace(/\n{2,}/g, '\n').slice(0, 1500)).filter(Boolean);
  }).catch(() => []);
  fs.writeFileSync(path.join(d, name + '.txt'), JSON.stringify(txt, null, 1));
  return txt;
}
async function center(loc) { const b = await loc.first().boundingBox(); if (!b) throw new Error('sem box'); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; }
async function goto(page, url, wait = 6000) { try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (!/Timeout/i.test(String(e))) throw e; } await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {}); await sleep(wait); }

// ================= Camada confiavel (v2) =================
// Localizacao por DOM (css/testid/role+nome/texto, com nth e dentro de iframe), checagens antes do clique (existe, visivel, habilitado, rolagem,
// oclusao), hover para revelar controles, cliques reais (mouse -> locator -> dispatch -> teclado, uma so tentativa em operacoes mutaveis),
// espera da reacao, verificacao por diff da arvore de acessibilidade, evidencia de falha e limite de tempo por operacao.
const RISKY = /(delete|excluir|remover conta|publish|publicar|programar|pay|comprar|buy|subscribe|assinar|authori[sz]e|autorizar|generate|gerar|submit|enviar|sign out|sair da conta|confirm)/i;
const withTimeout = (p, ms, label) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`timeout ${ms}ms: ${label}`)), ms); })]).finally(() => clearTimeout(t)); };
// Foto de estado: por padrao so as camadas sobrepostas (menu/dialog/listbox/popper/tooltip) + contadores de aria-expanded e a URL (rapido).
// Com full:true usa a arvore de acessibilidade completa do body (lenta em paginas pesadas).
async function aria(page, full = false) {
  try {
    if (full) return (await page.locator('body').ariaSnapshot({ timeout: 15000 })).split(String.fromCharCode(10));
    const lines = [];
    const sel = '[role=menu],[role=dialog],[role=listbox],[role=tooltip],[data-radix-popper-content-wrapper],[role=alertdialog]';
    const els = page.locator(sel); const n = Math.min(await els.count(), 8);
    for (let k = 0; k < n; k++) { const e = els.nth(k); if (!(await e.isVisible().catch(() => false))) continue; try { lines.push(...(await e.ariaSnapshot({ timeout: 4000 })).split(String.fromCharCode(10))); } catch {} }
    const ex = await page.evaluate(() => [...document.querySelectorAll('[aria-expanded=true]')].map((e) => '[expandido] ' + (e.getAttribute('aria-label') || (e.innerText || '').trim().slice(0, 40)))).catch(() => []);
    lines.push(...ex, '[url] ' + page.url().split('#')[0]);
    return lines;
  } catch { return []; }
}
const newLines = (a, b) => { const s = new Set(a); return [...new Set(b.filter((l) => !s.has(l)))]; };
function scopeOf(page, spec) { if (spec && spec.frame) { const f = page.frames().find((x) => x.url().includes(spec.frame)); if (!f) throw new Error('iframe nao encontrado: ' + spec.frame); return f; } return page; }
function resolve(page, spec) {
  if (typeof spec === 'string') spec = { text: spec };
  const sc = scopeOf(page, spec);
  let loc;
  if (spec.css) loc = sc.locator(spec.css);
  else if (spec.testid) loc = sc.getByTestId(spec.testid);
  else if (spec.role) loc = sc.getByRole(spec.role, spec.name ? { name: spec.name, exact: spec.exact !== false } : {});
  else if (spec.label) loc = sc.getByLabel(spec.label, { exact: spec.exact !== false });
  else if (spec.text) loc = sc.getByText(spec.text, { exact: spec.exact !== false });
  else throw new Error('spec sem css/testid/role/label/text');
  if (spec.hasText) loc = loc.filter({ hasText: spec.hasText });
  if (spec.within) loc = (typeof spec.within === 'string' ? sc.locator(spec.within) : resolve(page, spec.within)).locator(loc);
  const i = spec.nth == null ? 0 : spec.nth;
  return spec.last ? loc.last() : loc.nth(i);
}
async function failEvidence(page, task, tag, info) {
  const d = path.join(OUT, task); fs.mkdirSync(d, { recursive: true });
  const n = fs.readdirSync(d).filter((f) => f.startsWith('_fail_')).length + 1;
  try { await page.screenshot({ path: path.join(d, `_fail_${n}_${tag}.png`) }); } catch {}
  fs.writeFileSync(path.join(d, `_fail_${n}_${tag}.json`), JSON.stringify({ url: page.url(), ...info }, null, 1));
}
// Revela controles escondidos: passa o mouse sobre o elemento e ate 3 ancestrais
async function reveal(page, loc) {
  for (let up = 0; up < 4; up++) {
    try { const t = up === 0 ? loc : loc.locator(`xpath=ancestor::*[${up}]`); const b = await t.boundingBox({ timeout: 1500 }); if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await sleep(500); if (await loc.isVisible()) return true; } } catch {}
  }
  return false;
}
// Clique confiavel. opts: {timeout,hover,mutating,allowRisky,expect:{text,url,expanded,gone},reactMs,task,tag,methods}
async function rclick(page, spec, o = {}) {
  const { timeout = 12000, hover = false, mutating = false, allowRisky = false, expect = null, reactMs = 1500, task = 'misc', tag = 'click' } = o;
  const rep = { spec, tag, steps: [], ok: false, verified: 'nao', method: null };
  const loc = resolve(page, spec);
  const label = JSON.stringify(spec).slice(0, 120);
  try {
    await withTimeout(loc.waitFor({ state: 'attached', timeout }), timeout + 2000, 'existe ' + label); rep.steps.push('existe');
    if (!(await loc.isVisible())) { await reveal(page, loc); rep.steps.push('hover-ancestrais'); }
    await withTimeout(loc.waitFor({ state: 'visible', timeout: 4000 }), 6000, 'visivel'); rep.steps.push('visivel');
    if (!(await loc.isEnabled())) throw new Error('desabilitado');
    const txt = ((await loc.innerText({ timeout: 1500 }).catch(() => '')) + ' ' + (await loc.getAttribute('aria-label').catch(() => ''))).trim();
    if (!allowRisky && RISKY.test(txt) && !spec.allowRisky) throw new Error('bloqueado por seguranca (texto de acao arriscada): ' + txt.slice(0, 60));
    await loc.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); rep.steps.push('rolagem');
    await sleep(250);
    const box = await loc.boundingBox(); if (!box) throw new Error('sem bounding box');
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2; rep.box = box;
    const covered = await loc.evaluate((el, p) => { const t = document.elementFromPoint(p.x, p.y); return !(t && (t === el || el.contains(t) || t.contains(el))) ? (t ? (t.tagName + '.' + String(t.className).slice(0, 40)) : 'nada') : null; }, { x: cx, y: cy }).catch(() => null);
    if (covered) { rep.covered_by = covered; rep.steps.push('coberto-por:' + covered); }
    const before = await aria(page, o.full), urlB = page.url();
    await page.mouse.move(cx, cy, { steps: 6 }); if (hover) await sleep(900); rep.steps.push('mouse');
    const afterHover = hover ? await aria(page, o.full) : before;
    const methods = o.methods || (mutating ? ['mouse'] : (covered ? ['dispatch', 'locator', 'keyboard'] : ['mouse', 'locator', 'dispatch', 'keyboard', 'arrowright']));
    for (const m of methods) {
      try {
        if (m === 'mouse') { const b2 = await loc.boundingBox(); await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); }
        else if (m === 'locator') await loc.click({ timeout: 5000, force: !!covered });
        else if (m === 'dispatch') await loc.dispatchEvent('click');
        else if (m === 'keyboard') { await loc.focus(); await page.keyboard.press('Enter'); }
        else if (m === 'arrowright') { await loc.focus(); await page.keyboard.press('ArrowRight'); }
      } catch (e) { rep.steps.push(m + ':erro ' + String(e).slice(0, 60)); continue; }
      rep.method = m;
      // espera a reacao (sem confundir demora com falha): ate reactMs + 3500 ms
      let after = before, gained = newLines(before, afterHover);
      if (!gained.length) for (let w = 0; w < 6; w++) { await sleep(w === 0 ? reactMs : 450); after = await aria(page, o.full); gained = newLines(before, after); if (gained.length || page.url() !== urlB) break; }
      else after = afterHover;
      rep.new_lines = gained.slice(0, 120); rep.new_count = gained.length; rep.url_changed = page.url() !== urlB;
      let verified = gained.length > 0 || rep.url_changed;
      if (expect) {
        verified = true;
        if (expect.text) verified = verified && after.some((l) => (expect.text instanceof RegExp ? expect.text.test(l) : l.includes(expect.text)));
        if (expect.url) verified = verified && page.url().includes(expect.url);
        if (expect.expanded) verified = verified && after.some((l) => /\[expanded\]/.test(l));
        if (expect.gone) verified = verified && !after.some((l) => l.includes(expect.gone));
      }
      rep.verified = verified ? 'sim' : (expect ? 'nao' : 'inconclusivo'); rep.ok = verified || !expect;
      if (verified || mutating || !expect) break; // sem expectativa: um clique que nao deu erro nao e repetido (evita duplo disparo)
      rep.steps.push(m + ':sem-reacao -> proximo metodo');
    }
    if (!rep.method) throw new Error('nenhum metodo de clique funcionou');
    if (expect && rep.verified !== 'sim') { rep.ok = false; throw new Error('resultado esperado nao observado'); }
  } catch (e) { rep.error = String(e).slice(0, 300); rep.ok = false; await failEvidence(page, task, tag, rep); }
  return rep;
}
// Executa passos declarativos com limite por passo e relatorio (diff de acessibilidade por passo). Evidencias em captures/auth/cdp/<task>/
async function runSteps(page, steps, task, perStepMs = 60000, full = false) {
  const d = path.join(OUT, task); fs.mkdirSync(d, { recursive: true });
  const report = []; let prev = await aria(page, full);
  for (const [i, s] of steps.entries()) {
    const t0 = Date.now(); const r = { i, step: s.tag || Object.keys(s)[0], status: 'ok' };
    try {
      await withTimeout((async () => {
        if (s.goto) { await goto(page, s.goto.startsWith('http') ? s.goto : 'https://www.pippit.ai/' + s.goto.replace(/^\/+/, ''), s.wait || 5000); }
        else if (s.click) { const c = await rclick(page, s.click, { ...(s.opts || {}), task, tag: s.tag || 's' + i }); r.click = { ok: c.ok, method: c.method, verified: c.verified, covered_by: c.covered_by, error: c.error, steps: c.steps }; r.new_count = c.new_count; r.new_lines = c.new_lines; if (!c.ok) r.status = 'falhou'; }
        else if (s.hover) { const l = resolve(page, s.hover); await l.waitFor({ state: 'attached', timeout: 10000 }); await reveal(page, l); const b = await l.boundingBox(); if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 }); await sleep(s.wait || 900); }
        else if (s.press) await page.keyboard.press(s.press);
        else if (s.scroll) { await page.mouse.wheel(0, s.scroll); await sleep(600); }
        else if (s.wait) await sleep(s.wait);
        else if (s.snap) await snap(page, task, s.snap);
        else if (s.read) { r.read = (await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | '), s.read)).slice(0, 900); }
        else if (s.fill) { if (!s.allowFill) throw new Error('fill exige allowFill:true'); await resolve(page, s.fill).fill(s.value || ''); }
      })(), s.timeout || perStepMs, r.step);
    } catch (e) { r.status = 'erro'; r.error = String(e).slice(0, 200); await failEvidence(page, task, 's' + i, { step: s, error: r.error }); }
    const cur = await aria(page, full); if (!r.new_lines) { const g = newLines(prev, cur); r.new_count = g.length; r.new_lines = g.slice(0, 120); } prev = cur;
    r.ms = Date.now() - t0; report.push(r);
    fs.writeFileSync(path.join(d, 'progress.json'), JSON.stringify(report, null, 1));
    if (s.snap || s.shot) await page.screenshot({ path: path.join(d, `${String(i).padStart(2, '0')}_${s.tag || 'step'}.png`) }).catch(() => {});
    console.log(`[${i}] ${r.step} ${r.status} ${r.ms}ms novas=${r.new_count ?? 0}${r.error ? ' | ' + r.error : ''}${r.read ? ' | LEITURA: ' + r.read : ''}`);
  }
  fs.writeFileSync(path.join(d, 'report.json'), JSON.stringify(report, null, 1));
  const md = ['# ' + task, ...report.map((r) => `- [${r.i}] ${r.step}: ${r.status} (${r.ms} ms, ${r.new_count ?? 0} linhas novas)${r.error ? ' — ' + r.error : ''}`)];
  fs.writeFileSync(path.join(d, 'report.md'), md.join('\n') + '\n');
  return report;
}
// Diagnostico de um controle: candidatos, visibilidade, caixa, oclusao e atributos (para escolher o melhor seletor)
async function probe(page, spec) {
  const loc = resolve(page, spec); const n = await (typeof spec === 'string' ? page.getByText(spec, { exact: false }) : resolve(page, { ...(typeof spec === 'string' ? { text: spec } : spec), nth: 0 })).count().catch(() => 0);
  const out = [];
  const all = typeof spec === 'object' && spec.css ? page.locator(spec.css) : (typeof spec === 'object' && spec.role ? page.getByRole(spec.role, spec.name ? { name: spec.name } : {}) : page.getByText(typeof spec === 'string' ? spec : spec.text, { exact: false }));
  const c = Math.min(await all.count(), 12);
  for (let k = 0; k < c; k++) { const l = all.nth(k); out.push({ k, visible: await l.isVisible().catch(() => false), box: await l.boundingBox().catch(() => null), tag: await l.evaluate((e) => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 50) + ' ' + (e.getAttribute('data-testid') || e.getAttribute('data-slot') || '')).catch(() => '') }); }
  return { count: await all.count(), samples: out, first_match_count: n };
}

const TASKS = {
  // Executa passos de um JSON: node cdp_ui.mjs run <arquivo.json | json-inline>  ({task, steps:[...]})
  async run({ page }) {
    const arg = process.argv[3]; const j = JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg);
    const net = j.netlog ? startNetlog(page) : null;
    const rep = await runSteps(page, j.steps, j.task || 'run'); const bad = rep.filter((r) => r.status !== 'ok'); console.log(`resumo: ${rep.length} passos, ${bad.length} com problema`);
    if (net) { await sleep(j.netlog.after_ms || 20000); const f = await net.save(j.netlog.file); console.log('netlog: ' + f); }
  },
  async probe({ page }) { const spec = JSON.parse(process.argv[3]); console.log(JSON.stringify(await probe(page, spec), null, 1)); },
  // menu "..." do item do Historico (hover revela o botao); abre o menu e depois "Compartilhar" (sem confirmar nada)
  async history_menu({ page }) {
    await goto(page, 'https://www.pippit.ai/home');
    const row = page.locator('button:has-text("PROJECT")').first();
    const c = await center(row); await page.mouse.move(c.x, c.y); await sleep(800); await snap(page, 'history_menu', '1_hover');
    await page.mouse.click(244, c.y); await sleep(1200); const t = await snap(page, "history_menu", "2_menu");
    console.log('menu:', JSON.stringify(t).slice(0, 300));
    const share = page.getByText('Compartilhar', { exact: true }).first();
    if (await share.count()) { await share.click(); await sleep(2500); const t2 = await snap(page, 'history_menu', '3_compartilhar'); console.log('compartilhar:', JSON.stringify(t2).slice(0, 600)); }
    await page.keyboard.press('Escape');
  },
  // "Detalhes" de uma skill (cartao) e de um ativo
  async skill_details({ page }) {
    await goto(page, 'https://www.pippit.ai/skill', 8000);
    const card = page.getByText('Shorts de história', { exact: true }).first();
    const c = await center(card); await page.mouse.move(c.x, c.y); await sleep(800); await snap(page, 'skill_details', '1_hover');
    const det = page.locator('button:has-text("Detalhes")').nth(1); const d = await center(det);
    await page.mouse.click(d.x, d.y); await sleep(2500); const t = await snap(page, 'skill_details', '2_detalhes'); console.log('skill:', JSON.stringify(t).slice(0, 600));
    await page.keyboard.press('Escape');
  },
  async asset_details({ page }) {
    await goto(page, 'https://www.pippit.ai/asset-management-material', 8000);
    const it = page.getByText('Pippit_1007_Desjejum.mp4', { exact: false }).first();
    const c = await center(it); await page.mouse.move(c.x, c.y); await sleep(800);
    await snap(page, 'asset_details', '1_hover');
    const det = page.locator('[role=tabpanel] button:has-text("Detalhes")').first(); const d = await center(det);
    await page.mouse.click(d.x, d.y); await sleep(2500); const t = await snap(page, 'asset_details', '2_detalhes'); console.log('ativo:', JSON.stringify(t).slice(0, 600));
    await page.keyboard.press('Escape');
  },
  // cartao "+" de voz personalizada (coordenadas do cartao) e menu "..." do avatar Crys (hover)
  async avatar_voice_cards({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000);
    await page.mouse.wheel(0, 700); await sleep(800);
    const lab = page.getByText('Criar nova', { exact: false }).first(); const c = await center(lab);
    await snap(page, 'avatar_voice_cards', '1_voz_scroll');
    await page.mouse.click(c.x, c.y); await sleep(3000); const t = await snap(page, 'avatar_voice_cards', '2_voz_clique'); console.log('voz:', JSON.stringify(t).slice(0, 800));
    await page.keyboard.press('Escape'); await sleep(500);
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 6000);
    const crys = page.getByText('Crys', { exact: true }).first(); const k = await center(crys);
    await page.mouse.move(k.x, k.y - 80); await sleep(800);
    await page.mouse.click(k.b.x + k.b.width - 22, k.b.y - 215); await sleep(1500); // "..." no canto superior direito do cartao
    const t2 = await snap(page, 'avatar_voice_cards', '3_crys_menu'); console.log('crys:', JSON.stringify(t2).slice(0, 600));
    await page.keyboard.press('Escape');
  },
  // recaptura: detalhes de ativo (espera a lista carregar)
  async asset_details2({ page }) {
    await goto(page, 'https://www.pippit.ai/asset-management-material', 3000);
    await page.waitForSelector('text=Desjejum', { timeout: 40000 }); await sleep(1500);
    const it = page.locator('[role=checkbox]').first(); const c = await center(it); await page.mouse.move(c.x + 200, c.y + 60); await sleep(800); await snap(page, 'asset_details2', '1_hover');
    const det = page.locator('button:has-text("Detalhes")').nth(1); const d = await center(det); await page.mouse.click(d.x, d.y); await sleep(3000);
    const t = await snap(page, 'asset_details2', '2_detalhes'); console.log('ativo:', JSON.stringify(t).slice(0, 700)); await page.keyboard.press('Escape');
  },
  // 3D Director Studio (abre o editor 3D a partir do no existente no canvas "PROJECT"); somente abrir e capturar
  async director3d({ page }) {
    await goto(page, 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260', 12000);
    const b = page.getByText('Abrir o 3D Director Studio').first(); const c = await center(b); await page.mouse.click(c.x, c.y); await sleep(7000);
    const t = await snap(page, 'director3d', '1_aberto'); console.log('3d:', page.url().slice(0, 140), JSON.stringify(t).slice(0, 500));
    await page.screenshot({ path: path.join(OUT, 'director3d', '2_full.png'), fullPage: false });
  },
  // avatar Crys: hover no cartao e clique no "..." (canto superior direito); "Aplicar"
  async avatar_menu_apply({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000);
    const crys = page.getByText('Crys', { exact: true }).first(); const k = await center(crys);
    await page.mouse.move(k.x, k.y - 120); await sleep(900); await snap(page, 'avatar_menu_apply', '1_hover');
    await page.mouse.click(k.b.x + k.b.width / 2 + 62, k.y - 205); await sleep(1500); const t = await snap(page, 'avatar_menu_apply', '2_menu'); console.log('menu avatar:', JSON.stringify(t).slice(0, 500));
    await page.keyboard.press('Escape'); await sleep(500);
    await page.mouse.move(k.x, k.y - 120); await sleep(600); const ap = page.getByText('Aplicar', { exact: true }).first();
    if (await ap.count()) { const a = await center(ap); await page.mouse.click(a.x, a.y); await sleep(4000); const t2 = await snap(page, 'avatar_menu_apply', '3_aplicar'); console.log('aplicar:', page.url().slice(0, 120), JSON.stringify(t2).slice(0, 500)); }
  },
  // cartao "+" da voz personalizada (clique no centro do cartao)
  async voice_plus({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000); await page.mouse.wheel(0, 700); await sleep(900);
    await snap(page, 'voice_plus', '1_scroll');
    const lab = page.getByText('Criar nova', { exact: false }).first(); const c = await center(lab); await page.mouse.click(c.x, c.y + 40); await sleep(3500);
    const t = await snap(page, 'voice_plus', '2_clique'); console.log('voz+:', JSON.stringify(t).slice(0, 700));
  },
  // menu "..." de um ativo da biblioteca (coordenadas medidas no print do viewport 1440x900)
  async asset_menu({ page }) {
    await goto(page, 'https://www.pippit.ai/asset-management-material', 3000); await page.waitForSelector('text=Desjejum', { timeout: 40000 }); await sleep(1500);
    await page.mouse.move(500, 380); await sleep(700); await page.mouse.click(655, 524); await sleep(1500);
    const t = await snap(page, 'asset_menu', '1_menu'); console.log('ativo menu:', JSON.stringify(t).slice(0, 500));
  },
  // cartoes de avatar/voz por coordenadas do print (viewport 1440x900)
  async avatar_voice_coords({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000);
    await page.mouse.click(509, 743); await sleep(3500); const t = await snap(page, 'avatar_voice_coords', '1_voz_mais'); console.log('voz:', JSON.stringify(t).slice(0, 700)); await page.keyboard.press('Escape'); await sleep(600);
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 6000);
    await page.mouse.move(662, 520); await sleep(900); await page.mouse.click(708, 462); await sleep(1500); const t2 = await snap(page, 'avatar_voice_coords', '2_crys_menu'); console.log('crys menu:', JSON.stringify(t2).slice(0, 500)); await page.keyboard.press('Escape'); await sleep(500);
    await page.mouse.move(662, 520); await sleep(900); await page.mouse.click(662, 608); await sleep(4000); const t3 = await snap(page, 'avatar_voice_coords', '3_aplicar'); console.log('aplicar:', page.url().slice(0, 140), JSON.stringify(t3).slice(0, 500));
  },
  // 3D Director Studio: percorre as categorias do menu esquerdo e le os paineis (sem salvar nada; sai ao final)
  async director3d_tour({ page }) {
    await goto(page, 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260', 12000);
    const b = page.getByText('Abrir o 3D Director Studio').first(); const c = await center(b); await page.mouse.click(c.x, c.y); await sleep(7000);
    await snap(page, 'director3d_tour', '0_inicio');
    for (const [i, y] of [[1, 132], [2, 190], [3, 245], [4, 300], [5, 355], [6, 410], [7, 468]]) { await page.mouse.click(30, y); await sleep(2200); const t = await page.evaluate(() => document.body.innerText.slice(0, 1800)); fs.mkdirSync(path.join(OUT, 'director3d_tour'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'director3d_tour', `${i}_cat.txt`), t); await page.screenshot({ path: path.join(OUT, 'director3d_tour', `${i}_cat.png`) }); }
    // abas superiores / botoes do topo (apenas leitura do texto)
    const top = await page.evaluate(() => document.body.innerText.slice(0, 2500)); fs.writeFileSync(path.join(OUT, 'director3d_tour', 'texto_total.txt'), top);
    const sair = page.getByText('Sair', { exact: true }).first(); if (await sair.count()) { await sair.click(); await sleep(2500); await snap(page, 'director3d_tour', '9_sair'); }
  },
  // 3D Director Studio, versao 2: espera o editor 3D abrir e le cada categoria pelo nome
  async director3d_tour2({ page }) {
    await goto(page, 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260', 26000);
    const b = page.getByText(/Abrir o 3D Director Studio|Editar o Studio/).first(); const c = await center(b); await page.mouse.click(c.x, c.y);
    await page.waitForSelector('text=Scene3D Editor', { timeout: 45000 }); await sleep(3000); const d = 'director3d_tour2'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await snap(page, d, '0_inicio');
    for (const [i, nm] of [[1, 'Meus'], [2, 'Perso'], [3, 'Objet'], [4, 'Câme'], [5, 'Ações'], [6, 'Movi'], [7, 'Imag']]) {
      try { await page.getByText(nm, { exact: false }).first().click({ timeout: 8000 }); await sleep(2500); const t = await page.evaluate(() => document.body.innerText.slice(0, 1600)); fs.writeFileSync(path.join(OUT, d, `${i}_${nm}.txt`), t); await page.screenshot({ path: path.join(OUT, d, `${i}_${nm}.png`) }); } catch (e) { console.log('cat falhou', nm, String(e).slice(0, 80)); }
    }
    const sair = page.getByText('Sair', { exact: true }).first(); if (await sair.count()) { await sair.click(); await sleep(2500); await snap(page, d, '9_sair'); }
  },
  async canvas_state({ page }) {
    await goto(page, 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260', 20000);
    await snap(page, 'canvas_state', '1'); const z = await page.evaluate(() => document.body.innerText.match(/\d+%/g)); console.log('zoom:', JSON.stringify(z));
  },
  // Publicar (Tarefas concluidas): abre o dialogo e PARA; sem contas vinculadas nada pode ser publicado
  async publish_dialog({ page }) {
    await goto(page, 'https://www.pippit.ai/home', 6000);
    await page.getByText('user3078616324451', { exact: false }).last().click(); await sleep(1200);
    await page.getByText('Tarefas concluídas', { exact: true }).first().click(); await sleep(2500); await snap(page, 'publish_dialog', '1_tarefas');
    const pub = page.locator('button:has-text("Publicar")').first(); await pub.click(); await sleep(3500);
    const t = await snap(page, 'publish_dialog', '2_publicar'); console.log('publicar:', JSON.stringify(t).slice(0, 900));
    fs.writeFileSync(path.join(OUT, 'publish_dialog', 'body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 3000)));
    await page.keyboard.press('Escape');
  },
  // Assistente de avatar de foto: usa a imagem de exemplo do proprio assistente; avanca ate a etapa 2/3 e NAO envia
  async photo_wizard({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000); const d = 'photo_wizard'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await page.mouse.click(532, 549); await page.waitForSelector('text=Carregue uma foto', { timeout: 15000 }); await sleep(1500); await snap(page, d, '1_etapa1');
    const srcs = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] img, .modal img, img')].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight })).filter((x) => x.src && x.w >= 60 && /^https?:|^data:/.test(x.src)));
    console.log('imgs:', JSON.stringify(srcs.slice(0, 6)).slice(0, 600));
    const tip = srcs.find((x) => x.w >= 100 && x.h >= 100 && !/avatar|logo/i.test(x.src)) || srcs[0];
    const b64 = await page.evaluate(async (u) => { const r = await fetch(u); const b = await r.blob(); return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); }, tip.src);
    const ext = /png/.test(b64.slice(0, 30)) ? 'png' : 'jpg'; const fp = path.join(OUT, d, 'exemplo_do_assistente.' + ext); fs.writeFileSync(fp, Buffer.from(b64.split(',')[1], 'base64')); console.log('exemplo salvo', fp, tip.w, tip.h);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByText('Solte a sua foto aqui ou clique para carregar').click()]); await fc.setFiles(fp); await sleep(4000); await snap(page, d, '2_apos_upload');
    const cb = page.locator('input[type=checkbox]').first(); if (await cb.count()) { await cb.check({ force: true }); } else { await page.getByText('Ao clicar na caixa de seleção').click(); } await sleep(800);
    await snap(page, d, '3_consentimento');
    const av = page.getByRole('button', { name: 'Avançar' }); if (await av.count() && await av.isEnabled()) { await av.click(); await sleep(6000); const t = await snap(page, d, '4_etapa2'); console.log('etapa2:', JSON.stringify(t).slice(0, 900)); fs.writeFileSync(path.join(OUT, d, 'etapa2_body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 2500)));
      const av2 = page.getByRole('button', { name: /Avançar|Próximo/ }); if (await av2.count() && await av2.isEnabled()) { await av2.click(); await sleep(5000); const t3 = await snap(page, d, '5_etapa3'); console.log('etapa3:', JSON.stringify(t3).slice(0, 900)); fs.writeFileSync(path.join(OUT, d, 'etapa3_body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 2500))); } }
    else console.log('Avançar indisponivel');
    await page.keyboard.press('Escape');
  },
  // Painel direito do editor: coloca um clipe de video existente da conta no rascunho e le as abas Basico/Plano de fundo/etc.
  async editor_right_panel({ page }) {
    await goto(page, 'https://www.pippit.ai/editor?tab_name=video_generator&sub_tab=video&edit_type=edit', 14000); const d = 'editor_right_panel'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await snap(page, d, '1_inicio');
    const item = page.getByText('Pippit_1007_Desjejum.mp4', { exact: false }).first(); const c = await center(item); await page.mouse.move(c.x, c.y - 40); await sleep(800); await snap(page, d, '2_hover_midia');
    await page.mouse.click(c.x, c.y - 40); await sleep(1500); await snap(page, d, '3_clique_midia');
    const plus = page.locator('[class*=add], [aria-label*=dd], button:has-text("+")').first(); if (await plus.count()) { try { await plus.click({ timeout: 3000 }); await sleep(1500); } catch {} }
    await snap(page, d, '4_pos_adicionar');
    for (const [i, nm] of [[1, 'Básico'], [2, 'Plano de fundo'], [3, 'Ferramentas inteligentes'], [4, 'Áudio'], [5, 'Animação'], [6, 'Velocidade']]) {
      try { await page.getByText(nm, { exact: true }).last().click({ timeout: 6000 }); await sleep(1800); const t = await page.evaluate(() => document.body.innerText.slice(0, 2200)); fs.writeFileSync(path.join(OUT, d, `5_${i}_${nm}.txt`), t); await page.screenshot({ path: path.join(OUT, d, `5_${i}_${nm}.png`) }); } catch (e) { console.log('aba falhou', nm, String(e).slice(0, 60)); }
    }
  },
  // Vincular conta (TikTok): so observa o redirecionamento/popup (URL, parametros) e fecha; NAO autoriza nada
  async oauth_redirect({ page }) {
    const ctx = page.context(); const seen = []; ctx.on('page', (p) => { seen.push(p); });
    await goto(page, 'https://www.pippit.ai/schedule-publish', 7000); const d = 'oauth_redirect'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await page.getByRole('button', { name: 'Vincular conta' }).first().click(); await sleep(1500); await snap(page, d, '1_menu');
    await page.getByRole('menuitem', { name: 'TikTok' }).first().click(); await sleep(7000);
    const urls = [page.url(), ...ctx.pages().map((p) => p.url())]; console.log('urls:', JSON.stringify([...new Set(urls)].map((u) => { try { const x = new URL(u); return x.origin + x.pathname + ' ?' + [...x.searchParams.keys()].join(','); } catch { return u.slice(0, 80); } })));
    for (const [i, p] of ctx.pages().entries()) { try { await p.screenshot({ path: path.join(OUT, d, `2_pagina_${i}.png`) }); fs.writeFileSync(path.join(OUT, d, `2_pagina_${i}.txt`), (await p.evaluate(() => document.body.innerText.slice(0, 1500))) + '\nURL-origem+caminho: ' + (() => { try { const x = new URL(p.url()); return x.origin + x.pathname; } catch { return ''; } })()); } catch {} }
    for (const p of seen) { try { await p.close(); } catch {} }
  },
  async publish_dialog2({ page }) {
    await goto(page, 'https://www.pippit.ai/home', 6000); const d = 'publish_dialog2'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await page.getByText('user3078616324451', { exact: false }).last().click(); await sleep(1200);
    await page.getByText('Tarefas concluídas', { exact: true }).first().click(); await sleep(2500);
    await page.mouse.click(696, 341); await sleep(3500); // icone de compartilhar/publicar da primeira tarefa
    const t = await snap(page, d, '1_publicar'); console.log('publicar:', JSON.stringify(t).slice(0, 1200));
    fs.writeFileSync(path.join(OUT, d, 'body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 3500)));
    await page.keyboard.press('Escape');
  },
  async photo_wizard2({ page }) {
    await goto(page, 'https://www.pippit.ai/avatar-and-voice', 8000); const d = 'photo_wizard2'; fs.mkdirSync(path.join(OUT, d), { recursive: true });
    await page.mouse.click(532, 549); await page.waitForSelector('text=Carregue uma foto', { timeout: 15000 }); await sleep(2000); await snap(page, d, '1_etapa1');
    const tips = await page.evaluate(() => [...document.querySelectorAll('img')].map((i) => { const r = i.getBoundingClientRect(); return { src: i.currentSrc || i.src, nw: i.naturalWidth, nh: i.naturalHeight, x: r.x, y: r.y, w: r.width, h: r.height }; }).filter((o) => o.w > 50 && o.w < 200 && o.y > 400 && o.y < 700 && o.x > 400 && o.x < 1100));
    console.log('tips:', JSON.stringify(tips.map((t) => [Math.round(t.x), Math.round(t.y), t.nw, t.nh])));
    const tip = tips.find((x) => x.nw === 256 && x.nh === 256); const b64 = await page.evaluate(async (u) => { const r = await fetch(u); const b = await r.blob(); return await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); }, tip.src);
    const ext = /png/.test(b64.slice(0, 30)) ? 'png' : 'jpg'; const fp = path.join(OUT, d, 'exemplo_do_assistente.' + ext); fs.writeFileSync(fp, Buffer.from(b64.split(',')[1], 'base64')); console.log('exemplo:', tip.nw, tip.nh);
    const up = fp.replace(/\.(jpg|png)$/, '_600.jpg'); const FF = 'C:/Users/Dannilo/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'; const rr = (await import('node:child_process')).spawnSync(FF, ['-y', '-i', fp, '-vf', 'scale=600:600:flags=lanczos', up]); console.log('upscale 600x600 rc', rr.status);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByText('Solte a sua foto aqui ou clique para carregar').click()]); await fc.setFiles(up); await sleep(3500); await snap(page, d, '2_apos_upload'); const feito = page.getByRole('button', { name: 'Feito' }); if (await feito.count()) { await feito.click(); await sleep(2500); await snap(page, d, '2b_apos_recorte'); }
    await page.evaluate(() => { const c = document.querySelector('input[type=checkbox]'); if (c) c.click(); }); await sleep(800); await snap(page, d, '3_consentimento');
    await page.mouse.click(400, 686); await sleep(800); await snap(page, d, '3a_consentimento_marcado');
    const av = page.getByRole('button', { name: 'Avançar' }); for (let k = 0; k < 20 && !(await av.isEnabled()); k++) await sleep(2000); await snap(page, d, '3b_apos_espera'); console.log('avancar habilitado:', await av.isEnabled());
    if (await av.isEnabled()) { await av.click(); await sleep(7000); const t = await snap(page, d, '4_etapa2'); console.log('etapa2:', JSON.stringify(t).slice(0, 800)); fs.writeFileSync(path.join(OUT, d, 'etapa2_body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 2500)));
      const av2 = page.getByRole('button', { name: /Avançar|Próximo|Continuar/ }); if (await av2.count() && await av2.first().isEnabled()) { await av2.first().click(); await sleep(5000); const t3 = await snap(page, d, '5_etapa3'); console.log('etapa3:', JSON.stringify(t3).slice(0, 800)); fs.writeFileSync(path.join(OUT, d, 'etapa3_body.txt'), await page.evaluate(() => document.body.innerText.slice(0, 2500))); } }
    await page.keyboard.press('Escape');
  },
};
const a0 = process.argv[2];
const names = (a0 === 'run' || a0 === 'probe') ? [a0] : (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TASKS).filter((k) => k !== 'run' && k !== 'probe'));
const ctx = await connect();
for (const n of names) { try { console.log('== ' + n); await TASKS[n](ctx); } catch (e) { console.log('ERRO ' + n, String(e).slice(0, 200)); } }
process.exit(0);
