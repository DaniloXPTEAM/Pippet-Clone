import assert from 'node:assert/strict';import { startUiFixture } from './support/ui-fixture.mjs';import { launchChromium,skipUnavailableBrowser } from './support/browser.mjs';
if(skipUnavailableBrowser('account_more_language_ui'))process.exit(0);const f=await startUiFixture('pippet-account-language-');let browser;
try{browser=await launchChromium();const page=await browser.newPage();await page.goto(f.base+'/#/home');
// Menu da conta refeito em 13/11/2026 pelas medidas do original: painel com submenus AO LADO (hover), um único "Sair".
await page.locator('#acc .uname').click();await page.locator('.acc-pop').waitFor();
assert.deepEqual(await page.locator('.acc-pop .acc-i .lb').allTextContents(),['Tarefas concluídas','Gerenciamento da conta','Configurações','Mais','Termos e Políticas','Sair']);
await page.locator('.acc-pop .acc-i',{hasText:'Mais'}).hover();await page.locator('.acc-sub').waitFor();
assert.deepEqual(await page.locator('.acc-sub .acc-i .lb').allTextContents(),['CLI','Lista de desejos de recursos','Atendimento ao cliente']);
await page.locator('.acc-pop .acc-i',{hasText:'Termos e Políticas'}).hover();assert.equal(await page.locator('.acc-sub .acc-i').count(),6);
await page.locator('.acc-pop .acc-i',{hasText:'Configurações'}).hover();
assert.deepEqual(await page.locator('.acc-sub .acc-i .lb').allTextContents(),['Idioma','Aparência','Planos e preços',"Salvar sem marca d'água",'Estratégia de confirmação de uso de créditos','Login e gerenciamento']);
await page.locator('.acc-sub .acc-i',{hasText:'Idioma'}).click();assert.equal(await page.locator('.acc-pop').count(),0,'menu fecha ao escolher');await page.locator('#lang').waitFor();
assert.equal(await page.locator('#lang option').count(),18);assert.deepEqual((await page.locator('#lang option').allTextContents()).slice(0,5),['Bahasa Indonesia','Bahasa Melayu','Deutsch','English','Español']);assert.ok(await page.locator('#lang option').filter({hasText:'Português'}).count());assert.ok(await page.locator('#lang option').filter({hasText:'한국어'}).count());console.log('account_more_language_ui.test.mjs: ok (More destinations and 18 language choices)');}finally{await browser?.close();await f.close();}
