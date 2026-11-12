// Rodada 10 · item 3 — a tarefa do roteador abre mesmo quando a primeira leitura falha.
// Sintoma no PC do usuário: ~15% das execuções de free_router_ui ficavam 30 s esperando
// #localRunPage depois do clique em #freeSend. Causa no roteador/página: lastRoute era gravado ANTES
// de a página pintar e pageLocalRun estourava quando o corpo vinha nulo — nada era desenhado, e a
// deduplicação do roteador tratava a rota como desenhada. Aqui a falha é induzida de propósito.
import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('local_run_page_recovery')) process.exit(0);
const fixture = await startUiFixture('piperline-run-recovery-');
let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
  const runValido = (id) => ({ id, task: 'text', state: 'succeeded', prompt: 'Roteiro de teste UI', projectId: '123456789012', chatId: '123456789013', resultNodeId: 'n123456', result: 'Resposta fake exibida' });

  await page.goto(`${fixture.base}/#/home`);
  await page.locator('#prompt').waitFor();

  // ---- A) a primeira e a segunda leitura falham (500) e a terceira funciona: a página aparece.
  let leiturasA = 0;
  await page.route('**/api/local-runs/run-a', async (route) => {
    leiturasA += 1;
    if (leiturasA <= 2) return route.fulfill({ status: 500, json: { error: 'falha passageira simulada' } });
    return route.fulfill({ json: runValido('run-a') });
  });
  await page.evaluate(() => { location.hash = '/tasks/run/run-a'; });
  await page.locator('#localRunPage:not([data-erro])').waitFor({ timeout: 15000 });
  assert.match(await page.locator('#localRunPage').innerText(), /Resposta fake exibida/, 'com tentativas, a tarefa abre');
  assert.ok(leiturasA >= 3, `a página tentou de novo em vez de desistir na primeira falha (tentativas: ${leiturasA})`);

  // ---- B) falha persistente: o motivo aparece NA TELA (não fica a tela anterior, não fica em branco)
  await page.route('**/api/local-runs/run-b', async (route) => route.fulfill({ status: 503, json: { error: 'fora do ar simulado' } }));
  await page.evaluate(() => { location.hash = '/tasks/run/run-b'; });
  await page.locator('#localRunPage[data-erro="1"]').waitFor({ timeout: 15000 });
  const erro = await page.locator('#localRunPage').innerText();
  assert.match(erro, /Não foi possível carregar a tarefa/, 'a tela diz o que aconteceu');
  assert.match(erro, /503/, `a tela mostra o motivo (${erro.slice(0, 120)})`);
  const depoisDaFalha = await page.evaluate(() => ({ ...window.__piperlineRoute }));
  assert.equal(depoisDaFalha.lastRoute, '/tasks/run/run-b', 'a tela de motivo conta como desenhada (o usuário vê o que houve)');

  // ---- C) "Tentar de novo" funciona depois de a falha passar (rota não ficou envenenada)
  await page.unroute('**/api/local-runs/run-b');
  await page.route('**/api/local-runs/run-b', async (route) => route.fulfill({ json: runValido('run-b') }));
  await page.locator('#localRunRetry').click();
  await page.locator('#localRunPage:not([data-erro])').waitFor({ timeout: 15000 });
  assert.match(await page.locator('#localRunPage').innerText(), /Resposta fake exibida/, 'o botão de tentar de novo recarrega a tarefa');
  assert.equal(await page.locator('#routeError').count(), 0, 'nenhuma tela de erro sobrou no DOM');

  // ---- D) página que estoura (não trata o erro): o roteador mostra a falha e NÃO marca a rota como
  // desenhada — era exatamente esse o estado que travava a tela por 30 s no Windows.
  await page.route('**/api/help', async (route) => route.fulfill({ status: 500, json: { error: 'simulado' } }));
  await page.evaluate(() => { location.hash = '/help'; });
  await page.locator('#routeError').waitFor({ timeout: 15000 });
  assert.match(await page.locator('#routeError').innerText(), /Não foi possível abrir esta tela/);
  assert.match(await page.locator('#routeError').innerText(), /\/help/);
  const aposErro = await page.evaluate(() => ({ ...window.__piperlineRoute }));
  assert.notEqual(aposErro.lastRoute, '/help', 'rota que estourou não entra em lastRoute (a dedupe não pode tratá-la como desenhada)');
  assert.equal(aposErro.lastError?.route, '/help', 'o erro fica registrado em __piperlineRoute.lastError');

  // ---- E) "tentar de novo" na tela de erro desenha de fato depois de a falha passar
  await page.unroute('**/api/help');
  await page.locator('#routeRetry').click();
  await page.waitForFunction(() => location.hash === '#/help' && !!document.querySelector('#main .page, #main h1'), null, { timeout: 15000 });
  await page.waitForFunction(() => window.__piperlineRoute.lastRoute === '/help', null, { timeout: 15000 });
  assert.equal(await page.locator('#routeError').count(), 0, 'a tela de erro saiu quando a rota abriu');

  console.log(`local_run_page_recovery.test.mjs: leitura com 500 recupera por tentativa; falha persistente mostra o motivo e "tentar de novo"; rota que falha não é marcada como desenhada${consoleErrors.length ? ` (${consoleErrors.length} erro(s) de console registrados: falhas simuladas)` : ''}`);
} finally {
  await browser?.close();
  await fixture.close();
}
