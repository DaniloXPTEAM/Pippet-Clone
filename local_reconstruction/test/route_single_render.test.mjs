// Rodada 9 · item 4 — o roteador do app desenha UMA vez por rota.
// O defeito observado no Windows: a carga e o hashchange podiam rodar route_() em paralelo e cada
// execução reescreve #main; a mais antiga podia terminar depois da mais nova e trocar a tela no meio
// de um clique ("element is not stable", depois "detached from the DOM"), deixando free_router_ui
// instável. Aqui provamos o comportamento pelo que o próprio app expõe:
//   window.__piperlineRoute = { renders, skipped, concurrent, maxConcurrent, lastRoute }
//   document.body.dataset.homeRenders = quantas vezes a Home foi desenhada
import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('route_single_render')) process.exit(0);
const fixture = await startUiFixture('piperline-route-');
let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage();
  const diag = () => page.evaluate(() => ({ ...window.__piperlineRoute, homeRenders: Number(document.body.dataset.homeRenders) || 0 }));

  // 1) carga: a Home é desenhada UMA vez e nenhuma execução do roteador se sobrepõe a outra.
  await page.goto(`${fixture.base}/#/home`);
  await page.locator('#prompt').waitFor();
  await page.waitForTimeout(600);
  const carga = await diag();
  assert.equal(carga.homeRenders, 1, `a carga desenha a Home uma vez (desenhou ${carga.homeRenders})`);
  assert.equal(carga.maxConcurrent, 1, 'nunca há duas execuções do roteador ao mesmo tempo');
  assert.equal(carga.renders, 1, `uma renderização na carga (foram ${carga.renders})`);
  assert.equal(carga.lastRoute, '/home');

  // 2) rajada de hashes (o padrão que acontecia ao navegar rápido): três eventos, uma execução por
  // vez, as obsoletas são descartadas e a tela final é a última rota pedida.
  await page.evaluate(() => { location.hash = '/help'; location.hash = '/pricing'; location.hash = '/home'; });
  await page.waitForFunction(() => window.__piperlineRoute.lastRoute === '/home' && window.__piperlineRoute.concurrent === 0);
  await page.waitForTimeout(300);
  const rajada = await diag();
  assert.equal(rajada.maxConcurrent, 1, `a rajada não sobrepõe renderizações (máx ${rajada.maxConcurrent})`);
  // as três mudanças viram UMA execução (a primeira já estava rodando e as outras se agrupam):
  // só a rota final desenha, as intermediárias não chegam a pintar a tela.
  assert.equal(rajada.renders, 2, `só a rota final da rajada desenha (renders=${rajada.renders})`);
  assert.equal(rajada.homeRenders, 2, `a Home é desenhada uma vez por chegada nela, sem loop (foram ${rajada.homeRenders})`);
  assert.equal(await page.locator('#prompt').count(), 1, 'a tela final é a Home');

  // 3) rota lenta: se o hash muda durante os awaits de uma renderização, a antiga não desenha por
  // cima da nova (é o caso que produzia o DOM "detached" no meio do teste de clique).
  await page.route('**/api/state', async (route) => { await new Promise((resolve) => setTimeout(resolve, 800)); await route.continue(); });
  const antes = await diag();
  await page.evaluate(() => { location.hash = '/help'; });
  await page.waitForTimeout(80);
  await page.evaluate(() => { location.hash = '/home'; });
  await page.waitForFunction(() => window.__piperlineRoute.lastRoute === '/home' && window.__piperlineRoute.concurrent === 0, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const lenta = await diag();
  await page.unroute('**/api/state');
  assert.equal(lenta.maxConcurrent, 1, `continua sem sobreposição (máx ${lenta.maxConcurrent})`);
  assert.ok(lenta.skipped > antes.skipped, `a renderização de /help foi descartada por obsoleta (skipped ${antes.skipped} → ${lenta.skipped})`);
  assert.equal(lenta.lastRoute, '/home');
  assert.equal(await page.locator('#prompt').count(), 1, 'a Home continua na tela (a rota velha não desenhou por cima)');
  assert.equal(await page.locator('#helpCenter').count(), 0, 'a página de ajuda não ficou pendurada no DOM');

  console.log('route_single_render.test.mjs: uma renderização por rota; carga desenha a Home 1x; rajada de hash e rota lenta não sobrepõem nem redesenham em loop');
} finally {
  await browser?.close();
  await fixture.close();
}
