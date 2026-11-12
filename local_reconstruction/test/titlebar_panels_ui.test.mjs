import assert from 'node:assert/strict';import { startUiFixture } from './support/ui-fixture.mjs';import { launchChromium,skipUnavailableBrowser } from './support/browser.mjs';
if(skipUnavailableBrowser('titlebar_panels_ui'))process.exit(0);const f=await startUiFixture('pippet-titlebar-panels-');let browser;
try{browser=await launchChromium();const page=await browser.newPage();await page.goto(f.base+'/#/home');await page.locator('#agentConnect').waitFor();await page.locator('#exportTasks').waitFor();
  await page.locator('#agentConnect').click();const ac=await page.locator('.modal').innerText();
  assert.match(ac,/Agent connection[\s\S]*TitleBarAgentConnect/);assert.match(ac,/right/);assert.match(ac,/101/);assert.match(ac,/Custom/);
  assert.match(ac,/UNOBSERVED[\s\S]*Nenhuma conexão ou chamada de rede/);
  await page.locator('.modal button').last().click().catch(()=>{});
  await page.locator('#exportTasks').click();const et=await page.locator('.modal').innerText();
  assert.match(et,/Export tasks[\s\S]*TitleBarExportTask/);assert.match(et,/ordem <b>4<\/b>/);
  assert.match(et,/UNOBSERVED[\s\S]*Nenhuma tarefa é presumida/);
  console.log('titlebar_panels_ui.test.mjs: ok (metadados observados AgentConnect right/101/Custom e ExportTask ordem 4; conteúdo UNOBSERVED)');}finally{await browser?.close();await f.close();}
