// Botão "Usar pilha gratuita" em Configurações → Assistente de IA: um clique grava FreeLLMAPI + Cloudflare + Omni + NVIDIA,
// mostra a ordem e diz o que falta — sem chave/conta na tela além de "presente/ausente".
import assert from 'node:assert/strict';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

if (skipUnavailableBrowser('free_router_stack_ui')) process.exit(0);
process.env.CLOUDFLARE_ACCOUNT_ID = 'conta-ui-1';
process.env.CLOUDFLARE_API_TOKEN = 'token-ui-2';
process.env.FREELLMAPI_API_KEY = 'chave-ui-3';
process.env.OMNIROUTER_API_KEY = 'omni-ui-4';
process.env.NVIDIA_API_KEY = 'nvidia-ui-5';
const f = await startUiFixture('pippet-free-stack-');
let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/settings/llm`);
  await page.locator('#frstack').waitFor();
  assert.match(await page.locator('#free-router').innerText(), /texto FreeLLMAPI/);
  await page.locator('#frstack').click();
  await page.waitForFunction(() => /Pilha aplicada/.test(document.querySelector('#frresult')?.textContent || ''));
  const note = await page.locator('#frresult').textContent();
  assert.match(note, /Pilha aplicada/);
  assert.match(note, /freellmapi\/auto/);
  assert.match(note, /cloudflare\/@cf\/black-forest-labs\/flux-1-schnell/);
  assert.ok(!/token-ui-2|conta-ui-1|chave-ui-3/.test(note), 'nenhum valor de chave/conta aparece');

  const status = await fetch(`${f.base}/api/free-router/config`).then((r) => r.json());
  assert.deepEqual(status.config.providers.map((p) => p.id).sort(), ['cloudflare', 'freellmapi', 'novai', 'nvidia-nim', 'omni-router']);
  assert.deepEqual(status.config.taskPreferences.image_generation, ['cloudflare/@cf/black-forest-labs/flux-1-schnell', 'omni-router/nvidia/black-forest-labs/flux.2-klein-4b', 'novai/cogview-3-flash']);
  assert.deepEqual(status.config.taskPreferences.text.slice(0, 2), ['freellmapi/auto', 'omni-router/auto/best-free']);
  const cf = status.config.providers.find((p) => p.id === 'cloudflare');
  assert.equal(cf.hasAccount, true); assert.equal(cf.hasKey, true);
  assert.ok(!JSON.stringify(status).includes('token-ui-2') && !JSON.stringify(status).includes('conta-ui-1'), 'a rota de estado não devolve valores');
  assert.deepEqual(errors, []);
  console.log('free_router_stack_ui.test.mjs: ok (um clique grava a pilha, mostra a ordem e não expõe chave/conta)');
} finally {
  await browser?.close();
  await f.close();
}
