// r20 (decisão do usuário — produto gratuito, sem bloqueio): enviar no modo Áudio GERA com o provedor
// gratuito por padrão (PIPPIT_TTS=fake nos testes) e NUNCA abre a tela de planos. O POST
// /api/biz/v2/videogen/check continua sendo chamado (espelho do fluxo observado no adendo r19), mas
// nada bloqueia — o paywall observado no original não é reproduzido.
import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('subscribe_modal_ui')) process.exit(0);
process.env.PIPPIT_TTS = 'fake';
const f = await startUiFixture('piperline-submodal-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  const checks = []; page.on('request', (r) => { if (r.url().includes('/api/biz/v2/videogen/check')) checks.push(r.postData() || ''); });
  await page.goto(`${f.base}/#/home`);
  await page.waitForSelector('#modeB');
  await page.evaluate(() => { window.__modalSeen = 0; window.__modalText = ''; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.('.modal') || n.querySelector?.('.modal'))) { window.__modalSeen++; window.__modalText += (n.innerText || n.textContent || ''); } }).observe(document.body, { childList: true, subtree: true }); });
  await page.locator('#modeB').click(); await page.locator('.menu a').filter({ hasText: 'Áudio' }).click();
  await page.locator('#prompt').fill('locução de teste');
  await page.locator('#send').click();
  // gera: o envio sai da home para a página da tarefa e a run de áudio termina com ativo
  await page.waitForFunction(() => /\/tasks\/run\//.test(location.hash), null, { timeout: 15_000 });
  const runs = await (await fetch(`${f.base}/api/local-runs`)).json();
  const run = runs.find((x) => x.task === 'audio_generation'); assert.ok(run, JSON.stringify(runs).slice(0, 300));
  for (let i = 0; i < 200 && ['queued', 'running'].includes(run.state); i += 1) { await new Promise((r) => setTimeout(r, 25)); Object.assign(run, (await (await fetch(`${f.base}/api/local-runs/${run.id}`)).json())); }
  assert.equal(run.state, 'succeeded', JSON.stringify(run).slice(0, 300));
  assert.equal(run.asset.kind, 'audio', 'gerou áudio com o provedor gratuito (falso nos testes)');
  // nunca a tela de planos
  const seen = await page.evaluate(() => ({ n: window.__modalSeen, t: window.__modalText }));
  assert.equal(seen.n, 0, `nenhuma tela de planos no envio (r20); vistas: ${seen.t.slice(0, 120)}`);
  assert.ok(!/No momento gratuito|Subscribe|Assine|R\$/.test(seen.t), 'sem textos de plano/cobrança');
  assert.equal(checks.length, 1, 'uma chamada a /api/biz/v2/videogen/check (espelho do fluxo observado)');
  assert.match(checks[0], /generate_source/, 'corpo {"generate_source":1}');
  const assets = await (await fetch(`${f.base}/api/assets?kind=audio`)).json(); assert.ok(assets.length >= 1, 'ativo de áudio existe');
  console.log('subscribe_modal_ui.test.mjs: ok (r20: envio em Áudio gera com provedor gratuito — fake nos testes — sem ver tela de planos; check chamado como espelho; paywall do original não reproduzido)');
} finally { await browser?.close(); await f.close(); }
