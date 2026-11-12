// Preços + FAQ: as 6 perguntas preservadas, as respostas que NÃO foram observadas e a comparação local de planos.
// Rodada 12, item 2: cada etapa é cronometrada. O motivo é o relato do Windows (falha de 74 s uma vez e SKIP
// duas vezes seguidas, sem motivo sabido): com o tempo de cada etapa e o estado do DOM no erro, dá para dizer
// QUAL espera estourou e se a culpa é do app (a nota ficou "verificando…"/"indisponível") ou do ambiente.
//   PIPERLINE_TEST_TIMING=1  imprime o tempo de cada etapa (mesmo quando passa)
import assert from 'node:assert/strict';
import { applyCpuThrottle, launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';

if (skipUnavailableBrowser('pricing_faq_ui')) process.exit(0);

const marcos = [];
const inicio = Date.now();
async function etapa(nome, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    marcos.push({ nome, ms: Date.now() - t0, ok: true });
    return r;
  } catch (error) {
    marcos.push({ nome, ms: Date.now() - t0, ok: false, erro: String(error?.message || error) });
    error.etapa = nome;
    throw error;
  }
}
const relatorio = () => marcos.map((m) => `${m.nome}=${m.ms}ms${m.ok ? '' : ' (FALHOU)'}`).join(' · ');

const f = await startUiFixture('piperline-pricing-');
let browser;
let page;
try {
  await etapa('servidor', async () => 0);
  browser = await etapa('navegador', async () => launchChromium());
  page = await etapa('aba', async () => { const p = await browser.newPage(); await applyCpuThrottle(p); return p; });
  await etapa('rota /pricing', async () => { await page.goto(`${f.base}/#/pricing`); await page.locator('#pricingFaq').waitFor(); });
  await etapa('nota de integrações', async () => {
    await page.waitForFunction(() => /UNOBSERVED/.test(document.querySelector('#integrationsNote')?.textContent || ''));
    assert.match(await page.locator('#integrationsNote').innerText(), /mercado de vendas online: UNOBSERVED/);
    assert.match(await page.locator('#integrationsNote').innerText(), /Redes sociais confirmadas: TikTok, Facebook, Instagram/);
  });
  await etapa('nota do FAQ', async () => {
    await page.waitForFunction(() => /UNOBSERVED/.test(document.querySelector('#faqEvidence')?.textContent || ''));
    assert.match(await page.locator('#faqEvidence').innerText(), /6 perguntas preservadas; respostas: UNOBSERVED; avaliações: UNOBSERVED; seções de recursos: UNOBSERVED\. Comparação de planos: local/);
  });
  const questions = ['Há testes gratuitos disponíveis?', 'Qual é a diferença entre assinatura e créditos?', 'Quais são as diferenças entre a assinatura anual e a mensal?', 'Quais métodos de pagamento são aceitos?', 'Como usar os créditos do Pippit?', 'E se eu ficar sem créditos antes do final do mês?'];
  await etapa('6 perguntas', async () => {
    assert.equal(await page.locator('[data-faq]').count(), 6);
    for (const q of questions) assert.equal(await page.locator('summary').filter({ hasText: q }).count(), 1);
  });
  await etapa('abrir resposta', async () => {
    await page.locator('[data-faq="0"] summary').click();
    assert.match(await page.locator('[data-faq="0"]').innerText(), /resposta.*não preservado[\s\S]*UNOBSERVED/);
  });
  await etapa('comparação de planos', async () => {
    await page.locator('#faqPlans').click(); await page.locator('.plans').waitFor();
    assert.match(await page.locator('.modal').innerText(), /Não há pagamento nesta reconstrução/);
  });
  const total = Date.now() - inicio;
  if (process.env.PIPERLINE_TEST_TIMING === '1') console.log(`pricing_faq_ui: ${total} ms — ${relatorio()}`);
  console.log(`pricing_faq_ui.test.mjs: ok (6 perguntas registradas, respostas desconhecidas preservadas e planos locais sem pagamento) [${(total / 1000).toFixed(1)}s]`);
} catch (error) {
  // Diagnóstico do que sobrou na tela: é isto que separa "o app não preencheu" de "o navegador não abriu".
  let instantaneo = '(sem página)';
  try {
    instantaneo = await page?.evaluate(() => ({
      hash: location.hash,
      temPricingFaq: !!document.querySelector('#pricingFaq'),
      integracoes: (document.querySelector('#integrationsNote')?.textContent || '').slice(0, 120),
      faq: (document.querySelector('#faqEvidence')?.textContent || '').slice(0, 120),
      perguntas: document.querySelectorAll('[data-faq]').length,
      planos: !!document.querySelector('.plans'),
    }));
  } catch {}
  console.error(`pricing_faq_ui: falhou na etapa "${error.etapa || '?'}" depois de ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
  console.error(`  etapas: ${relatorio() || '(nenhuma)'}`);
  console.error(`  tela: ${JSON.stringify(instantaneo)}`);
  console.error(`  erro: ${String(error?.message || error).split('\n').slice(0, 4).join(' | ')}`);
  process.exitCode = 1;
} finally { await browser?.close(); await f.close(); }
