import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('omni_ui')) process.exit(0); const f=await startUiFixture('piperline-omni-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); const calls=[]; page.on('request',r=>calls.push(r.url())); await page.goto(`${f.base}/#/omni`); await page.locator('#omniLocal').waitFor();
  for (const endpoint of ['get_tone_list','get_hot_audio_list','text_to_speech','audio_to_text','image_object_detect','preprocess_submit_request','before_create_limit_check','try_task','retry_task','batch_delete_digital']) assert.ok((await page.locator('#omniLocal').innerText()).includes(endpoint));
  assert.match(await page.locator('#omniLocal').innerText(),/PENDENTE DE OBSERVAÇÃO HUMANA[\s\S]*não chama essas APIs/); assert.equal(await page.locator('#omniLocal button').count(),0); assert.ok(!calls.some(u=>/\/api\/(?:omni|digital_human)(?:\/|\?|$)/i.test(new URL(u).pathname)));
  await page.waitForFunction(()=>/11 endpoints/.test(document.querySelector('#omniEvidence')?.textContent||'')); assert.match(await page.locator('#omniEvidence').innerText(),/11 endpoints nomeados nos bundles; corpos: UNOBSERVED; tela: UNOBSERVED; execução: UNOBSERVED\. Nada é chamado e nenhum avatar real é criado\./);
  console.log('omni_ui.test.mjs: ok (nomes estáticos, corpos/respostas UNOBSERVED e nenhuma execução)');
} finally { await browser?.close(); await f.close(); }
