// Item 4 r20 — PROVA: usuário novo (estado novo) gera VÍDEO, IMAGEM e ÁUDIO com provedores falsos e
// nunca vê a tela de planos (o paywall observado no original não é reproduzido por decisão do usuário).
// Provedores falsos: local-ffmpeg (vídeo não-IA), mock da API de imagens (loopback) e PIPPIT_TTS=fake (voz).
// Os gatilhos que ABRIAM paywall no r19 também são exercitados: envio com modelo nomeado e Vídeo em avatar.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import os from 'node:os'; import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('sem_paywall_ui')) process.exit(0);
process.env.PIPPIT_TTS = 'fake';
const f = await startUiFixture('piperline-sempaywall-');
const media = await import('../app/lib/media.mjs');
if (!media.available()) { await f.close(); console.log('SKIP sem_paywall_ui: ffmpeg ausente — provedor falso de vídeo indisponível'); process.exit(0); }
// PNG 1x1 válido (provedor falso de imagem devolve este b64_json)
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
let browser;
const mock = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ b64_json: PNG_B64 }] })); }); });
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
try {
  const post = async (p, b) => { const r = await fetch(`${f.base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); return { status: r.status, body: await r.json() }; };
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/home`);
  await page.waitForSelector('#modeB');
  // coletor de telas de modal durante TODO o teste
  await page.evaluate(() => {
    window.__modals = []; window.__plansSeen = false;
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.('.modal') || n.querySelector?.('.modal'))) {
      const el = n.matches?.('.modal') ? n : n.querySelector('.modal');
      window.__modals.push(el.innerText || el.textContent || '');
      if (el.querySelector('.plans') || /No momento gratuito/.test(el.innerText || '')) window.__plansSeen = true;
    } }).observe(document.body, { childList: true, subtree: true });
  });
  // 1) gatilho antigo de paywall: enviar com modelo NOMEADO (Vídeo) → motivo, sem planos
  await page.locator('#modeB').click(); await page.locator('.menu a').filter({ hasText: 'Vídeo' }).click(); await page.waitForSelector('#modelB');
  await page.locator('#modelB').click();
  await page.waitForSelector('.modal #mp [data-id]');
  await page.locator('.modal #mp [data-id]').filter({ hasText: 'Dreamina Seedance 2.5' }).click();
  await page.locator('.modal .x').click();
  await page.waitForFunction(() => /Modelos personalizados/.test(document.querySelector('#modelB')?.textContent || ''), null, { timeout: 5_000 }); // modelo nomeado selecionado
  await page.locator('#prompt').fill('um vídeo de teste sem paywall');
  await page.locator('#send').click();
  await page.waitForFunction(() => /indisponível localmente/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20_000 });
  // 2) gatilho antigo de paywall: Vídeo em avatar → motivo do serviço, sem planos
  await page.goto(`${f.base}/#/avatars`); await page.waitForSelector('#va');
  await page.locator('#va').click();
  await page.waitForFunction(() => /exige o serviço de geração/.test(document.body.innerText), null, { timeout: 10_000 });
  await page.locator('.modal #pl').click();
  // 3) Áudio (provedor falso PIPPIT_TTS=fake): o envio GERA
  await page.goto(`${f.base}/#/home`); await page.waitForSelector('#modeB');
  await page.locator('#modeB').click(); await page.locator('.menu a').filter({ hasText: 'Áudio' }).click();
  await page.locator('#prompt').fill('locução de teste sem paywall');
  await page.locator('#send').click();
  await page.waitForFunction(() => /\/tasks\/run\//.test(location.hash), null, { timeout: 15_000 });
  const runs = await (await fetch(`${f.base}/api/local-runs`)).json();
  const run = runs.find((x) => x.task === 'audio_generation'); assert.ok(run, 'run de áudio criado');
  for (let i = 0; i < 200 && ['queued', 'running'].includes(run.state); i += 1) { await new Promise((r) => setTimeout(r, 25)); Object.assign(run, (await (await fetch(`${f.base}/api/local-runs/${run.id}`)).json())); }
  assert.equal(run.state, 'succeeded', 'áudio GERADO com provedor falso');
  assert.equal(run.asset.kind, 'audio');
  // 4) IMAGEM com provedor falso (mock OpenAI-compatível em loopback)
  assert.equal((await post('/api/image-provider', { baseUrl: `http://127.0.0.1:${mock.address().port}/v1`, model: 'gpt-image-falso', apiKey: 'k' })).status, 200);
  const proj = (await post('/api/projects', { type: 'canvas', title: 'sem paywall' })).body;
  const inode = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Imagem' })).body;
  const gi = await post(`/api/projects/${proj.id}/nodes/${inode.id}/generate`, { prompt: 'uma imagem de teste sem paywall' });
  assert.equal(gi.status, 200, JSON.stringify(gi.body).slice(0, 300)); assert.equal(gi.body.asset.kind, 'image');
  // 5) VÍDEO com provedor falso (local-ffmpeg, não-IA)
  assert.equal((await post('/api/settings', { provider: 'local-ffmpeg' })).status, 200);
  const vnode = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Vídeo' })).body;
  const gv = await post(`/api/projects/${proj.id}/nodes/${vnode.id}/generate`, { kind: 'video', ratio: '9:16', seconds: 3 });
  assert.equal(gv.status, 200, JSON.stringify(gv.body).slice(0, 300)); assert.equal(gv.body.asset.kind, 'video');
  // 6) NUNCA a tela de planos — nenhuma tela de modal com marcas de plano/cobrança
  const seen = await page.evaluate(() => ({ modals: window.__modals, plans: window.__plansSeen }));
  assert.equal(seen.plans, false, 'tela de planos nunca apareceu');
  for (const t of seen.modals) assert.ok(!/No momento gratuito|Subscribe|Assine|R\$\s?[\d.,]+/.test(t), 'tela com marca de plano/cobrança: ' + t.slice(0, 120));
  console.log('sem_paywall_ui.test.mjs: ok (usuário novo gerou vídeo (local-ffmpeg), imagem (mock) e áudio (PIPPIT_TTS=fake); gatilhos antigos de paywall — modelo nomeado e Vídeo em avatar — mostram só o motivo; nenhuma tela de planos, nenhum valor em R$, nenhum Subscribe)');
} finally { await browser?.close(); await new Promise((r) => mock.close(r)); await f.close(); }
