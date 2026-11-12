import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('skill_create_ui')) process.exit(0);
const f = await startUiFixture('piperline-skill-create-'); let browser;
try { browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/skills`); await page.locator('#mk').click();
  const menu = page.locator('.menu'); for (const option of ['Criar com IA', 'Enviar skill (ZIP com SKILL.md)', 'Criar manualmente']) assert.ok((await menu.innerText()).includes(option));
  await menu.getByText('Criar manualmente', { exact: true }).click(); await page.locator('#sks').waitFor();
  for (const selector of ['#skn', '#skd', '#ski', '#skg', '#skm', '#sko', '#skvm', '#skim', '#skp']) assert.equal(await page.locator(selector).count(), 1, selector);
  await page.fill('#skn', 'Skill UI local'); await page.fill('#skd', 'Descrição de teste'); await page.fill('#ski', '## Objetivo\nAjudar com um rascunho.'); await page.fill('#skg', 'Escreva sobre o produto'); await page.locator('[data-tag="Marketing Publicidade"]').check(); await page.locator('#sks').click();
  await page.locator('.skill-card', { hasText: 'Skill UI local' }).waitFor(); const saved = await (await fetch(`${f.base}/api/skills/state`)).json(); assert.equal(saved.custom.length, 1); assert.equal(saved.custom[0].name, 'Skill UI local');
  console.log('skill_create_ui.test.mjs: ok (menu de 3 fluxos e criação manual salva; nenhum LLM/provedor chamado)');
} finally { await browser?.close(); await f.close(); }
