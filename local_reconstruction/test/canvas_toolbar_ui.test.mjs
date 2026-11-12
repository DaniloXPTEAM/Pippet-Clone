// UI: ferramentas do canvas (biblioteca de estilos, compartilhar tela, minimapa, zoom) — linha 47 do inventário.
import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('canvas_toolbar_ui')) process.exit(0);
const f = await startUiFixture('piperline-canvas-tools-'); let browser;
try {
  const post = (p, b) => fetch(f.base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
  const project = await post('/api/projects', { type: 'canvas', title: 'Ferramentas' });
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/project/${project.id}`); await page.locator('#stylelib').waitFor(); await page.waitForFunction(()=>/UNOBSERVED/.test(document.querySelector('#cvToolbarNote')?.textContent||'')); assert.match(await page.locator('#cvToolbarNote').innerText(),/5 ações observadas na captura; 9 ferramentas locais\. Ícones: UNOBSERVED; dimensões: UNOBSERVED; contratos: UNOBSERVED/);

  // Biblioteca de estilos: painel local com aviso UNOBSERVED sobre o efeito na geração
  await page.locator('#stylelib').click(); await page.locator('.sp-h').waitFor();
  assert.match(await page.locator('.sp-h').innerText(), /Biblioteca de estilos/);
  assert.match(await page.locator('.sp-h').innerText(), /não foi observado/, 'efeito do estilo na geração segue UNOBSERVED');
  const grid = await page.locator('.sp-grid .sp-card[data-s]').count(); assert.ok(grid > 90, `estilos observados no catálogo local (${grid})`);
  await page.locator('#spsearch').click(); await page.fill('#spq', 'Retro Film'); await page.locator('.sp-card[data-s="Retro Film"]').click();
  const saved = await (await fetch(`${f.base}/api/projects/${project.id}`)).json();
  assert.equal(saved.style, 'Retro Film', 'estilo escolhido fica salvo no projeto');
  await page.waitForFunction(() => document.querySelector('#stylelib')?.textContent.includes('Retro Film'));

  // Minimapa: liga e desliga
  await page.locator('#minimap').click(); await page.locator('#cvmini').waitFor();
  await page.locator('#minimap').click(); assert.equal(await page.locator('#cvmini').count(), 0, 'minimapa fecha ao clicar de novo');

  // Zoom: menu com as opções observadas
  await page.locator('#zopt').click();
  const zoom = page.locator('.menu').last(); const zoomText = await zoom.innerText();
  for (const label of ['Diminuir zoom', 'Aumentar zoom', 'Ajustar à tela', 'Zoom em 50%', 'Zoom em 100%']) assert.ok(zoomText.includes(label), `opção de zoom: ${label}`);
  await zoom.getByText('Zoom em 50%').click(); assert.equal((await page.locator('#zopt').innerText()).trim(), '50%');

  // Compartilhar tela existe como ação local (não abre chamada externa)
  assert.equal(await page.locator('#shareB').getAttribute('aria-label'), 'Compartilhar tela');
  console.log('canvas_toolbar_ui.test.mjs: ok (biblioteca de estilos com efeito UNOBSERVED, minimapa, zoom e compartilhar tela)');
} finally { await browser?.close(); await f.close(); }
