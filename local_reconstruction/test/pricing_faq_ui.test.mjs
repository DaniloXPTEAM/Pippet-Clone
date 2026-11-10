import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('pricing_faq_ui')) process.exit(0); const f=await startUiFixture('piperline-pricing-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); await page.goto(`${f.base}/#/pricing`); await page.locator('#pricingFaq').waitFor(); const questions=['Há testes gratuitos disponíveis?','Qual é a diferença entre assinatura e créditos?','Quais são as diferenças entre a assinatura anual e a mensal?','Quais métodos de pagamento são aceitos?','Como usar os créditos do Pippit?','E se eu ficar sem créditos antes do final do mês?'];
  assert.equal(await page.locator('[data-faq]').count(),6); for(const q of questions) assert.equal(await page.locator('summary').filter({hasText:q}).count(),1);
  await page.locator('[data-faq="0"] summary').click(); assert.match(await page.locator('[data-faq="0"]').innerText(),/resposta.*não preservado[\s\S]*UNOBSERVED/);
  await page.locator('#faqPlans').click(); await page.locator('.plans').waitFor(); assert.match(await page.locator('.modal').innerText(),/Não há pagamento nesta reconstrução/);
  console.log('pricing_faq_ui.test.mjs: ok (6 perguntas registradas, respostas desconhecidas preservadas e planos locais sem pagamento)');
} finally { await browser?.close(); await f.close(); }
