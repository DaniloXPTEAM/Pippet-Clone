// Linha 15 do inventário — página pública de preços: avaliações e seções de recursos observadas
// em notes/pages/02_pricing.json (H2s e navegação de revisões). Os textos das avaliações não foram
// preservados: o carrossel reproduz só a navegação observada e marca o conteúdo UNOBSERVED.
import assert from 'node:assert/strict';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

if (skipUnavailableBrowser('pricing_reviews_ui')) process.exit(0);
const f = await startUiFixture('piperline-pricing-reviews-');
let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/pricing`);
  // Seções de recursos observadas (H2 de notes/pages/02_pricing.json).
  for (const h of ['Detalhes do plano', 'Por que escolher o Pippit', 'Perguntas frequentes', 'Crie com asas Criação de conteúdo turbinada', 'O Agente de IA definitivo que facilita o marketing eficaz.']) {
    assert.ok(await page.getByRole('heading', { name: h, exact: true }).count(), `seção observada presente: ${h}`);
  }
  assert.equal(await page.getByRole('heading', { name: 'Créditos', exact: true }).count(), 1);
  // Carrossel de avaliações: navegação observada (Previous/Next/Show review 1–5), conteúdo UNOBSERVED.
  assert.equal(await page.locator('#revCount').innerText(), 'Show review 1');
  await page.locator('#revNext').click(); assert.equal(await page.locator('#revCount').innerText(), 'Show review 2');
  await page.locator('#revPrev').click(); assert.equal(await page.locator('#revCount').innerText(), 'Show review 1');
  await page.locator('#revPrev').click(); assert.equal(await page.locator('#revCount').innerText(), 'Show review 5');
  await page.locator('[data-rev="3"]').click(); assert.equal(await page.locator('#revCount').innerText(), 'Show review 3');
  assert.match(await page.locator('#reviewCarousel').innerText(), /UNOBSERVED/);
  assert.deepEqual(errors, []);
  console.log('pricing_reviews_ui.test.mjs: ok (seções observadas e carrossel Previous/Next/Show review 1–5; textos UNOBSERVED)');
} finally {
  await browser?.close(); await f.close();
}
