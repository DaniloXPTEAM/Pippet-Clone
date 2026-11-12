import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('free_router_ui')) process.exit(0);
const fixture = await startUiFixture('piperline-free-router-ui-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  // PIPERLINE_TEST_CPU_RATE=8 deixa o navegador ~8x mais lento (CDP), para reproduzir em Linux o
  // timing de um PC modesto — foi sob lentidão que a instabilidade aparecia no Windows.
  const cpuRate = Number(process.env.PIPERLINE_TEST_CPU_RATE || 0);
  if (cpuRate > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate }); }
  await page.goto(`${fixture.base}/#/settings/llm`); await page.locator('#free-router').waitFor();
  // Clique com diagnóstico e com nova tentativa. Rodada 10, item 3: o SPA redesenha a tela enquanto o
  // roteador trabalha, e o Playwright aborta o clique quando o nó é trocado no meio ("element was
  // detached from the DOM") — sob CPU lenta isso derrubava ~70% das execuções aqui (e ~15% no PC do
  // usuário). Uma nova tentativa é o comportamento correto para uma interface que redesenha; o erro
  // final continua dizendo qual dos motivos impediu o clique.
  const clickReady = async (locator, label) => {
    const el = locator.first(); const errors = []; let tentativas = 0;
    for (let i = 0; i < 40; i++) {
      const info = await el.evaluate((node) => {
        const box = node.getBoundingClientRect(); const cx = Math.round(box.left + box.width / 2), cy = Math.round(box.top + box.height / 2);
        const top = document.elementFromPoint(cx, cy);
        return { visible: !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length), enabled: !node.disabled, box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }, covering: top === node || node.contains(top) ? null : `${top?.tagName?.toLowerCase()}${top?.id ? '#' + top.id : ''}${top?.className ? '.' + String(top.className).split(' ').join('.') : ''}` };
      }).catch(() => null);
      if (!info) { await page.waitForTimeout(100); continue; }
      if (!info.visible) { errors.push('não visível (caixa ' + JSON.stringify(info.box) + ')'); }
      else if (!info.enabled) { errors.push('desabilitado'); }
      else if (info.covering) { errors.push('coberto por ' + info.covering); }
      else { try { tentativas += 1; await el.click({ timeout: 2000 }); return; } catch (e) { errors.push('clique abortado (tela redesenhada): ' + String(e.message || e).split('\n')[0].slice(0, 120)); } }
      await page.waitForTimeout(150);
    }
    throw new Error(`clique em ${label} não ficou possível em ${tentativas} tentativa(s): ${[...new Set(errors)].join(' / ')}`);
  };

  const config = { version: 1, paidFallback: false, providers: [{ id: 'gemini', enabled: true, baseUrl: 'http://127.0.0.1:9000/v1beta', freeTierConfirmed: true, dailyLimit: 5, models: [{ id: 'fake-model', capabilities: ['text'], freeTierConfirmed: true }] }], taskPreferences: { text: ['gemini/fake-model'] } };
  await page.locator('#frconfig').fill(JSON.stringify(config)); await page.locator('#frsave').click(); await page.waitForTimeout(400); await page.locator('[data-fr-secret="gemini"]').waitFor();
  await page.locator('[data-fr-secret="gemini"]').fill('ui-only-test-secret'); await clickReady(page.locator('#frsave'), '#frsave (segundo Salvar)'); await page.waitForFunction(() => document.querySelector('#frresult')?.textContent.includes('Salvo'));
  // Regressão: a notificação (#toast) já cobriu botões no topo da tela e o clique nunca acontecia.
  const toast = await page.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'Salvo'; t.style.display = 'block'; const cs = getComputedStyle(t); return { pointerEvents: cs.pointerEvents, zIndex: cs.zIndex }; });
  assert.equal(toast.pointerEvents, 'none', 'a notificação não pode receber clique');
  const safe = await page.evaluate(async () => (await (await fetch('/api/free-router/config')).json()));
  assert.equal(safe.config.providers[0].hasKey, true); assert.ok(!JSON.stringify(safe).includes('ui-only-test-secret'));
  assert.match(await page.locator('#frresult').innerText(), /somente em memória/);
  await page.route('**/api/local-runs', async (route) => { if (route.request().method() !== 'POST') return route.continue(); await route.fulfill({ json: { ok: true, run: { id: 'run-ui-1', task: 'text', state: 'succeeded', prompt: 'Roteiro de teste UI', projectId: '123456789012', chatId: '123456789013', resultNodeId: 'n123456', result: 'Resposta fake exibida.', route: { providerName: 'Servidor fake', modelId: 'fake-model' } } } }); });
  await page.route('**/api/local-runs/run-ui-1', async (route) => route.fulfill({ json: { id: 'run-ui-1', task: 'text', state: 'succeeded', prompt: 'Roteiro de teste UI', projectId: '123456789012', chatId: '123456789013', resultNodeId: 'n123456', result: 'Resposta fake exibida.', route: { providerName: 'Servidor fake', modelId: 'fake-model' } } }));
  await page.goto(`${fixture.base}/#/home`); await page.locator('#prompt').fill('Roteiro de teste UI');
  // Rodada 10, item 3: medir o caminho do clique até a página da tarefa. Se o #localRunPage não aparecer,
  // o erro diz o que a tela tinha (hash, contadores do roteador, texto do toast) em vez de só "timeout".
  const posts = []; page.on('request', (r) => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/local-runs') posts.push(Date.now()); });
  const tClique = Date.now();
  await clickReady(page.locator('#freeSend').first(), '#freeSend');
  try { await page.locator('#localRunPage').waitFor({ timeout: 30000 }); }
  catch {
    const estado = await page.evaluate(() => ({ hash: location.hash, diag: window.__piperlineRoute, main: (document.querySelector('#main')?.innerHTML || '').slice(0, 300), toast: document.querySelector('#toast')?.textContent }));
    throw new Error(`#localRunPage não apareceu ${Date.now() - tClique} ms depois do clique; POSTs em /api/local-runs: ${posts.length}; estado: ${JSON.stringify(estado)}`);
  }
  const msAteAPagina = Date.now() - tClique;
  assert.equal(posts.length, 1, `o clique em #freeSend fez exatamente um POST /api/local-runs (fez ${posts.length})`);
  assert.match(await page.locator('#localRunPage').innerText(), /Resposta fake exibida/); assert.ok(await page.locator('#localRunPage a[href="#\/project\/123456789012"]').count() >= 1);
  console.log(`free_router_ui.test.mjs: Settings com segredos efêmeros; composer abre tarefa (${msAteAPagina} ms do clique até #localRunPage), mostra resultado e link Canvas/Histórico`);
} finally { await browser?.close(); await fixture.close(); }
