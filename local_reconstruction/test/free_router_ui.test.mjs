import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('free_router_ui')) process.exit(0);
const fixture = await startUiFixture('piperline-free-router-ui-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage(); await page.goto(`${fixture.base}/#/settings/llm`); await page.locator('#free-router').waitFor();
  const config = { version: 1, paidFallback: false, providers: [{ id: 'gemini', enabled: true, baseUrl: 'http://127.0.0.1:9000/v1beta', freeTierConfirmed: true, dailyLimit: 5, models: [{ id: 'fake-model', capabilities: ['text'], freeTierConfirmed: true }] }], taskPreferences: { text: ['gemini/fake-model'] } };
  await page.locator('#frconfig').fill(JSON.stringify(config)); await page.locator('#frsave').click(); await page.waitForTimeout(400); await page.locator('[data-fr-secret="gemini"]').waitFor();
  await page.locator('[data-fr-secret="gemini"]').fill('ui-only-test-secret'); await page.locator('#frsave').click(); await page.waitForFunction(() => document.querySelector('#frresult')?.textContent.includes('Salvo'));
  const safe = await page.evaluate(async () => (await (await fetch('/api/free-router/config')).json()));
  assert.equal(safe.config.providers[0].hasKey, true); assert.ok(!JSON.stringify(safe).includes('ui-only-test-secret'));
  assert.match(await page.locator('#frresult').innerText(), /somente em memória/);
  await page.route('**/api/local-runs', async (route) => { if (route.request().method() !== 'POST') return route.continue(); await route.fulfill({ json: { ok: true, run: { id: 'run-ui-1', task: 'text', state: 'succeeded', prompt: 'Roteiro de teste UI', projectId: '123456789012', chatId: '123456789013', resultNodeId: 'n123456', result: 'Resposta fake exibida.', route: { providerName: 'Servidor fake', modelId: 'fake-model' } } } }); });
  await page.route('**/api/local-runs/run-ui-1', async (route) => route.fulfill({ json: { id: 'run-ui-1', task: 'text', state: 'succeeded', prompt: 'Roteiro de teste UI', projectId: '123456789012', chatId: '123456789013', resultNodeId: 'n123456', result: 'Resposta fake exibida.', route: { providerName: 'Servidor fake', modelId: 'fake-model' } } }));
  await page.goto(`${fixture.base}/#/home`); await page.locator('#prompt').fill('Roteiro de teste UI'); await page.locator('#freeSend').click(); await page.locator('#localRunPage').waitFor();
  assert.match(await page.locator('#localRunPage').innerText(), /Resposta fake exibida/); assert.ok(await page.locator('#localRunPage a[href="#\/project\/123456789012"]').count() >= 1);
  console.log('free_router_ui.test.mjs: Settings com segredos efêmeros; composer abre tarefa, mostra resultado e link Canvas/Histórico');
} finally { await browser?.close(); await fixture.close(); }
